import { getCalendarJson } from "../../../../../modules/display-calendar/dist/api/calendar-endpoint.js";

export async function handle() {
  return getCalendarJson();
}
