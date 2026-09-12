import { webcmdBridge } from '../../src/webcmdBridge.js';

async function inspectCinemaDOM() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-dom');

  const script = `
    await page.goto('https://in.bookmyshow.com/movies/national-capital-region-ncr/mirzapur-the-movie/ET00417686', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('book ticket'));
      if (btn) btn.click();
    });

    await page.waitForTimeout(3000);

    const info = await page.evaluate(() => {
      // Find element with text "M2K: Rohini"
      const el = Array.from(document.querySelectorAll('*')).find(e => e.innerText && e.innerText.includes('M2K: Rohini') && e.children.length === 0);
      if (!el) return { found: false };

      // Get grand parent html
      let p = el;
      for (let i = 0; i < 4 && p.parentElement; i++) {
        p = p.parentElement;
      }
      return {
        found: true,
        tag: p.tagName,
        text: p.innerText,
        html: p.outerHTML.slice(0, 1000)
      };
    });

    return info;
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('DOM info:', JSON.stringify(res.result || res, null, 2));
}

inspectCinemaDOM().catch(console.error);
