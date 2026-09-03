import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSettings } from "./orchestratorStorage.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const FRONTEND_CONFIG_PATH = path.join(ROOT, "modules", "display-frontend", "public", "display-config.json");

function buildRotationPlan(config, settings) {
  const displayId = String(config.defaults?.displayId || "hallway");
  const displayPages = Array.isArray(config.displays?.[displayId]?.pages) ? config.displays[displayId].pages : [];
  const settingsPages = settings?.pages ?? {};
  const pageIds = Array.from(new Set([
    ...displayPages.map((page) => page.id),
    ...Object.keys(settingsPages)
  ]));

  const pages = pageIds.map((pageId) => {
    const configPage = displayPages.find((page) => page.id === pageId) ?? {
      id: pageId,
      label: `${pageId.slice(0, 1).toUpperCase()}${pageId.slice(1)} Page`,
      modules: [pageId]
    };
    const pageSettings = settingsPages[pageId] ?? { displayDurationMs: 30000, tier: 1 };
    return {
      id: configPage.id,
      label: configPage.label,
      modules: configPage.modules ?? [pageId],
      displayDurationMs: Number(pageSettings.displayDurationMs ?? 30000),
      tier: Number(pageSettings.tier ?? 1),
      deleted: Boolean(pageSettings.deleted),
      displayId,
      triggers: pageSettings.triggers ?? {},
      timeSettings: pageSettings.timeSettings,
      weatherSettings: pageSettings.weatherSettings,
      emergencySettings: pageSettings.emergencySettings
    };
  }).filter((page) => !page.deleted && (page.triggers?.enabled !== false));

  const firstPage = pages[0] ?? {
    id: "hallway",
    label: "Hallway Page",
    modules: ["hallway"],
    displayDurationMs: 30000,
    tier: 1,
    deleted: false,
    displayId,
    triggers: {},
    timeSettings: undefined,
    weatherSettings: undefined,
    emergencySettings: undefined
  };

  const nextPage = pages[1] ?? firstPage;

  return {
    generatedAt: new Date().toISOString(),
    displayId,
    rotationMode: "per-page",
    rotationIntervalMs: firstPage.displayDurationMs,
    pages,
    currentPage: {
      id: firstPage.id,
      name: firstPage.label,
      tier: firstPage.tier,
      triggerReason: "default",
      countdownMs: firstPage.displayDurationMs,
      expiry: new Date(Date.now() + firstPage.displayDurationMs).toISOString()
    },
    nextPage: {
      id: nextPage.id,
      name: nextPage.label,
      tier: nextPage.tier
    },
    currentTier: firstPage.tier,
    nextTier: nextPage.tier,
    triggerReason: "default",
    countdownMs: firstPage.displayDurationMs,
    expiry: new Date(Date.now() + firstPage.displayDurationMs).toISOString()
  };
}

export async function handle(params = {}) {
  const baseConfig = JSON.parse(await fs.readFile(FRONTEND_CONFIG_PATH, "utf8"));
  const displayId = String(params.displayId || baseConfig.defaults?.displayId || "hallway");
  const config = {
    ...baseConfig,
    defaults: {
      ...(baseConfig.defaults || {}),
      displayId
    }
  };
  const settings = await loadSettings(displayId);
  return buildRotationPlan(config, settings);
}
