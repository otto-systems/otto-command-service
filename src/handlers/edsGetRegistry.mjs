import { executeEdsCommand } from "../../../otto-kernel/src/eds/eds-runtime.mjs";

export async function handle(params = {}) {
  return executeEdsCommand("eds.get.registry", params);
}
