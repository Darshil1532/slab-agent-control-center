import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  console.log('Creating session...');
  const sid = await webcmdBridge.createSession('inspect-win');
  console.log('Session ID:', sid);
  console.log('Opening page and waiting 12 seconds...');
  const res = await webcmdBridge.runScript(sid, `
    await page.goto('https://example.com');
    await page.waitForTimeout(12000);
    return { title: await page.title() };
  `, 25);
  console.log('Result:', res);
  await webcmdBridge.closeSession(sid);
  console.log('Closed.');
  process.exit(0);
})();
