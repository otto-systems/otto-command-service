import { buildDisplayCurrentHandler } from "../../../../../modules/display-orchestrator/dist/api/current-endpoint.js";
import { buildCustomPagePayload, getPageById, getPageSettings, isBuiltinRole } from "./orchestratorStorage.mjs";

const displayCurrent = buildDisplayCurrentHandler();

export async function handle(params = {}) {
  const role = String(params.role || "").trim();
  const displayId = String(params.displayId || "hallway").trim() || "hallway";

  if (!role) {
    throw new Error("role is required");
  }

  if (isBuiltinRole(role)) {
    const payload = displayCurrent({ role });
    if (role === "time") {
      const timeSettings = await getPageSettings("time", displayId);
      if (payload?.content?.object) {
        payload.content.object.timeSettings = timeSettings?.timeSettings;
      }
    }
    return payload;
  }

  const page = await getPageById(role, displayId);
  if (!page) {
    throw new Error(`Unknown role: ${role}`);
  }

  const pageSettings = await getPageSettings(role, displayId);
  if (pageSettings?.deleted) {
    throw new Error(`Role deleted: ${role}`);
  }
  return buildCustomPagePayload(role, page, pageSettings);
}
