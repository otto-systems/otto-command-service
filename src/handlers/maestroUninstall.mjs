import { runPreUpdate } from "./maestroShared.mjs";

export async function handle(params = {}) {
  return runPreUpdate(params);
}
