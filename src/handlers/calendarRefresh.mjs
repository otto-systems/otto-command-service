import { executeCalendarCommand } from "../../../otto-calendar-connector-extension/src/calendar-runtime.mjs";

export async function handle(payload = {}) {
  const events = await executeCalendarCommand("calendar.list.events", payload);
  return {
    generatedAt: new Date().toISOString(),
    events
  };
}
