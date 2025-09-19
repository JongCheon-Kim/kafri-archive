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

function showCategories() {
  const quickbar = document.getElementById("quickbar");
  quickbar.innerHTML = "";
  quickbar.hidden = false;

  db.categories.forEach(cat => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = cat.name;
    chip.onclick = () => showItems(cat);
    quickbar.appendChild(chip);
  });
}

function showItems(category) {
  const quickbar = document.getElementById("quickbar");
  quickbar.innerHTML = "";
  category.items.forEach(item => {
    const chip = document.createElement("div");
    chip.className = "chip small";
    chip.textContent = item;
    chip.onclick = () => showSections(category.name, item);
    quickbar.appendChild(chip);
  });
}

function showSections(catName, itemName) {
  const quickbar = document.getElementById("quickbar");
  quickbar.innerHTML = "";
  const sections = db.categories.find(c => c.name === catName).items[itemName];

  Object.keys(sections).forEach(sec => {
    const chip = document.createElement("div");
    chip.className = "chip small";
    chip.textContent = sec;
    chip.onclick = () => renderSection(catName, itemName, sec);
    quickbar.appendChild(chip);
  });
}

function renderSection(catName, itemName, section) {
  const log = document.getElementById("log");
  const item = db.categories.find(c => c.name === catName).items[itemName];
  let content = item[section];

  // ✅ 레시피 처리 보강
  if (section === "레시피") {
    if (!content) {
      content = ["자료가 없습니다."];
    } else {
      // 문자열이면 배열로
      if (typeof content === "string") {
        content = [content];
      }
      // 객체 하나면 배열로
      if (!Array.isArray(content)) {
        content = [content];
      }
      // 객체배열이면 보기 좋게 변환
      content = content.map(r => {
        if (typeof r === "string") return r;
        let out = "";
        if (r.이름) out += `📌 <b>${r.이름}</b><br>`;
        if (r.재료) out += `🥕 재료: ${Array.isArray(r.재료) ? r.재료.join(", ") : r.재료}<br>`;
        if (r["만드는법"] || r["만드는 법"] || r.steps || r.방법) {
          const steps = r["만드는법"] || r["만드는 법"] || r.steps || r.방법;
          if (Array.isArray(steps)) {
            out += "👩‍🍳 만드는 법:<br>" + steps.map((s, i) => `${i + 1}) ${s}`).join("<br>");
          } else {
            out += "👩‍🍳 만드는 법: " + steps;
          }
        }
        return out;
      });
    }
  }

  // 배열인 경우 join 처리
  if (Array.isArray(content)) {
    content = content.join("<br>");
  }

  const bubble = document.createElement("div");
  bubble.className = "msg bot";
  bubble.innerHTML = `<div class="bubble">${content}</div>`;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

// 초기 로드
window.onload = loadDB;
