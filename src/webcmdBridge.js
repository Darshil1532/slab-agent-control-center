import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Ensure webcmd dispatches browser commands in the visible foreground
process.env.WEBCMD_WINDOW = process.env.WEBCMD_WINDOW || 'foreground';

export class WebcmdBridge {
  constructor(options = {}) {
    this.activeSessions = new Map();
    this.tempDir = path.join(process.cwd(), '.temp_scripts');
  }

  async init() {
    await fs.mkdir(this.tempDir, { recursive: true });
    return this.checkDoctor();
  }

  /**
   * Run webcmd doctor to check daemon, cloak runtime, and chromium binary.
   */
  async checkDoctor() {
    try {
      const { stdout } = await execAsync('webcmd doctor');
      const isOk = stdout.includes('Everything looks good!') || stdout.includes('[OK] Daemon');
      return {
        ok: isOk,
        details: stdout.trim(),
        daemonRunning: stdout.includes('[OK] Daemon'),
        cloakConnected: stdout.includes('[OK] Runtime: cloak connected')
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
        details: err.stdout || ''
      };
    }
  }

  /**
   * Create an explicit browser session for webcmd commands.
   */
  async createSession(name = 'session') {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 20);
    try {
      const { stdout } = await execAsync(`webcmd session create ${cleanName} -f json`, {
        env: { ...process.env, WEBCMD_WINDOW: 'foreground' }
      });
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
      const { stdout } = await execAsync('webcmd session list -f json');
      return JSON.parse(stdout);
    } catch {
      return Array.from(this.activeSessions.values());
    }
  }

  /**
   * Close a browser session.
   */
  async closeSession(sessionId) {
    try {
      await execAsync(`webcmd session close ${sessionId}`);
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
    try {
      const { stdout } = await execAsync(`webcmd site memory context "${url}" --task-id "${taskId}" -f json`);
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
    try {
      const { stdout } = await execAsync(`webcmd --session ${sessionId} browser snapshot --snapshot-mode ${mode} -f json`);
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
   * Execute Playwright code inside the session via a temp file.
   * Returns structured output, page info, snapshotDiff, and execution timings.
   */
  async runScript(sessionId, scriptCode, timeoutSec = 45) {
    const filename = `script_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.js`;
    const filepath = path.join(this.tempDir, filename);

    try {
      const wrappedScript = `try { await page.bringToFront(); } catch (_) {}\n${scriptCode}`;
      await fs.writeFile(filepath, wrappedScript, 'utf8');

      const cmd = `webcmd --session ${sessionId} browser run --file "${filepath}" --timeout ${timeoutSec} -f json`;
      const { stdout } = await execAsync(cmd, {
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, WEBCMD_WINDOW: 'foreground' }
      });

      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = { ok: true, raw: stdout };
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
