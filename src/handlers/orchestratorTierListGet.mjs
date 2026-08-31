import { loadTierList } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  const displayId = params.displayId;
  const tierList = await loadTierList(displayId);
  return { tierList };
}
