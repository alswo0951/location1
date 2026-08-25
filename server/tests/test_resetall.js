const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await pageA.goto('http://localhost:3000/');
  await pageB.goto('http://localhost:3000/');
  await pageA.waitForTimeout(600);
  await pageB.waitForTimeout(600);

  const hasBefore = await pageA.evaluate(() => !!state.products.find(p => p.barcode === 'REALTIME001'));
  console.log('Before reset, REALTIME001 present:', hasBefore);

  // User A triggers full reset (accepting the confirm dialog)
  await pageA.click('.tab-btn[data-tab="settings"]');
  await pageA.waitForTimeout(150);
  pageA.once('dialog', d => d.accept());
  await pageA.click('#btnResetAll');
  await pageA.waitForTimeout(700);

  const afterOnA = await pageA.evaluate(() => ({
    hasTestProduct: !!state.products.find(p => p.barcode === 'REALTIME001'),
    productCount: state.products.length,
    logCount: state.log.length
  }));
  console.log('After reset, on A:', JSON.stringify(afterOnA));
  console.log('ASSERT test product gone from A after reset:', !afterOnA.hasTestProduct);
  console.log('ASSERT log cleared on A after reset:', afterOnA.logCount === 0);

  await pageB.waitForTimeout(300);
  const afterOnB = await pageB.evaluate(() => ({
    hasTestProduct: !!state.products.find(p => p.barcode === 'REALTIME001'),
    productCount: state.products.length
  }));
  console.log('After reset, on B (without B doing anything):', JSON.stringify(afterOnB));
  console.log('ASSERT reset propagated live to B too:', !afterOnB.hasTestProduct && afterOnB.productCount === afterOnA.productCount);

  await browser.close();
})();
