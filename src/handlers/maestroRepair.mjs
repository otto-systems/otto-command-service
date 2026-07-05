import { runPreInstall } from "./maestroShared.mjs";

export async function handle(params = {}) {
  return runPreInstall(params);
}
