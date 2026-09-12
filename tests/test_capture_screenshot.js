import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Trigger Briefing preset click
  await page.click('.workflow-card[data-workflow="briefing"]');
  await page.click('#btn-launch');

  // Wait for mission ready
  await page.waitForFunction(() => {
    const badge = document.getElementById('summary-badge');
    return badge && badge.style.display !== 'none' && badge.innerText === 'Ready';
  }, { timeout: 45000 });

  await page.waitForTimeout(1500);

  // Take screenshot of whole page and specific tab
  const screenshotPath = 'C:\\Users\\darsh\\.gemini\\antigravity-ide\\brain\\28be6053-3902-42e2-adf0-6c5ddf68f9dd\\executive_summary_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
