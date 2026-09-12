import { webcmdBridge } from '../src/webcmdBridge.js';

async function main() {
  const sid = await webcmdBridge.createSession('test-yt-inspect');
  await webcmdBridge.runScript(sid, `
    await page.goto('https://www.youtube.com/results?search_query=hindi+song', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
  `);

  const inspectScript = `
    const state = await page.evaluate(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && (rect.width > 0 || rect.height > 0);
      };

      // 1. YouTube specific video items prioritized
      const ytVideoLinks = Array.from(document.querySelectorAll('ytd-video-renderer a#video-title, a#video-title, a[href*="/watch?v="]'));
      const videoItems = [];
      const seenHrefs = new Set();
      for (const vl of ytVideoLinks) {
        const vTitle = (vl.innerText || vl.getAttribute('title') || '').trim();
        const vHref = vl.href ? vl.href.split('&')[0] : '';
        if (!vTitle || vTitle.length < 3 || seenHrefs.has(vHref)) continue;
        seenHrefs.add(vHref);
        videoItems.push({
          tag: 'a',
          text: vTitle,
          id: vl.id || '',
          selector: 'a[href*="' + (vl.href.match(/v=([^&]+)/)?.[1] || '') + '"]',
          href: vl.href
        });
        if (videoItems.length >= 10) break;
      }

      // 2. Interactive buttons & links
      const rawElements = Array.from(document.querySelectorAll('a, button, div[role="button"], input[type="button"], input[type="submit"]'));
      const interactive = [...videoItems];
      const seenTexts = new Set(videoItems.map(v => v.text.toLowerCase()));

      for (const el of rawElements) {
        if (!isVisible(el)) continue;
        const text = (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim().split('\\n')[0];
        if (!text || text.length > 60 || seenTexts.has(text.toLowerCase())) continue;
        seenTexts.add(text.toLowerCase());

        let selector = '';
        if (el.id) selector = '#' + el.id;
        else if (el.name) selector = el.tagName.toLowerCase() + '[name="' + el.name + '"]';

        interactive.push({
          tag: el.tagName.toLowerCase(),
          text,
          id: el.id || '',
          selector,
          href: el.href || ''
        });
        if (interactive.length >= 25) break;
      }

      const rawInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select, input[type="hidden"]#gResponse, input[name="gResponse"]'));
      const inputs = [];
      for (const inp of rawInputs) {
        const type = inp.type || 'text';
        const isHidden = type === 'hidden';
        if (!isHidden && !isVisible(inp)) continue;

        inputs.push({
          id: inp.id || '',
          name: inp.name || '',
          type,
          placeholder: inp.placeholder || '',
          value: type === 'password' ? (inp.value ? '••••••••' : '') : (inp.value || ''),
          label: inp.closest('label')?.innerText?.trim() || ''
        });
      }

      const captchaEl = document.querySelector('img[src*="captcha" i], #captchaBlock, iframe[src*="recaptcha" i], input[name*="captcha" i], input[placeholder*="captcha" i], #gResponse, input[name="gResponse"]');
      const hasCaptcha = Boolean(captchaEl);

      const videoEl = document.querySelector('video');
      const hasVideo = Boolean(videoEl);
      const isVideoPlaying = videoEl ? (!videoEl.paused && videoEl.currentTime > 0) : false;
      const isWatchPage = window.location.pathname.includes('/watch') || window.location.href.includes('watch?v=');
      const hasSkipAdBtn = Boolean(document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, button.ytp-ad-skip-button-modern'));

      return {
        title: document.title,
        url: window.location.href,
        interactive,
        inputs,
        hasCaptcha,
        hasVideo,
        isVideoPlaying,
        isWatchPage,
        hasSkipAdBtn,
        mainText: (document.body.innerText || '').slice(0, 500)
      };
    });

    return state;
  `;

  const res = await webcmdBridge.runScript(sid, inspectScript);
  console.log('Inspect result:', JSON.stringify(res, null, 2));
  await webcmdBridge.closeSession(sid);
}

main().catch(console.error);
