import { chromium } from 'playwright';

(async () => {
  console.log('Launching Playwright persistent context headed...');
  const context = await chromium.launchPersistentContext('c:\\Users\\darsh\\AppData\\Local\\Temp\\test_headed_ctx', {
    executablePath: 'C:\\Users\\darsh\\.cloakbrowser\\chromium-146.0.7680.177.5\\chrome.exe',
    headless: false,
    args: ['--start-maximized']
  });

  console.log('Context launched! Waiting 5 seconds...');
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://example.com');
  console.log('Page title:', await page.title());

  await page.waitForTimeout(5000);
  await context.close();
  console.log('Done.');
  process.exit(0);
})();
