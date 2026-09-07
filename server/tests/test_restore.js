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

  await pageA.click('.tab-btn[data-tab="settings"]');
  await pageA.waitForTimeout(150);
  pageA.once('dialog', d => d.accept());
  const [fileChooser] = await Promise.all([
    pageA.waitForEvent('filechooser'),
    pageA.click('#btnRestore')
  ]);
  await fileChooser.setFiles('/tmp/test_backup.json');
  await pageA.waitForTimeout(700);

  const onA = await pageA.evaluate(() => ({ count: state.products.length, has: !!state.products.find(p => p.barcode === 'RESTORETEST') }));
  console.log('On A after restore:', JSON.stringify(onA));
  console.log('ASSERT A now has exactly the restored tiny dataset (1 product):', onA.count === 1 && onA.has);

  await pageB.waitForTimeout(300);
  const onB = await pageB.evaluate(() => ({ count: state.products.length, has: !!state.products.find(p => p.barcode === 'RESTORETEST') }));
  console.log('On B (without doing anything):', JSON.stringify(onB));
  console.log('ASSERT restore propagated live to B:', onB.count === 1 && onB.has);

  await browser.close();
})();
