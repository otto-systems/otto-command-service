import { callOttoUpdate } from "./updateShared.mjs";

export async function handle() {
  return callOttoUpdate("POST", "/v1/check");
}
