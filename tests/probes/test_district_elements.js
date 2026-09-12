import { webcmdBridge } from '../../src/webcmdBridge.js';

async function inspectShowtimeElements() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('inspect-showtimes');

  const script = `
    await page.goto('https://www.district.in/movies/mirzapur-the-movie-movie-tickets-in-gurgaon-MV181196', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const showtimeData = await page.evaluate(() => {
      // Find elements containing times like 10:00 PM
      const matches = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        const val = node.nodeValue.trim();
        if (/^(0?[1-9]|1[0-2]):[0-5][0-9]\\s*(AM|PM)$/i.test(val)) {
          const parent = node.parentElement;
          matches.push({
            time: val,
            tag: parent.tagName,
            classes: parent.className,
            parentTag: parent.parentElement ? parent.parentElement.tagName : null,
            parentClasses: parent.parentElement ? parent.parentElement.className : null,
            href: parent.href || (parent.parentElement ? parent.parentElement.href : null)
          });
        }
      }
      return matches;
    });

    return showtimeData;
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('Showtime elements:', JSON.stringify(res.result || res, null, 2));
}

inspectShowtimeElements().catch(console.error);
