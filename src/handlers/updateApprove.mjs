import { callOttoUpdate } from "./updateShared.mjs";

export async function handle(params = {}) {
  const checkId = params.check_id;
  if (!checkId || typeof checkId !== "string") {
    throw new Error("check_id is required");
  }

  return callOttoUpdate("POST", "/v1/approve", {
    check_id: checkId
  });
}
