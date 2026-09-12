import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeDistrictShowtimes() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-district-showtimes');

  const script = `
    await page.goto('https://www.district.in/movies/mirzapur-the-movie-movie-tickets-in-gurgaon-MV181196', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    const data = await page.evaluate(() => {
      const title = document.title;
      const body = document.body.innerText;
      
      // Look for cinema names, showtimes, and prices
      const lines = body.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
      
      return {
        title,
        sampleLines: lines.slice(0, 50)
      };
    });

    return data;
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('District Showtimes Result:', JSON.stringify(res.result || res, null, 2));
}

probeDistrictShowtimes().catch(console.error);
