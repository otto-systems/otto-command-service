import { executeFileCommand } from "../../../otto-file-extension/src/file-runtime.mjs";

export async function handle() {
  return executeFileCommand("file.list.installs", undefined);
}
