import { executeDebugCommand } from "../../../otto-debug-extension/src/debug-runtime.mjs";

export async function handle() {
  return executeDebugCommand("debug.report.last-run", undefined);
}
