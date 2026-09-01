import { executeCalendarCommand } from "../../../otto-calendar-connector-extension/src/calendar-runtime.mjs";

export async function handle(payload = {}) {
  try {
    const { providerId, clientId, clientSecret } = payload;
    
    if (!providerId) {
      throw new Error("providerId is required");
    }
    
    if (!["microsoft", "google"].includes(providerId)) {
      throw new Error("providerId must be 'microsoft' or 'google'");
    }
    
    if (!clientId) {
      throw new Error("clientId is required");
    }
    
    if (!clientSecret) {
      throw new Error("clientSecret is required");
    }
    
    return await executeCalendarCommand("calendar.set.provider.config", {
      providerId,
      clientId,
      clientSecret
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Calendar set provider config failed: ${message}`);
  }
}
