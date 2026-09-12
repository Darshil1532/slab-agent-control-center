import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../server.js';

let testServer;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    testServer = http.createServer(app);
    testServer.listen(0, '127.0.0.1', () => {
      const addr = testServer.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
  }
});

test('REST API: /healthz container probe', async (t) => {
  await t.test('returns 200 and healthy status metadata', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'healthy');
    assert.equal(typeof body.uptime, 'number');
    assert.ok(body.timestamp);
    assert.ok(body.agentState);
  });
});

test('REST API: /api/status endpoint', async (t) => {
  await t.test('returns 200 and daemon/model diagnostic payload', async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.model);
    assert.ok(typeof body.isRunning === 'boolean');
  });
});

test('REST API: /api/recipes catalog', async (t) => {
  await t.test('returns 200 and available compiled workflows', async () => {
    const res = await fetch(`${baseUrl}/api/recipes`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(typeof body.count === 'number');
    assert.ok(Array.isArray(body.recipes));
  });
});

test('REST API: /api/action/approve & /reject', async (t) => {
  await t.test('handles approval resolution with 200 response', async () => {
    const res = await fetch(`${baseUrl}/api/action/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.hasOwnProperty('handled'));
  });

  await t.test('handles rejection resolution with 200 response', async () => {
    const res = await fetch(`${baseUrl}/api/action/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.hasOwnProperty('handled'));
  });
});

test('REST API: /api/tokens telemetry', async (t) => {
  await t.test('returns 200 and real token tracking statistics', async () => {
    const res = await fetch(`${baseUrl}/api/tokens`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.replayTokens, 0);
    assert.ok(typeof body.totalTokens === 'number');
    assert.ok(typeof body.totalPromptTokens === 'number');
    assert.ok(body.savingsExplanation);
  });
});
