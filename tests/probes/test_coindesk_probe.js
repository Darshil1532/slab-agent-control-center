import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeCoinDesk() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-coindesk');

  const script = `
    await page.goto('https://www.coindesk.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);
    const articles = await page.evaluate(() => {
      const items = [];
      const links = Array.from(document.querySelectorAll('a[href*="/markets/"], a[href*="/business/"], a[href*="/policy/"], h4 a, h3 a, h2 a'));
      for (const a of links) {
        const text = (a.innerText || '').trim();
        if (text.length > 20 && !items.some(i => i.title === text) && items.length < 8) {
          items.push({ title: text, url: a.href });
        }
      }
      return items;
    });
    return { count: articles.length, articles };
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('CoinDesk probe:', JSON.stringify(res.result || res, null, 2));
}

probeCoinDesk().catch(console.error);
