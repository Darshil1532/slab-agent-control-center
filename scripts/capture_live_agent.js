import fs from 'fs';
import path from 'path';
import { webcmdBridge } from '../src/webcmdBridge.js';

async function main() {
  console.log('🚀 Starting Cloak Chromium agent live capture...');
  process.env.WEBCMD_WINDOW = 'foreground';
  await webcmdBridge.init();

  const sessionId = await webcmdBridge.createSession('agent-live-demo');
  console.log('Session created:', sessionId);

  // Step 1: Navigate to District movies in Cloak Chromium
  console.log('Step 1: Navigating to District Movies in Cloak Chromium...');
  const navRes = await webcmdBridge.runScript(sessionId, `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);
    return { title: await page.title(), url: page.url() };
  `, 45);
  console.log('Navigation:', navRes.ok ? 'SUCCESS' : 'FAILED', navRes.result);

  // Capture Screenshot 1 from inside Cloak Chromium
  console.log('Capturing Screenshot 1 from Cloak Chromium...');
  const screen1 = await webcmdBridge.captureScreenshot(sessionId);
  if (screen1) {
    const out1 = path.join(
      'C:\\Users\\darsh\\.gemini\\antigravity-ide\\brain\\28be6053-3902-42e2-adf0-6c5ddf68f9dd',
      'cloak_chrome_district_nav.jpg'
    );
    fs.writeFileSync(out1, Buffer.from(screen1, 'base64'));
    console.log('Saved Screenshot 1 to:', out1);
  }

  // Step 2: Agent searches for a movie in Cloak Chromium
  console.log('Step 2: Searching for movie on District in Cloak Chromium...');
  const searchRes = await webcmdBridge.runScript(sessionId, `
    const searchBtn = page.locator('button:has-text("Search"), input[placeholder*="Search"], div[class*="search"]').first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await page.waitForTimeout(1000);
    }
    const input = page.locator('input[type="text"], input[type="search"]').first();
    if (await input.isVisible()) {
      await input.fill('Stree 2');
      await page.waitForTimeout(2000);
    }
    return { searched: true, title: await page.title() };
  `, 45);
  console.log('Search:', searchRes.ok ? 'SUCCESS' : 'FAILED');

  // Capture Screenshot 2 from inside Cloak Chromium
  console.log('Capturing Screenshot 2 from Cloak Chromium...');
  const screen2 = await webcmdBridge.captureScreenshot(sessionId);
  if (screen2) {
    const out2 = path.join(
      'C:\\Users\\darsh\\.gemini\\antigravity-ide\\brain\\28be6053-3902-42e2-adf0-6c5ddf68f9dd',
      'cloak_chrome_district_search.jpg'
    );
    fs.writeFileSync(out2, Buffer.from(screen2, 'base64'));
    console.log('Saved Screenshot 2 to:', out2);
  }

  console.log('Agent live capture complete! Chrome remains active.');
}

main().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
