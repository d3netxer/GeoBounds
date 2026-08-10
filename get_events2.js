const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');
  await page.waitForLoadState('networkidle');
  
  const eventsInfo = await page.evaluate(() => {
    return Object.keys(window.draw._eventListeners || {});
  });
  console.log("Registered event keys:", eventsInfo);
  
  await browser.close();
})();
