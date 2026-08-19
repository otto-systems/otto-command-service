import { buildDisplayCurrentHandler } from "../../../../../modules/display-orchestrator/dist/api/current-endpoint.js";

const displayCurrent = buildDisplayCurrentHandler();

export async function handle(params = {}) {
  return displayCurrent({ role: params.role });
}
