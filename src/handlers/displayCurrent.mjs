import { buildDisplayCurrentHandler } from "../../../../../modules/display-orchestrator/dist/api/current-endpoint.js";
import { buildCustomPagePayload, getPageById, isBuiltinRole } from "./orchestratorStorage.mjs";

const displayCurrent = buildDisplayCurrentHandler();

export async function handle(params = {}) {
  const role = String(params.role || "").trim();

  if (!role) {
    throw new Error("role is required");
  }

  if (isBuiltinRole(role)) {
    return displayCurrent({ role });
  }

  const page = await getPageById(role);
  if (!page) {
    throw new Error(`Unknown role: ${role}`);
  }

  return buildCustomPagePayload(role, page);
}
