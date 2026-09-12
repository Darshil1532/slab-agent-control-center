import { webcmdBridge } from '../../src/webcmdBridge.js';

async function main() {
  const sid = await webcmdBridge.createSession('test-vtop-login');
  await webcmdBridge.runScript(sid, `
    await page.goto('https://vtop.vitbhopal.ac.in/vtop/open/page', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.trim().toLowerCase() === 'student');
      if (btn) btn.click();
    });
    await page.waitForTimeout(3000);
    const loginDetails = await page.evaluate(() => {
      const form = document.querySelector('form');
      const allInputs = Array.from(document.querySelectorAll('input, button, img, label')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        placeholder: el.placeholder,
        text: el.innerText || '',
        src: el.src ? el.src.slice(0, 50) : ''
      }));
      return { url: window.location.href, allInputs };
    });
    return loginDetails;
  `);
  const snap = await webcmdBridge.runScript(sid, `
    return await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, button, select, textarea, img')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        placeholder: el.placeholder,
        text: el.innerText || '',
        src: el.src || ''
      }));
      return {
        url: window.location.href,
        inputs
      };
    });
  `);
  console.log('Login elements:', JSON.stringify(snap.result, null, 2));
  await webcmdBridge.closeSession(sid);
}

main().catch(console.error);

