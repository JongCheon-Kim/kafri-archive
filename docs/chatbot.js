/* 휴대용 챗봇 JS (GitHub Pages 호환)
   - health_fish.json을 우선 fetch('./health_fish.json?v=20250919')
   - 실패하면 index.html 내 인라인 JSON(#healthDataInline) 폴백
   - 키보드: 1~9, Backspace, H(홈), A(전체), O(다른항목), N(새창), ?(도움말)
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

  // ----- 데이터 로드 (fetch -> inline fallback)
  async function loadData() {
    // GitHub Pages 프로젝트 경로에서도 동작하도록 './' + 캐시버스터 적용
    const url = './health_fish.json?v=20250919';
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const text = await res.text();
      // BOM 제거 및 안전 파싱
      const clean = text.replace(/^\uFEFF/, '');
      DATA = JSON.parse(clean);
      return;
    } catch (e) {
      // 인라인 폴백
      const inline = document.getElementById('healthDataInline');
      if (inline && inline.textContent) {
        try {
          DATA = JSON.parse(inline.textContent.trim());
        } catch (err) {
          alert('내장 데이터 파싱 실패. JSON을 확인하세요.');
        }
      } else {
        alert('데이터 로드 실패(health_fish.json / inline).');
      }
    }
  }

  // ----- 렌더링
  function renderCategories() {
    if (!DATA) return;
    $cat.innerHTML = '';
    Object.keys(DATA.categories).forEach((name, idx) => {
      const b = document.createElement('button');
      b.className = 'chip' + (state.category === name ? ' active' : '');
      b.textContent = `${name}`;
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
      b.textContent = `${name}`;
      b.setAttribute('data-idx', String(idx + 1));
      b.onclick = () => selectFish(name);
      $fish.appendChild(b);
    });
  }

  function renderContentInitial() {
    $crumb.textContent = '';
    $content.textContent = '카테고리를 선택하세요.';
  }

  function renderPromptFish() {
    $crumb.textContent = `${state.category} ▸ 어종 선택`;
    $content.textContent = `[${state.category}] 어종을 선택하세요.\n\n· 전체 보기는 어종 선택 후 이용할 수 있습니다. 어종을 먼저 선택해주세요.`;
  }

  function renderDetails(single = false) {
    if (!state.fish || !DATA) return;
    const d = (DATA.details && DATA.details[state.fish]) || {};
    const order = ['출처','주요영양소','약효 및 효용','제철 및 선택법','조리 포인트','어울리는 요리','레시피'];

    // details 없을 때 사용자 안내
    const hasAny = order.some((k) => !!d[k]);
    if (!hasAny) {
      $crumb.textContent = `${state.category} ▸ ${state.fish}`;
      $content.textContent =
        `[${state.category} · ${state.fish}]\n` +
        '세부 정보가 비어 있습니다. health_fish.json에 해당 어종의 details 항목을 추가하세요.';
      return;
    }

    let out = '';
    if (!single) out += '🧭 전체 보기\n';
    out += `\n[${state.category} · ${state.fish}]\n`;
    order.forEach((k) => {
      if (d[k]) {
        const icon = (k === '출처') ? '🔖' :
                     (k === '주요영양소') ? '🍙' :
                     (k === '약효 및 효용') ? '💊' :
                     (k === '제철 및 선택법') ? '🗓️' :
                     (k === '조리 포인트') ? '🍳' :
                     (k === '어울리는 요리') ? '🥢' :
                     (k === '레시피') ? '📜' : '•';
        out += `\n${icon} ${k}\n${d[k]}\n`;
      }
    });
    $crumb.textContent = `${state.category} ▸ ${state.fish}`;
    $content.textContent = out.trim();
  }

  // ----- 상태 전환
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
    if (state.step === 'details') {
      state.step = 'fish';
      state.fish = null;
      renderFishes();
      renderPromptFish();
    } else {
      goHome();
    }
  }

  function goHome() {
    state = { category: null, fish: null, step: 'category' };
    renderCategories();
    $fish.innerHTML = '';
    renderContentInitial();
  }

  function showAll() {
    if (!state.fish) return alert('어종을 먼저 선택하세요.');
    renderDetails(false);
  }

  function otherItem() {
    if (!state.category) return alert('카테고리를 먼저 선택하세요.');
    state.fish = null;
    state.step = 'fish';
    renderFishes();
    renderPromptFish();
  }

  // ----- 키보드 단축키
  function onKey(e) {
    const key = e.key;
    if (/^[1-9]$/.test(key)) {
      const idx = Number(key);
      if (state.step === 'category') {
        const names = Object.keys(DATA.categories);
        if (idx <= names.length) selectCategory(names[idx - 1]);
      } else if (state.step === 'fish' && state.category) {
        const names = DATA.categories[state.category];
        if (idx <= names.length) selectFish(names[idx - 1]);
      }
    } else if (key === 'Backspace') {
      goBack();
    } else if (key === 'h' || key === 'H') {
      goHome();
    } else if (key === 'a' || key === 'A') {
      showAll();
    } else if (key === 'o' || key === 'O') {
      otherItem();
    } else if (key === 'n' || key === 'N') {
      window.open(location.href, '_blank', 'noopener,noreferrer');
    } else if (key === '?') {
      about();
    }
  }

  // ----- 도움말
  function about(){
    alert(
`사용법 안내
1) 카테고리 선택 → 어종 선택 → 세부 항목 자동 정렬 출력
2) 단축키:
   - 숫자 1~9: 목록에서 선택
   - Backspace: 뒤로
   - H: 처음으로
   - A: 전체 보기
   - O: 다른 항목
   - N: 새 창
   - ?: 도움말
GitHub Pages 호환: health_fish.json 경로는 ./ 기준이며 캐시 무효화가 적용됩니다.`);
  }

  // 이벤트 바인딩
  $btnHome.onclick = goHome;
  $btnBack.onclick = goBack;
  $btnAll.onclick = showAll;
  $btnOther.onclick = otherItem;
  $btnNew.onclick = () => window.open(location.href, '_blank', 'noopener,noreferrer');
  $btnAbout.onclick = about;
  document.addEventListener('keydown', onKey);

  // 초기화
  (async () => {
    await loadData();
    renderCategories();
    renderContentInitial();
  })();
})();
