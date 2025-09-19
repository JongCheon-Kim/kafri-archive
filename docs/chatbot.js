/* 수산물 건강 챗봇 – 안전한 캐시 무력화 + 유연한 JSON 파서 */
const APP_VER = (window.__APP_VER__ || '20240919a');

/* ---------- 공통 유틸 ---------- */
const $ = (sel) => document.querySelector(sel);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  }
  return node;
}

/* 배열/객체 모두 안전하게 라벨 뽑기 */
function getCategoryNames(categories) {
  if (Array.isArray(categories)) return categories.map(String);
  if (categories && typeof categories === 'object') return Object.keys(categories);
  return [];
}

/* 카테고리 → 어종 목록 안전 추출 */
function getSpeciesList(data, selectedCategory) {
  const cats = data.categories;

  // 배열형 카테고리: 별도의 맵을 조회 (있을 때)
  if (Array.isArray(cats)) {
    if (data.itemsByCategory && data.itemsByCategory[selectedCategory]) {
      const arr = data.itemsByCategory[selectedCategory];
      return Array.isArray(arr) ? arr : Object.keys(arr || {});
    }
    return []; // 배열형인데 매핑이 없으면 비움
  }

  // 객체형 카테고리
  const node = cats && cats[selectedCategory];
  if (!node) return [];

  // 1) species 배열이 존재
  if (Array.isArray(node.species)) return node.species;

  // 2) items(혹은 data) 오브젝트 밑의 키
  if (node.items && typeof node.items === 'object') return Object.keys(node.items);
  if (node.data && typeof node.data === 'object') return Object.keys(node.data);

  // 3) 기타: 메타 키를 제외한 키 전체를 어종으로 간주
  const metaKeys = new Set(['title', 'sections', 'source', 'items', 'data', 'species']);
  return Object.keys(node).filter(k => !metaKeys.has(k));
}

/* 카테고리+어종 → 섹션 데이터 안전 추출 */
function getSpeciesData(data, category, species) {
  const cats = data.categories;

  // 배열형 카테고리
  if (Array.isArray(cats)) {
    // itemsByCategory → details 맵을 탐색
    const detailMap =
      (data.details && data.details[category] && data.details[category][species]) ||
      (data.itemsByCategory && data.itemsByCategory[category] && data.itemsByCategory[category][species]) ||
      null;
    return normalizeSectionMap(detailMap);
  }

  // 객체형 카테고리
  const node = cats && cats[category];
  if (!node) return {};

  // 1) node.items[species]
  if (node.items && node.items[species]) return normalizeSectionMap(node.items[species]);
  // 2) node.data[species]
  if (node.data && node.data[species]) return normalizeSectionMap(node.data[species]);
  // 3) node[species]
  if (node[species]) return normalizeSectionMap(node[species]);

  return {};
}

/* 섹션 맵 정규화 (문자열/배열/객체 모두 허용) */
function normalizeSectionMap(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') return { '본문': raw };
  if (Array.isArray(raw)) return { '본문': raw.join('\n') };
  // 객체면 그대로
  return raw;
}

/* 렌더링 도우미 */
function renderTags(list, target, onClick, active) {
  target.innerHTML = '';
  if (!list || !list.length) {
    target.appendChild(el('div', { class: 'empty' }, '표시할 항목이 없습니다.'));
    return;
  }
  list.forEach(name => {
    const tag = el('div', { class: 'tag' + (active === name ? ' on' : ''), text: name });
    tag.addEventListener('click', () => onClick(name));
    target.appendChild(tag);
  });
}

function setCount(elm, n) { elm.textContent = n ? `${n}` : ''; }

/* ---------- 데이터 로드 ---------- */
async function loadData() {
  const res = await fetch(`health_fish.json?v=${APP_VER}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`health_fish.json load failed: ${res.status}`);
  return await res.json();
}

/* ---------- 상태 ---------- */
const state = {
  data: null,
  category: null,
  species: null
};

/* ---------- UI 동작 ---------- */
function renderCategories() {
  const names = getCategoryNames(state.data.categories);
  renderTags(names, $('#category-list'), (name) => {
    state.category = name;
    state.species = null;
    renderCategories(); // 활성표시 업데이트
    renderSpecies();
    renderDetailIntro();
  }, state.category);
  setCount($('#cat-count'), names.length);
}

function renderSpecies() {
  const list = state.category ? getSpeciesList(state.data, state.category) : [];
  renderTags(list, $('#species-list'), (sp) => {
    state.species = sp;
    renderSpecies(); // 활성표시 업데이트
    renderDetailIntro();
  }, state.species);
  setCount($('#sp-count'), list.length);
}

const SECTION_ORDER = [
  '출처',
  '주요 영양소', '주요영양소',
  '약효 및 효용', '약효', '효용',
  '제철 및 선택법', '제철', '선택법',
  '조리 포인트', '조리포인트',
  '어울리는 요리',
  '레시피'
];

function pickOrderedSections(map) {
  const keys = Object.keys(map || {});
  if (!keys.length) return [];
  const order = [];
  // 우선순위 섹션
  for (const k of SECTION_ORDER) {
    const key = keys.find(x => x === k);
    if (key) { order.push(key); }
  }
  // 나머지
  for (const k of keys) if (!order.includes(k)) order.push(k);
  return order;
}

function renderDetailIntro() {
  const panel = $('#detail-panel');
  panel.innerHTML = '';

  if (!state.category) {
    panel.appendChild(el('div', { class: 'note' }, '카테고리를 먼저 선택하세요.'));
    return;
  }
  if (!state.species) {
    panel.appendChild(el('div', { class: 'note' }, `[${state.category}] 어종을 선택하세요.`));
    return;
  }

  // 섹션 버튼 안내
  panel.appendChild(el('div', { class: 'note' },
    `선택됨 → 카테고리: ${state.category} / 어종: ${state.species}. 상단의 [전체 보기] 또는 [출처] 버튼을 누르세요.`));
}

/* 상단 버튼: 전체 보기 */
function showAll() {
  if (!state.category || !state.species) return;
  const map = getSpeciesData(state.data, state.category, state.species);
  const order = pickOrderedSections(map);
  const panel = $('#detail-panel');
  panel.innerHTML = '';

  if (!order.length) {
    panel.appendChild(el('div', { class: 'note' }, '섹션 데이터가 없습니다.'));
    return;
  }
  order.forEach(name => {
    const val = map[name];
    const sec = el('div', { class: 'section' });
    sec.appendChild(el('h3', {}, name));
    if (Array.isArray(val)) {
      sec.appendChild(el('div', {}, val.join('<br/>')));
    } else {
      sec.appendChild(el('div', {}, String(val)));
    }
    panel.appendChild(sec);
  });
}

/* 상단 버튼: 출처만 보기 */
function showSource() {
  if (!state.category || !state.species) return;
  const map = getSpeciesData(state.data, state.category, state.species);
  const srcKey = Object.keys(map).find(k => k === '출처');
  const panel = $('#detail-panel');
  panel.innerHTML = '';

  if (!srcKey) {
    panel.appendChild(el('div', { class: 'note' }, '출처 정보가 없습니다.'));
    return;
  }
  const sec = el('div', { class: 'section' });
  sec.appendChild(el('h3', {}, '출처'));
  const val = map[srcKey];
  sec.appendChild(el('div', {}, Array.isArray(val) ? val.join('<br/>') : String(val)));
  panel.appendChild(sec);
}

/* ---------- 초기화 ---------- */
async function init() {
  try {
    state.data = await loadData();
  } catch (e) {
    const p = $('#detail-panel');
    p.innerHTML = '';
    p.appendChild(el('div', { class: 'note' }, '데이터 로드 실패: ' + e.message));
    return;
  }
  $('#btn-all').addEventListener('click', showAll);
  $('#btn-src').addEventListener('click', showSource);

  renderCategories();
  renderSpecies();
  renderDetailIntro();
}

document.addEventListener('DOMContentLoaded', init);
