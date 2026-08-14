/* =========================================================
   재고 할당 관리 - 실시간 공유 서버
   여러 사람이 같은 주소로 접속해서 같은 데이터를 보고,
   한 명이 바꾸면 Socket.IO로 다른 모든 접속자 화면에 즉시 반영합니다.

   저장 방식: 아주 단순하게 data/state.json 파일 하나에 전체 상태를
   그대로 저장합니다(별도 DB 서버 없이 동작). 소규모 팀 사용을 기준으로
   설계된 MVP이며, "마지막에 저장을 요청한 내용이 이긴다"는 단순한
   동시편집 규칙을 사용합니다(자세한 내용은 README 참고).
   ========================================================= */

const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const store = require('./store');

const DATA_DIR = path.join(__dirname, 'data');
const SEED_PRODUCTS_FILE = path.join(DATA_DIR, 'seed_products.json');
const SEED_LOCATIONS_FILE = path.join(DATA_DIR, 'seed_locations.json');
const SEED_CBM_HISTORY_FILE = path.join(DATA_DIR, 'seed_cbm_history.json');
const DEFAULT_BATCH_PRESETS = ['1차', '2차', '3차'];

const DEFAULT_RULES = {
  A: ['1B-', '1C-', '1D-', '1E-', '1F-', '1G-'],
  B: ['1J-', '1K-', '1N-', '1O-'],
  C: ['1H-', '1I-', '1L-', '1M-'],
  exclude: ['1A-', '1R-', '1S-'],
  mergeEnabled: true
};
const DEFAULT_NAME_RULES = [
  { id: 'nr-selfrollmat', mustAll: ['셀프시공 롤매트'], anyOf: ['샌디', '코지', '워터드롭'], zones: ['1R-', '1S-'] }
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function loadSeedProducts() {
  return readJson(SEED_PRODUCTS_FILE).map(p => ({ ...p }));
}
function loadSeedLocations() {
  return readJson(SEED_LOCATIONS_FILE).map(l => ({ ...l }));
}
function loadSeedCbmHistory() {
  return readJson(SEED_CBM_HISTORY_FILE).map(r => ({ ...r }));
}

function freshState() {
  return {
    products: loadSeedProducts(),
    locations: loadSeedLocations(),
    log: [],
    rules: { ...DEFAULT_RULES },
    nameRules: DEFAULT_NAME_RULES.map(r => ({ ...r, mustAll: [...r.mustAll], anyOf: [...r.anyOf], zones: [...r.zones] })),
    executionHistory: [],
    scanFeed: [],
    batchPresets: [...DEFAULT_BATCH_PRESETS],
    cbmHistory: loadSeedCbmHistory()
  };
}

let sharedState = null;

let saveTimer = null;
function persistState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    store.save(sharedState).catch(err => console.error('[state] 저장 실패:', err.message));
  }, 300);
}

const SHARED_KEYS = ['products', 'locations', 'log', 'rules', 'nameRules', 'executionHistory', 'scanFeed', 'batchPresets', 'cbmHistory'];
function mergePush(payload) {
  if (!payload || typeof payload !== 'object') return;
  SHARED_KEYS.forEach(k => {
    if (payload[k] !== undefined) sharedState[k] = payload[k];
  });
}

const app = express();
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server);

function broadcastPresence() {
  io.emit('presence:update', { count: io.engine.clientsCount });
}

io.on('connection', socket => {
  socket.emit('state:init', sharedState);
  broadcastPresence();

  socket.on('state:push', payload => {
    mergePush(payload);
    persistState();
    socket.broadcast.emit('state:pulled', sharedState); // 보낸 사람은 이미 로컬에 반영되어 있으니 제외
  });

  socket.on('action:resetAll', () => {
    const fresh = freshState();
    sharedState = fresh;
    persistState();
    io.emit('state:pulled', sharedState); // 요청자 포함 전원에게 반영
  });

  socket.on('disconnect', () => {
    broadcastPresence();
  });
});

const PORT = process.env.PORT || 3000;

async function start() {
  const loaded = await store.load();
  const storeLabel = store.usingSupabase ? 'Supabase' : '로컬 파일(data/state.json)';
  if (loaded) {
    // 필드 누락 방지를 위해 기본값과 병합
    sharedState = Object.assign(freshState(), loaded);
    console.log(`[state] 기존 저장 데이터를 불러왔습니다 (${storeLabel})`);
  } else {
    sharedState = freshState();
    console.log(`[state] 저장된 데이터가 없어 시드 데이터로 시작합니다 (${storeLabel}).`);
  }

  server.listen(PORT, () => {
    console.log(`재고 할당 관리 실시간 서버 실행 중: http://localhost:${PORT}`);
    if (store.usingSupabase) {
      console.log('[store] Supabase에 데이터가 저장됩니다 — 서버가 재시작되어도 데이터가 유지됩니다.');
    } else {
      console.log('[store] ⚠️ SUPABASE_URL / SUPABASE_SERVICE_KEY가 설정되지 않아 로컬 파일에만 저장됩니다.');
      console.log('[store] Render 무료 플랜은 15분 이상 접속이 없으면 로컬 파일이 초기화될 수 있습니다 — README "7. 무료로 데이터가 계속 유지되게 하기" 참고.');
    }
  });
}

start();
