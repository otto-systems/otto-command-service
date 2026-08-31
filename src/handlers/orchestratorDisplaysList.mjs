import { listDisplays } from "./orchestratorStorage.mjs";

export async function handle() {
  return listDisplays();
}
