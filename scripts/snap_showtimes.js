import path from 'path';
import { webcmdBridge } from '../src/webcmdBridge.js';

async function main() {
  const sid = 'agent-live-demo-by';
  console.log(`Clicking Book now in session ${sid}...`);

  const clickRes = await webcmdBridge.runScript(sid, `
    const bookBtn = page.locator('button:has-text("Book now"), button:has-text("Book"), [role="button"]:has-text("Book")').first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await page.waitForTimeout(3500);
    }
    await page.screenshot({ path: 'district_showtimes_live.png' });
    return { title: await page.title(), url: page.url() };
  `, 30);

  console.log('Click result:', clickRes);

  const art = clickRes.artifacts?.find(a => a.filename === 'district_showtimes_live.png');
  if (art) {
    console.log('Artifact ID:', art.artifactId);
  }
}

main().catch(console.error);
