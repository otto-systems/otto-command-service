import { executeAssignmentsCommand } from "../../../otto-assignments-normalizer-extension/src/assignments-runtime.mjs";

export async function handle(params = {}) {
  return executeAssignmentsCommand("assignments.get.by-id", params);
}
