import { executeDataCommand } from "../../../otto-data-extension/src/data-runtime.mjs";

export async function handle(params = {}) {
  return executeDataCommand("data.records.import", params);
}
