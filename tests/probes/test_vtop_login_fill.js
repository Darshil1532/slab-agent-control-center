import { webcmdBridge } from '../../src/webcmdBridge.js';

async function main() {
  const sid = await webcmdBridge.createSession('test-vtop-fill');
  console.log('Session created:', sid);

  // 1. Go to open page
  await webcmdBridge.runScript(sid, `
    await page.goto('https://vtop.vitbhopal.ac.in/vtop/open/page', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
  `);

  // 2. Click Student
  const clickRes = await webcmdBridge.runScript(sid, `
    const res = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.trim().toLowerCase() === 'student');
      if (btn) {
        btn.click();
        return { ok: true, text: btn.innerText };
      }
      return { ok: false };
    });
    await page.waitForTimeout(3000);
    return res;
  `);
  console.log('Clicked Student:', clickRes.result);

  // 3. Fill Username & Password
  const fillRes = await webcmdBridge.runScript(sid, `
    const filled = await page.evaluate(() => {
      const userInput = document.querySelector('#username, input[name="username"]');
      const passInput = document.querySelector('#password, input[name="password"]');
      const submitBtn = document.querySelector('#submitBtn, button[type="submit"]');

      const results = {};
      if (userInput) {
        userInput.focus();
        userInput.value = '25BCE10213';
        userInput.dispatchEvent(new Event('input', { bubbles: true }));
        userInput.dispatchEvent(new Event('change', { bubbles: true }));
        userInput.dispatchEvent(new Event('blur', { bubbles: true }));
        results.username = true;
      }
      if (passInput) {
        passInput.focus();
        passInput.value = 'Vishnu1234/';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
        passInput.dispatchEvent(new Event('blur', { bubbles: true }));
        results.password = true;
      }
      results.hasSubmit = !!submitBtn;
      results.url = window.location.href;
      return results;
    });
    return filled;
  `);
  console.log('Filled credentials:', fillRes.result);

  await webcmdBridge.closeSession(sid);
}

main().catch(console.error);
