import { buildCustomPagePayload, getPageById, getPageSettings, isBuiltinRole } from "./orchestratorStorage.mjs";

function getBuiltinPayload(role) {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  if (role === "time") {
    return {
      role,
      currentEvent: "time-of-day",
      currentPhase: "normal",
      nextPhase: null,
      countdownSeconds: 60,
      content: {
        zone: "main",
        object: {
          type: "TimeObject",
          currentTime: `${hours}:${minutes}:${seconds}`,
          updatesEverySeconds: 1,
          format: "HH:MM:SS"
        }
      }
    };
  }

  if (role === "weather") {
    return {
      role,
      currentEvent: "weather-update",
      currentPhase: "normal",
      nextPhase: null,
      countdownSeconds: 300,
      content: {
        zone: "main",
        object: {
          type: "WeatherObject",
          temperature: 72,
          conditions: "Partly Cloudy",
          icon: "partly-cloudy"
        }
      }
    };
  }

  return {
    role,
    currentEvent: "scheduled-day",
    currentPhase: "normal",
    nextPhase: null,
    countdownSeconds: 60,
    content: {
      zone: "main",
      object: {
        type: "DisplayObject",
        label: `${role} page`
      }
    }
  };
}

export async function handle(params = {}) {
  const role = String(params.role || "").trim();
  const displayId = String(params.displayId || "hallway").trim() || "hallway";

  if (!role) {
    throw new Error("role is required");
  }

  if (isBuiltinRole(role)) {
    const payload = getBuiltinPayload(role);
    if (role === "time") {
      const timeSettings = await getPageSettings("time", displayId);
      if (payload?.content?.object) {
        payload.content.object.timeSettings = timeSettings?.timeSettings;
      }
    }
    return payload;
  }

  const page = await getPageById(role, displayId);
  if (!page) {
    throw new Error(`Unknown role: ${role}`);
  }

  const pageSettings = await getPageSettings(role, displayId);
  if (pageSettings?.deleted) {
    throw new Error(`Role deleted: ${role}`);
  }
  return buildCustomPagePayload(role, page, pageSettings);
}
