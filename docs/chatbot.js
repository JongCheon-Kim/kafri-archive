
let db = {};

async function loadDB() {
  try {
    const res = await fetch("health_fish.json", { cache: "no-cache" });
    db = await res.json();
    console.log("DB loaded:", db);
    showCategories();
  } catch (err) {
    console.error("DB load error", err);
  }
}

/** UI helpers */
function createChip(text, onclick, small = false) {
  const chip = document.createElement("div");
  chip.className = "chip" + (small ? " small" : "");
  chip.textContent = text;
  chip.onclick = onclick;
  return chip;
}

function pushBot(html) {
  const log = document.getElementById("log");
  const bubble = document.createElement("div");
  bubble.className = "msg bot";
  bubble.innerHTML = `<div class="bubble">${html}</div>`;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

function showCategories() {
  const quickbar = document.getElementById("quickbar");
  quickbar.innerHTML = "";
  quickbar.hidden = false;

  (db.categories || []).forEach(cat => {
    quickbar.appendChild(createChip(cat.name, () => showSpecies(cat)));
  });
}

function showSpecies(category) {
  const quickbar = document.getElementById("quickbar");
  quickbar.innerHTML = "";

  (category.species || []).forEach(sp => {
    quickbar.appendChild(createChip(sp.name, () => showSections(category.name, sp.name), true));
  });
}

/** 키 라벨 매핑 (JSON 키 -> UI 라벨) */
const KEY_LABELS = [
  ["주요영양소", "주요 영양소"],
  ["약효및효용", "약효 및 효용"],
  ["제철및선택법", "제철 및 선택법"],
  ["조리포인트", "조리 포인트"],
  ["어울리는요리", "어울리는 요리"],
  ["레시피", "레시피"],
  ["source", "출처"],
];

function showSections(catName, itemName) {
  const quickbar = document.getElementById("quickbar");
  quickbar.innerHTML = "";

  const cat = (db.categories || []).find(c => c.name === catName);
  if (!cat) return;
  const item = (cat.species || []).find(s => s.name === itemName);
  if (!item) return;

  // 상단에 "전체 보기" 버튼
  quickbar.appendChild(createChip("전체 보기", () => renderSection(catName, itemName, "ALL"), true));

  // 존재하는 키만 버튼으로
  KEY_LABELS.forEach(([key, label]) => {
    if (key in item) {
      quickbar.appendChild(createChip(label, () => renderSection(catName, itemName, key), true));
    }
  });
}

function normalizeRecipe(rec) {
  if (!rec) return ["자료가 없습니다."];
  // 문자열 -> 배열
  if (typeof rec === "string") return [rec];
  // 객체 하나 -> 배열화
  const arr = Array.isArray(rec) ? rec : [rec];

  return arr.map(r => {
    if (typeof r === "string") return r;
    let out = "";
    if (r.이름) out += `📌 <b>${r.이름}</b><br>`;
    if (r.재료) out += `🥕 재료: ${Array.isArray(r.재료) ? r.재료.join(", ") : r.재료}<br>`;
    const steps = r["만드는법"] || r["만드는 법"] || r.steps || r.방법;
    if (steps) {
      if (Array.isArray(steps)) {
        out += "👩‍🍳 만드는 법:<br>" + steps.map((s, i) => `${i + 1}) ${s}`).join("<br>");
      } else {
        out += "👩‍🍳 만드는 법: " + steps;
      }
    }
    return out;
  });
}

function renderSection(catName, itemName, sectionKey) {
  const cat = (db.categories || []).find(c => c.name === catName);
  if (!cat) return;
  const item = (cat.species || []).find(s => s.name === itemName);
  if (!item) return;

  // "전체 보기" 합본
  if (sectionKey === "ALL") {
    let html = `<h3>${item.name}</h3>`;
    if (item["주요영양소"]) {
      html += "<b>주요 영양소</b><br>";
      if (typeof item["주요영양소"] === "object") {
        const rows = Object.entries(item["주요영양소"]).map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
        html += `<table class="tbl"><tr><th>영양소</th><th>수치/설명</th></tr>${rows}</table>`;
      }
    }
    if (item["약효및효용"]) {
      const list = Array.isArray(item["약효및효용"]) ? item["약효및효용"] : [item["약효및효용"]];
      html += `<b>약효 및 효용</b><ul>${list.map(li=>`<li>${li}</li>`).join("")}</ul>`;
    }
    pushBot(html);
    return;
  }

  // 개별 섹션
  let label = KEY_LABELS.find(([k]) => k === sectionKey)?.[1] || sectionKey;
  let content = item[sectionKey];

  // 표 렌더링 (주요영양소)
  if (sectionKey === "주요영양소" && content && typeof content === "object" && !Array.isArray(content)) {
    const rows = Object.entries(content).map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
    content = `<table class="tbl"><tr><th>영양소</th><th>수치/설명</th></tr>${rows}</table>`;
  }

  // 목록 렌더링
  if (Array.isArray(content) && sectionKey !== "레시피") {
    content = "<ul>" + content.map(x => `<li>${x}</li>`).join("") + "</ul>";
  }

  // 레시피 렌더링
  if (sectionKey === "레시피") {
    const recBlocks = normalizeRecipe(content);
    content = recBlocks.join("<hr>");
  }

  // 출처 렌더링
  if (sectionKey === "source") {
    const list = Array.isArray(content) ? content : [content];
    content = "<ul>" + list.map(x => `<li>『${x.replace(/^『|』$/g,"")}』</li>`).join("") + "</ul>";
  }

  if (content == null) content = "자료가 없습니다.";

  pushBot(`<div><b>${label}</b><br>${content}</div>`);
}

// 초기 로드
window.onload = loadDB;
