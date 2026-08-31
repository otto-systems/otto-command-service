import { restoreSettingsFromPayload } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  return restoreSettingsFromPayload(params);
}
