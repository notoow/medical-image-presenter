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

function toggleBackground() {
  state.backgroundEnabled = !state.backgroundEnabled;
  render();
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

els.logoInput.addEventListener("change", () => {
  const file = els.logoInput.files?.[0];
  if (!file) return;
  if (state.logoUrl) URL.revokeObjectURL(state.logoUrl);
  state.logoUrl = URL.createObjectURL(file);
  render();
});

els.imageInput.addEventListener("change", () => {
  for (const image of state.images) {
    URL.revokeObjectURL(image.url);
  }

  state.images = Array.from(els.imageInput.files ?? [])
    .filter((file) => file.type.startsWith("image/"))
    .map((file) => ({
      name: file.name,
      modifiedAt: file.lastModified,
      url: URL.createObjectURL(file),
    }));

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

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToPage(state.pageIndex - 1);
  }

  if (event.key === "ArrowRight" || event.key === " ") {
    event.preventDefault();
    goToPage(state.pageIndex + 1);
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

render();
