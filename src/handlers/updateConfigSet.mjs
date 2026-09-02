import { callOttoUpdate } from "./updateShared.mjs";

export async function handle(params = {}) {
  return callOttoUpdate("PUT", "/v1/config", params);
}
