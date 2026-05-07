const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set fake user to bypass login
  await page.evaluate(() => {
    localStorage.setItem('cachedUser', JSON.stringify({uid: 'test_user', name: 'Test User', is2FAEnabled: false, accountStatus: 'active'}));
  });

  await page.goto('http://localhost:4173');

  // Wait for sidebar to render
  await page.waitForSelector('aside');

  await page.screenshot({ path: 'sidebar_screenshot.png' });

  await browser.close();
})();
