import { webcmdBridge } from '../../src/webcmdBridge.js';

async function inspectCoinDesk() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('inspect-cd');

  const script = `
    await page.goto('https://www.coindesk.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);
    const title = await page.title();
    const headlines = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, [class*="headline"], [class*="title"]')).map(h => (h.innerText || '').trim()).filter(t => t.length > 25);
      return [...new Set(cards)].slice(0, 10);
    });
    return { title, headlines };
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('CoinDesk headlines:', JSON.stringify(res.result || res, null, 2));
}

inspectCoinDesk().catch(console.error);
