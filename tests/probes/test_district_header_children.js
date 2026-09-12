import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  const sid = await webcmdBridge.createSession('district-header-inspect');

  const testScript = `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    const res = await page.evaluate(() => {
      const header = document.querySelector('.dds-sticky') || document.querySelector('header, nav') || document.body.firstElementChild;
      
      const elements = Array.from(header.querySelectorAll('*'))
        .filter(el => ['DIV', 'BUTTON', 'A', 'P', 'SPAN', 'INPUT'].includes(el.tagName))
        .map(el => ({
          tag: el.tagName,
          text: (el.innerText || el.placeholder || '').trim(),
          class: el.className,
          id: el.id
        }))
        .filter(x => x.text.length > 0 && x.text.length < 80);

      return elements;
    });

    return res;
  `;

  const res = await webcmdBridge.runScript(sid, testScript, 45);
  console.log('Header elements count:', res.result?.length);
  console.log('Header elements sample:', JSON.stringify(res.result?.slice(0, 25), null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
