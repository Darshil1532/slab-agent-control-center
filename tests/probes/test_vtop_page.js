import { webcmdBridge } from '../../src/webcmdBridge.js';

async function main() {
  const sid = await webcmdBridge.createSession('test-vtop');
  console.log('Created session:', sid);
  const res = await webcmdBridge.runScript(sid, `
    await page.goto('https://vtop.vitbhopal.ac.in/vtop/open/page', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, div[role="button"]')).map(el => ({
        text: el.innerText.trim(),
        href: el.href || el.getAttribute('onclick') || '',
        id: el.id,
        className: el.className
      })).filter(x => x.text);
      return { title: document.title, url: window.location.href, links: links.slice(0, 25) };
    });
    return info;
  `);
  console.log('Result:', JSON.stringify(res.result, null, 2));
  
  // Now let's try clicking Student
  const clickRes = await webcmdBridge.runScript(sid, `
    const clicked = await page.evaluate(() => {
      const studentBtn = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.trim().toLowerCase() === 'student' || el.innerText.includes('Student'));
      if (studentBtn) {
        studentBtn.click();
        return { clicked: true, text: studentBtn.innerText };
      }
      return { clicked: false };
    });
    await page.waitForTimeout(3000);
    const afterClick = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, button, img')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        placeholder: el.placeholder,
        src: el.src || ''
      }));
      return { url: window.location.href, inputs };
    });
    return { clicked, afterClick };
  `);
  console.log('Click result:', JSON.stringify(clickRes.result, null, 2));

  await webcmdBridge.closeSession(sid);
}

main().catch(console.error);
