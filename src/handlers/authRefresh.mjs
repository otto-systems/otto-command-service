import { executeAuthCommand } from "../../../otto-auth-extension/src/auth-runtime.mjs";

export async function handle(payload = {}) {
  try {
    const session = await executeAuthCommand("auth.refresh", payload);
    return session;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Auth refresh failed: ${message}`);
  }
}
