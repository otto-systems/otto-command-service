import { listPageSettings } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  const pages = await listPageSettings(params.displayId, params.includeDeleted === true);
  return { pages };
}
