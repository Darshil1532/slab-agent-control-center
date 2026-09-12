import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeDistrictSeatClick() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-seat-click');

  const script = `
    await page.goto('https://www.district.in/movies/mirzapur-the-movie-movie-tickets-in-gurgaon-MV181196', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Click a showtime button (e.g. text matching 10:00 PM or 11:15 PM)
    const clickedTime = await page.evaluate(() => {
      const showtimeEls = Array.from(document.querySelectorAll('*')).filter(el => {
        const t = (el.innerText || '').trim();
        return /^(0?[1-9]|1[0-2]):[0-5][0-9]\\s*(AM|PM)$/i.test(t);
      });

      if (showtimeEls.length > 0) {
        const target = showtimeEls[0];
        target.click();
        return target.innerText.trim();
      }
      return null;
    });

    await page.waitForTimeout(4000);

    const afterClick = await page.evaluate(() => {
      const text = document.body.innerText;
      const prices = text.match(/₹\\s*\\d+/g) || [];
      const categories = ['Recliner', 'Prime', 'Classic', 'Executive', 'Club', 'Normal', 'VIP'].filter(c => text.toLowerCase().includes(c.toLowerCase()));
      return {
        url: window.location.href,
        prices: prices.slice(0, 10),
        categories,
        snippet: text.slice(0, 600)
      };
    });

    return { clickedTime, afterClick };
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('District Seat Click Result:', JSON.stringify(res.result || res, null, 2));
}

probeDistrictSeatClick().catch(console.error);
