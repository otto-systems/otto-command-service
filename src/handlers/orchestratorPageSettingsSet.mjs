import { setPageSettings } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  const pageId = String(params.pageId || params.id || "").trim();
  if (!pageId) {
    throw new Error("pageId is required");
  }
  const patch = params.patch ?? params;
  return setPageSettings(pageId, patch, params.displayId);
}
