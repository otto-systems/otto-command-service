import { executeAuthCommand } from "../../../otto-auth-extension/src/auth-runtime.mjs";

export async function handle(payload = {}) {
  try {
    const token = await executeAuthCommand("auth.get.token", payload);
    return token || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Auth token retrieval failed: ${message}`);
  }
}
