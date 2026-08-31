import { buildSettingsDownload } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  return buildSettingsDownload(params);
}
