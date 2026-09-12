import { webcmdBridge } from '../../src/webcmdBridge.js';

process.env.WEBCMD_WINDOW = 'foreground';

(async () => {
  const sid = await webcmdBridge.createSession('test-cdp-win');
  console.log('Session ID:', sid);
  
  const script = `
    let btf = 'ok';
    try {
      await page.bringToFront();
    } catch (e) {
      btf = 'error: ' + e.message;
    }
    await page.goto('https://example.com');
    await page.waitForTimeout(1000);
    return { title: await page.title(), btf };
  `;
  
  const res = await webcmdBridge.runScript(sid, script);
  console.log('Result:', res);
  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
