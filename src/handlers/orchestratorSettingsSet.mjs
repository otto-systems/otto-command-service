import { saveSettings } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  const patch = params.patch ?? params;
  return saveSettings(patch);
}
