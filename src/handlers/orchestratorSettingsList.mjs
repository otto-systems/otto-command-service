import { listSettings } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  return listSettings(params);
}
