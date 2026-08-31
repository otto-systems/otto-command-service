import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateRotationPlan } from "../../../../../modules/display-orchestrator/dist/orchestrator/generateRotationPlan.js";
import { loadSettings } from "./orchestratorStorage.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const FRONTEND_CONFIG_PATH = path.join(ROOT, "modules", "display-frontend", "public", "display-config.json");

export async function handle() {
  const baseConfig = JSON.parse(await fs.readFile(FRONTEND_CONFIG_PATH, "utf8"));
  const settings = await loadSettings();
  return generateRotationPlan(baseConfig, settings);
}
