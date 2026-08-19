import { getAssignmentsJson } from "../../../../../modules/display-assignments/dist/api/assignments-endpoint.js";

export async function handle() {
  return getAssignmentsJson();
}
