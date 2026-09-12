import { webcmdBridge } from '../../src/webcmdBridge.js';

async function testModal() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('modal-click');

  const script = `
    await page.goto('https://in.bookmyshow.com/movies/national-capital-region-ncr/mirzapur-the-movie/ET00417686', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const bookBtn = page.locator('button:has-text("Book tickets")').first();
    await bookBtn.click();
    await page.waitForTimeout(2000);

    // Check modal or format options
    const modalInfo = await page.evaluate(() => {
      // Any elements with high z-index or fixed/absolute overlay
      const dialog = document.querySelector('[role="dialog"], [class*="modal"], [class*="overlay"], [class*="sheet"], [class*="popup"]');
      const dialogText = dialog ? dialog.innerText : null;
      
      // Look for format options (e.g. 2D, Hindi)
      const options = Array.from(document.querySelectorAll('li, div[class*="format"], span')).filter(el => {
        const t = (el.innerText || '').trim();
        return t === '2D' || t === '3D' || t === 'IMAX 2D' || t === 'Hindi' || t === 'Telugu';
      }).map(el => ({ tag: el.tagName, text: el.innerText.trim() }));

      return {
        hasDialog: !!dialog,
        dialogText,
        options
      };
    });

    return modalInfo;
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('Modal result:', JSON.stringify(res.result || res, null, 2));
}

testModal().catch(console.error);
