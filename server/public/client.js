/* =========================================================
   재고 할당 관리 - 독립 실행형 웹 도구
   원본 Google Apps Script(autoStockPlacement 등)의 로직을
   그대로 클라이언트 JS로 이식. 구글시트 연동 없이
   브라우저 메모리 + JSON 백업/복원으로 동작.
   ========================================================= */

/* =========================================================
   CBM 요약 — 층별 고정 총 용량 + 과거 이력 시드 데이터
   (구글시트 "CBM(원본)의 사본" 요약시트/이력 탭 + 노션 "잔여 및 사용 1~3층 CBM"
   데이터베이스 기준. 파레트(로케이션) 1자리 = 2.12 CBM 고정.)
   ========================================================= */
const CBM_PER_LOC = 2.12;
const CBM_FLOORS = {
  1: { totalLoc: 1811, totalCbm: 3839.32 },
  2: { totalLoc: 2148, totalCbm: 4553.76 },
  3: { totalLoc: 199, totalCbm: 421.88 }
};
const CBM_HISTORY_SEED = [
  { date: '2026-01-06', floor: 1, totalLoc: 1811, usedLoc: 1632 },
  { date: '2026-01-13', floor: 1, totalLoc: 1811, usedLoc: 1634 },
  { date: '2026-01-13', floor: 2, totalLoc: 2291, usedLoc: 2103 },
  { date: '2026-01-20', floor: 1, totalLoc: 1811, usedLoc: 1709 },
  { date: '2026-01-20', floor: 2, totalLoc: 2291, usedLoc: 2246 },
  { date: '2026-01-26', floor: 1, totalLoc: 1811, usedLoc: 1594 },
  { date: '2026-01-26', floor: 2, totalLoc: 2265, usedLoc: 2019 },
  { date: '2026-02-03', floor: 1, totalLoc: 1811, usedLoc: 1429 },
  { date: '2026-02-03', floor: 2, totalLoc: 2265, usedLoc: 1929 },
  { date: '2026-02-09', floor: 1, totalLoc: 1811, usedLoc: 1392 },
  { date: '2026-02-09', floor: 2, totalLoc: 2265, usedLoc: 1910 },
  { date: '2026-02-24', floor: 1, totalLoc: 1811, usedLoc: 1302 },
  { date: '2026-02-24', floor: 2, totalLoc: 2265, usedLoc: 1804 },
  { date: '2026-03-03', floor: 1, totalLoc: 1811, usedLoc: 1336 },
  { date: '2026-03-09', floor: 1, totalLoc: 1811, usedLoc: 1255 },
  { date: '2026-03-18', floor: 1, totalLoc: 1811, usedLoc: 1462 },
  { date: '2026-03-23', floor: 1, totalLoc: 1811, usedLoc: 1462 },
  { date: '2026-04-01', floor: 1, totalLoc: 1811, usedLoc: 1483 },
  { date: '2026-04-07', floor: 1, totalLoc: 1811, usedLoc: 1460 },
  { date: '2026-04-13', floor: 1, totalLoc: 1811, usedLoc: 1290 },
  { date: '2026-04-21', floor: 1, totalLoc: 1811, usedLoc: 1028 },
  { date: '2026-04-27', floor: 1, totalLoc: 1811, usedLoc: 1284 },
  { date: '2026-05-06', floor: 1, totalLoc: 1811, usedLoc: 1257 },
  { date: '2026-05-06', floor: 2, totalLoc: 2222, usedLoc: 1750 },
  { date: '2026-05-12', floor: 1, totalLoc: 1811, usedLoc: 1290 },
  { date: '2026-05-12', floor: 2, totalLoc: 2222, usedLoc: 1734 },
  { date: '2026-05-19', floor: 1, totalLoc: 1811, usedLoc: 1282 },
  { date: '2026-05-19', floor: 2, totalLoc: 2222, usedLoc: 1668 },
  { date: '2026-05-22', floor: 1, totalLoc: 1811, usedLoc: 1285 },
  { date: '2026-05-22', floor: 2, totalLoc: 2222, usedLoc: 1660 },
  { date: '2026-05-27', floor: 1, totalLoc: 1811, usedLoc: 1312 },
  { date: '2026-05-27', floor: 2, totalLoc: 2222, usedLoc: 1586 },
  { date: '2026-06-02', floor: 1, totalLoc: 1811, usedLoc: 1334 },
  { date: '2026-06-02', floor: 2, totalLoc: 2222, usedLoc: null },
  { date: '2026-06-09', floor: 1, totalLoc: 1811, usedLoc: 1169 },
  { date: '2026-06-09', floor: 2, totalLoc: 2148, usedLoc: 1531 },
  { date: '2026-06-15', floor: 1, totalLoc: 1811, usedLoc: 1210 },
  { date: '2026-06-15', floor: 2, totalLoc: 2148, usedLoc: 1532 },
  { date: '2026-06-22', floor: 1, totalLoc: 1811, usedLoc: 1297 },
  { date: '2026-06-22', floor: 2, totalLoc: 2148, usedLoc: 1489 },
  { date: '2026-06-30', floor: 1, totalLoc: 1811, usedLoc: 1228 },
  { date: '2026-06-30', floor: 2, totalLoc: 2148, usedLoc: 1421 },
  { date: '2026-07-07', floor: 1, totalLoc: 1811, usedLoc: 1158 },
  { date: '2026-07-07', floor: 2, totalLoc: 2148, usedLoc: 1432 },
  { date: '2026-07-14', floor: 1, totalLoc: 1811, usedLoc: 1151 },
  { date: '2026-07-14', floor: 2, totalLoc: 2148, usedLoc: 1452 },
  { date: '2026-07-22', floor: 1, totalLoc: 1811, usedLoc: 1264 },
  { date: '2026-07-22', floor: 2, totalLoc: 2148, usedLoc: 1394 },
  { date: '2026-07-29', floor: 1, totalLoc: 1811, usedLoc: 1388 },
  { date: '2026-07-29', floor: 2, totalLoc: 2148, usedLoc: 1400 },
  { date: '2026-08-04', floor: 1, totalLoc: 1811, usedLoc: 1374 },
  { date: '2026-08-04', floor: 2, totalLoc: 2148, usedLoc: 1397 },
  { date: '2026-08-09', floor: 1, totalLoc: 1811, usedLoc: 1374 },
  { date: '2026-08-09', floor: 2, totalLoc: 2148, usedLoc: 1397 },
  { date: '2026-08-09', floor: 3, totalLoc: 199, usedLoc: 199 },
  { date: '2026-08-10', floor: 1, totalLoc: 1811, usedLoc: 1431 },
  { date: '2026-08-10', floor: 2, totalLoc: 2148, usedLoc: 1422 },
  { date: '2026-08-10', floor: 3, totalLoc: 199, usedLoc: 199 },
  { date: '2026-08-11', floor: 1, totalLoc: 1811, usedLoc: 1455 },
  { date: '2026-08-11', floor: 2, totalLoc: 2148, usedLoc: 1422 },
  { date: '2026-08-11', floor: 3, totalLoc: 199, usedLoc: 199 }
];
const CBM_TREND_SEED = [
  { m: '1월', w: [7.74, 10.33, 3.35, 12.33, null] },
  { m: '2월', w: [18.21, 20.86, 25.41, null, null] },
  { m: '3월', w: [24.69, 26.39, 18.62, null, null] },
  { m: '4월', w: [18.29, 19.02, 30.99, 30.99, 25.36] },
  { m: '5월', w: [26.8, 26.39, 30.25, 26.79, 31.49] },
  { m: '6월', w: [26.79, 33.1, 32.12, 28.48, null] },
  { m: '7월', w: [36.24, 33.3, 33.0, 33.29, null] },
  { m: '8월', w: [28.57, null, null, null, null] }
];

/* ---------- state ---------- */
const state = {
  products: [],           // {barcode, name, grade, pltQty, is2plt}
  locations: [],          // {loc, zone, tier, barcode, qty} qty: number | "2PLT(점유)" | ""
  log: [],                // {id, ts, barcode, name, qty, loc, is2plt, verified: true|false|null}
  rules: {
    A: ['1B-', '1C-', '1D-', '1E-', '1F-', '1G-'],
    B: ['1J-', '1K-', '1N-', '1O-'],
    C: ['1H-', '1I-', '1L-', '1M-'],
    exclude: ['1A-', '1R-', '1S-'],
    mergeEnabled: true // 까대기(적재 top-up) 자동 배치 사용 여부
  },
  // 상품명 기반 고정구역 규칙: 상품명에 mustAll을 모두 포함하고 anyOf 중 하나 이상 포함하면
  // 등급/전체 탐색을 건너뛰고 zones에만 무조건 배치한다 (exclude 규칙보다 우선).
  nameRules: [
    { id: 'nr-selfrollmat', mustAll: ['셀프시공 롤매트'], anyOf: ['샌디', '코지', '워터드롭'], zones: ['1R-', '1S-'] }
  ],
  ui: {
    tab: 'dashboard',
    prodPage: 1, locPage: 1, logPage: 1,
    prodSearch: '', prodGrade: '',
    locSearch: '', locZone: '', locFloor: '', locStatus: '',
    logSearch: '', logVerify: '',
    theme: 'light',
    historyYear: '', historyMonth: '', historyDay: '', historyBatch: '', // 일자별 입고 기록(엑셀 붙여넣기용) 년/월/일/차수 선택
    selectedBatch: '', // 자동 할당 실행 시 선택된 차수/업체명
    cbmSubTab: 'overview' // CBM 요약 탭 내부 서브탭
  },
  queue: [],  // inbound entry rows {barcode, qty, zone}
  executionHistory: [], // 자동 할당 실행 이력 (배치 단위로 누적) — [{id, ts, batch, results}]
  scanFeed: [],
  batchPresets: ['1차', '2차', '3차'], // 차수/업체명 프리셋 목록 (설정 탭에서 관리)
  cbmHistory: CBM_HISTORY_SEED.map(r => ({ ...r })), // CBM 요약 이력 — [{date, floor, totalLoc, usedLoc}]
  changesSinceBackup: 0
};

const PAGE_SIZE = 60;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* =========================================================
   실시간 동기화 (Socket.IO)
   — 상품/로케이션/할당기록/규칙/실행이력/스캔이력/차수프리셋/CBM이력은 서버가 보관하는
   "공유 데이터"이며, 누군가 바뀌면 서버가 접속한 모든 화면에 즉시 뿌려줍니다(broadcast).
   화면 탭/필터/입력중인 입고 등록 행(state.ui, state.queue)은 각자 화면에만 있는 개인
   상태라 동기화하지 않습니다.
   ========================================================= */
const SHARED_KEYS = ['products', 'locations', 'log', 'rules', 'nameRules', 'executionHistory', 'scanFeed', 'batchPresets', 'cbmHistory'];
let socket = null;
let syncTimer = null;
let suppressNextRenderToast = false;

function applySharedState(shared) {
  SHARED_KEYS.forEach(k => { if (shared && shared[k] !== undefined) state[k] = shared[k]; });
}

function sharedStatePayload() {
  const out = {};
  SHARED_KEYS.forEach(k => { out[k] = state[k]; });
  return out;
}

// 로컬에서 뭔가 바뀌었을 때 서버로 밀어올린다. 여러 변경이 짧은 시간 안에 연달아 일어나면
// 한 번으로 묶어서(디바운스) 보낸다. immediate=true면 즉시(복원/초기화처럼 큰 변경일 때).
function syncToServer(immediate) {
  if (!socket || !socket.connected) return;
  if (immediate) { clearTimeout(syncTimer); socket.emit('state:push', sharedStatePayload()); return; }
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => socket.emit('state:push', sharedStatePayload()), 200);
}

function setConnBadge(status, extra) {
  const el = document.getElementById('connBadge');
  if (!el) return;
  el.classList.remove('online', 'offline', 'connecting');
  el.classList.add(status);
  const label = status === 'online' ? `🟢 실시간 연결됨${extra ? ` · ${extra}명 접속` : ''}`
    : status === 'offline' ? '🔴 연결 끊김 (재연결 시도 중…)'
    : '🟡 연결 중…';
  el.textContent = label;
}

function flashLiveIndicator() {
  const el = document.getElementById('connBadge');
  if (!el) return;
  el.classList.add('pulse');
  setTimeout(() => el.classList.remove('pulse'), 900);
}

function connectRealtime() {
  socket = io();
  setConnBadge('connecting');

  socket.on('connect', () => setConnBadge('online'));
  socket.on('disconnect', () => setConnBadge('offline'));
  socket.on('connect_error', () => setConnBadge('offline'));

  socket.on('presence:update', info => setConnBadge(socket.connected ? 'online' : 'offline', info && info.count));

  socket.on('state:init', shared => {
    applySharedState(shared);
    renderAll();
    toast('실시간 연결되었습니다. 다른 사람의 변경사항이 자동으로 반영됩니다.');
  });

  socket.on('state:pulled', shared => {
    applySharedState(shared);
    renderAll();
    flashLiveIndicator();
  });
}

/* ---------- boot ---------- */
function boot() {
  addQueueRow();
  addQueueRow();
  bindGlobalEvents();
  renderAll(); // 서버 데이터가 도착하기 전, 빈 상태로 1차 렌더(빈 화면 방지)
  connectRealtime();
}

function makeLoc(zonePrefix, bay, tier, pos) {
  return `${zonePrefix}-${String(bay).padStart(2, '0')}-${String(tier).padStart(2, '0')}-${String(pos).padStart(2, '0')}`;
}

function floorOf(zone) {
  const c = String(zone || '').charAt(0);
  if (c === '1' || c === '2' || c === '3') return c + '층';
  return '기타';
}

/* ---------- utils ---------- */
function naturalCompare(a, b) {
  const ax = a.match(/(\d+|\D+)/g) || [];
  const bx = b.match(/(\d+|\D+)/g) || [];
  const len = Math.max(ax.length, bx.length);
  for (let i = 0; i < len; i++) {
    const av = ax[i] || '', bv = bx[i] || '';
    const an = Number(av), bn = Number(bv);
    if (!isNaN(an) && !isNaN(bn) && av !== '' && bv !== '') {
      if (an !== bn) return an - bn;
    } else if (av !== bv) {
      return av < bv ? -1 : 1;
    }
  }
  return 0;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, isErr) {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

function markDirty() { state.changesSinceBackup++; updateBackupNote(); syncToServer(); }

function findProduct(barcode) {
  return state.products.find(p => p.barcode === barcode);
}

function productLabel(barcode) {
  const p = findProduct(barcode);
  return p ? p.name : '(상품마스터 미등록)';
}

function fmtDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 일자별 입고 기록(엑셀 붙여넣기용) 관련 날짜 헬퍼
function dateParts(ts) {
  const d = new Date(ts);
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}
function fmtDateOnly(ts) {
  const { y, m, d } = dateParts(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
}

function csvSplit(line) {
  if (line.includes('\t')) return line.split('\t').map(s => s.trim());
  // simple comma split (no embedded-comma quoting needs for this data shape)
  return line.split(',').map(s => s.trim());
}

function csvCell(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}
function csvRow(arr) {
  return arr.map(csvCell).join(',');
}

function downloadFile(filename, content, mime) {
  // CSV는 엑셀(Windows)에서 열 때 한글이 깨지지 않도록 UTF-8 BOM을 붙인다.
  const body = (mime === 'text/csv' && !content.startsWith('﻿')) ? '﻿' + content : content;
  const blob = new Blob([body], { type: (mime || 'application/json') + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* =========================================================
   할당 엔진 (원본 autoStockPlacement / findEmptySpace 이식)
   ========================================================= */

function locationParts(loc) {
  const segs = loc.split('-');
  return { prefix: segs.slice(0, -1).join('-'), last: parseInt(segs[segs.length - 1], 10) };
}

function partnerLocOf(loc) {
  const { prefix, last } = locationParts(loc);
  const partnerNum = (last % 2 !== 0) ? last + 1 : last - 1;
  return `${prefix}-${String(partnerNum).padStart(2, '0')}`;
}

function isOccupied(locRow) {
  return !!(locRow.barcode && String(locRow.barcode).trim() !== '');
}

// 로케이션 문자열 → {zone, bay, tier, pos} 로 분해 (근접도 계산용)
function locBayTierPos(loc) {
  const segs = loc.split('-');
  return {
    zone: loc.slice(0, 3),
    bay: parseInt(segs[1], 10),
    tier: parseInt(segs[2], 10),
    pos: parseInt(segs[3], 10)
  };
}

// candLoc이 refLocs(동일 상품이 이미 있는 위치들) 중 가장 가까운 곳과 얼마나 떨어져 있는지 점수화.
// 같은 구역 내에서: 베이 차이를 최우선(가중치 100) → 단 차이(10) → 포지션 차이(1) 순으로 반영.
// 구역이 다르면 비교 대상에서 제외(무한대) — "동일 상품 주변"은 같은 구역 안에서의 근접도를 의미.
function proximityScore(candLoc, refLocs) {
  if (!refLocs || refLocs.length === 0) return Infinity;
  const c = locBayTierPos(candLoc);
  if (isNaN(c.bay)) return Infinity;
  let best = Infinity;
  for (const ref of refLocs) {
    const r = locBayTierPos(ref);
    if (r.zone !== c.zone || isNaN(r.bay)) continue;
    const d = Math.abs(c.bay - r.bay) * 100 + Math.abs((c.tier || 0) - (r.tier || 0)) * 10 + Math.abs((c.pos || 0) - (r.pos || 0));
    if (d < best) best = d;
  }
  return best;
}

// 상품명이 "상품명 기반 고정구역 규칙"에 해당하면 그 규칙의 zones를 반환, 아니면 null.
// 여러 규칙에 매칭되면 먼저 등록된 규칙을 우선한다.
function getNameRuleZones(product) {
  if (!product || !product.name || !state.nameRules) return null;
  const name = product.name;
  for (const rule of state.nameRules) {
    if (!rule.zones || rule.zones.length === 0) continue;
    const mustList = (rule.mustAll || []).filter(Boolean);
    if (mustList.length === 0) continue; // 필수 키워드 없는 규칙은 매칭하지 않음(오작동 방지)
    const mustOk = mustList.every(k => name.includes(k));
    if (!mustOk) continue;
    const anyList = (rule.anyOf || []).filter(Boolean);
    const anyOk = anyList.length === 0 || anyList.some(k => name.includes(k));
    if (!anyOk) continue;
    return rule.zones;
  }
  return null;
}

// 까대기(적재 top-up) 대상 로케이션 탐색: 동일 바코드가 이미 있고, 그 수량이 PLT당 적재수량보다
// 적은 로케이션 중 "채워야 할 여유수량이 가장 적은" 곳부터 우선 채운다.
// 정상 배치와 달리 등급/우선순위 구역 제한을 받지 않는다 — 이미 legit하게 적치된 자리를 채우는 것이므로.
function findMergeableLocation(barcode, pltQty) {
  if (!barcode || !(pltQty > 0)) return null;
  const candidates = state.locations.filter(row => {
    if (row.barcode !== barcode) return false;
    const q = Number(row.qty);
    return Number.isFinite(q) && q > 0 && q < pltQty;
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (pltQty - Number(a.qty)) - (pltQty - Number(b.qty)));
  return candidates[0];
}

// targetZones 안에서 조건에 맞는 빈 공간을 찾는다. refLocs가 주어지면(동일 상품의 기존 위치들)
// 그 중 가장 가까운 빈 자리를 우선 배치하고, refLocs가 없으면 로케이션 자연순으로 첫 번째 빈 자리를 사용한다.
// bypassExclude가 true면 할당 제외 구역이라도 탐색 대상에 포함한다(상품명 고정구역 규칙 전용).
function findEmptySpace(targetZones, barcode, qty, is2Plt, isFraction, refLocs, bypassExclude) {
  const sorted = [...state.locations].sort((a, b) => naturalCompare(a.loc, b.loc));
  const byLoc = new Map(state.locations.map(l => [l.loc, l]));

  const eligible = [];
  for (const row of sorted) {
    if (!bypassExclude && state.rules.exclude.some(ex => row.loc.startsWith(ex))) continue;
    if (isFraction && row.tier !== '01') continue;
    const isRightZone = targetZones.length === 0 || targetZones.some(z => row.loc.startsWith(z));
    if (!isRightZone) continue;
    if (isOccupied(row)) continue;
    if (is2Plt) {
      const partnerLoc = partnerLocOf(row.loc);
      const partner = byLoc.get(partnerLoc);
      if (!partner || isOccupied(partner)) continue;
    }
    eligible.push(row);
  }
  if (eligible.length === 0) return null;

  let best = eligible[0];
  if (refLocs && refLocs.length) {
    let bestScore = proximityScore(best.loc, refLocs);
    for (let i = 1; i < eligible.length; i++) {
      const score = proximityScore(eligible[i].loc, refLocs);
      if (score < bestScore) { bestScore = score; best = eligible[i]; }
    }
  }

  if (is2Plt) {
    const partnerLoc = partnerLocOf(best.loc);
    const partner = byLoc.get(partnerLoc);
    best.barcode = barcode; best.qty = qty;
    partner.barcode = barcode; partner.qty = '2PLT(점유)';
    return { mainLoc: best.loc, partnerLoc: partner.loc };
  } else {
    best.barcode = barcode; best.qty = qty;
    return { mainLoc: best.loc };
  }
}

function runAllocationForItem(barcode, totalQty, priorityZoneStr, batchLabel) {
  const product = findProduct(barcode);
  const grade = (product && product.grade) || 'C';
  const pltPerQty = Number(product && product.pltQty) || 1;
  const is2Plt = !!(product && product.is2plt);
  const nameRuleZones = getNameRuleZones(product); // 상품명 고정구역 규칙 (있으면 무조건 이 구역들에만 배치)

  let remaining = Number(totalQty);
  const priorityZones = (priorityZoneStr || '').split(',').map(z => z.trim()).filter(Boolean);
  let existingFullLocs = state.locations.filter(l => l.barcode === barcode).map(l => l.loc);
  let existingZones = Array.from(new Set(existingFullLocs.map(l => l.slice(0, 3))));
  const defaultGradeZones = state.rules[grade] || [];

  const placements = [];

  while (remaining > 0) {
    // 까대기(적재 top-up): 설정에서 켜져 있을 때만, 새 빈 자리를 찾기 전에 동일 바코드가 이미 있고
    // PLT당 적재수량보다 적게 쌓여있는 로케이션이 있으면 그 자리부터 채운다. 2PLT 상품이라도 이미
    // 실재고로 적치된 자리를 채우는 것뿐이라 새로 짝 슬롯을 잡을 필요가 없으므로 제외하지 않는다.
    // ('2PLT(점유)' 짝슬롯은 숫자가 아니므로 findMergeableLocation에서 자동으로 제외됨)
    const mergeLoc = state.rules.mergeEnabled !== false ? findMergeableLocation(barcode, pltPerQty) : null;
    if (mergeLoc) {
      const room = pltPerQty - Number(mergeLoc.qty);
      const addQty = Math.min(remaining, room);
      mergeLoc.qty = Number(mergeLoc.qty) + addQty;
      remaining -= addQty;
      if (!existingFullLocs.includes(mergeLoc.loc)) existingFullLocs = [...existingFullLocs, mergeLoc.loc];
      existingZones = Array.from(new Set(existingFullLocs.map(l => l.slice(0, 3))));
      placements.push({ loc: mergeLoc.loc, partnerLoc: null, qty: addQty, is2plt: false, merged: true });
      state.log.push({
        id: uid(), ts: Date.now(), barcode, name: (product && product.name) || '',
        qty: addQty, loc: mergeLoc.loc, is2plt: false, verified: null, merged: true, batch: batchLabel || ''
      });
      continue;
    }

    const currentPutQty = Math.min(remaining, pltPerQty);
    const isFraction = currentPutQty < pltPerQty;

    let searchGroups;
    if (nameRuleZones) {
      // "무조건" 규칙: 우선순위 구역/등급 기본구역/전체 탐색을 모두 건너뛰고 지정 구역에만 배치.
      // 할당 제외 구역(state.rules.exclude)에 포함되어 있어도 이 규칙이 우선한다.
      searchGroups = [
        { zones: nameRuleZones, refLocs: existingFullLocs, bypassExclude: true }
      ];
    } else {
      // 탐색 순서: ①지정 우선순위 구역 ②동일 상품이 이미 있는 구역(가장 가까운 빈자리부터) ③등급별 기본 구역 ④전체.
      // ①②는 refLocs(existingFullLocs)를 넘겨 "동일 상품 주변"에 최대한 가깝게 배치되도록 한다.
      searchGroups = [
        { zones: priorityZones, refLocs: existingFullLocs },
        { zones: existingZones, refLocs: existingFullLocs },
        { zones: defaultGradeZones, refLocs: [] },
        { zones: [], refLocs: [] }
      ];
    }

    let found = null;
    for (let i = 0; i < searchGroups.length; i++) {
      const { zones, refLocs, bypassExclude } = searchGroups[i];
      if (zones.length === 0 && i !== searchGroups.length - 1) continue;
      found = findEmptySpace(zones, barcode, currentPutQty, is2Plt, isFraction, refLocs, bypassExclude);
      if (found) break;
    }

    if (found) {
      remaining -= currentPutQty;
      existingFullLocs = [...existingFullLocs, found.mainLoc];
      existingZones = Array.from(new Set(existingFullLocs.map(l => l.slice(0, 3))));
      placements.push({ loc: found.mainLoc, partnerLoc: found.partnerLoc || null, qty: currentPutQty, is2plt: is2Plt });
      const ts = Date.now();
      state.log.push({
        id: uid(), ts, barcode, name: (product && product.name) || '',
        qty: currentPutQty, loc: found.mainLoc, is2plt: is2Plt, verified: null, batch: batchLabel || ''
      });
    } else {
      break;
    }
  }

  return {
    barcode, name: (product && product.name) || '', requestedQty: Number(totalQty),
    allocatedQty: Number(totalQty) - remaining, remaining, placements
  };
}

function syncPhysicalStock(rows, opts) {
  // 원본 syncPhysicalStock 이식: 전체 재고를 비운 뒤 실재고 목록으로 다시 채움.
  // opts.autoCreate: 목록에 없는 로케이션/상품을 만나면 자동으로 생성(엑셀 업로드 시 기본 사용).
  const autoCreate = !!(opts && opts.autoCreate);
  state.locations.forEach(l => { l.barcode = ''; l.qty = ''; });
  const byLoc = new Map(state.locations.map(l => [l.loc, l]));
  let applied = 0, skipped = 0, createdLocs = 0, createdProducts = 0;

  rows.forEach(({ barcode, qty, loc, name }) => {
    if (!barcode || !loc || loc === '00-00-00-00') { skipped++; return; }
    if (!byLoc.has(loc)) {
      if (!autoCreate) { skipped++; return; }
      const segs = loc.split('-');
      const rec = { loc, zone: loc.slice(0, 3), tier: segs[2] || '', barcode: '', qty: '' };
      state.locations.push(rec);
      byLoc.set(loc, rec);
      createdLocs++;
    }
    let product = findProduct(barcode);
    if (!product && autoCreate) {
      product = { barcode, name: name || barcode, grade: 'C', pltQty: 1, is2plt: false };
      state.products.push(product);
      createdProducts++;
    }
    if (product && product.is2plt) {
      const partnerLoc = partnerLocOf(loc);
      const partner = byLoc.get(partnerLoc);
      const target = byLoc.get(loc);
      target.barcode = barcode; target.qty = qty;
      if (partner) { partner.barcode = barcode; partner.qty = '2PLT(점유)'; }
    } else {
      const target = byLoc.get(loc);
      target.barcode = barcode; target.qty = qty;
    }
    applied++;
  });
  return { applied, skipped, createdLocs, createdProducts };
}

/* ---- 엑셀(WMS 실재고) 업로드 파싱 ---- */
function parseWmsWorkbookRows(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

  // 상품명/바코드/다중로케이션/가용재고 헤더가 있는 행을 찾는다 (상단에 병합된 그룹 헤더가 있을 수 있음)
  let headerRow = -1, colMap = {};
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    const row = grid[i].map(c => String(c || '').trim());
    const idxName = row.indexOf('상품명');
    const idxBarcode = row.indexOf('바코드');
    const idxLoc = row.indexOf('다중로케이션');
    const idxQty = row.indexOf('가용재고');
    if (idxBarcode !== -1 && idxLoc !== -1) {
      headerRow = i;
      colMap = { name: idxName, barcode: idxBarcode, loc: idxLoc, qty: idxQty };
      break;
    }
  }
  if (headerRow === -1) return { rows: [], error: '상품명/바코드/다중로케이션/가용재고 열을 찾지 못했습니다. 파일 형식을 확인해주세요.' };

  const rows = [];
  for (let i = headerRow + 1; i < grid.length; i++) {
    const r = grid[i];
    if (!r || r.length === 0) continue;
    const barcode = String(r[colMap.barcode] ?? '').trim();
    const loc = String(r[colMap.loc] ?? '').trim();
    const name = colMap.name !== -1 ? String(r[colMap.name] ?? '').replace(/\t/g, '').trim() : '';
    const qtyRaw = colMap.qty !== -1 ? r[colMap.qty] : '';
    const qty = qtyRaw === '' || qtyRaw === undefined ? 0 : Number(qtyRaw) || 0;
    if (!barcode) continue;
    rows.push({ barcode, name, loc, qty });
  }
  return { rows, error: null };
}

function handleWmsExcelFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: false });
      const { rows, error } = parseWmsWorkbookRows(workbook);
      if (error) { toast(error, true); return; }
      if (rows.length === 0) { toast('추출할 데이터가 없습니다.', true); return; }
      const skippedNoLoc = rows.filter(r => !r.loc || r.loc === '00-00-00-00').length;
      if (!confirm(`엑셀에서 ${rows.length.toLocaleString()}행을 읽었습니다 (로케이션 미배정 ${skippedNoLoc}건 제외 예정).\n현재 재고 로케이션 상태를 전부 지우고 이 파일 내용으로 교체합니다. 계속할까요?`)) return;
      const result = syncPhysicalStock(rows, { autoCreate: true });
      markDirty(); renderLocations(); renderDashboard(); renderProducts();
      toast(`엑셀 동기화 완료: 반영 ${result.applied}건, 신규 로케이션 ${result.createdLocs}건, 신규 상품 ${result.createdProducts}건`);
    } catch (err) {
      toast('엑셀 파일을 읽는 중 오류가 발생했습니다: ' + err.message, true);
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ---- PDA 스캔 검증 ---- */
function runPdaVerification(rawLoc, rawBarcode) {
  const locCode = String(rawLoc || '').trim();
  const scannedBarcode = String(rawBarcode || '').trim();
  if (!locCode || !scannedBarcode) return;

  const locRow = state.locations.find(l => l.loc === locCode);
  if (!locRow) {
    const entry = { ts: Date.now(), loc: locCode, scanned: scannedBarcode, expected: null, matched: false, note: '등록되지 않은 로케이션' };
    state.scanFeed.unshift(entry);
    state.scanFeed = state.scanFeed.slice(0, 30);
    renderScanFeed(entry);
    toast(`❌ 등록되지 않은 로케이션입니다: ${locCode}`, true);
    return;
  }

  const expectedBarcode = locRow.barcode || '';
  const isPartnerSlot = locRow.qty === '2PLT(점유)';
  const matched = !!expectedBarcode && expectedBarcode === scannedBarcode;

  // 이 로케이션(또는 2PLT 대표 로케이션)에 해당하는 가장 최근 할당기록을 찾아 검증값을 반영한다.
  let targetLoc = locCode;
  if (isPartnerSlot && expectedBarcode) {
    const partner = state.locations.find(l => l.barcode === expectedBarcode && l.qty !== '2PLT(점유)');
    if (partner) targetLoc = partner.loc;
  }
  let target = null;
  if (expectedBarcode) {
    const candidates = state.log.filter(l => l.loc === targetLoc && l.barcode === expectedBarcode).sort((a, b) => b.ts - a.ts);
    target = candidates.find(l => l.verified === null) || candidates[0] || null;
  }

  if (target) {
    target.verified = matched;
    if (!matched) target.note = `스캔 불일치 (기록 바코드: ${expectedBarcode}, 스캔값: ${scannedBarcode})`;
    else delete target.note;
  } else {
    // 자동할당을 거치지 않고 실재고 동기화/엑셀 업로드로 채워진 로케이션은 대응하는 할당기록이 없을 수 있음 →
    // 스캔 결과를 새 기록으로 남겨 이력에서 확인할 수 있게 한다.
    const product = findProduct(expectedBarcode) || findProduct(scannedBarcode);
    state.log.push({
      id: uid(), ts: Date.now(),
      barcode: expectedBarcode || scannedBarcode,
      name: (product && product.name) || '',
      qty: expectedBarcode ? locRow.qty : '',
      loc: locCode, is2plt: isPartnerSlot || !!(product && product.is2plt),
      verified: matched,
      note: matched ? undefined : `스캔 불일치 (기록 바코드: ${expectedBarcode || '빈공간'}, 스캔값: ${scannedBarcode})`
    });
  }

  const feedEntry = { ts: Date.now(), loc: locCode, scanned: scannedBarcode, expected: expectedBarcode, matched };
  state.scanFeed.unshift(feedEntry);
  state.scanFeed = state.scanFeed.slice(0, 30);

  markDirty();
  renderLog(); renderScanFeed(feedEntry); renderDashboard();

  if (matched) {
    toast(`✅ 일치 — ${locCode} / ${scannedBarcode}`);
  } else {
    toast(`❌ 불일치 — ${locCode} (기록: ${expectedBarcode || '빈공간'} / 스캔: ${scannedBarcode})`, true);
  }
}

function renderScanFeed(latest) {
  const banner = document.getElementById('scanResultBanner');
  if (latest) {
    let detail;
    if (latest.matched) {
      detail = `${esc(latest.loc)} · ${esc(latest.scanned)}`;
    } else if (latest.expected === null) {
      detail = `${esc(latest.loc)} · 목록에 없는 로케이션입니다 (스캔값: ${esc(latest.scanned)})`;
    } else if (!latest.expected) {
      detail = `${esc(latest.loc)} · 기록상 빈 공간인데 상품이 스캔됨 (스캔값: ${esc(latest.scanned)})`;
    } else {
      detail = `${esc(latest.loc)} · 기록 ${esc(latest.expected)} / 스캔 ${esc(latest.scanned)}`;
    }
    banner.innerHTML = latest.matched
      ? `<div class="scan-banner match">✅ 일치 (TRUE)<span class="sub">${detail}</span></div>`
      : `<div class="scan-banner mismatch">❌ 불일치 (FALSE)<span class="sub">${detail}</span></div>`;
  } else if (!banner.innerHTML) {
    banner.innerHTML = '';
  }

  const feed = document.getElementById('scanFeed');
  if (state.scanFeed.length === 0) {
    feed.innerHTML = '<div class="empty-state">아직 스캔 이력이 없습니다.</div>';
    return;
  }
  feed.innerHTML = state.scanFeed.map(s => `
    <div class="scan-feed-row">
      <span class="t mono">${fmtDate(s.ts).split(' ')[1] || ''}</span>
      <span class="l mono">${esc(s.loc)}</span>
      <span class="b">${s.matched ? `일치 · ${esc(s.scanned)}` : s.expected === null ? `미등록 로케이션 · 스캔 ${esc(s.scanned)}` : `불일치 · 기록 ${esc(s.expected || '빈공간')} / 스캔 ${esc(s.scanned)}`}</span>
      ${s.matched ? '<span class="badge occ">TRUE</span>' : '<span class="badge" style="background:#fbe6e6;color:var(--critical);">FALSE</span>'}
    </div>`).join('');
}

/* =========================================================
   렌더링
   ========================================================= */

function renderAll() {
  renderDashboard();
  renderProducts();
  renderLocations();
  renderQueue();
  renderResults();
  renderHistoryDayNav();
  renderLog();
  renderScanFeed();
  renderSettings();
  renderCbmTab();
  updateBackupNote();
}

/* ---- dashboard ---- */
function renderDashboard() {
  const total = state.locations.length;
  const occupied = state.locations.filter(isOccupied).length;
  const empty = total - occupied;
  const util = total ? Math.round((occupied / total) * 100) : 0;

  document.getElementById('kpiTotalLoc').textContent = total.toLocaleString();
  document.getElementById('kpiOccupied').textContent = occupied.toLocaleString();
  document.getElementById('kpiEmpty').textContent = empty.toLocaleString();
  document.getElementById('kpiUtil').innerHTML = util + '<small>%</small>';
  document.getElementById('kpiProducts').textContent = state.products.length.toLocaleString();

  const todayStr = new Date().toDateString();
  const todayCount = state.log.filter(l => new Date(l.ts).toDateString() === todayStr).length;
  document.getElementById('kpiToday').textContent = todayCount.toLocaleString();

  // floor-level summary (always shown)
  const floorMap = new Map();
  state.locations.forEach(l => {
    const floor = floorOf(l.zone);
    if (!floorMap.has(floor)) floorMap.set(floor, { total: 0, occ: 0 });
    const f = floorMap.get(floor);
    f.total++; if (isOccupied(l)) f.occ++;
  });
  const floorOrder = ['1층', '2층', '3층', '기타'].filter(f => floorMap.has(f));
  const floorBars = document.getElementById('floorBars');
  if (floorBars) {
    floorBars.innerHTML = floorOrder.map(f => {
      const d = floorMap.get(f);
      const pct = d.total ? Math.round((d.occ / d.total) * 100) : 0;
      return `<div class="bar-row">
        <div class="zone-lbl">${esc(f)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="cnt">${d.occ}/${d.total} (${pct}%)</div>
      </div>`;
    }).join('');
  }

  // zone-level detail bars (filtered by selected floor)
  const zoneFloorSel = document.getElementById('dashFloorFilter');
  if (zoneFloorSel && zoneFloorSel.options.length <= 1) {
    zoneFloorSel.innerHTML = floorOrder.map(f => `<option value="${esc(f)}">${esc(f)} 구역별 보기</option>`).join('');
    zoneFloorSel.value = floorOrder[0] || '';
  }
  const selectedFloor = zoneFloorSel ? zoneFloorSel.value : floorOrder[0];

  const zoneMap = new Map();
  state.locations.forEach(l => {
    if (floorOf(l.zone) !== selectedFloor) return;
    if (!zoneMap.has(l.zone)) zoneMap.set(l.zone, { total: 0, occ: 0 });
    const z = zoneMap.get(l.zone);
    z.total++; if (isOccupied(l)) z.occ++;
  });
  const zones = Array.from(zoneMap.keys()).sort(naturalCompare);
  const zoneBars = document.getElementById('zoneBars');
  if (zones.length === 0) {
    zoneBars.innerHTML = '<div class="empty-state">등록된 로케이션이 없습니다.</div>';
  } else {
    zoneBars.innerHTML = zones.map(z => {
      const d = zoneMap.get(z);
      const pct = d.total ? Math.round((d.occ / d.total) * 100) : 0;
      return `<div class="bar-row">
        <div class="zone-lbl">${esc(z)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="cnt">${d.occ}/${d.total} (${pct}%)</div>
      </div>`;
    }).join('');
  }

  // grade bars
  const gradeCounts = { A: 0, B: 0, C: 0 };
  state.products.forEach(p => { if (gradeCounts[p.grade] !== undefined) gradeCounts[p.grade]++; else gradeCounts.C++; });
  const gradeTotal = state.products.length || 1;
  const gradeColors = { A: 'var(--series-1)', B: 'var(--series-2)', C: 'var(--series-3)' };
  document.getElementById('gradeBars').innerHTML = ['A', 'B', 'C'].map(g => {
    const pct = Math.round((gradeCounts[g] / gradeTotal) * 100);
    return `<div class="bar-row">
      <div class="zone-lbl">${g}등급</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${gradeColors[g]}"></div></div>
      <div class="cnt">${gradeCounts[g]}개 (${pct}%)</div>
    </div>`;
  }).join('');

  // recent log
  const recent = [...state.log].sort((a, b) => b.ts - a.ts).slice(0, 10);
  const body = document.getElementById('recentLogBody');
  if (recent.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="empty-state">아직 할당 기록이 없습니다.</td></tr>`;
  } else {
    body.innerHTML = recent.map(l => `
      <tr>
        <td class="mono muted">${fmtDate(l.ts)}</td>
        <td class="mono">${esc(l.barcode)}</td>
        <td>${esc(l.name || productLabel(l.barcode))}</td>
        <td class="right mono">${l.qty}</td>
        <td class="mono">${esc(l.loc)}${l.is2plt ? ' <span class="badge two-plt">2PLT</span>' : ''}${l.merged ? ' <span class="badge merge">합짐</span>' : ''}</td>
        <td>${verifyBadge(l.verified)}</td>
      </tr>`).join('');
  }
}

function verifyBadge(v) {
  if (v === true) return '<span class="badge occ">TRUE</span>';
  if (v === false) return '<span class="badge" style="background:#fbe6e6;color:var(--critical);">FALSE</span>';
  return '<span class="badge empty">미확인</span>';
}

/* ---- products ---- */
function filteredProducts() {
  const q = state.ui.prodSearch.trim().toLowerCase();
  const g = state.ui.prodGrade;
  return state.products.filter(p => {
    if (g && p.grade !== g) return false;
    if (q && !(p.barcode.toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderProducts() {
  const list = filteredProducts();
  document.getElementById('prodCount').textContent = `${list.length.toLocaleString()}개`;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (state.ui.prodPage > totalPages) state.ui.prodPage = totalPages;
  const page = state.ui.prodPage;
  const pageItems = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const body = document.getElementById('productsBody');
  if (pageItems.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="empty-state">조건에 맞는 상품이 없습니다.</td></tr>`;
  } else {
    body.innerHTML = pageItems.map(p => `
      <tr data-barcode="${esc(p.barcode)}">
        <td class="mono">${esc(p.barcode)}</td>
        <td>${esc(p.name)}</td>
        <td>
          <select class="pf-grade" data-field="grade">
            <option value="A" ${p.grade === 'A' ? 'selected' : ''}>A</option>
            <option value="B" ${p.grade === 'B' ? 'selected' : ''}>B</option>
            <option value="C" ${p.grade === 'C' ? 'selected' : ''}>C</option>
          </select>
        </td>
        <td class="right"><input type="number" min="1" class="pf-plt mono" data-field="pltQty" value="${p.pltQty}" style="width:76px; text-align:right;"></td>
        <td class="center"><input type="checkbox" class="pf-2plt" data-field="is2plt" ${p.is2plt ? 'checked' : ''}></td>
        <td class="center"><button class="btn ghost sm pf-del">삭제</button></td>
      </tr>`).join('');
  }
  document.getElementById('prodPager').innerHTML = pagerHtml(page, totalPages, 'prod');
}

function pagerHtml(page, totalPages, key) {
  return `<button class="btn ghost sm pg-prev" data-key="${key}" ${page <= 1 ? 'disabled' : ''}>이전</button>
  <span>${page} / ${totalPages}</span>
  <button class="btn ghost sm pg-next" data-key="${key}" ${page >= totalPages ? 'disabled' : ''}>다음</button>`;
}

/* ---- locations ---- */
function refreshZoneFilterOptions() {
  const floorSel = document.getElementById('locFloorFilter');
  const floors = Array.from(new Set(state.locations.map(l => floorOf(l.zone)))).sort();
  const curFloor = floorSel.value;
  floorSel.innerHTML = '<option value="">전체 층</option>' + floors.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
  if (floors.includes(curFloor)) floorSel.value = curFloor;

  const sel = document.getElementById('locZoneFilter');
  const zones = Array.from(new Set(
    state.locations.filter(l => !state.ui.locFloor || floorOf(l.zone) === state.ui.locFloor).map(l => l.zone)
  )).sort(naturalCompare);
  const cur = sel.value;
  sel.innerHTML = '<option value="">전체 구역</option>' + zones.map(z => `<option value="${esc(z)}">${esc(z)}</option>`).join('');
  if (zones.includes(cur)) sel.value = cur; else sel.value = '';
}

function filteredLocations() {
  const q = state.ui.locSearch.trim().toLowerCase();
  const zone = state.ui.locZone;
  const floor = state.ui.locFloor;
  const status = state.ui.locStatus;
  return state.locations.filter(l => {
    if (floor && floorOf(l.zone) !== floor) return false;
    if (zone && l.zone !== zone) return false;
    if (status === 'occupied' && !isOccupied(l)) return false;
    if (status === 'empty' && isOccupied(l)) return false;
    if (q && !(l.loc.toLowerCase().includes(q) || (l.barcode || '').toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderLocations() {
  refreshZoneFilterOptions();
  const list = [...filteredLocations()].sort((a, b) => naturalCompare(a.loc, b.loc));
  document.getElementById('locCount').textContent = `${list.length.toLocaleString()}개`;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (state.ui.locPage > totalPages) state.ui.locPage = totalPages;
  const page = state.ui.locPage;
  const pageItems = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const body = document.getElementById('locationsBody');
  if (pageItems.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="empty-state">조건에 맞는 로케이션이 없습니다. “로케이션 일괄생성”으로 랙 구조를 만들어보세요.</td></tr>`;
  } else {
    body.innerHTML = pageItems.map(l => {
      const occ = isOccupied(l);
      const is2pltPartner = l.qty === '2PLT(점유)';
      return `<tr class="loc-row" data-loc="${esc(l.loc)}" style="cursor:pointer;">
        <td class="mono">${esc(l.loc)}</td>
        <td class="mono muted">${esc(l.zone)}</td>
        <td class="mono muted center">${esc(l.tier)}</td>
        <td class="mono">${occ ? esc(l.barcode) : ''}</td>
        <td>${occ ? esc(productLabel(l.barcode)) : ''}</td>
        <td class="right mono">${occ ? esc(l.qty) : ''}</td>
        <td>${occ ? (is2pltPartner ? '<span class="badge two-plt">2PLT 점유</span>' : '<span class="badge occ">사용중</span>') : '<span class="badge empty">빈공간</span>'}</td>
      </tr>`;
    }).join('');
  }
  document.getElementById('locPager').innerHTML = pagerHtml(page, totalPages, 'loc');
}

/* ---- inbound queue ---- */
function addQueueRow() {
  state.queue.push({ id: uid(), barcode: '', qty: '', zone: '' });
}

function renderQueue() {
  const wrap = document.getElementById('inboundQueue');
  wrap.innerHTML = state.queue.map(row => {
    const p = findProduct(row.barcode);
    return `<div class="queue-row" data-id="${row.id}">
      <div>
        <input type="text" class="q-barcode" placeholder="바코드" value="${esc(row.barcode)}">
        <div class="pname">${p ? esc(p.name) + ` · ${p.grade}등급 · PLT ${p.pltQty}` + (p.is2plt ? ' · 2PLT' : '') : (row.barcode ? '상품마스터 미등록 (기본값 C등급/PLT1 적용)' : '')}</div>
      </div>
      <input type="number" min="1" class="q-qty" placeholder="수량" value="${esc(row.qty)}">
      <div></div>
      <input type="text" class="q-zone" placeholder="예: 1B-,1C-" value="${esc(row.zone)}">
      <button class="btn ghost sm q-del" title="삭제">✕</button>
    </div>`;
  }).join('');
}

/* ---- log ---- */
function filteredLog() {
  const q = state.ui.logSearch.trim().toLowerCase();
  const v = state.ui.logVerify;
  return state.log.filter(l => {
    if (v === 'unverified' && l.verified !== null) return false;
    if (v === 'true' && l.verified !== true) return false;
    if (v === 'false' && l.verified !== false) return false;
    if (q && !(l.barcode.toLowerCase().includes(q) || l.loc.toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderLog() {
  const list = [...filteredLog()].sort((a, b) => b.ts - a.ts);
  document.getElementById('logCount').textContent = `${list.length.toLocaleString()}건`;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (state.ui.logPage > totalPages) state.ui.logPage = totalPages;
  const page = state.ui.logPage;
  const pageItems = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const body = document.getElementById('logBody');
  if (pageItems.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="empty-state">할당 기록이 없습니다.</td></tr>`;
  } else {
    body.innerHTML = pageItems.map(l => `
      <tr data-id="${l.id}">
        <td class="mono muted">${fmtDate(l.ts)}</td>
        <td class="mono">${esc(l.barcode)}</td>
        <td>${esc(l.name || productLabel(l.barcode))}${l.note ? `<div class="pname" style="color:var(--critical);">${esc(l.note)}</div>` : ''}</td>
        <td class="right mono">${l.qty}</td>
        <td class="mono">${esc(l.loc)}${l.merged ? ' <span class="badge merge">합짐</span>' : ''} <button class="btn ghost sm log-loc-edit" data-id="${l.id}" title="현장에서 실제로 적치한 위치가 다르면 여기서 정정하세요">수정</button></td>
        <td class="center">${l.is2plt ? '✓' : ''}</td>
        <td><button class="chip-toggle log-verify ${l.verified === true ? 'true' : l.verified === false ? 'false' : 'null'}">${l.verified === true ? 'TRUE' : l.verified === false ? 'FALSE' : '미확인'}</button></td>
      </tr>`).join('');
  }
  document.getElementById('logPager').innerHTML = pagerHtml(page, totalPages, 'log');
}

/* ---- settings ---- */
function renderSettings() {
  document.getElementById('ruleA').value = state.rules.A.join(',');
  document.getElementById('ruleB').value = state.rules.B.join(',');
  document.getElementById('ruleC').value = state.rules.C.join(',');
  document.getElementById('ruleExclude').value = state.rules.exclude.join(',');
  document.getElementById('mergeEnabledToggle').checked = state.rules.mergeEnabled !== false;
  renderNameRules();
  renderBatchPresets();
}

function renderNameRules() {
  const wrap = document.getElementById('nameRulesList');
  if (!wrap) return;
  if (!state.nameRules || state.nameRules.length === 0) {
    wrap.innerHTML = `<div class="empty-state">등록된 규칙이 없습니다.</div>`;
    return;
  }
  wrap.innerHTML = state.nameRules.map(r => `
    <div class="name-rule-row" data-id="${r.id}" style="display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; padding:10px 0; border-bottom:1px dashed var(--grid);">
      <div class="zone-input-group" style="flex:1 1 220px;"><label>필수 포함 (모두, 쉼표)</label><input type="text" class="nr-mustall" value="${esc((r.mustAll || []).join(','))}"></div>
      <div class="zone-input-group" style="flex:1 1 220px;"><label>선택 포함 (하나 이상, 쉼표)</label><input type="text" class="nr-anyof" value="${esc((r.anyOf || []).join(','))}"></div>
      <div class="zone-input-group" style="flex:1 1 160px;"><label>고정 구역 (쉼표)</label><input type="text" class="nr-zones" value="${esc((r.zones || []).join(','))}"></div>
      <button class="btn ghost sm nr-del">삭제</button>
    </div>`).join('');
}

function updateBackupNote() {
  const note = document.getElementById('lastBackupNote');
  if (state.changesSinceBackup === 0) {
    note.textContent = '변경사항 없음';
  } else {
    note.textContent = `백업 후 변경사항 ${state.changesSinceBackup}건 — 저장을 권장합니다`;
  }
}

/* =========================================================
   드로어 (로케이션 편집)
   ========================================================= */
function openLocationDrawer(loc) {
  const row = state.locations.find(l => l.loc === loc);
  if (!row) return;
  const backdrop = document.getElementById('drawerBackdrop');
  const body = document.getElementById('drawerBody');
  const occ = isOccupied(row);
  const isPartner = row.qty === '2PLT(점유)';
  body.innerHTML = `
    <h3>${esc(row.loc)}</h3>
    <div class="field"><label>구역 / 단</label><input type="text" value="${esc(row.zone)} / ${esc(row.tier)}단" disabled></div>
    <div class="field"><label>바코드</label><input type="text" id="dwBarcode" value="${occ && !isPartner ? esc(row.barcode) : (isPartner ? esc(row.barcode) : '')}" ${isPartner ? 'disabled' : ''} placeholder="바코드 입력"></div>
    <div class="field"><label>수량</label><input type="text" id="dwQty" value="${occ ? esc(row.qty) : ''}" ${isPartner ? 'disabled' : ''} placeholder="수량"></div>
    ${isPartner ? '<p class="card-sub">이 로케이션은 2PLT 상품의 짝 위치로 점유되어 있습니다. 원래 로케이션에서 수정하세요.</p>' : ''}
    <div class="drawer-actions">
      <button class="btn primary" id="dwSave" ${isPartner ? 'disabled' : ''}>저장</button>
      <button class="btn danger" id="dwClear" ${isPartner ? 'disabled' : ''}>비우기</button>
      <button class="btn ghost" id="dwCancel">닫기</button>
    </div>
  `;
  backdrop.classList.add('open');

  document.getElementById('dwCancel').onclick = closeDrawer;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeDrawer(); };
  document.getElementById('dwSave').onclick = () => {
    const bc = document.getElementById('dwBarcode').value.trim();
    const qty = document.getElementById('dwQty').value.trim();
    const product = findProduct(bc);
    if (bc && product && product.is2plt) {
      const partnerLoc = partnerLocOf(row.loc);
      const partner = state.locations.find(l => l.loc === partnerLoc);
      row.barcode = bc; row.qty = qty;
      if (partner) { partner.barcode = bc; partner.qty = '2PLT(점유)'; }
    } else {
      row.barcode = bc; row.qty = qty;
    }
    markDirty();
    closeDrawer(); renderLocations(); renderDashboard();
    toast('로케이션이 저장되었습니다.');
  };
  document.getElementById('dwClear').onclick = () => {
    row.barcode = ''; row.qty = '';
    markDirty();
    closeDrawer(); renderLocations(); renderDashboard();
    toast('로케이션을 비웠습니다.');
  };
}

function closeDrawer() {
  document.getElementById('drawerBackdrop').classList.remove('open');
}

// 할당기록(로그) 한 건의 로케이션을 정정한다. 자동할당이 제안한 자리에 현장에서
// 실제로는 다른 물건이 이미 있어서 다른 자리에 적치한 경우처럼, 기록만 바로잡아야 할 때 사용.
function openLogLocEditor(id) {
  const entry = state.log.find(l => l.id === id);
  if (!entry) return;
  const backdrop = document.getElementById('drawerBackdrop');
  const body = document.getElementById('drawerBody');
  body.innerHTML = `
    <h3>로케이션 정정</h3>
    <p class="card-sub">바코드 ${esc(entry.barcode)} · 수량 ${esc(entry.qty)}<br>제안된 로케이션에 현장에서 이미 다른 물건이 있는 등, 실제로 다른 자리에 적치했을 때 여기서 기록을 정정하세요.</p>
    <div class="field"><label>새 로케이션</label><input type="text" id="dwLogLoc" value="${esc(entry.loc)}" placeholder="예: 1B-01-02"></div>
    <div class="drawer-actions">
      <button class="btn primary" id="dwLogLocSave">저장</button>
      <button class="btn ghost" id="dwCancel">취소</button>
    </div>
  `;
  backdrop.classList.add('open');
  document.getElementById('dwCancel').onclick = closeDrawer;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeDrawer(); };
  const input = document.getElementById('dwLogLoc');
  input.focus(); input.select();
  document.getElementById('dwLogLocSave').onclick = () => {
    const newLoc = input.value.trim();
    if (!newLoc) { toast('로케이션을 입력해주세요.', true); return; }
    entry.loc = newLoc;
    markDirty();
    closeDrawer(); renderLog(); renderDashboard();
    toast('로케이션이 정정되었습니다.');
  };
}

function openTextDrawer(title, description, placeholder, onSubmit, submitLabel) {
  const backdrop = document.getElementById('drawerBackdrop');
  const body = document.getElementById('drawerBody');
  body.innerHTML = `
    <h3>${esc(title)}</h3>
    <p class="card-sub">${description}</p>
    <div class="field"><textarea id="dwText" rows="14" placeholder="${esc(placeholder)}"></textarea></div>
    <div class="drawer-actions">
      <button class="btn primary" id="dwSubmit">${esc(submitLabel || '적용')}</button>
      <button class="btn ghost" id="dwCancel">취소</button>
    </div>
  `;
  backdrop.classList.add('open');
  document.getElementById('dwCancel').onclick = closeDrawer;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeDrawer(); };
  document.getElementById('dwSubmit').onclick = () => {
    const text = document.getElementById('dwText').value;
    onSubmit(text);
  };
}

/* =========================================================
   CBM 요약 (참고 대시보드 재구성)
   층별 고정 총 용량(CBM_FLOORS) × 실제 사용 Loc(state.cbmHistory)으로
   전체/사용/잔여 CBM·파레트를 계산해 개요/층별/추이 탭에 표시한다.
   과거 이력은 구글시트 "이력" 탭 + 노션 "잔여 및 사용 1~3층 CBM" DB를
   기준으로 미리 채워져 있고, 하단 "기록 추가" 폼으로 새 날짜를 계속 쌓을 수 있다.
   ========================================================= */
function cbmFmt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}
function cbmPct(used, total) { return total ? (used / total * 100) : 0; }
function cbmDateLabel(dateStr) { const [, m, d] = dateStr.split('-'); return `${m}/${d}`; }

function cbmHistoryForFloor(floor) {
  return state.cbmHistory.filter(r => r.floor === floor).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}
function cbmLatestSnapshot(floor) {
  const rows = cbmHistoryForFloor(floor).filter(r => r.usedLoc !== null && r.usedLoc !== undefined);
  return rows.length ? rows[rows.length - 1] : null;
}
function cbmDerive(row) {
  const totalLoc = row.totalLoc;
  const usedLoc = (row.usedLoc === null || row.usedLoc === undefined) ? null : Number(row.usedLoc);
  const totalCbm = totalLoc * CBM_PER_LOC;
  const usedCbm = usedLoc === null ? null : usedLoc * CBM_PER_LOC;
  const remainLoc = usedLoc === null ? null : totalLoc - usedLoc;
  const remainCbm = usedCbm === null ? null : totalCbm - usedCbm;
  return {
    totalLoc, usedLoc, totalCbm, usedCbm, remainLoc, remainCbm,
    storageRate: usedLoc === null ? null : cbmPct(usedLoc, totalLoc),
    remainRate: remainLoc === null ? null : cbmPct(remainLoc, totalLoc)
  };
}
function cbmSnapshotOrEmpty(floor) {
  return cbmLatestSnapshot(floor) || { totalLoc: CBM_FLOORS[floor].totalLoc, usedLoc: null };
}

/* ---- 간단한 인라인 SVG 차트 (라인 / 도넛 / 막대) ---- */
function cbmSvgLine(containerId, dataset, series) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const w = 640, h = 200, padL = 52, padR = 10, padT = 10, padB = 24;
  const n = dataset.length;
  if (n === 0) { el.innerHTML = '<div class="empty-state">데이터가 없습니다.</div>'; return; }
  const allVals = [];
  series.forEach(s => dataset.forEach(d => { if (d[s.key] !== null && d[s.key] !== undefined) allVals.push(d[s.key]); }));
  const maxV = allVals.length ? Math.max(...allVals) * 1.12 : 1;
  const x = i => padL + (w - padL - padR) * (n <= 1 ? 0 : i / (n - 1));
  const y = v => padT + (h - padT - padB) * (1 - v / (maxV || 1));
  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">`;
  for (let i = 0; i <= 4; i++) {
    const v = maxV * i / 4, yy = y(v);
    svg += `<line x1="${padL}" y1="${yy}" x2="${w - padR}" y2="${yy}" stroke="var(--grid)" stroke-width="1"/>`;
    svg += `<text x="${padL - 6}" y="${yy + 3}" text-anchor="end" font-size="9.5" fill="var(--text-muted)">${Math.round(v).toLocaleString()}</text>`;
  }
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  dataset.forEach((d, i) => {
    if (i % labelEvery === 0 || i === n - 1) {
      svg += `<text x="${x(i)}" y="${h - 6}" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">${esc(d.label)}</text>`;
    }
  });
  series.forEach(s => {
    let path = '';
    dataset.forEach((d, i) => { if (d[s.key] === null || d[s.key] === undefined) return; path += (path === '' ? 'M' : 'L') + x(i) + ',' + y(d[s.key]) + ' '; });
    svg += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    dataset.forEach((d, i) => {
      if (d[s.key] === null || d[s.key] === undefined) return;
      svg += `<circle cx="${x(i)}" cy="${y(d[s.key])}" r="2.6" fill="${s.color}"><title>${esc(d.label)} · ${esc(s.label)}: ${cbmFmt(d[s.key])}${s.unit || ''}</title></circle>`;
    });
  });
  svg += `</svg>`;
  let legend = `<div style="display:flex; gap:14px; flex-wrap:wrap; margin-top:6px;">`;
  series.forEach(s => { legend += `<span style="display:flex; align-items:center; gap:5px; font-size:11.5px; color:var(--text-secondary);"><span style="width:9px;height:9px;border-radius:2px;background:${s.color};display:inline-block;"></span>${esc(s.label)}</span>`; });
  legend += `</div>`;
  el.innerHTML = svg + legend;
}

function cbmSvgDonut(containerId, segments) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const total = segments.reduce((a, s) => a + (s.value || 0), 0);
  if (!total) { el.innerHTML = '<div class="empty-state">데이터가 없습니다.</div>'; return; }
  const r = 62, cx = 74, cy = 74, sw = 20;
  const polar = (deg) => { const rad = deg * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; };
  let angle = -90, svg = `<svg viewBox="0 0 148 148" style="width:148px; height:148px;">`;
  segments.forEach(seg => {
    const frac = (seg.value || 0) / total;
    const a0 = angle, a1 = angle + frac * 360;
    angle = a1;
    if (frac <= 0) return;
    const large = (a1 - a0) > 180 ? 1 : 0;
    const p0 = polar(a0), p1 = polar(a1);
    svg += `<path d="M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}" stroke="${seg.color}" stroke-width="${sw}" fill="none"><title>${esc(seg.label)}: ${cbmFmt(seg.value)}</title></path>`;
  });
  svg += `</svg>`;
  el.innerHTML = svg;
}

function cbmSvgBar(containerId, dataset, key) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (dataset.every(d => d[key] === null || d[key] === undefined)) { el.innerHTML = '<div class="empty-state">데이터가 없습니다.</div>'; return; }
  const w = 640, h = 200, padL = 40, padR = 10, padT = 10, padB = 24;
  const n = dataset.length;
  const maxV = 40;
  const bw = (w - padL - padR) / n * 0.6;
  const gap = (w - padL - padR) / n;
  const y = v => padT + (h - padT - padB) * (1 - v / maxV);
  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">`;
  for (let i = 0; i <= 4; i++) {
    const v = maxV * i / 4, yy = y(v);
    svg += `<line x1="${padL}" y1="${yy}" x2="${w - padR}" y2="${yy}" stroke="var(--grid)" stroke-width="1"/>`;
    svg += `<text x="${padL - 6}" y="${yy + 3}" text-anchor="end" font-size="9.5" fill="var(--text-muted)">${Math.round(v)}%</text>`;
  }
  dataset.forEach((d, i) => {
    const cx = padL + gap * i + gap / 2;
    svg += `<text x="${cx}" y="${h - 6}" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">${esc(d.label)}</text>`;
    if (d[key] === null || d[key] === undefined) return;
    const v = d[key];
    const barH = (h - padT - padB) * (v / maxV);
    const color = v < 15 ? 'var(--critical)' : (v < 25 ? 'var(--warning)' : 'var(--series-1)');
    svg += `<rect x="${cx - bw / 2}" y="${h - padB - barH}" width="${bw}" height="${Math.max(barH, 0)}" rx="4" fill="${color}"><title>${esc(d.label)}: ${v.toFixed(2)}%</title></rect>`;
    svg += `<text x="${cx}" y="${h - padB - barH - 6}" text-anchor="middle" font-size="9.5" fill="var(--text-secondary)" font-weight="700">${v.toFixed(1)}%</text>`;
  });
  svg += `</svg>`;
  el.innerHTML = svg;
}

/* ---- CBM 요약 탭 렌더링 ---- */
function renderCbmTab() {
  if (!document.getElementById('panel-cbm')) return;
  document.querySelectorAll('#panel-cbm .cbm-subtab-btn').forEach(b => b.classList.toggle('active', b.dataset.cbmtab === state.ui.cbmSubTab));
  document.querySelectorAll('#panel-cbm .cbm-subpanel').forEach(p => p.classList.toggle('active', p.id === 'cbmsub-' + state.ui.cbmSubTab));

  renderCbmKpis();
  if (state.ui.cbmSubTab === 'overview') renderCbmOverview();
  else if (state.ui.cbmSubTab === 'floor1') renderCbmFloor(1);
  else if (state.ui.cbmSubTab === 'floor2') renderCbmFloor(2);
  else if (state.ui.cbmSubTab === 'floor3') renderCbmFloor(3);
  else if (state.ui.cbmSubTab === 'trend') renderCbmTrend();
  renderCbmEntryForm();
}

function renderCbmKpis() {
  const snaps = [1, 2, 3].map(f => cbmDerive(cbmSnapshotOrEmpty(f)));
  const gTotalCbm = snaps.reduce((a, s) => a + s.totalCbm, 0);
  const gTotalLoc = snaps.reduce((a, s) => a + s.totalLoc, 0);
  const gUsedCbm = snaps.reduce((a, s) => a + (s.usedCbm || 0), 0);
  const gUsedLoc = snaps.reduce((a, s) => a + (s.usedLoc || 0), 0);
  const gRemainCbm = gTotalCbm - gUsedCbm;
  const gRemainLoc = gTotalLoc - gUsedLoc;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
  set('cbmKpiTotal', cbmFmt(gTotalCbm));
  set('cbmKpiTotalLoc', gTotalLoc.toLocaleString());
  set('cbmKpiUsed', cbmFmt(gUsedCbm));
  set('cbmKpiUsedSub', `파레트 ${gUsedLoc.toLocaleString()}개 · 보관율 ${cbmPct(gUsedCbm, gTotalCbm).toFixed(1)}%`);
  set('cbmKpiRemain', cbmFmt(gRemainCbm));
  set('cbmKpiRemainSub', `파레트 ${gRemainLoc.toLocaleString()}개 · 잔여율 ${cbmPct(gRemainCbm, gTotalCbm).toFixed(1)}%`);
  const f3 = snaps[2];
  set('cbmKpi3f', cbmFmt(f3.usedCbm));
  set('cbmKpi3fSub', f3.usedLoc !== null ? `${f3.usedLoc.toLocaleString()}/${f3.totalLoc.toLocaleString()} 파레트` : '기록 없음');
}

function renderCbmOverview() {
  const h1 = cbmHistoryForFloor(1), h2 = cbmHistoryForFloor(2);
  const dateSet = Array.from(new Set([...h1.map(r => r.date), ...h2.map(r => r.date)])).sort();
  const map1 = new Map(h1.map(r => [r.date, r])), map2 = new Map(h2.map(r => [r.date, r]));
  const merged = dateSet.map(date => {
    const r1 = map1.get(date), r2 = map2.get(date);
    return {
      label: cbmDateLabel(date),
      f1used: r1 ? cbmDerive(r1).usedCbm : null,
      f2used: r2 ? cbmDerive(r2).usedCbm : null
    };
  });
  cbmSvgLine('cbmOverviewLine', merged, [
    { key: 'f1used', color: 'var(--series-1)', label: '1층 사용중 CBM' },
    { key: 'f2used', color: 'var(--series-2)', label: '2층 사용중 CBM' }
  ]);

  const snaps = [1, 2, 3].map(f => cbmDerive(cbmSnapshotOrEmpty(f)));
  cbmSvgDonut('cbmFloorDonut', [
    { value: snaps[0].usedCbm || 0, color: 'var(--series-1)', label: '1층' },
    { value: snaps[1].usedCbm || 0, color: 'var(--series-2)', label: '2층' },
    { value: snaps[2].usedCbm || 0, color: 'var(--series-3)', label: '3층' }
  ]);
  const gUsed = snaps.reduce((a, s) => a + (s.usedCbm || 0), 0);
  const donutTotal = document.getElementById('cbmDonutTotal');
  if (donutTotal) donutTotal.textContent = cbmFmt(gUsed);
  const legend = document.getElementById('cbmFloorLegend');
  if (legend) {
    const colors = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
    legend.innerHTML = snaps.map((s, i) => `
      <div style="display:flex; align-items:center; gap:8px; font-size:12.5px; padding:3px 0;">
        <span style="width:10px;height:10px;border-radius:3px;background:${colors[i]};display:inline-block;"></span>
        <span style="flex:1;">${i + 1}층</span>
        <span class="mono muted">${cbmFmt(s.usedCbm)}</span>
        <span class="mono" style="font-weight:700; width:48px; text-align:right;">${gUsed ? ((s.usedCbm || 0) / gUsed * 100).toFixed(1) : '0.0'}%</span>
      </div>`).join('');
  }

  const snapshotBody = document.getElementById('cbmSnapshotBody');
  if (snapshotBody) {
    const gTotal = snaps.reduce((a, s) => a + s.totalCbm, 0);
    const gTotalLoc = snaps.reduce((a, s) => a + s.totalLoc, 0);
    const gUsedLoc = snaps.reduce((a, s) => a + (s.usedLoc || 0), 0);
    const gRemainLoc = gTotalLoc - gUsedLoc;
    snapshotBody.innerHTML = snaps.map((s, i) => `
      <tr><td>${i + 1}층</td><td class="right mono">${cbmFmt(s.totalCbm)}</td><td class="right mono">${cbmFmt(s.usedCbm)}</td><td class="right mono">${cbmFmt(s.remainCbm)}</td>
      <td class="right mono">${s.storageRate !== null ? s.storageRate.toFixed(1) + '%' : '-'}</td>
      <td class="right mono">${s.totalLoc.toLocaleString()}</td><td class="right mono">${s.usedLoc !== null ? s.usedLoc.toLocaleString() : '-'}</td><td class="right mono">${s.remainLoc !== null ? s.remainLoc.toLocaleString() : '-'}</td></tr>
    `).join('') + `
      <tr style="background:var(--surface-1); font-weight:700;"><td>★ 1~3층 합계</td><td class="right mono">${cbmFmt(gTotal)}</td><td class="right mono">${cbmFmt(gUsed)}</td><td class="right mono">${cbmFmt(gTotal - gUsed)}</td>
      <td class="right mono">${cbmPct(gUsed, gTotal).toFixed(1)}%</td><td class="right mono">${gTotalLoc.toLocaleString()}</td>
      <td class="right mono">${gUsedLoc.toLocaleString()}</td><td class="right mono">${gRemainLoc.toLocaleString()}</td></tr>
    `;
  }
}

function renderCbmFloor(floor) {
  const hist = cbmHistoryForFloor(floor);
  const dataset = hist.map(r => {
    const d = cbmDerive(r);
    return { label: cbmDateLabel(r.date), total: d.totalCbm, used: d.usedCbm, remain: d.remainCbm, pAvail: d.totalLoc, pUsed: d.usedLoc, pRemain: d.remainLoc };
  });
  cbmSvgLine(`cbmFloor${floor}Line`, dataset, [
    { key: 'total', color: 'var(--baseline)', label: '전체 CBM' },
    { key: 'used', color: 'var(--series-1)', label: '사용중 CBM' },
    { key: 'remain', color: 'var(--series-4)', label: '잔여 CBM' }
  ]);
  cbmSvgLine(`cbmFloor${floor}PltLine`, dataset, [
    { key: 'pAvail', color: 'var(--baseline)', label: '가용 파레트', unit: '대' },
    { key: 'pUsed', color: 'var(--series-1)', label: '사용중 파레트', unit: '대' },
    { key: 'pRemain', color: 'var(--series-4)', label: '잔여 파레트', unit: '대' }
  ]);
  const body = document.getElementById(`cbmFloor${floor}Body`);
  if (body) {
    body.innerHTML = hist.slice().reverse().map(r => {
      const d = cbmDerive(r);
      return `<tr><td>${esc(r.date)}</td><td class="right mono">${cbmFmt(d.totalCbm)}</td><td class="right mono">${cbmFmt(d.usedCbm)}</td><td class="right mono">${cbmFmt(d.remainCbm)}</td>
        <td class="right mono">${d.storageRate !== null ? d.storageRate.toFixed(1) + '%' : '-'}</td>
        <td class="right mono">${d.totalLoc.toLocaleString()}</td><td class="right mono">${d.usedLoc !== null ? d.usedLoc.toLocaleString() : '-'}</td><td class="right mono">${d.remainLoc !== null ? d.remainLoc.toLocaleString() : '-'}</td></tr>`;
    }).join('') || `<tr><td colspan="8" class="empty-state">등록된 이력이 없습니다. 아래 "기록 추가"에서 새 날짜를 입력해보세요.</td></tr>`;
  }
  const statsWrap = document.getElementById(`cbmFloor${floor}Stats`);
  if (statsWrap) {
    const latest = cbmLatestSnapshot(floor);
    if (!latest) { statsWrap.innerHTML = `<div class="empty-state">등록된 이력이 없습니다.</div>`; }
    else {
      const d = cbmDerive(latest);
      statsWrap.innerHTML = `
        <div class="kpi"><div class="lbl">최신 사용률 (${esc(latest.date)})</div><div class="val" style="font-size:17px;">${d.storageRate.toFixed(1)}<small>%</small></div></div>
        <div class="kpi"><div class="lbl">최신 사용중 CBM</div><div class="val" style="font-size:17px;">${cbmFmt(d.usedCbm)}</div></div>
        <div class="kpi"><div class="lbl">최신 잔여 CBM</div><div class="val" style="font-size:17px;">${cbmFmt(d.remainCbm)}</div></div>
        <div class="kpi"><div class="lbl">최신 잔여 파레트</div><div class="val" style="font-size:17px;">${d.remainLoc.toLocaleString()}<small>대</small></div></div>
      `;
    }
  }
}

function renderCbmTrend() {
  const monthly = CBM_TREND_SEED.map(m => {
    const vals = m.w.filter(v => v !== null);
    return { label: m.m, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
  });
  cbmSvgBar('cbmTrendBar', monthly, 'avg');
  const body = document.getElementById('cbmTrendBody');
  if (body) {
    body.innerHTML = CBM_TREND_SEED.map(row => {
      const vals = row.w.filter(v => v !== null);
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return `<tr><td>${esc(row.m)}</td>${row.w.map(v => `<td class="right mono">${v === null ? '-' : v.toFixed(2) + '%'}</td>`).join('')}<td class="right mono" style="font-weight:700;">${avg === null ? '-' : avg.toFixed(2) + '%'}</td></tr>`;
    }).join('');
  }
}

/* ---- CBM 기록 추가 폼 ---- */
function renderCbmEntryForm() {
  const dateInput = document.getElementById('cbmEntryDate');
  if (!dateInput) return;
  if (!dateInput.value) {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    dateInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  [1, 2, 3].forEach(f => {
    const input = document.getElementById(`cbmEntryUsed${f}`);
    if (input) {
      const latest = cbmLatestSnapshot(f);
      input.placeholder = latest ? `예: ${latest.usedLoc} (최대 ${CBM_FLOORS[f].totalLoc})` : `최대 ${CBM_FLOORS[f].totalLoc}`;
    }
  });
  renderCbmRecentEntries();
}

function renderCbmRecentEntries() {
  const wrap = document.getElementById('cbmRecentList');
  if (!wrap) return;
  const dates = Array.from(new Set(state.cbmHistory.map(r => r.date))).sort().reverse().slice(0, 8);
  if (!dates.length) { wrap.innerHTML = '<div class="empty-state">등록된 기록이 없습니다.</div>'; return; }
  wrap.innerHTML = dates.map(date => {
    const parts = [1, 2, 3].map(f => {
      const r = state.cbmHistory.find(x => x.date === date && x.floor === f);
      return (r && r.usedLoc !== null && r.usedLoc !== undefined) ? `${f}층 ${r.usedLoc.toLocaleString()}` : null;
    }).filter(Boolean).join(' · ');
    return `<div class="scan-feed-row"><span class="t mono">${esc(date)}</span><span class="b">${parts || '-'}</span><button class="btn ghost sm cbm-entry-del" data-date="${esc(date)}">삭제</button></div>`;
  }).join('');
}

/* =========================================================
   이벤트 바인딩
   ========================================================= */
function bindGlobalEvents() {
  // tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
      state.ui.tab = btn.dataset.tab;
    });
  });

  document.getElementById('btnGoSettings').addEventListener('click', () => {
    document.querySelector('.tab-btn[data-tab="settings"]').click();
  });

  document.getElementById('dashFloorFilter').addEventListener('change', renderDashboard);

  // theme toggle
  document.getElementById('btnTheme').addEventListener('click', () => {
    const html = document.documentElement;
    const cur = html.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    state.ui.theme = next;
  });

  /* ---- products ---- */
  document.getElementById('prodSearch').addEventListener('input', e => { state.ui.prodSearch = e.target.value; state.ui.prodPage = 1; renderProducts(); });
  document.getElementById('prodGradeFilter').addEventListener('change', e => { state.ui.prodGrade = e.target.value; state.ui.prodPage = 1; renderProducts(); });

  document.getElementById('productsBody').addEventListener('change', e => {
    const tr = e.target.closest('tr[data-barcode]');
    if (!tr) return;
    const p = findProduct(tr.dataset.barcode);
    if (!p) return;
    if (e.target.classList.contains('pf-grade')) p.grade = e.target.value;
    if (e.target.classList.contains('pf-plt')) p.pltQty = Math.max(1, Number(e.target.value) || 1);
    if (e.target.classList.contains('pf-2plt')) p.is2plt = e.target.checked;
    markDirty();
    renderDashboard();
  });
  document.getElementById('productsBody').addEventListener('click', e => {
    if (e.target.classList.contains('pf-del')) {
      const tr = e.target.closest('tr[data-barcode]');
      state.products = state.products.filter(p => p.barcode !== tr.dataset.barcode);
      markDirty(); renderProducts(); renderDashboard();
      toast('상품을 삭제했습니다.');
    }
  });

  document.getElementById('btnProdAdd').addEventListener('click', () => {
    const backdrop = document.getElementById('drawerBackdrop');
    const body = document.getElementById('drawerBody');
    body.innerHTML = `
      <h3>상품 추가</h3>
      <div class="field"><label>바코드</label><input type="text" id="npBarcode"></div>
      <div class="field"><label>상품명</label><input type="text" id="npName"></div>
      <div class="field"><label>등급</label>
        <select id="npGrade"><option value="A">A</option><option value="B">B</option><option value="C" selected>C</option></select>
      </div>
      <div class="field"><label>PLT당수량</label><input type="number" id="npPlt" value="1" min="1"></div>
      <div class="field"><label><input type="checkbox" id="npIs2plt"> 2PLT 상품 (파레트 2칸 점유)</label></div>
      <div class="drawer-actions">
        <button class="btn primary" id="npSave">추가</button>
        <button class="btn ghost" id="dwCancel">취소</button>
      </div>`;
    backdrop.classList.add('open');
    document.getElementById('dwCancel').onclick = closeDrawer;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeDrawer(); };
    document.getElementById('npSave').onclick = () => {
      const barcode = document.getElementById('npBarcode').value.trim();
      if (!barcode) { toast('바코드를 입력하세요.', true); return; }
      if (findProduct(barcode)) { toast('이미 존재하는 바코드입니다.', true); return; }
      state.products.push({
        barcode, name: document.getElementById('npName').value.trim() || barcode,
        grade: document.getElementById('npGrade').value,
        pltQty: Math.max(1, Number(document.getElementById('npPlt').value) || 1),
        is2plt: document.getElementById('npIs2plt').checked
      });
      markDirty(); closeDrawer(); renderProducts(); renderDashboard();
      toast('상품을 추가했습니다.');
    };
  });

  document.getElementById('btnProdImport').addEventListener('click', () => {
    openTextDrawer('상품마스터 CSV 가져오기',
      '구글시트에서 <b>바코드, 상품명, 등급(A/B/C), PLT당수량, 2PLT여부(TRUE/FALSE)</b> 열을 복사해 붙여넣으세요. 탭 또는 쉼표로 구분된 값을 인식합니다. 기존 바코드는 값이 갱신되고, 없는 바코드는 새로 추가됩니다.',
      '8800000000001\t상품명 예시\tA\t120\tFALSE',
      (text) => {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        let added = 0, updated = 0;
        lines.forEach(line => {
          const cells = csvSplit(line);
          if (cells.length < 1 || !cells[0]) return;
          const barcode = cells[0];
          if (barcode === '바코드' || barcode === '품번') return; // skip header row
          const name = cells[1] || barcode;
          let grade = (cells[2] || 'C').toUpperCase();
          if (!['A', 'B', 'C'].includes(grade)) grade = 'C';
          const pltQty = Math.max(1, Number(cells[3]) || 1);
          const is2plt = /^(true|1|예|y)$/i.test(cells[4] || '');
          const existing = findProduct(barcode);
          if (existing) {
            existing.name = name; existing.grade = grade; existing.pltQty = pltQty; existing.is2plt = is2plt;
            updated++;
          } else {
            state.products.push({ barcode, name, grade, pltQty, is2plt });
            added++;
          }
        });
        markDirty(); closeDrawer(); renderProducts(); renderDashboard();
        toast(`가져오기 완료: 추가 ${added}건, 갱신 ${updated}건`);
      }, '가져오기');
  });

  document.getElementById('btnProdExport').addEventListener('click', () => {
    const header = csvRow(['바코드', '상품명', '등급', 'PLT당수량', '2PLT여부']) + '\n';
    const rows = state.products.map(p => csvRow([p.barcode, p.name, p.grade, p.pltQty, p.is2plt ? 'TRUE' : 'FALSE'])).join('\n');
    downloadFile('상품마스터.csv', header + rows, 'text/csv');
  });

  document.getElementById('productsBody').parentElement.parentElement.addEventListener('click', e => {
    if (e.target.classList.contains('pg-prev') && e.target.dataset.key === 'prod') { state.ui.prodPage--; renderProducts(); }
    if (e.target.classList.contains('pg-next') && e.target.dataset.key === 'prod') { state.ui.prodPage++; renderProducts(); }
  });

  /* ---- locations ---- */
  document.getElementById('locSearch').addEventListener('input', e => { state.ui.locSearch = e.target.value; state.ui.locPage = 1; renderLocations(); });
  document.getElementById('locFloorFilter').addEventListener('change', e => { state.ui.locFloor = e.target.value; state.ui.locZone = ''; state.ui.locPage = 1; renderLocations(); });
  document.getElementById('locZoneFilter').addEventListener('change', e => { state.ui.locZone = e.target.value; state.ui.locPage = 1; renderLocations(); });
  document.getElementById('locStatusFilter').addEventListener('change', e => { state.ui.locStatus = e.target.value; state.ui.locPage = 1; renderLocations(); });

  document.getElementById('locationsBody').addEventListener('click', e => {
    const tr = e.target.closest('tr.loc-row');
    if (tr) openLocationDrawer(tr.dataset.loc);
  });

  document.getElementById('locPager').parentElement.addEventListener('click', e => {
    if (e.target.classList.contains('pg-prev') && e.target.dataset.key === 'loc') { state.ui.locPage--; renderLocations(); }
    if (e.target.classList.contains('pg-next') && e.target.dataset.key === 'loc') { state.ui.locPage++; renderLocations(); }
  });

  document.getElementById('btnLocGenerate').addEventListener('click', () => {
    const backdrop = document.getElementById('drawerBackdrop');
    const body = document.getElementById('drawerBody');
    body.innerHTML = `
      <h3>로케이션 일괄생성</h3>
      <p class="card-sub">예: 층 1, 구역 A,B,C, 베이 1~13, 단 1~4, 포지션 2개 → 1A-01-01-01 ~ 1C-13-04-02 형태로 생성됩니다. 이미 존재하는 로케이션은 건너뜁니다.</p>
      <div class="field"><label>층 번호</label><input type="text" id="genFloor" value="1"></div>
      <div class="field"><label>구역 (쉼표 구분, 예: A,B,C)</label><input type="text" id="genZones" value="A,B,C"></div>
      <div class="field"><label>베이 범위</label>
        <div style="display:flex; gap:8px;"><input type="number" id="genBayFrom" value="1" min="1"><input type="number" id="genBayTo" value="13" min="1"></div>
      </div>
      <div class="field"><label>단(층) 범위</label>
        <div style="display:flex; gap:8px;"><input type="number" id="genTierFrom" value="1" min="1"><input type="number" id="genTierTo" value="4" min="1"></div>
      </div>
      <div class="field"><label>포지션 수 (베이당)</label><input type="number" id="genPos" value="2" min="1"></div>
      <div class="drawer-actions">
        <button class="btn primary" id="genSubmit">생성</button>
        <button class="btn ghost" id="dwCancel">취소</button>
      </div>`;
    backdrop.classList.add('open');
    document.getElementById('dwCancel').onclick = closeDrawer;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeDrawer(); };
    document.getElementById('genSubmit').onclick = () => {
      const floor = document.getElementById('genFloor').value.trim() || '1';
      const zones = document.getElementById('genZones').value.split(',').map(z => z.trim()).filter(Boolean);
      const bayFrom = Number(document.getElementById('genBayFrom').value) || 1;
      const bayTo = Number(document.getElementById('genBayTo').value) || 1;
      const tierFrom = Number(document.getElementById('genTierFrom').value) || 1;
      const tierTo = Number(document.getElementById('genTierTo').value) || 1;
      const posCount = Number(document.getElementById('genPos').value) || 1;
      const existing = new Set(state.locations.map(l => l.loc));
      let created = 0;
      zones.forEach(z => {
        const zonePrefix = `${floor}${z}`;
        for (let bay = bayFrom; bay <= bayTo; bay++) {
          for (let tier = tierFrom; tier <= tierTo; tier++) {
            for (let pos = 1; pos <= posCount; pos++) {
              const loc = makeLoc(zonePrefix, bay, tier, pos);
              if (existing.has(loc)) continue;
              state.locations.push({ loc, zone: loc.slice(0, 3), tier: loc.split('-')[2], barcode: '', qty: '' });
              existing.add(loc);
              created++;
            }
          }
        }
      });
      markDirty(); closeDrawer(); renderLocations(); renderDashboard();
      toast(`로케이션 ${created}개를 생성했습니다.`);
    };
  });

  document.getElementById('btnLocSyncPaste').addEventListener('click', () => {
    openTextDrawer('붙여넣기로 실재고 동기화',
      'WMS에서 뽑은 실재고 목록을 <b>바코드, 수량, 로케이션</b> 순서로 붙여넣으세요. 적용하면 현재 재고 로케이션 상태 전체가 이 목록으로 교체됩니다. 목록에 없는 로케이션·상품은 자동으로 추가됩니다.',
      '8800000000001\t10\t1A-01-01-01',
      (text) => {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const rows = [];
        lines.forEach(line => {
          const cells = csvSplit(line);
          if (cells.length < 3) return;
          if (cells[0] === '바코드' || cells[0] === '품번') return;
          rows.push({ barcode: cells[0], qty: cells[1], loc: cells[2] });
        });
        if (!confirm(`현재 재고 로케이션 상태를 전부 지우고 ${rows.length}건으로 교체합니다. 계속할까요?`)) return;
        const result = syncPhysicalStock(rows, { autoCreate: true });
        markDirty(); closeDrawer(); renderLocations(); renderDashboard(); renderProducts();
        toast(`실재고 동기화 완료: 반영 ${result.applied}건, 신규 로케이션 ${result.createdLocs}건, 신규 상품 ${result.createdProducts}건`);
      }, '동기화 적용');
  });

  document.getElementById('btnLocExcelUpload').addEventListener('click', () => {
    if (typeof XLSX === 'undefined') {
      toast('엑셀 처리 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해주세요.', true);
      return;
    }
    document.getElementById('locExcelFile').click();
  });
  document.getElementById('locExcelFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleWmsExcelFile(file);
    e.target.value = '';
  });

  document.getElementById('btnLocExport').addEventListener('click', () => {
    const header = csvRow(['로케이션', '구역', '단', '바코드', '상품명', '수량']) + '\n';
    const rows = [...state.locations].sort((a, b) => naturalCompare(a.loc, b.loc))
      .map(l => csvRow([l.loc, l.zone, l.tier, l.barcode, l.barcode ? productLabel(l.barcode) : '', l.qty])).join('\n');
    downloadFile('재고로케이션.csv', header + rows, 'text/csv');
  });

  /* ---- inbound ---- */
  document.getElementById('btnQueueAdd').addEventListener('click', () => { addQueueRow(); renderQueue(); });
  document.getElementById('btnQueueClear').addEventListener('click', () => { state.queue = []; addQueueRow(); renderQueue(); });

  document.getElementById('btnQueuePaste').addEventListener('click', () => {
    openTextDrawer('여러 행 붙여넣기',
      '<b>바코드, 수량, 우선순위구역(선택)</b> 순서로 한 줄에 한 건씩 붙여넣으세요.',
      '8800000000001\t10\t1B-,1C-',
      (text) => {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        let added = 0;
        lines.forEach(line => {
          const cells = csvSplit(line);
          if (!cells[0]) return;
          if (cells[0] === '바코드') return;
          state.queue.push({ id: uid(), barcode: cells[0], qty: cells[1] || '', zone: cells[2] || '' });
          added++;
        });
        state.queue = state.queue.filter(r => r.barcode || r.qty);
        if (state.queue.length === 0) addQueueRow();
        closeDrawer(); renderQueue();
        toast(`${added}건을 추가했습니다.`);
      }, '추가');
  });

  document.getElementById('inboundQueue').addEventListener('input', e => {
    const rowEl = e.target.closest('.queue-row');
    if (!rowEl) return;
    const row = state.queue.find(r => r.id === rowEl.dataset.id);
    if (!row) return;
    if (e.target.classList.contains('q-barcode')) row.barcode = e.target.value.trim();
    if (e.target.classList.contains('q-qty')) row.qty = e.target.value;
    if (e.target.classList.contains('q-zone')) row.zone = e.target.value;
    if (e.target.classList.contains('q-barcode')) renderQueue(); // refresh product preview line
  });
  document.getElementById('inboundQueue').addEventListener('click', e => {
    if (e.target.classList.contains('q-del')) {
      const rowEl = e.target.closest('.queue-row');
      state.queue = state.queue.filter(r => r.id !== rowEl.dataset.id);
      if (state.queue.length === 0) addQueueRow();
      renderQueue();
    }
  });

  document.getElementById('batchSelect').addEventListener('change', e => {
    state.ui.selectedBatch = e.target.value;
  });

  document.getElementById('btnRunAllocation').addEventListener('click', () => {
    const items = state.queue.filter(r => r.barcode && Number(r.qty) > 0);
    if (items.length === 0) { toast('바코드와 수량을 입력하세요.', true); return; }
    const batchLabel = state.ui.selectedBatch || '';
    const results = items.map(r => runAllocationForItem(r.barcode, Number(r.qty), r.zone, batchLabel));
    state.executionHistory.unshift({ id: uid(), ts: Date.now(), batch: batchLabel, results });
    state.executionHistory = state.executionHistory.slice(0, 50);
    state.queue = []; addQueueRow(); addQueueRow();
    markDirty();
    // 방금 배치된 오늘 날짜로 일자별 기록 탐색기를 이동시켜, 실행 직후 바로 확인할 수 있게 한다.
    const todayParts = dateParts(Date.now());
    state.ui.historyYear = todayParts.y; state.ui.historyMonth = todayParts.m; state.ui.historyDay = todayParts.d;
    state.ui.historyBatch = '';
    renderQueue(); renderResults(); renderHistoryDayNav(); renderLocations(); renderDashboard(); renderLog();
    document.querySelector('.tab-btn[data-tab="history"]').click();
    const failCount = results.filter(r => r.remaining > 0).length;
    toast(failCount ? `할당 완료 (공간부족 ${failCount}건 포함)` : '할당이 완료되었습니다.', failCount > 0);
  });

  document.getElementById('btnResultsClear').addEventListener('click', () => {
    if (!confirm('이번 화면에 표시된 실행 결과 이력을 지울까요? (할당기록·검증 탭의 기록은 그대로 남습니다)')) return;
    state.executionHistory = [];
    renderResults();
    toast('실행 결과 이력을 지웠습니다.');
  });

  /* ---- 일자별 입고 기록 (엑셀 붙여넣기용) ---- */
  document.getElementById('historyYearSel').addEventListener('change', e => {
    state.ui.historyYear = e.target.value;
    state.ui.historyMonth = ''; state.ui.historyDay = '';
    renderHistoryDayNav();
  });
  document.getElementById('historyMonthSel').addEventListener('change', e => {
    state.ui.historyMonth = e.target.value;
    state.ui.historyDay = '';
    renderHistoryDayNav();
  });
  document.getElementById('historyDaySel').addEventListener('change', e => {
    state.ui.historyDay = e.target.value;
    state.ui.historyBatch = '';
    renderHistoryBatchNav();
  });
  document.getElementById('historyBatchSel').addEventListener('change', e => {
    state.ui.historyBatch = e.target.value;
    renderHistoryDayLog();
  });

  document.getElementById('btnDayCopy').addEventListener('click', () => {
    const rows = currentHistoryDayLogs();
    if (rows.length === 0) { toast('선택한 날짜에 복사할 입고 기록이 없습니다.', true); return; }
    const tsv = buildDayTsv();
    copyTextToClipboard(tsv).then(() => {
      toast(`${rows.length}건을 클립보드에 복사했습니다. 엑셀 파일에 Ctrl+V로 붙여넣으세요.`);
    }).catch(() => {
      toast('클립보드 복사에 실패했습니다. 표를 드래그해서 직접 복사해주세요.', true);
    });
  });

  document.getElementById('btnDayCsvExport').addEventListener('click', () => {
    const rows = currentHistoryDayLogs();
    if (rows.length === 0) { toast('선택한 날짜에 내보낼 입고 기록이 없습니다.', true); return; }
    const header = csvRow(['박스번호', '바코드', '정상수량', '불량수량', '정상로케이션', '불량로케이션']) + '\n';
    const body = rows.map(l => csvRow(['', l.barcode, l.qty, 0, l.loc, '00-00-00-00'])).join('\n');
    const pad = n => String(n).padStart(2, '0');
    const batchSuffix = state.ui.historyBatch === HISTORY_BATCH_NONE ? '_미지정'
      : state.ui.historyBatch ? `_${state.ui.historyBatch}` : '';
    const filename = `입고기록_${state.ui.historyYear}${pad(state.ui.historyMonth)}${pad(state.ui.historyDay)}${batchSuffix}.csv`;
    downloadFile(filename, header + body, 'text/csv');
  });

  /* ---- pda scan verify ---- */
  const scanLocInput = document.getElementById('scanLoc');
  const scanBarcodeInput = document.getElementById('scanBarcode');
  scanLocInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (scanLocInput.value.trim()) scanBarcodeInput.focus();
    }
  });
  scanBarcodeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (scanLocInput.value.trim() && scanBarcodeInput.value.trim()) {
        runPdaVerification(scanLocInput.value, scanBarcodeInput.value);
        scanLocInput.value = ''; scanBarcodeInput.value = '';
        scanLocInput.focus();
      }
    }
  });
  document.getElementById('btnScanClear').addEventListener('click', () => {
    scanLocInput.value = ''; scanBarcodeInput.value = '';
    scanLocInput.focus();
  });

  /* ---- log ---- */
  document.getElementById('logSearch').addEventListener('input', e => { state.ui.logSearch = e.target.value; state.ui.logPage = 1; renderLog(); });
  document.getElementById('logVerifyFilter').addEventListener('change', e => { state.ui.logVerify = e.target.value; state.ui.logPage = 1; renderLog(); });

  document.getElementById('logBody').addEventListener('click', e => {
    if (e.target.classList.contains('log-verify')) {
      const tr = e.target.closest('tr[data-id]');
      const entry = state.log.find(l => l.id === tr.dataset.id);
      if (!entry) return;
      entry.verified = entry.verified === null ? true : entry.verified === true ? false : null;
      markDirty(); renderLog(); renderDashboard();
    }
    if (e.target.classList.contains('log-loc-edit')) {
      openLogLocEditor(e.target.dataset.id);
    }
  });

  document.getElementById('logPager').parentElement.addEventListener('click', e => {
    if (e.target.classList.contains('pg-prev') && e.target.dataset.key === 'log') { state.ui.logPage--; renderLog(); }
    if (e.target.classList.contains('pg-next') && e.target.dataset.key === 'log') { state.ui.logPage++; renderLog(); }
  });

  document.getElementById('btnLogExport').addEventListener('click', () => {
    const header = csvRow(['할당일시', '바코드', '상품명', '수량', '로케이션', '2PLT', '합짐', '검증', '비고']) + '\n';
    const rows = [...state.log].sort((a, b) => b.ts - a.ts)
      .map(l => csvRow([fmtDate(l.ts), l.barcode, l.name || productLabel(l.barcode), l.qty, l.loc, l.is2plt ? 'Y' : '', l.merged ? 'Y' : '', l.verified === true ? 'TRUE' : l.verified === false ? 'FALSE' : '', l.note || ''])).join('\n');
    downloadFile('할당기록.csv', header + rows, 'text/csv');
  });

  document.getElementById('btnLogClear').addEventListener('click', () => {
    if (!confirm('할당기록을 전부 삭제할까요? 이 동작은 되돌릴 수 없습니다.')) return;
    state.log = []; markDirty(); renderLog(); renderDashboard(); renderHistoryDayNav();
    toast('할당기록을 삭제했습니다.');
  });

  /* ---- settings ---- */
  document.getElementById('btnSaveRules').addEventListener('click', () => {
    const parse = id => document.getElementById(id).value.split(',').map(s => s.trim()).filter(Boolean);
    state.rules.A = parse('ruleA');
    state.rules.B = parse('ruleB');
    state.rules.C = parse('ruleC');
    state.rules.exclude = parse('ruleExclude');
    markDirty();
    toast('규칙을 저장했습니다.');
  });

  document.getElementById('mergeEnabledToggle').addEventListener('change', e => {
    state.rules.mergeEnabled = e.target.checked;
    markDirty();
    toast(state.rules.mergeEnabled ? '까대기 자동 배치를 사용합니다.' : '까대기 자동 배치를 사용하지 않습니다.');
  });

  document.getElementById('btnNameRuleAdd').addEventListener('click', () => {
    state.nameRules.push({ id: uid(), mustAll: [], anyOf: [], zones: [] });
    renderNameRules();
  });
  document.getElementById('nameRulesList').addEventListener('click', e => {
    if (e.target.classList.contains('nr-del')) {
      const row = e.target.closest('.name-rule-row');
      state.nameRules = state.nameRules.filter(r => r.id !== row.dataset.id);
      markDirty();
      renderNameRules();
    }
  });
  document.getElementById('btnSaveNameRules').addEventListener('click', () => {
    const parseList = v => v.split(',').map(s => s.trim()).filter(Boolean);
    document.querySelectorAll('.name-rule-row').forEach(row => {
      const r = state.nameRules.find(x => x.id === row.dataset.id);
      if (!r) return;
      r.mustAll = parseList(row.querySelector('.nr-mustall').value);
      r.anyOf = parseList(row.querySelector('.nr-anyof').value);
      r.zones = parseList(row.querySelector('.nr-zones').value);
    });
    markDirty();
    toast('상품명 기반 고정구역 규칙을 저장했습니다.');
  });

  /* ---- 차수/업체명 프리셋 관리 ---- */
  document.getElementById('btnBatchPresetAdd').addEventListener('click', () => {
    const input = document.getElementById('batchPresetInput');
    const val = input.value.trim();
    if (!val) { toast('차수/업체명을 입력하세요.', true); return; }
    if (state.batchPresets.includes(val)) { toast('이미 등록된 항목입니다.', true); return; }
    state.batchPresets.push(val);
    input.value = '';
    markDirty();
    renderBatchPresets();
    toast(`"${val}"을(를) 추가했습니다.`);
  });
  document.getElementById('batchPresetInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnBatchPresetAdd').click(); }
  });
  document.getElementById('batchPresetList').addEventListener('click', e => {
    if (!e.target.classList.contains('preset-del')) return;
    const val = e.target.dataset.preset;
    state.batchPresets = state.batchPresets.filter(b => b !== val);
    if (state.ui.selectedBatch === val) state.ui.selectedBatch = '';
    markDirty();
    renderBatchPresets();
  });

  /* ---- CBM 요약 ---- */
  document.querySelectorAll('.cbm-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.ui.cbmSubTab = btn.dataset.cbmtab;
      renderCbmTab();
    });
  });
  [1, 2, 3].forEach(f => {
    const inp = document.getElementById(`cbmEntryUsed${f}`);
    if (inp) inp.addEventListener('input', e => { e.target.dataset.touched = '1'; });
  });
  document.getElementById('btnCbmSave').addEventListener('click', () => {
    const date = document.getElementById('cbmEntryDate').value;
    if (!date) { toast('날짜를 선택하세요.', true); return; }
    const entries = [1, 2, 3].map(f => {
      const raw = document.getElementById(`cbmEntryUsed${f}`).value.trim();
      return { floor: f, usedLoc: raw === '' ? null : Number(raw) };
    }).filter(e => e.usedLoc !== null);
    if (entries.length === 0) { toast('최소 한 개 층의 사용 Loc을 입력하세요.', true); return; }
    for (const e of entries) {
      if (!Number.isFinite(e.usedLoc) || e.usedLoc < 0 || e.usedLoc > CBM_FLOORS[e.floor].totalLoc) {
        toast(`${e.floor}층 사용 Loc 값이 올바르지 않습니다 (0~${CBM_FLOORS[e.floor].totalLoc}).`, true);
        return;
      }
    }
    entries.forEach(e => {
      state.cbmHistory = state.cbmHistory.filter(r => !(r.date === date && r.floor === e.floor));
      state.cbmHistory.push({ date, floor: e.floor, totalLoc: CBM_FLOORS[e.floor].totalLoc, usedLoc: e.usedLoc });
    });
    [1, 2, 3].forEach(f => { const inp = document.getElementById(`cbmEntryUsed${f}`); inp.value = ''; delete inp.dataset.touched; });
    markDirty();
    renderCbmTab();
    toast(`${date} 기록을 저장했습니다.`);
  });
  document.getElementById('cbmRecentList').addEventListener('click', e => {
    if (!e.target.classList.contains('cbm-entry-del')) return;
    const date = e.target.dataset.date;
    if (!confirm(`${date} 기록을 삭제할까요?`)) return;
    state.cbmHistory = state.cbmHistory.filter(r => r.date !== date);
    markDirty();
    renderCbmTab();
  });

  document.getElementById('btnBackupFull').addEventListener('click', doBackup);
  document.getElementById('btnBackupQuick').addEventListener('click', doBackup);

  document.getElementById('btnRestore').addEventListener('click', () => document.getElementById('restoreFile').click());
  document.getElementById('restoreFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.products || !data.locations) throw new Error('invalid');
        if (!confirm('현재 화면의 데이터를 백업 파일 내용으로 전부 교체합니다. 계속할까요?')) return;
        state.products = data.products;
        state.locations = data.locations;
        state.log = data.log || [];
        state.rules = data.rules || state.rules;
        state.nameRules = data.nameRules || state.nameRules;
        state.scanFeed = data.scanFeed || [];
        state.executionHistory = data.executionHistory || [];
        state.batchPresets = data.batchPresets || state.batchPresets;
        state.cbmHistory = data.cbmHistory || state.cbmHistory;
        state.changesSinceBackup = 0;
        renderAll();
        syncToServer(true); // 접속한 모든 사람에게 복원된 내용을 즉시 반영
        toast('백업 파일을 불러왔습니다. 접속한 모든 사람 화면에 반영됩니다.');
      } catch (err) {
        toast('백업 파일을 읽을 수 없습니다. JSON 형식을 확인하세요.', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btnClearLocations').addEventListener('click', () => {
    if (!confirm('재고 로케이션 재고 상태를 모두 비울까요? (로케이션 목록 자체는 유지됩니다)')) return;
    state.locations.forEach(l => { l.barcode = ''; l.qty = ''; });
    markDirty(); renderLocations(); renderDashboard();
    toast('재고 로케이션을 비웠습니다.');
  });
  document.getElementById('btnClearLog').addEventListener('click', () => {
    if (!confirm('할당기록을 전부 삭제할까요?')) return;
    state.log = []; markDirty(); renderLog(); renderDashboard(); renderHistoryDayNav();
    toast('할당기록을 삭제했습니다.');
  });
  document.getElementById('btnResetAll').addEventListener('click', () => {
    if (!confirm('상품마스터/재고로케이션/할당기록을 모두 초기화합니다. 접속한 모든 사람에게 반영됩니다. 계속할까요?')) return;
    // 초기 상품/로케이션 시드 데이터는 서버에만 있으므로, 서버에 초기화를 요청하고
    // 결과는 'state:pulled' 브로드캐스트로 모든 접속자(요청자 포함)에게 동일하게 반영된다.
    if (socket && socket.connected) {
      socket.emit('action:resetAll');
      toast('전체 초기화를 요청했습니다…');
    } else {
      toast('서버와 연결이 끊어져 있어 초기화할 수 없습니다. 잠시 후 다시 시도해주세요.', true);
    }
  });
}

function doBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    products: state.products,
    locations: state.locations,
    log: state.log,
    rules: state.rules,
    nameRules: state.nameRules,
    scanFeed: state.scanFeed,
    executionHistory: state.executionHistory,
    batchPresets: state.batchPresets,
    cbmHistory: state.cbmHistory
  };
  const pad = n => String(n).padStart(2, '0');
  const d = new Date();
  const filename = `재고할당_백업_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json');
  state.changesSinceBackup = 0;
  updateBackupNote();
  toast('백업 파일을 저장했습니다.');
}

function renderResults() {
  const wrap = document.getElementById('resultsList');
  if (!wrap) return;
  if (state.executionHistory.length === 0) {
    wrap.innerHTML = `<div class="empty-state">아직 실행한 자동 할당이 없습니다. «입고 · 자동할당» 탭에서 실행하면 여기에 결과가 쌓입니다.</div>`;
    return;
  }
  wrap.innerHTML = state.executionHistory.map(batch => {
    const items = batch.results.map(r => {
      const cls = r.remaining === 0 ? 'ok' : r.allocatedQty > 0 ? 'partial' : 'fail';
      const statusText = r.remaining === 0 ? '완료' : r.allocatedQty > 0 ? `일부만 배치 (부족 ${r.remaining})` : '공간 부족';
      const pills = r.placements.map(p => `<span class="loc-pill">${esc(p.loc)} × ${esc(p.qty)}${p.partnerLoc ? ` (짝 ${esc(p.partnerLoc)})` : ''}${p.merged ? ' <span class="badge merge">합짐</span>' : ''}</span>`).join('');
      return `<div class="result-card ${cls}">
        <div class="result-head">
          <div><b>${esc(r.barcode)}</b> <span class="muted">${esc(r.name || productLabel(r.barcode))}</span></div>
          <div>${statusText} · 요청 ${r.requestedQty} / 배치 ${r.allocatedQty}</div>
        </div>
        <div>${pills || '<span class="muted">배치된 위치 없음</span>'}</div>
      </div>`;
    }).join('');
    return `<div class="result-batch">
      <div class="result-batch-head">${fmtDate(batch.ts)} 실행 · ${batch.results.length}건${batch.batch ? ` · <span class="badge synced">${esc(batch.batch)}</span>` : ''}</div>
      ${items}
    </div>`;
  }).join('');
}

/* ---- 차수/업체명 프리셋 (일자별 입고 기록 구분용) ---- */
function renderBatchSelect() {
  const sel = document.getElementById('batchSelect');
  if (!sel) return;
  const cur = state.ui.selectedBatch;
  const opts = ['<option value="">차수/업체명 선택 안함</option>']
    .concat(state.batchPresets.map(b => `<option value="${esc(b)}" ${b === cur ? 'selected' : ''}>${esc(b)}</option>`));
  sel.innerHTML = opts.join('');
  if (cur && !state.batchPresets.includes(cur)) { sel.value = ''; state.ui.selectedBatch = ''; }
}

function renderBatchPresets() {
  const wrap = document.getElementById('batchPresetList');
  if (!wrap) return;
  if (state.batchPresets.length === 0) {
    wrap.innerHTML = `<div class="empty-state">등록된 차수/업체명이 없습니다.</div>`;
  } else {
    wrap.innerHTML = state.batchPresets.map(b => `
      <span class="loc-pill" data-preset="${esc(b)}" style="display:inline-flex; align-items:center; gap:6px; margin:2px 6px 2px 0;">
        ${esc(b)} <button class="btn ghost sm preset-del" data-preset="${esc(b)}" style="padding:0 4px; line-height:1;">✕</button>
      </span>`).join('');
  }
  renderBatchSelect();
}

/* ---- 일자별 입고 기록 (엑셀 붙여넣기용) ---- */
function historyAvailableYears() {
  return Array.from(new Set(state.log.map(l => dateParts(l.ts).y))).sort((a, b) => b - a);
}
function historyAvailableMonths(year) {
  return Array.from(new Set(state.log.filter(l => dateParts(l.ts).y === year).map(l => dateParts(l.ts).m))).sort((a, b) => a - b);
}
function historyAvailableDays(year, month) {
  return Array.from(new Set(state.log.filter(l => {
    const p = dateParts(l.ts);
    return p.y === year && p.m === month;
  }).map(l => dateParts(l.ts).d))).sort((a, b) => a - b);
}
// 선택한 날짜의 로그 전체(차수/업체명 필터 적용 전) — 그 날짜에 실제로 쓰인 차수/업체명 목록을 구하는 데 사용.
function logsForSelectedDay() {
  const y = Number(state.ui.historyYear), m = Number(state.ui.historyMonth), d = Number(state.ui.historyDay);
  if (!y || !m || !d) return [];
  return state.log.filter(l => {
    const p = dateParts(l.ts);
    return p.y === y && p.m === m && p.d === d;
  });
}
const HISTORY_BATCH_NONE = '__none__'; // "차수/업체명 미지정" 항목을 가리키는 내부 값

// 년/월/일 select 3개를 현재 로그 데이터 기준으로 다시 채우고, 선택값이 더 이상 유효하지 않으면
// 가장 최근 날짜로 이동시킨 뒤 표를 다시 그린다.
function renderHistoryDayNav() {
  const yearSel = document.getElementById('historyYearSel');
  const monthSel = document.getElementById('historyMonthSel');
  const daySel = document.getElementById('historyDaySel');
  if (!yearSel || !monthSel || !daySel) return;

  const years = historyAvailableYears();
  if (years.length === 0) {
    yearSel.innerHTML = '<option value="">-</option>';
    monthSel.innerHTML = '<option value="">-</option>';
    daySel.innerHTML = '<option value="">-</option>';
    state.ui.historyYear = ''; state.ui.historyMonth = ''; state.ui.historyDay = ''; state.ui.historyBatch = '';
    const batchSel = document.getElementById('historyBatchSel');
    if (batchSel) batchSel.innerHTML = '<option value="">전체</option>';
    renderHistoryDayLog();
    return;
  }

  if (!state.ui.historyYear || !years.includes(Number(state.ui.historyYear))) {
    state.ui.historyYear = years[0]; // years는 최신순 정렬 -> 가장 최근 연도
  }
  const selYear = Number(state.ui.historyYear);
  yearSel.innerHTML = years.map(y => `<option value="${y}" ${y === selYear ? 'selected' : ''}>${y}년</option>`).join('');

  const months = historyAvailableMonths(selYear);
  if (!state.ui.historyMonth || !months.includes(Number(state.ui.historyMonth))) {
    state.ui.historyMonth = months[months.length - 1]; // 가장 최근 월
  }
  const selMonth = Number(state.ui.historyMonth);
  monthSel.innerHTML = months.map(m => `<option value="${m}" ${m === selMonth ? 'selected' : ''}>${m}월</option>`).join('');

  const days = historyAvailableDays(selYear, selMonth);
  if (!state.ui.historyDay || !days.includes(Number(state.ui.historyDay))) {
    state.ui.historyDay = days[days.length - 1]; // 가장 최근 일
  }
  const selDay = Number(state.ui.historyDay);
  daySel.innerHTML = days.map(d => `<option value="${d}" ${d === selDay ? 'selected' : ''}>${d}일</option>`).join('');

  renderHistoryBatchNav();
}

// 선택한 년/월/일에 실제로 존재하는 차수/업체명 값들로 4번째 select를 다시 채운다.
function renderHistoryBatchNav() {
  const batchSel = document.getElementById('historyBatchSel');
  if (!batchSel) { renderHistoryDayLog(); return; }
  const dayLogs = logsForSelectedDay();
  const labels = Array.from(new Set(dayLogs.map(l => l.batch || ''))).filter(Boolean).sort();
  const hasUnlabeled = dayLogs.some(l => !l.batch);

  if (!labels.length) {
    // 이 날짜에 차수/업체명이 지정된 기록이 아예 없으면 굳이 선택지를 보여줄 필요 없음.
    batchSel.innerHTML = '<option value="">전체</option>';
    state.ui.historyBatch = '';
  } else {
    const opts = ['<option value="">전체</option>'];
    if (hasUnlabeled) opts.push(`<option value="${HISTORY_BATCH_NONE}">미지정</option>`);
    labels.forEach(b => opts.push(`<option value="${esc(b)}">${esc(b)}</option>`));
    batchSel.innerHTML = opts.join('');
    const valid = [''].concat(hasUnlabeled ? [HISTORY_BATCH_NONE] : []).concat(labels);
    if (!valid.includes(state.ui.historyBatch)) state.ui.historyBatch = '';
    batchSel.value = state.ui.historyBatch;
  }
  renderHistoryDayLog();
}

function currentHistoryDayLogs() {
  const y = Number(state.ui.historyYear), m = Number(state.ui.historyMonth), d = Number(state.ui.historyDay);
  if (!y || !m || !d) return [];
  const batch = state.ui.historyBatch;
  return state.log.filter(l => {
    const p = dateParts(l.ts);
    if (!(p.y === y && p.m === m && p.d === d)) return false;
    if (!batch) return true;
    if (batch === HISTORY_BATCH_NONE) return !l.batch;
    return l.batch === batch;
  }).sort((a, b) => a.ts - b.ts);
}

function renderHistoryDayLog() {
  const body = document.getElementById('dayLogBody');
  const countEl = document.getElementById('historyDayCount');
  if (!body) return;
  const rows = currentHistoryDayLogs();
  if (countEl) countEl.textContent = rows.length ? `${rows.length}건` : '';
  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="empty-state">선택한 날짜의 입고 기록이 없습니다.</td></tr>`;
    return;
  }
  // 업로드된 입고 양식 열 순서: 박스번호,바코드,정상수량,불량수량,정상로케이션,불량로케이션.
  // 박스번호는 현재 시스템에서 관리하지 않아 빈 칸으로 두고, 불량수량/불량로케이션은
  // 현장 운영 방식에 맞춰 항상 0 / 00-00-00-00 으로 통일해서 채운다.
  body.innerHTML = rows.map(l => `
    <tr>
      <td class="mono muted">&nbsp;</td>
      <td class="mono">${esc(l.barcode)}</td>
      <td class="right mono">${l.qty}</td>
      <td class="right mono muted">0</td>
      <td class="mono">${esc(l.loc)}</td>
      <td class="mono muted">00-00-00-00</td>
    </tr>`).join('');
}

// 업로드된 입고 양식과 동일한 열 순서(박스번호,바코드,정상수량,불량수량,정상로케이션,불량로케이션)의 TSV.
// 박스번호는 관리하지 않아 빈 칸으로 채우고, 불량수량/불량로케이션은 항상 0 / 00-00-00-00 으로 통일한다.
// 엑셀에 그대로 붙여넣을 수 있도록 헤더 없이 데이터 행만 만든다.
function buildDayTsv() {
  return currentHistoryDayLogs()
    .map(l => ['', l.barcode, l.qty, 0, l.loc, '00-00-00-00'].join('\t'))
    .join('\n');
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // file:// 등 보안 컨텍스트가 아닌 환경을 위한 대체 복사 방식
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('execCommand copy failed'));
    } catch (err) { reject(err); }
  });
}

document.addEventListener('DOMContentLoaded', boot);
