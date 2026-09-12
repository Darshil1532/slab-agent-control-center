import { webcmdBridge } from '../../src/webcmdBridge.js';

async function testTimeblockClick() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('test-timeblock');

  const script = `
    await page.goto('https://www.district.in/movies/mirzapur-the-movie-movie-tickets-in-gurgaon-MV181196', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Find the first greenCol timeblock and click it
    const timeblock = page.locator('li[class*="timeblock"] div[class*="greenCol"]').first();
    const timeText = await timeblock.innerText();
    console.log('Clicking available time:', timeText);

    await timeblock.click();
    await page.waitForTimeout(4000);

    const newUrl = page.url();
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 1000));

    return { clickedTime: timeText, newUrl, bodySnippet };
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('Timeblock Click Result:', JSON.stringify(res.result || res, null, 2));
}

testTimeblockClick().catch(console.error);
