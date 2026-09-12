import { webcmdBridge } from '../../src/webcmdBridge.js';

async function probeDistrict() {
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('probe-district');

  const script = `
    await page.goto('https://www.district.in/movies', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
      const title = document.title;
      const links = Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: (a.innerText || '').replace(/\\n+/g, ' | ').trim()
      })).filter(l => l.text.length > 2 && (l.href.includes('movie') || l.href.includes('event'))).slice(0, 15);

      return { title, links };
    });

    return data;
  `;

  const res = await webcmdBridge.runScript(sessionId, script);
  console.log('District Probe Result:', JSON.stringify(res.result || res, null, 2));
}

probeDistrict().catch(console.error);
