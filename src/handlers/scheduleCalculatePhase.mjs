import { executeScheduleCommand } from "../../../otto-schedule-resolver-extension/src/schedule-runtime.mjs";

export async function handle(params = {}) {
  return executeScheduleCommand("schedule.calculate.phase", params);
}
