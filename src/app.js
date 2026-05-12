const DEFAULT_LOGO_URL = "./logos/haist-urology-logo.jpg";
const LEGACY_STORAGE_KEY = "medical-image-presenter:v2";
const SETTINGS_STORAGE_KEY = "medical-image-presenter:settings:v3";
const ASSETS_STORAGE_KEY = "medical-image-presenter:assets:v3";
const DEFAULT_LOGO_NAME = "하이스트비뇨의학과로고.jpg";

const state = {
  images: [],
  slideSlots: [],
  slideCaptions: [],
  slidePageLayouts: [],
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
  isLoading: false,
  loadingProgress: 0,
  loadingMessage: "",
};

let settingsPersistTimer = null;
let assetsPersistTimer = null;
let settingsPersistIdleHandle = null;
let assetsPersistIdleHandle = null;
let isRestoring = true;
let thumbnailRenderKey = "";
let photoListRenderKey = "";
let photoListRenderToken = 0;
let guidePanelRenderKey = "";
let activeThumbnailButton = null;
let activePhotoListCard = null;
let thumbnailPageButtonCache = new Map();
let activeReorderTarget = null;
let activeSlideReorderTarget = null;
let activeStageSlotDropTarget = null;
let activeGuideDrag = null;
let activeSlotPan = null;
let previewRefreshTimer = null;
let previewWarmHandle = null;
let previewWarmQueue = [];
let pendingPreviewRefreshIds = new Set();
let lightweightRefreshFrame = null;
let pendingLightweightSlotIndices = null;
let selectedSlotUiKey = "";
let visibleSlideCardCache = new Map();
let visibleGuideCache = new Map();
let renderableImageNodeCache = new Map();
let renderableImageRootCache = new Map();
let guideControlOutputCache = new Map();
let pageSizeCacheVersion = -1;
let cachedPageSize = 2;
let totalPagesCacheKey = "";
let cachedTotalPages = 1;
let currentPageSlotMetaCacheKey = "";
let currentPageSlotMetaCache = null;
let filterStyleCacheKey = "";
let cachedFilterStyle = "";
let backgroundFilterStyleCacheKey = "";
let cachedBackgroundFilterStyle = "";
let imageIndexDirty = true;
let imageSortDirty = true;
let lastAppliedSortMode = state.sortMode;
let imageByIdIndex = new Map();
let usedCountsCacheVersion = -1;
let usedCountsCache = new Map();
let imagesVersion = 0;
let slideSlotsVersion = 0;
let layoutVersion = 0;
let guidesVersion = 0;
let lastPersistedSettingsJson = "";
let lastPersistedAssetsJson = "";
const previewCache = new Map();
const previewJobs = new Map();
const imageNameCollator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

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
  loadingOverlay: document.querySelector("#loadingOverlay"),
  loadingLabel: document.querySelector("#loadingLabel"),
  loadingMeta: document.querySelector("#loadingMeta"),
  dropOverlay: document.querySelector("#dropOverlay"),
  duplicateDialog: document.querySelector("#duplicateDialog"),
  duplicateMessage: document.querySelector("#duplicateMessage"),
  duplicateList: document.querySelector("#duplicateList"),
  skipDuplicateButton: document.querySelector("#skipDuplicateButton"),
  uploadDuplicateButton: document.querySelector("#uploadDuplicateButton"),
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
  slideQuickActions: document.querySelector("#slideQuickActions"),
  insertSlideBeforeButton: document.querySelector("#insertSlideBeforeButton"),
  insertSlideAfterButton: document.querySelector("#insertSlideAfterButton"),
  duplicateSlideButton: document.querySelector("#duplicateSlideButton"),
  deleteSlideButton: document.querySelector("#deleteSlideButton"),
  fitButton: document.querySelector("#fitButton"),
  fillButton: document.querySelector("#fillButton"),
  backgroundButton: document.querySelector("#backgroundButton"),
  presentButton: document.querySelector("#presentButton"),
  shortcutHelpButton: document.querySelector("#shortcutHelpButton"),
  closeShortcutHelpButton: document.querySelector("#closeShortcutHelpButton"),
  shortcutDialog: document.querySelector("#shortcutDialog"),
  exportButton: document.querySelector("#exportButton"),
  openPagesButton: document.querySelector("#openPagesButton"),
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
  resetAllButton: document.querySelector("#resetAllButton"),
  clearSlideSlotsButton: document.querySelector("#clearSlideSlotsButton"),
};

const pageSizeByLayout = {
  single: 1,
  pair: 2,
  triple: 3,
  quad: 4,
  custom: null,
};

const DEFAULT_SLOT_TRANSFORM = Object.freeze({
  scale: 100,
  x: 0,
  y: 0,
  rotate: 0,
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  cropBottom: 0,
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createLayoutConfig(mode = "pair", rows = 1, cols = 2) {
  const nextMode = mode === "custom" ? "custom" : (pageSizeByLayout[mode] ? mode : "pair");
  const nextRows =
    nextMode === "custom"
      ? clamp(Number(rows) || 1, 1, 4)
      : ({ single: 1, pair: 1, triple: 1, quad: 2 }[nextMode] ?? 1);
  const nextCols =
    nextMode === "custom"
      ? clamp(Number(cols) || 1, 1, 6)
      : ({ single: 1, pair: 2, triple: 3, quad: 2 }[nextMode] ?? 2);

  return {
    mode: nextMode,
    rows: nextRows,
    cols: nextCols,
  };
}

function getPageSizeForLayout(layout) {
  const normalized = createLayoutConfig(layout?.mode, layout?.rows, layout?.cols);
  return normalized.mode === "custom"
    ? normalized.rows * normalized.cols
    : (pageSizeByLayout[normalized.mode] ?? 2);
}

function getDefaultLayoutConfig() {
  return createLayoutConfig(state.layoutMode, state.gridRows, state.gridCols);
}

function getPageSize() {
  if (pageSizeCacheVersion === layoutVersion) return cachedPageSize;

  cachedPageSize = getPageSizeForLayout(getDefaultLayoutConfig());
  pageSizeCacheVersion = layoutVersion;
  return cachedPageSize;
}

function normalizeSlidePageLayouts(requiredSlots = state.slideSlots.length) {
  if (!Array.isArray(state.slidePageLayouts)) {
    state.slidePageLayouts = [];
  }

  let capacity = 0;
  state.slidePageLayouts = state.slidePageLayouts.map((layout) => {
    const normalized = createLayoutConfig(layout?.mode, layout?.rows, layout?.cols);
    capacity += getPageSizeForLayout(normalized);
    return normalized;
  });

  while (capacity < requiredSlots) {
    const fallback = getDefaultLayoutConfig();
    state.slidePageLayouts.push(fallback);
    capacity += getPageSizeForLayout(fallback);
  }
}

function getSlidePageCount() {
  normalizeSlidePageLayouts();
  return state.slidePageLayouts.length;
}

function getSlidePages() {
  normalizeSlidePageLayouts();
  let start = 0;

  return state.slidePageLayouts.map((layout, pageIndex) => {
    const pageSize = getPageSizeForLayout(layout);
    const rawSlots = state.slideSlots.slice(start, start + pageSize);
    const slots = Array.from({ length: pageSize }, (_, offset) => rawSlots[offset] ?? null);
    const page = {
      pageIndex: pageIndex + 1,
      start,
      layout,
      pageSize,
      slots,
      caption: state.slideCaptions[pageIndex] ?? "",
    };
    start += pageSize;
    return page;
  });
}

function getPageLayout(page = state.pageIndex) {
  if (!Number.isFinite(page) || page <= 0) {
    return getDefaultLayoutConfig();
  }

  normalizeSlidePageLayouts();
  return state.slidePageLayouts[page - 1] ?? getDefaultLayoutConfig();
}

function getSlotLocation(slotIndex) {
  if (!Number.isFinite(slotIndex) || slotIndex < 0) return null;

  for (const page of getSlidePages()) {
    if (slotIndex >= page.start && slotIndex < page.start + page.pageSize) {
      return {
        page: page.pageIndex,
        pageStart: page.start,
        pageSize: page.pageSize,
        layout: page.layout,
        offset: slotIndex - page.start,
      };
    }
  }

  return null;
}

function getCurrentPageSlotMeta() {
  if (state.pageIndex <= 0) {
    return {
      pageSize: getPageSize(),
      start: 0,
      layout: getDefaultLayoutConfig(),
      slotIndices: [],
      slots: [],
    };
  }

  const page = getPageLayout(state.pageIndex);
  const pageSize = getPageSizeForLayout(page);
  const nextKey = `${slideSlotsVersion}:${layoutVersion}:${state.pageIndex}:${state.slideSlots.length}:${pageSize}`;
  if (currentPageSlotMetaCacheKey === nextKey && currentPageSlotMetaCache) {
    return currentPageSlotMetaCache;
  }

  const pageMeta = getSlidePages()[state.pageIndex - 1];
  currentPageSlotMetaCache = {
    pageSize: pageMeta?.pageSize ?? pageSize,
    start: pageMeta?.start ?? 0,
    layout: pageMeta?.layout ?? page,
    slotIndices: pageMeta
      ? Array.from({ length: pageMeta.pageSize }, (_, offset) => pageMeta.start + offset)
      : [],
    slots: pageMeta?.slots ?? [],
  };
  currentPageSlotMetaCacheKey = nextKey;
  return currentPageSlotMetaCache;
}

function getTotalPages() {
  const nextKey = `${slideSlotsVersion}:${layoutVersion}:${state.slideSlots.length}:${state.slidePageLayouts.length}`;
  if (totalPagesCacheKey === nextKey) return cachedTotalPages;

  cachedTotalPages = 1 + getSlidePageCount();
  totalPagesCacheKey = nextKey;
  return cachedTotalPages;
}

function normalizeSlideCaptions(pageCount = getSlidePageCount()) {
  if (!Array.isArray(state.slideCaptions)) {
    state.slideCaptions = [];
  }
  state.slideCaptions = state.slideCaptions.slice(0, pageCount);
  while (state.slideCaptions.length < pageCount) {
    state.slideCaptions.push("");
  }
}

function trimTrailingEmptySlidePages() {
  const pages = getSlidePages();

  while (pages.length > 0) {
    const lastPage = pages[pages.length - 1];
    if (lastPage.slots.some(Boolean)) break;
    pages.pop();
  }

  state.slidePageLayouts = pages.map((page) => createLayoutConfig(page.layout.mode, page.layout.rows, page.layout.cols));
  state.slideCaptions = pages.map((page) => page.caption);
  const nextSlotLength = pages.length
    ? pages[pages.length - 1].start + pages[pages.length - 1].pageSize
    : 0;
  state.slideSlots = state.slideSlots.slice(0, nextSlotLength);
  normalizeSlideCaptions(pages.length);
  markLayoutDirty();
}

function markImagesDirty({ orderChanged = true } = {}) {
  imageIndexDirty = true;
  imagesVersion += 1;
  if (orderChanged) imageSortDirty = true;
}

function markSlideSlotsDirty() {
  slideSlotsVersion += 1;
}

function markLayoutDirty() {
  layoutVersion += 1;
}

function markGuidesDirty() {
  guidesVersion += 1;
}

function syncImageIndex() {
  if (!imageIndexDirty) return;
  imageByIdIndex = new Map(state.images.map((image) => [image.id, image]));
  imageIndexDirty = false;
}

function getImageById(id) {
  syncImageIndex();
  return imageByIdIndex.get(id);
}

function getUsedCounts() {
  if (usedCountsCacheVersion === slideSlotsVersion) return usedCountsCache;

  usedCountsCache = state.slideSlots.reduce((counts, imageId) => {
    if (!imageId) return counts;
    counts.set(imageId, (counts.get(imageId) ?? 0) + 1);
    return counts;
  }, new Map());
  usedCountsCacheVersion = slideSlotsVersion;
  return usedCountsCache;
}

function getDefaultSlotTransform() {
  return { ...DEFAULT_SLOT_TRANSFORM };
}

function getSlotTransform(slotIndex) {
  if (!Number.isFinite(slotIndex) || slotIndex < 0) return getDefaultSlotTransform();

  const existing = state.slotTransforms[slotIndex];
  if (!existing) {
    const next = getDefaultSlotTransform();
    state.slotTransforms[slotIndex] = next;
    return next;
  }

  for (const [key, value] of Object.entries(DEFAULT_SLOT_TRANSFORM)) {
    if (!Object.hasOwn(existing, key)) {
      existing[key] = value;
    }
  }

  return existing;
}

function getSlotCropStyle(slotIndex, transform = getSlotTransform(slotIndex)) {
  return `inset(${state.crop.top + transform.cropTop}% ${state.crop.right + transform.cropRight}% ${
    state.crop.bottom + transform.cropBottom
  }% ${state.crop.left + transform.cropLeft}%)`;
}

function getSlotTransformStyle(slotIndex, transform = getSlotTransform(slotIndex)) {
  const scale = state.zoom * (transform.scale / 100);
  return `translate(${transform.x}%, ${transform.y}%) scale(${scale}) rotate(${transform.rotate}deg)`;
}

function ensureSlideSlots() {
  syncImageIndex();
  let changed = false;
  const nextSlots = [];

  state.slideSlots.forEach((slot) => {
    if (slot === null || imageByIdIndex.has(slot)) {
      nextSlots.push(slot);
      return;
    }
    changed = true;
  });

  if (changed) {
    state.slideSlots = nextSlots;
    markSlideSlotsDirty();
  }

  normalizeSlidePageLayouts();
  normalizeSlideCaptions(getSlidePageCount());
}

function sortImages() {
  if (state.sortMode === "manual") {
    imageSortDirty = false;
    lastAppliedSortMode = state.sortMode;
    return;
  }

  if (!imageSortDirty && lastAppliedSortMode === state.sortMode) return;

  state.images.sort((a, b) => {
    if (state.sortMode === "date-asc") {
      return a.modifiedAt - b.modifiedAt || imageNameCollator.compare(a.name, b.name);
    }

    if (state.sortMode === "date-desc") {
      return b.modifiedAt - a.modifiedAt || imageNameCollator.compare(a.name, b.name);
    }

    return imageNameCollator.compare(a.name, b.name);
  });
  imageSortDirty = false;
  imageIndexDirty = true;
  lastAppliedSortMode = state.sortMode;
}

function getFilterStyle() {
  const { brightness, contrast, saturate, hue } = state.filters;
  const nextKey = `${brightness}:${contrast}:${saturate}:${hue}`;
  if (filterStyleCacheKey === nextKey) return cachedFilterStyle;

  cachedFilterStyle = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturate}%)`,
    `hue-rotate(${hue}deg)`,
  ].join(" ");
  filterStyleCacheKey = nextKey;
  return cachedFilterStyle;
}

function getBackgroundFilterStyle() {
  const { brightness, saturate, blur } = state.backgroundFilters;
  const nextKey = `${brightness}:${saturate}:${blur}`;
  if (backgroundFilterStyleCacheKey === nextKey) return cachedBackgroundFilterStyle;

  cachedBackgroundFilterStyle = `blur(${blur}px) brightness(${brightness / 100}) saturate(${saturate / 100})`;
  backgroundFilterStyleCacheKey = nextKey;
  return cachedBackgroundFilterStyle;
}

function getCropStyle() {
  return `inset(${state.crop.top}% ${state.crop.right}% ${state.crop.bottom}% ${state.crop.left}%)`;
}

function renderCover() {
  visibleSlideCardCache = new Map();
  visibleGuideCache = new Map();
  unregisterRenderableImageNodesInRoot(els.stage);
  activeStageSlotDropTarget = null;
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
  const transform = getSlotTransform(slotIndex);
  const imageTransform = getSlotTransformStyle(slotIndex, transform);
  const cropStyle = getSlotCropStyle(slotIndex, transform);
  const selectedClass = state.selectedSlotIndex === slotIndex ? "is-selected" : "";
  const displayUrl = getRenderableImageUrl(image);

  if (!image) {
    return `
      <figure
        class="image-card empty-slot ${selectedClass}"
        data-slot-index="${slotIndex}"
        title="사진 또는 빈칸을 여기로 드래그하세요"
      >
        <div class="empty-slot-inner">
          <strong>빈칸</strong>
          <span>오른쪽 사진을 끌어다 놓기</span>
        </div>
      </figure>
    `;
  }

  return `
    <figure class="image-card ${state.backgroundEnabled ? "background-enabled" : ""} ${
      state.fitMode === "fill" ? "fit-fill" : ""
    } ${selectedClass}" data-slot-index="${slotIndex}" tabindex="0">
      <button
        class="remove-slot-button"
        type="button"
        data-remove-slot="${slotIndex}"
        title="이 칸의 사진 제거"
        aria-label="이 칸의 사진 제거"
      >
        X
      </button>
      <img
        class="blur-bg"
        src="${displayUrl}"
        data-renderable-image-id="${image.id}"
        alt=""
        draggable="false"
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
        src="${displayUrl}"
        data-renderable-image-id="${image.id}"
        alt="${escapeHtml(image.name)}"
        draggable="false"
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
    <div class="guide-ruler guide-ruler-top" data-ruler-axis="x" title="클릭하거나 드래그해서 세로 안내선 추가"></div>
    <div class="guide-ruler guide-ruler-left" data-ruler-axis="y" title="클릭하거나 드래그해서 가로 안내선 추가"></div>
  `;
}

function renderSlide() {
  const { start, slots: pageSlots, layout } = getCurrentPageSlotMeta();
  const slideCaption = state.slideCaptions[state.pageIndex - 1] ?? "";
  const isEmptySlide = pageSlots.length > 0 && !pageSlots.some(Boolean);

  els.stage.className = `stage layout-${layout.mode}`;

  if (pageSlots.length === 0) {
    visibleSlideCardCache = new Map();
    visibleGuideCache = new Map();
    unregisterRenderableImageNodesInRoot(els.stage);
    els.stage.innerHTML = `
      <div class="empty-state">
        <div>
          <h2>사진을 선택하면 여기에 슬라이드가 만들어집니다.</h2>
          <p>기본은 2분할 Before / After 비교 레이아웃입니다.</p>
        </div>
      </div>
    `;
    return;
  }

  const layoutClass = layout.mode === "custom" ? "layout-custom" : `layout-${layout.mode}`;
  visibleSlideCardCache = new Map();
  visibleGuideCache = new Map();
  activeStageSlotDropTarget = null;
  unregisterRenderableImageNodesInRoot(els.stage);
  els.stage.innerHTML = `
    <div
      class="slide-grid ${layoutClass}"
      style="--grid-cols:${layout.cols}; --grid-rows:${layout.rows};"
    >
      ${pageSlots.map((imageId, offset) => renderImageCard(getImageById(imageId), start + offset)).join("")}
    </div>
    ${
      isEmptySlide
        ? `
          <div class="empty-slide-caption-wrap">
            ${
              document.body.classList.contains("presenting")
                ? `<div class="empty-slide-caption-present">${escapeHtml(slideCaption)}</div>`
                : `<textarea
                    class="empty-slide-caption-input"
                    data-empty-slide-caption="${state.pageIndex}"
                    placeholder="빈 슬라이드 소제목을 입력하세요"
                  >${escapeHtml(slideCaption)}</textarea>`
            }
          </div>
        `
        : ""
    }
    ${renderGuides()}
  `;

  const slideGrid = els.stage.firstElementChild;
  slideGrid?.querySelectorAll("[data-slot-index]").forEach((card) => {
    const slotIndex = Number(card.getAttribute("data-slot-index"));
    if (!Number.isFinite(slotIndex)) return;
    const blurImage = card.querySelector(".blur-bg");
    const mainImage = card.querySelector(".main-image");
    visibleSlideCardCache.set(slotIndex, {
      card,
      blurImage,
      mainImage,
      label: card.querySelector(".image-label"),
    });
    const imageId = blurImage?.getAttribute("data-renderable-image-id");
    if (imageId && blurImage) registerRenderableImageNode(imageId, blurImage, els.stage);
    const mainImageId = mainImage?.getAttribute("data-renderable-image-id");
    if (mainImageId && mainImage) registerRenderableImageNode(mainImageId, mainImage, els.stage);
  });

  const guideLayer = slideGrid?.nextElementSibling;
  guideLayer?.querySelectorAll("[data-guide-index]").forEach((guideEl) => {
    const index = Number(guideEl.getAttribute("data-guide-index"));
    if (!Number.isFinite(index)) return;
    visibleGuideCache.set(index, guideEl);
  });
}

function syncDeckStatus() {
  els.pageStatus.textContent =
    state.pageIndex === 0
      ? `Cover / ${getTotalPages()}`
      : `${state.pageIndex + 1} / ${getTotalPages()}`;

  syncLayoutControls();
  const hasCurrentSlide = state.pageIndex > 0 && getSlidePageCount() > 0;
  els.slideQuickActions?.classList.toggle("is-hidden", !hasCurrentSlide);
  if (els.insertSlideBeforeButton) els.insertSlideBeforeButton.disabled = !hasCurrentSlide;
  if (els.insertSlideAfterButton) els.insertSlideAfterButton.disabled = !hasCurrentSlide;
  if (els.duplicateSlideButton) els.duplicateSlideButton.disabled = !hasCurrentSlide;
  if (els.deleteSlideButton) els.deleteSlideButton.disabled = !hasCurrentSlide;
  els.zoomOutput.textContent = `${Math.round(state.zoom * 100)}%`;
  els.backgroundButton.textContent = state.backgroundEnabled
    ? "배경 채우기 켜짐 Enter"
    : "배경 채우기 꺼짐 Enter";
}

function syncPhotoListSelection() {
  if (!els.photoListPanel) return;

  const selectedImageId =
    Number.isFinite(state.selectedSlotIndex) && state.selectedSlotIndex >= 0
      ? state.slideSlots[state.selectedSlotIndex]
      : null;

  if (
    activePhotoListCard &&
    (!selectedImageId ||
      activePhotoListCard.dataset.imageId !== selectedImageId ||
      !els.photoListPanel.contains(activePhotoListCard))
  ) {
    activePhotoListCard.classList.remove("is-active");
    activePhotoListCard = null;
  }

  if (!selectedImageId) return;
  if (activePhotoListCard?.dataset.imageId === selectedImageId) return;

  const nextCard = els.photoListPanel.querySelector(`[data-image-id="${CSS.escape(selectedImageId)}"]`);
  if (!(nextCard instanceof HTMLElement)) return;
  nextCard.classList.add("is-active");
  activePhotoListCard = nextCard;
}

function getVisibleSlideSlotIndices() {
  return getCurrentPageSlotMeta().slotIndices;
}

function refreshVisibleSlideCards(slotIndices = getVisibleSlideSlotIndices()) {
  if (state.pageIndex <= 0 || visibleSlideCardCache.size === 0) return false;

  const filter = getFilterStyle();
  const backgroundFilter = getBackgroundFilterStyle();

  slotIndices.forEach((slotIndex) => {
    const refs = visibleSlideCardCache.get(slotIndex);
    if (!refs) return;
    const { card, blurImage, mainImage, label } = refs;

    card.classList.toggle("is-selected", state.selectedSlotIndex === slotIndex);

    const imageId = state.slideSlots[slotIndex];
    if (!imageId) return;

    const image = getImageById(imageId);
    if (!image) return;

    const transform = getSlotTransform(slotIndex);
    const displayUrl = getRenderableImageUrl(image);
    card.classList.toggle("background-enabled", state.backgroundEnabled);
    card.classList.toggle("fit-fill", state.fitMode === "fill");

    if (blurImage) {
      if (blurImage.getAttribute("src") !== displayUrl) blurImage.setAttribute("src", displayUrl);
      blurImage.style.width = `${state.backgroundFilters.scale}%`;
      blurImage.style.height = `${state.backgroundFilters.scale}%`;
      blurImage.style.objectPosition = `center ${state.backgroundFilters.y}%`;
      blurImage.style.filter = backgroundFilter;
    }

    if (mainImage) {
      if (mainImage.getAttribute("src") !== displayUrl) mainImage.setAttribute("src", displayUrl);
      if (mainImage.getAttribute("alt") !== image.name) mainImage.setAttribute("alt", image.name);
      mainImage.style.clipPath = getSlotCropStyle(slotIndex, transform);
      mainImage.style.filter = filter;
      mainImage.style.transform = getSlotTransformStyle(slotIndex, transform);
    }

    if (label) label.textContent = image.name;
  });

  return true;
}

function scheduleLightweightRefresh(slotIndices = null) {
  if (slotIndices) {
    const next = new Set(slotIndices.filter((value) => Number.isFinite(value)));
    if (pendingLightweightSlotIndices) {
      pendingLightweightSlotIndices = new Set([...pendingLightweightSlotIndices, ...next]);
    } else {
      pendingLightweightSlotIndices = next;
    }
  } else {
    pendingLightweightSlotIndices = null;
  }

  if (lightweightRefreshFrame !== null) return;

  lightweightRefreshFrame = window.requestAnimationFrame(() => {
    lightweightRefreshFrame = null;
    syncDeckStatus();
    syncSelectedSlotControls();
    syncPhotoListSelection();
    const targetSlots = pendingLightweightSlotIndices ? Array.from(pendingLightweightSlotIndices) : undefined;
    pendingLightweightSlotIndices = null;
    if (!refreshVisibleSlideCards(targetSlots)) {
      render({ refreshGuidePanel: false, refreshThumbnails: false, refreshPhotoList: false, persist: false });
    }
  });
}

function syncLoadingOverlay() {
  if (!els.loadingOverlay || !els.loadingLabel || !els.loadingMeta) return;

  els.loadingOverlay.setAttribute("aria-hidden", state.isLoading ? "false" : "true");
  els.loadingLabel.textContent = state.loadingMessage || "사진을 준비하는 중입니다";
  els.loadingMeta.textContent =
    state.loadingProgress > 0 ? `${Math.round(state.loadingProgress * 100)}%` : "잠시만 기다려주세요";
}

function showLoading(message, progress = 0) {
  state.isLoading = true;
  state.loadingMessage = message;
  state.loadingProgress = progress;
  syncLoadingOverlay();
}

function updateLoading(message, progress = state.loadingProgress) {
  state.loadingMessage = message;
  state.loadingProgress = progress;
  syncLoadingOverlay();
}

function hideLoading() {
  state.isLoading = false;
  state.loadingMessage = "";
  state.loadingProgress = 0;
  syncLoadingOverlay();
}

function render({ refreshGuidePanel = true, refreshThumbnails = true, refreshPhotoList = true, persist = true } = {}) {
  sortImages();
  ensureSlideSlots();
  state.pageIndex = clamp(state.pageIndex, 0, Math.max(getTotalPages() - 1, 0));

  if (state.pageIndex === 0) {
    renderCover();
  } else {
    renderSlide();
  }

  syncDeckStatus();
  syncSelectedSlotControls();
  if (refreshGuidePanel) renderGuideControls();
  if (refreshThumbnails) renderThumbnails();
  if (refreshPhotoList) renderPhotoList();
  else syncPhotoListSelection();
  if (persist) queuePersistSettings();
  syncLoadingOverlay();
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
  render({ refreshPhotoList: false });
}

function updateFitMode(mode) {
  state.fitMode = mode;
  scheduleLightweightRefresh();
  queuePersistSettings();
}

function updateZoom(delta) {
  state.zoom = clamp(Number((state.zoom + delta).toFixed(2)), 0.5, 2.5);
  scheduleLightweightRefresh();
  queuePersistSettings();
}

function resetZoom() {
  state.zoom = 1;
  scheduleLightweightRefresh();
  queuePersistSettings();
}

function isZoomInKey(event) {
  return (
    event.key === "+" ||
    event.key === "=" ||
    event.code === "NumpadAdd"
  );
}

function isZoomOutKey(event) {
  return event.key === "-" || event.key === "_" || event.code === "NumpadSubtract";
}

function handleStageWheelZoom(event) {
  if (!(event.target instanceof Element) || !event.target.closest("#stage")) return;
  event.preventDefault();
  if (event.deltaY < 0) {
    updateZoom(0.1);
  } else if (event.deltaY > 0) {
    updateZoom(-0.1);
  }
}

function imageFromDataUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = url;
  });
}

async function createPreviewDataUrl(sourceUrl, maxDimension = 1600) {
  const image = await imageFromDataUrl(sourceUrl);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  if (longestSide <= maxDimension) {
    return sourceUrl;
  }

  const scale = maxDimension / longestSide;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function schedulePreviewRefresh(imageId = null) {
  if (imageId) pendingPreviewRefreshIds.add(imageId);
  window.clearTimeout(previewRefreshTimer);
  previewRefreshTimer = window.setTimeout(() => {
    scheduleLightweightRefresh();
    const targetIds = pendingPreviewRefreshIds.size > 0 ? Array.from(pendingPreviewRefreshIds) : null;
    pendingPreviewRefreshIds.clear();
    syncRenderableImageSources(targetIds);
  }, 80);
}

function cancelPreviewWarm() {
  if (!previewWarmHandle) return;
  if (typeof window.cancelIdleCallback === "function" && String(previewWarmHandle).startsWith("idle:")) {
    window.cancelIdleCallback(Number(String(previewWarmHandle).slice(5)));
  } else {
    window.clearTimeout(Number(previewWarmHandle));
  }
  previewWarmHandle = null;
}

function queuePreviewWarmTick() {
  cancelPreviewWarm();

  const run = () => {
    previewWarmHandle = null;
    if (previewWarmQueue.length === 0) return;

    const batch = previewWarmQueue.splice(0, 2);
    batch.forEach((image) => {
      void ensurePreviewForImage(image);
    });

    if (previewWarmQueue.length > 0) {
      queuePreviewWarmTick();
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(run, { timeout: 180 });
    previewWarmHandle = `idle:${idleId}`;
    return;
  }

  previewWarmHandle = window.setTimeout(run, 90);
}

async function ensurePreviewForImage(image) {
  if (!image?.id) return image?.url ?? "";
  if (previewCache.has(image.id)) return previewCache.get(image.id);
  if (previewJobs.has(image.id)) return previewJobs.get(image.id);

  const job = createPreviewDataUrl(image.url)
    .then((previewUrl) => {
      previewCache.set(image.id, previewUrl);
      previewJobs.delete(image.id);
      schedulePreviewRefresh(image.id);
      return previewUrl;
    })
    .catch(() => {
      previewCache.set(image.id, image.url);
      previewJobs.delete(image.id);
      schedulePreviewRefresh(image.id);
      return image.url;
    });

  previewJobs.set(image.id, job);
  return job;
}

function getRenderableImageUrl(image) {
  if (!image) return "";
  const cached = previewCache.get(image.id);
  if (cached) return cached;
  void ensurePreviewForImage(image);
  return image.url;
}

function unregisterRenderableImageNodesInRoot(root) {
  if (!root) return;
  const entries = renderableImageRootCache.get(root);
  if (!entries || entries.length === 0) {
    renderableImageRootCache.delete(root);
    return;
  }

  entries.forEach(({ imageId, node }) => {
    const nodes = renderableImageNodeCache.get(imageId);
    if (!nodes || nodes.length === 0) return;
    const nextNodes = nodes.filter((candidate) => candidate.isConnected && candidate !== node);
    if (nextNodes.length === 0) {
      renderableImageNodeCache.delete(imageId);
      return;
    }
    renderableImageNodeCache.set(imageId, nextNodes);
  });

  renderableImageRootCache.delete(root);
}

function registerRenderableImageNodesInRoot(root, ownerRoot = root) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll("[data-renderable-image-id]").forEach((node) => {
    const imageId = node.getAttribute("data-renderable-image-id");
    if (!imageId) return;
    registerRenderableImageNode(imageId, node, ownerRoot);
  });
}

function createFragmentFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content;
}

function registerRenderableImageNode(imageId, node, ownerRoot = null) {
  if (!imageId || !node) return;
  const nodes = renderableImageNodeCache.get(imageId) ?? [];
  nodes.push(node);
  renderableImageNodeCache.set(imageId, nodes);
  if (!ownerRoot) return;
  const rootEntries = renderableImageRootCache.get(ownerRoot) ?? [];
  rootEntries.push({ imageId, node });
  renderableImageRootCache.set(ownerRoot, rootEntries);
}

function refreshRenderableImageNodeCacheForRoot(root) {
  unregisterRenderableImageNodesInRoot(root);
  registerRenderableImageNodesInRoot(root);
}

function syncRenderableImageSources(imageIds = null) {
  const targetIds = imageIds ? Array.from(new Set(imageIds.filter(Boolean))) : Array.from(renderableImageNodeCache.keys());

  targetIds.forEach((imageId) => {
    const image = getImageById(imageId);
    if (!image) return;
    const nextUrl = getRenderableImageUrl(image);
    const nodes = (renderableImageNodeCache.get(imageId) ?? []).filter((node) => node.isConnected);
    if (nodes.length === 0) {
      renderableImageNodeCache.delete(imageId);
      return;
    }
    renderableImageNodeCache.set(imageId, nodes);
    nodes.forEach((node) => {
      if (node.getAttribute("src") !== nextUrl) {
        node.setAttribute("src", nextUrl);
      }
    });
  });
}

function warmPreviewCache(images) {
  if (!Array.isArray(images) || images.length === 0) return;

  const seen = new Set();
  const currentPagePriority = getCurrentPageSlotMeta()
    .slots
    .map((imageId) => getImageById(imageId))
    .filter(Boolean);
  const prioritized = [...currentPagePriority, ...images].filter((image) => {
    if (!image?.id || seen.has(image.id) || previewCache.has(image.id) || previewJobs.has(image.id)) return false;
    seen.add(image.id);
    return true;
  });

  if (prioritized.length === 0) return;
  previewWarmQueue = prioritized;
  queuePreviewWarmTick();
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

function getDuplicateKey(item) {
  return `${item.name}::${item.size}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function askDuplicateUpload(duplicates) {
  if (!els.duplicateDialog || duplicates.length === 0) return Promise.resolve("upload");

  return new Promise((resolve) => {
    const previewItems = duplicates.slice(0, 6);
    const extraCount = Math.max(duplicates.length - previewItems.length, 0);
    els.duplicateMessage.textContent = `이름과 크기가 같은 사진이 ${duplicates.length}개 있습니다. 중복으로 올리시겠습니까?`;
    els.duplicateList.innerHTML = `
      ${previewItems
        .map(
          (file) => `
            <div class="duplicate-item">
              <strong>${escapeHtml(file.name)}</strong>
              <span>${formatBytes(file.size)}</span>
            </div>
          `,
        )
        .join("")}
      ${extraCount > 0 ? `<p class="duplicate-more">외 ${extraCount}개 더 있음</p>` : ""}
    `;

    const cleanup = (choice) => {
      els.skipDuplicateButton.removeEventListener("click", onSkip);
      els.uploadDuplicateButton.removeEventListener("click", onUpload);
      els.duplicateDialog.removeEventListener("cancel", onCancel);
      if (els.duplicateDialog.open) els.duplicateDialog.close();
      resolve(choice);
    };
    const onSkip = () => cleanup("skip");
    const onUpload = () => cleanup("upload");
    const onCancel = (event) => {
      event.preventDefault();
      cleanup("skip");
    };

    els.skipDuplicateButton.addEventListener("click", onSkip);
    els.uploadDuplicateButton.addEventListener("click", onUpload);
    els.duplicateDialog.addEventListener("cancel", onCancel);
    els.duplicateDialog.showModal();
  });
}

async function loadImageFiles(fileList) {
  const imageFiles = getImageFiles(fileList);
  if (imageFiles.length === 0) return;

  const existingKeys = new Set(state.images.map(getDuplicateKey));
  const duplicates = imageFiles.filter((file) => existingKeys.has(getDuplicateKey(file)));
  const duplicateChoice = await askDuplicateUpload(duplicates);
  const uploadFiles =
    duplicateChoice === "skip"
      ? imageFiles.filter((file) => !existingKeys.has(getDuplicateKey(file)))
      : imageFiles;

  if (uploadFiles.length === 0) {
    els.imageFileName.textContent = "중복 사진만 건너뜀";
    return;
  }

  showLoading("사진을 불러오는 중입니다", 0);

  try {
    const addedImages = [];

    for (const [index, file] of uploadFiles.entries()) {
      updateLoading(`사진 불러오는 중: ${file.name}`, index / uploadFiles.length);
      const url = await fileToDataUrl(file);
      const id = crypto.randomUUID?.() ?? `${file.name}-${file.lastModified}-${Math.random()}`;
      addedImages.push({
        id,
        name: file.name,
        size: file.size,
        modifiedAt: file.lastModified,
        url,
      });
      updateLoading(`사진 등록 중: ${file.name}`, (index + 1) / uploadFiles.length);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    updateLoading("슬라이드를 준비하는 중입니다", 1);

    const wasEmpty = state.images.length === 0;
    state.images = [...state.images, ...addedImages];
    markImagesDirty();
    state.slideSlots = [...state.slideSlots, ...addedImages.map((image) => image.id)];
    markSlideSlotsDirty();
    state.selectedSlotIndex = null;

    els.imageFileName.textContent =
      duplicateChoice === "skip" && duplicates.length > 0
        ? `${addedImages.length}장 추가됨, 중복 ${duplicates.length}장 건너뜀`
        : `${addedImages.length}장 추가됨`;

    state.pageIndex = wasEmpty ? 1 : state.pageIndex;
    render();
    warmPreviewCache(addedImages);
    queuePersistAssets();
  } finally {
    hideLoading();
  }
}

function hasDraggedFiles(event) {
  const items = Array.from(event.dataTransfer?.items ?? []);
  if (items.length > 0) {
    return items.some((item) => item.kind === "file");
  }

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
  syncDeckStatus();
  if (!refreshVisibleSlideCards()) {
    render({ refreshGuidePanel: false, refreshThumbnails: false, refreshPhotoList: false, persist: false });
  }
  queuePersistSettings();
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
    scheduleLightweightRefresh();
    queuePersistSettings();
  });
}

function bindBackgroundFilter(input, output, key, suffix = "%") {
  input.addEventListener("input", () => {
    state.backgroundFilters[key] = Number(input.value);
    output.textContent = `${input.value}${suffix}`;
    scheduleLightweightRefresh();
    queuePersistSettings();
  });
}

function bindCrop(input, output, key) {
  input.addEventListener("input", () => {
    state.crop[key] = Number(input.value);
    output.textContent = `${input.value}%`;
    scheduleLightweightRefresh();
    queuePersistSettings();
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

  const disabledKey = hasSlot ? "enabled" : "disabled";
  if (!selectedSlotUiKey.startsWith(`${disabledKey}|`)) {
    for (const control of controls) control.disabled = !hasSlot;
  }

  if (!hasSlot) {
    const nextKey = "disabled|empty";
    if (selectedSlotUiKey !== nextKey) {
      els.selectedSlotLabel.textContent = "슬라이드 사진을 클릭하세요.";
      selectedSlotUiKey = nextKey;
    }
    return;
  }

  const transform = getSlotTransform(slotIndex);
  const nextKey = [
    "enabled",
    slotIndex,
    transform.scale,
    transform.x,
    transform.y,
    transform.rotate,
    transform.cropLeft,
    transform.cropRight,
    transform.cropTop,
    transform.cropBottom,
  ].join("|");

  if (selectedSlotUiKey === nextKey) return;

  const nextLabel = `${slotIndex + 1}번 슬롯 선택됨`;
  if (els.selectedSlotLabel.textContent !== nextLabel) {
    els.selectedSlotLabel.textContent = nextLabel;
  }
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
    const valueText = String(value);
    if (input.value !== valueText) input.value = valueText;
    const outputText = `${value}${suffix}`;
    if (output.textContent !== outputText) output.textContent = outputText;
  }

  selectedSlotUiKey = nextKey;
}

function selectSlot(slotIndex) {
  state.selectedSlotIndex = Number(slotIndex);
  scheduleLightweightRefresh();
}

function updateSelectedSlotTransform(key, value) {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !state.slideSlots[slotIndex]) return;
  getSlotTransform(slotIndex)[key] = Number(value);
  scheduleLightweightRefresh([slotIndex]);
  queuePersistSettings();
}

function bindSlotTransform(input, output, key, suffix = "%") {
  if (!input || !output) return;
  input.addEventListener("input", () => {
    output.textContent = `${input.value}${suffix}`;
    updateSelectedSlotTransform(key, input.value);
  });
}

function syncLayoutControls() {
  const layout = getPageLayout(state.pageIndex);
  els.gridRows.value = layout.rows;
  els.gridCols.value = layout.cols;
  els.layoutMode.value = layout.mode;
}

function applyLayoutToPage(page, mode, rows, cols) {
  if (!Number.isFinite(page) || page <= 0) {
    state.layoutMode = createLayoutConfig(mode, rows, cols).mode;
    state.gridRows = createLayoutConfig(mode, rows, cols).rows;
    state.gridCols = createLayoutConfig(mode, rows, cols).cols;
    markLayoutDirty();
    render();
    return;
  }

  normalizeSlidePageLayouts();
  const nextLayout = createLayoutConfig(mode, rows, cols);
  state.slidePageLayouts[page - 1] = nextLayout;
  markLayoutDirty();
  normalizeSlidePageLayouts(state.slideSlots.length);
  normalizeSlideCaptions();
  render();
}

function setGrid(rows, cols, mode = "custom", page = state.pageIndex) {
  const nextLayout = createLayoutConfig(mode, rows, cols);
  if (page <= 0) {
    state.gridRows = nextLayout.rows;
    state.gridCols = nextLayout.cols;
    state.layoutMode = nextLayout.mode;
    markLayoutDirty();
    syncLayoutControls();
    render();
    return;
  }

  applyLayoutToPage(page, nextLayout.mode, nextLayout.rows, nextLayout.cols);
}

function setLayoutPreset(mode, page = state.pageIndex) {
  const preset = {
    single: [1, 1],
    pair: [1, 2],
    triple: [1, 3],
    quad: [2, 2],
  }[mode];

  setGrid(preset[0], preset[1], mode, page);
}

function addGuide(axis, percent = 50) {
  state.guides.push({
    axis,
    percent: clamp(percent, 0, 100),
  });
  markGuidesDirty();
  render();
}

function renderGuideControls() {
  if (!els.guideListPanel) return;

  const nextKey = `${guidesVersion}:${state.guides.length}`;
  if (guidePanelRenderKey === nextKey) return;
  guidePanelRenderKey = nextKey;
  guideControlOutputCache = new Map();

  if (state.guides.length === 0) {
    els.guideListPanel.innerHTML = `
      <p class="guide-empty">아직 안내선이 없습니다. + 버튼으로 추가해보세요.</p>
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
            <output data-guide-output="${index}">${guide.percent.toFixed(1)}%</output>
            <button type="button" data-guide-delete="${index}" aria-label="${label} 안내선 삭제">X</button>
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

  els.guideListPanel.querySelectorAll("[data-guide-output]").forEach((output) => {
    const index = Number(output.getAttribute("data-guide-output"));
    if (!Number.isFinite(index) || !(output instanceof HTMLOutputElement)) return;
    guideControlOutputCache.set(index, output);
  });
}

function setSlot(slotIndex, imageId) {
  if (slotIndex < 0) return;

  normalizeSlidePageLayouts(slotIndex + 1);
  while (state.slideSlots.length <= slotIndex) {
    state.slideSlots.push(null);
  }

  state.slideSlots[slotIndex] = imageId;
  markSlideSlotsDirty();
  if (imageId) state.selectedSlotIndex = slotIndex;
  if (!imageId && state.selectedSlotIndex === slotIndex) state.selectedSlotIndex = null;
  render();
}

function addEmptySlot() {
  const layout = getPageLayout(state.pageIndex);
  const pageSize = getPageSizeForLayout(layout);
  state.slidePageLayouts.push(layout);
  state.slideSlots.push(...Array(pageSize).fill(null));
  markSlideSlotsDirty();
  markLayoutDirty();
  normalizeSlideCaptions();
  goToPage(getSlidePageCount());
}

function clearSlideSlots() {
  if (state.images.length === 0) {
    state.slideSlots = [];
    state.slidePageLayouts = [];
    state.slideCaptions = [];
    markSlideSlotsDirty();
    markLayoutDirty();
    state.pageIndex = 0;
    render();
    return;
  }

  const layout = getDefaultLayoutConfig();
  state.slidePageLayouts = [layout];
  state.slideSlots = Array(getPageSizeForLayout(layout)).fill(null);
  state.slideCaptions = [""];
  markSlideSlotsDirty();
  markLayoutDirty();
  state.slotTransforms = {};
  state.selectedSlotIndex = null;
  state.pageIndex = 1;
  render();
}

function resetAllPhotosAndSlides() {
  if (state.images.length === 0 && state.slideSlots.length === 0) return;
  const shouldReset = window.confirm("업로드한 사진과 슬라이드를 모두 초기화할까요?");
  if (!shouldReset) return;

  cancelPreviewWarm();
  previewWarmQueue = [];
  previewCache.clear();
  previewJobs.clear();
  pendingPreviewRefreshIds.clear();
  window.clearTimeout(previewRefreshTimer);
  previewRefreshTimer = null;
  photoListRenderToken += 1;
  thumbnailRenderKey = "";
  photoListRenderKey = "";

  state.images = [];
  state.slideSlots = [];
  state.slideCaptions = [];
  state.slidePageLayouts = [];
  state.slotTransforms = {};
  state.selectedSlotIndex = null;
  state.pageIndex = 0;

  markImagesDirty();
  markSlideSlotsDirty();

  if (els.imageInput) els.imageInput.value = "";
  if (els.imageFileName) els.imageFileName.textContent = "선택된 사진 없음";

  render();
  queuePersistAssets();
}

function findFirstFilledSlotIndexForPage(page) {
  const pageMeta = getSlidePages().find((entry) => entry.pageIndex === Number(page));
  if (!pageMeta) return null;
  for (let offset = 0; offset < pageMeta.pageSize; offset += 1) {
    const slotIndex = pageMeta.start + offset;
    if (state.slideSlots[slotIndex]) return slotIndex;
  }
  return null;
}

function findFirstSlotIndexByImageId(imageId) {
  return state.slideSlots.findIndex((slotId) => slotId === imageId);
}

function goToPageWithSelection(page, slotIndex = null) {
  state.pageIndex = clamp(page, 0, Math.max(getTotalPages() - 1, 0));
  state.selectedSlotIndex = Number.isFinite(slotIndex) && slotIndex >= 0 ? slotIndex : null;
  render({ refreshPhotoList: false });
}

function rebuildSlotTransformsFromPages(pages) {
  const nextTransforms = {};
  let nextStart = 0;

  pages.forEach((page) => {
    for (let offset = 0; offset < page.pageSize; offset += 1) {
      const oldIndex = page.start + offset;
      const nextIndex = nextStart + offset;
      const transform = state.slotTransforms[oldIndex];
      if (transform) nextTransforms[nextIndex] = transform;
    }
    nextStart += page.pageSize;
  });

  state.slotTransforms = nextTransforms;
}

function reorderSlidePage(fromPage, toPage) {
  const pages = getSlidePages();
  const fromIndex = Number(fromPage) - 1;
  const toIndex = Number(toPage) - 1;
  if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex) || fromIndex < 0 || toIndex < 0) return;
  if (fromIndex === toIndex || fromIndex >= pages.length || toIndex >= pages.length) return;
  const selectedImageId =
    Number.isFinite(state.selectedSlotIndex) && state.selectedSlotIndex >= 0
      ? state.slideSlots[state.selectedSlotIndex]
      : null;

  const movedPages = [...pages];
  const [moved] = movedPages.splice(fromIndex, 1);
  movedPages.splice(toIndex, 0, moved);

  state.slideSlots = movedPages.flatMap((page) => page.slots);
  state.slideCaptions = movedPages.map((page) => page.caption);
  state.slidePageLayouts = movedPages.map((page) => createLayoutConfig(page.layout.mode, page.layout.rows, page.layout.cols));
  rebuildSlotTransformsFromPages(movedPages);
  markSlideSlotsDirty();
  markLayoutDirty();
  normalizeSlideCaptions(movedPages.length);

  if (state.pageIndex > 0) {
    const currentPageIndex = state.pageIndex - 1;
    if (currentPageIndex === fromIndex) {
      state.pageIndex = toIndex + 1;
    } else if (fromIndex < currentPageIndex && toIndex >= currentPageIndex) {
      state.pageIndex -= 1;
    } else if (fromIndex > currentPageIndex && toIndex <= currentPageIndex) {
      state.pageIndex += 1;
    }
  }

  if (selectedImageId) {
    const nextSelectedSlot = findFirstSlotIndexByImageId(selectedImageId);
    state.selectedSlotIndex = nextSelectedSlot >= 0 ? nextSelectedSlot : null;
  }

  render();
}

function insertSlidePage(referencePage, position = "after") {
  const pages = getSlidePages();
  const referenceIndex = Number(referencePage) - 1;
  if (!Number.isFinite(referenceIndex) || referenceIndex < 0 || referenceIndex >= pages.length) return;

  const reference = pages[referenceIndex];
  const insertIndex = position === "before" ? referenceIndex : referenceIndex + 1;
  const nextPages = [...pages];
  nextPages.splice(insertIndex, 0, {
    pageIndex: insertIndex + 1,
    start: 0,
    layout: createLayoutConfig(reference.layout.mode, reference.layout.rows, reference.layout.cols),
    pageSize: reference.pageSize,
    slots: Array(reference.pageSize).fill(null),
    caption: "",
  });

  state.slideSlots = nextPages.flatMap((entry) => entry.slots);
  state.slideCaptions = nextPages.map((entry) => entry.caption);
  state.slidePageLayouts = nextPages.map((page) => createLayoutConfig(page.layout.mode, page.layout.rows, page.layout.cols));
  rebuildSlotTransformsFromPages(nextPages);
  markSlideSlotsDirty();
  markLayoutDirty();
  normalizeSlideCaptions(nextPages.length);

  const currentPage = state.pageIndex;
  if (currentPage > 0) {
    if (currentPage - 1 >= insertIndex) {
      state.pageIndex += 1;
    }
  }

  state.selectedSlotIndex = null;
  goToPage(position === "before" ? referencePage : referencePage + 1);
}

function duplicateSlidePage(page) {
  const pages = getSlidePages();
  const pageIndex = Number(page) - 1;
  if (!Number.isFinite(pageIndex) || pageIndex < 0 || pageIndex >= pages.length) return;

  const sourcePage = pages[pageIndex];
  const nextPages = [...pages];
  nextPages.splice(pageIndex + 1, 0, {
    pageIndex: pageIndex + 2,
    start: 0,
    layout: createLayoutConfig(sourcePage.layout.mode, sourcePage.layout.rows, sourcePage.layout.cols),
    pageSize: sourcePage.pageSize,
    slots: [...sourcePage.slots],
    caption: sourcePage.caption,
  });

  state.slideSlots = nextPages.flatMap((entry) => entry.slots);
  state.slideCaptions = nextPages.map((entry) => entry.caption);
  state.slidePageLayouts = nextPages.map((entry) => createLayoutConfig(entry.layout.mode, entry.layout.rows, entry.layout.cols));

  const nextTransforms = {};
  let nextStart = 0;
  nextPages.forEach((entry, nextPageIndex) => {
    const sourceStart = nextPageIndex === pageIndex + 1 ? sourcePage.start : entry.start;
    for (let offset = 0; offset < entry.pageSize; offset += 1) {
      const transform = state.slotTransforms[sourceStart + offset];
      if (transform) nextTransforms[nextStart + offset] = { ...transform };
    }
    nextStart += entry.pageSize;
  });
  state.slotTransforms = nextTransforms;

  markSlideSlotsDirty();
  markLayoutDirty();
  normalizeSlideCaptions(nextPages.length);
  state.selectedSlotIndex = null;
  goToPage(page + 1);
}

function deleteSlidePage(page) {
  const pages = getSlidePages();
  const pageIndex = Number(page) - 1;
  if (!Number.isFinite(pageIndex) || pageIndex < 0 || pageIndex >= pages.length) return;
  const selectedImageId =
    Number.isFinite(state.selectedSlotIndex) && state.selectedSlotIndex >= 0
      ? state.slideSlots[state.selectedSlotIndex]
      : null;

  const nextPages = pages.filter((_, index) => index !== pageIndex);
  state.slideSlots = nextPages.flatMap((entry) => entry.slots);
  state.slideCaptions = nextPages.map((entry) => entry.caption);
  state.slidePageLayouts = nextPages.map((page) => createLayoutConfig(page.layout.mode, page.layout.rows, page.layout.cols));
  rebuildSlotTransformsFromPages(nextPages);
  markSlideSlotsDirty();
  markLayoutDirty();
  normalizeSlideCaptions(nextPages.length);

  const nextTotalPages = 1 + nextPages.length;
  state.pageIndex = clamp(state.pageIndex, 0, Math.max(nextTotalPages - 1, 0));
  if (state.pageIndex === page) {
    state.pageIndex = Math.max(1, Math.min(page, nextPages.length));
  } else if (state.pageIndex > page) {
    state.pageIndex -= 1;
  }

  if (selectedImageId) {
    const nextSelectedSlot = findFirstSlotIndexByImageId(selectedImageId);
    state.selectedSlotIndex = nextSelectedSlot >= 0 ? nextSelectedSlot : null;
  } else {
    state.selectedSlotIndex = null;
  }

  render();
}

function updateSlideCaption(page, value) {
  const pageIndex = Number(page) - 1;
  if (!Number.isFinite(pageIndex) || pageIndex < 0) return;
  normalizeSlideCaptions();
  state.slideCaptions[pageIndex] = value;

  if (state.pageIndex === page && !getCurrentPageSlotMeta().slots.some(Boolean)) {
    render({ refreshGuidePanel: false, refreshThumbnails: false, refreshPhotoList: false, persist: false });
  }

  queuePersistSettings();
}

function removeImageFromLibrary(imageId) {
  if (!imageId) return;
  const imageIndex = state.images.findIndex((image) => image.id === imageId);
  if (imageIndex < 0) return;

  state.images.splice(imageIndex, 1);
  markImagesDirty();

  let slotsChanged = false;
  state.slideSlots = state.slideSlots.map((slotId) => {
    if (slotId !== imageId) return slotId;
    slotsChanged = true;
    return null;
  });

  if (slotsChanged) {
    markSlideSlotsDirty();
    trimTrailingEmptySlidePages();
  }

  const nextTransforms = {};
  for (const [key, transform] of Object.entries(state.slotTransforms)) {
    const slotIndex = Number(key);
    if (state.slideSlots[slotIndex]) {
      nextTransforms[slotIndex] = transform;
    }
  }
  state.slotTransforms = nextTransforms;

  if (state.selectedSlotIndex !== null && state.slideSlots[state.selectedSlotIndex] !== imageId) {
    if (!state.slideSlots[state.selectedSlotIndex]) {
      state.selectedSlotIndex = null;
    }
  }
  if (state.selectedSlotIndex !== null && state.slideSlots[state.selectedSlotIndex] === imageId) {
    state.selectedSlotIndex = null;
  }

  state.pageIndex = clamp(state.pageIndex, 0, Math.max(getTotalPages() - 1, 0));
  render();
  queuePersistAssets();
}

function getGuidePercentFromPointer(axis, pointerEvent, rect = els.stage.getBoundingClientRect()) {
  const percent =
    axis === "x"
      ? ((pointerEvent.clientX - rect.left) / rect.width) * 100
      : ((pointerEvent.clientY - rect.top) / rect.height) * 100;
  return clamp(percent, 0, 100);
}

function syncGuideVisual(index) {
  const guide = state.guides[index];
  if (!guide) return;
  const guideEl = visibleGuideCache.get(index);
  if (!guideEl) return;
  guideEl.style[guide.axis === "x" ? "left" : "top"] = `${guide.percent}%`;
  guideEl.dataset.label = `${guide.percent.toFixed(1)}%`;
}

function updateGuide(index, percent) {
  if (!state.guides[index]) return;
  state.guides[index].percent = clamp(percent, 0, 100);
  markGuidesDirty();
  render();
}

function renderThumbnails() {
  if (!els.thumbnailRail) return;

  if (state.images.length === 0) {
    thumbnailRenderKey = "empty";
    activeThumbnailButton = null;
    thumbnailPageButtonCache = new Map();
    unregisterRenderableImageNodesInRoot(els.thumbnailRail);
    els.thumbnailRail.innerHTML = `
      <div class="thumbnail-empty">
        사진을 선택하면 여기에 슬라이드 목록과 순서 편집이 표시됩니다.
      </div>
    `;
    return;
  }

  const slidePages = getSlidePages();
  const nextKey = [
    imagesVersion,
    slideSlotsVersion,
    layoutVersion,
    state.images.length,
    state.slideSlots.length,
    state.slidePageLayouts.length,
    ].join(":");

  if (thumbnailRenderKey !== nextKey) {
    thumbnailRenderKey = nextKey;
    activeThumbnailButton = null;
    thumbnailPageButtonCache = new Map();
    unregisterRenderableImageNodesInRoot(els.thumbnailRail);
    const thumbnailHtml = `
      <div class="thumbnail-section">
        <div class="thumbnail-section-head">
          <strong>슬라이드 목록</strong>
          <span>페이지별 1 / 2 / 3 / 4 분할 편집</span>
        </div>
        <div class="slide-preview-row">
          <button class="slide-thumb slide-thumb-cover-card" type="button" data-page="0">
            <div class="slide-thumb-cover">
              <span>Cover</span>
            </div>
          </button>
          ${slidePages
            .map(
              (page) => `
                <article
                  class="slide-thumb slide-thumb-editor"
                  draggable="true"
                  data-page="${page.pageIndex}"
                  title="${page.pageIndex}페이지"
                >
                  <div class="slide-thumb-open" data-page="${page.pageIndex}">
                    <div
                      class="slide-thumb-grid ${page.layout.mode === "custom" ? "layout-custom" : `layout-${page.layout.mode}`}"
                      style="--grid-cols:${page.layout.cols}; --grid-rows:${page.layout.rows};"
                    >
                      ${page.slots
                        .map((imageId, offset) => {
                          const slotIndex = page.start + offset;
                          const image = getImageById(imageId);
                          return image
                            ? `<img src="${getRenderableImageUrl(image)}" data-renderable-image-id="${image.id}" data-slot-thumb-index="${slotIndex}" alt="" loading="lazy" decoding="async" />`
                            : `<button class="slide-thumb-empty slide-slot-empty" type="button" data-slot-thumb-index="${slotIndex}">빈칸</button>`;
                        })
                        .join("")}
                    </div>
                  </div>
                  <div class="slide-thumb-meta">
                    <span class="slide-thumb-label">${page.pageIndex}</span>
                    <div class="slide-thumb-actions">
                      <button class="slide-action-chip" type="button" data-insert-slide-before="${page.pageIndex}" aria-label="${page.pageIndex}페이지 앞에 빈 슬라이드 추가">앞+</button>
                      <button class="slide-action-chip" type="button" data-insert-slide-after="${page.pageIndex}" aria-label="${page.pageIndex}페이지 뒤에 빈 슬라이드 추가">뒤+</button>
                      <button class="slide-action-chip" type="button" data-duplicate-slide="${page.pageIndex}" aria-label="${page.pageIndex}페이지 복제">복제</button>
                      <button class="slide-layout-chip ${page.layout.mode === "single" ? "is-active" : ""}" type="button" data-slide-layout="${page.pageIndex}:single">1</button>
                      <button class="slide-layout-chip ${page.layout.mode === "pair" ? "is-active" : ""}" type="button" data-slide-layout="${page.pageIndex}:pair">2</button>
                      <button class="slide-layout-chip ${page.layout.mode === "triple" ? "is-active" : ""}" type="button" data-slide-layout="${page.pageIndex}:triple">3</button>
                      <button class="slide-layout-chip ${page.layout.mode === "quad" ? "is-active" : ""}" type="button" data-slide-layout="${page.pageIndex}:quad">4</button>
                      <button class="slide-thumb-delete" type="button" data-delete-slide="${page.pageIndex}" aria-label="${page.pageIndex}페이지 삭제">삭제</button>
                    </div>
                  </div>
                  <input
                    class="slide-caption-input"
                    type="text"
                    data-slide-caption-input="${page.pageIndex}"
                    placeholder="빈 슬라이드 소제목"
                    value="${escapeHtml(page.caption)}"
                  />
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
    const fragment = createFragmentFromHtml(thumbnailHtml);
    registerRenderableImageNodesInRoot(fragment, els.thumbnailRail);
    els.thumbnailRail.replaceChildren(fragment);
    els.thumbnailRail.querySelectorAll("[data-page]").forEach((button) => {
      const page = Number(button.getAttribute("data-page"));
      if (!Number.isFinite(page)) return;
      const owner = button.closest(".slide-thumb") ?? button;
      thumbnailPageButtonCache.set(page, owner);
    });
  }

  if (activeThumbnailButton && !els.thumbnailRail.contains(activeThumbnailButton)) {
    activeThumbnailButton = null;
  }

  if (activeThumbnailButton && Number(activeThumbnailButton.dataset.page) === state.pageIndex) {
    return;
  }

  activeThumbnailButton?.classList.remove("is-active");
  activeThumbnailButton = thumbnailPageButtonCache.get(state.pageIndex) ?? null;
  activeThumbnailButton?.classList.add("is-active");
}

function renderPhotoList() {
  if (!els.photoListPanel) return;

  if (state.images.length === 0) {
    photoListRenderKey = "empty";
    photoListRenderToken += 1;
    activePhotoListCard = null;
    els.photoListPanel.innerHTML = `<p class="photo-list-empty">사진을 업로드하면 전체 목록이 표시됩니다.</p>`;
    unregisterRenderableImageNodesInRoot(els.photoListPanel);
    return;
  }

  const usedCounts = getUsedCounts();
  const nextKey = [
    imagesVersion,
    slideSlotsVersion,
    state.images.length,
    state.slideSlots.length,
  ].join(":");

  if (photoListRenderKey === nextKey) return;

  photoListRenderKey = nextKey;
  photoListRenderToken += 1;
  const renderToken = photoListRenderToken;
  unregisterRenderableImageNodesInRoot(els.photoListPanel);
  els.photoListPanel.innerHTML = "";
  const selectedSlotImageId =
    Number.isFinite(state.selectedSlotIndex) && state.selectedSlotIndex >= 0
      ? state.slideSlots[state.selectedSlotIndex]
      : null;

  const cardHtml = (image, index) => {
    const usedCount = usedCounts.get(image.id) ?? 0;
    return `
      <article
        class="photo-list-card ${usedCount > 0 ? "is-in-slide" : "is-unused"} ${selectedSlotImageId === image.id ? "is-active" : ""}"
        draggable="true"
        data-image-id="${image.id}"
        data-index="${index}"
        title="${escapeHtml(image.name)}"
      >
        <img src="${getRenderableImageUrl(image)}" data-renderable-image-id="${image.id}" alt="" loading="lazy" decoding="async" />
        <div>
          <strong>${index + 1}</strong>
          <span>${escapeHtml(image.name)}</span>
          <em>${usedCount > 0 ? `슬라이드 포함 ${usedCount}` : "미배치"}</em>
        </div>
        <b>${usedCount > 0 ? "배치됨" : "미배치"}</b>
        <button class="photo-list-remove" type="button" data-remove-image-id="${image.id}" aria-label="${escapeHtml(image.name)} 삭제">X</button>
      </article>
    `;
  };

  const batchSize = state.images.length > 48 ? 24 : state.images.length;
  let startIndex = 0;
  const appendBatch = () => {
    if (renderToken !== photoListRenderToken) return;

    const endIndex = Math.min(startIndex + batchSize, state.images.length);
    const batchHtml = state.images
      .slice(startIndex, endIndex)
      .map((image, offset) => cardHtml(image, startIndex + offset))
      .join("");

    const fragment = createFragmentFromHtml(batchHtml);
    registerRenderableImageNodesInRoot(fragment, els.photoListPanel);
    els.photoListPanel.append(fragment);
    startIndex = endIndex;

    if (startIndex < state.images.length) {
      window.requestAnimationFrame(appendBatch);
      return;
    }

    syncPhotoListSelection();
  };

  appendBatch();
}

function isSequentialSlotComposition() {
  const compactSlots = state.slideSlots.filter(Boolean);
  if (compactSlots.length !== state.images.length) return false;
  syncImageIndex();
  return compactSlots.every((id) => imageByIdIndex.has(id));
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
  queuePersistAssets();
});

els.imageInput.addEventListener("change", async () => {
  await loadImageFiles(els.imageInput.files);
  els.imageInput.value = "";
});

els.guideListPanel?.addEventListener("input", (event) => {
  const slider = event.target instanceof HTMLInputElement ? event.target.closest("[data-guide-slider]") : null;
  if (!(slider instanceof HTMLInputElement)) return;

  const index = Number(slider.dataset.guideSlider);
  const value = Number(slider.value);
  if (!state.guides[index] || !Number.isFinite(value)) return;

  state.guides[index].percent = clamp(value, 0, 100);
  markGuidesDirty();
  guideControlOutputCache.get(index)?.replaceChildren(`${value.toFixed(1)}%`);
  syncGuideVisual(index);

  queuePersistSettings();
});

els.guideListPanel?.addEventListener("change", (event) => {
  const slider = event.target instanceof HTMLInputElement ? event.target.closest("[data-guide-slider]") : null;
  if (!(slider instanceof HTMLInputElement)) return;
  queuePersistSettings();
});

els.guideListPanel?.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-guide-delete]") : null;
  if (!(button instanceof HTMLButtonElement)) return;
  const index = Number(button.dataset.guideDelete);
  state.guides.splice(index, 1);
  markGuidesDirty();
  render();
});

els.stage?.addEventListener("input", (event) => {
  const input = event.target instanceof HTMLTextAreaElement ? event.target.closest("[data-empty-slide-caption]") : null;
  if (!(input instanceof HTMLTextAreaElement)) return;
  const page = Number(input.dataset.emptySlideCaption);
  if (!Number.isFinite(page) || page <= 0) return;
  updateSlideCaption(page, input.value);
});

els.stage?.addEventListener("pointerdown", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const guideEl = target?.closest(".guide");
  if (guideEl instanceof HTMLElement) {
    event.preventDefault();
    const index = Number(guideEl.dataset.guideIndex);
    const guide = state.guides[index];
    if (!guide) return;
    const stageRect = els.stage.getBoundingClientRect();
    activeGuideDrag = {
      index,
      axis: guide.axis,
      pointerId: event.pointerId,
      stageRect,
    };
    return;
  }

  const ruler = target?.closest(".guide-ruler");
  if (!(ruler instanceof HTMLElement)) return;

  event.preventDefault();
  const axis = ruler.dataset.rulerAxis;
  if (axis !== "x" && axis !== "y") return;
  const stageRect = els.stage.getBoundingClientRect();
  state.guides.push({
    axis,
    percent: getGuidePercentFromPointer(axis, event, stageRect),
  });
  markGuidesDirty();
  const index = state.guides.length - 1;
  activeGuideDrag = {
    index,
    axis,
    pointerId: event.pointerId,
    stageRect,
  };
  render();
  syncGuideVisual(index);
});

els.stage?.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;

  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest(".guide, .guide-ruler, [data-remove-slot]")) return;

  const slot = target?.closest("[data-slot-index]");
  if (!(slot instanceof HTMLElement)) return;

  const slotIndex = Number(slot.dataset.slotIndex);
  if (!Number.isFinite(slotIndex) || !state.slideSlots[slotIndex]) return;

  const rect = slot.getBoundingClientRect();
  const transform = getSlotTransform(slotIndex);
  activeSlotPan = {
    slotIndex,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: transform.x,
    originY: transform.y,
    width: Math.max(rect.width, 1),
    height: Math.max(rect.height, 1),
    moved: false,
  };

  selectSlot(slotIndex);
  slot.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});

els.stage?.addEventListener("contextmenu", (event) => {
  const target = event.target instanceof Element ? event.target.closest(".guide") : null;
  if (!(target instanceof HTMLElement)) return;
  event.preventDefault();
  const index = Number(target.dataset.guideIndex);
  const current = state.guides[index]?.percent ?? 50;
  const next = window.prompt("안내선 위치를 퍼센트로 입력하세요.", current.toFixed(1));
  if (next === null) return;
  const value = Number(next);
  if (!Number.isFinite(value)) return;
  updateGuide(index, value);
});

window.addEventListener("pointermove", (event) => {
  if (!activeGuideDrag || event.pointerId !== activeGuideDrag.pointerId) return;
  const guide = state.guides[activeGuideDrag.index];
  if (!guide) return;
  guide.percent = getGuidePercentFromPointer(activeGuideDrag.axis, event, activeGuideDrag.stageRect);
  markGuidesDirty();
  syncGuideVisual(activeGuideDrag.index);
});

window.addEventListener("pointermove", (event) => {
  if (!activeSlotPan || event.pointerId !== activeSlotPan.pointerId) return;

  const dx = event.clientX - activeSlotPan.startX;
  const dy = event.clientY - activeSlotPan.startY;
  const nextX = clamp(Number((activeSlotPan.originX + (dx / activeSlotPan.width) * 100).toFixed(2)), -100, 100);
  const nextY = clamp(Number((activeSlotPan.originY + (dy / activeSlotPan.height) * 100).toFixed(2)), -100, 100);
  const transform = getSlotTransform(activeSlotPan.slotIndex);

  if (transform.x === nextX && transform.y === nextY) return;

  transform.x = nextX;
  transform.y = nextY;
  activeSlotPan.moved = true;
  scheduleLightweightRefresh([activeSlotPan.slotIndex]);
});

window.addEventListener("pointerup", (event) => {
  if (!activeGuideDrag || event.pointerId !== activeGuideDrag.pointerId) return;
  activeGuideDrag = null;
  render();
});

window.addEventListener("pointerup", (event) => {
  if (!activeSlotPan || event.pointerId !== activeSlotPan.pointerId) return;
  const shouldPersist = activeSlotPan.moved;
  activeSlotPan = null;
  if (shouldPersist) queuePersistSettings();
});

window.addEventListener("pointercancel", () => {
  if (!activeSlotPan) return;
  activeSlotPan = null;
});

els.stage?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const removeButton = target?.closest("[data-remove-slot]");
  if (removeButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    setSlot(Number(removeButton.dataset.removeSlot), null);
    return;
  }

  const slot = target?.closest("[data-slot-index]");
  if (!(slot instanceof HTMLElement)) return;
  const slotIndex = Number(slot.dataset.slotIndex);
  if (state.slideSlots[slotIndex]) selectSlot(slotIndex);
});

els.stage?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target instanceof Element ? event.target.closest("[data-slot-index]") : null;
  if (!(target instanceof HTMLElement)) return;
  const slotIndex = Number(target.dataset.slotIndex);
  if (!state.slideSlots[slotIndex]) return;
  event.preventDefault();
  selectSlot(slotIndex);
});

els.stage?.addEventListener("dragover", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-slot-index]") : null;
  if (!(target instanceof HTMLElement)) return;
  event.preventDefault();
  if (activeStageSlotDropTarget === target) return;
  activeStageSlotDropTarget?.classList.remove("is-drop-target");
  activeStageSlotDropTarget = target;
  activeStageSlotDropTarget.classList.add("is-drop-target");
});

els.stage?.addEventListener("dragleave", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-slot-index]") : null;
  if (!(target instanceof HTMLElement)) return;
  const nextTarget = event.relatedTarget instanceof Element ? event.relatedTarget.closest("[data-slot-index]") : null;
  if (nextTarget === target) return;
  target.classList.remove("is-drop-target");
  if (activeStageSlotDropTarget === target) activeStageSlotDropTarget = null;
});

els.stage?.addEventListener("drop", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-slot-index]") : null;
  if (!(target instanceof HTMLElement)) return;
  event.preventDefault();
  target.classList.remove("is-drop-target");
  if (activeStageSlotDropTarget === target) activeStageSlotDropTarget = null;

  const slotIndex = Number(target.dataset.slotIndex);
  const payload = event.dataTransfer?.getData("application/x-medical-presenter");
  if (payload === "empty") {
    setSlot(slotIndex, null);
    return;
  }
  if (payload) setSlot(slotIndex, payload);
});

els.thumbnailRail?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest("[data-slide-caption-input]")) return;
  const insertBeforeButton = target?.closest("[data-insert-slide-before]");
  if (insertBeforeButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    insertSlidePage(Number(insertBeforeButton.dataset.insertSlideBefore), "before");
    return;
  }
  const insertAfterButton = target?.closest("[data-insert-slide-after]");
  if (insertAfterButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    insertSlidePage(Number(insertAfterButton.dataset.insertSlideAfter), "after");
    return;
  }
  const duplicateButton = target?.closest("[data-duplicate-slide]");
  if (duplicateButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    duplicateSlidePage(Number(duplicateButton.dataset.duplicateSlide));
    return;
  }
  const layoutButton = target?.closest("[data-slide-layout]");
  if (layoutButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    const [pageText, mode] = (layoutButton.dataset.slideLayout || "").split(":");
    const page = Number(pageText);
    if (!Number.isFinite(page) || !mode) return;
    setLayoutPreset(mode, page);
    return;
  }
  const deleteButton = target?.closest("[data-delete-slide]");
  if (deleteButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    deleteSlidePage(Number(deleteButton.dataset.deleteSlide));
    return;
  }

  const slotThumb = target?.closest("[data-slot-thumb-index]");
  if (slotThumb instanceof HTMLElement) {
    const slotIndex = Number(slotThumb.getAttribute("data-slot-thumb-index"));
    if (!Number.isFinite(slotIndex)) return;
    const location = getSlotLocation(slotIndex);
    if (!location) return;
    goToPageWithSelection(location.page, state.slideSlots[slotIndex] ? slotIndex : null);
    return;
  }

  const slideThumb = target?.closest("[data-page]");
  if (slideThumb instanceof HTMLElement) {
    const page = Number(slideThumb.dataset.page);
    if (!Number.isFinite(page)) return;
    const slotIndex = page > 0 ? findFirstFilledSlotIndexForPage(page) : null;
    goToPageWithSelection(page, slotIndex);
  }
});

els.thumbnailRail?.addEventListener("input", (event) => {
  const input = event.target instanceof HTMLInputElement ? event.target.closest("[data-slide-caption-input]") : null;
  if (!(input instanceof HTMLInputElement)) return;
  updateSlideCaption(Number(input.dataset.slideCaptionInput), input.value);
});

els.thumbnailRail?.addEventListener("dragstart", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".slide-thumb-editor") : null;
  if (!(card instanceof HTMLElement) || !event.dataTransfer) return;
  event.dataTransfer.setData("application/x-medical-slide-page", card.dataset.page);
  event.dataTransfer.effectAllowed = "move";
});

els.thumbnailRail?.addEventListener("dragover", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".slide-thumb-editor") : null;
  if (!(card instanceof HTMLElement)) return;
  event.preventDefault();
  if (activeSlideReorderTarget === card) return;
  activeSlideReorderTarget?.classList.remove("is-reorder-target");
  activeSlideReorderTarget = card;
  activeSlideReorderTarget.classList.add("is-reorder-target");
});

els.thumbnailRail?.addEventListener("dragleave", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".slide-thumb-editor") : null;
  if (!(card instanceof HTMLElement)) return;
  const nextTarget = event.relatedTarget instanceof Element ? event.relatedTarget.closest(".slide-thumb-editor") : null;
  if (nextTarget === card) return;
  card.classList.remove("is-reorder-target");
  if (activeSlideReorderTarget === card) activeSlideReorderTarget = null;
});

els.thumbnailRail?.addEventListener("drop", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".slide-thumb-editor") : null;
  if (!(card instanceof HTMLElement)) return;
  event.preventDefault();
  card.classList.remove("is-reorder-target");
  if (activeSlideReorderTarget === card) activeSlideReorderTarget = null;

  const fromPage = Number(event.dataTransfer?.getData("application/x-medical-slide-page"));
  const toPage = Number(card.dataset.page);
  if (!Number.isFinite(fromPage) || !Number.isFinite(toPage) || fromPage === toPage) return;
  reorderSlidePage(fromPage, toPage);
});

els.thumbnailRail?.addEventListener("dragend", () => {
  activeSlideReorderTarget?.classList.remove("is-reorder-target");
  activeSlideReorderTarget = null;
});

els.thumbnailRail?.addEventListener("contextmenu", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".slide-thumb-editor") : null;
  if (!(card instanceof HTMLElement)) return;
  if (event.target instanceof Element && event.target.closest("[data-slide-caption-input]")) return;
  event.preventDefault();
  const page = Number(card.dataset.page);
  if (!Number.isFinite(page)) return;
  if (window.confirm(`${page}페이지를 삭제할까요?`)) {
    deleteSlidePage(page);
  }
});

els.photoListPanel?.addEventListener("dragstart", (event) => {
  const target = event.target instanceof Element ? event.target.closest(".photo-list-card") : null;
  if (!(target instanceof HTMLElement) || !event.dataTransfer) return;
  event.dataTransfer.setData("application/x-medical-presenter", target.dataset.imageId);
  event.dataTransfer.setData("text/plain", target.dataset.index);
});

els.photoListPanel?.addEventListener("dragover", (event) => {
  const target = event.target instanceof Element ? event.target.closest(".photo-list-card") : null;
  if (!(target instanceof HTMLElement)) return;
  event.preventDefault();
  if (activeReorderTarget === target) return;
  activeReorderTarget?.classList.remove("is-reorder-target");
  activeReorderTarget = target;
  activeReorderTarget.classList.add("is-reorder-target");
});

els.photoListPanel?.addEventListener("dragleave", (event) => {
  const target = event.target instanceof Element ? event.target.closest(".photo-list-card") : null;
  if (!(target instanceof HTMLElement)) return;
  const nextTarget = event.relatedTarget instanceof Element ? event.relatedTarget.closest(".photo-list-card") : null;
  if (nextTarget === target) return;
  target.classList.remove("is-reorder-target");
  if (activeReorderTarget === target) activeReorderTarget = null;
});

els.photoListPanel?.addEventListener("drop", (event) => {
  const target = event.target instanceof Element ? event.target.closest(".photo-list-card") : null;
  if (!(target instanceof HTMLElement)) return;
  event.preventDefault();
  target.classList.remove("is-reorder-target");
  if (activeReorderTarget === target) activeReorderTarget = null;

  const from = Number(event.dataTransfer?.getData("text/plain"));
  const to = Number(target.dataset.index);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;

  const [moved] = state.images.splice(from, 1);
  state.images.splice(to, 0, moved);
  markImagesDirty();

  if (isSequentialSlotComposition()) {
    state.slideSlots = state.images.map((image) => image.id);
    markSlideSlotsDirty();
  }

  state.sortMode = "manual";
  els.sortMode.value = "manual";
  render();
  queuePersistAssets();
});

els.photoListPanel?.addEventListener("dragend", () => {
  activeReorderTarget?.classList.remove("is-reorder-target");
  activeReorderTarget = null;
});

els.photoListPanel?.addEventListener("click", (event) => {
  const removeButton = event.target instanceof Element ? event.target.closest("[data-remove-image-id]") : null;
  if (removeButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    const imageId = removeButton.dataset.removeImageId;
    if (!imageId) return;
    if (window.confirm("이 사진을 전체 목록과 슬라이드에서 함께 삭제할까요?")) {
      removeImageFromLibrary(imageId);
    }
    return;
  }

  const card = event.target instanceof Element ? event.target.closest(".photo-list-card") : null;
  if (!(card instanceof HTMLElement)) return;
  const imageId = card.dataset.imageId;
  if (!imageId) return;
  const slotIndex = findFirstSlotIndexByImageId(imageId);
  if (slotIndex < 0) return;
  const location = getSlotLocation(slotIndex);
  if (!location) return;
  goToPageWithSelection(location.page, slotIndex);
});

els.photoListPanel?.addEventListener("contextmenu", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".photo-list-card") : null;
  if (!(card instanceof HTMLElement)) return;
  event.preventDefault();
  const imageId = card.dataset.imageId;
  if (!imageId) return;
  if (window.confirm("이 사진을 전체 목록과 슬라이드에서 함께 삭제할까요?")) {
    removeImageFromLibrary(imageId);
  }
});

els.sortMode.addEventListener("change", () => {
  state.sortMode = els.sortMode.value;
  imageSortDirty = true;
  render();
});

els.layoutMode.addEventListener("change", () => {
  if (els.layoutMode.value !== "custom") {
    setLayoutPreset(els.layoutMode.value, state.pageIndex);
    return;
  }
  setGrid(Number(els.gridRows.value), Number(els.gridCols.value), "custom", state.pageIndex);
});

els.layoutOneButton.addEventListener("click", () => setLayoutPreset("single", state.pageIndex));
els.layoutTwoButton.addEventListener("click", () => setLayoutPreset("pair", state.pageIndex));
els.layoutThreeButton.addEventListener("click", () => setLayoutPreset("triple", state.pageIndex));
els.layoutFourButton.addEventListener("click", () => setLayoutPreset("quad", state.pageIndex));
els.horizontalSplitButton.addEventListener("click", () => setGrid(1, Math.max(2, Number(els.gridCols.value)), "custom", state.pageIndex));
els.verticalSplitButton.addEventListener("click", () => setGrid(Math.max(2, Number(els.gridRows.value)), 1, "custom", state.pageIndex));
els.gridRows.addEventListener("input", () => setGrid(Number(els.gridRows.value), Number(els.gridCols.value), "custom", state.pageIndex));
els.gridCols.addEventListener("input", () => setGrid(Number(els.gridRows.value), Number(els.gridCols.value), "custom", state.pageIndex));

els.prevButton.addEventListener("click", () => goToPage(state.pageIndex - 1));
els.nextButton.addEventListener("click", () => goToPage(state.pageIndex + 1));
els.insertSlideBeforeButton?.addEventListener("click", () => {
  if (state.pageIndex <= 0) return;
  insertSlidePage(state.pageIndex, "before");
});
els.insertSlideAfterButton?.addEventListener("click", () => {
  if (state.pageIndex <= 0) return;
  insertSlidePage(state.pageIndex, "after");
});
els.duplicateSlideButton?.addEventListener("click", () => {
  if (state.pageIndex <= 0) return;
  duplicateSlidePage(state.pageIndex);
});
els.deleteSlideButton?.addEventListener("click", () => {
  if (state.pageIndex <= 0) return;
  deleteSlidePage(state.pageIndex);
});
els.fitButton.addEventListener("click", () => updateFitMode("fit"));
els.fillButton.addEventListener("click", () => updateFitMode("fill"));
els.backgroundButton.addEventListener("click", toggleBackground);
els.presentButton.addEventListener("click", togglePresentationMode);
els.shortcutHelpButton.addEventListener("click", showShortcutHelp);
els.closeShortcutHelpButton.addEventListener("click", hideShortcutHelp);
els.shortcutDialog.addEventListener("click", closeDialogFromBackdrop);
els.exportButton.addEventListener("click", exportStandaloneHtml);
els.openPagesButton.addEventListener("click", () => {
  window.open("https://github.com/notoow/medical-image-presenter", "_blank", "noopener,noreferrer");
});
els.downloadImagesButton.addEventListener("click", downloadAdjustedImages);
els.emptySlotToken.addEventListener("dragstart", (event) => {
  event.dataTransfer.setData("application/x-medical-presenter", "empty");
});
els.addEmptySlotButton.addEventListener("click", addEmptySlot);
els.resetAllButton.addEventListener("click", resetAllPhotosAndSlides);
els.clearSlideSlotsButton.addEventListener("click", clearSlideSlots);
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
bindFilter(els.hue, els.hueValue, "deg");
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
  markGuidesDirty();
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
  els.hueValue.textContent = "0deg";
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

  if (isZoomInKey(event)) {
    event.preventDefault();
    updateZoom(0.1);
  }

  if (isZoomOutKey(event)) {
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

document.addEventListener("wheel", handleStageWheelZoom, { passive: false });

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
    slideCaptions: state.slideCaptions,
    slidePageLayouts: state.slidePageLayouts,
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

function getImageOrder() {
  return state.images.map((image) => image.id);
}

function getSettingsData() {
  return {
    cover: {
      title: els.coverTitle.value,
      subtitle: els.coverSubtitle.value,
      hospitalName: els.hospitalName.value,
      presenterName: els.presenterName.value,
      date: new Date().toLocaleDateString("ko-KR"),
    },
    coverVisibility: state.coverVisibility,
    slideSlots: state.slideSlots,
    slideCaptions: state.slideCaptions,
    slidePageLayouts: state.slidePageLayouts,
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
    pageIndex: state.pageIndex,
    selectedSlotIndex: state.selectedSlotIndex,
    imageOrder: getImageOrder(),
  };
}

function getAssetsData() {
  return {
    images: state.images,
    logoUrl: state.logoUrl,
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

function clearScheduledIdle(handle) {
  if (!handle) return null;
  if (typeof window.cancelIdleCallback === "function" && String(handle).startsWith("idle:")) {
    window.cancelIdleCallback(Number(String(handle).slice(5)));
    return null;
  }

  window.clearTimeout(Number(handle));
  return null;
}

function scheduleIdleTask(task, delay = 0) {
  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(task, { timeout: Math.max(240, delay) });
    return `idle:${idleId}`;
  }

  return window.setTimeout(task, delay);
}

function queuePersistSettings() {
  if (isRestoring) return;
  window.clearTimeout(settingsPersistTimer);
  settingsPersistTimer = window.setTimeout(() => {
    settingsPersistIdleHandle = clearScheduledIdle(settingsPersistIdleHandle);
    settingsPersistIdleHandle = scheduleIdleTask(() => {
      settingsPersistIdleHandle = null;
      try {
        const nextJson = JSON.stringify(getSettingsData());
        if (nextJson === lastPersistedSettingsJson) return;
        localStorage.setItem(SETTINGS_STORAGE_KEY, nextJson);
        lastPersistedSettingsJson = nextJson;
      } catch {
        // Ignore storage failures here; the editor still works and HTML export preserves the full deck.
      }
    }, 250);
  }, 250);
}

function queuePersistAssets() {
  if (isRestoring) return;
  window.clearTimeout(assetsPersistTimer);
  assetsPersistTimer = window.setTimeout(() => {
    assetsPersistIdleHandle = clearScheduledIdle(assetsPersistIdleHandle);
    assetsPersistIdleHandle = scheduleIdleTask(() => {
      assetsPersistIdleHandle = null;
      try {
        const nextJson = JSON.stringify(getAssetsData());
        if (nextJson === lastPersistedAssetsJson) return;
        localStorage.setItem(ASSETS_STORAGE_KEY, nextJson);
        lastPersistedAssetsJson = nextJson;
      } catch {
        // Asset persistence can exceed storage quota; keep settings persistence working regardless.
      }
    }, 500);
  }, 500);
}

function applyImageOrder(order) {
  if (!Array.isArray(order) || order.length === 0 || state.images.length === 0) return;

  const byId = new Map(state.images.map((image) => [image.id, image]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean);
  const remaining = state.images.filter((image) => !order.includes(image.id));
  state.images = [...ordered, ...remaining];
  markImagesDirty();
}

function applyPersistedState() {
  const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
  const savedAssets = localStorage.getItem(ASSETS_STORAGE_KEY);
  const legacySaved = !savedSettings && !savedAssets ? localStorage.getItem(LEGACY_STORAGE_KEY) : null;
  if (!savedSettings && !savedAssets && !legacySaved) return false;

  try {
    const data = legacySaved ? JSON.parse(legacySaved) : savedSettings ? JSON.parse(savedSettings) : {};
    const assets = legacySaved ? data : savedAssets ? JSON.parse(savedAssets) : {};
    lastPersistedSettingsJson = savedSettings || "";
    lastPersistedAssetsJson = savedAssets || "";

    state.images = Array.isArray(assets.images) ? assets.images : state.images;
    markImagesDirty();
    state.logoUrl = assets.logoUrl || state.logoUrl;

    if (data.cover) {
      els.coverTitle.value = data.cover.title ?? els.coverTitle.value;
      els.coverSubtitle.value = data.cover.subtitle ?? els.coverSubtitle.value;
      els.hospitalName.value = data.cover.hospitalName ?? els.hospitalName.value;
      els.presenterName.value = data.cover.presenterName ?? els.presenterName.value;
    }

    state.slideSlots = Array.isArray(data.slideSlots) ? data.slideSlots : state.slideSlots;
    markSlideSlotsDirty();
    state.slideCaptions = Array.isArray(data.slideCaptions) ? data.slideCaptions : state.slideCaptions;
    state.slidePageLayouts = Array.isArray(data.slidePageLayouts) ? data.slidePageLayouts : state.slidePageLayouts;
    state.slotTransforms = data.slotTransforms ?? state.slotTransforms;
    state.selectedSlotIndex = data.selectedSlotIndex ?? state.selectedSlotIndex;
    state.layoutMode = data.layoutMode ?? state.layoutMode;
    state.gridRows = data.gridRows ?? state.gridRows;
    state.gridCols = data.gridCols ?? state.gridCols;
    markLayoutDirty();
    normalizeSlidePageLayouts();
    state.sortMode = data.sortMode ?? state.sortMode;
    state.fitMode = data.fitMode ?? state.fitMode;
    state.backgroundEnabled = data.backgroundEnabled ?? state.backgroundEnabled;
    state.backgroundFilters = { ...state.backgroundFilters, ...(data.backgroundFilters ?? {}) };
    state.crop = { ...state.crop, ...(data.crop ?? {}) };
    state.zoom = data.zoom ?? state.zoom;
    state.guidesEnabled = data.guidesEnabled ?? state.guidesEnabled;
    state.guides = Array.isArray(data.guides) ? data.guides : state.guides;
    markGuidesDirty();
    state.coverVisibility = { ...state.coverVisibility, ...(data.coverVisibility ?? {}) };
    state.filters = { ...state.filters, ...(data.filters ?? {}) };
    state.pageIndex = data.pageIndex ?? state.pageIndex;
    applyImageOrder(data.imageOrder);

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
    els.hueValue.textContent = `${state.filters.hue}deg`;

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
    if (state.logoUrl) els.logoFileName.textContent = "저장된 로고 불러옴";
    if (state.images.length > 0) els.imageFileName.textContent = `${state.images.length}장 복원됨`;
    warmPreviewCache(state.images);
    return true;
  } catch {
    return false;
  }
}

function exportStandaloneHtml() {
  if (state.images.length === 0) {
    alert("먼저 사진을 선택해야 HTML을 내려받을 수 있습니다.");
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
  <meta
    name="description"
    content="Medical Image Presenter exported deck입니다. 병원 비포애프터 사진을 정렬, 보정, 분할, 발표 모드로 확인할 수 있는 단일 HTML 프레젠테이션입니다."
  />
  <meta name="robots" content="noindex,nofollow" />
  <style>
    @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css");
    :root { color-scheme: dark; --ink:#fffdf7; --muted:rgba(255,253,247,.68); --panel:rgba(20,19,17,.84); --panel-soft:rgba(255,255,255,.05); --line:rgba(255,253,247,.16); --accent:#d9a06f; --accent-strong:#8f5c38; --white:#fffdf7; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; color:var(--ink); font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:radial-gradient(circle at 15% 10%,rgba(217,160,111,.2),transparent 28rem),linear-gradient(135deg,#151512,#050505); }
    button,input,textarea,select { font:inherit; }
    button { border:1px solid var(--line); border-radius:999px; padding:.62rem .88rem; color:var(--ink); background:rgba(255,255,255,.08); cursor:pointer; transition:transform 160ms ease,border-color 160ms ease,background 160ms ease; }
    button:hover { transform:translateY(-1px); border-color:rgba(217,160,111,.42); background:rgba(255,255,255,.12); }
    input,textarea,select { width:100%; border:1px solid rgba(255,253,247,.14); border-radius:1rem; padding:.68rem .8rem; color:var(--ink); background:rgba(255,255,255,.11); box-shadow:inset 0 1px 0 rgba(255,255,255,.06); }
    select, select option { color:var(--ink); background:#201d1a; }
    input[type="range"] { padding:0; background:transparent; box-shadow:none; border:0; }
    .app { display:grid; grid-template-columns:20rem 1fr; gap:1rem; min-height:100vh; padding:1rem; }
    .panel { display:grid; align-content:start; gap:1rem; max-height:calc(100vh - 2rem); overflow:auto; border:1px solid var(--line); border-radius:1.45rem; padding:1.05rem; background:linear-gradient(180deg,rgba(26,24,22,.92),rgba(14,13,12,.84)); backdrop-filter:blur(16px); box-shadow:0 20px 70px rgba(0,0,0,.28); }
    .brand { display:grid; gap:.45rem; padding-bottom:.15rem; }
    .eyebrow { margin:0; color:rgba(217,160,111,.82); font-size:.74rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }
    .panel h1 { margin:0; font-size:1.82rem; line-height:.96; letter-spacing:-.05em; }
    .muted-copy { margin:0; color:var(--muted); font-size:.84rem; line-height:1.45; }
    .section { display:grid; gap:.72rem; padding:.8rem; border:1px solid rgba(255,253,247,.08); border-radius:1.15rem; background:var(--panel-soft); }
    .section-title { margin:0; color:rgba(255,253,247,.88); font-size:.82rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
    .field { display:grid; gap:.36rem; color:var(--muted); font-size:.84rem; }
    .panel textarea { min-height:5.2rem; resize:vertical; line-height:1.45; }
    .toggle-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.5rem; }
    .toggle-pill { position:relative; display:flex; align-items:center; justify-content:space-between; min-height:2.7rem; border:1px solid rgba(255,253,247,.08); border-radius:999px; padding:.32rem .82rem; color:var(--muted); background:rgba(255,255,255,.05); cursor:pointer; }
    .toggle-pill input { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); }
    .toggle-pill::after { content:""; width:2.2rem; height:1.28rem; margin-left:auto; border-radius:999px; background:rgba(255,255,255,.12); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12); transition:background 160ms ease; }
    .toggle-pill::before { content:""; position:absolute; right:1.42rem; width:.88rem; height:.88rem; border-radius:50%; background:var(--white); box-shadow:0 2px 8px rgba(0,0,0,.28); transition:right 160ms ease,background 160ms ease; }
    .toggle-pill:has(input:checked) { color:var(--ink); font-weight:700; }
    .toggle-pill:has(input:checked)::after { background:linear-gradient(135deg,var(--accent),var(--accent-strong)); }
    .toggle-pill:has(input:checked)::before { right:.58rem; }
    .row { display:flex; gap:.5rem; align-items:center; }
    .row > * { flex:1; }
    .stack { display:grid; gap:.55rem; }
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
    .empty-slide-caption { position:absolute; z-index:6; top:50%; left:50%; max-width:min(72%,30rem); transform:translate(-50%,-50%); border:1px solid var(--line); border-radius:1rem; padding:.9rem 1.2rem; color:rgba(255,253,247,.9); background:rgba(10,10,10,.56); font-size:clamp(1.1rem,2.2vw,1.6rem); font-weight:800; text-align:center; backdrop-filter:blur(10px); }
    dialog { width:min(54rem,calc(100vw - 2rem)); border:1px solid var(--line); border-radius:1.5rem; padding:0; color:var(--ink); background:linear-gradient(145deg,rgba(37,34,30,.98),rgba(8,8,7,.98)); box-shadow:0 28px 90px rgba(0,0,0,.5); }
    dialog::backdrop { background:rgba(0,0,0,.58); backdrop-filter:blur(10px); }
    .help-card { padding:1.4rem; }
    .help-head { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:1rem; }
    .help-head h2 { margin:0; font-size:2.5rem; line-height:.95; letter-spacing:-.055em; }
    .help-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.65rem; }
    .help-grid p { display:flex; align-items:center; gap:.35rem; margin:0; border:1px solid var(--line); border-radius:1rem; padding:.72rem; background:rgba(255,255,255,.07); }
    .help-grid span { margin-left:auto; color:var(--muted); text-align:right; }
    kbd { display:inline-grid; place-items:center; min-width:1.9rem; min-height:1.7rem; border:1px solid var(--line); border-radius:.45rem; padding:.12rem .38rem; background:rgba(255,255,255,.1); font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; font-size:.78rem; }
    .sidebar-footer-link { position:sticky; bottom:0; display:flex; align-items:center; gap:.82rem; width:100%; margin-top:1rem; border:1px solid rgba(255,253,247,.12); border-radius:1.15rem; padding:.8rem .9rem; text-align:left; background:linear-gradient(180deg,rgba(30,28,25,.94),rgba(18,17,15,.96)); box-shadow:0 18px 36px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.06); }
    .sidebar-footer-mark { display:grid; flex:none; place-items:center; width:2.7rem; height:2.7rem; border-radius:.9rem; color:var(--white); background:linear-gradient(145deg,#2b2926,#090909); box-shadow:inset 0 1px 0 rgba(255,255,255,.12); }
    .sidebar-footer-mark svg { width:1.25rem; height:1.25rem; fill:currentColor; }
    .sidebar-footer-copy { display:grid; gap:.14rem; }
    .sidebar-footer-copy strong { color:var(--ink); font-size:.92rem; letter-spacing:-.02em; }
    .sidebar-footer-copy small { color:var(--muted); font-size:.76rem; }
    body.presenting .panel, body.presenting .toolbar { display:none; }
    body.presenting .app { display:grid; grid-template-columns:1fr; padding:0; }
    body.presenting .stage { width:100vw; height:100vh; border-radius:0; aspect-ratio:auto; }
    @media (max-width:900px){ .app{grid-template-columns:1fr}.panel{max-height:none}.stage{width:100%}.help-grid{grid-template-columns:1fr}.toggle-grid{grid-template-columns:1fr} }
  </style>
</head>
<body>
  <main class="app">
    <aside class="panel">
      <h1>Case Photo Presenter</h1>
      <label>제목 <textarea id="title" rows="2"></textarea></label>
      <label>부제<input id="subtitle" type="text" /></label>
      <label>병원명<input id="hospital" type="text" /></label>
      <label>발표자<input id="presenter" type="text" /></label>
      <div class="toggle-grid">
        <label class="toggle-pill"><input id="showTitle" type="checkbox"> 제목</label>
        <label class="toggle-pill"><input id="showSubtitle" type="checkbox"> 부제</label>
        <label class="toggle-pill"><input id="showHospital" type="checkbox"> 병원명</label>
        <label class="toggle-pill"><input id="showPresenter" type="checkbox"> 발표자</label>
        <label class="toggle-pill"><input id="showDate" type="checkbox"> 날짜</label>
        <label class="toggle-pill"><input id="showLogo" type="checkbox"> 로고</label>
      </div>
      <label>페이지 구성 <select id="layout"><option value="single">낱장</option><option value="pair">2분할</option><option value="triple">3분할</option></select></label>
      <div class="row"><button id="fit">맞추기 F</button><button id="fill">채우기 Shift+F</button></div>
      <button id="bg">배경 채우기 Enter</button>
      <button id="present">발표모드 F5</button>
      <button id="help">단축키 보기 Shift+?</button>
      <button id="downloadImages">편집 사진 다운로드</button>
      <label>밝기 <input id="brightness" type="range" min="50" max="150" /></label>
      <label>대비<input id="contrast" type="range" min="50" max="160" /></label>
      <label>채도 <input id="saturate" type="range" min="0" max="180" /></label>
      <label>색조 <input id="hue" type="range" min="-45" max="45" /></label>
      <p>F5: 발표 시작 / Esc: 종료 / Shift+?: 도움말</p>
      <p>화살표 N P Space: 페이지 이동 / = - 휠 키패드 +/-: 확대 축소 / 0: 초기화 / C: 커버</p>
      <button id="openPages" class="sidebar-footer-link" type="button" aria-label="GitHub Pages 열기">
        <span class="sidebar-footer-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img">
            <path d="M12 2C6.48 2 2 6.58 2 12.22c0 4.5 2.87 8.31 6.84 9.66.5.1.68-.22.68-.5 0-.24-.01-1.04-.02-1.89-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.64-1.36-2.22-.26-4.56-1.14-4.56-5.09 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.89c.85 0 1.71.12 2.51.36 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.96-2.34 4.82-4.57 5.08.36.32.69.94.69 1.9 0 1.38-.01 2.49-.01 2.83 0 .28.18.61.69.5A10.25 10.25 0 0 0 22 12.22C22 6.58 17.52 2 12 2Z" />
          </svg>
        </span>
        <span class="sidebar-footer-copy">
          <strong>GitHub Repository</strong>
          <small>소스 코드 · 이슈 · 업데이트</small>
        </span>
      </button>
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
        <p><kbd>=</kbd> <kbd>-</kbd> <kbd>휠</kbd><span>확대 / 축소</span></p>
        <p><kbd>Num +</kbd> <kbd>Num -</kbd> <kbd>0</kbd><span>키패드 확대 / 축소 / 초기화</span></p>
        <p><kbd>Shift</kbd> + <kbd>?</kbd><span>도움말</span></p>
      </div>
    </div>
  </dialog>
  <script>
    const data = ${serialized};
    const state = { ...data, pageIndex: 0 };
    const normalizeLayout = (layout) => {
      const mode = layout?.mode === "custom" ? "custom" : ({ single:1, pair:1, triple:1, quad:1 }[layout?.mode] ? layout.mode : "pair");
      const rows = mode === "custom" ? Math.min(Math.max(Number(layout?.rows)||1,1),4) : ({ single:1, pair:1, triple:1, quad:2 }[mode] || 1);
      const cols = mode === "custom" ? Math.min(Math.max(Number(layout?.cols)||1,1),6) : ({ single:1, pair:2, triple:3, quad:2 }[mode] || 2);
      return { mode, rows, cols };
    };
    const defaultLayout = () => normalizeLayout({ mode: state.layoutMode, rows: state.gridRows, cols: state.gridCols });
    const layoutSize = (layout) => layout.mode === "custom" ? layout.rows * layout.cols : ({ single:1, pair:2, triple:3, quad:4 }[layout.mode] || 2);
    const ensureLayouts = (required = state.slideSlots?.length || 0) => {
      state.slidePageLayouts = Array.isArray(state.slidePageLayouts) ? state.slidePageLayouts.map(normalizeLayout) : [];
      let covered = state.slidePageLayouts.reduce((sum, layout) => sum + layoutSize(layout), 0);
      while (covered < required) {
        const fallback = defaultLayout();
        state.slidePageLayouts.push(fallback);
        covered += layoutSize(fallback);
      }
    };
    const slidePages = () => {
      ensureLayouts();
      let start = 0;
      return state.slidePageLayouts.map((layout, pageIndex) => {
        const size = layoutSize(layout);
        const raw = (state.slideSlots?.length ? state.slideSlots : state.images.map((image)=>image.id)).slice(start, start + size);
        const slots = Array.from({ length: size }, (_, offset) => raw[offset] ?? null);
        const page = { pageIndex: pageIndex + 1, start, pageSize: size, layout, slots, caption: state.slideCaptions?.[pageIndex] || "" };
        start += size;
        return page;
      });
    };
    const pageLayout = (page = state.pageIndex) => page > 0 ? (slidePages()[page - 1]?.layout || defaultLayout()) : defaultLayout();
    const currentPageMeta = () => state.pageIndex > 0 ? (slidePages()[state.pageIndex - 1] || { start:0, pageSize: layoutSize(defaultLayout()), layout: defaultLayout(), slots: [] }) : { start:0, pageSize: layoutSize(defaultLayout()), layout: defaultLayout(), slots: [] };
    const totalPages = () => 1 + slidePages().length;
    const $ = (id) => document.getElementById(id);
    const esc = (v) => String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    const filter = () => \`brightness(\${state.filters.brightness}%) contrast(\${state.filters.contrast}%) saturate(\${state.filters.saturate}%) hue-rotate(\${state.filters.hue}deg)\`;
    const imageFromUrl = (url) => new Promise((resolve,reject)=>{ const image = new Image(); image.onload=()=>resolve(image); image.onerror=reject; image.src=url; });
    function syncInputs(){ const activeLayout = pageLayout(state.pageIndex); $("title").value=state.cover.title; $("subtitle").value=state.cover.subtitle; $("hospital").value=state.cover.hospitalName; $("presenter").value=state.cover.presenterName; $("layout").value=activeLayout.mode; $("showTitle").checked=state.coverVisibility.title; $("showSubtitle").checked=state.coverVisibility.subtitle; $("showHospital").checked=state.coverVisibility.hospitalName; $("showPresenter").checked=state.coverVisibility.presenterName; $("showDate").checked=state.coverVisibility.date; $("showLogo").checked=state.coverVisibility.logo; for (const key of ["brightness","contrast","saturate","hue"]) $(key).value=state.filters[key]; }
    function render(){ state.pageIndex=Math.min(Math.max(state.pageIndex,0),totalPages()-1); if(state.pageIndex===0) renderCover(); else renderSlide(); $("status").textContent=state.pageIndex===0?\`Cover / \${totalPages()}\`:\`\${state.pageIndex+1} / \${totalPages()}\`; $("bg").textContent=state.backgroundEnabled?"배경 채우기 켜짐 Enter":"배경 채우기 꺼짐 Enter"; }
    function renderCover(){ const meta=[state.coverVisibility.hospitalName?state.cover.hospitalName:"",state.coverVisibility.presenterName?state.cover.presenterName:"",state.coverVisibility.date?state.cover.date:""].filter(Boolean); $("stage").className="stage cover"; $("stage").innerHTML=\`<div class="cover-card">\${state.coverVisibility.logo&&state.cover.logoUrl?\`<img class="cover-logo" src="\${state.cover.logoUrl}" alt="logo">\`:""}\${state.coverVisibility.title?\`<h2 class="cover-title">\${esc(state.cover.title)}</h2>\`:""}\${state.coverVisibility.subtitle?\`<p class="cover-subtitle">\${esc(state.cover.subtitle)}</p>\`:""}\${meta.length?\`<p class="meta">\${meta.map(esc).join(" · ")}</p>\`:""}</div>\`; }
    function getImage(id){ return state.images.find((image)=>image.id===id); }
    function slotTransform(i){ return {scale:100,x:0,y:0,rotate:0,cropLeft:0,cropRight:0,cropTop:0,cropBottom:0,...(state.slotTransforms?.[i]||{})}; }
    function crop(i){ const t=slotTransform(i), c=state.crop||{left:0,right:0,top:0,bottom:0}; return \`inset(\${(c.top||0)+t.cropTop}% \${(c.right||0)+t.cropRight}% \${(c.bottom||0)+t.cropBottom}% \${(c.left||0)+t.cropLeft}%)\`; }
    function photoTransform(i){ const t=slotTransform(i); return \`translate(\${t.x}%, \${t.y}%) scale(\${(state.zoom||1)*(t.scale/100)}) rotate(\${t.rotate}deg)\`; }
    function card(img, slotIndex){ if(!img) return \`<figure class="card empty"></figure>\`; return \`<figure class="card \${state.backgroundEnabled?"bg-on":""} \${state.fitMode==="fill"?"fill":""}"><img class="blur" src="\${img.url}" alt=""><img class="photo" src="\${img.url}" alt="\${esc(img.name)}" style="clip-path:\${crop(slotIndex)};filter:\${filter()};transform:\${photoTransform(slotIndex)}"><figcaption class="label">\${esc(img.name)}</figcaption></figure>\`; }
    function renderSlide(){ const meta=currentPageMeta(); const layout=meta.layout; const cls=layout.mode==="custom"?"custom":layout.mode; const caption=(meta.caption||"").trim(); const emptySlide = meta.slots.length > 0 && meta.slots.every((id)=>!id); $("stage").className="stage"; $("stage").innerHTML=\`<div class="grid \${cls}" style="--grid-cols:\${layout.cols||2};--grid-rows:\${layout.rows||1}">\${meta.slots.map((id,offset)=>card(getImage(id),meta.start+offset)).join("")}</div>\${emptySlide && caption ? \`<div class="empty-slide-caption">\${esc(caption)}</div>\` : ""}\`; }
    async function downloadImages(){ if(!state.images.length){ alert("먼저 사진을 넣어주세요."); return; } const ordered = (state.slideSlots?.length?state.slideSlots:state.images.map((image)=>image.id)).map((id,slotIndex)=>({ item:getImage(id), slotIndex })).filter(({item})=>Boolean(item)); for(const [index,{item,slotIndex}] of ordered.entries()){ const image = await imageFromUrl(item.url); const t = slotTransform(slotIndex); const c = state.crop||{left:0,right:0,top:0,bottom:0}; const cropLeftPx = Math.round(image.naturalWidth * (((c.left||0)+t.cropLeft) / 100)); const cropRightPx = Math.round(image.naturalWidth * (((c.right||0)+t.cropRight) / 100)); const cropTopPx = Math.round(image.naturalHeight * (((c.top||0)+t.cropTop) / 100)); const cropBottomPx = Math.round(image.naturalHeight * (((c.bottom||0)+t.cropBottom) / 100)); const sourceWidth = Math.max(1, image.naturalWidth - cropLeftPx - cropRightPx); const sourceHeight = Math.max(1, image.naturalHeight - cropTopPx - cropBottomPx); const canvas = document.createElement("canvas"); canvas.width = sourceWidth; canvas.height = sourceHeight; const ctx = canvas.getContext("2d"); ctx.filter = filter(); ctx.drawImage(image,cropLeftPx,cropTopPx,sourceWidth,sourceHeight,0,0,sourceWidth,sourceHeight); await new Promise((resolve)=>{ canvas.toBlob((blob)=>{ if(!blob){ resolve(); return; } const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = \`\${String(index+1).padStart(3,"0")}-\${item.name.replace(/\\.[^.]+$/,"")}.png\`; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); setTimeout(resolve,120); }, "image/png"); }); } }
    function isZoomInKey(e){ return e.key==="+" || e.key==="=" || e.code==="NumpadAdd"; }
    function isZoomOutKey(e){ return e.key==="-" || e.key==="_" || e.code==="NumpadSubtract"; }
    function go(n){ state.pageIndex=n; render(); }
    function updateZoom(delta){ state.zoom=Math.min(Math.max(Number((state.zoom+delta).toFixed(2)),.5),2.5); render(); }
    function resetZoom(){ state.zoom=1; render(); }
    function present(){ document.body.classList.toggle("presenting"); if(document.body.classList.contains("presenting")) $("stage").requestFullscreen?.().catch(()=>{}); else document.exitFullscreen?.().catch(()=>{}); }
    function showHelp(){ if(!$("shortcutDialog").open) $("shortcutDialog").showModal(); }
    function hideHelp(){ if($("shortcutDialog").open) $("shortcutDialog").close(); }
    function backdropClose(e){ if(e.target!==$("shortcutDialog")) return; const r=$("shortcutDialog").getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) hideHelp(); }
    function onWheelZoom(e){ if(!(e.target instanceof Element) || !e.target.closest("#stage")) return; e.preventDefault(); if(e.deltaY<0) updateZoom(.1); else if(e.deltaY>0) updateZoom(-.1); }
    $("prev").onclick=()=>go(state.pageIndex-1); $("next").onclick=()=>go(state.pageIndex+1); $("fit").onclick=()=>{state.fitMode="fit";render()}; $("fill").onclick=()=>{state.fitMode="fill";render()}; $("bg").onclick=()=>{state.backgroundEnabled=!state.backgroundEnabled;render()}; $("present").onclick=present;
    $("help").onclick=showHelp; $("closeHelp").onclick=hideHelp; $("downloadImages").onclick=downloadImages; $("openPages").onclick=()=>window.open("https://github.com/notoow/medical-image-presenter","_blank","noopener,noreferrer");
    $("shortcutDialog").onclick=backdropClose;
    document.addEventListener("wheel", onWheelZoom, { passive:false });
    for (const id of ["title","subtitle","hospital","presenter"]) $(id).oninput=()=>{ const map={title:"title",subtitle:"subtitle",hospital:"hospitalName",presenter:"presenterName"}; state.cover[map[id]]=$(id).value; render(); };
    for (const [id,key] of [["showTitle","title"],["showSubtitle","subtitle"],["showHospital","hospitalName"],["showPresenter","presenterName"],["showDate","date"],["showLogo","logo"]]) $(id).onchange=()=>{state.coverVisibility[key]=$(id).checked;render()};
    $("layout").onchange=()=>{ const mode=$("layout").value; if(state.pageIndex>0){ ensureLayouts(); state.slidePageLayouts[state.pageIndex-1]=normalizeLayout({ mode, rows: mode==="custom" ? (pageLayout().rows||1) : undefined, cols: mode==="custom" ? (pageLayout().cols||1) : undefined }); } else { const next=normalizeLayout({ mode, rows: state.gridRows, cols: state.gridCols }); state.layoutMode=next.mode; state.gridRows=next.rows; state.gridCols=next.cols; } render() }; for (const key of ["brightness","contrast","saturate","hue"]) $(key).oninput=()=>{state.filters[key]=Number($(key).value);render()};
    document.onkeydown=(e)=>{ if(["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return; if(e.key==="?"||(e.shiftKey&&e.key==="/")){e.preventDefault();showHelp();return} if(e.key==="Escape"){ if($("shortcutDialog").open){hideHelp();return} if(document.body.classList.contains("presenting")){document.body.classList.remove("presenting");document.exitFullscreen?.().catch(()=>{})} } if(e.key==="F5"){e.preventDefault(); if(!e.shiftKey)go(0); present()} if(e.key==="ArrowLeft"||e.key==="ArrowUp"||e.key==="PageUp"||e.key.toLowerCase()==="p")go(state.pageIndex-1); if(e.key==="ArrowRight"||e.key==="ArrowDown"||e.key==="PageDown"||e.key===" "||e.key.toLowerCase()==="n")go(state.pageIndex+1); if(e.key==="Home")go(0); if(e.key==="End")go(totalPages()-1); if(e.key==="Enter"){state.backgroundEnabled=!state.backgroundEnabled;render()} if(e.key.toLowerCase()==="f"){state.fitMode=e.shiftKey?"fill":"fit";render()} if(isZoomInKey(e)) {e.preventDefault(); updateZoom(.1)} if(isZoomOutKey(e)) {e.preventDefault(); updateZoom(-.1)} if(e.key==="0"){resetZoom()} if(e.key.toLowerCase()==="c")go(0); };
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
    warmPreviewCache(state.images);
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
  warmPreviewCache(state.images);
}

initializeDefaultLogo();

