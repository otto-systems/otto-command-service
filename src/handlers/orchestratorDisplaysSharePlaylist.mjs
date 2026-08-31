import { sharePlaylist } from "./orchestratorStorage.mjs";

export async function handle(params = {}) {
  return sharePlaylist(params.sourceDisplayId || params.source || "hallway", params.targetDisplayId || params.target);
}
