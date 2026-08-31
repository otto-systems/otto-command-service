import { addDisplay } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  return addDisplay(params.displayId || params.id || params.name);
}
