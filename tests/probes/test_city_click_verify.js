import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  const sid = await webcmdBridge.createSession('test-city-click');

  const testScript = `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // 1. Click Location button in header
    const locBtn = page.locator('header button, div[class*="sticky"] button').first();
    await locBtn.click();
    await page.waitForTimeout(1500);

    // 2. Type "Gurgaon" or "Delhi"
    const cityInput = page.locator('input[placeholder*="Search city"]').first();
    await cityInput.fill('Gurgaon');
    await page.waitForTimeout(2000);

    // 3. Click the suggestion item
    // Look for element with text "Gurgaon" and "Haryana"
    const suggestion = page.locator('text=Haryana, India').first();
    const isSugVis = await suggestion.isVisible();
    if (isSugVis) {
      await suggestion.click();
      await page.waitForTimeout(3000);
    } else {
      // Fallback click on any suggestion with Gurgaon
      const anySug = page.locator('div[class*="modal"] text=Gurgaon, div[class*="fixed"] text=Gurgaon').first();
      if (await anySug.isVisible()) {
        await anySug.click();
        await page.waitForTimeout(3000);
      }
    }

    // 4. Verify updated header button
    const headerCity = await page.evaluate(() => {
      const btn = document.querySelector('header button, div[class*="sticky"] button');
      return btn ? btn.innerText.trim() : '';
    });

    return { isSugVis, headerCity, url: page.url() };
  `;

  const res = await webcmdBridge.runScript(sid, testScript, 45);
  console.log('City Click Verification:', JSON.stringify(res.result, null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
