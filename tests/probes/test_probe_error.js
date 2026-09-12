import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  await webcmdBridge.init();
  try {
    const sid = await webcmdBridge.createSession('probe');
    console.log('Session created:', sid);

    const res = await webcmdBridge.runScript(sid, 'await page.goto("https://news.ycombinator.com"); return { title: await page.title() };');
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Caught error:', err);
  }
  process.exit(0);
})();
