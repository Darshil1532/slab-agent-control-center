import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  const sid = await webcmdBridge.createSession('district-interact');

  const testScript = `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // 1. Click on Location button (the button next to logo)
    const locBtn = await page.evaluate(() => {
      // Find button next to logo or button with city name in header
      const buttons = Array.from(document.querySelectorAll('header button, div[class*="sticky"] button'));
      const btn = buttons.find(b => b.innerText && (b.innerText.includes('India') || b.innerText.length < 40)) || buttons[0];
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.innerText };
      }
      return { clicked: false };
    });

    await page.waitForTimeout(2000);

    // Inspect what modal or dropdown appeared for location
    const modalInfo = await page.evaluate(() => {
      const modal = document.querySelector('[class*="modal"], [class*="dialog"], [class*="dropdown"], div[class*="fixed"][class*="inset-0"]');
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ placeholder: i.placeholder, class: i.className }));
      const popularCities = Array.from(document.querySelectorAll('div, button, a, p, span'))
        .filter(el => ['delhi', 'mumbai', 'bengaluru', 'gurugram', 'gurgaon', 'hyderabad', 'pune', 'chennai', 'kolkata'].includes((el.innerText || '').trim().toLowerCase()))
        .map(el => ({ tag: el.tagName, text: el.innerText.trim(), class: el.className }));

      return {
        hasModal: Boolean(modal),
        inputs,
        popularCities: popularCities.slice(0, 10)
      };
    });

    return { locBtn, modalInfo };
  `;

  const res = await webcmdBridge.runScript(sid, testScript, 45);
  console.log('Location Click Result:', JSON.stringify(res.result, null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
