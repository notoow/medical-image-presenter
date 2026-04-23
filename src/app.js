const state = {
  images: [],
  logoUrl: "",
  pageIndex: 0,
  layoutMode: "pair",
  sortMode: "name-asc",
  fitMode: "fit",
  backgroundEnabled: true,
  zoom: 1,
  filters: {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    hue: 0,
  },
};

const els = {
  stage: document.querySelector("#stage"),
  pageStatus: document.querySelector("#pageStatus"),
  coverTitle: document.querySelector("#coverTitle"),
  coverSubtitle: document.querySelector("#coverSubtitle"),
  hospitalName: document.querySelector("#hospitalName"),
  presenterName: document.querySelector("#presenterName"),
  logoInput: document.querySelector("#logoInput"),
  imageInput: document.querySelector("#imageInput"),
  sortMode: document.querySelector("#sortMode"),
  layoutMode: document.querySelector("#layoutMode"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  fitButton: document.querySelector("#fitButton"),
  fillButton: document.querySelector("#fillButton"),
  backgroundButton: document.querySelector("#backgroundButton"),
  presentButton: document.querySelector("#presentButton"),
  shortcutHelpButton: document.querySelector("#shortcutHelpButton"),
  closeShortcutHelpButton: document.querySelector("#closeShortcutHelpButton"),
  shortcutDialog: document.querySelector("#shortcutDialog"),
  exportButton: document.querySelector("#exportButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  zoomOutput: document.querySelector("#zoomOutput"),
  brightness: document.querySelector("#brightness"),
  contrast: document.querySelector("#contrast"),
  saturate: document.querySelector("#saturate"),
  hue: document.querySelector("#hue"),
  brightnessValue: document.querySelector("#brightnessValue"),
  contrastValue: document.querySelector("#contrastValue"),
  saturateValue: document.querySelector("#saturateValue"),
  hueValue: document.querySelector("#hueValue"),
  resetFiltersButton: document.querySelector("#resetFiltersButton"),
};

const pageSizeByLayout = {
  single: 1,
  pair: 2,
  triple: 3,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPageSize() {
  return pageSizeByLayout[state.layoutMode] ?? 2;
}

function getTotalPages() {
  return 1 + Math.ceil(state.images.length / getPageSize());
}

function sortImages() {
  const collator = new Intl.Collator("ko-KR", {
    numeric: true,
    sensitivity: "base",
  });

  state.images.sort((a, b) => {
    if (state.sortMode === "date-asc") {
      return a.modifiedAt - b.modifiedAt || collator.compare(a.name, b.name);
    }

    if (state.sortMode === "date-desc") {
      return b.modifiedAt - a.modifiedAt || collator.compare(a.name, b.name);
    }

    return collator.compare(a.name, b.name);
  });
}

function getFilterStyle() {
  const { brightness, contrast, saturate, hue } = state.filters;
  return [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturate}%)`,
    `hue-rotate(${hue}deg)`,
  ].join(" ");
}

function renderCover() {
  els.stage.className = "stage stage-cover";
  els.stage.innerHTML = `
    <div class="cover-card">
      ${
        state.logoUrl
          ? `<img class="cover-logo" src="${state.logoUrl}" alt="Hospital logo" />`
          : ""
      }
      <h2 class="cover-title">${escapeHtml(els.coverTitle.value)}</h2>
      <p class="cover-subtitle">${escapeHtml(els.coverSubtitle.value)}</p>
      <div class="cover-meta">
        <span>${escapeHtml(els.hospitalName.value)}</span>
        <span>${escapeHtml(els.presenterName.value)}</span>
        <span>${new Date().toLocaleDateString("ko-KR")}</span>
      </div>
    </div>
  `;
}

function renderImageCard(image) {
  const filter = getFilterStyle();
  const zoomTransform = `scale(${state.zoom})`;

  return `
    <figure class="image-card ${state.backgroundEnabled ? "background-enabled" : ""} ${
      state.fitMode === "fill" ? "fit-fill" : ""
    }">
      <img class="blur-bg" src="${image.url}" alt="" aria-hidden="true" />
      <img
        class="main-image"
        src="${image.url}"
        alt="${escapeHtml(image.name)}"
        style="filter: ${filter}; transform: ${zoomTransform};"
      />
      <figcaption class="image-label">${escapeHtml(image.name)}</figcaption>
    </figure>
  `;
}

function renderSlide() {
  const pageSize = getPageSize();
  const imagePageIndex = state.pageIndex - 1;
  const start = imagePageIndex * pageSize;
  const pageImages = state.images.slice(start, start + pageSize);

  els.stage.className = `stage layout-${state.layoutMode}`;

  if (pageImages.length === 0) {
    els.stage.innerHTML = `
      <div class="empty-state">
        <div>
          <h2>사진을 선택하면 여기에 슬라이드가 만들어집니다.</h2>
          <p>기본은 2장씩 Before / After 비교 레이아웃입니다.</p>
        </div>
      </div>
    `;
    return;
  }

  els.stage.innerHTML = `
    <div class="slide-grid layout-${state.layoutMode}">
      ${pageImages.map(renderImageCard).join("")}
    </div>
  `;
}

function render() {
  sortImages();
  state.pageIndex = clamp(state.pageIndex, 0, Math.max(getTotalPages() - 1, 0));

  if (state.pageIndex === 0) {
    renderCover();
  } else {
    renderSlide();
  }

  els.pageStatus.textContent =
    state.pageIndex === 0
      ? `Cover / ${getTotalPages()}`
      : `${state.pageIndex + 1} / ${getTotalPages()}`;

  els.zoomOutput.textContent = `${Math.round(state.zoom * 100)}%`;
  els.backgroundButton.textContent = state.backgroundEnabled
    ? "배경 채우기 켜짐 Enter"
    : "배경 채우기 꺼짐 Enter";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function goToPage(nextPage) {
  state.pageIndex = clamp(nextPage, 0, Math.max(getTotalPages() - 1, 0));
  render();
}

function updateFitMode(mode) {
  state.fitMode = mode;
  render();
}

function updateZoom(delta) {
  state.zoom = clamp(Number((state.zoom + delta).toFixed(2)), 0.5, 2.5);
  render();
}

function resetZoom() {
  state.zoom = 1;
  render();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function toggleBackground() {
  state.backgroundEnabled = !state.backgroundEnabled;
  render();
}

function togglePresentationMode() {
  document.body.classList.toggle("presenting");

  if (document.body.classList.contains("presenting")) {
    els.stage.requestFullscreen?.().catch(() => {});
  } else if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
}

function showShortcutHelp() {
  if (els.shortcutDialog.open) return;
  els.shortcutDialog.showModal();
}

function hideShortcutHelp() {
  if (!els.shortcutDialog.open) return;
  els.shortcutDialog.close();
}

function bindInputRerender(input) {
  input.addEventListener("input", render);
}

function bindFilter(input, output, suffix = "%") {
  input.addEventListener("input", () => {
    state.filters[input.id] = Number(input.value);
    output.textContent = `${input.value}${suffix}`;
    render();
  });
}

els.logoInput.addEventListener("change", async () => {
  const file = els.logoInput.files?.[0];
  if (!file) return;
  state.logoUrl = await fileToDataUrl(file);
  render();
});

els.imageInput.addEventListener("change", async () => {
  const files = Array.from(els.imageInput.files ?? [])
    .filter((file) => file.type.startsWith("image/"))
    .map(async (file) => ({
      name: file.name,
      modifiedAt: file.lastModified,
      url: await fileToDataUrl(file),
    }));

  state.images = await Promise.all(files);

  state.pageIndex = state.images.length > 0 ? 1 : 0;
  render();
});

els.sortMode.addEventListener("change", () => {
  state.sortMode = els.sortMode.value;
  render();
});

els.layoutMode.addEventListener("change", () => {
  state.layoutMode = els.layoutMode.value;
  state.pageIndex = Math.min(state.pageIndex, getTotalPages() - 1);
  render();
});

els.prevButton.addEventListener("click", () => goToPage(state.pageIndex - 1));
els.nextButton.addEventListener("click", () => goToPage(state.pageIndex + 1));
els.fitButton.addEventListener("click", () => updateFitMode("fit"));
els.fillButton.addEventListener("click", () => updateFitMode("fill"));
els.backgroundButton.addEventListener("click", toggleBackground);
els.presentButton.addEventListener("click", togglePresentationMode);
els.shortcutHelpButton.addEventListener("click", showShortcutHelp);
els.closeShortcutHelpButton.addEventListener("click", hideShortcutHelp);
els.exportButton.addEventListener("click", exportStandaloneHtml);
els.zoomOutButton.addEventListener("click", () => updateZoom(-0.1));
els.zoomInButton.addEventListener("click", () => updateZoom(0.1));

bindInputRerender(els.coverTitle);
bindInputRerender(els.coverSubtitle);
bindInputRerender(els.hospitalName);
bindInputRerender(els.presenterName);
bindFilter(els.brightness, els.brightnessValue);
bindFilter(els.contrast, els.contrastValue);
bindFilter(els.saturate, els.saturateValue);
bindFilter(els.hue, els.hueValue, "°");

els.resetFiltersButton.addEventListener("click", () => {
  state.filters = {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    hue: 0,
  };

  els.brightness.value = 100;
  els.contrast.value = 100;
  els.saturate.value = 100;
  els.hue.value = 0;
  els.brightnessValue.textContent = "100%";
  els.contrastValue.textContent = "100%";
  els.saturateValue.textContent = "100%";
  els.hueValue.textContent = "0°";
  render();
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement;

  if (isTyping) return;

  if (event.key === "?" || (event.shiftKey && event.key === "/")) {
    event.preventDefault();
    showShortcutHelp();
    return;
  }

  if (event.key === "Escape") {
    if (els.shortcutDialog.open) {
      hideShortcutHelp();
      return;
    }

    if (document.body.classList.contains("presenting")) {
      document.body.classList.remove("presenting");
      document.exitFullscreen?.().catch(() => {});
    }
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key.toLowerCase() === "p") {
    event.preventDefault();
    goToPage(state.pageIndex - 1);
  }

  if (
    event.key === "ArrowRight" ||
    event.key === "ArrowDown" ||
    event.key === "PageDown" ||
    event.key === " " ||
    event.key.toLowerCase() === "n"
  ) {
    event.preventDefault();
    goToPage(state.pageIndex + 1);
  }

  if (event.key === "PageUp") {
    event.preventDefault();
    goToPage(state.pageIndex - 1);
  }

  if (event.key === "Home") {
    event.preventDefault();
    goToPage(0);
  }

  if (event.key === "End") {
    event.preventDefault();
    goToPage(getTotalPages() - 1);
  }

  if (event.key === "F5") {
    event.preventDefault();
    if (!event.shiftKey) goToPage(0);
    togglePresentationMode();
  }

  if (event.key === "Enter") {
    event.preventDefault();
    toggleBackground();
  }

  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    updateFitMode(event.shiftKey ? "fill" : "fit");
  }

  if (event.key === "+" || event.key === "=") {
    event.preventDefault();
    updateZoom(0.1);
  }

  if (event.key === "-" || event.key === "_") {
    event.preventDefault();
    updateZoom(-0.1);
  }

  if (event.key === "0") {
    event.preventDefault();
    resetZoom();
  }

  if (event.key.toLowerCase() === "c") {
    event.preventDefault();
    goToPage(0);
  }

});

function getPresentationData() {
  return {
    cover: {
      title: els.coverTitle.value,
      subtitle: els.coverSubtitle.value,
      hospitalName: els.hospitalName.value,
      presenterName: els.presenterName.value,
      date: new Date().toLocaleDateString("ko-KR"),
      logoUrl: state.logoUrl,
    },
    images: state.images,
    layoutMode: state.layoutMode,
    sortMode: state.sortMode,
    fitMode: state.fitMode,
    backgroundEnabled: state.backgroundEnabled,
    zoom: state.zoom,
    filters: state.filters,
  };
}

function downloadTextFile(fileName, text) {
  const blob = new Blob([text], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportStandaloneHtml() {
  if (state.images.length === 0) {
    alert("먼저 사진을 선택한 뒤 HTML을 내려받을 수 있습니다.");
    return;
  }

  const safeTitle = els.coverTitle.value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 60);

  downloadTextFile(
    `${safeTitle || "medical-image-presentation"}.html`,
    createStandaloneHtml(getPresentationData()),
  );
}

function createStandaloneHtml(data) {
  const serialized = JSON.stringify(data).replaceAll("</script", "<\\/script");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.cover.title || "Medical Image Presentation")}</title>
  <style>
    :root { color-scheme: dark; --ink:#fffdf7; --muted:rgba(255,253,247,.68); --panel:rgba(20,19,17,.76); --line:rgba(255,253,247,.16); --accent:#d9a06f; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; color:var(--ink); font-family:Georgia,"Times New Roman",serif; background:radial-gradient(circle at 15% 10%,rgba(217,160,111,.2),transparent 28rem),linear-gradient(135deg,#151512,#050505); }
    button,input,select { font:inherit; }
    button,select,input[type="range"] { border:1px solid var(--line); border-radius:999px; padding:.55rem .8rem; color:var(--ink); background:rgba(255,255,255,.08); }
    button { cursor:pointer; }
    .app { display:grid; grid-template-columns:20rem 1fr; gap:1rem; min-height:100vh; padding:1rem; }
    .panel { display:grid; align-content:start; gap:.85rem; max-height:calc(100vh - 2rem); overflow:auto; border:1px solid var(--line); border-radius:1.3rem; padding:1rem; background:var(--panel); backdrop-filter:blur(16px); }
    .panel h1 { margin:0; font-size:1.65rem; line-height:1; letter-spacing:-.04em; }
    .panel label { display:grid; gap:.35rem; color:var(--muted); font-size:.88rem; }
    .panel input[type="text"], .panel select { width:100%; border-radius:.8rem; }
    .row { display:flex; gap:.5rem; align-items:center; }
    .row > * { flex:1; }
    .stage-wrap { display:grid; grid-template-rows:auto 1fr; gap:1rem; min-width:0; }
    .toolbar { display:flex; gap:.5rem; justify-content:flex-end; align-items:center; }
    .status { min-width:8rem; text-align:center; color:var(--muted); }
    .stage { position:relative; overflow:hidden; align-self:center; justify-self:center; width:min(100%,calc((100vh - 6rem) * 16 / 9)); aspect-ratio:16/9; border-radius:1.2rem; background:#111; box-shadow:0 24px 80px rgba(0,0,0,.45); }
    .cover { display:grid; place-items:center; padding:4rem; background:radial-gradient(circle at 20% 15%,rgba(255,255,255,.12),transparent 22rem),linear-gradient(145deg,#26231f,#080807); }
    .cover-card { width:min(75%,58rem); border:1px solid var(--line); border-radius:2rem; padding:3rem; background:rgba(255,255,255,.07); backdrop-filter:blur(18px); }
    .cover-logo { max-width:10rem; max-height:5rem; object-fit:contain; margin-bottom:2rem; }
    .cover-title { margin:0; font-size:clamp(2.5rem,6vw,6rem); line-height:.9; letter-spacing:-.07em; }
    .cover-subtitle,.meta { color:var(--muted); }
    .grid { position:absolute; inset:0; display:grid; gap:1rem; padding:1rem; }
    .single { grid-template-columns:1fr; } .pair { grid-template-columns:repeat(2,1fr); } .triple { grid-template-columns:repeat(3,1fr); }
    .card { position:relative; overflow:hidden; border:1px solid var(--line); border-radius:1rem; background:#050505; }
    .blur { position:absolute; inset:-8%; width:116%; height:116%; object-fit:cover; filter:blur(24px) brightness(.7) saturate(.9); opacity:0; transform:scale(1.08); }
    .bg-on .blur { opacity:1; }
    .photo { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; transform-origin:center; }
    .fill .photo { object-fit:cover; }
    .label { position:absolute; z-index:2; left:.8rem; right:.8rem; bottom:.7rem; overflow:hidden; color:rgba(255,253,247,.78); white-space:nowrap; text-overflow:ellipsis; font-size:.82rem; }
    dialog { width:min(54rem,calc(100vw - 2rem)); border:1px solid var(--line); border-radius:1.5rem; padding:0; color:var(--ink); background:linear-gradient(145deg,rgba(37,34,30,.98),rgba(8,8,7,.98)); box-shadow:0 28px 90px rgba(0,0,0,.5); }
    dialog::backdrop { background:rgba(0,0,0,.58); backdrop-filter:blur(10px); }
    .help-card { padding:1.4rem; }
    .help-head { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:1rem; }
    .help-head h2 { margin:0; font-size:2.5rem; line-height:.95; letter-spacing:-.055em; }
    .help-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.65rem; }
    .help-grid p { display:flex; align-items:center; gap:.35rem; margin:0; border:1px solid var(--line); border-radius:1rem; padding:.72rem; background:rgba(255,255,255,.07); }
    .help-grid span { margin-left:auto; color:var(--muted); text-align:right; }
    kbd { display:inline-grid; place-items:center; min-width:1.9rem; min-height:1.7rem; border:1px solid var(--line); border-radius:.45rem; padding:.12rem .38rem; background:rgba(255,255,255,.1); font-family:"Courier New",monospace; font-size:.78rem; }
    body.presenting .panel, body.presenting .toolbar { display:none; }
    body.presenting .app { display:grid; grid-template-columns:1fr; padding:0; }
    body.presenting .stage { width:100vw; height:100vh; border-radius:0; aspect-ratio:auto; }
    @media (max-width:900px){ .app{grid-template-columns:1fr}.panel{max-height:none}.stage{width:100%}.help-grid{grid-template-columns:1fr} }
  </style>
</head>
<body>
  <main class="app">
    <aside class="panel">
      <h1>Case Photo Presenter</h1>
      <label>제목 <input id="title" type="text" /></label>
      <label>부제 <input id="subtitle" type="text" /></label>
      <label>병원명 <input id="hospital" type="text" /></label>
      <label>발표자 <input id="presenter" type="text" /></label>
      <label>페이지 구성 <select id="layout"><option value="single">낱장</option><option value="pair">2장씩</option><option value="triple">3장씩</option></select></label>
      <div class="row"><button id="fit">맞추기 F</button><button id="fill">채우기 ⇧F</button></div>
      <button id="bg">배경 채우기 Enter</button>
      <button id="present">발표모드 F5</button>
      <button id="help">단축키 보기 Shift+?</button>
      <label>밝기 <input id="brightness" type="range" min="50" max="150" /></label>
      <label>대비 <input id="contrast" type="range" min="50" max="160" /></label>
      <label>채도 <input id="saturate" type="range" min="0" max="180" /></label>
      <label>색조 <input id="hue" type="range" min="-45" max="45" /></label>
      <p>F5: 발표 시작 / Esc: 종료 / Shift+?: 도움말</p>
      <p>← → N P Space: 페이지 이동 / + - 0: 확대 초기화 / C: 커버</p>
    </aside>
    <section class="stage-wrap">
      <div class="toolbar"><button id="prev">이전</button><span id="status" class="status">Cover</span><button id="next">다음</button></div>
      <article id="stage" class="stage cover"></article>
    </section>
  </main>
  <dialog id="shortcutDialog">
    <div class="help-card">
      <div class="help-head"><h2>PPT 친화 단축키</h2><button id="closeHelp">닫기 Esc</button></div>
      <div class="help-grid">
        <p><kbd>F5</kbd><span>처음부터 발표</span></p>
        <p><kbd>Shift</kbd> + <kbd>F5</kbd><span>현재 페이지부터 발표</span></p>
        <p><kbd>Esc</kbd><span>발표/도움말 종료</span></p>
        <p><kbd>→</kbd> <kbd>↓</kbd> <kbd>N</kbd><span>다음 페이지</span></p>
        <p><kbd>←</kbd> <kbd>↑</kbd> <kbd>P</kbd><span>이전 페이지</span></p>
        <p><kbd>Home</kbd> / <kbd>End</kbd><span>커버 / 마지막</span></p>
        <p><kbd>F</kbd> / <kbd>Shift</kbd> + <kbd>F</kbd><span>맞추기 / 채우기</span></p>
        <p><kbd>Enter</kbd><span>블러 배경 토글</span></p>
        <p><kbd>+</kbd> <kbd>-</kbd> <kbd>0</kbd><span>확대 / 축소 / 초기화</span></p>
        <p><kbd>Shift</kbd> + <kbd>?</kbd><span>도움말</span></p>
      </div>
    </div>
  </dialog>
  <script>
    const data = ${serialized};
    const state = { ...data, pageIndex: 0 };
    const pageSize = () => ({ single:1, pair:2, triple:3 }[state.layoutMode] || 2);
    const totalPages = () => 1 + Math.ceil(state.images.length / pageSize());
    const $ = (id) => document.getElementById(id);
    const esc = (v) => String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    const filter = () => \`brightness(\${state.filters.brightness}%) contrast(\${state.filters.contrast}%) saturate(\${state.filters.saturate}%) hue-rotate(\${state.filters.hue}deg)\`;
    function syncInputs(){ $("title").value=state.cover.title; $("subtitle").value=state.cover.subtitle; $("hospital").value=state.cover.hospitalName; $("presenter").value=state.cover.presenterName; $("layout").value=state.layoutMode; for (const key of ["brightness","contrast","saturate","hue"]) $(key).value=state.filters[key]; }
    function render(){ state.pageIndex=Math.min(Math.max(state.pageIndex,0),totalPages()-1); if(state.pageIndex===0) renderCover(); else renderSlide(); $("status").textContent=state.pageIndex===0?\`Cover / \${totalPages()}\`:\`\${state.pageIndex+1} / \${totalPages()}\`; $("bg").textContent=state.backgroundEnabled?"배경 채우기 켜짐 Enter":"배경 채우기 꺼짐 Enter"; }
    function renderCover(){ $("stage").className="stage cover"; $("stage").innerHTML=\`<div class="cover-card">\${state.cover.logoUrl?\`<img class="cover-logo" src="\${state.cover.logoUrl}" alt="logo">\`:""}<h2 class="cover-title">\${esc(state.cover.title)}</h2><p class="cover-subtitle">\${esc(state.cover.subtitle)}</p><p class="meta">\${esc(state.cover.hospitalName)} · \${esc(state.cover.presenterName)} · \${esc(state.cover.date)}</p></div>\`; }
    function card(img){ return \`<figure class="card \${state.backgroundEnabled?"bg-on":""} \${state.fitMode==="fill"?"fill":""}"><img class="blur" src="\${img.url}" alt=""><img class="photo" src="\${img.url}" alt="\${esc(img.name)}" style="filter:\${filter()};transform:scale(\${state.zoom})"><figcaption class="label">\${esc(img.name)}</figcaption></figure>\`; }
    function renderSlide(){ const start=(state.pageIndex-1)*pageSize(); const imgs=state.images.slice(start,start+pageSize()); $("stage").className="stage"; $("stage").innerHTML=\`<div class="grid \${state.layoutMode}">\${imgs.map(card).join("")}</div>\`; }
    function go(n){ state.pageIndex=n; render(); }
    function present(){ document.body.classList.toggle("presenting"); if(document.body.classList.contains("presenting")) $("stage").requestFullscreen?.().catch(()=>{}); else document.exitFullscreen?.().catch(()=>{}); }
    function showHelp(){ if(!$("shortcutDialog").open) $("shortcutDialog").showModal(); }
    function hideHelp(){ if($("shortcutDialog").open) $("shortcutDialog").close(); }
    $("prev").onclick=()=>go(state.pageIndex-1); $("next").onclick=()=>go(state.pageIndex+1); $("fit").onclick=()=>{state.fitMode="fit";render()}; $("fill").onclick=()=>{state.fitMode="fill";render()}; $("bg").onclick=()=>{state.backgroundEnabled=!state.backgroundEnabled;render()}; $("present").onclick=present;
    $("help").onclick=showHelp; $("closeHelp").onclick=hideHelp;
    for (const id of ["title","subtitle","hospital","presenter"]) $(id).oninput=()=>{ const map={title:"title",subtitle:"subtitle",hospital:"hospitalName",presenter:"presenterName"}; state.cover[map[id]]=$(id).value; render(); };
    $("layout").onchange=()=>{state.layoutMode=$("layout").value;render()}; for (const key of ["brightness","contrast","saturate","hue"]) $(key).oninput=()=>{state.filters[key]=Number($(key).value);render()};
    document.onkeydown=(e)=>{ if(["INPUT","SELECT"].includes(e.target.tagName)) return; if(e.key==="?"||(e.shiftKey&&e.key==="/")){e.preventDefault();showHelp();return} if(e.key==="Escape"){ if($("shortcutDialog").open){hideHelp();return} if(document.body.classList.contains("presenting")){document.body.classList.remove("presenting");document.exitFullscreen?.().catch(()=>{})} } if(e.key==="F5"){e.preventDefault(); if(!e.shiftKey)go(0); present()} if(e.key==="ArrowLeft"||e.key==="ArrowUp"||e.key==="PageUp"||e.key.toLowerCase()==="p")go(state.pageIndex-1); if(e.key==="ArrowRight"||e.key==="ArrowDown"||e.key==="PageDown"||e.key===" "||e.key.toLowerCase()==="n")go(state.pageIndex+1); if(e.key==="Home")go(0); if(e.key==="End")go(totalPages()-1); if(e.key==="Enter"){state.backgroundEnabled=!state.backgroundEnabled;render()} if(e.key.toLowerCase()==="f"){state.fitMode=e.shiftKey?"fill":"fit";render()} if(e.key==="+") {state.zoom=Math.min(state.zoom+.1,2.5);render()} if(e.key==="-") {state.zoom=Math.max(state.zoom-.1,.5);render()} if(e.key==="0"){state.zoom=1;render()} if(e.key.toLowerCase()==="c")go(0); };
    syncInputs(); render();
  </script>
</body>
</html>`;
}

render();
