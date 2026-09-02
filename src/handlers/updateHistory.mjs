import { callOttoUpdate, readNumber } from "./updateShared.mjs";

export async function handle(params = {}) {
  const limit = readNumber(params.limit, 50);
  const offset = readNumber(params.offset, 0);

  return callOttoUpdate("GET", "/v1/history", undefined, [200], {
    limit,
    offset
  });
}
