
/* 수산물 건강 챗봇 - 안정판 (객체형 JSON 대응) */
let db = null;
let state = {
  category: null,
  item: null,
};

// ---------- util ----------
function el(tag, className, text) {
  const $ = document.createElement(tag);
  if (className) $.className = className;
  if (text !== undefined && text !== null) $.textContent = text;
  return $;
}

function clear($node) {
  while ($node.firstChild) $node.removeChild($node.firstChild);
}

function br() { return document.createElement("br"); }

function safeArr(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return [String(x)];
}

// ---------- load DB ----------
async function loadDB() {
  const spinner = document.getElementById("spinner");
  spinner && (spinner.style.display = "block");
  try {
    const res = await fetch("health_fish.json?cb=" + Date.now(), { cache: "no-cache" });
    db = await res.json();
    // 가드: 예상 구조 점검
    if (!db || typeof db !== "object" || !db.categories || !db.items) {
      throw new Error("잘못된 DB 구조");
    }
    showCategories();
  } catch (err) {
    console.error(err);
    const chat = document.getElementById("chat");
    const box = el("div", "bubble sys");
    box.textContent = "데이터를 불러오지 못했습니다. JSON/JS를 확인해주세요.";
    chat.appendChild(box);
  } finally {
    spinner && (spinner.style.display = "none");
  }
}

// ---------- UI roots ----------
function chatBox(text, cls = "bot") {
  const chat = document.getElementById("chat");
  const box = el("div", `bubble ${cls}`);
  if (typeof text === "string") {
    box.textContent = text;
  } else if (text instanceof Node) {
    box.appendChild(text);
  }
  chat.appendChild(box);
  chat.scrollTop = chat.scrollHeight;
  return box;
}

function chipBar() {
  return document.getElementById("quickbar");
}

// ---------- flows ----------
function showCategories() {
  state = { category: null, item: null };
  const bar = chipBar();
  bar.hidden = false;
  clear(bar);
  const title = chatBox("👉 카테고리 (번호/텍스트 선택)");
  // 카테고리 리스트
  const list = el("ol", "list");
  const cats = Object.keys(db.categories || {});
  cats.forEach((name, i) => {
    const li = el("li", null, `${i + 1}. ${name}`);
    list.appendChild(li);
    const chip = el("div", "chip", name);
    chip.onclick = () => showItems(name);
    bar.appendChild(chip);
  });
  title.appendChild(list);
}

function showItems(category) {
  state.category = category;
  state.item = null;
  const bar = chipBar();
  clear(bar);
  const items = db.categories?.[category] || [];

  const title = chatBox(`어종 (번호/텍스트 선택)`);
  const list = el("ol", "list");
  items.forEach((name, i) => {
    const li = el("li", null, `${i + 1}. ${name}`);
    list.appendChild(li);
    const chip = el("div", "chip", name);
    chip.onclick = () => showItemMenu(name);
    bar.appendChild(chip);
  });
  title.appendChild(list);

  const back = el("div", "chip ghost", "처음으로");
  back.onclick = showCategories;
  bar.appendChild(back);
}

function showItemMenu(itemName) {
  state.item = itemName;
  const item = db.items?.[itemName];
  const bar = chipBar();
  clear(bar);

  const menu = [
    "전체 보기",
    "주요영양소",
    "약효및효용",
    "제철및선택법",
    "조리포인트",
    "어울리는요리",
    "레시피",
    "출처",
  ];

  const title = chatBox(`${state.category} · ${itemName}`);
  const list = el("ol", "list");
  menu.forEach((m, i) => list.appendChild(el("li", null, `${i + 1}. ${m}`)));
  title.appendChild(list);

  menu.forEach((m) => {
    const chip = el("div", "chip", m);
    chip.onclick = () => renderSection(itemName, m);
    bar.appendChild(chip);
  });

  const back = el("div", "chip ghost", "뒤로");
  back.onclick = () => showItems(state.category);
  bar.appendChild(back);
}

function renderSection(itemName, section) {
  const data = db.items?.[itemName] || {};
  const sectionMap = {
    "전체 보기": () => renderAll(itemName, data),
    "주요영양소": () => renderKeyNutrients(data),
    "약효및효용": () => renderBullets("약효및효용", data["약효및효용"]),
    "제철및선택법": () => renderBullets("제철 및 선택법", data["제철및선택법"]),
    "조리포인트": () => renderBullets("조리 포인트", data["조리포인트"]),
    "어울리는요리": () => renderBullets("어울리는 요리", data["어울리는요리"]),
    "레시피": () => renderRecipe(data["레시피"]),
    "출처": () => renderBullets("출처", data["출처"]),
  };
  (sectionMap[section] || (() => chatBox("자료가 없습니다.")))();
}

// ---------- renderers ----------
function renderAll(itemName, data) {
  chatBox(`${state.category} · ${itemName}`, "tag");

  renderKeyNutrients(data);
  renderBullets("약효 및 효용", data["약효및효용"]);
  renderBullets("제철 및 선택법", data["제철및선택법"]);
  renderBullets("조리 포인트", data["조리포인트"]);
  renderBullets("어울리는 요리", data["어울리는요리"]);
  renderRecipe(data["레시피"]);
  renderBullets("출처", data["출처"]);
}

function renderKeyNutrients(data) {
  const table = el("table", "tbl");
  const thead = el("thead");
  const trh = el("tr");
  trh.appendChild(el("th", null, "영양소"));
  trh.appendChild(el("th", null, "수치/설명"));
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = el("tbody");
  (safeArr(data["주요영양소"]) || []).forEach((row) => {
    // row가 "단백질: xx" 또는 객체 {key:"단백질", value:"xx"} 형태 모두 허용
    let key = "", val = "";
    if (typeof row === "string") {
      const idx = row.indexOf(":");
      if (idx > -1) {
        key = row.slice(0, idx).trim();
        val = row.slice(idx + 1).trim();
      } else {
        key = row;
        val = "";
      }
    } else if (row && typeof row === "object") {
      key = row.key || row.영양소 || "";
      val = row.value || row.수치 || row.설명 || "";
    }
    const tr = el("tr");
    tr.appendChild(el("td", null, key));
    tr.appendChild(el("td", null, val));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const wrap = el("div");
  wrap.appendChild(el("div", "section-title", "주요 영양소"));
  wrap.appendChild(table);
  chatBox(wrap);
}

function renderBullets(title, arr) {
  const list = el("ul");
  const items = safeArr(arr);
  if (items.length === 0) {
    chatBox("자료가 없습니다.");
    return;
  }
  items.forEach((t) => list.appendChild(el("li", null, String(t))));
  const wrap = el("div");
  wrap.appendChild(el("div", "section-title", title));
  wrap.appendChild(list);
  chatBox(wrap);
}

function renderRecipe(recipe) {
  if (!recipe || typeof recipe !== "object") {
    chatBox("자료가 없습니다.");
    return;
  }
  const wrap = el("div");
  wrap.appendChild(el("div", "section-title", "레시피"));

  if (recipe.이름) {
    wrap.appendChild(el("div", "recipe-title", recipe.이름));
  }

  const ing = safeArr(recipe.재료);
  if (ing.length) {
    wrap.appendChild(el("div", "sub", "재료"));
    const ul = el("ul");
    ing.forEach((t) => ul.appendChild(el("li", null, String(t))));
    wrap.appendChild(ul);
  }

  const steps = safeArr(recipe.만드는법);
  if (steps.length) {
    wrap.appendChild(el("div", "sub", "만드는 법"));
    const ol = el("ol");
    steps.forEach((t) => ol.appendChild(el("li", null, String(t))));
    wrap.appendChild(ol);
  }

  chatBox(wrap);
}

// ---------- boot ----------
window.addEventListener("DOMContentLoaded", loadDB);
