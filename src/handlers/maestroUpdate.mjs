import { runPreUpdate, runPostUpdate } from "./maestroShared.mjs";

export async function handle(params = {}) {
  const pre = runPreUpdate(params);
  if (!pre.ok) {
    return pre;
  }

  return runPostUpdate(params);
}
