const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(600);
  const hasProduct = await page.evaluate(() => !!state.products.find(p => p.barcode === 'REALTIME001'));
  console.log('ASSERT product added before server restart still present after restart:', hasProduct);
  const gradeOk = await page.evaluate(() => {
    const p = state.products.find(p => p.barcode === 'REALTIME001');
    return p && p.grade;
  });
  console.log('ASSERT grade change also persisted across restart:', gradeOk === 'A');
  await browser.close();
})();
