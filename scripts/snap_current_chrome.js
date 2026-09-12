import path from 'path';
import { webcmdBridge } from '../src/webcmdBridge.js';

async function main() {
  const sessions = await webcmdBridge.listSessions();
  console.log('Available sessions:', sessions.map(s => s.id));
  const activeSession = sessions.find(s => s.runtimeState === 'active') || sessions[0];
  if (!activeSession) {
    console.error('No session found!');
    process.exit(1);
  }

  const sid = activeSession.id;
  console.log(`Taking screenshot of session: ${sid}...`);

  const res = await webcmdBridge.runScript(sid, `
    await page.screenshot({ path: 'district_live_screen.png' });
    return { title: await page.title(), url: page.url() };
  `, 20);

  console.log('Result:', res);
}

main().catch(err => {
  console.error('Snap error:', err);
  process.exit(1);
});
