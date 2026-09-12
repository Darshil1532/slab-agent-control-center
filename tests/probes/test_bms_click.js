import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeClickBook() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-click-book');

  const script = `
    await page.goto('https://in.bookmyshow.com/movies/national-capital-region-ncr/mirzapur-the-movie/ET00417686', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Click Book tickets
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('book ticket'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    await page.waitForTimeout(4000);

    // Check if format popup appeared (e.g. 2D, IMAX 2D) or if navigated to buy tickets
    const url = page.url();
    const title = await page.title();

    // Check if format buttons exist or cinemas list
    const pageState = await page.evaluate(() => {
      const formats = Array.from(document.querySelectorAll('div[class*="format"], span[class*="format"], ul li span')).map(s => s.innerText.trim()).filter(s => s.length > 0 && s.length < 20);
      const cinemas = Array.from(document.querySelectorAll('a[class*="venue"], a[href*="/cinemas/"], .venue-info, .cinema-name')).map(c => c.innerText.trim());
      const showtimes = Array.from(document.querySelectorAll('a[class*="showtime"], .showtime-pill, div[data-showtime-code], div[class*="showtime"]')).map(st => st.innerText.trim());
      return { formats: formats.slice(0, 5), cinemas: cinemas.slice(0, 5), showtimes: showtimes.slice(0, 10) };
    });

    return { clicked, url, title, pageState };
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('Book Click Result:', JSON.stringify(res.result || res, null, 2));
}

probeClickBook().catch(console.error);
