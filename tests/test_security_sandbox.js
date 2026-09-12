import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  assertSafeString,
  isPrivateIp,
  normalizeIpObfuscation,
  validateNavigationUrl,
  validatePlaywrightCode,
  logSecurityBlock,
  SecurityValidationError
} from '../src/codeSandbox.js';
import { WebcmdBridge } from '../src/webcmdBridge.js';

test('Security Sandbox: assertSafeString sanitization', async (t) => {
  await t.test('accepts safe alphanumeric strings and common punctuation', () => {
    assert.doesNotThrow(() => assertSafeString('valid-string_123', { field: 'test' }));
    assert.doesNotThrow(() => assertSafeString('search term for movie', { allowQuotes: true }));
  });

  await t.test('rejects shell metacharacters and chaining operators', () => {
    const dangerous = [
      'google.com; rm -rf /',
      'google.com && whoami',
      'google.com | cat /etc/passwd',
      'google.com`id`',
      'google.com$(whoami)',
      'google.com > file.txt',
      'google.com < input.txt',
      'google.com\nreboot'
    ];

    for (const val of dangerous) {
      assert.throws(
        () => assertSafeString(val, { field: 'domain' }),
        SecurityValidationError,
        `Expected failure for: ${val}`
      );
    }
  });

  await t.test('rejects quotes when allowQuotes is false', () => {
    assert.throws(() => assertSafeString('test"quote', { allowQuotes: false }), SecurityValidationError);
    assert.throws(() => assertSafeString("test'quote", { allowQuotes: false }), SecurityValidationError);
  });

  await t.test('rejects null bytes', () => {
    assert.throws(() => assertSafeString('test\0payload', { field: 'null_check' }), SecurityValidationError);
  });

  await t.test('enforces max length constraints', () => {
    const tooLong = 'a'.repeat(2049);
    assert.throws(() => assertSafeString(tooLong, { maxLen: 2048 }), SecurityValidationError);
  });
});

test('Security Sandbox: IP and SSRF validations', async (t) => {
  await t.test('identifies private IP ranges accurately', () => {
    assert.equal(isPrivateIp('127.0.0.1'), true);
    assert.equal(isPrivateIp('10.0.0.1'), true);
    assert.equal(isPrivateIp('192.168.1.1'), true);
    assert.equal(isPrivateIp('172.16.0.1'), true);
    assert.equal(isPrivateIp('172.31.255.255'), true);
    assert.equal(isPrivateIp('169.254.169.254'), true);
    assert.equal(isPrivateIp('0.0.0.0'), true);
    assert.equal(isPrivateIp('::1'), true);

    // Public IPs should not be marked private
    assert.equal(isPrivateIp('8.8.8.8'), false);
    assert.equal(isPrivateIp('140.82.121.4'), false);
  });

  await t.test('normalizes obfuscated IP addresses (decimal and hex)', () => {
    assert.equal(normalizeIpObfuscation('2130706433'), '127.0.0.1');
    assert.equal(normalizeIpObfuscation('0x7f000001'), '127.0.0.1');
    assert.equal(normalizeIpObfuscation('example.com'), 'example.com');
  });

  await t.test('permits valid public HTTP/HTTPS URLs', async () => {
    const res = await validateNavigationUrl('https://example.com/test');
    assert.equal(res.valid, true);
    assert.equal(res.url, 'https://example.com/test');
  });

  await t.test('rejects non-HTTP schemes (file, chrome, ftp, javascript)', async () => {
    const invalidSchemes = [
      'file:///etc/passwd',
      'chrome://settings',
      'ftp://example.com',
      'javascript:alert(1)'
    ];

    for (const url of invalidSchemes) {
      await assert.rejects(
        async () => await validateNavigationUrl(url),
        SecurityValidationError,
        `Expected rejection for scheme in: ${url}`
      );
    }
  });

  await t.test('rejects localhost, private IPs, and AWS metadata URLs', async () => {
    const dangerousUrls = [
      'http://localhost:3000/admin',
      'http://127.0.0.1:8080',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.5/internal',
      'http://192.168.1.100/router',
      'http://2130706433/', // decimal 127.0.0.1
      'http://0x7f000001/'  // hex 127.0.0.1
    ];

    for (const url of dangerousUrls) {
      await assert.rejects(
        async () => await validateNavigationUrl(url),
        SecurityValidationError,
        `Expected SSRF rejection for: ${url}`
      );
    }
  });
});

test('Security Sandbox: AST Static Policy for Playwright Code', async (t) => {
  await t.test('allows valid Playwright snippets with top-level return', () => {
    const validSnippet = `
      await page.goto('https://example.com');
      const title = await page.title();
      return { title };
    `;
    const result = validatePlaywrightCode(validSnippet);
    assert.equal(result.valid, true, `Expected valid snippet to pass, got: ${result.reason}`);
  });

  await t.test('blocks banned Node runtime identifiers', () => {
    const exploits = [
      "const fs = require('fs');",
      "process.exit(1);",
      "const { exec } = child_process;",
      "eval('console.log(1)')",
      "const fn = new Function('return 1');",
      "const h = http.get('http://evil.com');"
    ];

    for (const code of exploits) {
      const result = validatePlaywrightCode(code);
      assert.equal(result.valid, false, `Expected code to be blocked: ${code}`);
    }
  });

  await t.test('blocks prototype and constructor chain escapes', () => {
    const escapes = [
      "[].constructor.constructor('return process')()",
      "const c = obj.__proto__;",
      "Object.getPrototypeOf(page)",
      "Object.setPrototypeOf(page, {})",
      "Object.defineProperty(page, 'test', {})"
    ];

    for (const code of escapes) {
      const result = validatePlaywrightCode(code);
      assert.equal(result.valid, false, `Expected escape to be blocked: ${code}`);
    }
  });

  await t.test('blocks dynamic import expressions', () => {
    const dynamicImport = "const mod = await import('node:fs');";
    const result = validatePlaywrightCode(dynamicImport);
    assert.equal(result.valid, false);
    assert.match(result.reason, /dynamic import/i);
  });

  await t.test('inspects code inside page.evaluate string calls', () => {
    const evaluateExploit = `
      await page.evaluate("process.mainModule.require('child_process')");
    `;
    const result = validatePlaywrightCode(evaluateExploit);
    assert.equal(result.valid, false);
  });
});

test('Security Sandbox: Audit Logger & WebcmdBridge Event', async (t) => {
  await t.test('writes rejected records to .security/rejected-scripts.log', () => {
    const testRecord = {
      sessionId: 'test-session-999',
      reason: 'Banned identifier test',
      snippet: 'process.exit(0)',
      clientIp: '127.0.0.1'
    };

    logSecurityBlock(testRecord);

    const logPath = path.join(process.cwd(), '.security', 'rejected-scripts.log');
    assert.equal(fs.existsSync(logPath), true);
    const content = fs.readFileSync(logPath, 'utf8');
    assert.ok(content.includes('test-session-999'));
    assert.ok(content.includes('Banned identifier test'));
  });

  await t.test('WebcmdBridge emits security_block when malicious code is submitted to runScript', async () => {
    const bridge = new WebcmdBridge();
    let emittedEvent = null;

    bridge.on('security_block', (event) => {
      emittedEvent = event;
    });

    const maliciousCode = "process.exit(1);";
    const res = await bridge.runScript('test-event-session', maliciousCode);

    assert.equal(res.ok, false);
    assert.equal(res.blocked, true);
    assert.ok(emittedEvent !== null);
    assert.equal(emittedEvent.sessionId, 'test-event-session');
  });
});
