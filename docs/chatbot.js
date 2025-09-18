// chatbot.js — KAFRI Health Bot (7카테고리 버전)
// 요구사항: index.html의 #log, #input, #send, #quickbar 요소 존재 가정

const el = (id)=>document.getElementById(id);
const log = el('log');
const input = el('input');
const sendBtn = el('send');
const quickbar = el('quickbar');

let DB = null;

// 대화 상태
const S = {
  MENU: 'MENU',
  PICK_CAT: 'PICK_CAT',
  PICK_SPECIES: 'PICK_SPECIES',
  PICK_SECTION: 'PICK_SECTION',
  SHOW_RESULT: 'SHOW_RESULT',
  LOOP_CONFIRM: 'LOOP_CONFIRM'
};

let state = S.MENU;
let current = {
  categoryIdx: null,
  speciesIdx: null,
  section: null
};

// 섹션 라벨 고정
const SECTIONS = [
  '개요', // 선택적 설명(없으면 skip)
  '주요영양소',
  '약효및효용',
  '제철및선택법',
  '조리포인트',
  '어울리는요리',
  '레시피',
  '출처'
];

// 도우미
function bot(text) {
  const row = document.createElement('div');
  row.className = 'msg bot';
  row.innerHTML = `<div class="bubble">${text}</div>`;
  log.appendChild(row); log.scrollTop = log.scrollHeight;
}
function me(text) {
  const row = document.createElement('div');
  row.className = 'msg me';
  row.innerHTML = `<div class="bubble">${text}</div>`;
  log.appendChild(row); log.scrollTop = log.scrollHeight;
}
function chips(items) {
  quickbar.innerHTML = '';
  items.forEach(t=>{
    const c = document.createElement('button');
    c.className = 'chip';
    c.textContent = t;
    c.onclick = ()=>handleUser(t);
    quickbar.appendChild(c);
  });
  quickbar.hidden = items.length===0;
}

// JSON 로드
async function loadDB() {
  const res = await fetch('health_fish.json');
  DB = await res.json();
}

// 숫자/텍스트 선택 파싱
function pickFromList(msg, list) {
  const t = msg.trim();
  // 숫자
  if (/^\d+$/.test(t)) {
    const i = parseInt(t,10)-1;
    if (i>=0 && i<list.length) return i;
  }
  // 텍스트(완전일치 우선 → 부분포함 보조)
  const norm = (s)=>s.replace(/\s/g,'').toLowerCase();
  const nmsg = norm(t);
  let idx = list.findIndex(x=>norm(x)===nmsg);
  if (idx<0) idx = list.findIndex(x=>norm(x).includes(nmsg));
  return idx>=0? idx : null;
}

// 섹션 렌더러
function renderSection(spec, sec) {
  switch(sec){
    case '개요':
      if (spec.개요) return spec.개요;
      return null;
    case '주요영양소': {
      const j = spec['주요영양소'];
      if (!j) return null;
      // 키:값 테이블 형태
      const rows = Object.entries(j).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('');
      return `<b>주요 영양소</b><br><table style="width:100%;border-collapse:collapse" border="1">
        <thead><tr><th style="width:30%">영양소</th><th>수치/설명</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
    }
    case '약효및효용': {
      const arr = spec['약효및효용']; if(!arr) return null;
      return `<b>약효 및 효용</b><ul>${arr.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    }
    case '제철및선택법': {
      const arr = spec['제철및선택법']; if(!arr) return null;
      return `<b>제철 및 선택법</b><ul>${arr.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    }
    case '조리포인트': {
      const arr = spec['조리포인트']; if(!arr) return null;
      return `<b>조리 포인트</b><ul>${arr.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    }
    case '어울리는요리': {
      const arr = spec['어울리는요리']; if(!arr) return null;
      return `<b>어울리는 요리</b><ul>${arr.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    }
    case '레시피': {
      const r = spec['레시피']; if(!r) return null;
      const ing = r.재료? `<ul>${r.재료.map(x=>`<li>${x}</li>`).join('')}</ul>` : '';
      const steps = r.만드는법? `<ol>${r.만드는법.map(x=>`<li>${x}</li>`).join('')}</ol>`:'';
      return `<b>레시피: ${r.이름||''}</b>${ing}${steps}`;
    }
    case '출처': {
      const s = spec.source || spec.출처; if(!s) return null;
      const arr = Array.isArray(s)? s : [s];
      return `<b>출처</b><ul>${arr.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    }
    default: return null;
  }
}

function renderSummary(cat, spec) {
  const blocks = [];
  SECTIONS.forEach(sec=>{
    const b = renderSection(spec, sec);
    if (b) blocks.push(b);
  });
  return `
  <div style="border:1px solid #243455;border-radius:10px;padding:10px;background:#1b2843">
    <div class="meta">카테고리: ${cat.name} · 어종: <b>${spec.name}</b></div>
    ${blocks.join('<hr style="border:0;border-top:1px dashed #345">')}
  </div>`;
}

// 프리셋 저장/불러오기(로컬)
const PRESET_KEY = 'kafri_health_presets';
function loadPresets(){
  try { return JSON.parse(localStorage.getItem(PRESET_KEY) || '[]'); }
  catch { return []; }
}
function savePreset(obj){
  const arr = loadPresets();
  arr.unshift({...obj, ts: Date.now()});
  localStorage.setItem(PRESET_KEY, JSON.stringify(arr.slice(0,20)));
}
function presetChips(){
  const arr = loadPresets();
  if (!arr.length) return [];
  return arr.slice(0,5).map(p=>`최근: ${p.category}/${p.species}`);
}

// 초기 메시지/메뉴
function greet() {
  bot(`⚓ 수산물 건강 챗봇입니다. 무엇을 도와드릴까요?<br>아래에서 <b>카테고리</b>를 선택하세요.`);
  state = S.PICK_CAT;
  const names = DB.categories.map(c=>c.name);
  bot(menuList('카테고리', names));
  chips([...names, ...presetChips(), '도움말']);
}

function menuList(title, arr) {
  return `👉 <b>${title}</b> (번호/텍스트 선택)<br>` + arr.map((x,i)=>`${i+1}. ${x}`).join('<br>');
}

// 메인 핸들러
function handleUser(msgRaw){
  const msg = msgRaw.trim();
  if (!msg) return;
  me(msg);

  // 프리셋 단축
  if (msg.startsWith('최근: ')) {
    const t = msg.replace('최근: ','');
    const [category, species] = t.split('/');
    const cIdx = pickFromList(category, DB.categories.map(c=>c.name));
    if (cIdx!=null){
      const sIdx = pickFromList(species, DB.categories[cIdx].species.map(s=>s.name));
      if (sIdx!=null){
        current = {categoryIdx:cIdx, speciesIdx:sIdx, section:null};
        const cat = DB.categories[cIdx], spec = cat.species[sIdx];
        bot(renderSummary(cat, spec));
        savePreset({category: cat.name, species: spec.name});
        state = S.LOOP_CONFIRM;
        bot(`더 필요한 것이 있나요? (예/아니오)`);
        chips(['예','아니오']);
        return;
      }
    }
  }

  switch(state){
    case S.PICK_CAT: {
      const names = DB.categories.map(c=>c.name);
      const i = pickFromList(msg, names);
      if (i==null){ bot(`숫자나 텍스트로 카테고리를 선택해주세요.`); return; }
      current.categoryIdx = i;
      const species = DB.categories[i].species.map(s=>s.name);
      bot(menuList('어종', species));
      chips([...species, '뒤로', '처음으로']);
      state = S.PICK_SPECIES;
      break;
    }
    case S.PICK_SPECIES: {
      if (msg==='뒤로'){ state=S.PICK_CAT; bot(menuList('카테고리', DB.categories.map(c=>c.name))); chips(DB.categories.map(c=>c.name)); break; }
      if (msg==='처음으로'){ reset(); break; }
      const species = DB.categories[current.categoryIdx].species.map(s=>s.name);
      const i = pickFromList(msg, species);
      if (i==null){ bot(`리스트에서 어종을 선택해주세요.`); return; }
      current.speciesIdx = i;
      bot(menuList('보고 싶은 섹션', ['전체 보기', ...SECTIONS.filter(s=>s!=='개요')]));
      chips(['전체 보기', ...SECTIONS.filter(s=>s!=='개요'), '뒤로', '처음으로']);
      state = S.PICK_SECTION;
      break;
    }
    case S.PICK_SECTION: {
      if (msg==='뒤로'){ 
        const species = DB.categories[current.categoryIdx].species.map(s=>s.name);
        bot(menuList('어종', species)); chips([...species,'뒤로','처음으로']); state=S.PICK_SPECIES; break; 
      }
      if (msg==='처음으로'){ reset(); break; }
      const opts = ['전체 보기', ...SECTIONS.filter(s=>s!=='개요')];
      const i = pickFromList(msg, opts);
      if (i==null){ bot(`'전체 보기' 또는 섹션을 선택해주세요.`); return; }
      const cat = DB.categories[current.categoryIdx];
      const spec = cat.species[current.speciesIdx];
      if (i===0){
        bot(renderSummary(cat, spec));
      }else{
        const sec = opts[i];
        const block = renderSection(spec, sec);
        bot(`<div class="meta">${cat.name} · <b>${spec.name}</b></div>`);
        bot(block || '자료가 없습니다.');
      }
      savePreset({category: cat.name, species: spec.name});
      state = S.LOOP_CONFIRM;
      bot(`더 필요한 것이 있나요? (예/아니오)`);
      chips(['예','아니오','처음으로']);
      break;
    }
    case S.LOOP_CONFIRM: {
      if (/^예$/i.test(msg)) {
        state = S.PICK_CAT;
        bot(menuList('카테고리', DB.categories.map(c=>c.name)));
        chips(DB.categories.map(c=>c.name));
      } else if (/^아니오$/i.test(msg)) {
        bot('이용해 주셔서 감사합니다. 필요한 때 언제든 불러주세요 ⚓');
        chips(['처음으로']);
        state = S.MENU;
      } else if (msg==='처음으로'){ reset(); }
      else {
        bot(`'예' 또는 '아니오'로 답해주세요.`);
        chips(['예','아니오','처음으로']);
      }
      break;
    }
    default: reset();
  }
}

function reset(){
  state = S.MENU;
  current = {categoryIdx:null, speciesIdx:null, section:null};
  log.innerHTML = '';
  greet();
}

// 이벤트
sendBtn.onclick = ()=>{ const v = input.value; input.value=''; handleUser(v); };
input.addEventListener('keydown',(e)=>{ if (e.key==='Enter'){ e.preventDefault(); sendBtn.click(); }});

// 시작
loadDB().then(()=>reset());
