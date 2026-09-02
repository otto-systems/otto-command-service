import { executeGatewayCommand } from "../../../otto-api-gateway-factory-extension/src/gateway-runtime.mjs";

export async function handle(params = {}) {
  return executeGatewayCommand("gateway.pisignage.push", params);
}
