/* -----------------------------------------------------------
 * 수산물 건강 챗봇 · 런타임 호환 강화 버전
 * - health_fish.json 스키마 변형(배열/객체) 자동 호환
 * - DOM id 제각각이어도 다중 셀렉터로 자동 매칭
 * - 캐시 무력화(fetch ?ts=Date.now())
 * - 섹션 누락/부분 데이터도 안전 렌더링
 * ----------------------------------------------------------- */

(() => {
  // ---------- DOM 유틸 ----------
  const pick = (selectorList) => {
    for (const sel of selectorList.split(",")) {
      const el = document.querySelector(sel.trim());
      if (el) return el;
    }
    return null;
  };

  const $cats   = pick('#category,#categoryList,[data-role="categories"],.categories,.category');
  const $items  = pick('#species,#speciesList,[data-role="species"],.species,.items,.fishes');
  const $detail = pick('#detail,#detailPanel,#detailContent,[data-role="detail"],.detail,.panel');

  // 버튼은 텍스트로도 매칭(HTML마다 id 다를 수 있어 대비)
  const findButtonByText = (txt) => {
    const btns = Array.from(document.querySelectorAll('button, .btn, a[role="button"]'));
    return btns.find(b => (b.textContent || '').replace(/\s/g,'').includes(txt));
  };
  const $btnAll  = findButtonByText('전체보기');
  const $btnSrc  = findButtonByText('출처');

  // ---------- 안전 출력 유틸 ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  const bullet = (label, body) => {
    if (!body || (Array.isArray(body) && body.length === 0)) return '';
    const txt = Array.isArray(body) ? body.join('<br>') : String(body);
    return `
      <div style="margin:.35rem 0;">
        <span style="opacity:.9">${label}</span>
        <div style="margin:.25rem 0 0 .2rem; line-height:1.6">${txt}</div>
      </div>`;
  };

  const sectionLabel = {
    introSources: '도입부 출처',       // 예: 동국여지승람, 조선의 수산, 경기도지리지...
    source: '출처',                   // 책(생선해산물 건강사전 등)
    nutrients: '주요영양소',
    efficacy: '약효 및 효용',
    season: '제철 및 선택법',
    tips: '조리 포인트',
    pairing: '어울리는 요리',
    recipe: '레시피'
  };

  // ---------- 데이터 로드 & 정규화 ----------
  const DATA_URL = (document.currentScript?.dataset?.json) || 'health_fish.json';
  const bust = (url) => `${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}`;

  const normalize = (raw) => {
    // 1) { categories: [...] } 형태
    if (raw && Array.isArray(raw.categories)) {
      return raw.categories.map(c => ({
        id: c.id ?? c.key ?? c.name,
        name: c.name ?? c.id ?? c.key,
        items: Array.isArray(c.items) ? c.items : []
      }));
    }
    // 2) { categories: { "고혈압 예방": [...], "간 기능 향상": [...] } } 형태
    if (raw && raw.categories && typeof raw.categories === 'object' && !Array.isArray(raw.categories)) {
      return Object.keys(raw.categories).map(k => ({
        id: k,
        name: k,
        items: Array.isArray(raw.categories[k]) ? raw.categories[k] : []
      }));
    }
    // 3) 배열 최상위(바로 카테고리 배열)
    if (Array.isArray(raw)) {
      return raw.map(c => ({
        id: c.id ?? c.key ?? c.name,
        name: c.name ?? c.id ?? c.key,
        items: Array.isArray(c.items) ? c.items : []
      }));
    }
    // 4) 실패시 빈 배열
    return [];
  };

  let CATEGORIES = [];
  let currentCategory = null;
  let currentItem = null;

  // ---------- 렌더링 ----------
  const clearEl = (el) => { if (el) el.innerHTML = ''; };

  const renderCategories = () => {
    if (!$cats) return;
    clearEl($cats);
    CATEGORIES.forEach(cat => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tag';
      b.style.cssText = `
        margin: .25rem .35rem .25rem 0; padding:.35rem .7rem; border-radius: 999px;
        background: #1e293b; color:#e5e7eb; border: 1px solid #334155; cursor:pointer;`;
      b.textContent = cat.name;
      b.addEventListener('click', () => {
        currentCategory = cat;
        currentItem = null;
        renderItems();
        renderPrompt(`카테고리를 선택하세요.<br><span style="opacity:.85">[${esc(cat.name)}] 어종을 선택하세요.</span>`);
      });
      $cats.appendChild(b);
    });
  };

  const renderItems = () => {
    if (!$items) return;
    clearEl($items);
    if (!currentCategory) return;
    currentCategory.items.forEach(it => {
      const name = it.name ?? it.title ?? it.id;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tag';
      b.style.cssText = `
        margin: .25rem .35rem .25rem 0; padding:.35rem .7rem; border-radius: 999px;
        background: #0f172a; color:#e5e7eb; border: 1px solid #334155; cursor:pointer;`;
      b.textContent = name;
      b.addEventListener('click', () => {
        currentItem = it;
        renderDetail(it);
      });
      $items.appendChild(b);
    });
  };

  const renderPrompt = (html) => {
    if (!$detail) return;
    $detail.innerHTML = `
      <div style="white-space:pre-wrap; line-height:1.7">${html}</div>
    `;
  };

  const renderDetail = (item) => {
    if (!$detail) return;
    const name = esc(item.name ?? item.title ?? item.id ?? '');
    const parts = [];

    // 섹션 정렬 및 표시
    const order = ['introSources','source','nutrients','efficacy','season','tips','pairing','recipe'];
    for (const key of order) {
      const val = item[key];
      // 문자열/배열/객체 모두 허용 (객체면 적당히 stringify)
      let body = '';
      if (Array.isArray(val)) body = val.map(v => esc(v)).join('<br>');
      else if (val && typeof val === 'object') body = esc(JSON.stringify(val));
      else if (val != null) body = esc(val);
      if (body) parts.push(bullet(`· ${sectionLabel[key]}`, body));
    }

    const header = `<div style="font-weight:600; font-size:1.05rem; margin-bottom:.5rem">[${esc(currentCategory?.name ?? '')} · ${name}]</div>`;

    if (parts.length === 0) {
      $detail.innerHTML = `${header}<div style="opacity:.8">세부 정보가 없습니다.</div>`;
      return;
    }

    $detail.innerHTML = header + parts.join('');
  };

  const showAllSections = () => {
    if (!currentItem) return;
    renderDetail(currentItem);
  };

  const showSourceOnly = () => {
    if (!$detail || !currentItem) return;
    const name = esc(currentItem.name ?? currentItem.title ?? currentItem.id ?? '');
    const src = currentItem.source || currentItem.introSources;
    let body = '';
    if (Array.isArray(src)) body = src.map(v => esc(v)).join('<br>');
    else if (src && typeof src === 'object') body = esc(JSON.stringify(src));
    else if (src) body = esc(src);
    $detail.innerHTML =
      `<div style="font-weight:600; font-size:1.05rem; margin-bottom:.5rem">
        [${esc(currentCategory?.name ?? '')} · ${name}]</div>` +
      bullet('· 출처', body || '표시할 출처가 없습니다.');
  };

  // ---------- 이벤트 ----------
  if ($btnAll)  $btnAll.addEventListener('click', showAllSections);
  if ($btnSrc)  $btnSrc.addEventListener('click', showSourceOnly);

  // ---------- 시작 ----------
  fetch(bust(DATA_URL))
    .then(r => r.json())
    .then(raw => {
      CATEGORIES = normalize(raw);
      renderCategories();
      renderPrompt('섹션을 선택하세요.<br><span style="opacity:.7">카테고리를 선택하면 오른쪽에 어종이 나타납니다. 어종을 선택하면 ‘출처 / 주요영양소 / 약효 및 효용 / 제철 및 선택법 / 조리 포인트 / 어울리는 요리 / 레시피’를 고를 수 있습니다.</span>');
    })
    .catch(err => {
      console.error('health_fish.json 로드 실패:', err);
      renderPrompt('데이터 로드 중 오류가 발생했습니다. (콘솔 확인)');
    });
})();
