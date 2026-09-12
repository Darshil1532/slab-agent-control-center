import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { agentController } from './src/agent.js';
import { webcmdBridge } from './src/webcmdBridge.js';
import { recipeManager } from './src/recipeManager.js';

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
  broadcast(event);
});

// REST Endpoints
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
  const memory = await webcmdBridge.getSiteMemoryContext(url);
  res.json(memory);
});

app.post('/api/action/approve', (req, res) => {
  const handled = agentController.handleApproval(true);
  res.json({ handled });
});

app.post('/api/action/reject', (req, res) => {
  const handled = agentController.handleApproval(false);
  res.json({ handled });
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
          agentController.startMission({
            workflow: message.workflow,
            params: message.params || {}
          }).catch(err => {
            console.error('Workflow error:', err.message);
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
  await webcmdBridge.init();
  server.listen(PORT, () => {
    console.log(`
========================================================================
🚀 SLAB AGENT CONTROL CENTER is running!
🌐 URL: http://localhost:${PORT}
🤖 LLM: ${process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'}
🔌 webcmd Daemon: Connected on Port ${process.env.WEBCMD_PORT || 9777}
🛡️ HITL Approval Guard: ACTIVE (Hackathon Rule #2 Enforced)
========================================================================
    `);
  });
}

start().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
