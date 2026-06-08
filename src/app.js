const DEFAULT_LOGO_URL = "./logos/haist-urology-logo.jpg";
const LEGACY_STORAGE_KEY = "medical-image-presenter:v2";
const SETTINGS_STORAGE_KEY = "medical-image-presenter:settings:v3";
const ASSETS_STORAGE_KEY = "medical-image-presenter:assets:v3";
const DEFAULT_LOGO_NAME = "하이스트비뇨의학과로고.jpg";
const SLIDE_EXPORT_SIZES = {
  "1920x1080": { width: 1920, height: 1080, label: "Full HD" },
  "2560x1440": { width: 2560, height: 1440, label: "QHD" },
  "3840x2160": { width: 3840, height: 2160, label: "4K" },
};
const DEFAULT_SLIDE_EXPORT_SIZE = "1920x1080";
const SLIDE_LAYER_COUNT = 3;
const DEFAULT_SLIDE_LAYER = 2;
const LAYER_SLOT_BASE = 1_000_000;
const LAYER_SLOT_PAGE_FACTOR = 10_000;
const LAYER_SLOT_LAYER_FACTOR = 100;

const state = {
  images: [],
  slideSlots: [],
  slideCaptions: [],
  slidePageLayouts: [],
  slideLayerPages: {},
  slotTransforms: {},
  selectedSlotIndex: null,
  logoUrl: "",
  backgroundMusicUrl: "",
  backgroundMusicName: "",
  pageIndex: 0,
  slideLayerIndex: DEFAULT_SLIDE_LAYER,
  layoutMode: "pair",
  gridRows: 1,
  gridCols: 2,
  sortMode: "name-asc",
  photoSearchQuery: "",
  photoFilterMode: "all",
  slideExportSize: DEFAULT_SLIDE_EXPORT_SIZE,
  fitMode: "fit",
  backgroundEnabled: true,
  autoplaySeconds: 3,
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
let activeThumbnailSlotNode = null;
let activePhotoListCard = null;
let thumbnailPageButtonCache = new Map();
let activeReorderTarget = null;
let activeSlideReorderTarget = null;
let activeSlideReorderSource = null;
let activeSlideHandleDrag = null;
let activeThumbnailRailPan = null;
let thumbnailRailSuppressClickUntil = 0;
let photoSearchActivationQuery = "";
let photoSearchActivationIndex = -1;
let activeStageSlotDropTarget = null;
let activeGuideDrag = null;
let activeSlotPan = null;
let activeSlideContextPage = null;
let activeSlotContextIndex = null;
let toastTimer = null;
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
let imagePlacementCacheKey = "";
let imagePlacementCache = new Map();
let imagesVersion = 0;
let slideSlotsVersion = 0;
let layoutVersion = 0;
let guidesVersion = 0;
let lastPersistedSettingsJson = "";
let lastPersistedAssetsJson = "";
let isApplyingHistory = false;
let editHistoryPast = [];
let editHistoryFuture = [];
let slideClipboard = null;
let slotTransformClipboard = null;
let presentationPlaybackMode = "manual";
let autoplayTimer = null;
const EDIT_HISTORY_LIMIT = 40;
const previewCache = new Map();
const previewJobs = new Map();
const imageNameCollator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});
const MOBILE_PANEL_MEDIA_QUERY = "(max-width: 680px)";

const els = {
  stage: document.querySelector("#stage"),
  pageStatus: document.querySelector("#pageStatus"),
  pageJumpInput: document.querySelector("#pageJumpInput"),
  pageJumpButton: document.querySelector("#pageJumpButton"),
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
  undoButton: document.querySelector("#undoButton"),
  redoButton: document.querySelector("#redoButton"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  slideQuickActions: document.querySelector("#slideQuickActions"),
  moveSlidePrevButton: document.querySelector("#moveSlidePrevButton"),
  moveSlideNextButton: document.querySelector("#moveSlideNextButton"),
  copySlideButton: document.querySelector("#copySlideButton"),
  pasteSlideButton: document.querySelector("#pasteSlideButton"),
  clearSlideButton: document.querySelector("#clearSlideButton"),
  insertSlideBeforeButton: document.querySelector("#insertSlideBeforeButton"),
  insertSlideAfterButton: document.querySelector("#insertSlideAfterButton"),
  duplicateSlideButton: document.querySelector("#duplicateSlideButton"),
  deleteSlideButton: document.querySelector("#deleteSlideButton"),
  fitButton: document.querySelector("#fitButton"),
  fillButton: document.querySelector("#fillButton"),
  backgroundButton: document.querySelector("#backgroundButton"),
  presentButton: document.querySelector("#presentButton"),
  autoplayButton: document.querySelector("#autoplayButton"),
  autoplaySeconds: document.querySelector("#autoplaySeconds"),
  autoplaySecondsValue: document.querySelector("#autoplaySecondsValue"),
  shortcutHelpButton: document.querySelector("#shortcutHelpButton"),
  closeShortcutHelpButton: document.querySelector("#closeShortcutHelpButton"),
  shortcutDialog: document.querySelector("#shortcutDialog"),
  slideContextMenu: document.querySelector("#slideContextMenu"),
  slideContextLabel: document.querySelector("#slideContextLabel"),
  slotContextMenu: document.querySelector("#slotContextMenu"),
  slotContextLabel: document.querySelector("#slotContextLabel"),
  toast: document.querySelector("#toast"),
  exportButton: document.querySelector("#exportButton"),
  openPagesButton: document.querySelector("#openPagesButton"),
  downloadImagesButton: document.querySelector("#downloadImagesButton"),
  slideExportSize: document.querySelector("#slideExportSize"),
  downloadCurrentSlideButton: document.querySelector("#downloadCurrentSlideButton"),
  downloadAllSlidesButton: document.querySelector("#downloadAllSlidesButton"),
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
  slotFitButton: document.querySelector("#slotFitButton"),
  slotFillButton: document.querySelector("#slotFillButton"),
  flipSlotXButton: document.querySelector("#flipSlotXButton"),
  flipSlotYButton: document.querySelector("#flipSlotYButton"),
  slotCropLeft: document.querySelector("#slotCropLeft"),
  slotCropRight: document.querySelector("#slotCropRight"),
  slotCropTop: document.querySelector("#slotCropTop"),
  slotCropBottom: document.querySelector("#slotCropBottom"),
  resetSlotTransformButton: document.querySelector("#resetSlotTransformButton"),
  copySlotTransformButton: document.querySelector("#copySlotTransformButton"),
  pasteSlotTransformButton: document.querySelector("#pasteSlotTransformButton"),
  applySlotTransformToPageButton: document.querySelector("#applySlotTransformToPageButton"),
  applySlotTransformToAllButton: document.querySelector("#applySlotTransformToAllButton"),
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
  photoFilterSummary: document.querySelector("#photoFilterSummary"),
  photoFilterResetButton: document.querySelector("#photoFilterResetButton"),
  photoSearchInput: document.querySelector("#photoSearchInput"),
  photoSearchClearButton: document.querySelector("#photoSearchClearButton"),
  photoSearchStatus: document.querySelector("#photoSearchStatus"),
  photoFilterAllButton: document.querySelector("#photoFilterAllButton"),
  photoFilterCurrentButton: document.querySelector("#photoFilterCurrentButton"),
  photoFilterPlacedButton: document.querySelector("#photoFilterPlacedButton"),
  photoFilterUnplacedButton: document.querySelector("#photoFilterUnplacedButton"),
  backgroundMusicInput: document.querySelector("#backgroundMusicInput"),
  backgroundMusicName: document.querySelector("#backgroundMusicName"),
  clearBackgroundMusicButton: document.querySelector("#clearBackgroundMusicButton"),
  backgroundMusicAudio: document.querySelector("#backgroundMusicAudio"),
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
  fitMode: "inherit",
  flipX: false,
  flipY: false,
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  cropBottom: 0,
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function cloneSlotTransforms(source = state.slotTransforms) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, { ...value }]),
  );
}

function cloneSlideLayerPages(source = state.slideLayerPages) {
  return Object.fromEntries(
    Object.entries(source ?? {}).map(([key, value]) => [
      key,
      {
        caption: value?.caption ?? "",
        layout: createLayoutConfig(value?.layout?.mode, value?.layout?.rows, value?.layout?.cols),
        slots: Array.isArray(value?.slots) ? [...value.slots] : [],
      },
    ]),
  );
}

function captureEditHistorySnapshot() {
  return {
    images: state.images.map((image) => ({ ...image })),
    slideSlots: [...state.slideSlots],
    slideCaptions: [...state.slideCaptions],
    slidePageLayouts: state.slidePageLayouts.map((layout) => createLayoutConfig(layout.mode, layout.rows, layout.cols)),
    slideLayerPages: cloneSlideLayerPages(),
    slotTransforms: cloneSlotTransforms(),
    selectedSlotIndex: state.selectedSlotIndex,
    logoUrl: state.logoUrl,
    pageIndex: state.pageIndex,
    slideLayerIndex: state.slideLayerIndex,
    layoutMode: state.layoutMode,
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    sortMode: state.sortMode,
    photoSearchQuery: state.photoSearchQuery,
    photoFilterMode: state.photoFilterMode,
    fitMode: state.fitMode,
    backgroundEnabled: state.backgroundEnabled,
    autoplaySeconds: state.autoplaySeconds,
    zoom: state.zoom,
    guidesEnabled: state.guidesEnabled,
    guides: state.guides.map((guide) => ({ ...guide })),
    crop: { ...state.crop },
    backgroundFilters: { ...state.backgroundFilters },
    coverVisibility: { ...state.coverVisibility },
    filters: { ...state.filters },
    cover: {
      title: els.coverTitle?.value ?? "",
      subtitle: els.coverSubtitle?.value ?? "",
      hospitalName: els.hospitalName?.value ?? "",
      presenterName: els.presenterName?.value ?? "",
    },
  };
}

function syncHistoryButtons() {
  if (els.undoButton) els.undoButton.disabled = editHistoryPast.length === 0;
  if (els.redoButton) els.redoButton.disabled = editHistoryFuture.length === 0;
}

function restoreEditHistorySnapshot(snapshot) {
  if (!snapshot) return;

  isApplyingHistory = true;
  try {
    state.images = snapshot.images.map((image) => ({ ...image }));
    state.slideSlots = [...snapshot.slideSlots];
    state.slideCaptions = [...snapshot.slideCaptions];
    state.slidePageLayouts = snapshot.slidePageLayouts.map((layout) =>
      createLayoutConfig(layout.mode, layout.rows, layout.cols),
    );
    state.slideLayerPages = cloneSlideLayerPages(snapshot.slideLayerPages);
    state.slotTransforms = cloneSlotTransforms(snapshot.slotTransforms);
    state.selectedSlotIndex = snapshot.selectedSlotIndex;
    state.logoUrl = snapshot.logoUrl;
    state.pageIndex = snapshot.pageIndex;
    state.slideLayerIndex = snapshot.slideLayerIndex ?? DEFAULT_SLIDE_LAYER;
    state.layoutMode = snapshot.layoutMode;
    state.gridRows = snapshot.gridRows;
    state.gridCols = snapshot.gridCols;
    state.sortMode = snapshot.sortMode;
    state.fitMode = snapshot.fitMode;
    state.backgroundEnabled = snapshot.backgroundEnabled;
    state.autoplaySeconds = normalizeAutoplaySeconds(snapshot.autoplaySeconds ?? state.autoplaySeconds);
    state.zoom = snapshot.zoom;
    state.guidesEnabled = snapshot.guidesEnabled;
    state.guides = snapshot.guides.map((guide) => ({ ...guide }));
    state.crop = { ...snapshot.crop };
    state.backgroundFilters = { ...snapshot.backgroundFilters };
    state.coverVisibility = { ...snapshot.coverVisibility };
    state.filters = { ...snapshot.filters };

    if (els.coverTitle) els.coverTitle.value = snapshot.cover.title;
    if (els.coverSubtitle) els.coverSubtitle.value = snapshot.cover.subtitle;
    if (els.hospitalName) els.hospitalName.value = snapshot.cover.hospitalName;
    if (els.presenterName) els.presenterName.value = snapshot.cover.presenterName;
    if (els.sortMode) els.sortMode.value = snapshot.sortMode;
    if (els.showGuides) els.showGuides.checked = snapshot.guidesEnabled;
    if (els.autoplaySeconds) els.autoplaySeconds.value = String(state.autoplaySeconds);
    if (els.autoplaySecondsValue) els.autoplaySecondsValue.textContent = `${state.autoplaySeconds.toFixed(1)}초`;
    if (els.brightness) els.brightness.value = String(snapshot.filters.brightness);
    if (els.contrast) els.contrast.value = String(snapshot.filters.contrast);
    if (els.saturate) els.saturate.value = String(snapshot.filters.saturate);
    if (els.hue) els.hue.value = String(snapshot.filters.hue);
    if (els.bgBrightness) els.bgBrightness.value = String(snapshot.backgroundFilters.brightness);
    if (els.bgSaturate) els.bgSaturate.value = String(snapshot.backgroundFilters.saturate);
    if (els.bgBlur) els.bgBlur.value = String(snapshot.backgroundFilters.blur);
    if (els.bgScale) els.bgScale.value = String(snapshot.backgroundFilters.scale);
    if (els.bgY) els.bgY.value = String(snapshot.backgroundFilters.y);
    if (els.cropLeft) els.cropLeft.value = String(snapshot.crop.left);
    if (els.cropRight) els.cropRight.value = String(snapshot.crop.right);
    if (els.cropTop) els.cropTop.value = String(snapshot.crop.top);
    if (els.cropBottom) els.cropBottom.value = String(snapshot.crop.bottom);
    if (els.showCoverTitle) els.showCoverTitle.checked = snapshot.coverVisibility.title;
    if (els.showCoverSubtitle) els.showCoverSubtitle.checked = snapshot.coverVisibility.subtitle;
    if (els.showHospitalName) els.showHospitalName.checked = snapshot.coverVisibility.hospitalName;
    if (els.showPresenterName) els.showPresenterName.checked = snapshot.coverVisibility.presenterName;
    if (els.showCoverDate) els.showCoverDate.checked = snapshot.coverVisibility.date;
    if (els.showCoverLogo) els.showCoverLogo.checked = snapshot.coverVisibility.logo;

    markImagesDirty();
    markSlideSlotsDirty();
    markLayoutDirty();
    markGuidesDirty();
    normalizeSlidePageLayouts();
    normalizeSlideCaptions();
    render();
    queuePersistAssets();
  } finally {
    isApplyingHistory = false;
    syncHistoryButtons();
  }
}

function beginEditHistoryAction() {
  if (isApplyingHistory || isRestoring) return;
  editHistoryPast.push(captureEditHistorySnapshot());
  if (editHistoryPast.length > EDIT_HISTORY_LIMIT) {
    editHistoryPast = editHistoryPast.slice(-EDIT_HISTORY_LIMIT);
  }
  editHistoryFuture = [];
  syncHistoryButtons();
}

function undoEditHistory() {
  const snapshot = editHistoryPast.pop();
  if (!snapshot) return;
  editHistoryFuture.push(captureEditHistorySnapshot());
  restoreEditHistorySnapshot(snapshot);
  showToast("방금 작업을 되돌렸습니다.");
}

function redoEditHistory() {
  const snapshot = editHistoryFuture.pop();
  if (!snapshot) return;
  editHistoryPast.push(captureEditHistorySnapshot());
  restoreEditHistorySnapshot(snapshot);
  showToast("되돌린 작업을 다시 적용했습니다.");
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

function getSlideLayerKey(page, layer) {
  return `${Number(page)}:${Number(layer)}`;
}

function parseSlideLayerKey(key) {
  const [pageText, layerText] = String(key).split(":");
  const page = Number(pageText);
  const layer = Number(layerText);
  if (!Number.isInteger(page) || page <= 0) return null;
  if (!Number.isInteger(layer) || layer < 1 || layer > SLIDE_LAYER_COUNT || layer === DEFAULT_SLIDE_LAYER) return null;
  return { page, layer };
}

function getLayerSlotIndex(page, layer, offset) {
  return LAYER_SLOT_BASE + Number(page) * LAYER_SLOT_PAGE_FACTOR + Number(layer) * LAYER_SLOT_LAYER_FACTOR + Number(offset);
}

function parseLayerSlotIndex(slotIndex) {
  const value = Number(slotIndex);
  if (!Number.isInteger(value) || value < LAYER_SLOT_BASE) return null;
  const raw = value - LAYER_SLOT_BASE;
  const page = Math.floor(raw / LAYER_SLOT_PAGE_FACTOR);
  const layer = Math.floor((raw % LAYER_SLOT_PAGE_FACTOR) / LAYER_SLOT_LAYER_FACTOR);
  const offset = raw % LAYER_SLOT_LAYER_FACTOR;
  if (page <= 0 || layer < 1 || layer > SLIDE_LAYER_COUNT || layer === DEFAULT_SLIDE_LAYER || offset < 0) return null;
  return { page, layer, offset };
}

function normalizeSlotIndex(value) {
  const slotIndex = Number(value);
  return Number.isFinite(slotIndex) && slotIndex >= 0 ? slotIndex : null;
}

function ensureSlideLayerPagesStore() {
  if (!state.slideLayerPages || typeof state.slideLayerPages !== "object" || Array.isArray(state.slideLayerPages)) {
    state.slideLayerPages = {};
  }
  return state.slideLayerPages;
}

function normalizeLayerSlideRecord(record, fallbackLayout = getDefaultLayoutConfig()) {
  const layout = createLayoutConfig(
    record?.layout?.mode ?? fallbackLayout.mode,
    record?.layout?.rows ?? fallbackLayout.rows,
    record?.layout?.cols ?? fallbackLayout.cols,
  );
  const pageSize = getPageSizeForLayout(layout);
  const sourceSlots = Array.isArray(record?.slots) ? record.slots : [];
  return {
    layout,
    pageSize,
    slots: Array.from({ length: pageSize }, (_, offset) => sourceSlots[offset] ?? null),
    caption: typeof record?.caption === "string" ? record.caption : "",
  };
}

function getLayerSlidePage(page, layer, { create = false } = {}) {
  const pageNumber = Number(page);
  const layerNumber = Number(layer);
  if (!Number.isInteger(pageNumber) || pageNumber <= 0) return null;
  if (!Number.isInteger(layerNumber) || layerNumber < 1 || layerNumber > SLIDE_LAYER_COUNT || layerNumber === DEFAULT_SLIDE_LAYER) {
    return null;
  }

  const store = ensureSlideLayerPagesStore();
  const key = getSlideLayerKey(pageNumber, layerNumber);
  const fallbackLayout = getPageLayout(pageNumber);
  let record = store[key];

  if (!record && !create) {
    const empty = normalizeLayerSlideRecord(null, fallbackLayout);
    return {
      pageIndex: pageNumber,
      layer: layerNumber,
      ...empty,
    };
  }

  if (!record) {
    record = normalizeLayerSlideRecord(null, fallbackLayout);
    store[key] = record;
  } else {
    record = normalizeLayerSlideRecord(record, fallbackLayout);
    store[key] = record;
  }

  return {
    pageIndex: pageNumber,
    layer: layerNumber,
    ...record,
  };
}

function getCurrentSlideLayerPage({ create = false } = {}) {
  const layer = getCurrentSlideLayerStatus()?.currentLayer ?? DEFAULT_SLIDE_LAYER;
  if (layer === DEFAULT_SLIDE_LAYER || state.pageIndex <= 0) return null;
  return getLayerSlidePage(state.pageIndex, layer, { create });
}

function getSlotImageId(slotIndex) {
  const normalizedSlotIndex = normalizeSlotIndex(slotIndex);
  if (normalizedSlotIndex === null) return null;
  const layerSlot = parseLayerSlotIndex(normalizedSlotIndex);
  if (layerSlot) {
    const layerPage = getLayerSlidePage(layerSlot.page, layerSlot.layer);
    return layerPage?.slots?.[layerSlot.offset] ?? null;
  }
  return state.slideSlots[normalizedSlotIndex] ?? null;
}

function writeSlotImageId(slotIndex, imageId) {
  const normalizedSlotIndex = normalizeSlotIndex(slotIndex);
  if (normalizedSlotIndex === null) return false;
  const layerSlot = parseLayerSlotIndex(normalizedSlotIndex);
  if (layerSlot) {
    const layerPage = getLayerSlidePage(layerSlot.page, layerSlot.layer, { create: true });
    if (!layerPage || layerSlot.offset >= layerPage.pageSize) return false;
    layerPage.slots[layerSlot.offset] = imageId ?? null;
    state.slideLayerPages[getSlideLayerKey(layerSlot.page, layerSlot.layer)] = {
      layout: createLayoutConfig(layerPage.layout.mode, layerPage.layout.rows, layerPage.layout.cols),
      slots: [...layerPage.slots],
      caption: layerPage.caption,
    };
    return true;
  }

  normalizeSlidePageLayouts(normalizedSlotIndex + 1);
  while (state.slideSlots.length <= normalizedSlotIndex) {
    state.slideSlots.push(null);
  }
  state.slideSlots[normalizedSlotIndex] = imageId ?? null;
  return true;
}

function getSlotDisplayLabel(slotIndex) {
  const layerSlot = parseLayerSlotIndex(slotIndex);
  if (layerSlot) {
    return `${layerSlot.page}페이지 ${layerSlot.layer}번 레이어 ${layerSlot.offset + 1}칸`;
  }
  return `${Number(slotIndex) + 1}번 슬롯`;
}

function remapSlideLayerPages(mapper) {
  const nextLayerPages = {};
  Object.entries(ensureSlideLayerPagesStore()).forEach(([key, record]) => {
    const parsed = parseSlideLayerKey(key);
    if (!parsed) return;
    const next = mapper(parsed.page, parsed.layer);
    if (!next || !Number.isInteger(next.page) || next.page <= 0) return;
    nextLayerPages[getSlideLayerKey(next.page, parsed.layer)] = {
      caption: record?.caption ?? "",
      layout: createLayoutConfig(record?.layout?.mode, record?.layout?.rows, record?.layout?.cols),
      slots: Array.isArray(record?.slots) ? [...record.slots] : [],
    };
  });

  const nextTransforms = {};
  Object.entries(state.slotTransforms).forEach(([key, transform]) => {
    const slotIndex = Number(key);
    const layerSlot = parseLayerSlotIndex(slotIndex);
    if (!layerSlot) {
      nextTransforms[key] = transform;
      return;
    }
    const next = mapper(layerSlot.page, layerSlot.layer);
    if (!next || !Number.isInteger(next.page) || next.page <= 0) return;
    nextTransforms[getLayerSlotIndex(next.page, layerSlot.layer, layerSlot.offset)] = transform;
  });

  state.slideLayerPages = nextLayerPages;
  state.slotTransforms = nextTransforms;
}

function copySlideLayerPages(sourcePage, targetPage) {
  Object.entries(ensureSlideLayerPagesStore()).forEach(([key, record]) => {
    const parsed = parseSlideLayerKey(key);
    if (!parsed || parsed.page !== sourcePage) return;
    state.slideLayerPages[getSlideLayerKey(targetPage, parsed.layer)] = {
      caption: record?.caption ?? "",
      layout: createLayoutConfig(record?.layout?.mode, record?.layout?.rows, record?.layout?.cols),
      slots: Array.isArray(record?.slots) ? [...record.slots] : [],
    };
  });

  Object.entries(state.slotTransforms).forEach(([key, transform]) => {
    const layerSlot = parseLayerSlotIndex(Number(key));
    if (!layerSlot || layerSlot.page !== sourcePage) return;
    state.slotTransforms[getLayerSlotIndex(targetPage, layerSlot.layer, layerSlot.offset)] = { ...transform };
  });
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
  const normalizedSlotIndex = normalizeSlotIndex(slotIndex);
  if (normalizedSlotIndex === null) return null;

  const layerSlot = parseLayerSlotIndex(normalizedSlotIndex);
  if (layerSlot) {
    const layerPage = getLayerSlidePage(layerSlot.page, layerSlot.layer);
    if (!layerPage || layerSlot.offset >= layerPage.pageSize) return null;
    return {
      page: layerSlot.page,
      layer: layerSlot.layer,
      pageStart: null,
      pageSize: layerPage.pageSize,
      layout: layerPage.layout,
      offset: layerSlot.offset,
    };
  }

  for (const page of getSlidePages()) {
    if (normalizedSlotIndex >= page.start && normalizedSlotIndex < page.start + page.pageSize) {
      return {
        page: page.pageIndex,
        layer: DEFAULT_SLIDE_LAYER,
        pageStart: page.start,
        pageSize: page.pageSize,
        layout: page.layout,
        offset: normalizedSlotIndex - page.start,
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
  const currentLayer = getCurrentSlideLayerStatus()?.currentLayer ?? DEFAULT_SLIDE_LAYER;
  const nextKey = `${slideSlotsVersion}:${layoutVersion}:${state.pageIndex}:${currentLayer}:${state.slideSlots.length}:${pageSize}`;
  if (currentPageSlotMetaCacheKey === nextKey && currentPageSlotMetaCache) {
    return currentPageSlotMetaCache;
  }

  if (currentLayer !== DEFAULT_SLIDE_LAYER) {
    const layerPage = getLayerSlidePage(state.pageIndex, currentLayer);
    currentPageSlotMetaCache = {
      pageSize: layerPage?.pageSize ?? pageSize,
      start: null,
      layout: layerPage?.layout ?? page,
      slotIndices: Array.from({ length: layerPage?.pageSize ?? pageSize }, (_, offset) =>
        getLayerSlotIndex(state.pageIndex, currentLayer, offset),
      ),
      slots: layerPage?.slots ?? Array(pageSize).fill(null),
      caption: layerPage?.caption ?? "",
      layer: currentLayer,
    };
    currentPageSlotMetaCacheKey = nextKey;
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
    caption: pageMeta?.caption ?? "",
    layer: DEFAULT_SLIDE_LAYER,
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

function hasSlidePageContent(page) {
  return Boolean(page?.slots?.some(Boolean) || page?.caption?.trim());
}

function trimTrailingEmptySlidePages() {
  const pages = getSlidePages();

  while (pages.length > 0) {
    const lastPage = pages[pages.length - 1];
    if (hasSlidePageContent(lastPage)) break;
    pages.pop();
  }

  state.slidePageLayouts = pages.map((page) => createLayoutConfig(page.layout.mode, page.layout.rows, page.layout.cols));
  state.slideCaptions = pages.map((page) => page.caption);
  const nextSlotLength = pages.length
    ? pages[pages.length - 1].start + pages[pages.length - 1].pageSize
    : 0;
  state.slideSlots = state.slideSlots.slice(0, nextSlotLength);
  normalizeSlideCaptions(pages.length);
  rebuildSlotTransformsFromPages(pages);
  markSlideSlotsDirty();
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
  Object.values(ensureSlideLayerPagesStore()).forEach((record) => {
    if (!record || !Array.isArray(record.slots)) return;
    record.slots.forEach((imageId) => {
      if (!imageId) return;
      usedCountsCache.set(imageId, (usedCountsCache.get(imageId) ?? 0) + 1);
    });
  });
  usedCountsCacheVersion = slideSlotsVersion;
  return usedCountsCache;
}

function getImagePlacements() {
  const nextKey = `${slideSlotsVersion}:${layoutVersion}:${state.slideSlots.length}:${state.slidePageLayouts.length}`;
  if (imagePlacementCacheKey === nextKey) return imagePlacementCache;

  const placements = new Map();
  getSlidePages().forEach((page) => {
    page.slots.forEach((imageId, offset) => {
      if (!imageId) return;
      const list = placements.get(imageId) ?? [];
      list.push({
        page: page.pageIndex,
        layer: DEFAULT_SLIDE_LAYER,
        slot: offset + 1,
      });
      placements.set(imageId, list);
    });
  });
  Object.entries(ensureSlideLayerPagesStore()).forEach(([key, record]) => {
    const parsed = parseSlideLayerKey(key);
    if (!parsed || !record || !Array.isArray(record.slots)) return;
    record.slots.forEach((imageId, offset) => {
      if (!imageId) return;
      const list = placements.get(imageId) ?? [];
      list.push({
        page: parsed.page,
        layer: parsed.layer,
        slot: offset + 1,
      });
      placements.set(imageId, list);
    });
  });

  imagePlacementCacheKey = nextKey;
  imagePlacementCache = placements;
  return imagePlacementCache;
}

function getDefaultSlotTransform() {
  return { ...DEFAULT_SLOT_TRANSFORM };
}

function getSlotTransform(slotIndex) {
  const normalizedSlotIndex = normalizeSlotIndex(slotIndex);
  if (normalizedSlotIndex === null) return getDefaultSlotTransform();

  const existing = state.slotTransforms[normalizedSlotIndex];
  if (!existing) {
    const next = getDefaultSlotTransform();
    state.slotTransforms[normalizedSlotIndex] = next;
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

function getEffectiveSlotFitMode(slotIndex, transform = getSlotTransform(slotIndex)) {
  return transform.fitMode === "fill" ? "fill" : transform.fitMode === "fit" ? "fit" : state.fitMode;
}

function getSlotTransformStyle(slotIndex, transform = getSlotTransform(slotIndex)) {
  const scale = state.zoom * (transform.scale / 100);
  const scaleX = scale * (transform.flipX ? -1 : 1);
  const scaleY = scale * (transform.flipY ? -1 : 1);
  return `translate(${transform.x}%, ${transform.y}%) scale(${scaleX}, ${scaleY}) rotate(${transform.rotate}deg)`;
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
  Object.entries(ensureSlideLayerPagesStore()).forEach(([key, record]) => {
    const parsed = parseSlideLayerKey(key);
    if (!parsed) {
      delete state.slideLayerPages[key];
      changed = true;
      return;
    }
    const normalized = normalizeLayerSlideRecord(record, getPageLayout(parsed.page));
    normalized.slots = normalized.slots.map((slot) => {
      if (slot === null || imageByIdIndex.has(slot)) return slot;
      changed = true;
      return null;
    });
    state.slideLayerPages[key] = {
      layout: normalized.layout,
      slots: normalized.slots,
      caption: normalized.caption,
    };
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

function resetSlideLayerAnchor() {
  state.slideLayerIndex = DEFAULT_SLIDE_LAYER;
}

function ensureSlideLayerAnchor() {
  if (state.pageIndex <= 0) return null;
  const nextLayer = Number(state.slideLayerIndex);
  state.slideLayerIndex = clamp(Number.isFinite(nextLayer) ? nextLayer : DEFAULT_SLIDE_LAYER, 1, SLIDE_LAYER_COUNT);
  return state.slideLayerIndex;
}

function getCurrentSlideLayerStatus() {
  const currentLayer = ensureSlideLayerAnchor();
  if (!currentLayer) return null;

  return {
    currentLayer,
    totalLayers: SLIDE_LAYER_COUNT,
    hasPrevious: currentLayer > 1,
    hasNext: currentLayer < SLIDE_LAYER_COUNT,
  };
}

function getStageIndexBadgeHtml() {
  const status = getCurrentSlideLayerStatus();
  if (!status) return "";

  const text = `${status.currentLayer} / ${status.totalLayers}`;
  const label = `${state.pageIndex}번 슬라이드의 ${status.currentLayer}번 레이어, 기본 레이어 ${DEFAULT_SLIDE_LAYER}번`;
  return `<div class="stage-index-badge" aria-label="${escapeHtml(label)}">${escapeHtml(text)}</div>`;
}

function isDefaultSlideLayer() {
  return (getCurrentSlideLayerStatus()?.currentLayer ?? DEFAULT_SLIDE_LAYER) === DEFAULT_SLIDE_LAYER;
}

function renderBlankLayerSlots(layout) {
  const pageSize = getPageSizeForLayout(layout);
  return Array.from({ length: pageSize }, (_, index) => (
    `<div class="slide-slot-empty layer-slot-empty" aria-label="빈 레이어 슬롯 ${index + 1}">빈칸</div>`
  )).join("");
}

function renderSlideThumbGrid(page) {
  return `
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
  `;
}

function renderSlideThumbLayerGrid(page, layer) {
  const layerPage = getLayerSlidePage(page.pageIndex, layer);
  const layout = layerPage?.layout ?? page.layout;
  const slots = layerPage?.slots ?? Array(getPageSizeForLayout(layout)).fill(null);
  const isEmpty = !slots.some(Boolean);
  return `
    <div
      class="slide-thumb-grid ${layout.mode === "custom" ? "layout-custom" : `layout-${layout.mode}`} ${isEmpty ? "is-layer-empty" : ""}"
      style="--grid-cols:${layout.cols}; --grid-rows:${layout.rows};"
      aria-label="${layer}번 레이어"
    >
      ${slots
        .map((imageId, offset) => {
          const slotIndex = getLayerSlotIndex(page.pageIndex, layer, offset);
          const image = getImageById(imageId);
          return image
            ? `<img src="${getRenderableImageUrl(image)}" data-renderable-image-id="${image.id}" data-slot-thumb-index="${slotIndex}" alt="" loading="lazy" decoding="async" />`
            : `<button class="slide-thumb-empty layer-thumb-empty" type="button" data-slot-thumb-index="${slotIndex}">빈칸</button>`;
        })
        .join("")}
    </div>
  `;
}

function renderSlideThumbLayerStack(page) {
  const currentLayer = getCurrentSlideLayerStatus()?.currentLayer ?? DEFAULT_SLIDE_LAYER;
  return `
    <div class="slide-thumb-layer-stack" style="--active-slide-layer:${currentLayer};">
      ${Array.from({ length: SLIDE_LAYER_COUNT }, (_, index) => {
        const layer = index + 1;
        const isDefaultLayer = layer === DEFAULT_SLIDE_LAYER;
        return `
          <div class="slide-thumb-layer-frame ${layer === currentLayer ? "is-current-layer" : ""} ${isDefaultLayer ? "has-content-layer" : "is-empty-layer"}">
            <span class="slide-thumb-layer-tag">${layer}</span>
            ${isDefaultLayer ? renderSlideThumbGrid(page) : renderSlideThumbLayerGrid(page, layer)}
          </div>
        `;
      }).join("")}
    </div>
  `;
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
  const selectedClass = state.selectedSlotIndex === slotIndex ? "is-selected" : "";

  if (!image) {
    return `
      <figure
        class="image-card empty-slot ${selectedClass}"
        data-slot-index="${slotIndex}"
        tabindex="0"
        title="사진 또는 빈칸을 여기로 드래그하세요"
      >
        <div class="empty-slot-inner">
          <strong>빈칸</strong>
          <span>오른쪽 사진을 끌어다 놓기</span>
        </div>
      </figure>
    `;
  }

  const transform = getSlotTransform(slotIndex);
  const fitMode = getEffectiveSlotFitMode(slotIndex, transform);
  const imageTransform = getSlotTransformStyle(slotIndex, transform);
  const cropStyle = getSlotCropStyle(slotIndex, transform);
  const displayUrl = getRenderableImageUrl(image);

  return `
    <figure class="image-card ${state.backgroundEnabled ? "background-enabled" : ""} ${
      fitMode === "fill" ? "fit-fill" : ""
    } ${selectedClass}" data-slot-index="${slotIndex}" tabindex="0">
      <button
        class="move-slot-button"
        type="button"
        draggable="true"
        data-drag-slot="${slotIndex}"
        title="드래그해서 다른 칸으로 이동, Alt+드래그로 복제"
        aria-label="드래그해서 다른 칸으로 이동, Alt+드래그로 복제"
      >
        이동
      </button>
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
  const { start, slots: pageSlots, layout, slotIndices, caption: slideCaption = "" } = getCurrentPageSlotMeta();
  const trimmedCaption = slideCaption.trim();
  const isEmptySlide = pageSlots.length > 0 && !pageSlots.some(Boolean);
  const layerStatus = getCurrentSlideLayerStatus();
  const isLayerSlide = layerStatus && layerStatus.currentLayer !== DEFAULT_SLIDE_LAYER;
  const layoutClass = layout.mode === "custom" ? "layout-custom" : `layout-${layout.mode}`;

  els.stage.className = `stage layout-${layout.mode} has-stage-index`;

  if (pageSlots.length === 0) {
    visibleSlideCardCache = new Map();
    visibleGuideCache = new Map();
    unregisterRenderableImageNodesInRoot(els.stage);
    els.stage.innerHTML = `
      ${getStageIndexBadgeHtml()}
      <div class="empty-state">
        <div>
          <h2>사진을 선택하면 여기에 슬라이드가 만들어집니다.</h2>
          <p>기본은 2분할 Before / After 비교 레이아웃입니다.</p>
        </div>
      </div>
    `;
    return;
  }

  visibleSlideCardCache = new Map();
  visibleGuideCache = new Map();
  activeStageSlotDropTarget = null;
  unregisterRenderableImageNodesInRoot(els.stage);
  els.stage.innerHTML = `
    ${getStageIndexBadgeHtml()}
    <div
      class="slide-grid ${layoutClass}"
      style="--grid-cols:${layout.cols}; --grid-rows:${layout.rows};"
    >
      ${pageSlots
        .map((imageId, offset) => {
          const slotIndex = slotIndices?.[offset] ?? start + offset;
          return renderImageCard(getImageById(imageId), slotIndex);
        })
        .join("")}
    </div>
    ${
      isLayerSlide && isEmptySlide
        ? `
          <div class="layer-empty-note">
            <strong>${layerStatus.currentLayer}번 레이어</strong>
            <span>빈 슬라이드</span>
          </div>
        `
        : ""
    }
    ${
      !isEmptySlide
        ? `
          <div class="slide-stage-caption-wrap ${trimmedCaption ? "has-value" : ""}">
            ${
              document.body.classList.contains("presenting")
                ? (trimmedCaption
                    ? `<div class="slide-stage-caption-present">${escapeHtml(trimmedCaption)}</div>`
                    : "")
                : `<input
                    class="slide-stage-caption-input"
                    type="text"
                    data-stage-slide-caption="${state.pageIndex}"
                    placeholder="슬라이드 소제목을 입력하세요"
                    value="${escapeHtml(slideCaption)}"
                  />`
            }
          </div>
        `
        : ""
    }
    ${
      isEmptySlide
        ? `
          <div class="empty-slide-caption-wrap">
            ${
              document.body.classList.contains("presenting")
                ? `<div class="empty-slide-caption-present">${escapeHtml(trimmedCaption)}</div>`
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

  const slideGrid = els.stage.querySelector(".slide-grid");
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

  const guideLayer = els.stage.querySelector(".guide-layer");
  guideLayer?.querySelectorAll("[data-guide-index]").forEach((guideEl) => {
    const index = Number(guideEl.getAttribute("data-guide-index"));
    if (!Number.isFinite(index)) return;
    visibleGuideCache.set(index, guideEl);
  });
}

function syncDeckStatus() {
  const totalPages = getTotalPages();
  const selectedImage =
    Number.isFinite(state.selectedSlotIndex) && state.selectedSlotIndex >= 0
      ? getImageById(getSlotImageId(state.selectedSlotIndex))
      : null;
  const playbackText = isPresenting()
    ? presentationPlaybackMode === "autoplay"
      ? `자동재생 · ${normalizeAutoplaySeconds(state.autoplaySeconds).toFixed(1)}초`
      : "일반 발표"
    : "편집 중";

  if (state.pageIndex === 0) {
    els.pageStatus.innerHTML = `
      <span class="status-primary">Cover / ${totalPages}</span>
      <span class="status-secondary">${playbackText} · 커버 편집</span>
    `;
  } else {
    const pageCaption = (getCurrentPageSlotMeta().caption || "").trim();
    const captionText = pageCaption ? `소제목: ${escapeHtml(pageCaption)}` : "소제목 없음";
    const imageText = selectedImage ? `선택 사진: ${escapeHtml(selectedImage.name)}` : "선택 사진 없음";
    els.pageStatus.innerHTML = `
      <span class="status-primary">${state.pageIndex + 1} / ${totalPages}</span>
      <span class="status-secondary">${playbackText} · ${captionText} · ${imageText}</span>
    `;
  }

  if (els.pageJumpInput) {
    els.pageJumpInput.min = "1";
    els.pageJumpInput.max = String(totalPages);
    const nextValue = String(Math.min(totalPages, Math.max(1, state.pageIndex + 1)));
    if (els.pageJumpInput.value !== nextValue) {
      els.pageJumpInput.value = nextValue;
    }
  }

  syncLayoutControls();
  const hasCurrentSlide = state.pageIndex > 0 && getSlidePageCount() > 0;
  const canMoveSlidePrev = hasCurrentSlide && state.pageIndex > 1;
  const canMoveSlideNext = hasCurrentSlide && state.pageIndex < getSlidePageCount();
  els.slideQuickActions?.classList.toggle("is-hidden", !hasCurrentSlide);
  if (els.moveSlidePrevButton) els.moveSlidePrevButton.disabled = !canMoveSlidePrev;
  if (els.moveSlideNextButton) els.moveSlideNextButton.disabled = !canMoveSlideNext;
  if (els.copySlideButton) els.copySlideButton.disabled = !hasCurrentSlide;
  if (els.pasteSlideButton) els.pasteSlideButton.disabled = !hasCurrentSlide || !slideClipboard;
  if (els.clearSlideButton) els.clearSlideButton.disabled = !hasCurrentSlide;
  if (els.insertSlideBeforeButton) els.insertSlideBeforeButton.disabled = !hasCurrentSlide;
  if (els.insertSlideAfterButton) els.insertSlideAfterButton.disabled = !hasCurrentSlide;
  if (els.duplicateSlideButton) els.duplicateSlideButton.disabled = !hasCurrentSlide;
  if (els.deleteSlideButton) els.deleteSlideButton.disabled = !hasCurrentSlide;
  syncHistoryButtons();
  els.zoomOutput.textContent = `${Math.round(state.zoom * 100)}%`;
  els.backgroundButton.textContent = state.backgroundEnabled
    ? "배경 채우기 켜짐 Enter"
    : "배경 채우기 꺼짐 Enter";
  if (els.presentButton) {
    els.presentButton.classList.toggle("is-active-mode", isPresenting() && presentationPlaybackMode === "manual");
  }
  if (els.autoplayButton) {
    els.autoplayButton.classList.toggle("is-active-mode", isPresenting() && presentationPlaybackMode === "autoplay");
  }
  if (els.autoplaySecondsValue) {
    els.autoplaySecondsValue.textContent = `${normalizeAutoplaySeconds(state.autoplaySeconds).toFixed(1)}초`;
  }
}

function revealPanelItem(element) {
  if (!(element instanceof HTMLElement)) return;
  element.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: "smooth",
  });
}

function getSlidePreviewRow() {
  return els.thumbnailRail?.querySelector(".slide-preview-row") ?? null;
}

function scrollSlidePreviewLayer(direction = 1) {
  const row = getSlidePreviewRow();
  if (!(row instanceof HTMLElement)) return false;

  const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);
  if (maxScrollLeft <= 0) return true;
  const status = getSlideLayerStatus(row);
  if (status && ((direction < 0 && !status.hasPrevious) || (direction > 0 && !status.hasNext))) {
    updateSlideLayerIndicators();
    return true;
  }

  const card = row.querySelector(".slide-thumb-editor") ?? row.querySelector(".slide-thumb");
  const cardWidth = card instanceof HTMLElement ? card.getBoundingClientRect().width : row.clientWidth / 3;
  const gap = Number.parseFloat(window.getComputedStyle(row).columnGap || window.getComputedStyle(row).gap) || 0;
  const step = Math.max(1, cardWidth + gap);
  const nextLeft = clamp(row.scrollLeft + direction * step * 3, 0, maxScrollLeft);
  row.scrollTo({ left: nextLeft, behavior: "smooth" });
  row.focus({ preventScroll: true });
  window.setTimeout(updateSlideLayerIndicators, 180);
  return true;
}

function getSlideLayerStatus(row = getSlidePreviewRow()) {
  void row;
  return getCurrentSlideLayerStatus();
}

function updateSlideLayerIndicators() {
  const status = getSlideLayerStatus();
  const previousButton = els.thumbnailRail?.querySelector("[data-slide-layer-prev]");
  const nextButton = els.thumbnailRail?.querySelector("[data-slide-layer-next]");
  const output = els.thumbnailRail?.querySelector("[data-slide-layer-status]");
  const indicator = els.thumbnailRail?.querySelector(".slide-layer-indicator");

  if (!(previousButton instanceof HTMLButtonElement) || !(nextButton instanceof HTMLButtonElement) || !status) return;
  previousButton.disabled = !status.hasPrevious;
  nextButton.disabled = !status.hasNext;
  previousButton.classList.toggle("is-available", status.hasPrevious);
  nextButton.classList.toggle("is-available", status.hasNext);
  indicator?.classList.toggle("has-previous-layer", status.hasPrevious);
  indicator?.classList.toggle("has-next-layer", status.hasNext);
  if (output) output.textContent = `${status.currentLayer} / ${status.totalLayers}`;
}

function getActiveSlideReorderRow() {
  return activeSlideReorderSource?.closest(".slide-preview-row") ?? getSlidePreviewRow();
}

function clearSlideReorderClasses(row = getActiveSlideReorderRow()) {
  if (!(row instanceof HTMLElement)) return;
  row.classList.remove("is-slide-reordering");
  row.querySelectorAll(".is-reorder-target, .is-reorder-shift-left, .is-reorder-shift-right").forEach((card) => {
    card.classList.remove("is-reorder-target", "is-reorder-shift-left", "is-reorder-shift-right");
  });
}

function updateSlideReorderShiftClasses() {
  const row = getActiveSlideReorderRow();
  if (!(row instanceof HTMLElement)) return;

  const cards = Array.from(row.querySelectorAll(".slide-thumb-editor"));
  cards.forEach((card) => card.classList.remove("is-reorder-shift-left", "is-reorder-shift-right"));
  if (!(activeSlideReorderSource instanceof HTMLElement) || !(activeSlideReorderTarget instanceof HTMLElement)) return;

  const fromIndex = cards.indexOf(activeSlideReorderSource);
  const toIndex = cards.indexOf(activeSlideReorderTarget);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

  if (fromIndex < toIndex) {
    cards.slice(fromIndex + 1, toIndex + 1).forEach((card) => card.classList.add("is-reorder-shift-left"));
    return;
  }

  cards.slice(toIndex, fromIndex).forEach((card) => card.classList.add("is-reorder-shift-right"));
}

function setSlideReorderTarget(card) {
  const nextTarget = card instanceof HTMLElement && card !== activeSlideReorderSource ? card : null;
  if (activeSlideReorderTarget === nextTarget) return;
  activeSlideReorderTarget?.classList.remove("is-reorder-target");
  activeSlideReorderTarget = nextTarget;
  activeSlideReorderTarget?.classList.add("is-reorder-target");
  updateSlideReorderShiftClasses();
}

function startSlideReorderVisuals(source) {
  if (!(source instanceof HTMLElement)) return;
  activeSlideReorderSource = source;
  source.classList.add("is-reordering");
  source.closest(".slide-preview-row")?.classList.add("is-slide-reordering");
  document.body.classList.add("is-slide-dragging");
}

function removeSlideDragGhost() {
  activeSlideHandleDrag?.ghost?.remove();
  if (activeSlideHandleDrag) {
    activeSlideHandleDrag.ghost = null;
    activeSlideHandleDrag.ghostOffsetX = 0;
    activeSlideHandleDrag.ghostOffsetY = 0;
  }
}

function updateSlideDragGhostPosition(event) {
  const ghost = activeSlideHandleDrag?.ghost;
  if (!(ghost instanceof HTMLElement)) return;
  const offsetX = activeSlideHandleDrag.ghostOffsetX ?? ghost.offsetWidth / 2;
  const offsetY = activeSlideHandleDrag.ghostOffsetY ?? 24;
  ghost.style.transform = `translate3d(${event.clientX - offsetX}px, ${event.clientY - offsetY}px, 0) scale(0.98)`;
}

function createSlideDragGhost(event) {
  const drag = activeSlideHandleDrag;
  if (!drag || !(drag.source instanceof HTMLElement) || drag.ghost) return;
  const rect = drag.source.getBoundingClientRect();
  const ghost = drag.source.cloneNode(true);
  ghost.classList.remove("is-active", "is-reordering", "is-reorder-target", "is-reorder-shift-left", "is-reorder-shift-right");
  ghost.classList.add("slide-drag-ghost");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  drag.ghost = ghost;
  drag.ghostOffsetX = event.clientX - rect.left;
  drag.ghostOffsetY = event.clientY - rect.top;
  document.body.append(ghost);
  updateSlideDragGhostPosition(event);
}

function cleanupSlideReorderVisuals() {
  clearSlideReorderClasses();
  removeSlideDragGhost();
  activeSlideReorderSource?.classList.remove("is-reordering");
  activeSlideReorderTarget?.classList.remove("is-reorder-target");
  activeSlideReorderTarget = null;
  activeSlideReorderSource = null;
  document.body.classList.remove("is-slide-dragging");
}

function syncThumbnailSlotSelection() {
  if (!els.thumbnailRail) return;

  const selectedSlotIndex = Number(state.selectedSlotIndex);

  if (
    activeThumbnailSlotNode &&
    (!Number.isFinite(selectedSlotIndex) ||
      Number(activeThumbnailSlotNode.getAttribute("data-slot-thumb-index")) !== selectedSlotIndex ||
      !els.thumbnailRail.contains(activeThumbnailSlotNode))
  ) {
    activeThumbnailSlotNode.classList.remove("is-selected-slot");
    activeThumbnailSlotNode = null;
  }

  if (!Number.isFinite(selectedSlotIndex) || selectedSlotIndex < 0) return;
  if (activeThumbnailSlotNode?.getAttribute("data-slot-thumb-index") === String(selectedSlotIndex)) return;

  const nextNode = els.thumbnailRail.querySelector(`[data-slot-thumb-index="${selectedSlotIndex}"]`);
  if (!(nextNode instanceof HTMLElement)) return;
  nextNode.classList.add("is-selected-slot");
  activeThumbnailSlotNode = nextNode;
}

function syncThumbnailLayerPreview() {
  if (!els.thumbnailRail) return;
  const currentLayer = getCurrentSlideLayerStatus()?.currentLayer ?? DEFAULT_SLIDE_LAYER;
  els.thumbnailRail.querySelectorAll(".slide-thumb-open.has-layer-preview").forEach((open) => {
    if (!(open instanceof HTMLElement)) return;
    open.classList.toggle("has-layer-before", currentLayer > 1);
    open.classList.toggle("has-layer-after", currentLayer < SLIDE_LAYER_COUNT);
  });
  els.thumbnailRail.querySelectorAll(".slide-thumb-layer-stack").forEach((stack) => {
    if (!(stack instanceof HTMLElement)) return;
    stack.style.setProperty("--active-slide-layer", String(currentLayer));
    stack.querySelectorAll(".slide-thumb-layer-frame").forEach((frame, index) => {
      frame.classList.toggle("is-current-layer", index + 1 === currentLayer);
    });
  });
}

function syncPhotoListSelection() {
  if (!els.photoListPanel) return;

  const selectedImageId =
    Number.isFinite(state.selectedSlotIndex) && state.selectedSlotIndex >= 0
      ? getSlotImageId(state.selectedSlotIndex)
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
  revealPanelItem(nextCard);
}

function updatePhotoFilterUi() {
  const filterPanel = document.querySelector(".photo-filter-panel");
  const filterTitle = document.querySelector(".photo-filter-head strong");
  if (filterPanel) filterPanel.setAttribute("aria-label", "사진 검색 및 필터");
  if (filterTitle) filterTitle.textContent = "사진 필터";

  const buttons = [
    [els.photoFilterAllButton, "all"],
    [els.photoFilterCurrentButton, "current"],
    [els.photoFilterPlacedButton, "placed"],
    [els.photoFilterUnplacedButton, "unplaced"],
  ];
  buttons.forEach(([button, mode]) => {
    if (!button) return;
    button.classList.toggle("is-active", state.photoFilterMode === mode);
  });
  if (els.photoSearchInput && els.photoSearchInput.value !== state.photoSearchQuery) {
    els.photoSearchInput.value = state.photoSearchQuery;
  }
  if (els.photoSearchClearButton) {
    const hasQuery = state.photoSearchQuery.trim().length > 0;
    els.photoSearchClearButton.disabled = !hasQuery;
    els.photoSearchClearButton.hidden = !hasQuery;
  }
  if (els.photoFilterResetButton) {
    const isDirty = state.photoSearchQuery.trim().length > 0 || state.photoFilterMode !== "all";
    els.photoFilterResetButton.textContent = "초기화";
    els.photoFilterResetButton.setAttribute("aria-label", "검색과 필터 초기화");
    els.photoFilterResetButton.disabled = !isDirty;
    els.photoFilterResetButton.hidden = !isDirty;
  }
}

function updatePhotoFilterCounts(usedCounts = getUsedCounts()) {
  const currentCount = new Set(getCurrentPageSlotMeta().slots.filter(Boolean)).size;
  const placedCount = state.images.reduce((count, image) => count + ((usedCounts.get(image.id) ?? 0) > 0 ? 1 : 0), 0);
  const labels = {
    all: `전체 ${state.images.length}`,
    current: `현재 ${currentCount}`,
    placed: `배치 ${placedCount}`,
    unplaced: `미배치 ${Math.max(0, state.images.length - placedCount)}`,
  };
  [
    [els.photoFilterAllButton, "all"],
    [els.photoFilterCurrentButton, "current"],
    [els.photoFilterPlacedButton, "placed"],
    [els.photoFilterUnplacedButton, "unplaced"],
  ].forEach(([button, key]) => {
    if (!button) return;
    button.textContent = labels[key];
  });
}

function updatePhotoFilterSummary(filteredCount, totalCount) {
  if (els.photoFilterSummary) {
    els.photoFilterSummary.textContent = `${filteredCount} / ${totalCount}장`;
  }
  updatePhotoSearchStatus(filteredCount);
}

function setPhotoSearchQuery(nextQuery) {
  const normalized = typeof nextQuery === "string" ? nextQuery : "";
  if (state.photoSearchQuery === normalized) return;
  state.photoSearchQuery = normalized;
  photoSearchActivationQuery = normalized;
  photoSearchActivationIndex = -1;
  render({ refreshGuidePanel: false, refreshThumbnails: false });
}

function setPhotoFilterMode(nextMode) {
  const normalized =
    nextMode === "placed" || nextMode === "unplaced" || nextMode === "current"
      ? nextMode
      : "all";
  if (state.photoFilterMode === normalized) return;
  state.photoFilterMode = normalized;
  render({ refreshGuidePanel: false, refreshThumbnails: false });
}

function resetPhotoFilters() {
  const hadQuery = state.photoSearchQuery.trim().length > 0;
  const hadFilter = state.photoFilterMode !== "all";
  if (!hadQuery && !hadFilter) return;

  state.photoSearchQuery = "";
  state.photoFilterMode = "all";
  photoSearchActivationQuery = "";
  photoSearchActivationIndex = -1;
  render({ refreshGuidePanel: false, refreshThumbnails: false });
  showToast("사진 검색과 필터를 초기화했습니다.");
}

function getFilteredImages(usedCounts = getUsedCounts()) {
  const query = state.photoSearchQuery.trim().toLocaleLowerCase("ko-KR");
  const currentPageImageIds =
    state.photoFilterMode === "current"
      ? new Set(getCurrentPageSlotMeta().slots.filter(Boolean))
      : null;
  return state.images.filter((image) => {
    const usedCount = usedCounts.get(image.id) ?? 0;
    if (state.photoFilterMode === "current" && !currentPageImageIds?.has(image.id)) return false;
    if (state.photoFilterMode === "placed" && usedCount === 0) return false;
    if (state.photoFilterMode === "unplaced" && usedCount > 0) return false;
    if (!query) return true;
    return image.name.toLocaleLowerCase("ko-KR").includes(query);
  });
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

    const imageId = getSlotImageId(slotIndex);
    if (!imageId) return;

    const image = getImageById(imageId);
    if (!image) return;

    const transform = getSlotTransform(slotIndex);
    const fitMode = getEffectiveSlotFitMode(slotIndex, transform);
    const displayUrl = getRenderableImageUrl(image);
    card.classList.toggle("background-enabled", state.backgroundEnabled);
    card.classList.toggle("fit-fill", fitMode === "fill");

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
    syncThumbnailSlotSelection();
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
  ensureSlideLayerAnchor();
  syncShortcutHelpContent();

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

function highlightSearchMatch(text, query) {
  const source = String(text ?? "");
  const normalizedQuery = String(query ?? "").trim();
  if (!normalizedQuery) return escapeHtml(source);

  const sourceLower = source.toLocaleLowerCase("ko-KR");
  const queryLower = normalizedQuery.toLocaleLowerCase("ko-KR");
  const matchIndex = sourceLower.indexOf(queryLower);
  if (matchIndex < 0) return escapeHtml(source);

  const matchEnd = matchIndex + normalizedQuery.length;
  return [
    escapeHtml(source.slice(0, matchIndex)),
    `<mark class="photo-search-match">${escapeHtml(source.slice(matchIndex, matchEnd))}</mark>`,
    escapeHtml(source.slice(matchEnd)),
  ].join("");
}

function getControlPanelSections() {
  return Array.from(document.querySelectorAll(".control-panel .panel-section"));
}

function isMobilePanelMode() {
  return window.matchMedia(MOBILE_PANEL_MEDIA_QUERY).matches;
}

function getDefaultMobileSectionCollapsed(index) {
  return ![0, 1, 2, 6].includes(index);
}

function applyMobileSectionCollapsed(section, collapsed) {
  if (!(section instanceof HTMLElement)) return;
  section.classList.toggle("is-collapsed", collapsed);
  const toggle = section.querySelector(".panel-section-toggle");
  if (toggle instanceof HTMLButtonElement) {
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggle.textContent = collapsed ? "펼치기" : "접기";
  }
}

function ensureMobileSectionAccordion() {
  const sections = getControlPanelSections();

  sections.forEach((section, index) => {
    const heading = section.querySelector("h2");
    if (!(heading instanceof HTMLElement)) return;

    section.dataset.mobileSectionIndex = String(index);
    if (!heading.classList.contains("panel-section-heading")) {
      const headingText = heading.textContent?.trim() || `섹션 ${index + 1}`;
      heading.textContent = "";
      heading.classList.add("panel-section-heading");

      const title = document.createElement("span");
      title.textContent = headingText;

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "panel-section-toggle";
      toggle.addEventListener("click", () => {
        if (!isMobilePanelMode()) return;
        applyMobileSectionCollapsed(section, !section.classList.contains("is-collapsed"));
      });

      heading.append(title, toggle);
    }

    if (!section.dataset.mobileAccordionReady) {
      section.dataset.mobileAccordionReady = "true";
      applyMobileSectionCollapsed(section, getDefaultMobileSectionCollapsed(index));
    }
  });

  syncMobileSectionAccordion();
}

function syncMobileSectionAccordion() {
  const isMobile = isMobilePanelMode();

  getControlPanelSections().forEach((section, index) => {
    section.classList.toggle("is-collapsible", isMobile);
    if (!isMobile) {
      section.classList.remove("is-collapsed");
      const toggle = section.querySelector(".panel-section-toggle");
      if (toggle instanceof HTMLButtonElement) {
        toggle.hidden = true;
        toggle.setAttribute("aria-expanded", "true");
      }
      return;
    }

    const toggle = section.querySelector(".panel-section-toggle");
    if (toggle instanceof HTMLButtonElement) {
      toggle.hidden = false;
    }

    if (!section.dataset.mobileStateInitialized) {
      section.dataset.mobileStateInitialized = "true";
      applyMobileSectionCollapsed(section, getDefaultMobileSectionCollapsed(index));
    } else {
      applyMobileSectionCollapsed(section, section.classList.contains("is-collapsed"));
    }
  });
}

function normalizeAutoplaySeconds(value) {
  return clamp(Number(Number(value).toFixed(1)) || 3, 1, 10);
}

function isPresenting() {
  return document.body.classList.contains("presenting");
}

function stopAutoplayTimer() {
  if (!autoplayTimer) return;
  window.clearTimeout(autoplayTimer);
  autoplayTimer = null;
}

function goToPage(nextPage, { preserveSlideLayerAnchor = false } = {}) {
  state.pageIndex = clamp(nextPage, 0, Math.max(getTotalPages() - 1, 0));
  if (preserveSlideLayerAnchor) {
    ensureSlideLayerAnchor();
  } else {
    resetSlideLayerAnchor(state.pageIndex);
  }
  render({ refreshPhotoList: false });
  if (presentationPlaybackMode === "autoplay" && isPresenting()) {
    scheduleAutoplayAdvance();
  }
}

function goToAdjacentSlideLayer(direction = 1) {
  if (state.pageIndex <= 0 || !Number.isFinite(direction) || direction === 0) return false;

  const status = getCurrentSlideLayerStatus();
  if (!status) return false;

  const nextLayer = clamp(status.currentLayer + (direction < 0 ? -1 : 1), 1, SLIDE_LAYER_COUNT);
  if (nextLayer === status.currentLayer) return true;

  state.slideLayerIndex = nextLayer;
  state.selectedSlotIndex = null;
  render({ persist: false });
  return true;
}

function updateFitMode(mode) {
  state.fitMode = mode;
  scheduleLightweightRefresh();
  queuePersistSettings();
  showToast(mode === "fill" ? "전체 사진을 채우기 기준으로 바꿨습니다." : "전체 사진을 맞추기 기준으로 바꿨습니다.");
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

function syncBackgroundMusicUi() {
  if (els.backgroundMusicName) {
    els.backgroundMusicName.textContent = state.backgroundMusicName || "음악 없음";
  }

  if (els.clearBackgroundMusicButton) {
    els.clearBackgroundMusicButton.disabled = !state.backgroundMusicUrl;
  }

  if (els.backgroundMusicAudio) {
    if (state.backgroundMusicUrl) {
      if (els.backgroundMusicAudio.src !== state.backgroundMusicUrl) {
        els.backgroundMusicAudio.src = state.backgroundMusicUrl;
      }
      els.backgroundMusicAudio.hidden = false;
    } else {
      els.backgroundMusicAudio.pause();
      els.backgroundMusicAudio.removeAttribute("src");
      els.backgroundMusicAudio.load();
      els.backgroundMusicAudio.hidden = true;
    }
  }
}

async function loadBackgroundMusic(file) {
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  state.backgroundMusicUrl = dataUrl;
  state.backgroundMusicName = file.name || "배경 음악";
  syncBackgroundMusicUi();
  queuePersistAssets();
  showToast("배경 음악을 불러왔습니다.");
}

function clearBackgroundMusic() {
  if (!state.backgroundMusicUrl) return;
  state.backgroundMusicUrl = "";
  state.backgroundMusicName = "";
  if (els.backgroundMusicInput) els.backgroundMusicInput.value = "";
  syncBackgroundMusicUi();
  queuePersistAssets();
  showToast("배경 음악을 제거했습니다.");
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

    beginEditHistoryAction();
    const wasEmpty = state.images.length === 0;
    state.images = [...state.images, ...addedImages];
    markImagesDirty();
    const placement = autoPlaceUploadedImages(addedImages.map((image) => image.id));
    const placedLocation = Number.isFinite(placement.firstSlotIndex)
      ? getSlotLocation(placement.firstSlotIndex)
      : null;
    state.selectedSlotIndex = Number.isFinite(placement.firstSlotIndex) ? placement.firstSlotIndex : null;

    els.imageFileName.textContent =
      duplicateChoice === "skip" && duplicates.length > 0
        ? `${addedImages.length}장 추가됨, 중복 ${duplicates.length}장 건너뜀`
        : `${addedImages.length}장 추가됨`;

    state.pageIndex = wasEmpty ? 1 : placedLocation?.page ?? state.pageIndex;
    resetSlideLayerAnchor(state.pageIndex);
    render();
    warmPreviewCache(addedImages);
    queuePersistAssets();
    if (placement.filledEmptyCount > 0 && placement.appendedCount > 0) {
      showToast(`빈칸 ${placement.filledEmptyCount}곳을 먼저 채우고 ${placement.appendedCount}장을 이어 배치했습니다.`);
    } else {
      showToast(`${addedImages.length}장을 자동으로 배치했습니다.`);
    }
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
  showToast(state.backgroundEnabled ? "블러 배경 채우기를 켰습니다." : "블러 배경 채우기를 껐습니다.");
}

function scheduleAutoplayAdvance() {
  stopAutoplayTimer();
  if (!isPresenting() || presentationPlaybackMode !== "autoplay") return;

  autoplayTimer = window.setTimeout(() => {
    autoplayTimer = null;
    if (!isPresenting() || presentationPlaybackMode !== "autoplay") return;

    const lastPageIndex = Math.max(getTotalPages() - 1, 0);
    if (state.pageIndex >= lastPageIndex) {
      stopPresentationMode({ silent: true });
      showToast("자동재생이 끝나 발표 모드를 종료했습니다.");
      return;
    }

    goToPage(state.pageIndex + 1);
  }, normalizeAutoplaySeconds(state.autoplaySeconds) * 1000);
}

function startPresentationMode({ autoplay = false } = {}) {
  presentationPlaybackMode = autoplay ? "autoplay" : "manual";
  document.body.classList.add("presenting");
  syncDeckStatus();

  if (autoplay) {
    scheduleAutoplayAdvance();
  } else {
    stopAutoplayTimer();
  }

  if (state.backgroundMusicUrl && els.backgroundMusicAudio) {
    try {
      els.backgroundMusicAudio.currentTime = 0;
    } catch {}
    els.backgroundMusicAudio.play().catch(() => {});
  }

  els.stage.requestFullscreen?.().catch(() => {});
  showToast(
    autoplay
      ? `자동재생 발표를 ${normalizeAutoplaySeconds(state.autoplaySeconds).toFixed(1)}초 간격으로 시작했습니다.`
      : "일반 발표를 시작했습니다.",
  );
}

function stopPresentationMode({ silent = false } = {}) {
  const wasPresenting = isPresenting();
  stopAutoplayTimer();
  presentationPlaybackMode = "manual";
  document.body.classList.remove("presenting");
  syncDeckStatus();

  if (els.backgroundMusicAudio) {
    els.backgroundMusicAudio.pause();
    try {
      els.backgroundMusicAudio.currentTime = 0;
    } catch {}
  }

  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }

  if (wasPresenting && !silent) {
    showToast("발표 모드를 종료했습니다.");
  }
}

function toggleAutoplayPresentation() {
  if (!isPresenting()) return;

  if (presentationPlaybackMode === "autoplay") {
    presentationPlaybackMode = "manual";
    stopAutoplayTimer();
    syncDeckStatus();
    showToast("자동재생을 멈추고 일반 발표로 전환했습니다.");
    return;
  }

  presentationPlaybackMode = "autoplay";
  syncDeckStatus();
  scheduleAutoplayAdvance();
  showToast(`자동재생 ${normalizeAutoplaySeconds(state.autoplaySeconds).toFixed(1)}초 간격으로 전환했습니다.`);
}

function updateAutoplaySeconds(value, { persist = true } = {}) {
  state.autoplaySeconds = normalizeAutoplaySeconds(value);
  if (els.autoplaySeconds) els.autoplaySeconds.value = String(state.autoplaySeconds);
  if (els.autoplaySecondsValue) els.autoplaySecondsValue.textContent = `${state.autoplaySeconds.toFixed(1)}초`;
  syncDeckStatus();

  if (presentationPlaybackMode === "autoplay" && isPresenting()) {
    scheduleAutoplayAdvance();
  }

  if (persist) queuePersistSettings();
}

function showShortcutHelp() {
  syncShortcutHelpContent();
  if (els.shortcutDialog.open) return;
  els.shortcutDialog.showModal();
}

function hideShortcutHelp() {
  if (!els.shortcutDialog.open) return;
  els.shortcutDialog.close();
}

function submitPageJump() {
  if (!(els.pageJumpInput instanceof HTMLInputElement)) return;
  const totalPages = getTotalPages();
  const targetPage = Math.min(totalPages, Math.max(1, Number(els.pageJumpInput.value) || 1));
  els.pageJumpInput.value = String(targetPage);
  goToPage(targetPage - 1);
}

function focusPhotoSearch() {
  if (!(els.photoSearchInput instanceof HTMLInputElement)) return;
  els.photoSearchInput.focus();
  els.photoSearchInput.select();
}

function updatePhotoSearchStatus(resultCount) {
  if (!(els.photoSearchStatus instanceof HTMLElement)) return;

  const query = state.photoSearchQuery.trim();
  if (!query) {
    els.photoSearchStatus.textContent = "Ctrl+K로 검색, Enter/Shift+Enter로 결과 이동";
    return;
  }

  if (resultCount <= 0) {
    els.photoSearchStatus.textContent = "검색 결과가 없습니다.";
    return;
  }

  const currentIndex =
    photoSearchActivationQuery === query && photoSearchActivationIndex >= 0
      ? photoSearchActivationIndex + 1
      : 1;
  els.photoSearchStatus.textContent = `검색 결과 ${currentIndex} / ${resultCount} · Enter 다음 · Shift+Enter 이전`;
}

function activateVisiblePhotoSearchResult(direction = 1) {
  if (!(els.photoListPanel instanceof HTMLElement)) return false;
  const cards = Array.from(els.photoListPanel.querySelectorAll(".photo-list-card"));
  if (cards.length === 0) {
    updatePhotoSearchStatus(0);
    return false;
  }

  const currentQuery = state.photoSearchQuery.trim();
  if (photoSearchActivationQuery !== currentQuery) {
    photoSearchActivationQuery = currentQuery;
    photoSearchActivationIndex = -1;
  }

  if (photoSearchActivationIndex < 0 || photoSearchActivationIndex >= cards.length) {
    photoSearchActivationIndex = direction < 0 ? cards.length - 1 : 0;
  } else {
    photoSearchActivationIndex =
      (photoSearchActivationIndex + (direction < 0 ? -1 : 1) + cards.length) % cards.length;
  }

  const card = cards[photoSearchActivationIndex];
  if (!(card instanceof HTMLElement)) return false;
  updatePhotoSearchStatus(cards.length);
  revealPanelItem(card);
  card.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  return true;
}

function syncShortcutHelpContent() {
  const shortcutGrid = els.shortcutDialog?.querySelector(".shortcut-grid");
  if (!(shortcutGrid instanceof HTMLElement)) return;

  const nextHtml = `
    <p><kbd>F5</kbd><span>처음부터 일반 발표</span></p>
    <p><kbd>Shift</kbd> + <kbd>F5</kbd><span>현재 페이지부터 일반 발표</span></p>
    <p><kbd>F6</kbd><span>처음부터 자동재생 발표</span></p>
    <p><kbd>Shift</kbd> + <kbd>F6</kbd><span>현재 페이지부터 자동재생 발표</span></p>
    <p><kbd>A</kbd><span>발표 중 일반 발표 / 자동재생 전환</span></p>
    <p><kbd>Esc</kbd><span>발표 모드 또는 도움말 닫기</span></p>
    <p><kbd>←</kbd> <kbd>P</kbd><span>이전 페이지</span></p>
    <p><kbd>→</kbd> <kbd>Space</kbd> <kbd>N</kbd><span>다음 페이지</span></p>
    <p><kbd>↑</kbd> <kbd>↓</kbd><span>현재 프로젝트의 1 / 2 / 3번 슬라이드 레이어 이동</span></p>
    <p><kbd>Home</kbd> / <kbd>End</kbd><span>커버 / 마지막 페이지</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>J</kbd><span>페이지 바로가기 입력칸 포커스</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>K</kbd><span>사진 검색창 포커스</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd><span>사진 검색과 필터 초기화</span></p>
    <p><kbd>Enter</kbd> / <kbd>Shift</kbd> + <kbd>Enter</kbd> / <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>Esc</kbd><span>검색 결과 순환 / 역순 순환 / 키보드 탐색 / 검색어 지우기</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>M</kbd><span>현재 슬라이드 뒤에 빈 슬라이드 추가</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd><span>현재 슬라이드 앞에 빈 슬라이드 추가</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>←</kbd> <kbd>→</kbd><span>현재 슬라이드 순서 이동</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>C</kbd> <kbd>Ctrl</kbd> + <kbd>V</kbd><span>현재 슬라이드 복사 / 뒤에 붙여넣기</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>Backspace</kbd><span>현재 슬라이드 사진만 비우기</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>D</kbd><span>현재 슬라이드 복제</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>Z</kbd><span>되돌리기</span></p>
    <p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd><span>다시하기</span></p>
    <p><kbd>Delete</kbd><span>현재 슬라이드 삭제</span></p>
    <p><kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd><span>현재 슬라이드 슬롯 이동</span></p>
    <p><kbd>Shift</kbd> + <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd><span>그리드 방향대로 슬롯 이동</span></p>
    <p><kbd>Alt</kbd> + <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd><span>선택 사진 미세 이동</span></p>
    <p><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd><span>선택 사진 크게 이동</span></p>
    <p><kbd>Alt</kbd> + <kbd>[</kbd> <kbd>]</kbd><span>선택 사진 크기 줄이기 / 키우기</span></p>
    <p><kbd>Alt</kbd> + <kbd>,</kbd> <kbd>.</kbd><span>선택 사진 회전</span></p>
    <p><kbd>Alt</kbd> + <kbd>F</kbd> <kbd>Alt</kbd> + <kbd>G</kbd><span>선택 사진 맞추기 / 채우기</span></p>
    <p><kbd>Alt</kbd> + <kbd>H</kbd> <kbd>Alt</kbd> + <kbd>J</kbd><span>선택 사진 좌우 / 상하 반전</span></p>
    <p><kbd>Alt</kbd> + <kbd>C</kbd> <kbd>Alt</kbd> + <kbd>V</kbd><span>선택 사진 값 복사 / 붙여넣기</span></p>
    <p><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd><span>현재 페이지 사진에 같은 값 적용</span></p>
    <p><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd><span>전체 슬라이드 사진에 같은 값 적용</span></p>
    <p><kbd>Backspace</kbd><span>선택된 슬롯 비우기</span></p>
    <p><kbd>F</kbd> / <kbd>Shift</kbd> + <kbd>F</kbd><span>사진 맞추기 / 채우기</span></p>
    <p><kbd>Enter</kbd><span>블러 배경 채우기 켜기/끄기</span></p>
    <p><kbd>=</kbd> <kbd>-</kbd> <kbd>휠</kbd><span>확대 / 축소</span></p>
    <p><kbd>Num +</kbd> <kbd>Num -</kbd> <kbd>0</kbd><span>키패드 확대 / 축소 / 초기화</span></p>
    <p><kbd>Shift</kbd> + <kbd>?</kbd><span>단축키 도움말</span></p>
  `;

  if (shortcutGrid.innerHTML !== nextHtml) {
    shortcutGrid.innerHTML = nextHtml;
  }
}

function hasSlideShortcutModifier(event) {
  return event.ctrlKey || event.metaKey;
}

function closeSlideContextMenu() {
  activeSlideContextPage = null;
  if (!els.slideContextMenu) return;
  els.slideContextMenu.setAttribute("aria-hidden", "true");
  els.slideContextMenu.style.removeProperty("left");
  els.slideContextMenu.style.removeProperty("top");
}

function openSlideContextMenu(page, clientX, clientY) {
  closeSlotContextMenu();
  if (!els.slideContextMenu || !els.slideContextLabel) return;
  if (!Number.isFinite(page) || page <= 0) return;

  activeSlideContextPage = page;
  els.slideContextLabel.textContent = `${page}페이지 편집`;
  els.slideContextMenu.setAttribute("aria-hidden", "false");

  const margin = 12;
  const card = els.slideContextMenu.firstElementChild;
  const width = card instanceof HTMLElement ? card.offsetWidth : 240;
  const height = card instanceof HTMLElement ? card.offsetHeight : 220;
  const left = Math.min(Math.max(clientX, margin), window.innerWidth - width - margin);
  const top = Math.min(Math.max(clientY, margin), window.innerHeight - height - margin);

  els.slideContextMenu.style.left = `${left}px`;
  els.slideContextMenu.style.top = `${top}px`;
}

function closeSlotContextMenu() {
  activeSlotContextIndex = null;
  if (!els.slotContextMenu) return;
  els.slotContextMenu.setAttribute("aria-hidden", "true");
  els.slotContextMenu.style.removeProperty("left");
  els.slotContextMenu.style.removeProperty("top");
}

function showToast(message = "") {
  if (!els.toast || !message) return;
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.setAttribute("aria-hidden", "false");
  els.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
    els.toast.setAttribute("aria-hidden", "true");
  }, 1800);
}

function syncSlotContextMenuState(slotIndex = activeSlotContextIndex) {
  if (!els.slotContextMenu || !Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;

  const transform = getSlotTransform(slotIndex);
  const buttons = els.slotContextMenu.querySelectorAll("[data-slot-context-action]");

  buttons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const action = button.dataset.slotContextAction;
    if (action === "paste") {
      button.disabled = !slotTransformClipboard;
    } else {
      button.disabled = false;
    }
    if (action === "fit") {
      button.textContent = transform.fitMode === "fit" ? "이 칸 맞추기 적용됨" : "이 칸 맞추기";
    }
    if (action === "fill") {
      button.textContent = transform.fitMode === "fill" ? "이 칸 채우기 적용됨" : "이 칸 채우기";
    }
    if (action === "flip-x") {
      button.textContent = transform.flipX ? "좌우 반전 해제" : "좌우 반전";
    }
    if (action === "flip-y") {
      button.textContent = transform.flipY ? "상하 반전 해제" : "상하 반전";
    }
  });
}

function openSlotContextMenu(slotIndex, clientX, clientY) {
  closeSlideContextMenu();
  if (!els.slotContextMenu || !els.slotContextLabel) return;
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;

  activeSlotContextIndex = slotIndex;
  els.slotContextLabel.textContent = `${getSlotDisplayLabel(slotIndex)} 사진 편집`;
  syncSlotContextMenuState(slotIndex);
  els.slotContextMenu.setAttribute("aria-hidden", "false");

  const margin = 12;
  const card = els.slotContextMenu.firstElementChild;
  const width = card instanceof HTMLElement ? card.offsetWidth : 240;
  const height = card instanceof HTMLElement ? card.offsetHeight : 260;
  const left = Math.min(Math.max(clientX, margin), window.innerWidth - width - margin);
  const top = Math.min(Math.max(clientY, margin), window.innerHeight - height - margin);

  els.slotContextMenu.style.left = `${left}px`;
  els.slotContextMenu.style.top = `${top}px`;
}

function runSlideContextAction(action, page = activeSlideContextPage) {
  if (!Number.isFinite(page) || page <= 0) return;

  if (action === "move-prev") {
    reorderSlidePage(page, page - 1);
    return;
  }
  if (action === "move-next") {
    reorderSlidePage(page, page + 1);
    return;
  }
  if (action === "copy") {
    copySlidePageToClipboard(page);
    return;
  }
  if (action === "paste") {
    pasteSlidePageAfter(page);
    return;
  }
  if (action === "clear") {
    clearSlidePage(page);
    return;
  }
  if (action === "insert-before") {
    insertSlidePage(page, "before");
    return;
  }
  if (action === "insert-after") {
    insertSlidePage(page, "after");
    return;
  }
  if (action === "duplicate") {
    duplicateSlidePage(page);
    return;
  }
  if (action === "delete") {
    deleteSlidePage(page);
  }
}

function runSlotContextAction(action, slotIndex = activeSlotContextIndex) {
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;

  if (state.selectedSlotIndex !== slotIndex) selectSlot(slotIndex);

  if (action === "copy") {
    copySelectedSlotTransform();
    return;
  }
  if (action === "paste") {
    pasteSelectedSlotTransform();
    return;
  }
  if (action === "fit") {
    setSelectedSlotFitMode("fit");
    return;
  }
  if (action === "fill") {
    setSelectedSlotFitMode("fill");
    return;
  }
  if (action === "flip-x") {
    toggleSelectedSlotFlip("x");
    return;
  }
  if (action === "flip-y") {
    toggleSelectedSlotFlip("y");
    return;
  }
  if (action === "reset") {
    beginEditHistoryAction();
    state.slotTransforms[slotIndex] = getDefaultSlotTransform();
    render();
    return;
  }
  if (action === "clear") {
    setSlot(slotIndex, null);
  }
}

document.addEventListener("pointerdown", (event) => {
  if (els.slideContextMenu?.getAttribute("aria-hidden") !== "false") return;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest("#slideContextMenu")) return;
  closeSlideContextMenu();
});

document.addEventListener("pointermove", (event) => {
  if (activeSlideHandleDrag && event.pointerId === activeSlideHandleDrag.pointerId) {
    const deltaX = event.clientX - activeSlideHandleDrag.startX;
    const deltaY = event.clientY - activeSlideHandleDrag.startY;
    if (!activeSlideHandleDrag.moved && Math.hypot(deltaX, deltaY) > 5) {
      activeSlideHandleDrag.moved = true;
      startSlideReorderVisuals(activeSlideHandleDrag.source);
      createSlideDragGhost(event);
    }
    if (!activeSlideHandleDrag.moved) return;

    updateSlideDragGhostPosition(event);
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const card = target instanceof Element ? target.closest(".slide-thumb-editor") : null;
    setSlideReorderTarget(card);
    event.preventDefault();
    return;
  }

  if (!activeThumbnailRailPan || event.pointerId !== activeThumbnailRailPan.pointerId) return;
  const deltaX = event.clientX - activeThumbnailRailPan.startX;
  if (!activeThumbnailRailPan.moved && Math.abs(deltaX) > 4) {
    activeThumbnailRailPan.moved = true;
  }
  if (!activeThumbnailRailPan.moved) return;
  activeThumbnailRailPan.row.scrollLeft = activeThumbnailRailPan.startScrollLeft - deltaX;
  event.preventDefault();
});

document.addEventListener("pointerup", (event) => {
  if (activeSlideHandleDrag && event.pointerId === activeSlideHandleDrag.pointerId) {
    const fromPage = activeSlideHandleDrag.page;
    const target = activeSlideReorderTarget;
    const toPage = target instanceof HTMLElement ? Number(target.dataset.page) : null;
    const shouldReorder =
      activeSlideHandleDrag.moved &&
      Number.isFinite(fromPage) &&
      Number.isFinite(toPage) &&
      fromPage !== toPage;

    cleanupSlideReorderVisuals();
    activeSlideHandleDrag = null;
    thumbnailRailSuppressClickUntil = performance.now() + 180;

    if (shouldReorder) reorderSlidePage(fromPage, toPage);
    event.preventDefault();
    return;
  }

  if (!activeThumbnailRailPan || event.pointerId !== activeThumbnailRailPan.pointerId) return;
  activeThumbnailRailPan.row.classList.remove("is-grabbed");
  if (activeThumbnailRailPan.moved) {
    thumbnailRailSuppressClickUntil = performance.now() + 180;
  }
  activeThumbnailRailPan = null;
});

document.addEventListener("pointercancel", (event) => {
  if (activeSlideHandleDrag && event.pointerId === activeSlideHandleDrag.pointerId) {
    cleanupSlideReorderVisuals();
    activeSlideHandleDrag = null;
    return;
  }

  if (!activeThumbnailRailPan || event.pointerId !== activeThumbnailRailPan.pointerId) return;
  activeThumbnailRailPan.row.classList.remove("is-grabbed");
  activeThumbnailRailPan = null;
});

document.addEventListener("pointerdown", (event) => {
  if (els.slotContextMenu?.getAttribute("aria-hidden") !== "false") return;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest("#slotContextMenu")) return;
  closeSlotContextMenu();
});

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
  const hasSelectedSlot = Number.isFinite(slotIndex) && slotIndex >= 0;
  const selectedImageId = hasSelectedSlot ? getSlotImageId(slotIndex) : null;
  const hasSlot = Boolean(selectedImageId && getImageById(selectedImageId));
  const isEmptySelectedSlot = hasSelectedSlot && !hasSlot;

  if (!els.selectedSlotLabel) return;

  const controls = [
    els.slotScale,
    els.slotX,
    els.slotY,
    els.slotRotate,
    els.slotFitButton,
    els.slotFillButton,
    els.flipSlotXButton,
    els.flipSlotYButton,
    els.slotCropLeft,
    els.slotCropRight,
    els.slotCropTop,
    els.slotCropBottom,
    els.resetSlotTransformButton,
    els.copySlotTransformButton,
    els.pasteSlotTransformButton,
    els.applySlotTransformToPageButton,
    els.applySlotTransformToAllButton,
  ].filter(Boolean);

  const disabledKey = hasSlot ? "enabled" : "disabled";
  if (!selectedSlotUiKey.startsWith(`${disabledKey}|`)) {
    for (const control of controls) control.disabled = !hasSlot;
  }

  if (els.pasteSlotTransformButton) {
    els.pasteSlotTransformButton.disabled = !hasSlot || !slotTransformClipboard;
  }
  if (els.applySlotTransformToPageButton) {
    els.applySlotTransformToPageButton.disabled = !hasSlot;
  }
  if (els.applySlotTransformToAllButton) {
    els.applySlotTransformToAllButton.disabled = !hasSlot;
  }

  if (hasSelectedSlot && isMobilePanelMode()) {
    const selectedPanelSection = getControlPanelSections()[6];
    if (selectedPanelSection) {
      applyMobileSectionCollapsed(selectedPanelSection, false);
    }
  }

  if (!hasSlot) {
    const nextKey = isEmptySelectedSlot ? `disabled|empty-slot|${slotIndex}` : "disabled|empty";
  if (selectedSlotUiKey !== nextKey) {
    els.selectedSlotLabel.textContent = isEmptySelectedSlot
        ? `${getSlotDisplayLabel(slotIndex)} 빈 슬롯 선택됨. Tab/Shift+방향키로 칸 이동, 클릭은 현재 칸 배치, 더블클릭은 다음 빈칸까지 연속 배치합니다.`
        : "슬라이드 사진이나 빈칸을 클릭하세요.";
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
    transform.fitMode,
    transform.flipX,
    transform.flipY,
    transform.cropLeft,
    transform.cropRight,
    transform.cropTop,
    transform.cropBottom,
  ].join("|");

  if (selectedSlotUiKey === nextKey) return;

  const nextLabel = `${getSlotDisplayLabel(slotIndex)} 선택됨. Tab/Shift+방향키로 칸 이동, Alt+방향키/대괄호/쉼표/마침표/H/J/F/G로 미세 편집, Alt+C/Alt+V로 값 복사 붙여넣기, Alt+Shift+V/A로 페이지/전체 일괄 적용, 우클릭으로 빠른 편집, 좌상단 이동 핸들 드래그로 자리 이동, Alt+드래그로 복제, Backspace로 비우기, 클릭은 교체, 더블클릭은 다음 빈칸까지 연속 이동합니다.`;
  if (els.selectedSlotLabel.textContent !== nextLabel) {
    els.selectedSlotLabel.textContent = nextLabel;
  }
  if (els.flipSlotXButton) {
    els.flipSlotXButton.textContent = transform.flipX ? "좌우 반전 해제" : "좌우 반전";
  }
  if (els.flipSlotYButton) {
    els.flipSlotYButton.textContent = transform.flipY ? "상하 반전 해제" : "상하 반전";
  }
  if (els.slotFitButton) {
    els.slotFitButton.classList.toggle("is-active", transform.fitMode === "fit");
  }
  if (els.slotFillButton) {
    els.slotFillButton.classList.toggle("is-active", transform.fitMode === "fill");
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

function selectAdjacentSlot(step = 1) {
  if (state.pageIndex <= 0) return;

  const { slotIndices } = getCurrentPageSlotMeta();
  if (slotIndices.length === 0) return;

  const currentSlotIndex = Number(state.selectedSlotIndex);
  const currentIndex = slotIndices.indexOf(currentSlotIndex);
  const nextIndex =
    currentIndex >= 0
      ? (currentIndex + step + slotIndices.length) % slotIndices.length
      : (step >= 0 ? 0 : slotIndices.length - 1);

  selectSlot(slotIndices[nextIndex]);
}

function selectDirectionalSlot(direction) {
  if (state.pageIndex <= 0) return;

  const { slotIndices, layout } = getCurrentPageSlotMeta();
  if (slotIndices.length === 0) return;

  const currentSlotIndex = Number(state.selectedSlotIndex);
  const currentIndex = slotIndices.indexOf(currentSlotIndex);
  const baseIndex = currentIndex >= 0 ? currentIndex : 0;
  const cols = Math.max(1, layout?.cols ?? slotIndices.length);
  const rows = Math.max(1, layout?.rows ?? Math.ceil(slotIndices.length / cols));
  const currentRow = Math.floor(baseIndex / cols);
  const currentCol = baseIndex % cols;

  let nextRow = currentRow;
  let nextCol = currentCol;

  if (direction === "left") nextCol -= 1;
  if (direction === "right") nextCol += 1;
  if (direction === "up") nextRow -= 1;
  if (direction === "down") nextRow += 1;

  nextRow = (nextRow + rows) % rows;
  nextCol = (nextCol + cols) % cols;

  let nextIndex = nextRow * cols + nextCol;
  if (nextIndex >= slotIndices.length) {
    nextIndex = direction === "left" || direction === "up" ? slotIndices.length - 1 : 0;
  }

  selectSlot(slotIndices[nextIndex]);
}

function updateSelectedSlotTransform(key, value, { recordHistory = false } = {}) {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;
  if (recordHistory) beginEditHistoryAction();
  getSlotTransform(slotIndex)[key] = typeof value === "number" ? value : value;
  scheduleLightweightRefresh([slotIndex]);
  queuePersistSettings();
}

function nudgeSelectedSlotPosition(direction, amount = 1) {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;

  const transform = getSlotTransform(slotIndex);
  if (direction === "left") updateSelectedSlotTransform("x", clamp(transform.x - amount, -100, 100), { recordHistory: true });
  if (direction === "right") updateSelectedSlotTransform("x", clamp(transform.x + amount, -100, 100), { recordHistory: true });
  if (direction === "up") updateSelectedSlotTransform("y", clamp(transform.y - amount, -100, 100), { recordHistory: true });
  if (direction === "down") updateSelectedSlotTransform("y", clamp(transform.y + amount, -100, 100), { recordHistory: true });
}

function nudgeSelectedSlotScale(amount = 1) {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;

  const transform = getSlotTransform(slotIndex);
  updateSelectedSlotTransform("scale", clamp(transform.scale + amount, 40, 240), { recordHistory: true });
}

function nudgeSelectedSlotRotate(amount = 1) {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;

  const transform = getSlotTransform(slotIndex);
  updateSelectedSlotTransform("rotate", clamp(transform.rotate + amount, -45, 45), { recordHistory: true });
}

function toggleSelectedSlotFlip(axis = "x") {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;

  const transform = getSlotTransform(slotIndex);
  if (axis === "x") {
    updateSelectedSlotTransform("flipX", !transform.flipX, { recordHistory: true });
    return;
  }
  if (axis === "y") {
    updateSelectedSlotTransform("flipY", !transform.flipY, { recordHistory: true });
  }
}

function setSelectedSlotFitMode(mode = "inherit") {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;
  updateSelectedSlotTransform("fitMode", mode, { recordHistory: true });
}

function copySelectedSlotTransform() {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;
  slotTransformClipboard = { ...getSlotTransform(slotIndex) };
  syncSelectedSlotControls();
  showToast("현재 사진 값을 복사했습니다.");
}

function pasteSelectedSlotTransform() {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!slotTransformClipboard || !Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;
  beginEditHistoryAction();
  state.slotTransforms[slotIndex] = { ...slotTransformClipboard };
  scheduleLightweightRefresh([slotIndex]);
  queuePersistSettings();
  showToast("선택한 칸에 사진 값을 붙여넣었습니다.");
}

function applySelectedSlotTransformToCurrentPage() {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;

  const sourceTransform = { ...getSlotTransform(slotIndex) };
  const { slotIndices } = getCurrentPageSlotMeta();
  const targetSlotIndices = slotIndices.filter((candidate) => candidate !== slotIndex && getSlotImageId(candidate));
  if (targetSlotIndices.length === 0) return;

  beginEditHistoryAction();
  targetSlotIndices.forEach((candidate) => {
    state.slotTransforms[candidate] = { ...sourceTransform };
  });
  scheduleLightweightRefresh(slotIndices);
  queuePersistSettings();
  showToast("현재 페이지 사진에 같은 값을 적용했습니다.");
}

function applySelectedSlotTransformToAllSlides() {
  const slotIndex = Number(state.selectedSlotIndex);
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) return;

  const sourceTransform = { ...getSlotTransform(slotIndex) };
  const targetSlotIndices = [
    ...state.slideSlots
      .map((imageId, index) => (imageId && index !== slotIndex ? index : null))
      .filter((value) => Number.isFinite(value)),
    ...Object.entries(ensureSlideLayerPagesStore()).flatMap(([key, record]) => {
      const parsed = parseSlideLayerKey(key);
      if (!parsed || !record || !Array.isArray(record.slots)) return [];
      return record.slots
        .map((imageId, offset) => {
          const candidate = getLayerSlotIndex(parsed.page, parsed.layer, offset);
          return imageId && candidate !== slotIndex ? candidate : null;
        })
        .filter((value) => Number.isFinite(value));
    }),
  ];
  if (targetSlotIndices.length === 0) return;

  beginEditHistoryAction();
  targetSlotIndices.forEach((candidate) => {
    state.slotTransforms[candidate] = { ...sourceTransform };
  });
  scheduleLightweightRefresh();
  queuePersistSettings();
  showToast("전체 사진에 같은 값을 적용했습니다.");
}

function bindSlotTransform(input, output, key, suffix = "%") {
  if (!input || !output) return;
  input.addEventListener("input", () => {
    output.textContent = `${input.value}${suffix}`;
    updateSelectedSlotTransform(key, input.value);
  });
}

function syncLayoutControls() {
  const layout = state.pageIndex > 0 ? getCurrentPageSlotMeta().layout : getPageLayout(state.pageIndex);
  els.gridRows.value = layout.rows;
  els.gridCols.value = layout.cols;
  els.layoutMode.value = layout.mode;
}

function applyLayoutToPage(page, mode, rows, cols) {
  if (!Number.isFinite(page) || page <= 0) {
    beginEditHistoryAction();
    state.layoutMode = createLayoutConfig(mode, rows, cols).mode;
    state.gridRows = createLayoutConfig(mode, rows, cols).rows;
    state.gridCols = createLayoutConfig(mode, rows, cols).cols;
    markLayoutDirty();
    render();
    return;
  }

  const nextLayout = createLayoutConfig(mode, rows, cols);
  const activeLayer = page === state.pageIndex ? getCurrentSlideLayerStatus()?.currentLayer : DEFAULT_SLIDE_LAYER;
  if (activeLayer && activeLayer !== DEFAULT_SLIDE_LAYER) {
    beginEditHistoryAction();
    const layerPage = getLayerSlidePage(page, activeLayer, { create: true });
    if (!layerPage) return;

    const nextPageSize = getPageSizeForLayout(nextLayout);
    const previousPageSize = layerPage.slots.length;
    const nextSlots =
      nextPageSize > previousPageSize
        ? [...layerPage.slots, ...Array(nextPageSize - previousPageSize).fill(null)]
        : layerPage.slots.slice(0, nextPageSize);

    for (let offset = nextPageSize; offset < previousPageSize; offset += 1) {
      delete state.slotTransforms[getLayerSlotIndex(page, activeLayer, offset)];
    }

    state.slideLayerPages[getSlideLayerKey(page, activeLayer)] = {
      layout: nextLayout,
      slots: nextSlots,
      caption: layerPage.caption,
    };

    const selectedLayerSlot = parseLayerSlotIndex(state.selectedSlotIndex);
    if (
      selectedLayerSlot?.page === Number(page) &&
      selectedLayerSlot.layer === activeLayer &&
      selectedLayerSlot.offset >= nextPageSize
    ) {
      state.selectedSlotIndex = null;
    }

    markSlideSlotsDirty();
    markLayoutDirty();
    render();
    return;
  }

  const pages = getSlidePages().map((entry) => ({
    pageIndex: entry.pageIndex,
    start: entry.start,
    pageSize: entry.pageSize,
    layout: createLayoutConfig(entry.layout.mode, entry.layout.rows, entry.layout.cols),
    caption: entry.caption,
    slots: [...entry.slots],
    transforms: Array.from({ length: entry.pageSize }, (_, offset) => {
      const transform = state.slotTransforms[entry.start + offset];
      return transform ? { ...transform } : null;
    }),
  }));
  const targetPage = pages[page - 1];
  if (!targetPage) return;

  beginEditHistoryAction();
  const selectedLocation =
    Number.isFinite(state.selectedSlotIndex) && state.selectedSlotIndex >= 0
      ? getSlotLocation(Number(state.selectedSlotIndex))
      : null;
  const nextPageSize = getPageSizeForLayout(nextLayout);
  const currentPageSize = targetPage.slots.length;

  if (nextPageSize > currentPageSize) {
    targetPage.slots.push(...Array(nextPageSize - currentPageSize).fill(null));
    targetPage.transforms.push(...Array(nextPageSize - currentPageSize).fill(null));
  } else if (nextPageSize < currentPageSize) {
    targetPage.slots = targetPage.slots.slice(0, nextPageSize);
    targetPage.transforms = targetPage.transforms.slice(0, nextPageSize);
    while (pages.length > page && !hasSlidePageContent(pages[pages.length - 1])) {
      pages.pop();
    }
  }

  targetPage.layout = nextLayout;
  targetPage.pageSize = nextPageSize;
  state.slideSlots = pages.flatMap((entry) => entry.slots);
  state.slideCaptions = pages.map((entry) => entry.caption);
  state.slidePageLayouts = pages.map((entry) =>
    createLayoutConfig(entry.layout.mode, entry.layout.rows, entry.layout.cols),
  );

  const nextTransforms = {};
  let nextSlotIndex = 0;
  let nextSelectedSlotIndex = null;
  pages.forEach((entry) => {
    const isSelectedPage = selectedLocation?.page === entry.pageIndex;
    entry.transforms.forEach((transform, offset) => {
      if (isSelectedPage && selectedLocation.offset === offset) {
        nextSelectedSlotIndex = nextSlotIndex;
      }
      if (transform) nextTransforms[nextSlotIndex] = transform;
      nextSlotIndex += 1;
    });
  });
  state.slotTransforms = {
    ...Object.fromEntries(Object.entries(state.slotTransforms).filter(([key]) => parseLayerSlotIndex(Number(key)))),
    ...nextTransforms,
  };
  state.selectedSlotIndex = Number.isFinite(nextSelectedSlotIndex) ? nextSelectedSlotIndex : null;
  state.pageIndex = clamp(state.pageIndex, 0, Math.max(pages.length, 0));
  resetSlideLayerAnchor(state.pageIndex);

  markSlideSlotsDirty();
  markLayoutDirty();
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
  const normalizedSlotIndex = normalizeSlotIndex(slotIndex);
  if (normalizedSlotIndex === null) return;

  beginEditHistoryAction();
  if (!writeSlotImageId(normalizedSlotIndex, imageId)) return;
  if (!imageId) delete state.slotTransforms[normalizedSlotIndex];
  markSlideSlotsDirty();
  if (imageId) state.selectedSlotIndex = normalizedSlotIndex;
  if (!imageId && state.selectedSlotIndex === normalizedSlotIndex) state.selectedSlotIndex = null;
  render();
}

function moveOrSwapSlotContent(fromSlotIndex, toSlotIndex, { copy = false } = {}) {
  const normalizedFromSlotIndex = normalizeSlotIndex(fromSlotIndex);
  const normalizedToSlotIndex = normalizeSlotIndex(toSlotIndex);
  if (normalizedFromSlotIndex === null || normalizedToSlotIndex === null || normalizedFromSlotIndex === normalizedToSlotIndex) return;
  if (!getSlotImageId(normalizedFromSlotIndex)) return;

  beginEditHistoryAction();
  const fromImageId = getSlotImageId(normalizedFromSlotIndex);
  const toImageId = getSlotImageId(normalizedToSlotIndex);
  const fromTransform = state.slotTransforms[normalizedFromSlotIndex] ? { ...state.slotTransforms[normalizedFromSlotIndex] } : null;
  const toTransform = state.slotTransforms[normalizedToSlotIndex] ? { ...state.slotTransforms[normalizedToSlotIndex] } : null;
  const movedImageName = getImageById(fromImageId)?.name || "사진";

  writeSlotImageId(normalizedToSlotIndex, fromImageId);
  if (fromTransform) state.slotTransforms[normalizedToSlotIndex] = fromTransform;
  else delete state.slotTransforms[normalizedToSlotIndex];

  if (!copy) {
    writeSlotImageId(normalizedFromSlotIndex, toImageId);
    if (toImageId && toTransform) state.slotTransforms[normalizedFromSlotIndex] = toTransform;
    else delete state.slotTransforms[normalizedFromSlotIndex];
  }

  markSlideSlotsDirty();
  state.selectedSlotIndex = normalizedToSlotIndex;
  render();
  if (copy) {
    showToast(`${movedImageName}을(를) 다른 칸에 복제했습니다.`);
    return;
  }
  if (toImageId) {
    showToast("두 사진의 위치를 서로 바꿨습니다.");
    return;
  }
  showToast(`${movedImageName}을(를) 다른 칸으로 이동했습니다.`);
}

function findNextEmptySlotIndex(fromSlotIndex = -1) {
  const location = getSlotLocation(Number(fromSlotIndex));
  if (location?.layer && location.layer !== DEFAULT_SLIDE_LAYER) {
    const layerPage = getLayerSlidePage(location.page, location.layer);
    if (!layerPage) return null;
    for (let offset = location.offset + 1; offset < layerPage.pageSize; offset += 1) {
      const slotIndex = getLayerSlotIndex(location.page, location.layer, offset);
      if (!getSlotImageId(slotIndex)) return slotIndex;
    }
    return null;
  }

  for (let slotIndex = Math.max(0, Number(fromSlotIndex) + 1); slotIndex < state.slideSlots.length; slotIndex += 1) {
    if (!getSlotImageId(slotIndex)) return slotIndex;
  }
  return null;
}

function autoPlaceUploadedImages(imageIds) {
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return {
      firstSlotIndex: null,
      filledEmptyCount: 0,
      appendedCount: 0,
    };
  }

  normalizeSlidePageLayouts(state.slideSlots.length);
  const emptySlotIndices = [];

  for (let slotIndex = 0; slotIndex < state.slideSlots.length; slotIndex += 1) {
    if (!state.slideSlots[slotIndex]) emptySlotIndices.push(slotIndex);
  }

  let firstSlotIndex = null;
  let filledEmptyCount = 0;
  const remainingImageIds = [...imageIds];

  while (emptySlotIndices.length > 0 && remainingImageIds.length > 0) {
    const slotIndex = emptySlotIndices.shift();
    const imageId = remainingImageIds.shift();
    state.slideSlots[slotIndex] = imageId;
    if (!Number.isFinite(firstSlotIndex)) firstSlotIndex = slotIndex;
    filledEmptyCount += 1;
  }

  const appendedCount = remainingImageIds.length;
  if (appendedCount > 0) {
    const appendStart = state.slideSlots.length;
    state.slideSlots.push(...remainingImageIds);
    if (!Number.isFinite(firstSlotIndex)) firstSlotIndex = appendStart;
  }

  normalizeSlidePageLayouts(state.slideSlots.length);
  markSlideSlotsDirty();
  markLayoutDirty();

  return {
    firstSlotIndex,
    filledEmptyCount,
    appendedCount,
  };
}

function resolvePhotoListTargetSlotIndex() {
  const selectedSlotIndex = Number(state.selectedSlotIndex);
  if (Number.isFinite(selectedSlotIndex) && selectedSlotIndex >= 0) {
    return selectedSlotIndex;
  }

  const emptySlotIndex = findFirstEmptySlotIndexForPage(state.pageIndex);
  if (state.pageIndex > 0 && Number.isFinite(emptySlotIndex)) {
    return emptySlotIndex;
  }

  return null;
}

function assignImageToSlot(slotIndex, imageId, { advance = false } = {}) {
  const normalizedSlotIndex = normalizeSlotIndex(slotIndex);
  if (normalizedSlotIndex === null || !imageId) return;

  beginEditHistoryAction();
  if (!writeSlotImageId(normalizedSlotIndex, imageId)) return;
  markSlideSlotsDirty();

  if (advance) {
    const nextEmptySlotIndex = findNextEmptySlotIndex(normalizedSlotIndex);
    if (Number.isFinite(nextEmptySlotIndex)) {
      const location = getSlotLocation(nextEmptySlotIndex);
      if (location) {
        state.pageIndex = location.page;
        state.slideLayerIndex = location.layer ?? DEFAULT_SLIDE_LAYER;
        state.selectedSlotIndex = nextEmptySlotIndex;
        render();
        return;
      }
    }

    if (parseLayerSlotIndex(normalizedSlotIndex)) {
      state.selectedSlotIndex = normalizedSlotIndex;
      render();
      return;
    }

    const layout = getPageLayout(state.pageIndex);
    const pageSize = getPageSizeForLayout(layout);
    const nextPageIndex = getSlidePageCount() + 1;
    state.slidePageLayouts.push(createLayoutConfig(layout.mode, layout.rows, layout.cols));
    state.slideSlots.push(...Array(pageSize).fill(null));
    markSlideSlotsDirty();
    markLayoutDirty();
    normalizeSlideCaptions();

    const firstSlotIndexOfNextPage = state.slideSlots.length - pageSize;
    state.pageIndex = nextPageIndex;
    resetSlideLayerAnchor(state.pageIndex);
    state.selectedSlotIndex = firstSlotIndexOfNextPage;
    render();
    return;
  }

  state.selectedSlotIndex = normalizedSlotIndex;
  render();
}

function addEmptySlot() {
  beginEditHistoryAction();
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
  beginEditHistoryAction();
  if (state.images.length === 0) {
    state.slideSlots = [];
    state.slidePageLayouts = [];
    state.slideCaptions = [];
    state.slideLayerPages = {};
    markSlideSlotsDirty();
    markLayoutDirty();
    state.pageIndex = 0;
    resetSlideLayerAnchor(state.pageIndex);
    render();
    showToast("슬라이드를 비웠습니다.");
    return;
  }

  const layout = getDefaultLayoutConfig();
  state.slidePageLayouts = [layout];
  state.slideSlots = Array(getPageSizeForLayout(layout)).fill(null);
  state.slideCaptions = [""];
  state.slideLayerPages = {};
  markSlideSlotsDirty();
  markLayoutDirty();
  state.slotTransforms = {};
  state.selectedSlotIndex = null;
  state.pageIndex = 1;
  resetSlideLayerAnchor(state.pageIndex);
  render();
  showToast("슬라이드 칸을 모두 비웠습니다.");
}

function resetAllPhotosAndSlides() {
  if (state.images.length === 0 && state.slideSlots.length === 0) return;
  const shouldReset = window.confirm("업로드한 사진과 슬라이드를 모두 초기화할까요?");
  if (!shouldReset) return;

  beginEditHistoryAction();
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
  state.slideLayerPages = {};
  state.slotTransforms = {};
  state.selectedSlotIndex = null;
  state.pageIndex = 0;
  resetSlideLayerAnchor(state.pageIndex);
  state.photoSearchQuery = "";
  state.photoFilterMode = "all";

  markImagesDirty();
  markSlideSlotsDirty();

  if (els.imageInput) els.imageInput.value = "";
  if (els.imageFileName) els.imageFileName.textContent = "선택된 사진 없음";

  render();
  queuePersistAssets();
  showToast("사진과 슬라이드를 모두 초기화했습니다.");
}

function findFirstFilledSlotIndexForPage(page) {
  if (Number(page) === state.pageIndex && !isDefaultSlideLayer()) {
    const pageMeta = getCurrentPageSlotMeta();
    for (let offset = 0; offset < pageMeta.pageSize; offset += 1) {
      const slotIndex = pageMeta.slotIndices[offset];
      if (getSlotImageId(slotIndex)) return slotIndex;
    }
    return null;
  }

  const pageMeta = getSlidePages().find((entry) => entry.pageIndex === Number(page));
  if (!pageMeta) return null;
  for (let offset = 0; offset < pageMeta.pageSize; offset += 1) {
    const slotIndex = pageMeta.start + offset;
    if (getSlotImageId(slotIndex)) return slotIndex;
  }
  return null;
}

function findFirstEmptySlotIndexForPage(page = state.pageIndex) {
  if (Number(page) === state.pageIndex && !isDefaultSlideLayer()) {
    const pageMeta = getCurrentPageSlotMeta();
    for (let offset = 0; offset < pageMeta.pageSize; offset += 1) {
      const slotIndex = pageMeta.slotIndices[offset];
      if (!getSlotImageId(slotIndex)) return slotIndex;
    }
    return null;
  }

  const pageMeta = getSlidePages().find((entry) => entry.pageIndex === Number(page));
  if (!pageMeta) return null;
  for (let offset = 0; offset < pageMeta.pageSize; offset += 1) {
    const slotIndex = pageMeta.start + offset;
    if (!getSlotImageId(slotIndex)) return slotIndex;
  }
  return null;
}

function findFirstSlotIndexByImageId(imageId) {
  const defaultIndex = state.slideSlots.findIndex((slotId) => slotId === imageId);
  if (defaultIndex >= 0) return defaultIndex;

  for (const [key, record] of Object.entries(ensureSlideLayerPagesStore())) {
    const parsed = parseSlideLayerKey(key);
    if (!parsed || !record || !Array.isArray(record.slots)) continue;
    const offset = record.slots.findIndex((slotId) => slotId === imageId);
    if (offset >= 0) return getLayerSlotIndex(parsed.page, parsed.layer, offset);
  }
  return -1;
}

function findNextSlotIndexByImageId(imageId, currentSlotIndex = state.selectedSlotIndex) {
  const placements = getImagePlacements().get(imageId) ?? [];
  if (placements.length === 0) return -1;
  if (placements.length === 1) {
    const onlyPlacement = placements[0];
    if ((onlyPlacement.layer ?? DEFAULT_SLIDE_LAYER) !== DEFAULT_SLIDE_LAYER) {
      return getLayerSlotIndex(onlyPlacement.page, onlyPlacement.layer, onlyPlacement.slot - 1);
    }
    const onlyLocation = getSlidePages().find((page) => page.pageIndex === onlyPlacement.page);
    return onlyLocation ? onlyLocation.start + (onlyPlacement.slot - 1) : findFirstSlotIndexByImageId(imageId);
  }

  const slotIndices = placements
    .map(({ page, layer = DEFAULT_SLIDE_LAYER, slot }) => {
      if (layer !== DEFAULT_SLIDE_LAYER) return getLayerSlotIndex(page, layer, slot - 1);
      const pageMeta = getSlidePages().find((entry) => entry.pageIndex === page);
      return pageMeta ? pageMeta.start + (slot - 1) : null;
    })
    .filter((value) => Number.isFinite(value));

  if (slotIndices.length === 0) return findFirstSlotIndexByImageId(imageId);

  const currentIndex = slotIndices.indexOf(Number(currentSlotIndex));
  if (currentIndex < 0) return slotIndices[0];
  return slotIndices[(currentIndex + 1) % slotIndices.length];
}

function goToPageWithSelection(page, slotIndex = null) {
  const location = Number.isFinite(slotIndex) ? getSlotLocation(slotIndex) : null;
  state.pageIndex = clamp(page, 0, Math.max(getTotalPages() - 1, 0));
  state.slideLayerIndex = location?.layer ?? DEFAULT_SLIDE_LAYER;
  state.selectedSlotIndex = Number.isFinite(slotIndex) && slotIndex >= 0 ? slotIndex : null;
  render({ refreshPhotoList: false });
}

function rebuildSlotTransformsFromPages(pages) {
  const nextTransforms = {};
  const layerTransforms = Object.fromEntries(
    Object.entries(state.slotTransforms).filter(([key]) => parseLayerSlotIndex(Number(key))),
  );
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

  state.slotTransforms = {
    ...layerTransforms,
    ...nextTransforms,
  };
}

function captureSlidePageSnapshot(page = state.pageIndex) {
  const pageIndex = Number(page) - 1;
  const pages = getSlidePages();
  if (!Number.isFinite(pageIndex) || pageIndex < 0 || pageIndex >= pages.length) return null;

  const sourcePage = pages[pageIndex];
  return {
    layout: createLayoutConfig(sourcePage.layout.mode, sourcePage.layout.rows, sourcePage.layout.cols),
    pageSize: sourcePage.pageSize,
    slots: [...sourcePage.slots],
    caption: sourcePage.caption,
    transforms: Array.from({ length: sourcePage.pageSize }, (_, offset) => {
      const transform = state.slotTransforms[sourcePage.start + offset];
      return transform ? { ...transform } : null;
    }),
  };
}

function reorderSlidePage(fromPage, toPage) {
  const pages = getSlidePages();
  const fromIndex = Number(fromPage) - 1;
  const toIndex = Number(toPage) - 1;
  if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex) || fromIndex < 0 || toIndex < 0) return;
  if (fromIndex === toIndex || fromIndex >= pages.length || toIndex >= pages.length) return;
  const fromPageNumber = fromIndex + 1;
  const toPageNumber = toIndex + 1;
  beginEditHistoryAction();
  const selectedImageId =
    Number.isFinite(state.selectedSlotIndex) && state.selectedSlotIndex >= 0
      ? getSlotImageId(state.selectedSlotIndex)
      : null;

  const movedPages = [...pages];
  const [moved] = movedPages.splice(fromIndex, 1);
  movedPages.splice(toIndex, 0, moved);

  state.slideSlots = movedPages.flatMap((page) => page.slots);
  state.slideCaptions = movedPages.map((page) => page.caption);
  state.slidePageLayouts = movedPages.map((page) => createLayoutConfig(page.layout.mode, page.layout.rows, page.layout.cols));
  rebuildSlotTransformsFromPages(movedPages);
  remapSlideLayerPages((layerPage) => {
    if (layerPage === fromPageNumber) return { page: toPageNumber };
    if (fromPageNumber < toPageNumber && layerPage > fromPageNumber && layerPage <= toPageNumber) return { page: layerPage - 1 };
    if (fromPageNumber > toPageNumber && layerPage >= toPageNumber && layerPage < fromPageNumber) return { page: layerPage + 1 };
    return { page: layerPage };
  });
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
  resetSlideLayerAnchor(state.pageIndex);

  if (selectedImageId) {
    const nextSelectedSlot = findFirstSlotIndexByImageId(selectedImageId);
    state.selectedSlotIndex = nextSelectedSlot >= 0 ? nextSelectedSlot : null;
  }

  render();
  showToast("슬라이드 순서를 변경했습니다.");
}

function moveCurrentSlide(step = 0) {
  if (state.pageIndex <= 0 || !Number.isFinite(step) || step === 0) return;
  const targetPage = clamp(state.pageIndex + step, 1, getSlidePageCount());
  if (targetPage === state.pageIndex) return;
  reorderSlidePage(state.pageIndex, targetPage);
}

function copySlidePageToClipboard(page = state.pageIndex) {
  const snapshot = captureSlidePageSnapshot(page);
  if (!snapshot) return;
  slideClipboard = snapshot;
  syncDeckStatus();
  showToast("현재 슬라이드를 복사했습니다.");
}

function pasteSlidePageAfter(page = state.pageIndex) {
  if (!slideClipboard) return;

  const pages = getSlidePages();
  const pageIndex = Number(page) - 1;
  if (!Number.isFinite(pageIndex) || pageIndex < 0 || pageIndex >= pages.length) return;
  const pageNumber = pageIndex + 1;

  beginEditHistoryAction();
  const snapshot = {
    layout: createLayoutConfig(slideClipboard.layout.mode, slideClipboard.layout.rows, slideClipboard.layout.cols),
    pageSize: slideClipboard.pageSize,
    slots: [...slideClipboard.slots],
    caption: slideClipboard.caption,
    transforms: slideClipboard.transforms.map((transform) => (transform ? { ...transform } : null)),
  };

  const nextPages = [...pages];
  nextPages.splice(pageIndex + 1, 0, {
    pageIndex: pageIndex + 2,
    start: 0,
    layout: snapshot.layout,
    pageSize: snapshot.pageSize,
    slots: snapshot.slots,
    caption: snapshot.caption,
  });

  state.slideSlots = nextPages.flatMap((entry) => entry.slots);
  state.slideCaptions = nextPages.map((entry) => entry.caption);
  state.slidePageLayouts = nextPages.map((entry) => createLayoutConfig(entry.layout.mode, entry.layout.rows, entry.layout.cols));

  const nextTransforms = {};
  let nextStart = 0;
  nextPages.forEach((entry, nextPageIndex) => {
    const isInsertedSnapshot = nextPageIndex === pageIndex + 1;
    for (let offset = 0; offset < entry.pageSize; offset += 1) {
      const transform = isInsertedSnapshot ? snapshot.transforms[offset] : state.slotTransforms[entry.start + offset];
      if (transform) nextTransforms[nextStart + offset] = { ...transform };
    }
    nextStart += entry.pageSize;
  });
  state.slotTransforms = {
    ...Object.fromEntries(Object.entries(state.slotTransforms).filter(([key]) => parseLayerSlotIndex(Number(key)))),
    ...nextTransforms,
  };
  remapSlideLayerPages((layerPage) => (layerPage >= pageNumber + 1 ? { page: layerPage + 1 } : { page: layerPage }));

  markSlideSlotsDirty();
  markLayoutDirty();
  normalizeSlideCaptions(nextPages.length);
  state.selectedSlotIndex = null;
  goToPage(pageNumber + 1);
  showToast("복사한 슬라이드를 뒤에 붙여넣었습니다.");
}

function clearSlidePage(page = state.pageIndex) {
  if (Number(page) === state.pageIndex && !isDefaultSlideLayer()) {
    const pageMeta = getCurrentPageSlotMeta();
    beginEditHistoryAction();
    let changed = false;
    pageMeta.slotIndices.forEach((slotIndex) => {
      if (getSlotImageId(slotIndex)) {
        writeSlotImageId(slotIndex, null);
        changed = true;
      }
      if (state.slotTransforms[slotIndex]) {
        delete state.slotTransforms[slotIndex];
        changed = true;
      }
    });
    if (!changed) return;
    state.selectedSlotIndex = null;
    markSlideSlotsDirty();
    render();
    showToast("현재 레이어의 사진을 비웠습니다.");
    return;
  }

  const pageMeta = getSlidePages().find((entry) => entry.pageIndex === Number(page));
  if (!pageMeta) return;

  beginEditHistoryAction();
  let changed = false;

  for (let offset = 0; offset < pageMeta.pageSize; offset += 1) {
    const slotIndex = pageMeta.start + offset;
    if (state.slideSlots[slotIndex]) {
      state.slideSlots[slotIndex] = null;
      changed = true;
    }
    if (state.slotTransforms[slotIndex]) {
      delete state.slotTransforms[slotIndex];
      changed = true;
    }
  }

  if (!changed) return;

  if (Number.isFinite(state.selectedSlotIndex)) {
    const selectedSlotIndex = Number(state.selectedSlotIndex);
    if (selectedSlotIndex >= pageMeta.start && selectedSlotIndex < pageMeta.start + pageMeta.pageSize) {
      state.selectedSlotIndex = null;
    }
  }

  markSlideSlotsDirty();
  render();
  showToast("현재 슬라이드의 사진을 비웠습니다.");
}

function insertSlidePage(referencePage, position = "after", { announce = true } = {}) {
  const pages = getSlidePages();
  const referenceIndex = Number(referencePage) - 1;
  if (!Number.isFinite(referenceIndex) || referenceIndex < 0 || referenceIndex >= pages.length) return;
  beginEditHistoryAction();

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
  const insertedPage = insertIndex + 1;
  remapSlideLayerPages((layerPage) => (layerPage >= insertedPage ? { page: layerPage + 1 } : { page: layerPage }));
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
  if (announce) {
    showToast(position === "before" ? "현재 슬라이드 앞에 빈 슬라이드를 추가했습니다." : "현재 슬라이드 뒤에 빈 슬라이드를 추가했습니다.");
  }
}

function addSlidePageAtEnd() {
  const pages = getSlidePages();
  if (pages.length === 0) {
    beginEditHistoryAction();
    const layout = getDefaultLayoutConfig();
    const pageSize = getPageSizeForLayout(layout);
    state.slidePageLayouts.push(createLayoutConfig(layout.mode, layout.rows, layout.cols));
    state.slideSlots.push(...Array(pageSize).fill(null));
    markSlideSlotsDirty();
    markLayoutDirty();
    normalizeSlideCaptions();
    state.selectedSlotIndex = null;
    goToPage(1);
    showToast("빈 슬라이드를 추가했습니다.");
    return;
  }

  insertSlidePage(pages[pages.length - 1].pageIndex, "after", { announce: false });
  showToast("슬라이드 끝에 빈 슬라이드를 추가했습니다.");
}

function duplicateSlidePage(page) {
  const pages = getSlidePages();
  const pageIndex = Number(page) - 1;
  if (!Number.isFinite(pageIndex) || pageIndex < 0 || pageIndex >= pages.length) return;
  const pageNumber = pageIndex + 1;
  beginEditHistoryAction();

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
  state.slotTransforms = {
    ...Object.fromEntries(Object.entries(state.slotTransforms).filter(([key]) => parseLayerSlotIndex(Number(key)))),
    ...nextTransforms,
  };
  remapSlideLayerPages((layerPage) => (layerPage >= pageNumber + 1 ? { page: layerPage + 1 } : { page: layerPage }));
  copySlideLayerPages(pageNumber, pageNumber + 1);

  markSlideSlotsDirty();
  markLayoutDirty();
  normalizeSlideCaptions(nextPages.length);
  state.selectedSlotIndex = null;
  goToPage(pageNumber + 1);
  showToast("현재 슬라이드를 복제했습니다.");
}

function deleteSlidePage(page) {
  const pages = getSlidePages();
  const pageIndex = Number(page) - 1;
  if (!Number.isFinite(pageIndex) || pageIndex < 0 || pageIndex >= pages.length) return;
  const pageNumber = pageIndex + 1;
  beginEditHistoryAction();
  const selectedImageId =
    Number.isFinite(state.selectedSlotIndex) && state.selectedSlotIndex >= 0
      ? getSlotImageId(state.selectedSlotIndex)
      : null;

  const nextPages = pages.filter((_, index) => index !== pageIndex);
  state.slideSlots = nextPages.flatMap((entry) => entry.slots);
  state.slideCaptions = nextPages.map((entry) => entry.caption);
  state.slidePageLayouts = nextPages.map((page) => createLayoutConfig(page.layout.mode, page.layout.rows, page.layout.cols));
  rebuildSlotTransformsFromPages(nextPages);
  remapSlideLayerPages((layerPage) => {
    if (layerPage === pageNumber) return null;
    if (layerPage > pageNumber) return { page: layerPage - 1 };
    return { page: layerPage };
  });
  markSlideSlotsDirty();
  markLayoutDirty();
  normalizeSlideCaptions(nextPages.length);

  const nextTotalPages = 1 + nextPages.length;
  state.pageIndex = clamp(state.pageIndex, 0, Math.max(nextTotalPages - 1, 0));
  if (state.pageIndex === pageNumber) {
    state.pageIndex = Math.max(1, Math.min(pageNumber, nextPages.length));
  } else if (state.pageIndex > pageNumber) {
    state.pageIndex -= 1;
  }
  resetSlideLayerAnchor(state.pageIndex);

  if (selectedImageId) {
    const nextSelectedSlot = findFirstSlotIndexByImageId(selectedImageId);
    state.selectedSlotIndex = nextSelectedSlot >= 0 ? nextSelectedSlot : null;
  } else {
    state.selectedSlotIndex = null;
  }

  render();
  showToast("현재 슬라이드를 삭제했습니다.");
}

function updateSlideCaption(page, value) {
  const pageIndex = Number(page) - 1;
  if (!Number.isFinite(pageIndex) || pageIndex < 0) return;

  const activeLayer = Number(page) === state.pageIndex ? getCurrentSlideLayerStatus()?.currentLayer : DEFAULT_SLIDE_LAYER;
  if (activeLayer && activeLayer !== DEFAULT_SLIDE_LAYER) {
    const layerPage = getLayerSlidePage(page, activeLayer, { create: true });
    if (!layerPage) return;
    state.slideLayerPages[getSlideLayerKey(page, activeLayer)] = {
      layout: createLayoutConfig(layerPage.layout.mode, layerPage.layout.rows, layerPage.layout.cols),
      slots: [...layerPage.slots],
      caption: value,
    };
    markSlideSlotsDirty();

    if (state.pageIndex === page && !getCurrentPageSlotMeta().slots.some(Boolean)) {
      render({ refreshGuidePanel: false, refreshThumbnails: false, refreshPhotoList: false, persist: false });
    }

    queuePersistSettings();
    return;
  }

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
  beginEditHistoryAction();

  state.images.splice(imageIndex, 1);
  markImagesDirty();

  let slotsChanged = false;
  let defaultSlotsChanged = false;
  state.slideSlots = state.slideSlots.map((slotId) => {
    if (slotId !== imageId) return slotId;
    slotsChanged = true;
    defaultSlotsChanged = true;
    return null;
  });
  Object.entries(ensureSlideLayerPagesStore()).forEach(([key, record]) => {
    if (!record || !Array.isArray(record.slots)) return;
    const nextSlots = record.slots.map((slotId) => {
      if (slotId !== imageId) return slotId;
      slotsChanged = true;
      return null;
    });
    state.slideLayerPages[key] = {
      ...record,
      slots: nextSlots,
    };
  });

  if (defaultSlotsChanged) {
    markSlideSlotsDirty();
    trimTrailingEmptySlidePages();
  } else if (slotsChanged) {
    markSlideSlotsDirty();
  }

  const nextTransforms = {};
  for (const [key, transform] of Object.entries(state.slotTransforms)) {
    const slotIndex = Number(key);
    if (getSlotImageId(slotIndex)) {
      nextTransforms[slotIndex] = transform;
    }
  }
  state.slotTransforms = nextTransforms;

  if (state.selectedSlotIndex !== null && getSlotImageId(state.selectedSlotIndex) !== imageId) {
    if (!getSlotImageId(state.selectedSlotIndex)) {
      state.selectedSlotIndex = null;
    }
  }
  if (state.selectedSlotIndex !== null && getSlotImageId(state.selectedSlotIndex) === imageId) {
    state.selectedSlotIndex = null;
  }

  state.pageIndex = clamp(state.pageIndex, 0, Math.max(getTotalPages() - 1, 0));
  resetSlideLayerAnchor(state.pageIndex);
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

  const slidePages = getSlidePages();

  if (state.images.length === 0 && slidePages.length === 0) {
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
          <span class="thumbnail-section-hint">선택 · 순서 변경 · 레이어 편집</span>
          <div class="slide-layer-indicator" aria-label="슬라이드 레이어 이동">
            <button type="button" data-slide-layer-prev aria-label="위 레이어" title="위 레이어">▲</button>
            <output data-slide-layer-status aria-live="polite">1 / 1</output>
            <button type="button" data-slide-layer-next aria-label="아래 레이어" title="아래 레이어">▼</button>
          </div>
        </div>
        <div class="slide-preview-row" tabindex="0" aria-label="슬라이드 목록 3장 묶음">
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
                  data-page="${page.pageIndex}"
                  title="${page.pageIndex}페이지"
                >
                  <button
                    class="slide-drag-handle"
                    type="button"
                    draggable="true"
                    data-slide-drag-handle
                    aria-label="${page.pageIndex}페이지 순서 변경"
                    title="드래그해서 순서 변경"
                  >...</button>
                  <div
                    class="slide-thumb-open has-layer-preview ${state.slideLayerIndex > 1 ? "has-layer-before" : ""} ${state.slideLayerIndex < SLIDE_LAYER_COUNT ? "has-layer-after" : ""}"
                    data-page="${page.pageIndex}"
                  >
                    ${renderSlideThumbLayerStack(page)}
                  </div>
                  <div class="slide-thumb-meta">
                    <span class="slide-thumb-label">#${page.pageIndex}</span>
                    <div class="slide-thumb-actions">
                      <button class="slide-layout-chip ${page.layout.mode === "single" ? "is-active" : ""}" type="button" data-slide-layout="${page.pageIndex}:single">1</button>
                      <button class="slide-layout-chip ${page.layout.mode === "pair" ? "is-active" : ""}" type="button" data-slide-layout="${page.pageIndex}:pair">2</button>
                      <button class="slide-layout-chip ${page.layout.mode === "triple" ? "is-active" : ""}" type="button" data-slide-layout="${page.pageIndex}:triple">3</button>
                      <button class="slide-layout-chip ${page.layout.mode === "quad" ? "is-active" : ""}" type="button" data-slide-layout="${page.pageIndex}:quad">4</button>
                    </div>
                  </div>
                  <input
                    class="slide-caption-input"
                    type="text"
                    data-slide-caption-input="${page.pageIndex}"
                    placeholder="슬라이드 소제목"
                    value="${escapeHtml(page.caption)}"
                  />
                </article>
              `,
            )
            .join("")}
          <button
            class="slide-thumb slide-thumb-add-card"
            type="button"
            data-add-slide-end
            aria-label="빈 슬라이드 추가"
            title="빈 슬라이드 추가"
          >
            <span class="slide-thumb-add-preview" aria-hidden="true">
              <span class="slide-thumb-add-icon">+</span>
            </span>
            <span class="slide-thumb-add-label">빈 슬라이드</span>
          </button>
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
    els.thumbnailRail.querySelector(".slide-preview-row")?.addEventListener("scroll", () => {
      window.requestAnimationFrame(updateSlideLayerIndicators);
    }, { passive: true });
  }

  if (activeThumbnailButton && !els.thumbnailRail.contains(activeThumbnailButton)) {
    activeThumbnailButton = null;
  }

  if (activeThumbnailButton && Number(activeThumbnailButton.dataset.page) === state.pageIndex) {
    syncThumbnailLayerPreview();
    updateSlideLayerIndicators();
    return;
  }

  activeThumbnailButton?.classList.remove("is-active");
  activeThumbnailButton = thumbnailPageButtonCache.get(state.pageIndex) ?? null;
  activeThumbnailButton?.classList.add("is-active");
  revealPanelItem(activeThumbnailButton);
  syncThumbnailSlotSelection();
  syncThumbnailLayerPreview();
  window.requestAnimationFrame(updateSlideLayerIndicators);
}

function renderPhotoList() {
  if (!els.photoListPanel) return;
  updatePhotoFilterUi();

  if (state.images.length === 0) {
    photoListRenderKey = "empty";
    photoListRenderToken += 1;
    activePhotoListCard = null;
    updatePhotoFilterCounts(new Map());
    updatePhotoFilterSummary(0, 0);
    els.photoListPanel.innerHTML = `<p class="photo-list-empty">사진을 업로드하면 전체 목록이 표시됩니다.</p>`;
    unregisterRenderableImageNodesInRoot(els.photoListPanel);
    return;
  }

  const usedCounts = getUsedCounts();
  const placements = getImagePlacements();
  const filteredImages = getFilteredImages(usedCounts);
  updatePhotoFilterCounts(usedCounts);
  const currentPageImageIds = new Set(getCurrentPageSlotMeta().slots.filter(Boolean));
  updatePhotoFilterSummary(filteredImages.length, state.images.length);
  const nextKey = [
    imagesVersion,
    slideSlotsVersion,
    layoutVersion,
    state.pageIndex,
    state.slideLayerIndex,
    state.images.length,
    state.slideSlots.length,
    state.photoSearchQuery,
    state.photoFilterMode,
  ].join(":");

  if (photoListRenderKey === nextKey) return;

  photoListRenderKey = nextKey;
  photoListRenderToken += 1;
  const renderToken = photoListRenderToken;
  unregisterRenderableImageNodesInRoot(els.photoListPanel);
  els.photoListPanel.innerHTML = "";
  activePhotoListCard = null;
  const selectedSlotImageId =
    Number.isFinite(state.selectedSlotIndex) && state.selectedSlotIndex >= 0
      ? getSlotImageId(state.selectedSlotIndex)
      : null;

  if (filteredImages.length === 0) {
    const emptyLabel =
      state.photoSearchQuery.trim() || state.photoFilterMode !== "all"
        ? "조건에 맞는 사진이 없습니다."
        : "사진을 업로드하면 전체 목록이 표시됩니다.";
    els.photoListPanel.innerHTML = `<p class="photo-list-empty">${emptyLabel}</p>`;
    return;
  }

  const cardHtml = (image, index) => {
    const originalIndex = state.images.indexOf(image);
    const usedCount = usedCounts.get(image.id) ?? 0;
    const isOnCurrentPage = currentPageImageIds.has(image.id);
    const placementList = placements.get(image.id) ?? [];
    const firstPlacement = placementList[0];
    const placementText =
      placementList.length === 0
        ? "미배치"
        : placementList.length === 1
          ? `${firstPlacement.page}페이지 ${firstPlacement.layer ?? DEFAULT_SLIDE_LAYER}번 레이어 ${firstPlacement.slot}칸`
          : `${firstPlacement.page}페이지 ${firstPlacement.layer ?? DEFAULT_SLIDE_LAYER}번 레이어 ${firstPlacement.slot}칸 외 ${placementList.length - 1}곳`;
    return `
      <article
        class="photo-list-card ${usedCount > 0 ? "is-in-slide" : "is-unused"} ${selectedSlotImageId === image.id ? "is-active" : ""} ${isOnCurrentPage ? "is-on-current-slide" : ""}"
        draggable="true"
        data-image-id="${image.id}"
        data-index="${originalIndex}"
        title="${escapeHtml(image.name)}"
      >
        <img src="${getRenderableImageUrl(image)}" data-renderable-image-id="${image.id}" alt="" loading="lazy" decoding="async" />
        <div>
          <strong>${originalIndex + 1}</strong>
          <span>${highlightSearchMatch(image.name, state.photoSearchQuery)}</span>
          <em>${usedCount > 0 ? `${isOnCurrentPage ? "현재 슬라이드 · " : ""}슬라이드 포함 ${usedCount} · ${placementText}` : "미배치"}</em>
        </div>
        <b>${usedCount > 0 ? "배치됨" : "미배치"}</b>
        ${isOnCurrentPage ? '<mark class="photo-list-current-badge">현재</mark>' : ""}
        <button class="photo-list-remove" type="button" data-remove-image-id="${image.id}" aria-label="${escapeHtml(image.name)} 삭제">X</button>
      </article>
    `;
  };

  const batchSize = filteredImages.length > 48 ? 24 : filteredImages.length;
  let startIndex = 0;
  const appendBatch = () => {
    if (renderToken !== photoListRenderToken) return;

    const endIndex = Math.min(startIndex + batchSize, filteredImages.length);
    const batchHtml = filteredImages
      .slice(startIndex, endIndex)
      .map((image, offset) => cardHtml(image, startIndex + offset))
      .join("");

    const fragment = createFragmentFromHtml(batchHtml);
    registerRenderableImageNodesInRoot(fragment, els.photoListPanel);
    els.photoListPanel.append(fragment);
    startIndex = endIndex;

    if (startIndex < filteredImages.length) {
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
  if (input instanceof HTMLTextAreaElement) {
    const page = Number(input.dataset.emptySlideCaption);
    if (!Number.isFinite(page) || page <= 0) return;
    updateSlideCaption(page, input.value);
    return;
  }

  const inlineInput = event.target instanceof HTMLInputElement ? event.target.closest("[data-stage-slide-caption]") : null;
  if (!(inlineInput instanceof HTMLInputElement)) return;
  const page = Number(inlineInput.dataset.stageSlideCaption);
  if (!Number.isFinite(page) || page <= 0) return;
  updateSlideCaption(page, inlineInput.value);
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
  if (target?.closest(".guide, .guide-ruler, [data-remove-slot], [data-drag-slot]")) return;

  const slot = target?.closest("[data-slot-index]");
  if (!(slot instanceof HTMLElement)) return;

  const slotIndex = Number(slot.dataset.slotIndex);
  if (!Number.isFinite(slotIndex) || !getSlotImageId(slotIndex)) return;

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

els.stage?.addEventListener("dragstart", (event) => {
  const handle = event.target instanceof Element ? event.target.closest("[data-drag-slot]") : null;
  if (!(handle instanceof HTMLElement) || !event.dataTransfer) return;
  const slotIndex = Number(handle.getAttribute("data-drag-slot"));
  if (!Number.isFinite(slotIndex) || slotIndex < 0 || !getSlotImageId(slotIndex)) {
    event.preventDefault();
    return;
  }

  event.dataTransfer.setData("application/x-medical-slot-index", String(slotIndex));
  event.dataTransfer.setData("application/x-medical-slot-drag-mode", event.altKey ? "copy" : "move");
  event.dataTransfer.effectAllowed = event.altKey ? "copyMove" : "move";
  selectSlot(slotIndex);
});

els.stage?.addEventListener("contextmenu", (event) => {
  const guide = event.target instanceof Element ? event.target.closest(".guide") : null;
  if (guide instanceof HTMLElement) {
    event.preventDefault();
    const index = Number(guide.dataset.guideIndex);
    const current = state.guides[index]?.percent ?? 50;
    const next = window.prompt("안내선 위치를 퍼센트로 입력하세요.", current.toFixed(1));
    if (next === null) return;
    const value = Number(next);
    if (!Number.isFinite(value)) return;
    updateGuide(index, value);
    return;
  }

  const slot = event.target instanceof Element ? event.target.closest("[data-slot-index]") : null;
  if (slot instanceof HTMLElement) {
    const slotIndex = Number(slot.dataset.slotIndex);
    if (Number.isFinite(slotIndex) && slotIndex >= 0 && getSlotImageId(slotIndex)) {
      event.preventDefault();
      selectSlot(slotIndex);
      openSlotContextMenu(slotIndex, event.clientX, event.clientY);
      return;
    }
  }

  if (state.pageIndex <= 0) return;
  event.preventDefault();
  openSlideContextMenu(state.pageIndex, event.clientX, event.clientY);
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
  if (!Number.isFinite(slotIndex)) return;
  selectSlot(slotIndex);
});

els.stage?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target instanceof Element ? event.target.closest("[data-slot-index]") : null;
  if (!(target instanceof HTMLElement)) return;
  const slotIndex = Number(target.dataset.slotIndex);
  if (!Number.isFinite(slotIndex)) return;
  event.preventDefault();
  selectSlot(slotIndex);
});

els.stage?.addEventListener("dragover", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-slot-index]") : null;
  if (!(target instanceof HTMLElement)) return;
  event.preventDefault();
  if (Array.from(event.dataTransfer?.types ?? []).includes("application/x-medical-slot-index")) {
    const dragMode = event.dataTransfer?.getData("application/x-medical-slot-drag-mode");
    event.dataTransfer.dropEffect = dragMode === "copy" ? "copy" : "move";
  }
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
  const fromSlotIndex = Number(event.dataTransfer?.getData("application/x-medical-slot-index"));
  if (Number.isFinite(fromSlotIndex)) {
    const dragMode = event.dataTransfer?.getData("application/x-medical-slot-drag-mode");
    moveOrSwapSlotContent(fromSlotIndex, slotIndex, { copy: dragMode === "copy" });
    return;
  }
  const payload = event.dataTransfer?.getData("application/x-medical-presenter");
  if (payload === "empty") {
    setSlot(slotIndex, null);
    return;
  }
  if (payload) setSlot(slotIndex, payload);
});

els.stage?.addEventListener("dragend", () => {
  activeStageSlotDropTarget?.classList.remove("is-drop-target");
  activeStageSlotDropTarget = null;
});

els.thumbnailRail?.addEventListener("click", (event) => {
  if (thumbnailRailSuppressClickUntil > performance.now()) {
    event.preventDefault();
    return;
  }
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest("[data-slide-caption-input]")) return;
  const addSlideEndButton = target?.closest("[data-add-slide-end]");
  if (addSlideEndButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    addSlidePageAtEnd();
    return;
  }
  const slideLayerPrevButton = target?.closest("[data-slide-layer-prev]");
  if (slideLayerPrevButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    goToAdjacentSlideLayer(-1);
    return;
  }
  const slideLayerNextButton = target?.closest("[data-slide-layer-next]");
  if (slideLayerNextButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    goToAdjacentSlideLayer(1);
    return;
  }
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
  if (slotThumb instanceof HTMLElement && event.altKey) {
    const slotIndex = Number(slotThumb.getAttribute("data-slot-thumb-index"));
    if (!Number.isFinite(slotIndex)) return;
    const location = getSlotLocation(slotIndex);
    if (!location) return;
    goToPageWithSelection(location.page, getSlotImageId(slotIndex) ? slotIndex : null);
    return;
  }

  if (target?.closest("[data-slide-drag-handle]")) return;

  const slideThumb = target?.closest("[data-page]");
  if (slideThumb instanceof HTMLElement) {
    const page = Number(slideThumb.dataset.page);
    if (!Number.isFinite(page)) return;
    goToPageWithSelection(page, null);
    return;
  }
});

els.thumbnailRail?.addEventListener("wheel", (event) => {
  const row = event.target instanceof Element ? event.target.closest(".slide-preview-row, .photo-order-row") : null;
  if (!(row instanceof HTMLElement)) return;
  if (row.scrollWidth <= row.clientWidth) return;

  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;
  row.scrollLeft += delta;
  event.preventDefault();
}, { passive: false });

els.thumbnailRail?.addEventListener("pointerdown", (event) => {
  const dragHandle = event.target instanceof Element ? event.target.closest("[data-slide-drag-handle]") : null;
  if (dragHandle instanceof HTMLElement && event.button === 0) {
    const card = dragHandle.closest(".slide-thumb-editor");
    const page = Number(card?.getAttribute("data-page"));
    if (!(card instanceof HTMLElement) || !Number.isFinite(page)) return;
    activeSlideHandleDrag = {
      pointerId: event.pointerId,
      source: card,
      page,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    activeSlideReorderSource = card;
    dragHandle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return;
  }

  const row = event.target instanceof Element ? event.target.closest(".slide-preview-row, .photo-order-row") : null;
  if (!(row instanceof HTMLElement) || event.button !== 0) return;
  if (row.scrollWidth <= row.clientWidth) return;
  if (event.target instanceof Element && event.target.closest("input, button, label")) return;

  activeThumbnailRailPan = {
    row,
    pointerId: event.pointerId,
    startX: event.clientX,
    startScrollLeft: row.scrollLeft,
    moved: false,
  };
  row.classList.add("is-grabbed");
  event.preventDefault();
});

els.thumbnailRail?.addEventListener("input", (event) => {
  const input = event.target instanceof HTMLInputElement ? event.target.closest("[data-slide-caption-input]") : null;
  if (!(input instanceof HTMLInputElement)) return;
  updateSlideCaption(Number(input.dataset.slideCaptionInput), input.value);
});

els.thumbnailRail?.addEventListener("dragstart", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const handle = target?.closest("[data-slide-drag-handle]");
  const card = handle?.closest(".slide-thumb-editor");
  if (!(card instanceof HTMLElement) || !event.dataTransfer) return;
  event.dataTransfer.setData("application/x-medical-slide-page", card.dataset.page);
  event.dataTransfer.setData("text/plain", card.dataset.page || "");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.dropEffect = "move";
  event.dataTransfer.setDragImage(card, card.offsetWidth / 2, Math.min(card.offsetHeight / 2, 96));
  startSlideReorderVisuals(card);
});

els.thumbnailRail?.addEventListener("dragover", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".slide-thumb-editor") : null;
  if (!(card instanceof HTMLElement)) return;
  if (activeSlideReorderSource === card) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  setSlideReorderTarget(card);
});

els.thumbnailRail?.addEventListener("dragleave", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".slide-thumb-editor") : null;
  if (!(card instanceof HTMLElement)) return;
  const nextTarget = event.relatedTarget instanceof Element ? event.relatedTarget.closest(".slide-thumb-editor") : null;
  if (nextTarget === card) return;
  if (activeSlideReorderTarget === card) setSlideReorderTarget(null);
});

els.thumbnailRail?.addEventListener("drop", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".slide-thumb-editor") : null;
  if (!(card instanceof HTMLElement)) return;
  if (activeSlideReorderSource === card) return;
  event.preventDefault();

  const fromPage = Number(event.dataTransfer?.getData("application/x-medical-slide-page"));
  const toPage = Number(card.dataset.page);
  cleanupSlideReorderVisuals();
  if (!Number.isFinite(fromPage) || !Number.isFinite(toPage) || fromPage === toPage) return;
  reorderSlidePage(fromPage, toPage);
});

els.thumbnailRail?.addEventListener("dragend", () => {
  cleanupSlideReorderVisuals();
  thumbnailRailSuppressClickUntil = performance.now() + 180;
});

els.thumbnailRail?.addEventListener("contextmenu", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".slide-thumb-editor") : null;
  if (!(card instanceof HTMLElement)) return;
  if (event.target instanceof Element && event.target.closest("[data-slide-caption-input]")) return;
  event.preventDefault();
  const page = Number(card.dataset.page);
  if (!Number.isFinite(page)) return;
  openSlideContextMenu(page, event.clientX, event.clientY);
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

  const targetSlotIndex = resolvePhotoListTargetSlotIndex();
  if (Number.isFinite(targetSlotIndex)) {
    assignImageToSlot(targetSlotIndex, imageId);
    return;
  }

  const slotIndex = findNextSlotIndexByImageId(imageId);
  if (slotIndex < 0) return;
  const location = getSlotLocation(slotIndex);
  if (!location) return;
  goToPageWithSelection(location.page, slotIndex);
  showToast(`${getSlotDisplayLabel(slotIndex)}으로 이동했습니다.`);
});

els.photoListPanel?.addEventListener("dblclick", (event) => {
  const card = event.target instanceof Element ? event.target.closest(".photo-list-card") : null;
  if (!(card instanceof HTMLElement)) return;
  const imageId = card.dataset.imageId;
  if (!imageId) return;

  const targetSlotIndex = resolvePhotoListTargetSlotIndex();
  if (!Number.isFinite(targetSlotIndex)) return;

  event.preventDefault();
  assignImageToSlot(targetSlotIndex, imageId, { advance: true });
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

els.slideContextMenu?.addEventListener("click", (event) => {
  const actionButton = event.target instanceof Element ? event.target.closest("[data-slide-context-action]") : null;
  if (!(actionButton instanceof HTMLButtonElement)) return;
  const action = actionButton.dataset.slideContextAction;
  if (!action) return;
  runSlideContextAction(action);
  closeSlideContextMenu();
});

els.slotContextMenu?.addEventListener("click", (event) => {
  const actionButton = event.target instanceof Element ? event.target.closest("[data-slot-context-action]") : null;
  if (!(actionButton instanceof HTMLButtonElement)) return;
  const action = actionButton.dataset.slotContextAction;
  if (!action || actionButton.disabled) return;
  runSlotContextAction(action);
  closeSlotContextMenu();
});

els.sortMode.addEventListener("change", () => {
  state.sortMode = els.sortMode.value;
  imageSortDirty = true;
  render();
});

els.photoSearchInput?.addEventListener("input", () => {
  setPhotoSearchQuery(els.photoSearchInput.value);
});

els.photoSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!els.photoSearchInput.value) return;
    event.preventDefault();
    setPhotoSearchQuery("");
    els.photoSearchInput.value = "";
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (!activateVisiblePhotoSearchResult(event.shiftKey ? -1 : 1)) {
      showToast("검색 결과가 없습니다.");
    }
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!activateVisiblePhotoSearchResult(event.key === "ArrowUp" ? -1 : 1)) {
      showToast("검색 결과가 없습니다.");
    }
  }
});

els.photoSearchClearButton?.addEventListener("click", () => {
  setPhotoSearchQuery("");
  els.photoSearchInput?.focus();
});
els.photoFilterResetButton?.addEventListener("click", resetPhotoFilters);

els.photoFilterAllButton?.addEventListener("click", () => setPhotoFilterMode("all"));
els.photoFilterCurrentButton?.addEventListener("click", () => setPhotoFilterMode("current"));
els.photoFilterPlacedButton?.addEventListener("click", () => setPhotoFilterMode("placed"));
els.photoFilterUnplacedButton?.addEventListener("click", () => setPhotoFilterMode("unplaced"));

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
els.pageJumpButton?.addEventListener("click", submitPageJump);
els.pageJumpInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  submitPageJump();
});
els.moveSlidePrevButton?.addEventListener("click", () => {
  moveCurrentSlide(-1);
});
els.moveSlideNextButton?.addEventListener("click", () => {
  moveCurrentSlide(1);
});
els.copySlideButton?.addEventListener("click", () => {
  copySlidePageToClipboard(state.pageIndex);
});
els.pasteSlideButton?.addEventListener("click", () => {
  pasteSlidePageAfter(state.pageIndex);
});
els.clearSlideButton?.addEventListener("click", () => {
  if (state.pageIndex <= 0) return;
  clearSlidePage(state.pageIndex);
});
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
els.presentButton.addEventListener("click", () => {
  goToPage(0);
  startPresentationMode({ autoplay: false });
});
els.autoplayButton?.addEventListener("click", () => {
  goToPage(0);
  startPresentationMode({ autoplay: true });
});
els.autoplaySeconds?.addEventListener("input", (event) => updateAutoplaySeconds(event.target.value));
els.shortcutHelpButton.addEventListener("click", showShortcutHelp);
els.closeShortcutHelpButton.addEventListener("click", hideShortcutHelp);
els.shortcutDialog.addEventListener("click", closeDialogFromBackdrop);
els.exportButton.addEventListener("click", exportStandaloneHtml);
els.openPagesButton.addEventListener("click", () => {
  window.open("https://github.com/notoow/medical-image-presenter", "_blank", "noopener,noreferrer");
});
els.downloadImagesButton.addEventListener("click", downloadAdjustedImages);
els.slideExportSize?.addEventListener("change", () => setSlideExportSize(els.slideExportSize.value));
els.downloadCurrentSlideButton?.addEventListener("click", downloadCurrentSlidePng);
els.downloadAllSlidesButton?.addEventListener("click", downloadAllSlidesPng);
els.backgroundMusicInput?.addEventListener("change", async (event) => {
  const [file] = Array.from(event.target.files ?? []);
  if (!file) return;
  await loadBackgroundMusic(file);
});
els.clearBackgroundMusicButton?.addEventListener("click", clearBackgroundMusic);
els.emptySlotToken.addEventListener("dragstart", (event) => {
  event.dataTransfer.setData("application/x-medical-presenter", "empty");
});
els.addEmptySlotButton.addEventListener("click", addEmptySlot);
els.resetAllButton.addEventListener("click", resetAllPhotosAndSlides);
els.clearSlideSlotsButton.addEventListener("click", clearSlideSlots);
els.undoButton?.addEventListener("click", undoEditHistory);
els.redoButton?.addEventListener("click", redoEditHistory);
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
  beginEditHistoryAction();
  state.slotTransforms[slotIndex] = getDefaultSlotTransform();
  render();
});
els.slotFitButton?.addEventListener("click", () => setSelectedSlotFitMode("fit"));
els.slotFillButton?.addEventListener("click", () => setSelectedSlotFitMode("fill"));
els.flipSlotXButton?.addEventListener("click", () => toggleSelectedSlotFlip("x"));
els.flipSlotYButton?.addEventListener("click", () => toggleSelectedSlotFlip("y"));
els.copySlotTransformButton?.addEventListener("click", copySelectedSlotTransform);
els.pasteSlotTransformButton?.addEventListener("click", pasteSelectedSlotTransform);
els.applySlotTransformToPageButton?.addEventListener("click", applySelectedSlotTransformToCurrentPage);
els.applySlotTransformToAllButton?.addEventListener("click", applySelectedSlotTransformToAllSlides);
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
  beginEditHistoryAction();
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

  if (hasSlideShortcutModifier(event) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (event.shiftKey) {
      resetPhotoFilters();
    } else {
      focusPhotoSearch();
    }
    return;
  }

  if (hasSlideShortcutModifier(event) && !event.shiftKey && event.key.toLowerCase() === "j") {
    event.preventDefault();
    els.pageJumpInput?.focus();
    els.pageJumpInput?.select?.();
    return;
  }

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
    if (els.slotContextMenu?.getAttribute("aria-hidden") === "false") {
      closeSlotContextMenu();
      return;
    }
    if (els.slideContextMenu?.getAttribute("aria-hidden") === "false") {
      closeSlideContextMenu();
      return;
    }

    if (isPresenting()) {
      stopPresentationMode();
    }
  }

  if (state.pageIndex > 0 && event.key === "Tab") {
    event.preventDefault();
    selectAdjacentSlot(event.shiftKey ? -1 : 1);
    return;
  }

  if (
    state.pageIndex > 0 &&
    event.altKey &&
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
  ) {
    event.preventDefault();
    const amount = event.shiftKey ? 5 : 1;
    const directionMap = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };
    nudgeSelectedSlotPosition(directionMap[event.key], amount);
    return;
  }

  if (state.pageIndex > 0 && event.altKey && (event.key === "[" || event.key === "]")) {
    event.preventDefault();
    const amount = event.shiftKey ? 5 : 1;
    nudgeSelectedSlotScale(event.key === "[" ? -amount : amount);
    return;
  }

  if (state.pageIndex > 0 && event.altKey && (event.key === "," || event.key === ".")) {
    event.preventDefault();
    const amount = event.shiftKey ? 5 : 1;
    nudgeSelectedSlotRotate(event.key === "," ? -amount : amount);
    return;
  }

  if (state.pageIndex > 0 && event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      setSelectedSlotFitMode("fit");
      return;
    }
    if (event.key.toLowerCase() === "g") {
      event.preventDefault();
      setSelectedSlotFitMode("fill");
      return;
    }
    if (event.key.toLowerCase() === "h") {
      event.preventDefault();
      toggleSelectedSlotFlip("x");
      return;
    }
    if (event.key.toLowerCase() === "j") {
      event.preventDefault();
      toggleSelectedSlotFlip("y");
      return;
    }
    if (event.key.toLowerCase() === "c") {
      event.preventDefault();
      copySelectedSlotTransform();
      return;
    }
    if (event.key.toLowerCase() === "v") {
      event.preventDefault();
      pasteSelectedSlotTransform();
      return;
    }
  }

  if (state.pageIndex > 0 && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
    if (event.key.toLowerCase() === "v") {
      event.preventDefault();
      applySelectedSlotTransformToCurrentPage();
      return;
    }
    if (event.key.toLowerCase() === "a") {
      event.preventDefault();
      applySelectedSlotTransformToAllSlides();
      return;
    }
  }

  if (hasSlideShortcutModifier(event) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      redoEditHistory();
    } else {
      undoEditHistory();
    }
    return;
  }

  if (
    state.pageIndex > 0 &&
    event.shiftKey &&
    !hasSlideShortcutModifier(event) &&
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
  ) {
    event.preventDefault();
    const directionMap = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };
    selectDirectionalSlot(directionMap[event.key]);
    return;
  }

  if (state.pageIndex > 0 && event.key === "Backspace") {
    const selectedSlotIndex = Number(state.selectedSlotIndex);
    if (Number.isFinite(selectedSlotIndex) && selectedSlotIndex >= 0) {
      event.preventDefault();
      setSlot(selectedSlotIndex, null);
      return;
    }
  }

  if (state.pageIndex > 0 && hasSlideShortcutModifier(event) && event.key.toLowerCase() === "d") {
    event.preventDefault();
    duplicateSlidePage(state.pageIndex);
    return;
  }

  if (state.pageIndex > 0 && hasSlideShortcutModifier(event) && !event.shiftKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    copySlidePageToClipboard(state.pageIndex);
    return;
  }

  if (state.pageIndex > 0 && hasSlideShortcutModifier(event) && !event.shiftKey && event.key.toLowerCase() === "v") {
    event.preventDefault();
    pasteSlidePageAfter(state.pageIndex);
    return;
  }

  if (state.pageIndex > 0 && hasSlideShortcutModifier(event) && event.key === "Backspace") {
    event.preventDefault();
    clearSlidePage(state.pageIndex);
    return;
  }

  if (state.pageIndex > 0 && hasSlideShortcutModifier(event) && event.key.toLowerCase() === "m") {
    event.preventDefault();
    insertSlidePage(state.pageIndex, event.shiftKey ? "before" : "after");
    return;
  }

  if (
    state.pageIndex > 0 &&
    hasSlideShortcutModifier(event) &&
    event.shiftKey &&
    (event.key === "ArrowLeft" || event.key === "ArrowRight")
  ) {
    event.preventDefault();
    moveCurrentSlide(event.key === "ArrowLeft" ? -1 : 1);
    return;
  }

  if (state.pageIndex > 0 && event.key === "Delete") {
    event.preventDefault();
    if (window.confirm(`${state.pageIndex}페이지를 삭제할까요?`)) {
      deleteSlidePage(state.pageIndex);
    }
    return;
  }

  if (
    state.pageIndex > 0 &&
    !isPresenting() &&
    !event.shiftKey &&
    !hasSlideShortcutModifier(event) &&
    (event.key === "ArrowUp" || event.key === "ArrowDown") &&
    goToAdjacentSlideLayer(event.key === "ArrowDown" ? 1 : -1)
  ) {
    event.preventDefault();
    return;
  }

  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "p") {
    event.preventDefault();
    goToPage(state.pageIndex - 1);
  }

  if (
    event.key === "ArrowRight" ||
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
    startPresentationMode({ autoplay: false });
  }

  if (event.key === "F6") {
    event.preventDefault();
    if (!event.shiftKey) goToPage(0);
    startPresentationMode({ autoplay: true });
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

  if (event.key.toLowerCase() === "a" && isPresenting()) {
    event.preventDefault();
    toggleAutoplayPresentation();
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
      backgroundMusicUrl: state.backgroundMusicUrl,
      backgroundMusicName: state.backgroundMusicName,
    },
    coverVisibility: state.coverVisibility,
    images: state.images,
    slideSlots: state.slideSlots,
    slideCaptions: state.slideCaptions,
    slidePageLayouts: state.slidePageLayouts,
    slideLayerPages: state.slideLayerPages,
    slotTransforms: state.slotTransforms,
    layoutMode: state.layoutMode,
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    sortMode: state.sortMode,
    slideExportSize: state.slideExportSize,
    fitMode: state.fitMode,
    backgroundEnabled: state.backgroundEnabled,
    autoplaySeconds: state.autoplaySeconds,
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
    slideLayerPages: state.slideLayerPages,
    slotTransforms: state.slotTransforms,
    layoutMode: state.layoutMode,
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    sortMode: state.sortMode,
    slideExportSize: state.slideExportSize,
    fitMode: state.fitMode,
    backgroundEnabled: state.backgroundEnabled,
    autoplaySeconds: state.autoplaySeconds,
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
    backgroundMusicUrl: state.backgroundMusicUrl,
    backgroundMusicName: state.backgroundMusicName,
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

function getSlideExportSize() {
  const key = Object.hasOwn(SLIDE_EXPORT_SIZES, state.slideExportSize)
    ? state.slideExportSize
    : DEFAULT_SLIDE_EXPORT_SIZE;
  return SLIDE_EXPORT_SIZES[key];
}

function setSlideExportSize(value) {
  state.slideExportSize = Object.hasOwn(SLIDE_EXPORT_SIZES, value) ? value : DEFAULT_SLIDE_EXPORT_SIZE;
  if (els.slideExportSize) els.slideExportSize.value = state.slideExportSize;
  queuePersistSettings();
}

function safeFileNamePart(value, fallback = "slide") {
  const normalized = String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return normalized || fallback;
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundedRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  const paragraphs = String(text || "").split(/\r?\n/);
  const lines = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      return;
    }
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
        return;
      }
      lines.push(line);
      line = word;
    });
    if (line) lines.push(line);
  });

  const visibleLines = lines.slice(0, maxLines);
  visibleLines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return visibleLines.length * lineHeight;
}

function setCanvasFont(ctx, weight, size, lineHeight = 1.1) {
  ctx.font = `${weight} ${size}px Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textBaseline = "top";
  return size * lineHeight;
}

function drawStageCanvasBackground(ctx, width, height) {
  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#22221e");
  base.addColorStop(0.62, "#151512");
  base.addColorStop(1, "#0a0a09");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.16, height * 0.12, 0, width * 0.16, height * 0.12, width * 0.58);
  glow.addColorStop(0, "rgba(255,255,255,0.16)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function getImageDrawRect(sourceWidth, sourceHeight, targetWidth, targetHeight, mode = "contain") {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  const cover = mode === "cover";
  const matchWidth = cover ? sourceRatio < targetRatio : sourceRatio > targetRatio;
  const width = matchWidth ? targetWidth : targetHeight * sourceRatio;
  const height = matchWidth ? targetWidth / sourceRatio : targetHeight;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

async function drawCoverToCanvas(ctx, width, height) {
  drawStageCanvasBackground(ctx, width, height);

  const cardWidth = width * 0.52;
  const cardHeight = height * 0.5;
  const cardX = (width - cardWidth) / 2;
  const cardY = (height - cardHeight) / 2;
  const cardRadius = width * 0.022;
  fillRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius, "rgba(255,253,247,0.08)");
  strokeRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius, "rgba(255,253,247,0.18)", Math.max(1, width * 0.001));

  const pad = width * 0.034;
  let cursorY = cardY + pad;
  const contentX = cardX + pad;
  const contentWidth = cardWidth - pad * 2;

  if (state.coverVisibility.logo && state.logoUrl) {
    try {
      const logo = await imageFromDataUrl(state.logoUrl);
      const logoMaxWidth = width * 0.09;
      const logoMaxHeight = height * 0.12;
      const rect = getImageDrawRect(logo.naturalWidth, logo.naturalHeight, logoMaxWidth, logoMaxHeight, "contain");
      ctx.drawImage(logo, contentX + rect.x, cursorY + rect.y, rect.width, rect.height);
      cursorY += logoMaxHeight + height * 0.03;
    } catch {
      cursorY += height * 0.03;
    }
  }

  if (state.coverVisibility.title) {
    ctx.fillStyle = "#fffdf7";
    const titleLineHeight = setCanvasFont(ctx, 900, width * 0.042, 0.98);
    cursorY += drawWrappedText(ctx, els.coverTitle.value, contentX, cursorY, contentWidth * 0.78, titleLineHeight, 3);
    cursorY += height * 0.018;
  }

  if (state.coverVisibility.subtitle) {
    ctx.fillStyle = "rgba(255,253,247,0.72)";
    const subtitleLineHeight = setCanvasFont(ctx, 700, width * 0.015, 1.25);
    cursorY += drawWrappedText(ctx, els.coverSubtitle.value, contentX, cursorY, contentWidth, subtitleLineHeight, 2);
    cursorY += height * 0.028;
  }

  const meta = [
    state.coverVisibility.hospitalName ? els.hospitalName.value : "",
    state.coverVisibility.presenterName ? els.presenterName.value : "",
    state.coverVisibility.date ? new Date().toLocaleDateString("ko-KR") : "",
  ].filter(Boolean);
  if (meta.length > 0) {
    ctx.fillStyle = "rgba(255,253,247,0.82)";
    const metaLineHeight = setCanvasFont(ctx, 700, width * 0.01, 1);
    let cursorX = contentX;
    meta.forEach((item) => {
      const text = String(item);
      const chipWidth = ctx.measureText(text).width + width * 0.018;
      const chipHeight = metaLineHeight + height * 0.012;
      fillRoundedRect(ctx, cursorX, cursorY, chipWidth, chipHeight, chipHeight / 2, "rgba(255,253,247,0.07)");
      strokeRoundedRect(ctx, cursorX, cursorY, chipWidth, chipHeight, chipHeight / 2, "rgba(255,253,247,0.2)", Math.max(1, width * 0.0006));
      ctx.fillText(text, cursorX + width * 0.009, cursorY + height * 0.006);
      cursorX += chipWidth + width * 0.008;
    });
  }
}

async function drawImageSlotToCanvas(ctx, image, slotIndex, rect, stageWidth, stageHeight) {
  const radius = stageWidth * 0.014;
  fillRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, radius, "#111");

  if (!image) {
    strokeRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, radius, "rgba(255,253,247,0.22)", Math.max(1, stageWidth * 0.001));
    ctx.fillStyle = "rgba(255,253,247,0.58)";
    const lineHeight = setCanvasFont(ctx, 800, stageWidth * 0.014, 1.1);
    ctx.textAlign = "center";
    ctx.fillText("빈칸", rect.x + rect.width / 2, rect.y + rect.height / 2 - lineHeight / 2);
    ctx.textAlign = "left";
    return;
  }

  const loaded = await imageFromDataUrl(image.url);
  const transform = getSlotTransform(slotIndex);
  const fitMode = getEffectiveSlotFitMode(slotIndex, transform);
  const cropLeft = clamp(state.crop.left + transform.cropLeft, 0, 95);
  const cropRight = clamp(state.crop.right + transform.cropRight, 0, 95);
  const cropTop = clamp(state.crop.top + transform.cropTop, 0, 95);
  const cropBottom = clamp(state.crop.bottom + transform.cropBottom, 0, 95);
  const cropLeftPx = Math.round(loaded.naturalWidth * (cropLeft / 100));
  const cropRightPx = Math.round(loaded.naturalWidth * (cropRight / 100));
  const cropTopPx = Math.round(loaded.naturalHeight * (cropTop / 100));
  const cropBottomPx = Math.round(loaded.naturalHeight * (cropBottom / 100));
  const sourceWidth = Math.max(1, loaded.naturalWidth - cropLeftPx - cropRightPx);
  const sourceHeight = Math.max(1, loaded.naturalHeight - cropTopPx - cropBottomPx);

  ctx.save();
  roundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, radius);
  ctx.clip();

  if (state.backgroundEnabled) {
    const bgScale = state.backgroundFilters.scale / 100;
    const coverRect = getImageDrawRect(sourceWidth, sourceHeight, rect.width * bgScale, rect.height * bgScale, "cover");
    ctx.save();
    ctx.filter = getBackgroundFilterStyle();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(
      loaded,
      cropLeftPx,
      cropTopPx,
      sourceWidth,
      sourceHeight,
      rect.x + (rect.width - rect.width * bgScale) / 2 + coverRect.x,
      rect.y + (rect.height - rect.height * bgScale) * (state.backgroundFilters.y / 100) + coverRect.y,
      coverRect.width,
      coverRect.height,
    );
    ctx.restore();
  }

  const imageRect = getImageDrawRect(sourceWidth, sourceHeight, rect.width, rect.height, fitMode === "fill" ? "cover" : "contain");
  const scale = state.zoom * (transform.scale / 100);
  const scaleX = scale * (transform.flipX ? -1 : 1);
  const scaleY = scale * (transform.flipY ? -1 : 1);
  ctx.save();
  ctx.translate(rect.x + rect.width / 2 + (transform.x / 100) * rect.width, rect.y + rect.height / 2 + (transform.y / 100) * rect.height);
  ctx.rotate((transform.rotate * Math.PI) / 180);
  ctx.scale(scaleX, scaleY);
  ctx.filter = getFilterStyle();
  ctx.drawImage(
    loaded,
    cropLeftPx,
    cropTopPx,
    sourceWidth,
    sourceHeight,
    -rect.width / 2 + imageRect.x,
    -rect.height / 2 + imageRect.y,
    imageRect.width,
    imageRect.height,
  );
  ctx.restore();

  ctx.restore();

  const labelText = image.name || "";
  if (labelText) {
    const labelFontSize = stageWidth * 0.0088;
    const labelPaddingX = stageWidth * 0.006;
    const labelPaddingY = stageHeight * 0.005;
    const lineHeight = setCanvasFont(ctx, 700, labelFontSize, 1);
    const labelWidth = Math.min(rect.width - labelPaddingX * 2, ctx.measureText(labelText).width + labelPaddingX * 2);
    const labelHeight = lineHeight + labelPaddingY * 2;
    const x = rect.x + rect.width - labelWidth - stageWidth * 0.007;
    const y = rect.y + rect.height - labelHeight - stageHeight * 0.01;
    fillRoundedRect(ctx, x, y, labelWidth, labelHeight, labelHeight / 2, "rgba(10,10,10,0.56)");
    ctx.fillStyle = "rgba(255,253,247,0.88)";
    ctx.fillText(labelText, x + labelPaddingX, y + labelPaddingY);
  }
}

async function drawSlidePageToCanvas(ctx, page, width, height) {
  drawStageCanvasBackground(ctx, width, height);
  const layout = page.layout;
  const rows = layout.mode === "custom" ? layout.rows : layout.mode === "quad" ? 2 : 1;
  const cols =
    layout.mode === "custom"
      ? layout.cols
      : layout.mode === "single"
        ? 1
        : layout.mode === "quad"
          ? 2
          : getPageSizeForLayout(layout);
  const gap = Math.max(12, width * 0.018);
  const pad = Math.max(18, width * 0.022);
  const gridWidth = width - pad * 2;
  const gridHeight = height - pad * 2;
  const cellWidth = (gridWidth - gap * (cols - 1)) / cols;
  const cellHeight = (gridHeight - gap * (rows - 1)) / rows;

  await Promise.all(
    page.slots.map((imageId, offset) => {
      const row = Math.floor(offset / cols);
      const col = offset % cols;
      const rect = {
        x: pad + col * (cellWidth + gap),
        y: pad + row * (cellHeight + gap),
        width: cellWidth,
        height: cellHeight,
      };
      const slotIndex = page.slotIndices?.[offset] ?? page.start + offset;
      return drawImageSlotToCanvas(ctx, getImageById(imageId), slotIndex, rect, width, height);
    }),
  );

  const caption = String(page.caption || "").trim();
  const isEmptySlide = page.slots.length > 0 && page.slots.every((slot) => !slot);
  if (!caption) return;

  if (isEmptySlide) {
    const boxWidth = Math.min(width * 0.72, width - pad * 2);
    const boxX = (width - boxWidth) / 2;
    const lineHeight = setCanvasFont(ctx, 900, width * 0.024, 1.18);
    const boxHeight = lineHeight + height * 0.06;
    const boxY = (height - boxHeight) / 2;
    fillRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, width * 0.012, "rgba(10,10,10,0.56)");
    strokeRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, width * 0.012, "rgba(255,253,247,0.16)", Math.max(1, width * 0.0008));
    ctx.fillStyle = "rgba(255,253,247,0.9)";
    ctx.textAlign = "center";
    drawWrappedText(ctx, caption, width / 2, boxY + height * 0.03, boxWidth - width * 0.04, lineHeight, 2);
    ctx.textAlign = "left";
    return;
  }

  const fontSize = width * 0.016;
  const lineHeight = setCanvasFont(ctx, 800, fontSize, 1.15);
  const textWidth = Math.min(width * 0.44, ctx.measureText(caption).width + width * 0.026);
  const textHeight = lineHeight + height * 0.026;
  const textX = pad;
  const textY = pad;
  fillRoundedRect(ctx, textX, textY, textWidth, textHeight, textHeight / 2, "rgba(10,10,10,0.52)");
  strokeRoundedRect(ctx, textX, textY, textWidth, textHeight, textHeight / 2, "rgba(255,253,247,0.16)", Math.max(1, width * 0.0008));
  ctx.fillStyle = "rgba(255,253,247,0.94)";
  drawWrappedText(ctx, caption, textX + width * 0.012, textY + height * 0.013, textWidth - width * 0.024, lineHeight, 1);
}

function getCanvasSlidePage(pageIndex, layer = DEFAULT_SLIDE_LAYER) {
  const page = getSlidePages()[pageIndex - 1];
  if (!page) return null;
  if (layer === DEFAULT_SLIDE_LAYER) {
    return {
      ...page,
      slotIndices: Array.from({ length: page.pageSize }, (_, offset) => page.start + offset),
    };
  }

  const layerPage = getLayerSlidePage(pageIndex, layer);
  if (!layerPage) return page;
  return {
    pageIndex,
    layer,
    start: null,
    layout: layerPage.layout,
    pageSize: layerPage.pageSize,
    slots: layerPage.slots,
    caption: layerPage.caption,
    slotIndices: Array.from({ length: layerPage.pageSize }, (_, offset) => getLayerSlotIndex(pageIndex, layer, offset)),
  };
}

async function renderDeckPageToCanvas(pageIndex, size = getSlideExportSize(), { layer = DEFAULT_SLIDE_LAYER } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (pageIndex === 0) {
    await drawCoverToCanvas(ctx, size.width, size.height);
    return canvas;
  }

  const page = getCanvasSlidePage(pageIndex, layer);
  if (!page) {
    drawStageCanvasBackground(ctx, size.width, size.height);
    return canvas;
  }
  await drawSlidePageToCanvas(ctx, page, size.width, size.height);
  return canvas;
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function downloadBlob(fileName, blob) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getDeckFileStem() {
  return safeFileNamePart(els.coverTitle.value || "medical-image-presentation", "medical-image-presentation");
}

async function downloadSlidePng(
  pageIndex = state.pageIndex,
  { silent = false, sequence = pageIndex + 1, layer = DEFAULT_SLIDE_LAYER } = {},
) {
  const size = getSlideExportSize();
  const canvas = await renderDeckPageToCanvas(pageIndex, size, { layer });
  const blob = await canvasToPngBlob(canvas);
  const layerLabel = pageIndex > 0 && layer !== DEFAULT_SLIDE_LAYER ? `-layer-${layer}` : "";
  const pageLabel = pageIndex === 0 ? "cover" : `slide-${String(pageIndex).padStart(2, "0")}${layerLabel}`;
  const fileName = `${String(sequence).padStart(3, "0")}-${getDeckFileStem()}-${pageLabel}-${size.width}x${size.height}.png`;
  downloadBlob(fileName, blob);
  if (!silent) showToast(`${size.width}×${size.height} PNG를 내려받았습니다.`);
}

async function downloadCurrentSlidePng() {
  showLoading("현재 슬라이드를 PNG로 만드는 중입니다", 0.2);
  try {
    await downloadSlidePng(state.pageIndex, { silent: true, sequence: state.pageIndex + 1, layer: state.slideLayerIndex });
    const size = getSlideExportSize();
    showToast(`현재 슬라이드를 ${size.width}×${size.height} PNG로 저장했습니다.`);
  } finally {
    hideLoading();
  }
}

async function downloadAllSlidesPng() {
  const total = getTotalPages();
  const size = getSlideExportSize();
  showLoading(`전체 ${total}장을 PNG로 만드는 중입니다`, 0);
  try {
    for (let page = 0; page < total; page += 1) {
      updateLoading(`PNG 저장 중: ${page + 1} / ${total}`, page / total);
      await downloadSlidePng(page, { silent: true, sequence: page + 1 });
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    showToast(`전체 ${total}장을 ${size.width}×${size.height} PNG로 저장했습니다.`);
  } finally {
    hideLoading();
  }
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
    state.backgroundMusicUrl = assets.backgroundMusicUrl || "";
    state.backgroundMusicName = assets.backgroundMusicName || "";

    if (data.cover) {
      els.coverTitle.value = data.cover.title ?? els.coverTitle.value;
      els.coverSubtitle.value = data.cover.subtitle ?? els.coverSubtitle.value;
      els.hospitalName.value = data.cover.hospitalName ?? els.hospitalName.value;
      els.presenterName.value = data.cover.presenterName ?? els.presenterName.value;
    }

    syncBackgroundMusicUi();

    state.slideSlots = Array.isArray(data.slideSlots) ? data.slideSlots : state.slideSlots;
    markSlideSlotsDirty();
    state.slideCaptions = Array.isArray(data.slideCaptions) ? data.slideCaptions : state.slideCaptions;
    state.slidePageLayouts = Array.isArray(data.slidePageLayouts) ? data.slidePageLayouts : state.slidePageLayouts;
    state.slideLayerPages =
      data.slideLayerPages && typeof data.slideLayerPages === "object"
        ? cloneSlideLayerPages(data.slideLayerPages)
        : state.slideLayerPages;
    state.slotTransforms = data.slotTransforms ?? state.slotTransforms;
    state.selectedSlotIndex = data.selectedSlotIndex ?? state.selectedSlotIndex;
    state.layoutMode = data.layoutMode ?? state.layoutMode;
    state.gridRows = data.gridRows ?? state.gridRows;
    state.gridCols = data.gridCols ?? state.gridCols;
    markLayoutDirty();
    normalizeSlidePageLayouts();
    state.sortMode = data.sortMode ?? state.sortMode;
    state.slideExportSize = Object.hasOwn(SLIDE_EXPORT_SIZES, data.slideExportSize)
      ? data.slideExportSize
      : DEFAULT_SLIDE_EXPORT_SIZE;
    state.photoSearchQuery = typeof data.photoSearchQuery === "string" ? data.photoSearchQuery : "";
    state.photoFilterMode =
      data.photoFilterMode === "placed" || data.photoFilterMode === "unplaced" || data.photoFilterMode === "current"
        ? data.photoFilterMode
        : "all";
    state.fitMode = data.fitMode ?? state.fitMode;
    state.backgroundEnabled = data.backgroundEnabled ?? state.backgroundEnabled;
    state.autoplaySeconds = normalizeAutoplaySeconds(data.autoplaySeconds ?? state.autoplaySeconds);
    state.backgroundFilters = { ...state.backgroundFilters, ...(data.backgroundFilters ?? {}) };
    state.crop = { ...state.crop, ...(data.crop ?? {}) };
    state.zoom = data.zoom ?? state.zoom;
    state.guidesEnabled = data.guidesEnabled ?? state.guidesEnabled;
    state.guides = Array.isArray(data.guides) ? data.guides : state.guides;
    markGuidesDirty();
    state.coverVisibility = { ...state.coverVisibility, ...(data.coverVisibility ?? {}) };
    state.filters = { ...state.filters, ...(data.filters ?? {}) };
    state.pageIndex = data.pageIndex ?? state.pageIndex;
    state.slideLayerIndex = DEFAULT_SLIDE_LAYER;
    if (parseLayerSlotIndex(state.selectedSlotIndex)) {
      state.selectedSlotIndex = null;
    }
    applyImageOrder(data.imageOrder);

    els.sortMode.value = state.sortMode;
    if (els.slideExportSize) els.slideExportSize.value = state.slideExportSize;
    updatePhotoFilterUi();
    els.layoutMode.value = state.layoutMode;
    els.gridRows.value = state.gridRows;
    els.gridCols.value = state.gridCols;
    if (els.autoplaySeconds) els.autoplaySeconds.value = String(state.autoplaySeconds);
    if (els.autoplaySecondsValue) els.autoplaySecondsValue.textContent = `${state.autoplaySeconds.toFixed(1)}초`;
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
    .presentation-mode-row { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.5rem; }
    .is-active-mode { border-color:rgba(217,160,111,.42); background:linear-gradient(180deg,rgba(217,160,111,.22),rgba(143,92,56,.18)); }
    .stack { display:grid; gap:.55rem; }
    .stage-wrap { display:grid; grid-template-rows:auto 1fr; gap:1rem; min-width:0; }
    .toolbar { display:flex; flex-wrap:wrap; gap:.5rem; justify-content:flex-end; align-items:center; }
    .status { min-width:8rem; text-align:center; color:var(--muted); }
    .layer-controls { display:inline-flex; align-items:center; gap:.36rem; border:1px solid var(--line); border-radius:999px; padding:.24rem; background:rgba(255,255,255,.06); }
    .layer-controls button { min-width:2.35rem; padding:.48rem .58rem; }
    .layer-controls button:disabled { cursor:not-allowed; opacity:.38; transform:none; }
    .layer-status { min-width:3.4rem; color:var(--muted); text-align:center; font-weight:800; }
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
    .layer-badge { position:absolute; z-index:7; top:.8rem; right:.8rem; display:inline-flex; align-items:center; min-height:2.15rem; border:1px solid var(--line); border-radius:999px; padding:.38rem .72rem; color:rgba(255,253,247,.9); background:rgba(10,10,10,.55); font-size:.82rem; font-weight:800; backdrop-filter:blur(10px); }
    .slide-caption { position:absolute; z-index:6; top:1rem; left:1rem; display:inline-flex; align-items:center; max-width:min(38rem,calc(100% - 3rem)); border:1px solid var(--line); border-radius:999px; padding:.62rem .95rem; color:rgba(255,253,247,.94); background:rgba(10,10,10,.52); font-size:clamp(.95rem,1.6vw,1.08rem); font-weight:800; letter-spacing:-.02em; backdrop-filter:blur(10px); }
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
    body.presenting .layer-badge { display:none; }
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
      <label>페이지 구성 <select id="layout"><option value="single">낱장</option><option value="pair">2분할</option><option value="triple">3분할</option><option value="quad">4분할</option></select></label>
      <div class="row"><button id="fit">맞추기 F</button><button id="fill">채우기 Shift+F</button></div>
      <button id="bg">배경 채우기 Enter</button>
      <div class="presentation-mode-row">
        <button id="present">일반 발표 F5</button>
        <button id="autoplay">자동재생 F6</button>
      </div>
      <label>자동재생 간격 <output id="autoplayValue">3.0초</output><input id="autoplaySeconds" type="range" min="1" max="10" step="0.5" /></label>
      <label>배경 음악<input id="bgMusicName" type="text" readonly /></label>
      <audio id="bgMusic" controls preload="metadata"></audio>
      <button id="help">단축키 보기 Shift+?</button>
      <button id="downloadImages">편집 사진 다운로드</button>
      <label>밝기 <input id="brightness" type="range" min="50" max="150" /></label>
      <label>대비<input id="contrast" type="range" min="50" max="160" /></label>
      <label>채도 <input id="saturate" type="range" min="0" max="180" /></label>
      <label>색조 <input id="hue" type="range" min="-45" max="45" /></label>
      <p>F5 / Shift+F5: 일반 발표 시작 / 현재 페이지부터 시작</p>
      <p>F6 / Shift+F6: 자동재생 시작 / 현재 페이지부터 시작 / A: 발표 중 자동재생 전환</p>
      <p>Esc / 좌우·위아래 / Space / = - 휠 / 0 / C: 종료 · 페이지 이동 · 레이어 이동 · 확대 축소 · 초기화 · 커버</p>
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
      <div class="toolbar"><button id="prev">이전</button><span id="status" class="status">Cover</span><button id="next">다음</button><span class="layer-controls" aria-label="슬라이드 레이어 이동"><button id="layerUp" type="button" aria-label="위 레이어">▲</button><span id="layerStatus" class="layer-status">2 / 3</span><button id="layerDown" type="button" aria-label="아래 레이어">▼</button></span></div>
      <article id="stage" class="stage cover"></article>
    </section>
  </main>
  <dialog id="shortcutDialog">
    <div class="help-card">
      <div class="help-head"><h2>PPT 친화 단축키</h2><button id="closeHelp">닫기 Esc</button></div>
      <div class="help-grid">
        <p><kbd>F5</kbd><span>처음부터 일반 발표</span></p>
        <p><kbd>Shift</kbd> + <kbd>F5</kbd><span>현재 페이지부터 일반 발표</span></p>
        <p><kbd>F6</kbd><span>처음부터 자동재생 발표</span></p>
        <p><kbd>Shift</kbd> + <kbd>F6</kbd><span>현재 페이지부터 자동재생 발표</span></p>
        <p><kbd>A</kbd><span>발표 중 자동재생 토글</span></p>
        <p><kbd>Esc</kbd><span>발표/도움말 종료</span></p>
        <p><kbd>→</kbd> <kbd>N</kbd><span>다음 페이지</span></p>
        <p><kbd>←</kbd> <kbd>P</kbd><span>이전 페이지</span></p>
        <p><kbd>↑</kbd> <kbd>↓</kbd><span>위/아래 레이어</span></p>
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
    const SLIDE_LAYER_COUNT = 3;
    const DEFAULT_SLIDE_LAYER = 2;
    const LAYER_SLOT_BASE = 1000000;
    const LAYER_SLOT_PAGE_FACTOR = 10000;
    const LAYER_SLOT_LAYER_FACTOR = 100;
    const state = { ...data, pageIndex: 0, slideLayerIndex: DEFAULT_SLIDE_LAYER, autoplaySeconds: Number(data.autoplaySeconds ?? 3) || 3 };
    state.slideLayerPages = state.slideLayerPages && typeof state.slideLayerPages === "object" && !Array.isArray(state.slideLayerPages) ? state.slideLayerPages : {};
    let playbackMode = "manual";
    let autoplayTimer = null;
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
    const layerKey = (page, layer) => String(Number(page)) + ":" + String(Number(layer));
    const layerSlotIndex = (page, layer, offset) => LAYER_SLOT_BASE + Number(page) * LAYER_SLOT_PAGE_FACTOR + Number(layer) * LAYER_SLOT_LAYER_FACTOR + Number(offset);
    const parseLayerSlotIndex = (slotIndex) => {
      const raw = Number(slotIndex);
      if (!Number.isInteger(raw) || raw < LAYER_SLOT_BASE) return null;
      const page = Math.floor((raw - LAYER_SLOT_BASE) / LAYER_SLOT_PAGE_FACTOR);
      const layer = Math.floor(((raw - LAYER_SLOT_BASE) % LAYER_SLOT_PAGE_FACTOR) / LAYER_SLOT_LAYER_FACTOR);
      const offset = (raw - LAYER_SLOT_BASE) % LAYER_SLOT_LAYER_FACTOR;
      if (page <= 0 || layer < 1 || layer > SLIDE_LAYER_COUNT || layer === DEFAULT_SLIDE_LAYER || offset < 0) return null;
      return { page, layer, offset };
    };
    const currentLayer = () => state.pageIndex > 0 ? Math.min(Math.max(Number(state.slideLayerIndex) || DEFAULT_SLIDE_LAYER, 1), SLIDE_LAYER_COUNT) : DEFAULT_SLIDE_LAYER;
    const layerPage = (page, layer, { create = false } = {}) => {
      const pageNumber = Number(page);
      const layerNumber = Number(layer);
      const base = slidePages()[pageNumber - 1];
      if (!base || layerNumber === DEFAULT_SLIDE_LAYER || layerNumber < 1 || layerNumber > SLIDE_LAYER_COUNT) return null;
      const key = layerKey(pageNumber, layerNumber);
      const record = state.slideLayerPages[key];
      const layout = normalizeLayout(record?.layout || base.layout || defaultLayout());
      const size = layoutSize(layout);
      const slots = Array.from({ length: size }, (_, offset) => (Array.isArray(record?.slots) ? record.slots[offset] : null) ?? null);
      const caption = record?.caption || "";
      if (create) state.slideLayerPages[key] = { layout, slots: [...slots], caption };
      return {
        pageIndex: pageNumber,
        start: null,
        pageSize: size,
        layout,
        slots,
        caption,
        layer: layerNumber,
        slotIndices: Array.from({ length: size }, (_, offset) => layerSlotIndex(pageNumber, layerNumber, offset)),
      };
    };
    const defaultPageMeta = () => ({ start:0, pageSize: layoutSize(defaultLayout()), layout: defaultLayout(), slots: [], layer: DEFAULT_SLIDE_LAYER, slotIndices: [] });
    const basePageMeta = (page = state.pageIndex) => {
      const base = page > 0 ? slidePages()[page - 1] : null;
      if (!base) return defaultPageMeta();
      return { ...base, layer: DEFAULT_SLIDE_LAYER, slotIndices: Array.from({ length: base.pageSize }, (_, offset) => base.start + offset) };
    };
    const currentPageMeta = () => {
      if (state.pageIndex <= 0) return defaultPageMeta();
      const layer = currentLayer();
      return layer === DEFAULT_SLIDE_LAYER ? basePageMeta(state.pageIndex) : (layerPage(state.pageIndex, layer) || basePageMeta(state.pageIndex));
    };
    const pageLayout = (page = state.pageIndex) => page === state.pageIndex ? currentPageMeta().layout : basePageMeta(page).layout;
    function setPageLayout(mode){
      const activeLayout = pageLayout();
      const next=normalizeLayout({ mode, rows: mode==="custom" ? (activeLayout.rows||1) : undefined, cols: mode==="custom" ? (activeLayout.cols||1) : undefined });
      if(state.pageIndex>0 && currentLayer() !== DEFAULT_SLIDE_LAYER){
        const page=state.pageIndex;
        const layer=currentLayer();
        const target=layerPage(page, layer, { create:true });
        if(!target) return;
        const nextSize=layoutSize(next);
        const slots=nextSize>target.slots.length ? [...target.slots, ...Array(nextSize-target.slots.length).fill(null)] : target.slots.slice(0,nextSize);
        state.slideLayerPages[layerKey(page, layer)] = { layout: next, slots, caption: target.caption };
        const nextTransforms={};
        Object.entries(state.slotTransforms||{}).forEach(([key, transform]) => {
          const parsed = parseLayerSlotIndex(key);
          if (parsed && parsed.page === page && parsed.layer === layer && parsed.offset >= nextSize) return;
          nextTransforms[key] = transform;
        });
        state.slotTransforms=nextTransforms;
      } else if(state.pageIndex>0){
        const pages=slidePages().map((page)=>({ pageIndex:page.pageIndex,start:page.start,pageSize:page.pageSize,layout:normalizeLayout(page.layout),caption:page.caption,slots:[...page.slots],transforms:Array.from({length:page.pageSize},(_,offset)=>{ const transform=state.slotTransforms?.[page.start+offset]; return transform ? {...transform} : null; }) }));
        const target=pages[state.pageIndex-1];
        if(!target) return;
        const nextSize=layoutSize(next);
        if(nextSize>target.slots.length){ target.slots.push(...Array(nextSize-target.slots.length).fill(null)); target.transforms.push(...Array(nextSize-target.transforms.length).fill(null)); } else if(nextSize<target.slots.length){ target.slots=target.slots.slice(0,nextSize); target.transforms=target.transforms.slice(0,nextSize); }
        target.layout=next;
        target.pageSize=nextSize;
        state.slideSlots=pages.flatMap((page)=>page.slots);
        state.slideCaptions=pages.map((page)=>page.caption);
        state.slidePageLayouts=pages.map((page)=>normalizeLayout(page.layout));
        const nextTransforms={};
        Object.entries(state.slotTransforms||{}).forEach(([key, transform]) => { if (parseLayerSlotIndex(key)) nextTransforms[key]=transform; });
        let nextSlotIndex=0;
        pages.forEach((page)=>{ page.transforms.forEach((transform,offset)=>{ if(transform) nextTransforms[nextSlotIndex+offset]=transform; }); nextSlotIndex+=page.pageSize; });
        state.slotTransforms=nextTransforms;
      } else {
        state.layoutMode=next.mode;
        state.gridRows=next.rows;
        state.gridCols=next.cols;
      }
      render();
    }
    const totalPages = () => 1 + slidePages().length;
    const $ = (id) => document.getElementById(id);
    const esc = (v) => String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    const normalizeAutoplaySeconds = (value) => Math.min(Math.max(Number(Number(value).toFixed(1)) || 3, 1), 10);
    const filter = () => \`brightness(\${state.filters.brightness}%) contrast(\${state.filters.contrast}%) saturate(\${state.filters.saturate}%) hue-rotate(\${state.filters.hue}deg)\`;
    const imageFromUrl = (url) => new Promise((resolve,reject)=>{ const image = new Image(); image.onload=()=>resolve(image); image.onerror=reject; image.src=url; });
    function syncInputs(){ const activeLayout = pageLayout(state.pageIndex); $("title").value=state.cover.title; $("subtitle").value=state.cover.subtitle; $("hospital").value=state.cover.hospitalName; $("presenter").value=state.cover.presenterName; $("layout").value=activeLayout.mode; $("showTitle").checked=state.coverVisibility.title; $("showSubtitle").checked=state.coverVisibility.subtitle; $("showHospital").checked=state.coverVisibility.hospitalName; $("showPresenter").checked=state.coverVisibility.presenterName; $("showDate").checked=state.coverVisibility.date; $("showLogo").checked=state.coverVisibility.logo; $("autoplaySeconds").value=String(normalizeAutoplaySeconds(state.autoplaySeconds)); $("autoplayValue").textContent=\`\${normalizeAutoplaySeconds(state.autoplaySeconds).toFixed(1)}초\`; $("bgMusicName").value=state.cover.backgroundMusicName||"음악 없음"; if(state.cover.backgroundMusicUrl){ if($("bgMusic").src!==state.cover.backgroundMusicUrl) $("bgMusic").src=state.cover.backgroundMusicUrl; $("bgMusic").hidden=false; } else { $("bgMusic").hidden=true; } for (const key of ["brightness","contrast","saturate","hue"]) $(key).value=state.filters[key]; }
    function syncLayerControls(){ const isSlide = state.pageIndex > 0; const layer = currentLayer(); $("layerStatus").textContent = isSlide ? String(layer) + " / " + String(SLIDE_LAYER_COUNT) : "-"; $("layerUp").disabled = !isSlide || layer <= 1; $("layerDown").disabled = !isSlide || layer >= SLIDE_LAYER_COUNT; $("layout").value = pageLayout(state.pageIndex).mode; }
    function render(){ state.pageIndex=Math.min(Math.max(state.pageIndex,0),totalPages()-1); if(state.pageIndex===0) renderCover(); else renderSlide(); const modeText=document.body.classList.contains("presenting")?(playbackMode==="autoplay"?\`자동재생 \${normalizeAutoplaySeconds(state.autoplaySeconds).toFixed(1)}초\`:"일반 발표"):"편집 중"; const layerText=state.pageIndex>0?\` · 레이어 \${currentLayer()} / \${SLIDE_LAYER_COUNT}\`:""; $("status").textContent=state.pageIndex===0?\`Cover / \${totalPages()} · \${modeText}\`:\`\${state.pageIndex+1} / \${totalPages()} · \${modeText}\${layerText}\`; $("bg").textContent=state.backgroundEnabled?"배경 채우기 켜짐 Enter":"배경 채우기 꺼짐 Enter"; $("present").classList.toggle("is-active-mode",document.body.classList.contains("presenting")&&playbackMode==="manual"); $("autoplay").classList.toggle("is-active-mode",document.body.classList.contains("presenting")&&playbackMode==="autoplay"); $("autoplayValue").textContent=\`\${normalizeAutoplaySeconds(state.autoplaySeconds).toFixed(1)}초\`; syncLayerControls(); }
    function renderCover(){ const meta=[state.coverVisibility.hospitalName?state.cover.hospitalName:"",state.coverVisibility.presenterName?state.cover.presenterName:"",state.coverVisibility.date?state.cover.date:""].filter(Boolean); $("stage").className="stage cover"; $("stage").innerHTML=\`<div class="cover-card">\${state.coverVisibility.logo&&state.cover.logoUrl?\`<img class="cover-logo" src="\${state.cover.logoUrl}" alt="logo">\`:""}\${state.coverVisibility.title?\`<h2 class="cover-title">\${esc(state.cover.title)}</h2>\`:""}\${state.coverVisibility.subtitle?\`<p class="cover-subtitle">\${esc(state.cover.subtitle)}</p>\`:""}\${meta.length?\`<p class="meta">\${meta.map(esc).join(" · ")}</p>\`:""}</div>\`; }
    function getImage(id){ return state.images.find((image)=>image.id===id); }
    function slotTransform(i){ return {scale:100,x:0,y:0,rotate:0,fitMode:"inherit",flipX:false,flipY:false,cropLeft:0,cropRight:0,cropTop:0,cropBottom:0,...(state.slotTransforms?.[i]||{})}; }
    function crop(i){ const t=slotTransform(i), c=state.crop||{left:0,right:0,top:0,bottom:0}; return \`inset(\${(c.top||0)+t.cropTop}% \${(c.right||0)+t.cropRight}% \${(c.bottom||0)+t.cropBottom}% \${(c.left||0)+t.cropLeft}%)\`; }
    function photoTransform(i){ const t=slotTransform(i); const base=(state.zoom||1)*(t.scale/100); const sx=base*(t.flipX?-1:1); const sy=base*(t.flipY?-1:1); return \`translate(\${t.x}%, \${t.y}%) scale(\${sx}, \${sy}) rotate(\${t.rotate}deg)\`; }
    function card(img, slotIndex){ if(!img) return \`<figure class="card empty"></figure>\`; const t=slotTransform(slotIndex); const fitMode=t.fitMode==="fill"?"fill":t.fitMode==="fit"?"fit":state.fitMode; return \`<figure class="card \${state.backgroundEnabled?"bg-on":""} \${fitMode==="fill"?"fill":""}"><img class="blur" src="\${img.url}" alt=""><img class="photo" src="\${img.url}" alt="\${esc(img.name)}" style="clip-path:\${crop(slotIndex)};filter:\${filter()};transform:\${photoTransform(slotIndex)}"><figcaption class="label">\${esc(img.name)}</figcaption></figure>\`; }
    function renderSlide(){ const meta=currentPageMeta(); const layout=meta.layout; const cls=layout.mode==="custom"?"custom":layout.mode; const caption=(meta.caption||"").trim(); const emptySlide = meta.slots.length > 0 && meta.slots.every((id)=>!id); const badge=\`<div class="layer-badge">\${currentLayer()} / \${SLIDE_LAYER_COUNT}</div>\`; $("stage").className="stage"; $("stage").innerHTML=\`\${badge}<div class="grid \${cls}" style="--grid-cols:\${layout.cols||2};--grid-rows:\${layout.rows||1}">\${meta.slots.map((id,offset)=>card(getImage(id),meta.slotIndices?.[offset] ?? meta.start+offset)).join("")}</div>\${!emptySlide && caption ? \`<div class="slide-caption">\${esc(caption)}</div>\` : ""}\${emptySlide && caption ? \`<div class="empty-slide-caption">\${esc(caption)}</div>\` : ""}\`; }
    function orderedImageSlots(){ const defaultSlots = (state.slideSlots?.length?state.slideSlots:state.images.map((image)=>image.id)).map((id,slotIndex)=>({ id, slotIndex })); const layerSlots = Object.entries(state.slideLayerPages||{}).flatMap(([key, record])=>{ const [page, layer] = key.split(":").map(Number); if(!Number.isInteger(page)||!Number.isInteger(layer)||layer===DEFAULT_SLIDE_LAYER) return []; const slots = Array.isArray(record?.slots) ? record.slots : []; return slots.map((id,offset)=>({ id, slotIndex: layerSlotIndex(page, layer, offset) })); }); return [...defaultSlots, ...layerSlots].map(({id,slotIndex})=>({ item:getImage(id), slotIndex })).filter(({item})=>Boolean(item)); }
    async function downloadImages(){ if(!state.images.length){ alert("먼저 사진을 넣어주세요."); return; } const ordered = orderedImageSlots(); for(const [index,{item,slotIndex}] of ordered.entries()){ const image = await imageFromUrl(item.url); const t = slotTransform(slotIndex); const c = state.crop||{left:0,right:0,top:0,bottom:0}; const cropLeftPx = Math.round(image.naturalWidth * (((c.left||0)+t.cropLeft) / 100)); const cropRightPx = Math.round(image.naturalWidth * (((c.right||0)+t.cropRight) / 100)); const cropTopPx = Math.round(image.naturalHeight * (((c.top||0)+t.cropTop) / 100)); const cropBottomPx = Math.round(image.naturalHeight * (((c.bottom||0)+t.cropBottom) / 100)); const sourceWidth = Math.max(1, image.naturalWidth - cropLeftPx - cropRightPx); const sourceHeight = Math.max(1, image.naturalHeight - cropTopPx - cropBottomPx); const canvas = document.createElement("canvas"); canvas.width = sourceWidth; canvas.height = sourceHeight; const ctx = canvas.getContext("2d"); ctx.filter = filter(); ctx.drawImage(image,cropLeftPx,cropTopPx,sourceWidth,sourceHeight,0,0,sourceWidth,sourceHeight); await new Promise((resolve)=>{ canvas.toBlob((blob)=>{ if(!blob){ resolve(); return; } const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = \`\${String(index+1).padStart(3,"0")}-\${item.name.replace(/\\.[^.]+$/,"")}.png\`; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); setTimeout(resolve,120); }, "image/png"); }); } }
    function isZoomInKey(e){ return e.key==="+" || e.key==="=" || e.code==="NumpadAdd"; }
    function isZoomOutKey(e){ return e.key==="-" || e.key==="_" || e.code==="NumpadSubtract"; }
    function stopAutoplay(){ if(!autoplayTimer) return; window.clearTimeout(autoplayTimer); autoplayTimer=null; }
    function scheduleAutoplay(){ stopAutoplay(); if(playbackMode!=="autoplay"||!document.body.classList.contains("presenting")) return; autoplayTimer=window.setTimeout(()=>{ autoplayTimer=null; if(playbackMode!=="autoplay"||!document.body.classList.contains("presenting")) return; if(state.pageIndex>=totalPages()-1){ stopPresentation(true); return; } go(state.pageIndex+1); }, normalizeAutoplaySeconds(state.autoplaySeconds)*1000); }
    function go(n){ const nextPage=Math.min(Math.max(Number(n)||0,0),totalPages()-1); const pageChanged=nextPage!==state.pageIndex; state.pageIndex=nextPage; if(pageChanged) state.slideLayerIndex=DEFAULT_SLIDE_LAYER; render(); if(playbackMode==="autoplay"&&document.body.classList.contains("presenting")) scheduleAutoplay(); }
    function goLayer(direction){ if(state.pageIndex<=0) return; const layer=currentLayer(); const nextLayer=Math.min(Math.max(layer+(direction<0?-1:1),1),SLIDE_LAYER_COUNT); if(nextLayer===layer) return; state.slideLayerIndex=nextLayer; render(); }
    function updateZoom(delta){ state.zoom=Math.min(Math.max(Number((state.zoom+delta).toFixed(2)),.5),2.5); render(); }
    function resetZoom(){ state.zoom=1; render(); }
    function startPresentation(autoplay=false){ playbackMode=autoplay?"autoplay":"manual"; document.body.classList.add("presenting"); if(autoplay) scheduleAutoplay(); else stopAutoplay(); if(state.cover.backgroundMusicUrl){ try{$("bgMusic").currentTime=0}catch{} $("bgMusic").play().catch(()=>{}); } $("stage").requestFullscreen?.().catch(()=>{}); render(); }
    function stopPresentation(silent=false){ stopAutoplay(); playbackMode="manual"; document.body.classList.remove("presenting"); $("bgMusic").pause(); try{$("bgMusic").currentTime=0}catch{} if(document.fullscreenElement) document.exitFullscreen?.().catch(()=>{}); render(); }
    function toggleAutoplay(){ if(!document.body.classList.contains("presenting")) return; if(playbackMode==="autoplay"){ playbackMode="manual"; stopAutoplay(); } else { playbackMode="autoplay"; scheduleAutoplay(); } render(); }
    function showHelp(){ if(!$("shortcutDialog").open) $("shortcutDialog").showModal(); }
    function hideHelp(){ if($("shortcutDialog").open) $("shortcutDialog").close(); }
    function backdropClose(e){ if(e.target!==$("shortcutDialog")) return; const r=$("shortcutDialog").getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) hideHelp(); }
    function onWheelZoom(e){ if(!(e.target instanceof Element) || !e.target.closest("#stage")) return; e.preventDefault(); if(e.deltaY<0) updateZoom(.1); else if(e.deltaY>0) updateZoom(-.1); }
    $("prev").onclick=()=>go(state.pageIndex-1); $("next").onclick=()=>go(state.pageIndex+1); $("layerUp").onclick=()=>goLayer(-1); $("layerDown").onclick=()=>goLayer(1); $("fit").onclick=()=>{state.fitMode="fit";render()}; $("fill").onclick=()=>{state.fitMode="fill";render()}; $("bg").onclick=()=>{state.backgroundEnabled=!state.backgroundEnabled;render()}; $("present").onclick=()=>{go(0);startPresentation(false)}; $("autoplay").onclick=()=>{go(0);startPresentation(true)}; $("autoplaySeconds").oninput=()=>{ state.autoplaySeconds=normalizeAutoplaySeconds($("autoplaySeconds").value); render(); if(playbackMode==="autoplay"&&document.body.classList.contains("presenting")) scheduleAutoplay(); };
    $("help").onclick=showHelp; $("closeHelp").onclick=hideHelp; $("downloadImages").onclick=downloadImages; $("openPages").onclick=()=>window.open("https://github.com/notoow/medical-image-presenter","_blank","noopener,noreferrer");
    $("shortcutDialog").onclick=backdropClose;
    document.addEventListener("wheel", onWheelZoom, { passive:false });
    for (const id of ["title","subtitle","hospital","presenter"]) $(id).oninput=()=>{ const map={title:"title",subtitle:"subtitle",hospital:"hospitalName",presenter:"presenterName"}; state.cover[map[id]]=$(id).value; render(); };
    for (const [id,key] of [["showTitle","title"],["showSubtitle","subtitle"],["showHospital","hospitalName"],["showPresenter","presenterName"],["showDate","date"],["showLogo","logo"]]) $(id).onchange=()=>{state.coverVisibility[key]=$(id).checked;render()};
    $("layout").onchange=()=>setPageLayout($("layout").value); for (const key of ["brightness","contrast","saturate","hue"]) $(key).oninput=()=>{state.filters[key]=Number($(key).value);render()};
    document.onkeydown=(e)=>{
      if(["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;
      const presenting=document.body.classList.contains("presenting");
      if(e.key==="?"||(e.shiftKey&&e.key==="/")){e.preventDefault();showHelp();return}
      if(e.key==="Escape"){ if($("shortcutDialog").open){hideHelp();return} if(presenting) stopPresentation(); return; }
      if(e.key==="F5"){e.preventDefault(); if(!e.shiftKey)go(0); startPresentation(false); return}
      if(e.key==="F6"){e.preventDefault(); if(!e.shiftKey)go(0); startPresentation(true); return}
      if(e.key.toLowerCase()==="a"&&presenting){e.preventDefault();toggleAutoplay();return}
      if(!presenting && e.key==="ArrowUp"){e.preventDefault();goLayer(-1);return}
      if(!presenting && e.key==="ArrowDown"){e.preventDefault();goLayer(1);return}
      if(e.key==="ArrowLeft"||e.key==="PageUp"||e.key.toLowerCase()==="p"||(presenting&&e.key==="ArrowUp")){e.preventDefault();go(state.pageIndex-1);return}
      if(e.key==="ArrowRight"||e.key==="PageDown"||e.key===" "||e.key.toLowerCase()==="n"||(presenting&&e.key==="ArrowDown")){e.preventDefault();go(state.pageIndex+1);return}
      if(e.key==="Home"){e.preventDefault();go(0);return}
      if(e.key==="End"){e.preventDefault();go(totalPages()-1);return}
      if(e.key==="Enter"){e.preventDefault();state.backgroundEnabled=!state.backgroundEnabled;render();return}
      if(e.key.toLowerCase()==="f"){e.preventDefault();state.fitMode=e.shiftKey?"fill":"fit";render();return}
      if(isZoomInKey(e)) {e.preventDefault(); updateZoom(.1); return}
      if(isZoomOutKey(e)) {e.preventDefault(); updateZoom(-.1); return}
      if(e.key==="0"){e.preventDefault();resetZoom();return}
      if(e.key.toLowerCase()==="c"){e.preventDefault();go(0)}
    };
    syncInputs(); render();
  </script>
</body>
</html>`;
}

async function initializeDefaultLogo() {
  applyPersistedState();
  syncBackgroundMusicUi();

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

ensureMobileSectionAccordion();
window.addEventListener("resize", syncMobileSectionAccordion);
initializeDefaultLogo();

