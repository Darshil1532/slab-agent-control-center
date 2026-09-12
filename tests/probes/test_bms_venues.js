import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeCinemaShowtimes() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-cinemas');

  const script = `
    await page.goto('https://in.bookmyshow.com/movies/national-capital-region-ncr/mirzapur-the-movie/ET00417686', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('book ticket'));
      if (btn) { btn.click(); return true; }
      return false;
    });

    await page.waitForTimeout(3000);

    const venues = await page.evaluate(() => {
      // Find venue blocks
      const venueCards = Array.from(document.querySelectorAll('li.synopsis-item, div[data-cinema-id], div[class*="venue"], li[class*="list"]'));
      
      const allText = Array.from(document.querySelectorAll('a[href*="/buytickets/"]')).map(a => ({
        href: a.href,
        text: a.innerText.replace(/\\n+/g, ' ').trim()
      }));

      // Also get any time buttons
      const timeButtons = Array.from(document.querySelectorAll('a, button, div')).filter(el => {
        const t = el.innerText ? el.innerText.trim() : '';
        return /^(0?[1-9]|1[0-2]):[0-5][0-9]\\s*(AM|PM)?$/i.test(t);
      }).slice(0, 10).map(el => ({
        time: el.innerText.trim(),
        tag: el.tagName,
        classes: el.className
      }));

      return {
        buyTicketLinks: allText.slice(0, 10),
        timeButtons
      };
    });

    return venues;
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('Venues Result:', JSON.stringify(res.result || res, null, 2));
}

probeCinemaShowtimes().catch(console.error);
