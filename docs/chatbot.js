/* 수산물 건강 챗봇 (휴대용 · GitHub Pages 호환 · 심플 모드)
   - 새/구 JSON 스키마 자동 인식
   - health_fish.json fetch 실패 시 inline 데이터 폴백
   - 어종 클릭 시 바로 전체 항목 표시
   - 세부 화면에서는 전체/다른항목/뒤로 버튼 제거 → UI 심플화
*/
(() => {
  const el = (id) => document.getElementById(id);
  const $cat = el('categoryList');
  const $fish = el('fishList');
  const $content = el('content');
  const $crumb = el('crumb');

  const $btnAll = el('btnAll');
  const $btnOther = el('btnOther');
  const $btnBack = el('btnBack');
  const $btnHome = el('btnHome');
  const $btnNew = el('btnNewWindow');
  const $btnAbout = el('btnAbout');

  let DATA = null; 
  let state = { category: null, fish: null, step: 'category' };

  // ---------- 스키마 정규화 ----------
  function normalize(raw) {
    if (raw && raw.categories && !Array.isArray(raw.categories) && raw.details) {
      return raw; // 구 스키마
    }
    if (raw && Array.isArray(raw.categories)) {
      const catMap = {};
      const detMap = {};
      raw.categories.forEach((cat) => {
        const cname = (cat && cat.name) ? String(cat.name).trim() : '';
        if (!cname) return;
        const fishNames = [];
        (cat.items || []).forEach((it) => {
          const fname = (it && it.name) ? String(it.name).trim() : '';
          if (!fname) return;
          fishNames.push(fname);
          const sec = it.sections || {};
          detMap[fname] = {
            '출처': sec['출처'] || '',
            '주요영양소': sec['주요영양소'] || '',
            '약효 및 효용': sec['약효 및 효용'] || '',
            '제철 및 선택법': sec['제철 및 선택법'] || '',
            '조리 포인트': sec['조리 포인트'] || '',
            '어울리는 요리': sec['어울리는 요리'] || '',
            '레시피': sec['레시피'] || ''
          };
        });
        catMap[cname] = fishNames;
      });
      return { categories: catMap, details: detMap };
    }
    return { categories: {}, details: {} };
  }

  // ---------- 데이터 로드 ----------
  async function loadData() {
    const url = './health_fish.json?v=20250919-3';
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const text = await res.text();
      const clean = text.replace(/^\uFEFF/, '');
      DATA = normalize(JSON.parse(clean));
      return;
    } catch (e) {
      const inline = document.getElementById('healthDataInline');
      if (inline && inline.textContent) {
        try {
          DATA = normalize(JSON.parse(inline.textContent.trim()));
        } catch {
          alert('내장 데이터 파싱 실패');
        }
      } else {
        alert('데이터 로드 실패');
      }
    }
  }

  // ---------- 툴바 표시 제어 ----------
  function updateToolbar(){
    if (state.step === 'category') {
      $btnAll.style.display   = 'none';
      $btnOther.style.display = 'none';
      $btnBack.style.display  = 'none';
    } else if (state.step === 'fish') {
      $btnAll.style.display   = 'none';
      $btnOther.style.display = 'none';
      $btnBack.style.display  = ''; 
    } else if (state.step === 'details') {
      $btnAll.style.display   = 'none';
      $btnOther.style.display = 'none';
      $btnBack.style.display  = 'none';
    }
    $btnHome.style.display = '';
    $btnNew.style.display  = '';
    $btnAbout.style.display= '';
  }

  // ---------- 렌더링 ----------
  function renderCategories() {
    if (!DATA) return;
    $cat.innerHTML = '';
    Object.keys(DATA.categories).forEach((name, idx) => {
      const b = document.createElement('button');
      b.className = 'chip' + (state.category === name ? ' active' : '');
      b.textContent = name;
      b.setAttribute('data-idx', String(idx + 1));
      b.onclick = () => selectCategory(name);
      $cat.appendChild(b);
    });
  }

  function renderFishes() {
    $fish.innerHTML = '';
    if (!state.category || !DATA) return;
    (DATA.categories[state.category] || []).forEach((name, idx) => {
      const b = document.createElement('button');
      b.className = 'chip' + (state.fish === name ? ' active' : '');
      b.textContent = name;
      b.setAttribute('data-idx', String(idx + 1));
      b.onclick = () => selectFish(name);
      $fish.appendChild(b);
    });
  }

  function renderContentInitial() {
    $crumb.textContent = '';
    $content.textContent = '카테고리를 선택하세요.';
    updateToolbar();
  }

  function renderPromptFish() {
    $crumb.textContent = `${state.category} ▸ 어종 선택`;
    $content.textContent = `[${state.category}] 어종을 선택하세요.`;
    updateToolbar();
  }

  function renderDetails(single = false) {
    if (!state.fish || !DATA) return;
    const d = (DATA.details && DATA.details[state.fish]) || {};
    const order = ['출처','주요영양소','약효 및 효용','제철 및 선택법','조리 포인트','어울리는 요리','레시피'];
    const hasAny = order.some((k) => (d[k] || '').trim() !== '');
    if (!hasAny) {
      $crumb.textContent = `${state.category} ▸ ${state.fish}`;
      $content.textContent = `[${state.category} · ${state.fish}]\n세부 정보 없음`;
      updateToolbar();
      return;
    }
    let out = `\n[${state.category} · ${state.fish}]\n`;
    order.forEach((k) => {
      const v = (d[k] || '').trim();
      if (v) {
        const icon = (k === '출처') ? '🔖' :
                     (k === '주요영양소') ? '🍙' :
                     (k === '약효 및 효용') ? '💊' :
                     (k === '제철 및 선택법') ? '🗓️' :
                     (k === '조리 포인트') ? '🍳' :
                     (k === '어울리는 요리') ? '🥢' :
                     (k === '레시피') ? '📜' : '•';
        out += `\n${icon} ${k}\n${v}\n`;
      }
    });
    $crumb.textContent = `${state.category} ▸ ${state.fish}`;
    $content.textContent = out.trim();
    updateToolbar();
  }

  // ---------- 상태 전환 ----------
  function selectCategory(name) {
    state.category = name;
    state.fish = null;
    state.step = 'fish';
    renderCategories();
    renderFishes();
    renderPromptFish();
  }
  function selectFish(name) {
    state.fish = name;
    state.step = 'details';
    renderCategories();
    renderFishes();
    renderDetails(true); 
  }
  function goBack() {
    if (state.step === 'fish') {
      goHome();
    }
  }
  function goHome() {
    state = { category: null, fish: null, step: 'category' };
    renderCategories();
    $fish.innerHTML = '';
    renderContentInitial();
  }

  // ---------- 단축키 ----------
  function onKey(e) {
    const key = e.key;
    if (/^[1-9]$/.test(key)) {
      const idx = Number(key);
      if (state.step === 'category') {
        const names = Object.keys(DATA.categories);
        if (idx <= names.length) selectCategory(names[idx - 1]);
      } else if (state.step === 'fish' && state.category) {
        const names = DATA.categories[state.category] || [];
        if (idx <= names.length) selectFish(names[idx - 1]);
      }
    } else if (key === 'Backspace') {
      if (state.step === 'fish') goBack();
    } else if (key === 'h' || key === 'H') {
      goHome();
    }
  }

  function about(){
    alert(
`사용법
1) 카테고리 선택 → 어종 선택 → 전체 항목 자동 출력
2) 단축키: 1~9 선택, Backspace 뒤로, H 처음`);
  }

  // ---------- 초기화 ----------
  $btnHome.onclick = goHome;
  $btnBack.onclick = goBack;
  $btnAll.style.display = 'none';   // 항상 숨김
  $btnOther.style.display = 'none'; // 항상 숨김
  $btnAll.onclick = () => {};
  $btnOther.onclick = () => {};
  $btnNew.onclick = () => window.open(location.href, '_blank', 'noopener,noreferrer');
  $btnAbout.onclick = about;
  document.addEventListener('keydown', onKey);

  (async () => {
    await loadData();
    renderCategories();
    renderContentInitial();
  })();
})();
