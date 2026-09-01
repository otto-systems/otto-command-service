import { executeAuthCommand } from "../../../otto-auth-extension/src/auth-runtime.mjs";

export async function handle(payload = {}) {
  try {
    const user = await executeAuthCommand("auth.get.user", payload);
    return user || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Auth user retrieval failed: ${message}`);
  }
}
