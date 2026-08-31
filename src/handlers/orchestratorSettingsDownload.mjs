import { buildSettingsDownload } from "./orchestratorStorage.mjs";

export async function handle() {
  return buildSettingsDownload();
}
