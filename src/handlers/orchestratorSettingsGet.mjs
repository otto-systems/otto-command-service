import { loadSettings } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  const displayId = params.displayId;
  return loadSettings(displayId);
}
