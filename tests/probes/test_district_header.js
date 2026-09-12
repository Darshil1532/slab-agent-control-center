import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  const sid = await webcmdBridge.createSession('district-header');

  const testScript = `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    const res = await page.evaluate(() => {
      // Find header or top nav
      const header = document.querySelector('header, nav, [class*="Header"], [class*="nav"]') || document.body.firstElementChild;
      
      // Look for search bar text: "Search for event movies and restaurants"
      const allDivs = Array.from(document.querySelectorAll('div, button, span, p, a, input'));
      
      const searchMatch = allDivs.find(el => {
        const t = (el.innerText || el.placeholder || '').toLowerCase();
        return t.includes('search for') || t.includes('movies and restaurants') || t.includes('search event');
      });

      // Look for location button (near logo)
      const locationMatch = allDivs.filter(el => {
        const text = (el.innerText || '').trim();
        // Typically something like "Delhi NCR", "Gurgaon", "Mumbai", or a location pin
        return text.includes('Delhi') || text.includes('NCR') || text.includes('Mumbai') || text.includes('Bengaluru') || text.includes('Location');
      }).slice(0, 10).map(el => ({
        tag: el.tagName,
        text: el.innerText.trim().slice(0, 40),
        class: el.className
      }));

      return {
        searchElement: searchMatch ? {
          tag: searchMatch.tagName,
          text: (searchMatch.innerText || '').trim().slice(0, 80),
          placeholder: searchMatch.placeholder || '',
          class: searchMatch.className
        } : null,
        locationMatch
      };
    });

    return res;
  `;

  const res = await webcmdBridge.runScript(sid, testScript, 45);
  console.log('Header elements:', JSON.stringify(res.result, null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
