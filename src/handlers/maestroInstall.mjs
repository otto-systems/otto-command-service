import { runPreInstall, runPostInstall } from "./maestroShared.mjs";

export async function handle(params = {}) {
  const pre = runPreInstall(params);
  if (!pre.ok) {
    return pre;
  }

  return runPostInstall(params);
}
