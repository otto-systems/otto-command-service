import { executeEdgeProfileCommand } from "../../../otto-edge-profile-extension/src/edge-profile-runtime.mjs";

export async function handle(payload = {}) {
  return executeEdgeProfileCommand("edge.profile.resolve", payload);
}
