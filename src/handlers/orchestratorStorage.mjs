import path from "node:path";
import { executeFileCommand } from "../../../otto-file-extension/src/file-runtime.mjs";
import { defaultOrchestratorSettings, normalizeOrchestratorSettings } from "../../../../../modules/display-orchestrator/dist/settings/OrchestratorSettings.js";

const SETTINGS_PATH = "/content/settings/orchestrator-settings.json";
const PAGES_INDEX_PATH = "/content/pages/pages.json";

function slugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

export async function loadSettings() {
  const raw = await readJson(SETTINGS_PATH, defaultOrchestratorSettings);
  return normalizeOrchestratorSettings(raw || defaultOrchestratorSettings);
}

export async function saveSettings(patch = {}) {
  const current = await loadSettings();
  const merged = {
    ...current,
    ...patch,
    weatherTriggers: {
      ...current.weatherTriggers,
      ...(patch.weatherTriggers || {})
    },
    scheduleTriggers: {
      ...current.scheduleTriggers,
      ...(patch.scheduleTriggers || {})
    },
    phaseTriggers: {
      ...current.phaseTriggers,
      ...(patch.phaseTriggers || {})
    }
  };

  const normalized = normalizeOrchestratorSettings(merged);
  await writeJson(SETTINGS_PATH, normalized);
  return normalized;
}

export async function listSettings() {
  return [await loadSettings()];
}

export async function loadPages() {
  const pages = await readJson(PAGES_INDEX_PATH, []);
  return Array.isArray(pages) ? pages : [];
}

export async function savePages(pages) {
  await writeJson(PAGES_INDEX_PATH, pages);
  return pages;
}

export async function addPage(params = {}) {
  const name = String(params.name || "").trim();
  const pageType = params.type === "url" ? "url" : params.type === "inline-code" ? "inline-code" : "";
  const url = String(params.url || "").trim();
  const code = String(params.code || "").trim();

  if (!name) {
    throw new Error("Page name is required");
  }
  if (!pageType) {
    throw new Error("Page type must be url or inline-code");
  }
  if (pageType === "url" && !url) {
    throw new Error("URL is required for url page type");
  }
  if (pageType === "inline-code" && !code) {
    throw new Error("Code is required for inline-code page type");
  }

  const pages = await loadPages();
  const pageIdBase = slugify(params.pageId || name);
  if (!pageIdBase) {
    throw new Error("Unable to derive page id from page name");
  }

  const existingIds = new Set(pages.map((p) => p.id));
  const existingNames = new Set(pages.map((p) => String(p.name || "").toLowerCase()));

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
  const page = {
    id: pageId,
    name,
    type: pageType,
    url: pageType === "url" ? url : undefined,
    htmlPath: pageType === "inline-code" ? `/content/pages/${pageId}.html` : undefined,
    jsPath: pageType === "inline-code" ? `/content/pages/${pageId}.js` : undefined,
    metaPath: `/content/pages/${pageId}.json`,
    createdAt: now,
    updatedAt: now
  };

  if (pageType === "inline-code") {
    await executeFileCommand("file.write", {
      path: `/content/pages/${pageId}.html`,
      content: code
    });
    await executeFileCommand("file.write", {
      path: `/content/pages/${pageId}.js`,
      content: ""
    });
  }

  await executeFileCommand("file.write", {
    path: `/content/pages/${pageId}.json`,
    content: `${JSON.stringify(page, null, 2)}\n`
  });

  pages.push(page);
  await savePages(pages);
  return page;
}

export async function buildSettingsDownload() {
  const settings = await loadSettings();
  const pages = await loadPages();
  return {
    generatedAt: new Date().toISOString(),
    settings,
    pages
  };
}

export async function buildPagesBackup() {
  const pages = await loadPages();
  const files = [];

  for (const page of pages) {
    if (page.metaPath) {
      try {
        const meta = await executeFileCommand("file.read", { path: page.metaPath });
        files.push({ path: page.metaPath, content: meta.content });
      } catch {
        // ignore missing page meta in backup
      }
    }

    if (page.type === "inline-code" && page.htmlPath) {
      try {
        const html = await executeFileCommand("file.read", { path: page.htmlPath });
        files.push({ path: page.htmlPath, content: html.content });
      } catch {
        // ignore missing html in backup
      }
    }

    if (page.type === "inline-code" && page.jsPath) {
      try {
        const js = await executeFileCommand("file.read", { path: page.jsPath });
        files.push({ path: page.jsPath, content: js.content });
      } catch {
        // ignore missing js in backup
      }
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
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
  const settings = normalizeOrchestratorSettings(payload.settings || payload);
  await writeJson(SETTINGS_PATH, settings);

  if (Array.isArray(payload.pages)) {
    await savePages(payload.pages);
  }

  return {
    ok: true,
    settings,
    pages: Array.isArray(payload.pages) ? payload.pages : await loadPages()
  };
}

export async function getPageById(pageId) {
  const pages = await loadPages();
  return pages.find((page) => page.id === pageId) || null;
}

export function isBuiltinRole(role) {
  return role === "hallway" || role === "weather" || role === "time";
}

export function buildCustomPagePayload(role, page) {
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
        url: page.url || null,
        contentPath: page.htmlPath || null
      }
    }
  };
}
