import { webcmdBridge } from '../../src/webcmdBridge.js';
import fs from 'fs';

async function main() {
  const sid = await webcmdBridge.createSession('test-debug-run');
  await webcmdBridge.runScript(sid, `
    await page.goto('https://www.youtube.com/results?search_query=hindi+song', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
  `);

  // Read inspectScript exactly as used in autonomousAgent.js
  const fileContent = fs.readFileSync('./src/workflows/autonomousAgent.js', 'utf8');
  const match = fileContent.match(/const inspectScript = `([\s\S]*?)`;\s*const stateResult/);
  if (!match) {
    console.error('Could not extract inspectScript from file');
    return;
  }
  const inspectScript = match[1];

  console.log('Running extracted inspectScript...');
  const res = await webcmdBridge.runScript(sid, inspectScript);
  console.log('Result:', JSON.stringify(res, null, 2));
  await webcmdBridge.closeSession(sid);
}

main().catch(console.error);
