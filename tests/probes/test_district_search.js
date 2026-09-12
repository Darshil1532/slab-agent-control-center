import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  const sid = await webcmdBridge.createSession('district-search-test');

  const testScript = `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // 1. Click on "Search for events, movies and restaurants"
    const searchTrigger = page.locator('text=Search for events').first();
    if (await searchTrigger.isVisible()) {
      await searchTrigger.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto('https://www.district.in/search?tab=movies');
      await page.waitForTimeout(2000);
    }

    const currentUrl = page.url();

    // 2. Find the search input
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="Search"]').first();
    const isInputVisible = await searchInput.isVisible();
    let placeholder = '';
    if (isInputVisible) {
      placeholder = await searchInput.getAttribute('placeholder');
      // Type "Mirzapur"
      await searchInput.fill('Mirzapur');
      await page.waitForTimeout(2500);
    }

    // 3. Inspect search results
    const searchResults = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('a[href*="/movies/"], [class*="card"], [class*="result"], li, [role="listitem"]'))
        .filter(el => {
          const t = (el.innerText || '').toLowerCase();
          return t.includes('mirzapur');
        })
        .map(el => ({
          tag: el.tagName,
          text: (el.innerText || '').split(String.fromCharCode(10)).slice(0, 3).join(' | '),
          href: el.getAttribute('href') || (el.querySelector('a') ? el.querySelector('a').href : '')
        }));
      return cards.slice(0, 5);
    });

    return { currentUrl, isInputVisible, placeholder, searchResults };
  `;

  const res = await webcmdBridge.runScript(sid, testScript, 45);
  console.log('Search Test Result:', JSON.stringify(res.result, null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
