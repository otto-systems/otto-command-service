import { buildPagesBackup } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  return buildPagesBackup(params);
}
