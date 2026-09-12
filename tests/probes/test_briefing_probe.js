import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeBriefingSources() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-briefing');

  const script = `
    // 1. Scrape Hacker News
    await page.goto('https://news.ycombinator.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);
    const hnStories = await page.evaluate(() => {
      const items = [];
      const rows = Array.from(document.querySelectorAll('tr.athing'));
      for (const row of rows.slice(0, 8)) {
        const titleEl = row.querySelector('.titleline > a');
        const nextRow = row.nextElementSibling;
        const scoreEl = nextRow ? nextRow.querySelector('.score') : null;
        if (titleEl) {
          items.push({
            title: titleEl.innerText.trim(),
            url: titleEl.href,
            score: scoreEl ? scoreEl.innerText.trim() : '0 points'
          });
        }
      }
      return items;
    });

    // 2. Scrape Techmeme (Macro Tech shifts)
    await page.goto('https://www.techmeme.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);
    const techmemeStories = await page.evaluate(() => {
      const items = [];
      const blocks = Array.from(document.querySelectorAll('.item, .news'));
      for (const b of blocks.slice(0, 8)) {
        const a = b.querySelector('a.ourh, .header a');
        const desc = b.querySelector('.ii');
        if (a) {
          items.push({
            title: a.innerText.trim(),
            url: a.href,
            snippet: desc ? desc.innerText.trim().slice(0, 150) : ''
          });
        }
      }
      return items;
    });

    return { hnCount: hnStories.length, hnStories, tmCount: techmemeStories.length, techmemeStories };
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('Briefing probe:', JSON.stringify(res.result || res, null, 2));
}

probeBriefingSources().catch(console.error);
