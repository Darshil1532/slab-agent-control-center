import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  const sid = await webcmdBridge.createSession('district-book-click');

  const testScript = `
    await page.goto('https://www.district.in/movies/mirzapur-the-movie-movie-tickets-MV181196', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // Click "Book Tickets"
    const bookBtn = page.locator('button:has-text("Book Tickets"), a:has-text("Book Tickets"), [role="button"]:has-text("Book Tickets")').first();
    let clicked = false;
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      clicked = true;
      await page.waitForTimeout(3000);
    }

    // Inspect the page after clicking Book Tickets
    const afterClick = await page.evaluate(() => {
      // Look for cinema / venue names
      const cinemaCards = Array.from(document.querySelectorAll('div[class*="cinema"], div[class*="venue"], [class*="theatre"], [class*="card"], li, div[class*="border"]'))
        .map(el => (el.innerText || '').trim())
        .filter(t => t.length > 5 && (t.includes('PM') || t.includes('AM') || t.includes('Cinepolis') || t.includes('PVR') || t.includes('INOX') || t.includes('Wave') || t.includes('Mall')));

      // Look for movie details text (synopsis, genre, language, certificate, cast)
      const allText = document.body.innerText;

      return {
        url: window.location.href,
        cinemaCards: cinemaCards.slice(0, 8),
        bodySnippet: allText.slice(0, 1000)
      };
    });

    return { clicked, afterClick };
  `;

  const res = await webcmdBridge.runScript(sid, testScript, 45);
  console.log('Book Click Result:', JSON.stringify(res.result, null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
