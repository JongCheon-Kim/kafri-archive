/* 수산물 건강 챗봇 – 대화형 로직 (설계서 준수)
   단계: 카테고리 선택 -> 어종 선택 -> 세부 항목(7종) 선택/전체보기
   뒤로/처음으로 내비게이션 포함
*/
(function () {
  const logEl = document.getElementById('log');
  const actionsEl = document.getElementById('actions');
  const catListEl = document.getElementById('catList');
  const fishListEl = document.getElementById('fishList');
  const btnBack = document.getElementById('btnBack');
  const btnHome = document.getElementById('btnHome');

  const SECTION_KEYS = [
    '출처','주요영양소','약효 및 효용','제철 및 선택법','조리 포인트','어울리는 요리','레시피'
  ];

  let DB = null;
  let state = { cat:null, fish:null, stack:[] };

  fetch('health_fish.json?_=' + Date.now())
    .then(r => r.json())
    .then(json => {
      DB = json;
      home();
    })
    .catch(err=>{
      sys('데이터를 불러오지 못했습니다: ' + err.message);
    });

  // ---------- UI Helpers ----------
  function clear(el){ while(el.firstChild) el.removeChild(el.firstChild); }
  function msg(html){ const p=document.createElement('div'); p.className='msg'; p.innerHTML=html; logEl.appendChild(p); logEl.scrollTop=logEl.scrollHeight; }
  function sys(text){ msg(`<b>·</b> ${escapeHtml(text)}`); }
  function title(text){ msg(`<b>${escapeHtml(text)}</b>`); }
  function chips(container, items, onclick){
    clear(container);
    items.forEach(label=>{
      const span=document.createElement('span');
      span.className='chip';
      span.textContent=label;
      span.onclick=()=>onclick(label);
      container.appendChild(span);
    });
  }
  function buttons(list){
    clear(actionsEl);
    list.forEach(({label,action})=>{
      const b=document.createElement('button');
      b.className='btn';
      b.textContent=label;
      b.onclick=action;
      actionsEl.appendChild(b);
    });
  }
  function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

  // ---------- Navigation ----------
  function home(){
    state.stack.length=0;
    state.cat=null; state.fish=null;
    clear(logEl); clear(actionsEl);
    title('카테고리를 선택하세요.');
    const cats = DB.categories.map(c=>c.name);
    chips(catListEl, cats, selectCategory);
    clear(fishListEl);
    buttons([]);
  }

  function back(){
    if (state.stack.length===0) return;
    const prev = state.stack.pop();
    if (prev === 'fish'){
      // 돌아가면 카테고리 선택 상태
      state.fish=null;
      showFishList();
    } else if (prev === 'cat'){
      // 맨 처음
      home();
    } else if (prev === 'section'){
      showSections();
    }
  }

  // ---------- Steps ----------
  function selectCategory(name){
    state.stack.push('cat');
    state.cat = DB.categories.find(c=>c.name===name);
    state.fish=null;
    title(`[${name}] 어종을 선택하세요.`);
    showFishList();
  }

  function showFishList(){
    const list = state.cat.items.map(i=>i.name);
    chips(fishListEl, list, selectFish);
    buttons([
      {label:'전체 보기', action:()=>{ sys('전체 보기는 어종 선택 후 이용할 수 있습니다. 어종을 먼저 선택해주세요.'); }},
    ]);
  }

  function selectFish(name){
    state.stack.push('fish');
    state.fish = state.cat.items.find(i=>i.name===name);
    title(`[${state.cat.name} · ${name}]`);
    showSections();
  }

  function showSections(){
    const name = state.fish.name;
    sys('세션을 선택하세요.');
    buttons([
      {label:'전체 보기', action:()=>showAllSections()},
      ...SECTION_KEYS.map(key=>({label:key, action:()=>showOne(key)})),
    ]);
  }

  function showOne(key){
    state.stack.push('section');
    const val = state.fish.sections[key] || '자료 없음';
    title(`🔎 ${key}`);
    msg(escapeHtml(val));
    buttons([
      {label:'다른 항목', action:()=>{ state.stack.pop(); showSections(); }},
      {label:'전체 보기', action:()=>showAllSections()},
    ]);
  }

  function showAllSections(){
    title('📚 전체 보기');
    SECTION_KEYS.forEach(k=>{
      const v = state.fish.sections[k];
      if (v){ msg(`<b>· ${k}</b>`); msg(escapeHtml(v)); }
    });
    buttons([
      {label:'다른 항목', action:()=>showSections()},
    ]);
  }

  // nav
  btnBack.onclick = back;
  btnHome.onclick = home;
})();
