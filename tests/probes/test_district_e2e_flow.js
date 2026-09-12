import { webcmdBridge } from '../../src/webcmdBridge.js';
import { geminiClient } from '../../src/geminiClient.js';

(async () => {
  const movieTitle = 'Mirzapur: The Movie';
  const targetCity = 'Gurgaon';

  console.log(`Starting test run for movie "${movieTitle}" in city "${targetCity}"...`);
  const sid = await webcmdBridge.createSession('test-movie-flow');

  // Step 1: Go to https://www.district.in/movies/ and select city if specified
  const step1Script = `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    let citySelected = false;
    // Click location button next to logo
    const locBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('header button, div[class*="sticky"] button'));
      const btn = buttons.find(b => b.innerText && (b.innerText.includes('India') || b.innerText.length < 40)) || buttons[0];
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.innerText };
      }
      return { clicked: false };
    });

    if (locBtn && locBtn.clicked) {
      await page.waitForTimeout(1500);
      // Type target city into location search
      const cityInput = page.locator('input[placeholder*="Search city"]').first();
      if (await cityInput.isVisible()) {
        await cityInput.fill('${targetCity}');
        await page.waitForTimeout(1500);

        // Click the first matching city suggestion
        const clickedOption = await page.evaluate((cityName) => {
          const els = Array.from(document.querySelectorAll('div[class*="fixed"] div, div[class*="fixed"] li, div[class*="modal"] *'))
            .filter(el => {
              const t = (el.innerText || '').toLowerCase();
              return t.includes(cityName.toLowerCase());
            });
          const target = els.find(el => el.children.length === 0 || el.children.length === 1);
          if (target) {
            target.click();
            return { clicked: true, text: target.innerText };
          }
          return { clicked: false };
        }, '${targetCity}');

        citySelected = clickedOption.clicked;
        await page.waitForTimeout(2000);
      }
    }

    return { ok: true, citySelected, currentUrl: page.url() };
  `;

  console.log('Running Step 1: Navigating and selecting city...');
  const res1 = await webcmdBridge.runScript(sid, step1Script, 45);
  console.log('Step 1 result:', res1.result);

  // Step 2 & 3: Click search, type movie title
  const step2Script = `
    // Click search trigger or go to search page
    const searchTrigger = page.locator('text=Search for events').first();
    if (await searchTrigger.isVisible()) {
      await searchTrigger.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto('https://www.district.in/search?tab=movies');
      await page.waitForTimeout(2000);
    }

    // Type movie title in search input
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('${movieTitle}');
      await page.waitForTimeout(2500);
    }

    // Find and click the movie result
    const movieTarget = await page.evaluate((titleQuery) => {
      const links = Array.from(document.querySelectorAll('a[href*="/movies/"]'));
      const found = links.find(a => {
        const text = (a.innerText || '').toLowerCase();
        return text.includes(titleQuery.toLowerCase().split(' ')[0]) || text.includes('mirzapur');
      }) || links[0];

      if (found) {
        return { found: true, href: found.href, text: found.innerText };
      }
      return { found: false };
    }, '${movieTitle}');

    if (movieTarget && movieTarget.href) {
      await page.goto(movieTarget.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
    }

    return { ok: true, movieTarget, currentUrl: page.url() };
  `;

  console.log('Running Step 2 & 3: Searching and opening movie page...');
  const res2 = await webcmdBridge.runScript(sid, step2Script, 45);
  console.log('Step 2 result:', res2.result);

  // Step 4: Click Book Tickets and scrape details + showtimes
  const step3Script = `
    const bookBtn = page.locator('button:has-text("Book Tickets"), a:has-text("Book Tickets"), [role="button"]:has-text("Book Tickets")').first();
    let bookedClicked = false;
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      bookedClicked = true;
      await page.waitForTimeout(3500);
    }

    const scrapedData = await page.evaluate((isClicked) => {
      const title = document.querySelector('h1')?.innerText?.trim() || document.title;
      const fullText = document.body.innerText;

      // Extract cinema venue cards
      const cinemaCards = Array.from(document.querySelectorAll('div[class*="border"], div[class*="cinema"], div[class*="venue"], li'))
        .map(el => (el.innerText || '').trim())
        .filter(t => t.length > 5 && (t.includes('PM') || t.includes('AM') || t.includes('Mall') || t.includes('INOX') || t.includes('PVR') || t.includes('Cinepolis')));

      return {
        title,
        url: window.location.href,
        bookedClicked: isClicked,
        cinemaCount: cinemaCards.length,
        venuesSnippet: cinemaCards.slice(0, 5),
        fullTextSnippet: fullText.slice(0, 1500)
      };
    }, bookedClicked);

    return scrapedData;
  `;

  console.log('Running Step 4: Clicking Book Tickets & scraping details...');
  const res3 = await webcmdBridge.runScript(sid, step3Script, 45);
  console.log('Step 3 full res:', JSON.stringify(res3, null, 2));

  // Step 5: Generate unforced summary with Gemini
  console.log('Running Step 5: Generating unforced Markdown summary with Gemini...');
  const summaryPrompt = `Based on the following live data scraped from District (district.in) for the movie "${movieTitle}" in "${targetCity}":

Page Details:
${res3.result?.fullTextSnippet || ''}

Venues Scraped:
${JSON.stringify(res3.result?.venuesSnippet || [], null, 2)}

Generate a comprehensive, beautifully structured Markdown executive summary of the movie. Include:
- Title, Release Year, Certificate / Censor Rating, Duration, Language, and Genres
- Synopsis / About the Movie & Cast / Crew details
- Available Cinemas, Showtimes, and booking status in ${targetCity}
- Value recommendation for tickets
Format with clean GitHub-flavored markdown with emojis, tables, and bullet points.`;

  const mdSummary = await geminiClient.generateContent(summaryPrompt, 'You are an autonomous cinema intelligence agent. Return pure markdown.');
  console.log('\n--- Generated Markdown Summary ---\n', mdSummary);

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
