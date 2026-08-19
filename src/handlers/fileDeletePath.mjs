import { executeFileCommand } from "../../../otto-file-extension/src/file-runtime.mjs";

export async function handle(params = {}) {
  return executeFileCommand("file.delete.path", params);
}
