import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  const sid = await webcmdBridge.createSession('district-movie-page');

  const testScript = `
    await page.goto('https://www.district.in/movies/mirzapur-the-movie-movie-tickets-MV181196', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    const movieData = await page.evaluate(() => {
      // Find "Book tickets" button
      const allButtons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const bookBtn = allButtons.find(b => (b.innerText || '').toLowerCase().includes('book ticket'));

      // Scrape movie details: Title, Genre, Language, Release date, Duration, About/Synopsis, Cast, etc.
      const title = document.querySelector('h1')?.innerText?.trim() || document.title;
      
      const textNodes = Array.from(document.querySelectorAll('p, span, div, h2, h3'))
        .map(el => (el.innerText || '').trim())
        .filter(t => t.length > 2 && t.length < 300);

      // Find about the movie / synopsis
      const aboutEl = Array.from(document.querySelectorAll('div, section, p')).find(el => {
        const t = (el.innerText || '').toLowerCase();
        return t.startsWith('about the movie') || t.startsWith('synopsis');
      });

      return {
        title,
        hasBookButton: Boolean(bookBtn),
        bookBtnText: bookBtn ? bookBtn.innerText.trim() : null,
        aboutText: aboutEl ? aboutEl.innerText.trim().slice(0, 300) : null,
        sampleDetails: textNodes.slice(0, 20)
      };
    });

    return movieData;
  `;

  const res = await webcmdBridge.runScript(sid, testScript, 45);
  console.log('Movie Page Inspect:', JSON.stringify(res.result, null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
