import { webcmdBridge } from '../src/webcmdBridge.js';
import { hitlGuard } from '../src/hitlGuard.js';
import { geminiClient } from '../src/geminiClient.js';
import { runGithubDeepDiver } from '../src/workflows/githubDeepDiver.js';

async function main() {
  console.log('--- Testing Workflow 1: GitHub Tech Stack & Repo Deep-Diver ---');
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('test-gh-dive');
  console.log('Session ID:', sessionId);

  const goal = "Deep dive into facebook/react on GitHub and extract tech stack and architecture";
  const url = "https://github.com/facebook/react";

  const emit = (type, data) => {
    console.log(`[EVENT: ${type}]`, data.title || data.message || data.status || '');
  };

  try {
    const result = await runGithubDeepDiver({
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
    console.log('Repo Name:', result.repoData?.repoName);
    console.log('Stars:', result.repoData?.stars);
    console.log('Languages:', result.repoData?.languages);
    console.log('Tech Report Headline:', result.techReport?.headline);
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await webcmdBridge.closeSession(sessionId);
    console.log('Test complete.');
  }
}

main().catch(console.error);
