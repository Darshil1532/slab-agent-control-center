import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  console.log('Inspecting District header & search elements...');
  const sid = await webcmdBridge.createSession('district-detail');

  const testScript = `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
      // Find all elements near the top with text or icons
      const topBar = Array.from(document.querySelectorAll('header *, nav *, [class*="header"] *'))
        .filter(el => el.children.length === 0 && (el.innerText || el.textContent || '').trim().length > 0)
        .map(el => ({
          text: (el.innerText || el.textContent).trim(),
          tag: el.tagName,
          class: el.className,
          parentClass: el.parentElement ? el.parentElement.className : ''
        }))
        .slice(0, 30);

      // Search bar elements
      const searchElements = Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const text = (el.innerText || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').toLowerCase();
          return text.includes('search for') || text.includes('search event') || text.includes('movies and restaurants') || text.includes('search city');
        })
        .map(el => ({
          tag: el.tagName,
          text: el.innerText ? el.innerText.trim().slice(0, 50) : '',
          placeholder: el.getAttribute('placeholder'),
          ariaLabel: el.getAttribute('aria-label'),
          className: el.className
        }));

      // Find location selector element (usually near logo)
      const locationEls = Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = (el.innerText || '').trim();
          return ['gurugram', 'gurgaon', 'delhi', 'mumbai', 'bengaluru', 'select location', 'location'].some(c => t.toLowerCase() === c || t.toLowerCase().startsWith(c));
        })
        .map(el => ({
          tag: el.tagName,
          text: el.innerText.trim(),
          className: el.className
        }));

      return { topBar, searchElements, locationEls };
    });

    return data;
  `;

  const res = await webcmdBridge.runScript(sid, testScript, 45);
  console.log('Result:', JSON.stringify(res.result, null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
