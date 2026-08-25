/* =========================================================
   상태 저장소 (state.json 읽기/쓰기를 담당)

   Render 무료 플랜은 "영구 디스크"가 없어서, 15분 이상 접속이 없어
   서버가 잠들었다가 다시 깨어날 때마다(재배포 때도 마찬가지) 로컬
   디스크에 있던 파일이 통째로 초기화됩니다. 이 문제를 돈 들이지 않고
   해결하기 위해, 서버 바깥의 무료 데이터베이스(Supabase)에 저장하는
   방식을 기본으로 하고 — 환경변수(SUPABASE_URL, SUPABASE_SERVICE_KEY)가
   없으면 예전처럼 로컬 data/state.json 파일에 저장하는 방식으로
   자동으로 대체됩니다(로컬 개발용 npm start 는 그대로 동작합니다).

   Supabase 연동 설정 방법은 README.md "7. 무료로 데이터가 계속
   유지되게 하기 (Supabase 연동)" 항목을 참고하세요.
   ========================================================= */

const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// Supabase의 "Data API" 화면에는 REST 요청용 전체 주소(.../rest/v1/)가 표시되는데,
// 실수로 그 뒷부분(/rest/v1/)까지 통째로 넣는 경우가 많아 여기서 방어적으로 잘라낸다.
// (아래 코드가 /rest/v1/... 를 다시 붙이기 때문에, 중복되면 요청이 실패한다.)
const SUPABASE_URL = (process.env.SUPABASE_URL || '')
  .trim()
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/+$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const SUPABASE_TABLE = 'app_state';
const SUPABASE_ROW_ID = 1;

const usingSupabase = !!(SUPABASE_URL && SUPABASE_KEY);

function supabaseHeaders(extra) {
  return Object.assign(
    {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    extra || {}
  );
}

async function loadFromSupabase() {
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${SUPABASE_ROW_ID}&select=data`;
  const res = await fetch(url, { headers: supabaseHeaders() });
  if (!res.ok) {
    throw new Error(`Supabase 조회 실패 (${res.status}): ${await res.text()}`);
  }
  const rows = await res.json();
  if (!rows.length) return null;
  return rows[0].data;
}

async function saveToSupabase(state) {
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${SUPABASE_ROW_ID}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: supabaseHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ data: state, updated_at: new Date().toISOString() })
  });
  if (!res.ok) {
    throw new Error(`Supabase 저장 실패 (${res.status}): ${await res.text()}`);
  }
}

function loadLocalSync() {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

function saveLocalSync(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

module.exports = {
  usingSupabase,

  // 서버 시작 시 한 번 호출. 저장된 상태가 없으면 null을 반환한다.
  async load() {
    if (usingSupabase) {
      try {
        return await loadFromSupabase();
      } catch (err) {
        console.error('[store] Supabase에서 불러오기 실패, 로컬 파일로 대체합니다:', err.message);
        return loadLocalSync();
      }
    }
    return loadLocalSync();
  },

  // 상태가 바뀔 때마다(디바운스되어) 호출.
  async save(state) {
    if (usingSupabase) {
      try {
        await saveToSupabase(state);
        return;
      } catch (err) {
        console.error('[store] Supabase 저장 실패 — 이번 변경은 저장되지 않았을 수 있습니다:', err.message);
        return;
      }
    }
    try {
      saveLocalSync(state);
    } catch (err) {
      console.error('[store] 로컬 파일 저장 실패:', err.message);
    }
  }
};
