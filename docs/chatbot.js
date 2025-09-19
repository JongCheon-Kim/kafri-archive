v/* 수산물 건강 챗봇 – 하위호환 스키마 흡수/렌더 안정화 (2025-09-19) */

let DB = null;                 // 정규화된 내부 표현
let RAW = null;                // 원본 JSON
let currentCategory = null;
let currentFish = null;

window.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadDB();
  renderCategoryChips();
  // 첫 진입: 첫 카테고리 자동 선택
  const cats = Object.keys(DB.categories);
  if (cats.length) selectCategory(cats[0]);
}

async function loadDB() {
  const res = await fetch("health_fish.json", { cache: "no-cache" });
  RAW = await res.json();
  DB = normalizeDB(RAW);
}

/* ==================== 정규화 ==================== */
/*
내부표현(DB):
{
  categories: { "카테고리명": ["어종명", ...], ... },
  items: { "어종명": { ...섹션... } }
}
- 기존 구식 스키마 그대로면 그대로 채택
- 새 스키마(categories: [{name, species:[{name, ...}]}])도 자동 변환
*/
function normalizeDB(data) {
  // 구식 스키마인지?
  const looksOld =
    data &&
    data.categories &&
    !Array.isArray(data.categories) &&
    typeof data.categories === "object" &&
    data.items && typeof data.items === "object";

  if (looksOld) return data; // 그대로 사용

  // 새 스키마 → 변환
  const out = { categories: {}, items: {} };
  const cats = Array.isArray(data?.categories) ? data.categories : [];

  for (const c of cats) {
    const cname = String(c?.name ?? "").trim();
    if (!cname) continue;
    out.categories[cname] = [];

    const spList = Array.isArray(c?.species) ? c.species : [];
    for (const sp of spList) {
      const fname = String(sp?.name ?? "").trim();
      if (!fname) continue;
      out.categories[cname].push(fname);

      // 필드 매핑: 영문키 → 한글키 보정
      const item = {};
      // 출처
      item["출처"] = arr(sp["출처"]) || arr(sp["source"]) || [];
      // 주요영양소: 객체/배열/문자열 모두 허용
      item["주요영양소"] = normalizeNutrients(
        sp["주요영양소"] ||
        objToPairs(sp["nutrients"]) ||
        sp["nutrients"]
      );
      // 불릿 섹션
      item["약효및효용"] = arr(sp["약효및효용"]) || arr(sp["효능"]) || [];
      item["제철및선택법"] = arr(sp["제철및선택법"]) || arr(sp["제철"]) || [];
      item["조리포인트"] = arr(sp["조리포인트"]) || arr(sp["조리 포인트"]) || arr(sp["tips"]) || [];
      item["어울리는요리"] = arr(sp["어울리는요리"]) || arr(sp["pairings"]) || [];

      // 개요/열량(선택)
      if (sp["개요"]) item["개요"] = sp["개요"];
      if (sp["열량"]) item["열량"] = sp["열량"];

      // 레시피: 다양한 키 수용
      const r = sp["레시피"] || sp["recipe"];
      if (r && typeof r === "object") {
        item["레시피"] = {
          "이름": r["이름"] || r["name"] || "",
          "재료": arr(r["재료"]) || arr(r["ingredients"]) || [],
          "만드는법": arr(r["만드는법"]) || arr(r["steps"]) || arr(r["순서"]) || []
        };
      }

      out.items[fname] = item;
    }
  }
  return out;
}

function objToPairs(o){
  if (!o || typeof o !== "object") return [];
  return Object.entries(o).map(([k,v]) => [k, String(v)]);
}

function arr(v){
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") return v.split("|").map(s=>s.trim()).filter(Boolean);
  return [];
}

/* ==================== UI: Chips ==================== */

function renderCategoryChips() {
  const box = el("#categoryChips");
  box.innerHTML = "";
  Object.keys(DB.categories).forEach(cat => {
    const chip = chipNode(cat, () => selectCategory(cat));
    box.appendChild(chip);
  });
}

function renderFishChips(category) {
  const box = el("#fishChips");
  box.innerHTML = "";
  (DB.categories[category] || []).forEach(name => {
    const chip = chipNode(name, () => selectFish(name));
    box.appendChild(chip);
  });
}

function chipNode(text, onClick) {
  const d = document.createElement("button");
  d.className = "chip";
  d.type = "button";
  d.textContent = text;
  d.onclick = onClick;
  return d;
}

/* ==================== Actions ==================== */

function selectCategory(cat) {
  currentCategory = cat;
  renderFishChips(cat);
  const v = el("#view");
  v.innerHTML = `
    <div class="section-title">👉 카테고리: ${escapeHTML(cat)}</div>
    <div class="muted small">어종을 선택하세요.</div>
  `;
}

function selectFish(name) {
  currentFish = name;
  const item = DB.items?.[name];
  const v = el("#view");
  if (!item) {
    v.innerHTML = warnBox("데이터를 찾을 수 없습니다.");
    return;
  }

  v.innerHTML = `
    <div class="section-title">🐟 ${escapeHTML(name)}</div>
    ${sectionOverview(item)}
    ${sectionNutrients(item)}
    ${sectionBullets("약효 및 효용", item["약효및효용"])}
    ${sectionBullets("제철 및 선택법", item["제철및선택법"])}
    ${sectionBullets("조리 포인트", item["조리포인트"])}
    ${sectionBullets("어울리는 요리", item["어울리는요리"])}
    ${sectionRecipe(item)}
    ${sectionSource(item)}
  `;
}

/* ==================== Section builders ==================== */

function sectionOverview(item) {
  const lines = [];
  if (item?.개요) lines.push(item.개요);
  const kcal = item?.열량;
  if (kcal) lines.push(`열량(100g): ${escapeHTML(kcal)}`);
  return lines.length ? bubble(lines.join("<br/>")) : "";
}

function sectionNutrients(item) {
  const arrN = normalizeNutrients(item?.["주요영양소"]);
  if (!arrN.length) return "";
  const head = `
    <table><thead><tr>
      <th style="width:30%">영양소</th>
      <th>수치/설명</th>
    </tr></thead><tbody>
  `;
  const body = arrN.map(([k, v]) =>
    `<tr><td>${escapeHTML(k)}</td><td>${escapeHTML(v)}</td></tr>`).join("");
  return bubble(`<div class="section-title">주요 영양소</div>${head}${body}</tbody></table>`);
}

function sectionBullets(title, arrIn) {
  const list = arr(arrIn);
  if (!list.length) return "";
  return bubble(`
    <div class="section-title">${escapeHTML(title)}</div>
    <ul class="inline-list">${list.map(s=>`<li>${escapeHTML(s)}</li>`).join("")}</ul>
  `);
}

function sectionRecipe(item) {
  const r = item?.["레시피"];
  if (!r) return bubble(`<div class="section-title">레시피</div><div class="empty">자료가 없습니다.</div>`);

  const name = r["이름"] || r["name"] || "";
  const ing  = arr(r["재료"]) || [];
  const steps= arr(r["만드는법"]) || arr(r["steps"]) || arr(r["순서"]) || [];

  if (!name && !ing.length && !steps.length) {
    return bubble(`<div class="section-title">레시피</div><div class="empty">자료가 없습니다.</div>`);
  }

  return bubble(`
    <div class="section-title">레시피</div>
    ${name ? `<div class="recipe-name">• ${escapeHTML(name)}</div>` : ""}
    ${ing.length ? `<div class="muted small" style="margin-top:6px">재료</div><ul class="inline-list">${ing.map(s=>`<li>${escapeHTML(s)}</li>`).join("")}</ul>` : ""}
    ${steps.length ? `<div class="muted small" style="margin-top:6px">만드는 법</div><ol class="inline-list">${steps.map(s=>`<li>${escapeHTML(s)}</li>`).join("")}</ol>` : ""}
  `);
}

function sectionSource(item) {
  const src = arr(item?.출처);
  if (!src.length) return "";
  return bubble(`
    <div class="section-title">출처</div>
    <ul class="inline-list">${src.map(s=>`<li>${escapeHTML(s)}</li>`).join("")}</ul>
  `);
}

/* ==================== Helpers ==================== */

function el(sel){ return document.querySelector(sel); }

function bubble(html){ return `<div class="bubble">${html}</div>`; }

function warnBox(msg){ return bubble(`<div class="empty">${escapeHTML(msg)}</div>`); }

function normalizeNutrients(val){
  // 허용: [ ["아미노산","풍부"], {"영양소":"타우린","설명":"함유"}, "단백질:11g/100g" ] 또는
  //       { "단백질":"11g", "칼슘":"120mg" }
  if (!val) return [];
  if (Array.isArray(val)) {
    const out = [];
    for (const row of val){
      if (Array.isArray(row) && row.length>=2) out.push([String(row[0]), String(row[1])]);
      else if (typeof row === "object" && row){
        const k = row.영양소 || row.key || row.name;
        const v = row.설명 || row.value || row.desc || row.수치 || row.내용;
        if (k && v) out.push([String(k), String(v)]);
      } else if (typeof row === "string"){
        const idx = row.indexOf(":");
        if (idx>0) out.push([row.slice(0,idx).trim(), row.slice(idx+1).trim()]);
        else out.push([row.trim(), ""]);
      }
    }
    return out;
  }
  if (typeof val === "object") return Object.entries(val).map(([k,v]) => [k, String(v)]);
  if (typeof val === "string") {
    return val.split("|").map(s=>{
      const t = s.trim(); const i=t.indexOf(":");
      return i>0 ? [t.slice(0,i).trim(), t.slice(i+1).trim()] : [t,""];
    }).filter(Boolean);
  }
  return [];
}

function escapeHTML(s){
  return String(s ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

/* ==================== (선택) 역변환기: 구식 스키마로 덤프 ==================== */
// 필요시 개발자도구에서 dumpLegacy(DB) 호출 → 구식 JSON 구조로 콘솔에 출력
window.dumpLegacy = function(db = DB){
  const categories = {};
  const items = {};
  Object.entries(db.categories).forEach(([cat, list])=>{
    categories[cat] = list.slice();
  });
  Object.entries(db.items).forEach(([name, item])=>{
    items[name] = item;
  });
  console.log(JSON.stringify({ title:"수산물 건강 챗봇", categories, items }, null, 2));
};
