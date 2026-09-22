import { executeEdgeServiceCommand } from "../../../otto-edge-service-extension/src/edge-service-runtime.mjs";

export async function handle(payload = {}) {
  return executeEdgeServiceCommand("edge.service.plan", payload);
}
