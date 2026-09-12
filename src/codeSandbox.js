import * as acorn from 'acorn';
import dns from 'dns/promises';
import fs from 'fs';
import path from 'path';

export class SecurityValidationError extends Error {
  constructor(reason, details = {}) {
    super(`Security Policy Violation: ${reason}`);
    this.name = 'SecurityValidationError';
    this.reason = reason;
    this.details = details;
  }
}

/**
 * 1. String Sanitization & Shell Metacharacter Protection
 */
export function assertSafeString(value, options = {}) {
  const {
    maxLen = 2048,
    pattern = null,
    field = 'value',
    allowQuotes = false
  } = options;

  if (typeof value !== 'string') {
    throw new SecurityValidationError(`${field} must be a string`, { value, field });
  }

  if (value.length > maxLen) {
    throw new SecurityValidationError(`${field} exceeds maximum allowed length (${maxLen} chars)`, {
      field,
      length: value.length,
      maxLen
    });
  }

  // Null bytes are strictly forbidden
  if (value.includes('\0')) {
    throw new SecurityValidationError(`${field} contains forbidden null byte`, { field });
  }

  // Shell metacharacters that allow command chaining, redirection, or command substitution
  // Semicolon, ampersand, pipe, backtick, dollar sign, redirectors, newlines
  const dangerousShellCharsRegex = allowQuotes
    ? /[;&|`$\n\r]/
    : /[;&|`$><\n\r"']/;

  if (dangerousShellCharsRegex.test(value)) {
    throw new SecurityValidationError(`${field} contains prohibited shell metacharacters`, {
      field,
      matched: value.match(dangerousShellCharsRegex)?.[0]
    });
  }

  if (pattern && !pattern.test(value)) {
    throw new SecurityValidationError(`${field} does not match required safe format pattern`, {
      field,
      pattern: pattern.toString()
    });
  }

  return true;
}

/**
 * Helper to check if an IP string is in private / loopback / link-local ranges
 */
export function isPrivateIp(ip) {
  if (!ip) return false;

  // IPv4 Loopback (127.0.0.0/8)
  if (/^127\./.test(ip)) return true;

  // IPv4 Private Class A (10.0.0.0/8)
  if (/^10\./.test(ip)) return true;

  // IPv4 Private Class B (172.16.0.0/12: 172.16.0.0 - 172.31.255.255)
  const match172 = ip.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = parseInt(match172[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  // IPv4 Private Class C (192.168.0.0/16)
  if (/^192\.168\./.test(ip)) return true;

  // IPv4 Link-Local / Cloud Metadata (169.254.0.0/16) - e.g. 169.254.169.254
  if (/^169\.254\./.test(ip)) return true;

  // Zero network
  if (/^0\.0\.0\.0$/.test(ip)) return true;

  // IPv6 Loopback (::1) and private/unique local/link-local
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
  if (/^fe80:/i.test(ip)) return true; // Link-local
  if (/^fc00:|^fd00:/i.test(ip)) return true; // Unique local

  return false;
}

/**
 * Normalizes potential decimal, hex, or octal IP strings
 */
export function normalizeIpObfuscation(hostname) {
  // Pure decimal IP e.g. 2130706433 -> 127.0.0.1
  if (/^\d+$/.test(hostname)) {
    const num = parseInt(hostname, 10);
    if (!isNaN(num) && num >= 0 && num <= 4294967295) {
      return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255
      ].join('.');
    }
  }

  // Hexadecimal IP e.g. 0x7f000001 -> 127.0.0.1
  if (/^0x[0-9a-f]+$/i.test(hostname)) {
    const num = parseInt(hostname, 16);
    if (!isNaN(num) && num >= 0 && num <= 4294967295) {
      return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255
      ].join('.');
    }
  }

  return hostname;
}

/**
 * 2. SSRF & Navigation Guardrail
 */
export async function validateNavigationUrl(urlString, options = {}) {
  const { allowPrivate = process.env.ALLOW_PRIVATE_NETWORK === 'true' } = options;

  if (!urlString || typeof urlString !== 'string') {
    throw new SecurityValidationError('URL must be a non-empty string', { url: urlString });
  }

  const trimmed = urlString.trim();

  // Basic shell safety on URL string (allowing query params/slashes, but banning control metachars)
  assertSafeString(trimmed, { maxLen: 2048, field: 'Navigation URL', allowQuotes: false });

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    throw new SecurityValidationError(`Invalid URL structure: ${err.message}`, { url: trimmed });
  }

  // Scheme must strictly be http: or https:
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SecurityValidationError(
      `Forbidden URL scheme "${parsed.protocol}". Only HTTP/HTTPS protocols are permitted.`,
      { url: trimmed, protocol: parsed.protocol }
    );
  }

  let hostname = parsed.hostname.toLowerCase();

  // Check IP obfuscation (decimal / hex)
  const normalized = normalizeIpObfuscation(hostname);
  if (normalized !== hostname) {
    hostname = normalized;
  }

  // Literal hostname checks
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === '0.0.0.0'
  ) {
    if (!allowPrivate) {
      throw new SecurityValidationError(`Access to localhost / local network is prohibited (${hostname})`, {
        url: trimmed,
        hostname
      });
    }
  }

  // Check literal IP addresses
  if (isPrivateIp(hostname)) {
    if (!allowPrivate) {
      throw new SecurityValidationError(`Direct access to private or cloud-metadata IP is prohibited (${hostname})`, {
        url: trimmed,
        hostname
      });
    }
  }

  // Asynchronous DNS Resolution to defeat DNS Rebinding
  // Check what IP this domain actually resolves to
  if (!allowPrivate && !/^[0-9.]+$/.test(hostname)) {
    try {
      const resolved = await dns.lookup(hostname);
      if (resolved && resolved.address && isPrivateIp(resolved.address)) {
        throw new SecurityValidationError(
          `DNS resolution for "${hostname}" resolves to protected private IP (${resolved.address}). Access blocked.`,
          { url: trimmed, hostname, resolvedIp: resolved.address }
        );
      }
    } catch (err) {
      if (err instanceof SecurityValidationError) {
        throw err;
      }
      // If DNS lookup fails (e.g., offline or NXDOMAIN), allow the browser network layer to handle resolution errors
    }
  }

  return { valid: true, url: trimmed, parsed };
}

/**
 * 3. Static AST Policy Checker for LLM-Generated Playwright Code
 */
const BANNED_IDENTIFIERS = new Set([
  'require',
  'process',
  'child_process',
  'fs',
  'net',
  'http',
  'https',
  'dgram',
  'tls',
  'dns',
  'globalThis',
  'global',
  '__dirname',
  '__filename',
  'Reflect',
  'eval',
  'Function'
]);

const BANNED_PROPERTIES = new Set([
  'constructor',
  '__proto__',
  'prototype',
  'getPrototypeOf',
  'setPrototypeOf',
  'defineProperty',
  'defineProperties'
]);

export function validatePlaywrightCode(codeString, options = {}) {
  if (!codeString || typeof codeString !== 'string') {
    return { valid: false, reason: 'Empty code or invalid string' };
  }

  // CRITICAL FIX: Wrap the code inside an async function shell to correctly parse
  // top-level return statements emitted by workflow templates!
  const wrappedCode = `async function __sandboxed_script(page) {\n${codeString}\n}`;

  let ast;
  try {
    ast = acorn.parse(wrappedCode, {
      ecmaVersion: 'latest',
      sourceType: 'module'
    });
  } catch (parseErr) {
    return {
      valid: false,
      reason: `JavaScript Syntax Error in script: ${parseErr.message}`
    };
  }

  // Recursive AST Walker
  let violation = null;

  function walk(node, parent = null) {
    if (!node || violation) return;

    // 1. Check for dynamic imports: import(...)
    if (node.type === 'ImportExpression') {
      violation = {
        reason: 'Forbidden dynamic import(...) call detected in script',
        snippet: codeString.slice(Math.max(0, node.start - 40), node.end)
      };
      return;
    }

    // 2. Check for banned Identifiers (process, require, child_process, eval, etc.)
    if (node.type === 'Identifier') {
      const name = node.name;
      // Ensure this identifier is not just an uncomputed property name (e.g. obj.foo)
      const isObjectProperty = parent && parent.type === 'MemberExpression' && parent.property === node && !parent.computed;

      if (!isObjectProperty && BANNED_IDENTIFIERS.has(name)) {
        violation = {
          reason: `Access to restricted runtime identifier "${name}" is blocked`,
          snippet: name
        };
        return;
      }
    }

    // 3. Check for Prototype Chain / Constructor Escapes (.constructor, __proto__, etc.)
    if (node.type === 'MemberExpression') {
      let propName = null;
      if (!node.computed && node.property.type === 'Identifier') {
        propName = node.property.name;
      } else if (node.computed && node.property.type === 'Literal') {
        propName = String(node.property.value);
      }

      if (propName && BANNED_PROPERTIES.has(propName)) {
        violation = {
          reason: `Prototype/constructor chain access (".${propName}") is blocked by sandbox policy`,
          snippet: propName
        };
        return;
      }
    }

    // 4. Check for evaluate(...) string recursion
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const isEvaluate = (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'evaluate'
      );

      if (isEvaluate && node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        // If evaluate was passed a string literal or template literal with code
        if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
          const innerCheck = validatePlaywrightCode(firstArg.value, options);
          if (!innerCheck.valid) {
            violation = {
              reason: `Code inside page.evaluate() violated security policy: ${innerCheck.reason}`,
              snippet: firstArg.value.slice(0, 100)
            };
            return;
          }
        }
      }
    }

    // Recursively walk child nodes
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c.type === 'string') walk(c, node);
        }
      } else if (child && typeof child.type === 'string') {
        walk(child, node);
      }
    }
  }

  walk(ast);

  if (violation) {
    return {
      valid: false,
      reason: violation.reason,
      snippet: violation.snippet
    };
  }

  return { valid: true };
}

/**
 * 4. Audit Logger for Blocked Scripts
 */
export function logSecurityBlock(record) {
  try {
    const secDir = path.join(process.cwd(), '.security');
    if (!fs.existsSync(secDir)) {
      fs.mkdirSync(secDir, { recursive: true });
    }

    const logPath = path.join(secDir, 'rejected-scripts.log');
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      sessionId: record.sessionId || 'unknown',
      reason: record.reason || 'Security Policy Violation',
      snippet: (record.snippet || '').slice(0, 500),
      clientIp: record.clientIp || 'local'
    }) + '\n';

    fs.appendFileSync(logPath, logEntry, 'utf8');
  } catch (err) {
    console.error('Failed to append to security audit log:', err.message);
  }
}
