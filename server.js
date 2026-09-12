import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { validateEnvironment } from './src/envValidator.js';
import { agentController } from './src/agent.js';
import { webcmdBridge } from './src/webcmdBridge.js';
import { recipeManager } from './src/recipeManager.js';
import { geminiClient } from './src/geminiClient.js';
import { assertSafeString, validateNavigationUrl } from './src/codeSandbox.js';
import { exec } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Prevent browser caching of client scripts & styles
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  maxAge: 0
}));

// Broadcast to all connected WebSocket clients
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(msg);
    }
  });
}

// Hook agent events into WebSocket broadcast
agentController.onEvent(event => {
  console.log(`[AGENT EVENT: ${event.type}]`, event.message || event.title || event.sessionId || '');
  broadcast(event);
});

// REST Endpoints
app.get('/healthz', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    agentState: agentController.isRunning ? 'RUNNING' : 'IDLE'
  });
});

app.get('/api/status', async (req, res) => {
  const doctor = await webcmdBridge.checkDoctor();
  res.json({
    status: 'ok',
    daemon: doctor,
    model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
    isRunning: agentController.isRunning,
    activeSession: agentController.currentSessionId
  });
});

app.get('/api/recipes', (req, res) => {
  const recipes = recipeManager.listRecipes();
  res.json({ count: recipes.length, recipes });
});

app.get('/api/memory', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'url parameter is required' });
  }
  try {
    assertSafeString(url, { maxLen: 2048, field: 'URL' });
    await validateNavigationUrl(url);
    const memory = await webcmdBridge.getSiteMemoryContext(url);
    res.json(memory);
  } catch (err) {
    res.status(400).json({ error: err.message, blocked: true });
  }
});

app.post('/api/action/approve', (req, res) => {
  const handled = agentController.handleApproval(true);
  res.json({ handled });
});

app.post('/api/action/reject', (req, res) => {
  const handled = agentController.handleApproval(false);
  res.json({ handled });
});

app.get('/api/tokens', (req, res) => {
  const metrics = geminiClient.getTokenMetrics();
  res.json({
    ok: true,
    ...metrics,
    replayTokens: 0,
    savingsExplanation: 'Autonomous exploration consumes LLM reasoning tokens. Once learned, replaying the synthesized webcmd CLI recipe executes deterministically with zero LLM API calls, saving 100% of LLM token costs.'
  });
});

app.post('/api/browser/open', async (req, res) => {
  try {
    const sessionId = agentController.currentSessionId || await webcmdBridge.createSession('operator-window');
    agentController.currentSessionId = sessionId;
    const result = await webcmdBridge.runScript(
      sessionId,
      'try { await page.bringToFront(); } catch (_) {}\nreturn { ready: true, title: await page.title(), url: page.url() };',
      15
    );

    // Launch visible desktop browser window so user/judge sees page directly on desktop screen
    const pageUrl = result.result?.url || 'https://www.district.in/movies/';
    if (pageUrl && pageUrl.startsWith('http')) {
      if (process.platform === 'win32') {
        exec(`start "" "${pageUrl}"`).unref();
      } else if (process.platform === 'darwin') {
        exec(`open "${pageUrl}"`).unref();
      } else {
        exec(`xdg-open "${pageUrl}"`).unref();
      }
    }

    res.json({ ok: true, sessionId, result, desktopBrowserOpened: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/browser/screen', async (req, res) => {
  try {
    const sessionId = agentController.currentSessionId || req.query.sessionId;
    if (!sessionId) {
      return res.status(404).json({ ok: false, error: 'No active browser session' });
    }
    const snap = await webcmdBridge.captureScreenshot(sessionId);
    if (snap.ok) {
      return res.json(snap);
    }
    return res.status(500).json(snap);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// WebSocket Handling
wss.on('connection', ws => {
  console.log('📡 Dashboard client connected to WebSocket.');

  // Send initial state on connection
  ws.send(JSON.stringify({
    type: 'init_state',
    isRunning: agentController.isRunning,
    sessionId: agentController.currentSessionId,
    model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'
  }));

  ws.on('message', async rawData => {
    try {
      const message = JSON.parse(rawData.toString());
      console.log('Received WebSocket message:', message);

      switch (message.action) {
        case 'start':
          console.log('🚀 Launching Agent Mission:', message.workflow, message.params?.goal || message.params?.query);
          agentController.startMission({
            workflow: message.workflow,
            params: message.params || {}
          }).catch(err => {
            console.error('Workflow error:', err);
          });
          break;

        case 'approve':
          agentController.handleApproval(true);
          break;

        case 'reject':
          agentController.handleApproval(false);
          break;

        case 'run_learned_command':
          agentController.runLearnedCommand({
            commandName: message.commandName,
            cliScript: message.cliScript,
            domain: message.domain
          }).catch(err => {
            console.error('Learned command replay error:', err.message);
          });
          break;

        case 'stop':
          await agentController.stopMission();
          break;

        default:
          console.warn('Unknown WebSocket action:', message.action);
      }
    } catch (err) {
      console.error('Error processing client message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected.');
  });
});

// Start Server
async function start() {
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    for (const issue of envCheck.issues) {
      console.warn(`⚠️ CONFIG WARNING: ${issue}`);
    }
  }

  const doctor = await webcmdBridge.init();

  let daemonStatusLine;
  if (!doctor.installed) {
    daemonStatusLine = '❌ webcmd CLI: NOT INSTALLED! Run: npm install or npm install -g @agentrhq/webcmd';
  } else if (doctor.ok && doctor.daemonRunning) {
    daemonStatusLine = `🔌 webcmd Daemon: Connected on Port ${process.env.WEBCMD_PORT || 9777}`;
  } else {
    daemonStatusLine = `⚠️ webcmd Daemon: Offline (${doctor.error || 'Run: webcmd daemon restart'})`;
  }

  server.listen(PORT, () => {
    console.log(`
========================================================================
🚀 SLAB AGENT CONTROL CENTER is running!
🌐 URL: http://localhost:${PORT}
🤖 LLM: ${process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'}
${daemonStatusLine}
🛡️ HITL Approval Guard: ACTIVE (Hackathon Rule #2 Enforced)
========================================================================
    `);
  });
}

const isDirectRun = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('server.js')
);

if (isDirectRun) {
  start().catch(err => {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  });
}

export { app, server, start };
