(() => {
  const $ = (sel) => document.querySelector(sel);
  const categoryList = $('#categoryList');
  const fishList = $('#fishList');
  const content = $('#content');
  const btnAll = $('#btnAll');
  const btnSource = $('#btnSource');

  let DATA = null;
  let currentCategory = null;
  let currentFish = null;

  // ---------- 유틸 ----------
  const htmlEscape = (s='') => s.replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const log = (...args) => console.log('[health-fish]', ...args);

  // ---------- 렌더 ----------
  function renderCategories() {
    categoryList.innerHTML = '';
    Object.keys(DATA.categories).forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = cat;
      chip.onclick = () => {
        currentCategory = cat;
        currentFish = null;
        [...categoryList.children].forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        renderFish();
        content.textContent = `[${cat}] 어종을 선택하세요.`;
      };
      categoryList.appendChild(chip);
    });
  }

  function renderFish() {
    fishList.innerHTML = '';
    const fishes = DATA.categories[currentCategory] || [];
    fishes.forEach(f => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = f;
      chip.onclick = () => {
        currentFish = f;
        [...fishList.children].forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        renderDetails();
      };
      fishList.appendChild(chip);
    });
  }

  function renderDetails(mode='source') {
    if (!currentCategory || !currentFish) {
      content.textContent = '세션을 선택하세요.';
      return;
    }
    const d = (DATA.details && DATA.details[currentFish]) || {};
    const blocks = [
      ['출처', d['출처']],
      ['주요영양소', d['주요영양소']],
      ['약효 및 효용', d['약효 및 효용']],
      ['제철 및 선택법', d['제철 및 선택법']],
      ['조리 포인트', d['조리 포인트']],
      ['어울리는 요리', d['어울리는 요리']],
      ['레시피', d['레시피']]
    ];

    if (mode === 'all') {
      const lines = [];
      lines.push(`카테고리를 선택하세요.\n[${currentCategory}] 어종을 선택하세요.\n`);
      lines.push(`[${currentCategory} · ${currentFish}]`);
      lines.push('・ 세션을 선택하세요.\n');

      lines.push('📰 전체 보기');
      blocks.forEach(([k, v]) => {
        lines.push(`- ${k}`); 
        lines.push(v ? String(v) : '정보 없음');
      });
      content.textContent = lines.join('\n');
      return;
    }

    if (mode === 'source') {
      const val = d['출처'] ? String(d['출처']) : '정보 없음';
      content.textContent = `카테고리를 선택하세요.\n[${currentCategory}] 어종을 선택하세요.\n\n[${currentCategory} · ${currentFish}]\n・ 세션을 선택하세요.\n\n🪪 출처\n${val}`;
    }
  }

  // ---------- 버튼 ----------
  btnAll && (btnAll.onclick = () => {
    if (!currentFish) {
      content.textContent = '· 전체 보기는 어종 선택 후 이용할 수 있습니다. 어종을 먼저 선택해 주세요.';
      return;
    }
    renderDetails('all');
  });

  btnSource && (btnSource.onclick = () => {
    if (!currentFish) {
      content.textContent = '· 출처는 어종 선택 후 이용할 수 있습니다. 어종을 먼저 선택해 주세요.';
      return;
    }
    renderDetails('source');
  });

  // ---------- 데이터 로드 ----------
  async function loadData() {
    // 1) 원본 JSON 시도 (캐시 무효화)
    const url = `health_fish.json?ts=${Date.now()}`;
    try {
      const res = await fetch(url, {cache:'no-store'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || !json.categories) throw new Error('Invalid schema');
      log('loaded from file', url);
      return json;
    } catch (err) {
      console.warn('JSON fetch failed -> fallback to inline', err);
    }

    // 2) 인라인 폴백(json 스니펫)
    try {
      const inline = document.getElementById('healthDataInline');
      if (inline && inline.textContent.trim()) {
        const json = JSON.parse(inline.textContent);
        if (!json || !json.categories) throw new Error('Inline invalid');
        log('loaded from inline fallback');
        return json;
      }
    } catch (e) {
      console.error('Inline parse failed', e);
    }
    return null;
  }

  // ---------- 시작 ----------
  window.addEventListener('DOMContentLoaded', async () => {
    DATA = await loadData();
    if (!DATA) {
      content.innerHTML = '데이터 로드에 실패했습니다. <br>• <code>docs/health_fish.json</code> 존재 여부/경로/철자를 확인하세요.';
      return;
    }

    // details가 없을 수 있는 초기 상태를 위해 안전 가드
    DATA.details = DATA.details || {};
    renderCategories();
    content.textContent = '카테고리를 먼저 선택하세요.';
  });
})();
