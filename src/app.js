const DEFAULT_LOGO_URL = "./logos/haist-urology-logo.jpg";
const STORAGE_KEY = "medical-image-presenter:v2";
const DEFAULT_LOGO_NAME = "하이스트비뇨의학과로고.jpg";

const state = {
  images: [],
  slideSlots: [],
  slotTransforms: {},
  selectedSlotIndex: null,
  logoUrl: "",
  pageIndex: 0,
  layoutMode: "pair",
  gridRows: 1,
  gridCols: 2,
  sortMode: "name-asc",
  fitMode: "fit",
  backgroundEnabled: true,
  zoom: 1,
  guidesEnabled: true,
  guides: [],
  crop: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundFilters: {
    brightness: 72,
    saturate: 92,
    blur: 150,
    scale: 176,
    y: 62,
  },
  coverVisibility: {
    title: true,
    subtitle: true,
    hospitalName: true,
    presenterName: true,
    date: true,
    logo: true,
  },
  filters: {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    hue: 0,
  },
};

let persistTimer = null;
let isRestoring = true;

const els = {
  stage: document.querySelector("#stage"),
  pageStatus: document.querySelector("#pageStatus"),
  coverTitle: document.querySelector("#coverTitle"),
  coverSubtitle: document.querySelector("#coverSubtitle"),
  hospitalName: document.querySelector("#hospitalName"),
  presenterName: document.querySelector("#presenterName"),
  showCoverTitle: document.querySelector("#showCoverTitle"),
  showCoverSubtitle: document.querySelector("#showCoverSubtitle"),
  showHospitalName: document.querySelector("#showHospitalName"),
  showPresenterName: document.querySelector("#showPresenterName"),
  showCoverDate: document.querySelector("#showCoverDate"),
  showCoverLogo: document.querySelector("#showCoverLogo"),
  logoInput: document.querySelector("#logoInput"),
  logoFileName: document.querySelector("#logoFileName"),
  imageInput: document.querySelector("#imageInput"),
  imageFileName: document.querySelector("#imageFileName"),
  dropOverlay: document.querySelector("#dropOverlay"),
  sortMode: document.querySelector("#sortMode"),
  layoutMode: document.querySelector("#layoutMode"),
  layoutOneButton: document.querySelector("#layoutOneButton"),
  layoutTwoButton: document.querySelector("#layoutTwoButton"),
  layoutThreeButton: document.querySelector("#layoutThreeButton"),
  layoutFourButton: document.querySelector("#layoutFourButton"),
  gridRows: document.querySelector("#gridRows"),
  gridCols: document.querySelector("#gridCols"),
  horizontalSplitButton: document.querySelector("#horizontalSplitButton"),
  verticalSplitButton: document.querySelector("#verticalSplitButton"),
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
  downloadImagesButton: document.querySelector("#downloadImagesButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  zoomOutput: document.querySelector("#zoomOutput"),
  brightness: document.querySelector("#brightness"),
  contrast: document.querySelector("#contrast"),
  saturate: document.querySelector("#saturate"),
  hue: document.querySelector("#hue"),
  bgBrightness: document.querySelector("#bgBrightness"),
  bgSaturate: document.querySelector("#bgSaturate"),
  bgBlur: document.querySelector("#bgBlur"),
  bgScale: document.querySelector("#bgScale"),
  bgY: document.querySelector("#bgY"),
  cropLeft: document.querySelector("#cropLeft"),
  cropRight: document.querySelector("#cropRight"),
  cropTop: document.querySelector("#cropTop"),
  cropBottom: document.querySelector("#cropBottom"),
  selectedSlotLabel: document.querySelector("#selectedSlotLabel"),
  slotScale: document.querySelector("#slotScale"),
  slotX: document.querySelector("#slotX"),
  slotY: document.querySelector("#slotY"),
  slotRotate: document.querySelector("#slotRotate"),
  slotCropLeft: document.querySelector("#slotCropLeft"),
  slotCropRight: document.querySelector("#slotCropRight"),
  slotCropTop: document.querySelector("#slotCropTop"),
  slotCropBottom: document.querySelector("#slotCropBottom"),
  resetSlotTransformButton: document.querySelector("#resetSlotTransformButton"),
  showGuides: document.querySelector("#showGuides"),
  addVerticalGuideButton: document.querySelector("#addVerticalGuideButton"),
  addHorizontalGuideButton: document.querySelector("#addHorizontalGuideButton"),
  guideListPanel: document.querySelector("#guideListPanel"),
  clearGuidesButton: document.querySelector("#clearGuidesButton"),
  brightnessValue: document.querySelector("#brightnessValue"),
  contrastValue: document.querySelector("#contrastValue"),
  saturateValue: document.querySelector("#saturateValue"),
  hueValue: document.querySelector("#hueValue"),
  bgBrightnessValue: document.querySelector("#bgBrightnessValue"),
  bgSaturateValue: document.querySelector("#bgSaturateValue"),
  bgBlurValue: document.querySelector("#bgBlurValue"),
  bgScaleValue: document.querySelector("#bgScaleValue"),
  bgYValue: document.querySelector("#bgYValue"),
  cropLeftValue: document.querySelector("#cropLeftValue"),
  cropRightValue: document.querySelector("#cropRightValue"),
  cropTopValue: document.querySelector("#cropTopValue"),
  cropBottomValue: document.querySelector("#cropBottomValue"),
  slotScaleValue: document.querySelector("#slotScaleValue"),
  slotXValue: document.querySelector("#slotXValue"),
  slotYValue: document.querySelector("#slotYValue"),
  slotRotateValue: document.querySelector("#slotRotateValue"),
  slotCropLeftValue: document.querySelector("#slotCropLeftValue"),
  slotCropRightValue: document.querySelector("#slotCropRightValue"),
  slotCropTopValue: document.querySelector("#slotCropTopValue"),
  slotCropBottomValue: document.querySelector("#slotCropBottomValue"),
  resetFiltersButton: document.querySelector("#resetFiltersButton"),
  thumbnailRail: document.querySelector("#thumbnailRail"),
  photoListPanel: document.querySelector("#photoListPanel"),
  emptySlotToken: document.querySelector("#emptySlotToken"),
  addEmptySlotButton: document.querySelector("#addEmptySlotButton"),
};

const pageSizeByLayout = {
  single: 1,
  pair: 2,
  triple: 3,
  quad: 4,
  custom: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPageSize() {
  if (state.layoutMode === "custom") {
    return state.gridRows * state.gridCols;
  }

  return pageSizeByLayout[state.layoutMode] ?? 2;
}

function getTotalPages() {
  return 1 + Math.ceil(state.slideSlots.length / getPageSize());
}

function getImageById(id) {
  return state.images.find((image) => image.id === id);
}

function getDefaultSlotTransform() {
  return {
    scale: 100,
    x: 0,
    y: 0,
    rotate: 0,
    cropLeft: 0,
    cropRight: 0,
    cropTop: 0,
    cropBottom: 0,
  };
}

function getSlotTransform(slotIndex) {
  if (!Number.isFinite(slotIndex) || slotIndex < 0) return getDefaultSlotTransform();

  state.slotTransforms[slotIndex] = {
    ...getDefaultSlotTransform(),
    ...(state.slotTransforms[slotIndex] ?? {}),
  };
  return state.slotTransforms[slotIndex];
}

function getSlotCropStyle(slotIndex) {
  const transform = getSlotTransform(slotIndex);
  return `inset(${state.crop.top + transform.cropTop}% ${state.crop.right + transform.cropRight}% ${
    state.crop.bottom + transform.cropBottom
  }% ${state.crop.left + transform.cropLeft}%)`;
}

function getSlotTransformStyle(slotIndex) {
  const transform = getSlotTransform(slotIndex);
  const scale = state.zoom * (transform.scale / 100);
  return `translate(${transform.x}%, ${transform.y}%) scale(${scale}) rotate(${transform.rotate}deg)`;
}

function ensureSlideSlots() {
  const imageIds = state.images.map((image) => image.id);
  const usedIds = new Set(state.slideSlots.filter(Boolean));

  for (const id of imageIds) {
    if (!usedIds.has(id)) {
      state.slideSlots.push(id);
    }
  }

  state.slideSlots = state.slideSlots.filter((slot) => slot === null || imageIds.includes(slot));

  const pageSize = getPageSize();
  const remainder = state.slideSlots.length % pageSize;
  if (state.slideSlots.length > 0 && remainder !== 0) {
    state.slideSlots.push(...Array(pageSize - remainder).fill(null));
  }
}

function sortImages() {
  if (state.sortMode === "manual") return;

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

function getBackgroundFilterStyle() {
  const { brightness, saturate, blur } = state.backgroundFilters;
  return `blur(${blur}px) brightness(${brightness / 100}) saturate(${saturate / 100})`;
}

function getCropStyle() {
  return `inset(${state.crop.top}% ${state.crop.right}% ${state.crop.bottom}% ${state.crop.left}%)`;
}

function renderCover() {
  const metaItems = [
    state.coverVisibility.hospitalName ? els.hospitalName.value : "",
    state.coverVisibility.presenterName ? els.presenterName.value : "",
    state.coverVisibility.date ? new Date().toLocaleDateString("ko-KR") : "",
  ].filter(Boolean);

  els.stage.className = "stage stage-cover";
  els.stage.innerHTML = `
    <div class="cover-card">
      ${
        state.coverVisibility.logo && state.logoUrl
          ? `<img class="cover-logo" src="${state.logoUrl}" alt="Hospital logo" />`
          : ""
      }
      ${state.coverVisibility.title ? `<h2 class="cover-title">${escapeHtml(els.coverTitle.value)}</h2>` : ""}
      ${
        state.coverVisibility.subtitle
          ? `<p class="cover-subtitle">${escapeHtml(els.coverSubtitle.value)}</p>`
          : ""
      }
      ${
        metaItems.length > 0
          ? `<div class="cover-meta">${metaItems
              .map((item) => `<span>${escapeHtml(item)}</span>`)
              .join("")}</div>`
          : ""
      }
    </div>
  `;
}

function renderImageCard(image, slotIndex) {
  const filter = getFilterStyle();
  const backgroundFilter = getBackgroundFilterStyle();
  const imageTransform = getSlotTransformStyle(slotIndex);
  const cropStyle = getSlotCropStyle(slotIndex);
  const selectedClass = state.selectedSlotIndex === slotIndex ? "is-selected" : "";

  if (!image) {
    return `
      <figure
        class="image-card empty-slot ${selectedClass}"
        data-slot-index="${slotIndex}"
        title="사진 또는 빈칸을 여기로 드래그하세요"
      >
        <div class="empty-slot-inner">
          <strong>빈칸</strong>
          <span>우측 사진을 끌어다 놓기</span>
        </div>
      </figure>
    `;
  }

  return `
    <figure class="image-card ${state.backgroundEnabled ? "background-enabled" : ""} ${
      state.fitMode === "fill" ? "fit-fill" : ""
    } ${selectedClass}" data-slot-index="${slotIndex}" tabindex="0">
      <img
        class="blur-bg"
        src="${image.url}"
        alt=""
        aria-hidden="true"
        style="
          width: ${state.backgroundFilters.scale}%;
          height: ${state.backgroundFilters.scale}%;
          object-position: center ${state.backgroundFilters.y}%;
          filter: ${backgroundFilter};
        "
      />
      <img
        class="main-image"
        src="${image.url}"
        alt="${escapeHtml(image.name)}"
        style="clip-path: ${cropStyle}; filter: ${filter}; transform: ${imageTransform};"
      />
      <figcaption class="image-label">${escapeHtml(image.name)}</figcaption>
    </figure>
  `;
}

function renderGuides() {
  if (!state.guidesEnabled) return "";

  return `
    <div class="guide-layer">
      ${state.guides
        .map(
          (guide, index) => `
            <div
              class="guide guide-${guide.axis}"
              data-guide-index="${index}"
              data-label="${guide.percent.toFixed(1)}%"
              style="${guide.axis === "x" ? `left:${guide.percent}%` : `top:${guide.percent}%`}"
              title="드래그하거나 우클릭해서 위치 입력"
            ></div>
          `,
        )
        .join("")}
    </div>
    <div class="guide-ruler guide-ruler-top" data-ruler-axis="x" title="클릭/드래그해서 세로 안내선 추가"></div>
    <div class="guide-ruler guide-ruler-left" data-ruler-axis="y" title="클릭/드래그해서 가로 안내선 추가"></div>
  `;
}

function renderSlide() {
  const pageSize = getPageSize();
  const imagePageIndex = state.pageIndex - 1;
  const start = imagePageIndex * pageSize;
  const pageSlots = state.slideSlots.slice(start, start + pageSize);

  els.stage.className = `stage layout-${state.layoutMode}`;

  if (pageSlots.length === 0) {
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

  const layoutClass = state.layoutMode === "custom" ? "layout-custom" : `layout-${state.layoutMode}`;
  els.stage.innerHTML = `
    <div
      class="slide-grid ${layoutClass}"
      style="--grid-cols:${state.gridCols}; --grid-rows:${state.gridRows};"
    >
      ${pageSlots.map((imageId, offset) => renderImageCard(getImageById(imageId), start + offset)).join("")}
    </div>
    ${renderGuides()}
  `;

  bindGuideInteractions();
  bindSlotDropTargets();
}

function render() {
  sortImages();
  ensureSlideSlots();
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
  syncSelectedSlotControls();
  renderGuideControls();
  renderThumbnails();
  renderPhotoList();
  queuePersist();
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

function imageFromDataUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = url;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

async function urlToDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return fileToDataUrl(blob);
}

function getImageFiles(fileList) {
  return Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));
}

async function loadImageFiles(fileList) {
  const imageFiles = getImageFiles(fileList);
  if (imageFiles.length === 0) return;

  const files = imageFiles.map(async (file) => ({
    id: crypto.randomUUID?.() ?? `${file.name}-${file.lastModified}-${Math.random()}`,
    name: file.name,
    modifiedAt: file.lastModified,
    url: await fileToDataUrl(file),
  }));

  state.images = await Promise.all(files);
  state.slideSlots = state.images.map((image) => image.id);
  state.slotTransforms = {};
  state.selectedSlotIndex = null;
  els.imageFileName.textContent =
    state.images.length > 0 ? `${state.images.length}장 선택됨` : "선택된 사진 없음";

  state.pageIndex = state.images.length > 0 ? 1 : 0;
  render();
}

function hasDraggedFiles(event) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function showDropOverlay() {
  document.body.classList.add("is-file-dragging");
  els.dropOverlay?.setAttribute("aria-hidden", "false");
}

function hideDropOverlay() {
  document.body.classList.remove("is-file-dragging");
  els.dropOverlay?.setAttribute("aria-hidden", "true");
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

function closeDialogFromBackdrop(event) {
  if (event.target !== els.shortcutDialog) return;

  const rect = els.shortcutDialog.getBoundingClientRect();
  const isInside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  if (!isInside) hideShortcutHelp();
}

function bindInputRerender(input) {
  input.addEventListener("input", render);
}

function bindVisibilityToggle(input, key) {
  input.addEventListener("change", () => {
    state.coverVisibility[key] = input.checked;
    render();
  });
}

function bindFilter(input, output, suffix = "%") {
  input.addEventListener("input", () => {
    state.filters[input.id] = Number(input.value);
    output.textContent = `${input.value}${suffix}`;
    render();
  });
}

function bindBackgroundFilter(input, output, key, suffix = "%") {
  input.addEventListener("input", () => {
    state.backgroundFilters[key] = Number(input.value);
    output.textContent = `${input.value}${suffix}`;
    render();
  });
}

function bindCrop(input, output, key) {
  input.addEventListener("input", () => {
    state.crop[key] = Number(input.value);
    output.textContent = `${input.value}%`;
    render();
  });
}

function syncSelectedSlotControls() {
  const slotIndex = Number(state.selectedSlotIndex);
  const hasSlot =
    Number.isFinite(slotIndex) &&
    slotIndex >= 0 &&
    state.slideSlots[slotIndex] &&
    Boolean(getImageById(state.slideSlots[slotIndex]));

  if (!els.selectedSlotLabel) return;

  const controls = [
    els.slotScale,
    els.slotX,
    els.slotY,
    els.slotRotate,
    els.slotCropLeft,
    els.slotCropRight,
    els.slotCropTop,
    els.slotCropBottom,
    els.resetSlotTransformButton,
  ].filter(Boolean);

  for (const control of controls) control.disabled = !hasSlot;

  if (!hasSlot) {
    els.selectedSlotLabel.textContent = "Select a photo slot";
    return;
  }

  const transform = getSlotTransform(slotIndex);
  els.selectedSlotLabel.textContent = `Slot ${slotIndex + 1}`;
  const bindings = [
    [els.slotScale, els.slotScaleValue, transform.scale, "%"],
    [els.slotX, els.slotXValue, transform.x, "%"],
    [els.slotY, els.slotYValue, transform.y, "%"],
    [els.slotRotate, els.slotRotateValue, transform.rotate, "deg"],
    [els.slotCropLeft, els.slotCropLeftValue, transform.cropLeft, "%"],
    [els.slotCropRight, els.slotCropRightValue, transform.cropRight, "%"],
    [els.slotCropTop, els.slotCropTopValue, transform.cropTop, "%"],
    [els.slotCropBottom, els.slotCropBottomValue, transform.cropBottom, "%"],
  ];

  for (const [input, output, value, suffix] of bindings) {
    if (!input || !output) continue;
    input.value = value;
    output.textContent = `${value}${suffix}`;
  }
}

function selectSlot(slotIndex) {
  state.selectedSlotIndex = Number(slotIndex);
  render();
}

function updateSelectedSlotTransform(key, value) {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !state.slideSlots[slotIndex]) return;
  getSlotTransform(slotIndex)[key] = Number(value);
  render();
}

function bindSlotTransform(input, output, key, suffix = "%") {
  if (!input || !output) return;
  input.addEventListener("input", () => {
    output.textContent = `${input.value}${suffix}`;
    updateSelectedSlotTransform(key, input.value);
  });
}

function setGrid(rows, cols, mode = "custom") {
  state.gridRows = clamp(rows, 1, 4);
  state.gridCols = clamp(cols, 1, 6);
  state.layoutMode = mode;
  els.gridRows.value = state.gridRows;
  els.gridCols.value = state.gridCols;
  els.layoutMode.value = mode;
  state.pageIndex = Math.min(state.pageIndex, getTotalPages() - 1);
  render();
}

function setLayoutPreset(mode) {
  const preset = {
    single: [1, 1],
    pair: [1, 2],
    triple: [1, 3],
    quad: [2, 2],
  }[mode];

  setGrid(preset[0], preset[1], mode);
}

function addGuide(axis, percent = 50) {
  state.guides.push({
    axis,
    percent: clamp(percent, 0, 100),
  });
  render();
}

function renderGuideControls() {
  if (!els.guideListPanel) return;

  if (state.guides.length === 0) {
    els.guideListPanel.innerHTML = `
      <p class="guide-empty">아직 안내선이 없습니다. + 버튼으로 추가하세요.</p>
    `;
    return;
  }

  els.guideListPanel.innerHTML = state.guides
    .map((guide, index) => {
      const label = guide.axis === "x" ? "세로" : "가로";
      return `
        <div class="guide-control" data-guide-control="${index}">
          <div class="guide-control-head">
            <strong>${label} 안내선 ${index + 1}</strong>
            <output>${guide.percent.toFixed(1)}%</output>
            <button type="button" data-guide-delete="${index}" aria-label="${label} 안내선 삭제">×</button>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value="${guide.percent}"
            data-guide-slider="${index}"
          />
        </div>
      `;
    })
    .join("");

  els.guideListPanel.querySelectorAll("[data-guide-slider]").forEach((slider) => {
    slider.addEventListener("input", () => {
      const index = Number(slider.dataset.guideSlider);
      const value = Number(slider.value);
      if (!state.guides[index] || !Number.isFinite(value)) return;
      state.guides[index].percent = clamp(value, 0, 100);
      slider.closest(".guide-control")?.querySelector("output")?.replaceChildren(`${value.toFixed(1)}%`);

      const guideEl = els.stage.querySelector(`[data-guide-index="${index}"]`);
      if (guideEl) {
        guideEl.style[state.guides[index].axis === "x" ? "left" : "top"] = `${state.guides[index].percent}%`;
        guideEl.dataset.label = `${state.guides[index].percent.toFixed(1)}%`;
      }

      queuePersist();
    });

    slider.addEventListener("change", render);
  });

  els.guideListPanel.querySelectorAll("[data-guide-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.guideDelete);
      state.guides.splice(index, 1);
      render();
    });
  });
}

function setSlot(slotIndex, imageId) {
  if (slotIndex < 0) return;

  while (state.slideSlots.length <= slotIndex) {
    state.slideSlots.push(null);
  }

  state.slideSlots[slotIndex] = imageId;
  if (imageId) state.selectedSlotIndex = slotIndex;
  render();
}

function addEmptySlot() {
  state.slideSlots.push(null);
  goToPage(Math.max(1, Math.ceil(state.slideSlots.length / getPageSize())));
}

function bindSlotDropTargets() {
  els.stage.querySelectorAll("[data-slot-index]").forEach((slot) => {
    slot.addEventListener("click", () => {
      const slotIndex = Number(slot.dataset.slotIndex);
      if (state.slideSlots[slotIndex]) selectSlot(slotIndex);
    });

    slot.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const slotIndex = Number(slot.dataset.slotIndex);
      if (state.slideSlots[slotIndex]) selectSlot(slotIndex);
    });

    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
      slot.classList.add("is-drop-target");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("is-drop-target");
    });

    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      slot.classList.remove("is-drop-target");
      const slotIndex = Number(slot.dataset.slotIndex);
      const payload = event.dataTransfer.getData("application/x-medical-presenter");

      if (payload === "empty") {
        setSlot(slotIndex, null);
        return;
      }

      if (payload) setSlot(slotIndex, payload);
    });
  });
}

function updateGuide(index, percent) {
  if (!state.guides[index]) return;
  state.guides[index].percent = clamp(percent, 0, 100);
  render();
}

function bindGuideInteractions() {
  els.stage.querySelectorAll(".guide").forEach((guideEl) => {
    guideEl.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const index = Number(guideEl.dataset.guideIndex);
      const guide = state.guides[index];
      guideEl.setPointerCapture(event.pointerId);

      const onMove = (moveEvent) => {
        const rect = els.stage.getBoundingClientRect();
        const percent =
          guide.axis === "x"
            ? ((moveEvent.clientX - rect.left) / rect.width) * 100
            : ((moveEvent.clientY - rect.top) / rect.height) * 100;
        guide.percent = clamp(percent, 0, 100);
        guideEl.style[guide.axis === "x" ? "left" : "top"] = `${guide.percent}%`;
        guideEl.dataset.label = `${guide.percent.toFixed(1)}%`;
      };

      const onUp = () => {
        guideEl.removeEventListener("pointermove", onMove);
        guideEl.removeEventListener("pointerup", onUp);
        render();
      };

      guideEl.addEventListener("pointermove", onMove);
      guideEl.addEventListener("pointerup", onUp);
    });

    guideEl.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const index = Number(guideEl.dataset.guideIndex);
      const current = state.guides[index]?.percent ?? 50;
      const next = window.prompt("안내선 위치를 퍼센트로 입력하세요.", current.toFixed(1));
      if (next === null) return;
      const value = Number(next);
      if (!Number.isFinite(value)) return;
      updateGuide(index, value);
    });
  });

  els.stage.querySelectorAll(".guide-ruler").forEach((ruler) => {
    ruler.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const axis = ruler.dataset.rulerAxis;
      const guide = { axis, percent: 50 };
      state.guides.push(guide);

      const updateFromPointer = (pointerEvent) => {
        const rect = els.stage.getBoundingClientRect();
        const percent =
          axis === "x"
            ? ((pointerEvent.clientX - rect.left) / rect.width) * 100
            : ((pointerEvent.clientY - rect.top) / rect.height) * 100;
        guide.percent = clamp(percent, 0, 100);
      };

      updateFromPointer(event);

      const onMove = (moveEvent) => {
        updateFromPointer(moveEvent);
        const createdGuide = els.stage.querySelector(`[data-guide-index="${state.guides.length - 1}"]`);
        if (!createdGuide) return;
        createdGuide.style[axis === "x" ? "left" : "top"] = `${guide.percent}%`;
        createdGuide.dataset.label = `${guide.percent.toFixed(1)}%`;
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        render();
      };

      render();
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  });
}

function renderThumbnails() {
  if (!els.thumbnailRail) return;

  if (state.images.length === 0) {
    els.thumbnailRail.innerHTML = `
      <div class="thumbnail-empty">
        사진을 선택하면 여기에 슬라이드 미리보기와 사진 순서가 표시됩니다.
      </div>
    `;
    return;
  }

  const pageSize = getPageSize();
  const slidePages = Array.from({ length: Math.ceil(state.slideSlots.length / pageSize) }, (_, pageIndex) => {
    const start = pageIndex * pageSize;
    return {
      pageIndex: pageIndex + 1,
      slots: state.slideSlots.slice(start, start + pageSize),
    };
  });

  const slideLayoutClass = state.layoutMode === "custom" ? "layout-custom" : `layout-${state.layoutMode}`;

  els.thumbnailRail.innerHTML = `
    <div class="thumbnail-section">
      <div class="thumbnail-section-head">
        <strong>슬라이드 미리보기</strong>
        <span>${state.gridCols} x ${state.gridRows} · 페이지당 ${pageSize}장</span>
      </div>
      <div class="slide-preview-row">
        <button
          class="slide-thumb ${state.pageIndex === 0 ? "is-active" : ""}"
          type="button"
          data-page="0"
        >
          <div class="slide-thumb-cover">
            <span>Cover</span>
          </div>
        </button>
        ${slidePages
          .map(
            (page) => `
              <button
                class="slide-thumb ${state.pageIndex === page.pageIndex ? "is-active" : ""}"
                type="button"
                data-page="${page.pageIndex}"
                title="${page.pageIndex}페이지"
              >
                <div
                  class="slide-thumb-grid ${slideLayoutClass}"
                  style="--grid-cols:${state.gridCols}; --grid-rows:${state.gridRows};"
                >
                  ${page.slots
                    .map((imageId) => {
                      const image = getImageById(imageId);
                      return image
                        ? `<img src="${image.url}" alt="" />`
                        : `<div class="slide-thumb-empty"></div>`;
                    })
                    .join("")}
                </div>
                <span class="slide-thumb-label">${page.pageIndex}</span>
              </button>
            `,
          )
          .join("")}
      </div>
    </div>

      <div class="thumbnail-section">
      <div class="thumbnail-section-head">
        <strong>현재 슬라이드 슬롯</strong>
        <span>비어 있는 칸도 슬라이드에 유지됩니다</span>
      </div>
      <div class="photo-order-row slot-summary-row">
        ${state.slideSlots
          .map(
            (imageId, index) => {
              const image = getImageById(imageId);
              return `
        <button
          class="photo-order-card ${image ? "" : "is-empty"}"
          type="button"
          data-slot-page="${1 + Math.floor(index / pageSize)}"
          title="${image ? escapeHtml(image.name) : "빈칸"}"
        >
          ${image ? `<img src="${image.url}" alt="" />` : `<div class="photo-empty-thumb">빈칸</div>`}
          <span>${index + 1}</span>
        </button>
      `;
            },
          )
          .join("")}
      </div>
    </div>
  `;

  els.thumbnailRail.querySelectorAll(".slide-thumb").forEach((button) => {
    button.addEventListener("click", () => {
      goToPage(Number(button.dataset.page));
    });
  });

  els.thumbnailRail.querySelectorAll(".photo-order-card").forEach((button) => {
    button.addEventListener("click", () => {
      goToPage(Number(button.dataset.slotPage));
    });
  });
}

function renderPhotoList() {
  if (!els.photoListPanel) return;

  if (state.images.length === 0) {
    els.photoListPanel.innerHTML = `<p class="photo-list-empty">사진을 업로드하면 전체 목록이 표시됩니다.</p>`;
    return;
  }

  els.photoListPanel.innerHTML = state.images
    .map(
      (image, index) => `
        <article
          class="photo-list-card"
          draggable="true"
          data-image-id="${image.id}"
          data-index="${index}"
          title="${escapeHtml(image.name)}"
        >
          <img src="${image.url}" alt="" />
          <div>
            <strong>${index + 1}</strong>
            <span>${escapeHtml(image.name)}</span>
          </div>
        </article>
      `,
    )
    .join("");

  els.photoListPanel.querySelectorAll(".photo-list-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("application/x-medical-presenter", card.dataset.imageId);
      event.dataTransfer.setData("text/plain", card.dataset.index);
    });

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("is-reorder-target");
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("is-reorder-target");
    });

    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("is-reorder-target");
      const from = Number(event.dataTransfer.getData("text/plain"));
      const to = Number(card.dataset.index);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;

      const [moved] = state.images.splice(from, 1);
      state.images.splice(to, 0, moved);

      if (isSequentialSlotComposition()) {
        state.slideSlots = state.images.map((image) => image.id);
      }

      state.sortMode = "manual";
      els.sortMode.value = "manual";
      render();
    });
  });
}

function isSequentialSlotComposition() {
  const compactSlots = state.slideSlots.filter(Boolean);
  if (compactSlots.length !== state.images.length) return false;
  return compactSlots.every((id) => state.images.some((image) => image.id === id));
}

async function downloadAdjustedImages() {
  if (state.images.length === 0) {
    alert("먼저 사진을 선택해주세요.");
    return;
  }

  const { brightness, contrast, saturate, hue } = state.filters;

  const orderedImages = state.slideSlots
    .map((imageId, slotIndex) => ({ item: getImageById(imageId), slotIndex }))
    .filter(({ item }) => Boolean(item));

  for (const [index, { item, slotIndex }] of orderedImages.entries()) {
    const image = await imageFromDataUrl(item.url);
    const transform = getSlotTransform(slotIndex);
    const cropLeftPx = Math.round(image.naturalWidth * ((state.crop.left + transform.cropLeft) / 100));
    const cropRightPx = Math.round(image.naturalWidth * ((state.crop.right + transform.cropRight) / 100));
    const cropTopPx = Math.round(image.naturalHeight * ((state.crop.top + transform.cropTop) / 100));
    const cropBottomPx = Math.round(image.naturalHeight * ((state.crop.bottom + transform.cropBottom) / 100));
    const sourceWidth = Math.max(1, image.naturalWidth - cropLeftPx - cropRightPx);
    const sourceHeight = Math.max(1, image.naturalHeight - cropTopPx - cropBottomPx);
    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const ctx = canvas.getContext("2d");
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hue}deg)`;
    ctx.drawImage(
      image,
      cropLeftPx,
      cropTopPx,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    );

    await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve();
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${String(index + 1).padStart(3, "0")}-${item.name.replace(/\.[^.]+$/, "")}.png`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setTimeout(resolve, 120);
      }, "image/png");
    });
  }
}

els.logoInput.addEventListener("change", async () => {
  const file = els.logoInput.files?.[0];
  if (!file) return;
  state.logoUrl = await fileToDataUrl(file);
  els.logoFileName.textContent = file.name;
  render();
});

els.imageInput.addEventListener("change", async () => {
  await loadImageFiles(els.imageInput.files);
  els.imageInput.value = "";
});

els.sortMode.addEventListener("change", () => {
  state.sortMode = els.sortMode.value;
  render();
});

els.layoutMode.addEventListener("change", () => {
  state.layoutMode = els.layoutMode.value;
  if (state.layoutMode !== "custom") {
    const preset = {
      single: [1, 1],
      pair: [1, 2],
      triple: [1, 3],
      quad: [2, 2],
    }[state.layoutMode];
    state.gridRows = preset[0];
    state.gridCols = preset[1];
    els.gridRows.value = state.gridRows;
    els.gridCols.value = state.gridCols;
  }
  state.pageIndex = Math.min(state.pageIndex, getTotalPages() - 1);
  render();
});

els.layoutOneButton.addEventListener("click", () => setLayoutPreset("single"));
els.layoutTwoButton.addEventListener("click", () => setLayoutPreset("pair"));
els.layoutThreeButton.addEventListener("click", () => setLayoutPreset("triple"));
els.layoutFourButton.addEventListener("click", () => setLayoutPreset("quad"));
els.horizontalSplitButton.addEventListener("click", () => setGrid(1, Math.max(2, state.gridCols)));
els.verticalSplitButton.addEventListener("click", () => setGrid(Math.max(2, state.gridRows), 1));
els.gridRows.addEventListener("input", () => setGrid(Number(els.gridRows.value), state.gridCols));
els.gridCols.addEventListener("input", () => setGrid(state.gridRows, Number(els.gridCols.value)));

els.prevButton.addEventListener("click", () => goToPage(state.pageIndex - 1));
els.nextButton.addEventListener("click", () => goToPage(state.pageIndex + 1));
els.fitButton.addEventListener("click", () => updateFitMode("fit"));
els.fillButton.addEventListener("click", () => updateFitMode("fill"));
els.backgroundButton.addEventListener("click", toggleBackground);
els.presentButton.addEventListener("click", togglePresentationMode);
els.shortcutHelpButton.addEventListener("click", showShortcutHelp);
els.closeShortcutHelpButton.addEventListener("click", hideShortcutHelp);
els.shortcutDialog.addEventListener("click", closeDialogFromBackdrop);
els.exportButton.addEventListener("click", exportStandaloneHtml);
els.downloadImagesButton.addEventListener("click", downloadAdjustedImages);
els.emptySlotToken.addEventListener("dragstart", (event) => {
  event.dataTransfer.setData("application/x-medical-presenter", "empty");
});
els.addEmptySlotButton.addEventListener("click", addEmptySlot);
els.zoomOutButton.addEventListener("click", () => updateZoom(-0.1));
els.zoomInButton.addEventListener("click", () => updateZoom(0.1));

bindInputRerender(els.coverTitle);
bindInputRerender(els.coverSubtitle);
bindInputRerender(els.hospitalName);
bindInputRerender(els.presenterName);
bindVisibilityToggle(els.showCoverTitle, "title");
bindVisibilityToggle(els.showCoverSubtitle, "subtitle");
bindVisibilityToggle(els.showHospitalName, "hospitalName");
bindVisibilityToggle(els.showPresenterName, "presenterName");
bindVisibilityToggle(els.showCoverDate, "date");
bindVisibilityToggle(els.showCoverLogo, "logo");
bindFilter(els.brightness, els.brightnessValue);
bindFilter(els.contrast, els.contrastValue);
bindFilter(els.saturate, els.saturateValue);
bindFilter(els.hue, els.hueValue, "°");
bindBackgroundFilter(els.bgBrightness, els.bgBrightnessValue, "brightness");
bindBackgroundFilter(els.bgSaturate, els.bgSaturateValue, "saturate");
bindBackgroundFilter(els.bgBlur, els.bgBlurValue, "blur", "px");
bindBackgroundFilter(els.bgScale, els.bgScaleValue, "scale", "%");
bindBackgroundFilter(els.bgY, els.bgYValue, "y", "%");
bindCrop(els.cropLeft, els.cropLeftValue, "left");
bindCrop(els.cropRight, els.cropRightValue, "right");
bindCrop(els.cropTop, els.cropTopValue, "top");
bindCrop(els.cropBottom, els.cropBottomValue, "bottom");
bindSlotTransform(els.slotScale, els.slotScaleValue, "scale");
bindSlotTransform(els.slotX, els.slotXValue, "x");
bindSlotTransform(els.slotY, els.slotYValue, "y");
bindSlotTransform(els.slotRotate, els.slotRotateValue, "rotate", "deg");
bindSlotTransform(els.slotCropLeft, els.slotCropLeftValue, "cropLeft");
bindSlotTransform(els.slotCropRight, els.slotCropRightValue, "cropRight");
bindSlotTransform(els.slotCropTop, els.slotCropTopValue, "cropTop");
bindSlotTransform(els.slotCropBottom, els.slotCropBottomValue, "cropBottom");
els.resetSlotTransformButton?.addEventListener("click", () => {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0) return;
  state.slotTransforms[slotIndex] = getDefaultSlotTransform();
  render();
});
els.showGuides.addEventListener("change", () => {
  state.guidesEnabled = els.showGuides.checked;
  render();
});
els.addVerticalGuideButton.addEventListener("click", () => addGuide("x", 50));
els.addHorizontalGuideButton.addEventListener("click", () => addGuide("y", 50));
els.clearGuidesButton.addEventListener("click", () => {
  state.guides = [];
  render();
});

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

window.addEventListener("dragenter", (event) => {
  if (!hasDraggedFiles(event)) return;
  event.preventDefault();
  showDropOverlay();
});

window.addEventListener("dragover", (event) => {
  if (!hasDraggedFiles(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  showDropOverlay();
});

window.addEventListener("dragleave", (event) => {
  if (!hasDraggedFiles(event)) return;
  if (event.relatedTarget && document.documentElement.contains(event.relatedTarget)) return;
  hideDropOverlay();
});

window.addEventListener("drop", async (event) => {
  if (!hasDraggedFiles(event)) return;
  event.preventDefault();
  hideDropOverlay();
  await loadImageFiles(event.dataTransfer.files);
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
    coverVisibility: state.coverVisibility,
    images: state.images,
    slideSlots: state.slideSlots,
    slotTransforms: state.slotTransforms,
    layoutMode: state.layoutMode,
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    sortMode: state.sortMode,
    fitMode: state.fitMode,
    backgroundEnabled: state.backgroundEnabled,
    backgroundFilters: state.backgroundFilters,
    crop: state.crop,
    zoom: state.zoom,
    guidesEnabled: state.guidesEnabled,
    guides: state.guides,
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

function getPersistData() {
  return {
    ...getPresentationData(),
    pageIndex: state.pageIndex,
    selectedSlotIndex: state.selectedSlotIndex,
  };
}

function queuePersist() {
  if (isRestoring) return;
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistData()));
    } catch {
      try {
        const settingsOnly = {
          ...getPersistData(),
          images: [],
          slideSlots: [],
          logoUrl: "",
          cover: { ...getPersistData().cover, logoUrl: "" },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsOnly));
      } catch {
        // Ignore storage quota failures; exporting HTML still preserves the full deck.
      }
    }
  }, 250);
}

function applyPersistedState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;

  try {
    const data = JSON.parse(saved);
    if (data.cover) {
      els.coverTitle.value = data.cover.title ?? els.coverTitle.value;
      els.coverSubtitle.value = data.cover.subtitle ?? els.coverSubtitle.value;
      els.hospitalName.value = data.cover.hospitalName ?? els.hospitalName.value;
      els.presenterName.value = data.cover.presenterName ?? els.presenterName.value;
      state.logoUrl = data.cover.logoUrl || data.logoUrl || state.logoUrl;
    }

    state.images = Array.isArray(data.images) ? data.images : state.images;
    state.slideSlots = Array.isArray(data.slideSlots) ? data.slideSlots : state.slideSlots;
    state.slotTransforms = data.slotTransforms ?? state.slotTransforms;
    state.selectedSlotIndex = data.selectedSlotIndex ?? state.selectedSlotIndex;
    state.layoutMode = data.layoutMode ?? state.layoutMode;
    state.gridRows = data.gridRows ?? state.gridRows;
    state.gridCols = data.gridCols ?? state.gridCols;
    state.sortMode = data.sortMode ?? state.sortMode;
    state.fitMode = data.fitMode ?? state.fitMode;
    state.backgroundEnabled = data.backgroundEnabled ?? state.backgroundEnabled;
    state.backgroundFilters = { ...state.backgroundFilters, ...(data.backgroundFilters ?? {}) };
    state.crop = { ...state.crop, ...(data.crop ?? {}) };
    state.zoom = data.zoom ?? state.zoom;
    state.guidesEnabled = data.guidesEnabled ?? state.guidesEnabled;
    state.guides = Array.isArray(data.guides) ? data.guides : state.guides;
    state.coverVisibility = { ...state.coverVisibility, ...(data.coverVisibility ?? {}) };
    state.filters = { ...state.filters, ...(data.filters ?? {}) };
    state.pageIndex = data.pageIndex ?? state.pageIndex;

    els.sortMode.value = state.sortMode;
    els.layoutMode.value = state.layoutMode;
    els.gridRows.value = state.gridRows;
    els.gridCols.value = state.gridCols;
    els.showGuides.checked = state.guidesEnabled;
    els.cropLeft.value = state.crop.left;
    els.cropRight.value = state.crop.right;
    if (els.cropTop) els.cropTop.value = state.crop.top;
    if (els.cropBottom) els.cropBottom.value = state.crop.bottom;
    els.cropLeftValue.textContent = `${state.crop.left}%`;
    els.cropRightValue.textContent = `${state.crop.right}%`;
    if (els.cropTopValue) els.cropTopValue.textContent = `${state.crop.top}%`;
    if (els.cropBottomValue) els.cropBottomValue.textContent = `${state.crop.bottom}%`;

    for (const [key, value] of Object.entries(state.coverVisibility)) {
      const input = {
        title: els.showCoverTitle,
        subtitle: els.showCoverSubtitle,
        hospitalName: els.showHospitalName,
        presenterName: els.showPresenterName,
        date: els.showCoverDate,
        logo: els.showCoverLogo,
      }[key];
      if (input) input.checked = value;
    }

    for (const key of ["brightness", "contrast", "saturate", "hue"]) {
      if (els[key]) els[key].value = state.filters[key];
    }
    els.brightnessValue.textContent = `${state.filters.brightness}%`;
    els.contrastValue.textContent = `${state.filters.contrast}%`;
    els.saturateValue.textContent = `${state.filters.saturate}%`;
    els.hueValue.textContent = `${state.filters.hue}째`;

    for (const [key, input] of [
      ["brightness", els.bgBrightness],
      ["saturate", els.bgSaturate],
      ["blur", els.bgBlur],
      ["scale", els.bgScale],
      ["y", els.bgY],
    ]) {
      if (input) input.value = state.backgroundFilters[key];
    }
    els.bgBrightnessValue.textContent = `${state.backgroundFilters.brightness}%`;
    els.bgSaturateValue.textContent = `${state.backgroundFilters.saturate}%`;
    els.bgBlurValue.textContent = `${state.backgroundFilters.blur}px`;
    els.bgScaleValue.textContent = `${state.backgroundFilters.scale}%`;
    els.bgYValue.textContent = `${state.backgroundFilters.y}%`;
    if (state.logoUrl) els.logoFileName.textContent = "saved logo";
    if (state.images.length > 0) els.imageFileName.textContent = `${state.images.length} files restored`;
    return true;
  } catch {
    return false;
  }
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
    @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css");
    :root { color-scheme: dark; --ink:#fffdf7; --muted:rgba(255,253,247,.68); --panel:rgba(20,19,17,.76); --line:rgba(255,253,247,.16); --accent:#d9a06f; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; color:var(--ink); font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:radial-gradient(circle at 15% 10%,rgba(217,160,111,.2),transparent 28rem),linear-gradient(135deg,#151512,#050505); }
    button,input,textarea,select { font:inherit; }
    button,select,input[type="range"] { border:1px solid var(--line); border-radius:999px; padding:.55rem .8rem; color:var(--ink); background:rgba(255,255,255,.08); }
    button { cursor:pointer; }
    .app { display:grid; grid-template-columns:20rem 1fr; gap:1rem; min-height:100vh; padding:1rem; }
    .panel { display:grid; align-content:start; gap:.85rem; max-height:calc(100vh - 2rem); overflow:auto; border:1px solid var(--line); border-radius:1.3rem; padding:1rem; background:var(--panel); backdrop-filter:blur(16px); }
    .panel h1 { margin:0; font-size:1.65rem; line-height:1; letter-spacing:-.04em; }
    .panel label { display:grid; gap:.35rem; color:var(--muted); font-size:.88rem; }
    .panel input[type="text"], .panel textarea, .panel select { width:100%; border-radius:.8rem; }
    .panel textarea { min-height:5.2rem; resize:vertical; line-height:1.45; }
    .toggle-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.45rem; }
    .toggle-pill { display:flex; align-items:center; gap:.45rem; color:var(--muted); font-size:.85rem; }
    .row { display:flex; gap:.5rem; align-items:center; }
    .row > * { flex:1; }
    .stage-wrap { display:grid; grid-template-rows:auto 1fr; gap:1rem; min-width:0; }
    .toolbar { display:flex; gap:.5rem; justify-content:flex-end; align-items:center; }
    .status { min-width:8rem; text-align:center; color:var(--muted); }
    .stage { position:relative; overflow:hidden; align-self:center; justify-self:center; width:min(100%,calc((100vh - 6rem) * 16 / 9)); aspect-ratio:16/9; border-radius:1.2rem; background:#111; box-shadow:0 24px 80px rgba(0,0,0,.45); }
    .cover { display:grid; place-items:center; padding:4rem; background:radial-gradient(circle at 20% 15%,rgba(255,255,255,.12),transparent 22rem),linear-gradient(145deg,#26231f,#080807); }
    .cover-card { width:min(75%,58rem); border:1px solid var(--line); border-radius:2rem; padding:3rem; background:rgba(255,255,255,.07); backdrop-filter:blur(18px); }
    .cover-logo { max-width:10rem; max-height:5rem; object-fit:contain; margin-bottom:2rem; }
    .cover-title { margin:0; font-size:clamp(2.5rem,6vw,6rem); line-height:.9; letter-spacing:-.07em; white-space:pre-line; }
    .cover-subtitle,.meta { color:var(--muted); }
    .grid { position:absolute; inset:0; display:grid; gap:1rem; padding:1rem; }
    .single { grid-template-columns:1fr; } .pair { grid-template-columns:repeat(2,1fr); } .triple { grid-template-columns:repeat(3,1fr); } .quad { grid-template-columns:repeat(2,1fr); grid-template-rows:repeat(2,1fr); } .custom { grid-template-columns:repeat(var(--grid-cols),1fr); grid-template-rows:repeat(var(--grid-rows),1fr); }
    .card { position:relative; overflow:hidden; border:1px solid var(--line); border-radius:1rem; background:#050505; }
    .card.empty { border-style:dashed; background:rgba(255,255,255,.04); }
    .blur { position:absolute; top:50%; left:50%; width:176.2%; height:176.2%; object-fit:cover; object-position:center 62%; filter:blur(150px) brightness(.72) saturate(.92); opacity:0; transform:translate(-50%,-42%); }
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
    kbd { display:inline-grid; place-items:center; min-width:1.9rem; min-height:1.7rem; border:1px solid var(--line); border-radius:.45rem; padding:.12rem .38rem; background:rgba(255,255,255,.1); font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; font-size:.78rem; }
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
      <label>제목 <textarea id="title" rows="2"></textarea></label>
      <label>부제 <input id="subtitle" type="text" /></label>
      <label>병원명 <input id="hospital" type="text" /></label>
      <label>발표자 <input id="presenter" type="text" /></label>
      <div class="toggle-grid">
        <label class="toggle-pill"><input id="showTitle" type="checkbox"> 제목</label>
        <label class="toggle-pill"><input id="showSubtitle" type="checkbox"> 부제</label>
        <label class="toggle-pill"><input id="showHospital" type="checkbox"> 병원명</label>
        <label class="toggle-pill"><input id="showPresenter" type="checkbox"> 발표자</label>
        <label class="toggle-pill"><input id="showDate" type="checkbox"> 날짜</label>
        <label class="toggle-pill"><input id="showLogo" type="checkbox"> 로고</label>
      </div>
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
    const pageSize = () => state.layoutMode==="custom" ? (state.gridRows||1)*(state.gridCols||1) : ({ single:1, pair:2, triple:3, quad:4 }[state.layoutMode] || 2);
    const totalPages = () => 1 + Math.ceil((state.slideSlots?.length || state.images.length) / pageSize());
    const $ = (id) => document.getElementById(id);
    const esc = (v) => String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    const filter = () => \`brightness(\${state.filters.brightness}%) contrast(\${state.filters.contrast}%) saturate(\${state.filters.saturate}%) hue-rotate(\${state.filters.hue}deg)\`;
    function syncInputs(){ $("title").value=state.cover.title; $("subtitle").value=state.cover.subtitle; $("hospital").value=state.cover.hospitalName; $("presenter").value=state.cover.presenterName; $("layout").value=state.layoutMode; $("showTitle").checked=state.coverVisibility.title; $("showSubtitle").checked=state.coverVisibility.subtitle; $("showHospital").checked=state.coverVisibility.hospitalName; $("showPresenter").checked=state.coverVisibility.presenterName; $("showDate").checked=state.coverVisibility.date; $("showLogo").checked=state.coverVisibility.logo; for (const key of ["brightness","contrast","saturate","hue"]) $(key).value=state.filters[key]; }
    function render(){ state.pageIndex=Math.min(Math.max(state.pageIndex,0),totalPages()-1); if(state.pageIndex===0) renderCover(); else renderSlide(); $("status").textContent=state.pageIndex===0?\`Cover / \${totalPages()}\`:\`\${state.pageIndex+1} / \${totalPages()}\`; $("bg").textContent=state.backgroundEnabled?"배경 채우기 켜짐 Enter":"배경 채우기 꺼짐 Enter"; }
    function renderCover(){ const meta=[state.coverVisibility.hospitalName?state.cover.hospitalName:"",state.coverVisibility.presenterName?state.cover.presenterName:"",state.coverVisibility.date?state.cover.date:""].filter(Boolean); $("stage").className="stage cover"; $("stage").innerHTML=\`<div class="cover-card">\${state.coverVisibility.logo&&state.cover.logoUrl?\`<img class="cover-logo" src="\${state.cover.logoUrl}" alt="logo">\`:""}\${state.coverVisibility.title?\`<h2 class="cover-title">\${esc(state.cover.title)}</h2>\`:""}\${state.coverVisibility.subtitle?\`<p class="cover-subtitle">\${esc(state.cover.subtitle)}</p>\`:""}\${meta.length?\`<p class="meta">\${meta.map(esc).join(" · ")}</p>\`:""}</div>\`; }
    function getImage(id){ return state.images.find((image)=>image.id===id); }
    function slotTransform(i){ return {scale:100,x:0,y:0,rotate:0,cropLeft:0,cropRight:0,cropTop:0,cropBottom:0,...(state.slotTransforms?.[i]||{})}; }
    function crop(i){ const t=slotTransform(i), c=state.crop||{left:0,right:0,top:0,bottom:0}; return \`inset(\${(c.top||0)+t.cropTop}% \${(c.right||0)+t.cropRight}% \${(c.bottom||0)+t.cropBottom}% \${(c.left||0)+t.cropLeft}%)\`; }
    function photoTransform(i){ const t=slotTransform(i); return \`translate(\${t.x}%, \${t.y}%) scale(\${(state.zoom||1)*(t.scale/100)}) rotate(\${t.rotate}deg)\`; }
    function card(img, slotIndex){ if(!img) return \`<figure class="card empty"></figure>\`; return \`<figure class="card \${state.backgroundEnabled?"bg-on":""} \${state.fitMode==="fill"?"fill":""}"><img class="blur" src="\${img.url}" alt=""><img class="photo" src="\${img.url}" alt="\${esc(img.name)}" style="clip-path:\${crop(slotIndex)};filter:\${filter()};transform:\${photoTransform(slotIndex)}"><figcaption class="label">\${esc(img.name)}</figcaption></figure>\`; }
    function renderSlide(){ const start=(state.pageIndex-1)*pageSize(); const slots=(state.slideSlots?.length?state.slideSlots:state.images.map((image)=>image.id)).slice(start,start+pageSize()); const cls=state.layoutMode==="custom"?"custom":state.layoutMode; $("stage").className="stage"; $("stage").innerHTML=\`<div class="grid \${cls}" style="--grid-cols:\${state.gridCols||2};--grid-rows:\${state.gridRows||1}">\${slots.map((id,offset)=>card(getImage(id),start+offset)).join("")}</div>\`; }
    function go(n){ state.pageIndex=n; render(); }
    function present(){ document.body.classList.toggle("presenting"); if(document.body.classList.contains("presenting")) $("stage").requestFullscreen?.().catch(()=>{}); else document.exitFullscreen?.().catch(()=>{}); }
    function showHelp(){ if(!$("shortcutDialog").open) $("shortcutDialog").showModal(); }
    function hideHelp(){ if($("shortcutDialog").open) $("shortcutDialog").close(); }
    function backdropClose(e){ if(e.target!==$("shortcutDialog")) return; const r=$("shortcutDialog").getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) hideHelp(); }
    $("prev").onclick=()=>go(state.pageIndex-1); $("next").onclick=()=>go(state.pageIndex+1); $("fit").onclick=()=>{state.fitMode="fit";render()}; $("fill").onclick=()=>{state.fitMode="fill";render()}; $("bg").onclick=()=>{state.backgroundEnabled=!state.backgroundEnabled;render()}; $("present").onclick=present;
    $("help").onclick=showHelp; $("closeHelp").onclick=hideHelp;
    $("shortcutDialog").onclick=backdropClose;
    for (const id of ["title","subtitle","hospital","presenter"]) $(id).oninput=()=>{ const map={title:"title",subtitle:"subtitle",hospital:"hospitalName",presenter:"presenterName"}; state.cover[map[id]]=$(id).value; render(); };
    for (const [id,key] of [["showTitle","title"],["showSubtitle","subtitle"],["showHospital","hospitalName"],["showPresenter","presenterName"],["showDate","date"],["showLogo","logo"]]) $(id).onchange=()=>{state.coverVisibility[key]=$(id).checked;render()};
    $("layout").onchange=()=>{state.layoutMode=$("layout").value;render()}; for (const key of ["brightness","contrast","saturate","hue"]) $(key).oninput=()=>{state.filters[key]=Number($(key).value);render()};
    document.onkeydown=(e)=>{ if(["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return; if(e.key==="?"||(e.shiftKey&&e.key==="/")){e.preventDefault();showHelp();return} if(e.key==="Escape"){ if($("shortcutDialog").open){hideHelp();return} if(document.body.classList.contains("presenting")){document.body.classList.remove("presenting");document.exitFullscreen?.().catch(()=>{})} } if(e.key==="F5"){e.preventDefault(); if(!e.shiftKey)go(0); present()} if(e.key==="ArrowLeft"||e.key==="ArrowUp"||e.key==="PageUp"||e.key.toLowerCase()==="p")go(state.pageIndex-1); if(e.key==="ArrowRight"||e.key==="ArrowDown"||e.key==="PageDown"||e.key===" "||e.key.toLowerCase()==="n")go(state.pageIndex+1); if(e.key==="Home")go(0); if(e.key==="End")go(totalPages()-1); if(e.key==="Enter"){state.backgroundEnabled=!state.backgroundEnabled;render()} if(e.key.toLowerCase()==="f"){state.fitMode=e.shiftKey?"fill":"fit";render()} if(e.key==="+") {state.zoom=Math.min(state.zoom+.1,2.5);render()} if(e.key==="-") {state.zoom=Math.max(state.zoom-.1,.5);render()} if(e.key==="0"){state.zoom=1;render()} if(e.key.toLowerCase()==="c")go(0); };
    syncInputs(); render();
  </script>
</body>
</html>`;
}

async function initializeDefaultLogo() {
  applyPersistedState();

  if (state.logoUrl) {
    isRestoring = false;
    render();
    return;
  }

  try {
    state.logoUrl = await urlToDataUrl(DEFAULT_LOGO_URL);
    els.logoFileName.textContent = DEFAULT_LOGO_NAME;
  } catch {
    state.logoUrl = DEFAULT_LOGO_URL;
  }

  isRestoring = false;
  render();
}

initializeDefaultLogo();
