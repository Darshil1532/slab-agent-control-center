import spawn from 'cross-spawn';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import {
  assertSafeString,
  validateNavigationUrl,
  validatePlaywrightCode,
  logSecurityBlock
} from './codeSandbox.js';

import syncFs from 'fs';

// Ensure webcmd dispatches browser commands in the visible foreground
process.env.WEBCMD_WINDOW = process.env.WEBCMD_WINDOW || 'foreground';

/**
 * Resolves webcmd binary from local node_modules/.bin first, falling back to global command.
 */
export function resolveWebcmdBinary() {
  const localBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'webcmd.cmd' : 'webcmd');
  if (syncFs.existsSync(localBin)) {
    return localBin;
  }
  return 'webcmd';
}

export class WebcmdBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.activeSessions = new Map();
    this.tempDir = path.join(process.cwd(), '.temp_scripts');
    this.maxBufferBytes = 10 * 1024 * 1024; // 10MB hard output cap
  }

  async init() {
    await fs.mkdir(this.tempDir, { recursive: true });
    return this.checkDoctor();
  }

  /**
   * Safe child process execution using cross-spawn with argument arrays.
   * Eliminates shell interpolation vulnerabilities and enforces maxBuffer cap.
   */
  execWebcmd(args, options = {}) {
    return new Promise((resolve, reject) => {
      const bin = resolveWebcmdBinary();
      const maxBuffer = options.maxBuffer || this.maxBufferBytes;
      const child = spawn(bin, args, {
        env: { ...process.env, WEBCMD_WINDOW: 'foreground', ...options.env },
        windowsHide: false,
        ...options
      });

      let stdout = '';
      let stderr = '';
      let totalBytes = 0;
      let killed = false;

      child.stdout?.on('data', chunk => {
        totalBytes += chunk.length;
        if (totalBytes > maxBuffer && !killed) {
          killed = true;
          child.kill('SIGTERM');
          return reject(new Error(`Command output exceeded maximum allowed size cap (${Math.round(maxBuffer / (1024 * 1024))}MB)`));
        }
        stdout += chunk.toString();
      });

      child.stderr?.on('data', chunk => {
        stderr += chunk.toString();
      });

      child.on('error', err => {
        reject(err);
      });

      child.on('close', code => {
        if (killed) return;
        if (code !== 0 && !options.ignoreExitCode) {
          const err = new Error(`webcmd exited with code ${code}: ${stderr || stdout}`);
          err.code = code;
          err.stdout = stdout;
          err.stderr = stderr;
          return reject(err);
        }
        resolve({ stdout, stderr, code });
      });
    });
  }

  /**
   * Run webcmd doctor to check daemon, cloak runtime, and chromium binary.
   */
  async checkDoctor() {
    try {
      const { stdout } = await this.execWebcmd(['doctor'], { ignoreExitCode: true });
      const isOk = stdout.includes('Everything looks good!') || stdout.includes('[OK] Daemon');
      return {
        ok: isOk,
        installed: true,
        details: stdout.trim(),
        daemonRunning: stdout.includes('[OK] Daemon'),
        cloakConnected: stdout.includes('[OK] Runtime: cloak connected')
      };
    } catch (err) {
      const isEnoent = err.code === 'ENOENT' || (err.message && err.message.includes('ENOENT'));
      return {
        ok: false,
        installed: !isEnoent,
        error: isEnoent
          ? "webcmd CLI is not installed or not found. Please run 'npm install' or 'npm install -g @agentrhq/webcmd' (requires Node 20+)."
          : err.message,
        details: err.stdout || ''
      };
    }
  }

  /**
   * Create an explicit browser session for webcmd commands.
   */
  async createSession(name = 'session') {
    assertSafeString(name, { maxLen: 64, field: 'Session name' });
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 20);

    try {
      const { stdout } = await this.execWebcmd(['session', 'create', cleanName, '-f', 'json']);
      const data = JSON.parse(stdout);
      const sessionId = data.id;
      this.activeSessions.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        name: cleanName
      });
      return sessionId;
    } catch (err) {
      console.error('Failed to create webcmd session:', err.message);
      throw err;
    }
  }

  /**
   * Retrieve active sessions list.
   */
  async listSessions() {
    try {
      const { stdout } = await this.execWebcmd(['session', 'list', '-f', 'json']);
      return JSON.parse(stdout);
    } catch {
      return Array.from(this.activeSessions.values());
    }
  }

  /**
   * Close a browser session.
   */
  async closeSession(sessionId) {
    if (!sessionId) return false;
    assertSafeString(sessionId, { maxLen: 128, field: 'Session ID' });

    try {
      await this.execWebcmd(['session', 'close', sessionId], { ignoreExitCode: true });
      this.activeSessions.delete(sessionId);
      return true;
    } catch (err) {
      console.warn(`Warning closing session ${sessionId}:`, err.message);
      this.activeSessions.delete(sessionId);
      return false;
    }
  }

  /**
   * Query webcmd site memory context for a given URL.
   * This is Layer 1 self-learning sitemap memory.
   */
  async getSiteMemoryContext(url, taskId = 'task-1') {
    assertSafeString(taskId, { maxLen: 128, field: 'Task ID' });
    await validateNavigationUrl(url);

    try {
      const { stdout } = await this.execWebcmd(['site', 'memory', 'context', url, '--task-id', taskId, '-f', 'json']);
      const data = JSON.parse(stdout);
      return {
        found: true,
        siteMarkdown: data.siteMarkdown || '',
        manifest: data.manifest || null,
        seedStatus: data.resolution?.manifest?.seed?.status || 'none',
        readOnly: data.readOnly || false
      };
    } catch (err) {
      return {
        found: false,
        siteMarkdown: '',
        error: err.message
      };
    }
  }

  /**
   * Capture a compact accessibility snapshot of the current page in the session.
   */
  async getSnapshot(sessionId, mode = 'act') {
    assertSafeString(sessionId, { maxLen: 128, field: 'Session ID' });
    assertSafeString(mode, { maxLen: 32, field: 'Snapshot mode' });

    try {
      const { stdout } = await this.execWebcmd([
        '--session', sessionId,
        'browser', 'snapshot',
        '--snapshot-mode', mode,
        '-f', 'json'
      ]);
      const data = JSON.parse(stdout);
      return {
        ok: data.ok ?? true,
        tree: data.tree || '',
        page: data.page || {},
        warnings: data.warnings || []
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
        tree: ''
      };
    }
  }

  /**
   * Capture a live visual screenshot from the browser session as a data URL.
   */
  async captureScreenshot(sessionId, quality = 45) {
    if (!sessionId) return { ok: false, error: 'No active session' };
    assertSafeString(sessionId, { maxLen: 128, field: 'Session ID' });

    try {
      const q = Math.min(Math.max(Number(quality) || 45, 20), 80);
      const script = `
        try {
          const buf = await page.screenshot({ type: 'jpeg', quality: ${q} });
          const bytes = new Uint8Array(buf);
          let binary = '';
          const chunk = 8192;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
          }
          return {
            ok: true,
            title: await page.title(),
            url: page.url(),
            data: btoa(binary)
          };
        } catch (err) {
          return { ok: false, error: err.message };
        }
      `;
      const res = await this.runScript(sessionId, script, 15);
      if (res.ok && res.result?.ok && res.result?.data) {
        return {
          ok: true,
          dataUrl: `data:image/jpeg;base64,${res.result.data}`,
          title: res.result.title || '',
          url: res.result.url || ''
        };
      }
      return {
        ok: false,
        error: res.result?.error || res.error || 'Failed to capture screenshot'
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Execute Playwright code inside the session with static AST policy check and SSRF guardrails.
   * Returns structured output, page info, snapshotDiff, and execution timings.
   */
  async runScript(sessionId, scriptCode, timeoutSec = 45) {
    assertSafeString(sessionId, { maxLen: 128, field: 'Session ID' });
    const boundedTimeout = Math.min(Math.max(Number(timeoutSec) || 45, 5), 120);

    // 1. Static AST Policy Check
    const codeCheck = validatePlaywrightCode(scriptCode);
    if (!codeCheck.valid) {
      const blockEvent = {
        reason: codeCheck.reason,
        snippet: codeCheck.snippet || scriptCode.slice(0, 100),
        sessionId,
        timestamp: new Date().toISOString()
      };

      logSecurityBlock(blockEvent);
      this.emit('security_block', blockEvent);

      return {
        ok: false,
        blocked: true,
        error: `Security Policy Violation: ${codeCheck.reason}`,
        reason: codeCheck.reason
      };
    }

    // 2. SSRF / Navigation Guardrails inside script
    const gotoMatches = scriptCode.matchAll(/page\.goto\s*\(\s*['"`]([^'"`]+)['"`]/g);
    for (const match of gotoMatches) {
      const targetUrl = match[1];
      try {
        await validateNavigationUrl(targetUrl);
      } catch (ssrfErr) {
        const blockEvent = {
          reason: ssrfErr.message,
          snippet: `page.goto("${targetUrl}")`,
          sessionId,
          timestamp: new Date().toISOString()
        };

        logSecurityBlock(blockEvent);
        this.emit('security_block', blockEvent);

        return {
          ok: false,
          blocked: true,
          error: ssrfErr.message,
          reason: ssrfErr.reason || ssrfErr.message
        };
      }
    }

    // 3. Write code to isolated temp file with atomic screen snapshot capture
    const filename = `script_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.js`;
    const filepath = path.join(this.tempDir, filename);

    try {
      const wrappedScript = `
try { await page.bringToFront(); } catch (_) {}

async function __user_exec(page) {
${scriptCode}
}

let __user_result = null;
let __exec_err = null;
try {
  __user_result = await __user_exec(page);
} catch (err) {
  __exec_err = err.message || String(err);
}

let __screen_b64 = null;
try {
  const __buf = await page.screenshot({ type: 'jpeg', quality: 45 });
  const __bytes = new Uint8Array(__buf);
  let __bin = '';
  const __chunk = 8192;
  for (let __i = 0; __i < __bytes.length; __i += __chunk) {
    __bin += String.fromCharCode.apply(null, __bytes.subarray(__i, __i + __chunk));
  }
  __screen_b64 = btoa(__bin);
} catch (_) {}

if (__exec_err) {
  throw new Error(__exec_err);
}

return {
  __atomic_result: __user_result,
  __atomic_screenshot: __screen_b64,
  __atomic_url: page.url(),
  __atomic_title: await page.title()
};
`;
      await fs.writeFile(filepath, wrappedScript, 'utf8');

      // 4. Execute via cross-spawn with argument array
      const { stdout } = await this.execWebcmd([
        '--session', sessionId,
        'browser', 'run',
        '--file', filepath,
        '--timeout', String(boundedTimeout),
        '--max-output', '1000000',
        '-f', 'json'
      ], {
        maxBuffer: this.maxBufferBytes
      });

      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = { ok: true, raw: stdout };
      }

      // Unpack atomic screenshot and emit real-time screen_snapshot event
      if (parsed.result && parsed.result.__atomic_screenshot) {
        const snapEvent = {
          image: `data:image/jpeg;base64,${parsed.result.__atomic_screenshot}`,
          url: parsed.result.__atomic_url || '',
          title: parsed.result.__atomic_title || '',
          sessionId
        };
        this.emit('screen_snapshot', snapEvent);
        parsed.result = parsed.result.__atomic_result;
      }

      return parsed;
    } catch (err) {
      return {
        ok: false,
        error: err.message,
        stderr: err.stderr || '',
        stdout: err.stdout || ''
      };
    } finally {
      // Clean up temp file
      fs.unlink(filepath).catch(() => {});
    }
  }

  /**
   * Capture screenshot as base64 from current page.
   */
  async captureScreenshot(sessionId) {
    assertSafeString(sessionId, { maxLen: 128, field: 'Session ID' });
    const script = `
      try {
        const buf = await page.screenshot({ type: 'jpeg', quality: 65 });
        return { screenshot: buf.toString('base64'), format: 'image/jpeg' };
      } catch (e) {
        return { screenshot: null, error: e.message };
      }
    `;
    const result = await this.runScript(sessionId, script, 15);
    if (result && result.result && result.result.screenshot) {
      return result.result.screenshot;
    }
    return null;
  }
}

export const webcmdBridge = new WebcmdBridge();
