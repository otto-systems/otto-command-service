import { loadSettings } from "./orchestratorStorage.mjs";

export async function handle() {
  return loadSettings();
}
