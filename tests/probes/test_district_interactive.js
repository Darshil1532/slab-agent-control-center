import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  console.log('Creating session to inspect https://www.district.in/movies/ ...');
  const sid = await webcmdBridge.createSession('district-inspect');
  console.log('Session ID:', sid);

  const inspectScript = `
    await page.goto('https://www.district.in/movies/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(4000);

    const info = await page.evaluate(() => {
      // Find logo or top left items
      const headerButtons = Array.from(document.querySelectorAll('header button, header div, nav button, [class*="header"] button, [class*="location"], [class*="city"]'))
        .map(el => ({
          tag: el.tagName,
          text: (el.innerText || '').trim(),
          className: el.className,
          id: el.id
        }))
        .filter(x => x.text.length > 0 && x.text.length < 50);

      // Find search bar or inputs
      const inputs = Array.from(document.querySelectorAll('input, [class*="search"], button, [role="button"]'))
        .map(el => ({
          tag: el.tagName,
          placeholder: el.placeholder || '',
          text: (el.innerText || '').trim(),
          className: el.className || '',
          type: el.type || '',
          ariaLabel: el.getAttribute('aria-label') || ''
        }))
        .filter(el => el.placeholder || el.text.toLowerCase().includes('search') || el.ariaLabel.toLowerCase().includes('search') || el.tag === 'INPUT');

      // Find all clickable buttons in the top navbar/header
      const allTopButtons = Array.from(document.querySelectorAll('header *, nav *'))
        .filter(el => ['BUTTON', 'A', 'DIV', 'SPAN'].includes(el.tagName) && (el.innerText || '').trim().length > 0 && (el.innerText || '').trim().length < 30)
        .slice(0, 30)
        .map(el => ({ tag: el.tagName, text: el.innerText.trim(), class: el.className }));

      return {
        title: document.title,
        url: window.location.href,
        headerButtons: headerButtons.slice(0, 15),
        inputs: inputs.slice(0, 10),
        allTopButtons: allTopButtons.slice(0, 20)
      };
    });

    return info;
  `;

  const res = await webcmdBridge.runScript(sid, inspectScript, 45);
  console.log('Full res:', JSON.stringify(res, null, 2));

  await webcmdBridge.closeSession(sid);
  process.exit(0);
})();
