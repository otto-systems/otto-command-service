import { setTierList } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  const displayId = params.displayId;
  const patch = params.patch ?? params;
  return setTierList(displayId, patch);
}
