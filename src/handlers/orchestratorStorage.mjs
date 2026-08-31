import { executeFileCommand } from "../../../otto-file-extension/src/file-runtime.mjs";

const DEFAULT_DISPLAY_ID = "hallway";
const DISPLAY_ROOT = "/content/displays";
const LEGACY_SETTINGS_PATH = "/content/settings/orchestrator-settings.json";
const LEGACY_TIER_LIST_PATH = "/content/settings/tier-list.json";
const LEGACY_PAGES_INDEX_PATH = "/content/pages/pages.json";
const DISPLAY_REGISTRY_PATH = `${DISPLAY_ROOT}/displays.json`;
const SOFT_DELETE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const BUILTIN_PAGES = [
  { id: "emergency", name: "Emergency Tier", type: "emergency" },
  { id: "hallway", name: "Hallway", type: "custom" },
  { id: "weather", name: "Weather", type: "weather" },
  { id: "time", name: "Time", type: "time" }
];

function slugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deepMerge(base, patch) {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch || {})) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      next[key] &&
      typeof next[key] === "object" &&
      !Array.isArray(next[key])
    ) {
      next[key] = deepMerge(next[key], value);
      continue;
    }
    next[key] = value;
  }
  return next;
}

function normalizePageType(type) {
  if (["url", "inline-code", "time", "weather", "custom", "emergency"].includes(type)) {
    return type;
  }
  return "custom";
}

function defaultTimeSettings() {
  return {
    timeZone: "UTC",
    useDaylightSavings: true,
    format: "24h",
    style: "digital",
    showSeconds: true,
    leadingZero: true
  };
}

function defaultWeatherSettings() {
  return {
    units: "F",
    iconPack: "default",
    severeWeatherOverride: true
  };
}

function defaultCustomSettings() {
  return {
    inlineCode: "",
    url: "",
    assetFolder: ""
  };
}

function defaultEmergencySettings() {
  return {
    expiryTime: undefined,
    severity: "critical",
    overrideBehavior: "suppress-all"
  };
}

function normalizeDuration(duration) {
  const parsed = Number(duration);
  if (!Number.isFinite(parsed)) return 30000;
  return Math.min(300000, Math.max(5000, Math.round(parsed)));
}

function normalizeTier(tier, pageType) {
  if (pageType === "emergency") {
    return 0;
  }
  const parsed = Number(tier);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function normalizeTierList(tierList = [], knownPages = []) {
  const normalized = [];
  for (const entry of Array.isArray(tierList) ? tierList : []) {
    const tier = Number(entry);
    if (!Number.isInteger(tier) || tier < 0) continue;
    if (normalized.includes(tier)) continue;
    normalized.push(tier);
  }

  if (!normalized.includes(0)) {
    normalized.unshift(0);
  }

  for (const page of knownPages) {
    const tier = normalizeTier(page.tier, page.type);
    if (!normalized.includes(tier)) {
      normalized.push(tier);
    }
  }

  return [0, ...normalized.filter((tier) => tier !== 0)];
}

function normalizeTimeSettings(input) {
  const candidate = input || {};
  return {
    timeZone: typeof candidate.timeZone === "string" && candidate.timeZone.trim() ? candidate.timeZone : "UTC",
    useDaylightSavings: candidate.useDaylightSavings !== false,
    format: candidate.format === "12h" ? "12h" : "24h",
    style: candidate.style === "analog" ? "analog" : "digital",
    showSeconds: candidate.showSeconds !== false,
    leadingZero: candidate.leadingZero !== false
  };
}

function normalizeWeatherSettings(input) {
  const candidate = input || {};
  return {
    units: candidate.units === "C" ? "C" : "F",
    iconPack: typeof candidate.iconPack === "string" && candidate.iconPack.trim() ? candidate.iconPack : "default",
    severeWeatherOverride: candidate.severeWeatherOverride !== false
  };
}

function normalizeCustomSettings(input) {
  const candidate = input || {};
  return {
    inlineCode: typeof candidate.inlineCode === "string" ? candidate.inlineCode : "",
    url: typeof candidate.url === "string" ? candidate.url : "",
    assetFolder: typeof candidate.assetFolder === "string" ? candidate.assetFolder : ""
  };
}

function normalizeEmergencySettings(input) {
  const candidate = input || {};
  return {
    expiryTime: typeof candidate.expiryTime === "string" && candidate.expiryTime.trim() ? candidate.expiryTime : undefined,
    severity: candidate.severity === "low" || candidate.severity === "medium" || candidate.severity === "high" ? candidate.severity : "critical",
    overrideBehavior: candidate.overrideBehavior === "tier-only" ? "tier-only" : "suppress-all"
  };
}

function defaultPageSettings(page) {
  const id = String(page?.id || "").trim() || "page";
  const name = String(page?.name || id);
  const type = normalizePageType(page?.type);
  const isEmergencyPage = type === "emergency" || id === "emergency";
  const isTimePage = type === "time" || id === "time";
  const isWeatherPage = type === "weather" || id === "weather";

  return {
    id,
    name,
    type,
    enabled: true,
    tier: isEmergencyPage ? 0 : 1,
    displayId: String(page?.displayId || DEFAULT_DISPLAY_ID),
    deleted: false,
    deletedAt: undefined,
    displayDurationMs: 30000,
    triggers: {
      timeBased: !isWeatherPage && !isEmergencyPage,
      scheduleBased: false,
      weatherBased: isWeatherPage,
      phaseBased: isEmergencyPage,
      scheduleEvent: "classChange",
      weatherCondition: isEmergencyPage ? "severe" : "any",
      phase: isEmergencyPage ? "emergency" : "assembly"
    },
    timeSettings: isTimePage ? defaultTimeSettings() : undefined,
    weatherSettings: isWeatherPage ? defaultWeatherSettings() : undefined,
    customSettings: type === "custom" || type === "inline-code" || type === "url" ? defaultCustomSettings() : undefined,
    emergencySettings: isEmergencyPage ? defaultEmergencySettings() : undefined
  };
}

function normalizePageSettings(rawSettings, fallbackPage, displayId = DEFAULT_DISPLAY_ID) {
  const defaults = defaultPageSettings({ ...fallbackPage, displayId });
  const next = deepMerge(defaults, rawSettings || {});
  const type = normalizePageType(next.type || fallbackPage?.type || defaults.type);
  const isEmergencyPage = type === "emergency" || next.id === "emergency";
  const isTimePage = type === "time" || next.id === "time";
  const isWeatherPage = type === "weather" || next.id === "weather";
  const deleted = next.deleted === true;

  return {
    id: String(next.id || defaults.id),
    name: String(next.name || defaults.name),
    type,
    enabled: isEmergencyPage ? true : (deleted ? false : next.enabled !== false),
    tier: normalizeTier(next.tier, type),
    displayId: typeof next.displayId === "string" && next.displayId.trim() ? next.displayId : displayId,
    deleted,
    deletedAt: deleted
      ? (typeof next.deletedAt === "string" && next.deletedAt.trim() ? next.deletedAt : new Date().toISOString())
      : undefined,
    displayDurationMs: normalizeDuration(next.displayDurationMs),
    triggers: {
      timeBased: isEmergencyPage ? false : next.triggers?.timeBased !== false,
      scheduleBased: Boolean(next.triggers?.scheduleBased),
      weatherBased: isWeatherPage || Boolean(next.triggers?.weatherBased),
      phaseBased: isEmergencyPage || Boolean(next.triggers?.phaseBased),
      scheduleEvent: typeof next.triggers?.scheduleEvent === "string" ? next.triggers.scheduleEvent : defaults.triggers.scheduleEvent,
      weatherCondition: typeof next.triggers?.weatherCondition === "string" ? next.triggers.weatherCondition : defaults.triggers.weatherCondition,
      phase: ["chapel", "assembly", "emergency", "lockdown", "fire-drill"].includes(next.triggers?.phase)
        ? next.triggers.phase
        : defaults.triggers.phase
    },
    timeSettings: isTimePage ? normalizeTimeSettings(next.timeSettings) : undefined,
    weatherSettings: isWeatherPage ? normalizeWeatherSettings(next.weatherSettings) : undefined,
    customSettings: type === "custom" || type === "inline-code" || type === "url" ? normalizeCustomSettings(next.customSettings) : undefined,
    emergencySettings: isEmergencyPage ? normalizeEmergencySettings(next.emergencySettings) : undefined
  };
}

function enforceTierZeroInvariants(page) {
  if (!page) return page;
  if (page.tier !== 0 && page.type !== "emergency" && page.id !== "emergency") {
    return page;
  }

  return {
    ...page,
    tier: 0,
    enabled: true,
    deleted: false,
    deletedAt: undefined,
    type: "emergency",
    triggers: {
      ...page.triggers,
      timeBased: false,
      phaseBased: true,
      weatherCondition: page.triggers?.weatherCondition || "severe",
      phase: page.triggers?.phase || "emergency"
    },
    emergencySettings: normalizeEmergencySettings(page.emergencySettings)
  };
}

function getStoragePaths(displayId = DEFAULT_DISPLAY_ID) {
  const normalized = String(displayId || DEFAULT_DISPLAY_ID).trim() || DEFAULT_DISPLAY_ID;
  if (normalized === DEFAULT_DISPLAY_ID) {
    return {
      displayId: normalized,
      settingsPath: LEGACY_SETTINGS_PATH,
      tierListPath: LEGACY_TIER_LIST_PATH,
      pagesIndexPath: LEGACY_PAGES_INDEX_PATH
    };
  }

  return {
    displayId: normalized,
    settingsPath: `${DISPLAY_ROOT}/${normalized}/settings.json`,
    tierListPath: `${DISPLAY_ROOT}/${normalized}/tierList.json`,
    pagesIndexPath: `${DISPLAY_ROOT}/${normalized}/pages.json`
  };
}

async function readJson(pathName, fallbackValue) {
  try {
    const result = await executeFileCommand("file.read", { path: pathName });
    return JSON.parse(result.content);
  } catch {
    return fallbackValue;
  }
}

async function writeJson(pathName, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  return executeFileCommand("file.write", { path: pathName, content });
}

function normalizePagesIndex(rawPages, displayId = DEFAULT_DISPLAY_ID) {
  const source = Array.isArray(rawPages) ? rawPages : Array.isArray(rawPages?.pages) ? rawPages.pages : [];
  const byId = new Map();

  for (const builtin of BUILTIN_PAGES) {
    byId.set(builtin.id, { ...builtin, builtIn: true, displayId, deleted: false });
  }

  for (const page of source) {
    if (!page || typeof page !== "object") continue;
    const id = String(page.id || "").trim();
    if (!id) continue;
    byId.set(id, {
      ...page,
      id,
      name: String(page.name || id),
      type: normalizePageType(page.type),
      displayId: String(page.displayId || displayId)
    });
  }

  return Array.from(byId.values());
}

function toLegacyProjection(perPageSettings) {
  const pages = Object.values(perPageSettings.pages || {});
  const active = pages.filter((page) => page.enabled && !page.deleted);
  const enabledPages = active.map((page) => page.id);
  const firstEnabled = active[0] || pages[0] || { displayDurationMs: 30000 };
  const weatherBased = active.some((page) => page.triggers?.weatherBased);
  const scheduleBased = active.some((page) => page.triggers?.scheduleBased);
  const phaseBased = active.some((page) => page.triggers?.phaseBased);

  return {
    enabledPages,
    rotationIntervalMs: firstEnabled.displayDurationMs,
    rotationMode: weatherBased ? "weather" : scheduleBased ? "schedule" : phaseBased ? "phase" : "time",
    weatherTriggers: {
      severeWeather: weatherBased,
      tempThreshold: 95
    },
    scheduleTriggers: {
      classChange: scheduleBased,
      passingPeriod: scheduleBased
    },
    phaseTriggers: {
      chapel: phaseBased,
      assembly: phaseBased,
      emergency: phaseBased,
      lockdown: phaseBased,
      "fire-drill": phaseBased
    }
  };
}

function normalizeSettingsShape(rawSettings, pages, tierListInput, displayId = DEFAULT_DISPLAY_ID) {
  if (rawSettings?.pages && typeof rawSettings.pages === "object") {
    const normalizedPages = {};
    for (const page of pages) {
      normalizedPages[page.id] = normalizePageSettings(rawSettings.pages[page.id], page, displayId);
      normalizedPages[page.id] = enforceTierZeroInvariants(normalizedPages[page.id]);
    }

    for (const [pageId, pageSettings] of Object.entries(rawSettings.pages)) {
      if (!normalizedPages[pageId]) {
        const inferredType = pageId === "time" ? "time" : pageId === "weather" ? "weather" : pageId === "emergency" ? "emergency" : "custom";
        normalizedPages[pageId] = normalizePageSettings(pageSettings, {
          id: pageId,
          name: pageId,
          type: inferredType,
          displayId
        }, displayId);
        normalizedPages[pageId] = enforceTierZeroInvariants(normalizedPages[pageId]);
      }
    }

    const tierList = normalizeTierList(rawSettings.tierList ?? tierListInput, Object.values(normalizedPages));
    return { pages: normalizedPages, tierList };
  }

  const enabledPages = Array.isArray(rawSettings?.enabledPages)
    ? rawSettings.enabledPages.filter((entry) => typeof entry === "string")
    : ["hallway", "weather", "time"];
  const rotationIntervalMs = normalizeDuration(rawSettings?.rotationIntervalMs ?? 30000);
  const rotationMode = String(rawSettings?.rotationMode || "time");

  const normalizedPages = {};
  for (const page of pages) {
    const defaults = defaultPageSettings({ ...page, displayId });
    const enabled = enabledPages.includes(page.id);
    const triggers = {
      timeBased: rotationMode === "time",
      scheduleBased: rotationMode === "schedule",
      weatherBased: rotationMode === "weather",
      phaseBased: rotationMode === "phase",
      scheduleEvent: "classChange",
      weatherCondition: "any",
      phase: rotationMode === "phase" ? "emergency" : "assembly"
    };

    normalizedPages[page.id] = normalizePageSettings(
      {
        ...defaults,
        enabled,
        displayDurationMs: rotationIntervalMs,
        triggers
      },
      page,
      displayId
    );
    normalizedPages[page.id] = enforceTierZeroInvariants(normalizedPages[page.id]);
  }

  const tierList = normalizeTierList(tierListInput, Object.values(normalizedPages));
  return { pages: normalizedPages, tierList };
}

function applyLegacyPatchToPerPageSettings(current, patch) {
  const next = JSON.parse(JSON.stringify(current));
  const pageEntries = Object.entries(next.pages || {});

  if (Array.isArray(patch.enabledPages)) {
    const enabledSet = new Set(patch.enabledPages.filter((entry) => typeof entry === "string"));
    for (const [pageId, page] of pageEntries) {
      if (page.tier === 0) {
        page.enabled = true;
        continue;
      }
      page.enabled = enabledSet.has(pageId);
    }
  }

  if (typeof patch.rotationIntervalMs === "number") {
    for (const [, page] of pageEntries) {
      page.displayDurationMs = normalizeDuration(patch.rotationIntervalMs);
    }
  }

  if (typeof patch.rotationMode === "string") {
    const mode = patch.rotationMode;
    for (const [, page] of pageEntries) {
      page.triggers.timeBased = mode === "time";
      page.triggers.scheduleBased = mode === "schedule";
      page.triggers.weatherBased = mode === "weather";
      page.triggers.phaseBased = mode === "phase";
    }
  }

  return next;
}

async function cleanupDeletedPages(displayId = DEFAULT_DISPLAY_ID) {
  const now = Date.now();
  const pages = await loadPages(displayId, { skipCleanup: true });
  const settings = await loadSettings(displayId, { skipCleanup: true });
  let changed = false;

  for (const page of pages) {
    if (!page.deleted || !page.deletedAt) continue;
    const ageMs = now - Date.parse(page.deletedAt);
    if (!Number.isFinite(ageMs) || ageMs < SOFT_DELETE_RETENTION_MS) continue;
    if (page.id === "emergency" || page.tier === 0) continue;

    changed = true;
    delete settings.pages[page.id];

    try { await executeFileCommand("file.delete", { path: page.metaPath, force: true }); } catch {}
    if (page.htmlPath) {
      try { await executeFileCommand("file.delete", { path: page.htmlPath, force: true }); } catch {}
    }
    if (page.jsPath) {
      try { await executeFileCommand("file.delete", { path: page.jsPath, force: true }); } catch {}
    }
  }

  if (changed) {
    const nextPages = pages.filter((page) => settings.pages[page.id] || page.id === "emergency" || page.id === "hallway" || page.id === "weather" || page.id === "time");
    await savePages(nextPages, displayId, { skipCleanup: true });
    await saveSettings(settings, displayId, { skipCleanup: true, internalPatch: true });
  }
}

export async function listDisplays() {
  const registry = await readJson(DISPLAY_REGISTRY_PATH, { displays: [DEFAULT_DISPLAY_ID], deletedDisplays: {} });
  const displays = Array.isArray(registry.displays) ? registry.displays : [DEFAULT_DISPLAY_ID];
  const deletedDisplays = registry.deletedDisplays && typeof registry.deletedDisplays === "object" ? registry.deletedDisplays : {};
  const unique = [DEFAULT_DISPLAY_ID, ...displays.filter((id) => id !== DEFAULT_DISPLAY_ID)];

  return {
    displays: unique,
    deletedDisplays
  };
}

export async function addDisplay(displayId) {
  const id = slugify(displayId || "");
  if (!id) {
    throw new Error("displayId is required");
  }

  const current = await listDisplays();
  const nextDisplays = current.displays.includes(id) ? current.displays : [...current.displays, id];
  const deletedDisplays = { ...current.deletedDisplays };
  delete deletedDisplays[id];

  await writeJson(DISPLAY_REGISTRY_PATH, {
    displays: nextDisplays,
    deletedDisplays
  });

  await loadPages(id);
  await loadSettings(id);

  return { displayId: id, displays: nextDisplays };
}

export async function deleteDisplay(displayId) {
  const id = String(displayId || "").trim();
  if (!id || id === DEFAULT_DISPLAY_ID) {
    throw new Error("Cannot delete default display");
  }

  const current = await listDisplays();
  if (!current.displays.includes(id)) {
    return { displayId: id, displays: current.displays, deleted: false };
  }

  const nextDisplays = current.displays.filter((entry) => entry !== id);
  const deletedDisplays = {
    ...current.deletedDisplays,
    [id]: new Date().toISOString()
  };

  await writeJson(DISPLAY_REGISTRY_PATH, {
    displays: nextDisplays,
    deletedDisplays
  });

  return { displayId: id, displays: nextDisplays, deleted: true };
}

export async function sharePlaylist(sourceDisplayId, targetDisplayId) {
  const source = String(sourceDisplayId || "").trim() || DEFAULT_DISPLAY_ID;
  const target = String(targetDisplayId || "").trim();
  if (!target) {
    throw new Error("targetDisplayId is required");
  }

  await addDisplay(target);

  const pages = await loadPages(source);
  const settings = await loadSettings(source);
  const tierList = await loadTierList(source);

  const clonedPages = pages.map((page) => ({
    ...page,
    displayId: target,
    updatedAt: new Date().toISOString()
  }));

  const clonedSettingsPages = {};
  for (const [pageId, pageSettings] of Object.entries(settings.pages || {})) {
    clonedSettingsPages[pageId] = {
      ...pageSettings,
      displayId: target
    };
  }

  await savePages(clonedPages, target);
  await saveSettings({ pages: clonedSettingsPages, tierList }, target);

  return {
    sourceDisplayId: source,
    targetDisplayId: target,
    pagesCopied: clonedPages.length
  };
}

export async function loadTierList(displayId = DEFAULT_DISPLAY_ID) {
  const paths = getStoragePaths(displayId);
  const settings = await readJson(paths.settingsPath, {});
  const fileTierList = await readJson(paths.tierListPath, [0, 1, 2, 3]);
  const pages = await loadPages(displayId, { skipCleanup: true });

  const tierList = normalizeTierList(settings.tierList ?? fileTierList, pages);
  await writeJson(paths.tierListPath, tierList);
  return tierList;
}

export async function setTierList(displayId = DEFAULT_DISPLAY_ID, patch = {}) {
  const paths = getStoragePaths(displayId);
  const settings = await loadSettings(displayId, { skipCleanup: true });
  const pages = Object.values(settings.pages || {});

  let tierList = normalizeTierList(
    Array.isArray(patch.tierList) ? patch.tierList : settings.tierList,
    pages
  );

  if (typeof patch.deleteTier === "number" && patch.deleteTier > 0) {
    const deletingTier = patch.deleteTier;
    tierList = tierList.filter((tier) => tier !== deletingTier);
    const destinationTier = Number.isInteger(patch.fallbackTier) && patch.fallbackTier > 0 ? patch.fallbackTier : 1;
    for (const page of pages) {
      if (page.tier === deletingTier) {
        page.tier = destinationTier;
      }
    }
  }

  if (typeof patch.addTier === "number" && patch.addTier > 0 && !tierList.includes(patch.addTier)) {
    tierList.push(patch.addTier);
  }

  if (typeof patch.moveTier === "number" && patch.moveTier > 0 && typeof patch.toIndex === "number") {
    const movingTier = patch.moveTier;
    const fromIndex = tierList.indexOf(movingTier);
    if (fromIndex >= 0) {
      tierList.splice(fromIndex, 1);
      const bounded = Math.max(1, Math.min(tierList.length, patch.toIndex));
      tierList.splice(bounded, 0, movingTier);
    }
  }

  tierList = normalizeTierList(tierList, pages);
  await writeJson(paths.tierListPath, tierList);
  await saveSettings({ pages: settings.pages, tierList }, displayId, { internalPatch: true, skipCleanup: true });
  return { tierList };
}

export async function loadPages(displayId = DEFAULT_DISPLAY_ID, options = {}) {
  const paths = getStoragePaths(displayId);
  const raw = await readJson(paths.pagesIndexPath, []);
  const normalized = normalizePagesIndex(raw, paths.displayId);
  await writeJson(paths.pagesIndexPath, normalized);

  if (!options.skipCleanup) {
    await cleanupDeletedPages(paths.displayId);
  }

  return normalized;
}

export async function savePages(pages, displayId = DEFAULT_DISPLAY_ID, options = {}) {
  const paths = getStoragePaths(displayId);
  const normalized = normalizePagesIndex(pages, paths.displayId);
  await writeJson(paths.pagesIndexPath, normalized);
  if (!options.skipCleanup) {
    await cleanupDeletedPages(paths.displayId);
  }
  return normalized;
}

export async function loadSettings(displayId = DEFAULT_DISPLAY_ID, options = {}) {
  const paths = getStoragePaths(displayId);
  const pages = await loadPages(paths.displayId, { skipCleanup: true });
  const raw = await readJson(paths.settingsPath, {});
  const tierListRaw = await readJson(paths.tierListPath, [0, 1, 2, 3]);
  const normalized = normalizeSettingsShape(raw || {}, pages, tierListRaw, paths.displayId);

  await writeJson(paths.settingsPath, normalized);
  await writeJson(paths.tierListPath, normalized.tierList);

  if (!options.skipCleanup) {
    await cleanupDeletedPages(paths.displayId);
  }

  return {
    ...toLegacyProjection(normalized),
    ...normalized
  };
}

export async function saveSettings(patch = {}, displayId = DEFAULT_DISPLAY_ID, options = {}) {
  const paths = getStoragePaths(displayId);
  const pages = await loadPages(paths.displayId, { skipCleanup: true });
  const current = await loadSettings(paths.displayId, { skipCleanup: true });
  const merged = options.internalPatch ? patch : deepMerge(current, patch || {});
  const withLegacyMapped = options.internalPatch ? merged : applyLegacyPatchToPerPageSettings(merged, patch || {});
  const normalized = normalizeSettingsShape(withLegacyMapped, pages, withLegacyMapped.tierList || current.tierList, paths.displayId);

  const lockedPages = {};
  for (const [pageId, pageSettings] of Object.entries(normalized.pages || {})) {
    lockedPages[pageId] = enforceTierZeroInvariants(pageSettings);
  }

  const finalSettings = {
    pages: lockedPages,
    tierList: normalizeTierList(normalized.tierList, Object.values(lockedPages))
  };

  await writeJson(paths.settingsPath, finalSettings);
  await writeJson(paths.tierListPath, finalSettings.tierList);

  if (!options.skipCleanup) {
    await cleanupDeletedPages(paths.displayId);
  }

  return {
    ...toLegacyProjection(finalSettings),
    ...finalSettings
  };
}

export async function listSettings(params = {}) {
  const displayId = params.displayId || DEFAULT_DISPLAY_ID;
  return [await loadSettings(displayId)];
}

export async function getPageSettings(pageId, displayId = DEFAULT_DISPLAY_ID) {
  const settings = await loadSettings(displayId);
  return settings.pages[pageId] || null;
}

export async function setPageSettings(pageId, patch = {}, displayId = DEFAULT_DISPLAY_ID) {
  const pages = await loadPages(displayId, { skipCleanup: true });
  const targetPage = pages.find((page) => page.id === pageId) || {
    id: pageId,
    name: pageId,
    type: pageId === "time" ? "time" : pageId === "weather" ? "weather" : pageId === "emergency" ? "emergency" : "custom",
    displayId
  };

  const current = await loadSettings(displayId, { skipCleanup: true });
  const currentPageSettings = current.pages[pageId] || defaultPageSettings(targetPage);

  const nextPageSettings = normalizePageSettings(deepMerge(currentPageSettings, patch), targetPage, displayId);

  if (currentPageSettings.tier === 0 || nextPageSettings.tier === 0 || nextPageSettings.id === "emergency") {
    if (patch.deleted === true) {
      throw new Error("Tier 0 pages cannot be deleted");
    }
    nextPageSettings.tier = 0;
    nextPageSettings.enabled = true;
    nextPageSettings.deleted = false;
    nextPageSettings.deletedAt = undefined;
    nextPageSettings.type = "emergency";
    nextPageSettings.triggers.phaseBased = true;
    nextPageSettings.triggers.timeBased = false;
  }

  const nextSettings = await saveSettings(
    {
      pages: {
        ...current.pages,
        [pageId]: nextPageSettings
      },
      tierList: current.tierList
    },
    displayId,
    { internalPatch: true }
  );

  return nextSettings.pages[pageId];
}

export async function listPageSettings(displayId = DEFAULT_DISPLAY_ID, includeDeleted = false) {
  const settings = await loadSettings(displayId);
  const pages = Object.values(settings.pages);
  return includeDeleted ? pages : pages.filter((page) => !page.deleted);
}

export async function softDeletePage(pageId, displayId = DEFAULT_DISPLAY_ID) {
  if (pageId === "emergency") {
    throw new Error("Tier 0 pages cannot be deleted");
  }

  const current = await loadSettings(displayId, { skipCleanup: true });
  const page = current.pages[pageId];
  if (!page) {
    throw new Error(`Unknown page: ${pageId}`);
  }
  if (page.tier === 0) {
    throw new Error("Tier 0 pages cannot be deleted");
  }

  const updated = await setPageSettings(pageId, {
    deleted: true,
    deletedAt: new Date().toISOString(),
    enabled: false
  }, displayId);

  const pages = await loadPages(displayId, { skipCleanup: true });
  const pageEntry = pages.find((entry) => entry.id === pageId);
  if (pageEntry) {
    pageEntry.deleted = true;
    pageEntry.deletedAt = updated.deletedAt;
    await savePages(pages, displayId, { skipCleanup: true });
  }

  return updated;
}

export async function restorePage(pageId, displayId = DEFAULT_DISPLAY_ID) {
  const updated = await setPageSettings(pageId, {
    deleted: false,
    deletedAt: undefined,
    enabled: true
  }, displayId);

  const pages = await loadPages(displayId, { skipCleanup: true });
  const pageEntry = pages.find((entry) => entry.id === pageId);
  if (pageEntry) {
    pageEntry.deleted = false;
    pageEntry.deletedAt = undefined;
    await savePages(pages, displayId, { skipCleanup: true });
  }

  return updated;
}

export async function addPage(params = {}) {
  const displayId = String(params.displayId || DEFAULT_DISPLAY_ID).trim() || DEFAULT_DISPLAY_ID;
  const name = String(params.name || "").trim();
  const pageType = normalizePageType(params.type);
  const url = String(params.url || "").trim();
  const code = String(params.code || "").trim();

  if (!name) {
    throw new Error("Page name is required");
  }

  if (pageType === "url" && !url) {
    throw new Error("URL is required for url page type");
  }

  if ((pageType === "inline-code" || pageType === "custom") && !code && pageType === "inline-code") {
    throw new Error("Code is required for inline-code page type");
  }

  const pages = await loadPages(displayId, { skipCleanup: true });
  const pageIdBase = slugify(params.pageId || name);
  if (!pageIdBase) {
    throw new Error("Unable to derive page id from page name");
  }

  const existingIds = new Set(pages.map((p) => p.id));
  const existingNames = new Set(
    pages.filter((p) => p.deleted !== true).map((p) => String(p.name || "").toLowerCase())
  );

  if (existingNames.has(name.toLowerCase())) {
    throw new Error(`Duplicate page name: ${name}`);
  }

  let pageId = pageIdBase;
  let suffix = 2;
  while (existingIds.has(pageId)) {
    pageId = `${pageIdBase}-${suffix}`;
    suffix += 1;
  }

  const now = new Date().toISOString();
  const storagePaths = getStoragePaths(displayId);
  const pageDirPrefix = storagePaths.displayId === DEFAULT_DISPLAY_ID ? "/content/pages" : `${DISPLAY_ROOT}/${displayId}`;

  const page = {
    id: pageId,
    name,
    type: pageType,
    url: pageType === "url" ? url : undefined,
    htmlPath: pageType === "inline-code" || pageType === "custom" ? `${pageDirPrefix}/${pageId}.html` : undefined,
    jsPath: pageType === "inline-code" || pageType === "custom" ? `${pageDirPrefix}/${pageId}.js` : undefined,
    metaPath: `${pageDirPrefix}/${pageId}.json`,
    displayId,
    deleted: false,
    createdAt: now,
    updatedAt: now
  };

  if (pageType === "inline-code" || pageType === "custom") {
    await executeFileCommand("file.write", {
      path: page.htmlPath,
      content: code || `<section><h1>${name}</h1></section>`
    });
    await executeFileCommand("file.write", {
      path: page.jsPath,
      content: ""
    });
  }

  await executeFileCommand("file.write", {
    path: page.metaPath,
    content: `${JSON.stringify(page, null, 2)}\n`
  });

  pages.push(page);
  await savePages(pages, displayId, { skipCleanup: true });

  const baselineSettings = defaultPageSettings(page);
  baselineSettings.displayId = displayId;
  baselineSettings.type = pageType;
  baselineSettings.tier = pageType === "emergency" ? 0 : Number(params.tier) > 0 ? Number(params.tier) : 1;
  if (pageType === "url") {
    baselineSettings.customSettings = {
      ...defaultCustomSettings(),
      url
    };
  }
  if (pageType === "inline-code" || pageType === "custom") {
    baselineSettings.customSettings = {
      ...defaultCustomSettings(),
      inlineCode: code
    };
  }

  await setPageSettings(pageId, baselineSettings, displayId);

  return page;
}

export async function buildSettingsDownload(params = {}) {
  const displayId = params.displayId || DEFAULT_DISPLAY_ID;
  const settings = await loadSettings(displayId);
  const pages = await loadPages(displayId);
  const tierList = await loadTierList(displayId);
  return {
    generatedAt: new Date().toISOString(),
    displayId,
    settings,
    pages,
    tierList
  };
}

export async function buildPagesBackup(params = {}) {
  const displayId = params.displayId || DEFAULT_DISPLAY_ID;
  const pages = await loadPages(displayId);
  const files = [];

  for (const page of pages) {
    if (page.metaPath) {
      try {
        const meta = await executeFileCommand("file.read", { path: page.metaPath });
        files.push({ path: page.metaPath, content: meta.content });
      } catch {}
    }

    if ((page.type === "inline-code" || page.type === "custom") && page.htmlPath) {
      try {
        const html = await executeFileCommand("file.read", { path: page.htmlPath });
        files.push({ path: page.htmlPath, content: html.content });
      } catch {}
    }

    if ((page.type === "inline-code" || page.type === "custom") && page.jsPath) {
      try {
        const js = await executeFileCommand("file.read", { path: page.jsPath });
        files.push({ path: page.jsPath, content: js.content });
      } catch {}
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    displayId,
    pages,
    files
  };

  const buffer = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  return {
    filename: "pages-backup.zip",
    contentType: "application/zip",
    archiveBase64: buffer.toString("base64")
  };
}

export async function restoreSettingsFromPayload(payload = {}) {
  const displayId = payload.displayId || DEFAULT_DISPLAY_ID;
  const pages = await loadPages(displayId);
  const settingsPayload = payload.settings || payload;
  const tierList = payload.tierList || settingsPayload.tierList || [0, 1, 2, 3];
  const normalized = normalizeSettingsShape(settingsPayload || {}, pages, tierList, displayId);
  await writeJson(getStoragePaths(displayId).settingsPath, normalized);
  await writeJson(getStoragePaths(displayId).tierListPath, normalized.tierList);

  if (Array.isArray(payload.pages)) {
    await savePages(payload.pages, displayId);
  }

  return {
    ok: true,
    settings: {
      ...toLegacyProjection(normalized),
      ...normalized
    },
    pages: Array.isArray(payload.pages) ? payload.pages : await loadPages(displayId),
    tierList: normalized.tierList,
    displayId
  };
}

export async function getPageById(pageId, displayId = DEFAULT_DISPLAY_ID) {
  const pages = await loadPages(displayId);
  return pages.find((page) => page.id === pageId) || null;
}

export function isBuiltinRole(role) {
  return role === "hallway" || role === "weather" || role === "time";
}

export function buildCustomPagePayload(role, page, pageSettings = null) {
  if (page.type === "time") {
    return {
      role,
      currentEvent: "custom-page",
      currentPhase: "active",
      nextPhase: null,
      countdownSeconds: 0,
      content: {
        object: {
          type: "TimeObject",
          currentTime: null,
          updatesEverySeconds: 1,
          timeSettings: pageSettings?.timeSettings || defaultTimeSettings()
        }
      }
    };
  }

  if (page.type === "weather") {
    const weatherSettings = pageSettings?.weatherSettings || defaultWeatherSettings();
    return {
      role,
      currentEvent: "custom-page",
      currentPhase: "active",
      nextPhase: null,
      countdownSeconds: 0,
      content: {
        object: {
          type: "WeatherObject",
          temperature: weatherSettings.units === "C" ? 22 : 72,
          units: weatherSettings.units,
          conditions: weatherSettings.severeWeatherOverride ? "Severe Watch" : "Partly Cloudy",
          icon: weatherSettings.iconPack === "minimal" ? "cloud" : "⛅"
        }
      }
    };
  }

  if (page.type === "emergency") {
    const emergencySettings = pageSettings?.emergencySettings || defaultEmergencySettings();
    return {
      role,
      currentEvent: "emergency",
      currentPhase: pageSettings?.triggers?.phase || "emergency",
      nextPhase: null,
      countdownSeconds: 0,
      content: {
        object: {
          type: "EmergencyObject",
          severity: emergencySettings.severity,
          expiryTime: emergencySettings.expiryTime || null,
          overrideBehavior: emergencySettings.overrideBehavior,
          message: `${page.name} active`
        }
      }
    };
  }

  return {
    role,
    currentEvent: "custom-page",
    currentPhase: "active",
    nextPhase: null,
    countdownSeconds: 0,
    content: {
      object: {
        type: "CustomPageObject",
        pageId: page.id,
        pageName: page.name,
        pageType: page.type,
        url: page.url || pageSettings?.customSettings?.url || null,
        assetFolder: pageSettings?.customSettings?.assetFolder || null,
        contentPath: page.htmlPath || null,
        deleted: pageSettings?.deleted === true,
        tier: pageSettings?.tier || 1,
        displayId: pageSettings?.displayId || DEFAULT_DISPLAY_ID
      }
    }
  };
}
