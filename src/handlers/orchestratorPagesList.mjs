import { loadPages } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  const pages = await loadPages(params.displayId);
  return { pages };
}
