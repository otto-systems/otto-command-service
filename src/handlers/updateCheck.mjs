import { callOttoUpdate } from "./updateShared.mjs";
import { runUpdateInstallPreflight } from "./updateInstallPreflight.mjs";

export async function handle() {
  const preflight = await runUpdateInstallPreflight();
  if (!preflight.ok) {
    const firstIssue = preflight.issues[0];
    throw new Error(`Update check blocked: ${firstIssue?.message || "preflight failed"}`);
  }

  const checkResult = await callOttoUpdate("POST", "/v1/check", undefined, [200, 202]);
  return {
    ...checkResult,
    preflight
  };
}
