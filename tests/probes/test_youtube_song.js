import { webcmdBridge } from '../../src/webcmdBridge.js';
import { hitlGuard } from '../../src/hitlGuard.js';
import { geminiClient } from '../../src/geminiClient.js';
import { runUniversalGoal } from '../../src/workflows/universalEngine.js';

async function main() {
  console.log('--- Testing YouTube Song Playback without Loops ---');
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('test-yt-song');
  console.log('Session ID:', sessionId);

  const goal = "play on youtube hindi song";
  const url = "";

  const emit = (type, data) => {
    console.log(`[EVENT: ${type}]`, data.title || data.message || data.status || '');
  };

  try {
    const result = await runUniversalGoal({
      goal,
      url,
      sessionId,
      bridge: webcmdBridge,
      guard: hitlGuard,
      gemini: geminiClient,
      emit
    });

    console.log('--- Result ---');
    console.log('Success:', result.success);
    console.log('Steps:', result.steps);
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await webcmdBridge.closeSession(sessionId);
    console.log('Test complete.');
  }
}

main().catch(console.error);
