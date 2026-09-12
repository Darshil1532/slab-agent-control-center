import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser to inspect http://localhost:3000...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err.message));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  console.log('Triggering Briefing preset click...');
  await page.click('.workflow-card[data-workflow="briefing"]');

  console.log('Clicking Deploy Agent...');
  await page.click('#btn-launch');

  console.log('Waiting for mission to become Active...');
  await page.waitForFunction(() => {
    const status = document.getElementById('live-status-text');
    return status && status.innerText.includes('Active');
  }, { timeout: 10000 });

  console.log('Mission is Active! Now waiting for mission to complete...');
  await page.waitForFunction(() => {
    const badge = document.getElementById('summary-badge');
    return badge && badge.style.display !== 'none' && badge.innerText === 'Ready';
  }, { timeout: 45000 });

  console.log('Executive Summary Ready! Waiting 1s for DOM settle...');
  await page.waitForTimeout(1000);

  const domReport = await page.evaluate(() => {
    const tabSummary = document.getElementById('tab-summary');
    const summaryContainer = document.getElementById('summary-container');
    const emptyState = document.getElementById('empty-summary-state');
    const activeReport = document.getElementById('summary-active-report');
    const renderArea = document.getElementById('markdown-render-area');

    return {
      tabSummary: {
        className: tabSummary?.className,
        styleDisplay: window.getComputedStyle(tabSummary).display,
        clientHeight: tabSummary?.clientHeight,
        clientWidth: tabSummary?.clientWidth
      },
      summaryContainer: {
        styleDisplay: summaryContainer ? window.getComputedStyle(summaryContainer).display : 'null',
        clientHeight: summaryContainer?.clientHeight
      },
      emptyState: {
        styleDisplay: emptyState ? window.getComputedStyle(emptyState).display : 'null'
      },
      activeReport: {
        styleDisplay: activeReport ? window.getComputedStyle(activeReport).display : 'null',
        clientHeight: activeReport?.clientHeight,
        clientWidth: activeReport?.clientWidth
      },
      renderArea: {
        styleDisplay: renderArea ? window.getComputedStyle(renderArea).display : 'null',
        innerTextSample: renderArea?.innerText?.slice(0, 350),
        hasHeaders: Boolean(renderArea?.querySelector('h1, h2, h3, h4')),
        hasTable: Boolean(renderArea?.querySelector('table')),
        clientHeight: renderArea?.clientHeight
      }
    };
  });

  console.log('\n=== REAL DOM INSPECTION REPORT ===\n', JSON.stringify(domReport, null, 2));

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
