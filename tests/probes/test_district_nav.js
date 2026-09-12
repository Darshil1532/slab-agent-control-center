import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  const sid = await webcmdBridge.createSession('district-nav');

  const testScript = `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    const res = await page.evaluate(() => {
      // Find district logo (usually an img or svg with alt="district" or href="/")
      const logo = document.querySelector('img[alt*="district" i], a[href="/"], svg');
      
      // Let's find all elements near logo
      let logoArea = null;
      if (logo) {
        let p = logo.parentElement;
        while (p && p.tagName !== 'HEADER' && p.tagName !== 'NAV' && !p.className.includes('sticky') && p !== document.body) {
          p = p.parentElement;
        }
        logoArea = p;
      }

      // Find search link href
      const searchLink = Array.from(document.querySelectorAll('a')).find(a => (a.innerText || '').includes('Search for events'));

      // Find location selector - look for elements with location pin icon or city text near top
      const clickableInTop = Array.from(document.querySelectorAll('header *, nav *, div[class*="sticky"] *'))
        .filter(el => el.onclick || el.getAttribute('role') === 'button' || el.tagName === 'BUTTON' || (typeof el.className === 'string' && el.className.includes('cursor-pointer')))
        .map(el => ({
          tag: el.tagName,
          text: (el.innerText || '').trim().split(String.fromCharCode(10))[0],
          class: el.className,
          href: el.getAttribute('href') || ''
        }));

      return {
        searchLinkHref: searchLink ? searchLink.href : null,
        clickableInTop: clickableInTop.slice(0, 15)
      };
    });

    return res;
  `;

  const res = await webcmdBridge.runScript(sid, testScript, 45);
  console.log('Nav inspect:', JSON.stringify(res, null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
