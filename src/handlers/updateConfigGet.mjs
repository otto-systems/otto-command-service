import { callOttoUpdate } from "./updateShared.mjs";

export async function handle() {
  return callOttoUpdate("GET", "/v1/config");
}
