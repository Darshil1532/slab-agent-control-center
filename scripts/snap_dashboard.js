import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const screenshotPath = 'C:\\Users\\darsh\\.gemini\\antigravity-ide\\brain\\28be6053-3902-42e2-adf0-6c5ddf68f9dd\\control_center_live_dashboard.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Dashboard screenshot saved to:', screenshotPath);

  await browser.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
