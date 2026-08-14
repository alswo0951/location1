const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];

  // simulate two independent users, each in their own browser context (own cookies/session)
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  [pageA, pageB].forEach((p, i) => {
    p.on('pageerror', e => errors.push(`pageerror(${i}): ` + e.message));
    p.on('console', msg => { if (msg.type() === 'error') errors.push(`console(${i}): ` + msg.text()); });
  });

  await pageA.goto('http://localhost:3000/');
  await pageB.goto('http://localhost:3000/');
  await pageA.waitForTimeout(600);
  await pageB.waitForTimeout(600);

  // ---- both should have loaded the same seed data from the server ----
  const kpiA = await pageA.textContent('#kpiTotalLoc');
  const kpiB = await pageB.textContent('#kpiTotalLoc');
  console.log('KPI totalLoc A:', kpiA, 'B:', kpiB);
  console.log('ASSERT both clients loaded same seed data from server:', kpiA === kpiB && Number(kpiA.replace(/,/g, '')) > 3000);

  // ---- connection badges show online ----
  const badgeA = await pageA.evaluate(() => document.getElementById('connBadge').className);
  const badgeB = await pageB.evaluate(() => document.getElementById('connBadge').className);
  console.log('Badge A:', badgeA, 'Badge B:', badgeB);
  console.log('ASSERT both show online status:', badgeA.includes('online') && badgeB.includes('online'));

  const presenceText = await pageA.textContent('#connBadge');
  console.log('Presence text on A:', presenceText);
  console.log('ASSERT presence count shows 2 (both connected):', presenceText.includes('2'));

  // ---- User A adds a new product; User B should see it appear live, without reloading ----
  await pageA.click('.tab-btn[data-tab="products"]');
  await pageA.waitForTimeout(150);
  await pageA.click('#btnProdAdd');
  await pageA.waitForTimeout(150);
  await pageA.fill('#npBarcode', 'REALTIME001');
  await pageA.fill('#npName', '실시간 동기화 테스트 상품');
  await pageA.click('#npSave');
  await pageA.waitForTimeout(600); // allow debounce push + broadcast round trip

  await pageB.click('.tab-btn[data-tab="products"]');
  await pageB.waitForTimeout(200);
  await pageB.fill('#prodSearch', 'REALTIME001');
  await pageB.waitForTimeout(200);
  const bodyTextB = await pageB.textContent('#productsBody');
  console.log('Product search result on B (should show new product without B taking any action):', bodyTextB.includes('REALTIME001') ? 'FOUND' : 'NOT FOUND');
  console.log('ASSERT User B sees User A\'s new product live:', bodyTextB.includes('REALTIME001'));

  // ---- User B runs an allocation; User A should see the location update live on the locations tab ----
  await pageB.evaluate(() => {
    state.rules.A = ['9Z-'];
    for (let bay = 1; bay <= 2; bay++) {
      const loc = `9Z-0${bay}-01-01`;
      if (!state.locations.find(l => l.loc === loc)) state.locations.push({ loc, zone: '9Z-', tier: '01', barcode: '', qty: '' });
    }
    syncToServer(true);
  });
  await pageB.waitForTimeout(500);

  await pageB.click('.tab-btn[data-tab="inbound"]');
  await pageB.waitForTimeout(150);
  await pageB.fill('.q-barcode', 'REALTIME001');
  await pageB.fill('.q-qty', '1');
  await pageB.click('#btnRunAllocation');
  await pageB.waitForTimeout(600);

  const allocPlacement = await pageB.evaluate(() => {
    const batch = state.executionHistory[0];
    return batch.results[0].placements[0].loc;
  });
  console.log('B allocated REALTIME001 to:', allocPlacement);

  await pageA.click('.tab-btn[data-tab="locations"]');
  await pageA.waitForTimeout(200);
  await pageA.fill('#locSearch', 'REALTIME001');
  await pageA.waitForTimeout(200);
  const locTextA = await pageA.textContent('#locationsBody');
  console.log('ASSERT User A sees the location B just allocated, live:', locTextA.includes(allocPlacement) && locTextA.includes('REALTIME001'));

  // ---- User A edits the product's grade; User B should see the change live too (two-way sync) ----
  await pageA.click('.tab-btn[data-tab="products"]');
  await pageA.waitForTimeout(200);
  await pageA.fill('#prodSearch', 'REALTIME001');
  await pageA.waitForTimeout(200);
  await pageA.selectOption('tr[data-barcode="REALTIME001"] .pf-grade', 'A');
  await pageA.waitForTimeout(600);

  const gradeOnB = await pageB.evaluate(() => state.products.find(p => p.barcode === 'REALTIME001').grade);
  console.log('ASSERT grade change from A propagated to B\'s in-memory state:', gradeOnB === 'A');

  // ---- disconnect user B, confirm presence count drops for A ----
  await ctxB.close();
  await pageA.waitForTimeout(500);
  const presenceAfterBLeft = await pageA.textContent('#connBadge');
  console.log('Presence on A after B disconnects:', presenceAfterBLeft);
  console.log('ASSERT presence count drops to 1 after B disconnects:', presenceAfterBLeft.includes('1'));

  console.log('ERRORS:', errors);
  await browser.close();
})();
