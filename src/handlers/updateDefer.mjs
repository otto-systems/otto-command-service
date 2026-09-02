import { callOttoUpdate, readNumber } from "./updateShared.mjs";

export async function handle(params = {}) {
  const checkId = params.check_id;
  if (!checkId || typeof checkId !== "string") {
    throw new Error("check_id is required");
  }

  const deferSeconds = readNumber(params.defer_seconds, NaN);
  if (!Number.isFinite(deferSeconds) || deferSeconds <= 0) {
    throw new Error("defer_seconds must be a positive number");
  }

  return callOttoUpdate("POST", "/v1/defer", {
    check_id: checkId,
    defer_seconds: deferSeconds
  });
}
