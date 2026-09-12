import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  const sid = await webcmdBridge.createSession('district-city-sel');

  const testScript = `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // 1. Click on Location button (the button next to logo)
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('header button, div[class*="sticky"] button'));
      const btn = buttons.find(b => b.innerText && (b.innerText.includes('India') || b.innerText.length < 40)) || buttons[0];
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);

    // 2. Type "Gurgaon" into "Search city, area or locality"
    const cityInput = page.locator('input[placeholder*="Search city"]').first();
    if (await cityInput.isVisible()) {
      await cityInput.fill('Gurgaon');
      await page.waitForTimeout(1500);
    }

    // 3. Inspect search suggestions / city list
    const suggestions = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[class*="fixed"] li, div[class*="fixed"] [role="button"], div[class*="fixed"] div, div[class*="modal"] *'))
        .filter(el => {
          const t = (el.innerText || '').trim();
          return t.toLowerCase().includes('gurgaon') || t.toLowerCase().includes('gurugram') || t.toLowerCase().includes('delhi');
        })
        .map(el => ({ tag: el.tagName, text: el.innerText.trim(), class: el.className }));
      return items.slice(0, 5);
    });

    // 4. Click the first match
    const clickedMatch = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('*')).filter(el => {
        const t = (el.innerText || '').trim();
        return t.toLowerCase() === 'gurgaon' || t.toLowerCase() === 'gurugram' || t.toLowerCase().includes('gurugram') || t.toLowerCase().includes('gurgaon');
      });
      const target = els.find(el => el.children.length === 0 || el.children.length === 1);
      if (target) {
        target.click();
        return { clicked: true, text: target.innerText };
      }
      return { clicked: false };
    });

    await page.waitForTimeout(2000);

    // Inspect updated header button text
    const newCityText = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('header button, div[class*="sticky"] button'));
      return buttons[0] ? buttons[0].innerText : '';
    });

    return { suggestions, clickedMatch, newCityText };
  `;

  const res = await webcmdBridge.runScript(sid, testScript, 45);
  console.log('City Selection Result:', JSON.stringify(res, null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
