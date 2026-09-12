import { webcmdBridge } from '../src/webcmdBridge.js';
import { hitlGuard } from '../src/hitlGuard.js';
import { geminiClient } from '../src/geminiClient.js';
import { runJobApplicationMatcher } from '../src/workflows/jobApplicationMatcher.js';

async function main() {
  console.log('--- Testing Workflow 3: Job Application Auto-Filler & Skill Matcher ---');
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('test-job-matcher');
  console.log('Session ID:', sessionId);

  const goal = "Search hiring board for Senior Full-Stack Engineer / AI Engineer roles, match candidate skills (Node.js, React, Playwright, Python), prefill application form, and request submission gate";
  const url = "https://news.ycombinator.com/jobs";

  const emit = (type, data) => {
    console.log(`[EVENT: ${type}]`, data.title || data.message || data.status || '');
    if (type === 'approval_required') {
      console.log('>>> JOB SUBMISSION HITL GATE ARMED! Approving in 2 seconds...');
      setTimeout(() => {
        if (webcmdBridge.currentApprovalPromise) {
          webcmdBridge.currentApprovalPromise(true);
          webcmdBridge.currentApprovalPromise = null;
        }
      }, 2000);
    }
  };

  try {
    const result = await runJobApplicationMatcher({
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
    console.log('Matched Company:', result.bestJob?.company);
    console.log('Match Score:', result.matchResult?.matchScore);
    console.log('Matching Skills:', result.matchResult?.matchingSkills);
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await webcmdBridge.closeSession(sessionId);
    console.log('Test complete.');
  }
}

main().catch(console.error);
