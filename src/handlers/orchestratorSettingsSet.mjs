import { saveSettings } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  const patch = params.patch ?? params;
  const displayId = params.displayId;
  return saveSettings(patch, displayId);
}
