import { executeDebugCommand } from "../../../otto-debug-extension/src/debug-runtime.mjs";

export async function handle(params = {}) {
  return executeDebugCommand("debug.trace.command", params);
}
