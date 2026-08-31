import { listSettings } from "./orchestratorStorage.mjs";

export async function handle() {
  return listSettings();
}
