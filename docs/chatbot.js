/* =======================================================================
   수산물 건강 챗봇 – 설계서 v2 반영
   - json(health_fish.json)에는 손대지 않고, 이 파일에서 출처 필드 주입
   - [출처] 영역: 도입부 사료 출처(introSources) + 기본 출처(baseSource) 모두 표시
   ======================================================================= */

(async function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // UI 영역
  const catWrap = $("#category");
  const itemsWrap = $("#items");
  const detailTitle = $("#detail-title");
  const detailBody = $("#detail-body");

  const btnBack = $("#btn-back");
  const btnHome = $("#btn-home");
  const btnExpandAll = $("#btn-expand");

  // 데이터 로드
  const data = await fetch("health_fish.json").then(r => r.json());

  /* ---------------------------------------------------------------
     1) 고전 사료(도입부 출처) 매핑
        - json은 그대로 두고, 여기서 동적으로 주입합니다.
        - 소장님 지시: 김·다시마·미역 등 해조류는
          「경기도지리지」「조선의 수산」「동국여지승람」
          그 외(멸치/가리비/문어/낙지/대하/꽃게/주꾸미/소라/꼬막/재첩/바지락/대합)는
          「자산어보」「난호어목지」「동국여지승람」을 기본 세트로 부여합니다.
  --------------------------------------------------------------- */
  const SEAWEED_SOURCES = ["경기도지리지", "조선의 수산", "동국여지승람"];
  const MARINE_SOURCES  = ["자산어보", "난호어목지", "동국여지승람"];

  // 카테고리별 어종 목록(현재 설계 v2 기준)
  const HYP = ["김", "다시마", "멸치", "가리비", "미역", "톳", "우뭇가사리", "매생이"];
  const LIVER = ["문어", "낙지", "대하", "꽃게", "주꾸미", "소라", "꼬막", "재첩", "바지락", "대합"];

  // 어종 → 사료 출처 매핑 자동 생성
  const introSourceMap = {};
  HYP.forEach(nm => introSourceMap[nm] = (["김","다시마","미역","톳","우뭇가사리","매생이"].includes(nm) ? SEAWEED_SOURCES : MARINE_SOURCES));
  LIVER.forEach(nm => introSourceMap[nm] = MARINE_SOURCES);

  // 데이터 후처리: 각 아이템에 baseSource / introSources 주입(없을 때만)
  const BASE_SOURCE = "생선해산물 건강사전";
  data.categories.forEach(cat => {
    cat.items.forEach(it => {
      if (!it.baseSource) it.baseSource = BASE_SOURCE;
      if (!it.introSources || !Array.isArray(it.introSources) || it.introSources.length === 0) {
        const candidates = introSourceMap[it.name] || MARINE_SOURCES;
        it.introSources = candidates;
      }
      // 세부 섹션이 없을 수 있으니 빈 문자열로 안전화
      it.sections = it.sections || {};
      [
        "출처","주요영양소","약효 및 효용","제철 및 선택법",
        "조리 포인트","어울리는 요리","레시피"
      ].forEach(k => { if (typeof it.sections[k] !== "string") it.sections[k] = ""; });
    });
  });

  /* ---------------------------------------------------------------
     렌더 함수들
  --------------------------------------------------------------- */
  let currentCat = null;  // { name, items }
  let currentItem = null; // { name, introSources, baseSource, sections:{} }

  // 카테고리 렌더
  function renderCategories() {
    catWrap.innerHTML = "";
    data.categories.forEach(cat => {
      const b = document.createElement("button");
      b.className = "pill";
      b.textContent = cat.name;
      b.addEventListener("click", () => {
        currentCat = cat;
        currentItem = null;
        renderItems();
        renderDetailIntro();
      });
      catWrap.appendChild(b);
    });
  }

  // 어종 렌더
  function renderItems() {
    itemsWrap.innerHTML = "";
    if (!currentCat) return;

    currentCat.items.forEach(it => {
      const b = document.createElement("button");
      b.className = "pill";
      b.textContent = it.name;
      b.addEventListener("click", () => {
        currentItem = it;
        renderDetailItem(it);
      });
      itemsWrap.appendChild(b);
    });
  }

  // 상세 – 카테고리 안내
  function renderDetailIntro() {
    detailTitle.textContent = "세부 내용";
    detailBody.innerHTML = `
      <p>카테고리를 선택하세요.</p>
      ${currentCat ? `<p>[${currentCat.name}] 어종을 선택하세요.</p>` : ""}
    `;
  }

  // 상세 – 아이템
  function renderDetailItem(it) {
    detailTitle.textContent = "세부 내용";

    const bullet = s => s ? `<li>${s}</li>` : "";
    const sec = it.sections;

    // 출처 영역: 도입부 사료 + 기본 출처
    const srcHTML = `
      <div class="section">
        <div class="section-title">📚 출처</div>
        <ul class="ul">
          ${it.introSources.map(name => `<li>${name}</li>`).join("")}
          <li>${it.baseSource}</li>
        </ul>
      </div>
    `;

    // 나머지 섹션
    const makeBlock = (title, content, icon="•") => `
      <div class="section">
        <div class="section-title">${icon} ${title}</div>
        <div class="section-body">${content ? content : "· 세션을 선택하세요."}</div>
      </div>
    `;

    detailBody.innerHTML = `
      <p>카테고리를 선택하세요.</p>
      <p>[${currentCat.name}] 어종을 선택하세요.</p>
      <p>[${currentCat.name} · ${it.name}]</p>

      <button class="chip" id="btn-open-all">🧭 전체 보기</button>
      ${srcHTML}
      ${makeBlock("주요영양소", sec["주요영양소"])}
      ${makeBlock("약효 및 효용", sec["약효 및 효용"], "🩺")}
      ${makeBlock("제철 및 선택법", sec["제철 및 선택법"], "🌿")}
      ${makeBlock("조리 포인트", sec["조리 포인트"], "🍳")}
      ${makeBlock("어울리는 요리", sec["어울리는 요리"], "🥘")}
      ${makeBlock("레시피", sec["레시피"], "📋")}
    `;

    // “전체 보기”는 모든 섹션을 한 번 더 펼쳐서 스크롤 탑으로
    $("#btn-open-all")?.addEventListener("click", () => {
      detailBody.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // 상단 공용 버튼
  btnBack.addEventListener("click", () => {
    if (currentItem) {
      currentItem = null;
      renderDetailIntro();
    } else {
      currentCat = null;
      itemsWrap.innerHTML = "";
      renderDetailIntro();
    }
  });
  btnHome.addEventListener("click", () => {
    currentCat = null;
    currentItem = null;
    itemsWrap.innerHTML = "";
    renderDetailIntro();
  });
  btnExpandAll.addEventListener("click", () => {
    if (currentItem) {
      detailBody.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // 초기 렌더
  renderCategories();
  renderDetailIntro();
})();
