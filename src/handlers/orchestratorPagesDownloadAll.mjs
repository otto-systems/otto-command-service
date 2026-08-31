import { buildPagesBackup } from "./orchestratorStorage.mjs";

export async function handle() {
  return buildPagesBackup();
}
