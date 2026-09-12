import { webcmdBridge } from '../src/webcmdBridge.js';
import { hitlGuard } from '../src/hitlGuard.js';
import { geminiClient } from '../src/geminiClient.js';
import { runExecutiveBriefing } from '../src/workflows/executiveBriefing.js';

async function main() {
  console.log('--- Testing Workflow 5: Custom Daily Executive Briefing ---');
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('test-exec-briefing');
  console.log('Session ID:', sessionId);

  const goal = "Check Hacker News, Bloomberg, and CoinDesk, filter out hype/sponsored posts, and give me a 3-minute bulleted digest of major macro tech shifts today.";
  const url = "";

  const emit = (type, data) => {
    console.log(`[EVENT: ${type}]`, data.title || data.message || data.status || '');
  };

  try {
    const result = await runExecutiveBriefing({
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
    console.log('Takeaway:', result.executiveTakeaway);
    console.log('Macro Tech Count:', result.macroTech?.length);
    console.log('Capital Markets Count:', result.capitalMarkets?.length);
    console.log('Crypto Count:', result.institutionalCrypto?.length);
    console.log('Discarded Hype Items:', result.discardedHype?.length);
    console.log('Test complete.');
  } catch (err) {
    console.error('Test error:', err);
  }
}

main().catch(console.error);
