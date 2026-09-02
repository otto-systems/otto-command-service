import { readFile } from "node:fs/promises";
import path from "node:path";

import { executeAssignmentsCommand } from "../../../otto-assignments-normalizer-extension/src/assignments-runtime.mjs";

async function loadCsvFromParams(params = {}) {
  const file = String(params.file || "").trim();
  if (!file) {
    return "";
  }

  const absolutePath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  return readFile(absolutePath, "utf8");
}

export async function handle(params = {}) {
  const csv = await loadCsvFromParams(params);
  return executeAssignmentsCommand("assignments.refresh", { csv });
}
