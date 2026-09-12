import { webcmdBridge } from '../../src/webcmdBridge.js';

async function testNativeClick() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('native-click');

  const script = `
    await page.goto('https://in.bookmyshow.com/movies/national-capital-region-ncr/mirzapur-the-movie/ET00417686', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Find and click the Book tickets button natively
    const bookBtn = page.locator('button:has-text("Book tickets")').first();
    const isVisible = await bookBtn.isVisible();
    console.log('Book button visible:', isVisible);

    if (isVisible) {
      await bookBtn.click();
      await page.waitForTimeout(3000);
    }

    const currentUrl = page.url();
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 800));

    return { isVisible, currentUrl, bodySnippet };
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('Native click result:', JSON.stringify(res.result || res, null, 2));
}

testNativeClick().catch(console.error);
