const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8000');
  await page.waitForLoadState('networkidle');
  
  await page.screenshot({ path: 'map_screenshot.png' });
  
  await browser.close();
})();
