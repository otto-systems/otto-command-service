import { executeTlsAutomationCommand } from "../../../otto-tls-automation-extension/src/tls-automation-runtime.mjs";

export async function handle(payload = {}) {
  return executeTlsAutomationCommand("edge.tls.plan", payload);
}
