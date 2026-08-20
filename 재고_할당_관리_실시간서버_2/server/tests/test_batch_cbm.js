const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const errorsA = [], errorsB = [];
  pageA.on('pageerror', e => errorsA.push('A PAGEERROR: ' + e.message));
  pageB.on('pageerror', e => errorsB.push('B PAGEERROR: ' + e.message));
  pageA.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errorsA.push('A console: ' + m.text()); });
  pageB.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errorsB.push('B console: ' + m.text()); });

  await pageA.goto('http://localhost:3000/');
  await pageA.waitForTimeout(800);
  await pageB.goto('http://localhost:3000/');
  await pageB.waitForTimeout(800);

  // CBM tab on A
  await pageA.click('.tab-btn[data-tab="cbm"]');
  await pageA.waitForTimeout(300);
  console.log('A cbmKpiTotal:', await pageA.textContent('#cbmKpiTotal'));
  console.log('A donut path present:', !!(await pageA.$('#cbmFloorDonut path')));

  // Add batch preset on A settings tab
  await pageA.click('.tab-btn[data-tab="settings"]');
  await pageA.waitForTimeout(200);
  await pageA.fill('#batchPresetInput', 'B업체');
  await pageA.click('#btnBatchPresetAdd');
  await pageA.waitForTimeout(600); // allow sync debounce (200ms) + broadcast

  // Check preset propagated to B
  await pageB.click('.tab-btn[data-tab="settings"]');
  await pageB.waitForTimeout(300);
  const presetTextB = await pageB.textContent('#batchPresetList');
  console.log('B sees B업체 preset:', presetTextB.includes('B업체'));

  // Run allocation on B with batch selected, verify propagation of log+batch to A's history tab
  await pageB.click('.tab-btn[data-tab="products"]');
  await pageB.waitForTimeout(200);
  const barcode = await pageB.getAttribute('#productsBody tr', 'data-barcode');
  await pageB.click('.tab-btn[data-tab="inbound"]');
  await pageB.waitForTimeout(200);
  await pageB.selectOption('#batchSelect', 'B업체');
  await pageB.fill('.queue-row:first-child input.q-barcode', barcode);
  await pageB.waitForTimeout(150);
  await pageB.fill('.queue-row:first-child input.q-qty', '3');
  await pageB.waitForTimeout(150);
  await pageB.click('#btnRunAllocation');
  await pageB.waitForTimeout(800);

  await pageA.click('.tab-btn[data-tab="history"]');
  await pageA.waitForTimeout(500);
  const historyBatchOptionsA = await pageA.$$eval('#historyBatchSel option', opts => opts.map(o => o.textContent));
  console.log('A historyBatchSel options after B ran allocation:', historyBatchOptionsA);
  const resultsTextA = await pageA.textContent('#resultsList');
  console.log('A results list mentions B업체:', resultsTextA.includes('B업체'));

  // CBM entry save on A, verify sync to B
  await pageA.click('.tab-btn[data-tab="cbm"]');
  await pageA.waitForTimeout(200);
  await pageA.fill('#cbmEntryDate', '2026-08-12');
  await pageA.fill('#cbmEntryUsed1', '1490');
  await pageA.click('#btnCbmSave');
  await pageA.waitForTimeout(700);

  await pageB.click('.tab-btn[data-tab="cbm"]');
  await pageB.waitForTimeout(300);
  const recentB = await pageB.textContent('#cbmRecentList');
  console.log('B sees new CBM entry 2026-08-12:', recentB.includes('2026-08-12'));

  // restart-persistence smoke check via direct state file read is separate; just report errors here
  console.log('--- errors A ---', errorsA);
  console.log('--- errors B ---', errorsB);

  await browser.close();
})();
