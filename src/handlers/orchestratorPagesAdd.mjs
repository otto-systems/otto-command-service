import { addPage } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  return addPage(params);
}
