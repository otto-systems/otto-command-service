import { loadPages } from "./orchestratorStorage.mjs";

export async function handle() {
  const pages = await loadPages();
  return { pages };
}
