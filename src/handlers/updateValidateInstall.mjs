import { runUpdateInstallPreflight } from "./updateInstallPreflight.mjs";

export async function handle(params = {}) {
  const strict = params.strict !== false;
  const preflight = await runUpdateInstallPreflight();

  if (strict && !preflight.ok) {
    const first = preflight.issues[0];
    throw new Error(`Update install preflight failed: ${first?.message || "unknown issue"}`);
  }

  return preflight;
}
