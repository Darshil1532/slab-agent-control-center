import { execSync } from 'child_process';
import { webcmdBridge } from '../../src/webcmdBridge.js';

process.env.WEBCMD_WINDOW = 'foreground';

(async () => {
  console.log('WEBCMD_WINDOW set to foreground');
  const sid = await webcmdBridge.createSession('fg-test');
  console.log('Session ID:', sid);
  const res = await webcmdBridge.runScript(sid, `
    await page.goto('https://example.com');
    await page.waitForTimeout(5000);
    return { title: await page.title() };
  `);
  console.log('Result:', res);
  await webcmdBridge.closeSession(sid);
  console.log('Closed.');
  process.exit(0);
})();
