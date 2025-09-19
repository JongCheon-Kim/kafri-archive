/* 설계서 준수 버전 — 단일 스키마 전용 (categories:Object, items:Object) */
const SECTION_ORDER = ["전체 보기","주요영양소","약효및효용","제철및선택법","조리포인트","어울리는요리","레시피","출처"];

let DATA = { categories:{}, items:{} };
let state = { cat:null, fish:null, view:null };

const $ = (id)=>document.getElementById(id);
const esc = (s)=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

async function loadData(){
  const r = await fetch("health_fish.json",{cache:"no-store"});
  DATA = await r.json();
}

/* --- 메시지/칩 --- */
function chip(label, onClick){
  const b = document.createElement("button");
  b.className = "chip"; b.textContent = label; b.onclick = onClick;
  return b;
}
function postBot(text, chips=[]){
  const log = $("chat-log");
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = esc(text);
  if(chips.length){
    const box = document.createElement("div");
    chips.forEach(c=>box.appendChild(c));
    div.appendChild(box);
  }
  log.appendChild(div); log.scrollTop = log.scrollHeight;
}

/* --- 렌더러: 카테고리/어종/섹션 --- */
function showCategories(){
  state = {cat:null, fish:null, view:null};
  $("category-box").innerHTML = "";
  Object.keys(DATA.categories).forEach(cat=>{
    const b = document.createElement("button");
    b.className = "btn"; b.textContent = cat;
    b.onclick = ()=>{ state.cat=cat; showFishList(cat); };
    $("category-box").appendChild(b);
  });
  $("fish-box").innerHTML = "";
  $("section-menu").textContent = "섹션을 선택하세요.";
  $("detail-box").innerHTML = "";
  postBot("카테고리를 선택하세요.", Object.keys(DATA.categories).map(cat=>chip(cat,()=>{state.cat=cat; showFishList(cat);})));
}

function showFishList(cat){
  $("fish-box").innerHTML = "";
  (DATA.categories[cat]||[]).forEach(name=>{
    const b = document.createElement("button");
    b.className = "btn"; b.textContent = name;
    b.onclick = ()=>{ state.fish=name; showSectionMenu(); };
    $("fish-box").appendChild(b);
  });
  postBot(`[${cat}] 어종을 선택하세요.`, (DATA.categories[cat]||[]).map(n=>chip(n,()=>{state.fish=n; showSectionMenu();})).concat([
    chip("뒤로", ()=>showCategories()), chip("처음으로", ()=>showCategories())
  ]));
}

function showSectionMenu(){
  const item = DATA.items[state.fish]||{};
  const menu = $("section-menu"); menu.innerHTML = "";
  const exist = SECTION_ORDER.filter(sec=>{
    if(sec==="전체 보기") return true;
    if(sec==="레시피") return item.레시피 && item.레시피.이름;
    return Array.isArray(item[sec]) ? item[sec].length>0 : Array.isArray(item.주요영양소) ? item.주요영양소.length>0 : !!item[sec];
  });
  exist.forEach(sec=>{
    menu.appendChild(chip(sec,()=>{ state.view=sec; renderSection(); askMore(); }));
  });
  $("detail-box").innerHTML = "";
  postBot(`[${state.cat} · ${state.fish}] 섹션을 선택하세요.`, exist.map(sec=>chip(sec,()=>{state.view=sec; renderSection(); askMore();})).concat([
    chip("뒤로", ()=>{ state.fish=null; showFishList(state.cat); }),
    chip("처음으로", ()=>showCategories())
  ]));
}

function renderSection(){
  const item = DATA.items[state.fish]||{};
  const box = $("detail-box");
  const sec = state.view||"전체 보기";
  const blocks = [];

  function card(title, html){
    const d = document.createElement("div");
    d.className = "card sect"; d.innerHTML = `<h3>${esc(title)}</h3>${html}`;
    blocks.push(d);
  }
  function listToHtml(arr){ return `<ul>${arr.map(x=>`<li>${esc(Array.isArray(x)?x.join(" — "):x)}</li>`).join("")}</ul>`; }

  box.innerHTML = `<div class="muted">[${esc(state.cat)} · ${esc(state.fish)}]</div>`;

  const renderOne = (label, content)=>{
    if(!content) return;
    if(label==="주요영양소" && Array.isArray(content)){
      card(label, listToHtml(content));
    }else if(label==="레시피" && content && content.이름){
      const ing = (content.재료||[]).map(i=>`<li>${esc(i)}</li>`).join("");
      const steps = (content.순서||[]).map(s=>`<li>${esc(s)}</li>`).join("");
      card(label, `<div><strong>${esc(content.이름)}</strong></div><div class="row">
        <div><h4>재료</h4><ul>${ing}</ul></div>
        <div><h4>순서</h4><ol>${steps}</ol></div>
      </div>`);
    }else if(Array.isArray(content)){
      card(label, listToHtml(content));
    }else if(typeof content==="string"){
      card(label, `<p>${esc(content)}</p>`);
    }
  };

  if(sec==="전체 보기"){
    ["표기","출처","주요영양소","약효및효용","제철및선택법","조리포인트","어울리는요리","레시피"].forEach(k=>renderOne(k, item[k]));
  }else{
    renderOne(sec, item[sec]);
  }
  blocks.forEach(b=>box.appendChild(b));
}

/* 루프/내비 */
function askMore(){
  postBot("더 필요하신가요?", [
    chip("예(섹션 선택 계속)", ()=>showSectionMenu()),
    chip("뒤로", ()=>{ state.fish=null; showFishList(state.cat); }),
    chip("처음으로", ()=>showCategories())
  ]);
}

/* URL 파라미터(선택) */
function applyURL(){
  const p = new URLSearchParams(location.search);
  const cat = p.get("cat"), fish = p.get("fish"), sec = p.get("sec");
  if(cat && DATA.categories[cat]){ state.cat=cat; showFishList(cat); }
  if(state.cat && fish && DATA.items[fish]){ state.fish=fish; showSectionMenu(); }
  if(sec){ state.view=sec; renderSection(); }
}

/* 초기화 */
window.addEventListener("load", async ()=>{
  await loadData();
  showCategories();
  applyURL();
});
