import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  console.log('Creating session...');
  const sid = await webcmdBridge.createSession('test-vis-win');
  console.log('Session ID:', sid);
  console.log('Running script in session...');
  const res = await webcmdBridge.runScript(sid, `
    await page.goto('https://example.com');
    await page.waitForTimeout(4000);
    return { title: await page.title() };
  `);
  console.log('Result:', JSON.stringify(res, null, 2));
  await webcmdBridge.closeSession(sid);
  console.log('Closed.');
  process.exit(0);
})();
