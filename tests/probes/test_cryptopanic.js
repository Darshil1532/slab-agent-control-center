import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeAltCrypto() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-crypto');

  const script = `
    await page.goto('https://cryptopanic.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    const title = await page.title();
    const news = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.title-text, .news-row a.title')).map(el => el.innerText.trim()).filter(t => t.length > 10);
      return items.slice(0, 8);
    });
    return { title, news };
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('CryptoPanic probe:', JSON.stringify(res.result || res, null, 2));
}

probeAltCrypto().catch(console.error);
