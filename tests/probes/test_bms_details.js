import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeBMSDetails() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-bms-details');
  
  const script = `
    await page.goto('https://in.bookmyshow.com/explore/movies-national-capital-region-ncr', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
      // Find movie links
      const links = Array.from(document.querySelectorAll('a[href*="/movies/"]'));
      const items = [];
      for (const a of links) {
        const title = a.innerText.trim();
        if (title && title.length > 2 && !title.includes('See all') && items.length < 5) {
          items.push({ title: title.split('\\n')[0], href: a.href });
        }
      }
      return items;
    });

    let moviePageData = null;
    if (data.length > 0) {
      // Visit first movie
      await page.goto(data[0].href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      const mTitle = await page.title();
      const bookBtn = await page.evaluate(() => {
        const btn = document.querySelector('button[data-phase="postLaunch"], button[class*="Book"], a[href*="/buytickets/"]');
        return btn ? { text: btn.innerText, href: btn.href || '' } : null;
      });
      moviePageData = { title: mTitle, url: page.url(), bookBtn };
    }

    return { movies: data, moviePageData };
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('Probe result:', JSON.stringify(res.result || res, null, 2));
}

probeBMSDetails().catch(console.error);
