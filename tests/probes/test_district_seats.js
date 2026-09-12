import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeSeatLayout() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-seat-layout');

  const script = `
    await page.goto('https://www.district.in/movies/mirzapur-the-movie-movie-tickets-in-gurgaon-MV181196', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const timeblock = page.locator('li[class*="timeblock"] div[class*="greenCol"]').first();
    const timeText = await timeblock.innerText();
    await timeblock.click();
    await page.waitForTimeout(4000);

    // Look for seat layout pricing tiers & seats
    const seatData = await page.evaluate(() => {
      const text = document.body.innerText;
      // Look for price amounts like ₹250, ₹180, etc.
      const prices = (text.match(/₹\\s*\\d+/g) || []).map(p => parseInt(p.replace(/[^0-9]/g, ''), 10));
      
      // Look for seat tier categories (e.g. NORMAL, EXECUTIVE, VIP, RECLINER, CLASSIC, CLUB)
      const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Find seat buttons or svg/canvas
      const seatNodes = Array.from(document.querySelectorAll('[class*="seat"], [data-seat], button[aria-label*="Seat"]')).length;

      return {
        url: window.location.href,
        prices: [...new Set(prices)].sort((a, b) => a - b),
        seatNodes,
        lines: lines.slice(0, 40)
      };
    });

    return { timeText, seatData };
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('Seat Layout Result:', JSON.stringify(res.result || res, null, 2));
}

probeSeatLayout().catch(console.error);
