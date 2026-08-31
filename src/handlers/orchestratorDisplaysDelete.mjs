import { deleteDisplay } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  return deleteDisplay(params.displayId || params.id || params.name);
}
