import { webcmdBridge } from '../../src/webcmdBridge.js';
import { hitlGuard } from '../../src/hitlGuard.js';
import { geminiClient } from '../../src/geminiClient.js';
import { runUniversalGoal } from '../../src/workflows/universalEngine.js';

async function main() {
  console.log('--- Testing Autonomous Multi-Step Agent on VTOP ---');
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('test-vtop-auto');
  console.log('Session ID:', sessionId);

  const goal = "Go to the student profile. And enter my details and the captcha. 25BCE10213 and Vishnu1234/ and there will be captcha";
  const url = "https://vtop.vitbhopal.ac.in/vtop/open/page";

  const emit = (type, data) => {
    console.log(`[EVENT: ${type}]`, data.title || data.message || data.status || '');
    if (type === 'approval_required') {
      console.log('>>> RULE #2 HITL GATE ARMED! Approving in 2 seconds...');
      setTimeout(() => {
        if (webcmdBridge.currentApprovalPromise) {
          console.log('>>> Operator clicked "Approve & Authorize"!');
          webcmdBridge.currentApprovalPromise(true);
          webcmdBridge.currentApprovalPromise = null;
        }
      }, 2000);
    }
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
    console.log('Steps executed:', result.steps);
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await webcmdBridge.closeSession(sessionId);
    console.log('Test complete.');
  }
}

main().catch(console.error);
