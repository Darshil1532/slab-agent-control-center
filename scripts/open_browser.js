import { webcmdBridge } from '../src/webcmdBridge.js';

async function main() {
  console.log('🚀 Initializing Cloak Chromium in visible foreground...');
  process.env.WEBCMD_WINDOW = 'foreground';
  await webcmdBridge.init();

  const sessionId = await webcmdBridge.createSession('live-browser');
  console.log(`🌐 Session created: ${sessionId}`);

  console.log('Opening Chrome window...');
  const res = await webcmdBridge.runScript(sessionId, `
    await page.goto('https://district.in/movies', { timeout: 30000, waitUntil: 'domcontentloaded' });
    return { title: await page.title(), url: page.url() };
  `, 45);

  console.log('Window status:', res.ok ? 'SUCCESS' : 'FAILED', res.result || res.error);
  console.log('Chrome is now open on your screen and ready for live automation!');
}

main().catch(err => {
  console.error('Failed to open browser:', err);
});
