const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');
  await page.waitForLoadState('networkidle');
  
  const drawInfo = await page.evaluate(() => {
    return Object.keys(window.draw || {});
  });
  console.log("Draw keys:", drawInfo);
  
  await browser.close();
})();
