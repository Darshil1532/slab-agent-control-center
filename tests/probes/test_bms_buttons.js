import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeBMSShowtimes() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-bms-showtimes');
  
  const script = `
    await page.goto('https://in.bookmyshow.com/movies/national-capital-region-ncr/mirzapur-the-movie/ET00417686', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const info = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a')).map(b => ({
        text: (b.innerText || '').trim(),
        tag: b.tagName,
        href: b.href || '',
        id: b.id || '',
        className: (b.className || '').slice(0, 40)
      })).filter(b => b.text.toLowerCase().includes('book') || b.text.toLowerCase().includes('ticket') || b.text.toLowerCase().includes('interest'));
      return buttons;
    });

    return info;
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('Buttons:', JSON.stringify(res.result || res, null, 2));
}

probeBMSShowtimes().catch(console.error);
