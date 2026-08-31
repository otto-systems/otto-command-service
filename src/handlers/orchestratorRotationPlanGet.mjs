import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateRotationPlan } from "../../../../../modules/display-orchestrator/dist/orchestrator/generateRotationPlan.js";
import { loadSettings } from "./orchestratorStorage.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const FRONTEND_CONFIG_PATH = path.join(ROOT, "modules", "display-frontend", "public", "display-config.json");

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
  return generateRotationPlan(config, settings);
}
