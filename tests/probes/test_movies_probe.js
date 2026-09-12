import { webcmdBridge } from '../../src/webcmdBridge.js';

async function testSites() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('test-movie-probe');
  console.log('--- Testing BookMyShow & District URLs with session:', sessionId);
  
  // Test BookMyShow movies page
  const bmsTest = `
    try {
      await page.goto('https://in.bookmyshow.com/explore/movies-national-capital-region-ncr', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3000);
      const title = await page.title();
      const movies = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('a[href*="/movies/"]'));
        return cards.slice(0, 5).map(c => ({
          text: c.innerText.replace(/\\n+/g, ' | ').trim(),
          href: c.href
        }));
      });
      return { ok: true, title, moviesCount: movies.length, movies };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  `;
  
  const bmsRes = await webcmdBridge.runScript(sessionId, bmsTest);
  console.log('BookMyShow Result:', JSON.stringify(bmsRes, null, 2));

  // Test District
  const districtTest = `
    try {
      await page.goto('https://www.district.in', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3000);
      const title = await page.title();
      return { ok: true, title, url: page.url() };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  `;
  const distRes = await webcmdBridge.runScript(sessionId, districtTest);
  console.log('District Result:', JSON.stringify(distRes, null, 2));
}

testSites().catch(console.error);
