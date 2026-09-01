import { executeCalendarCommand } from "../../../otto-calendar-connector-extension/src/calendar-runtime.mjs";

export async function handle(payload = {}) {
  try {
    return await executeCalendarCommand("calendar.sync", payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Calendar sync failed: ${message}`);
  }
}
