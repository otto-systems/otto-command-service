import { getPageSettings } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  const pageId = String(params.pageId || params.id || "").trim();
  if (!pageId) {
    throw new Error("pageId is required");
  }
  return getPageSettings(pageId, params.displayId);
}
