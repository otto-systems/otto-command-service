import { describe, expect, it } from "vitest";

import { executeCommand, loadCommandSchemas } from "../src/index.js";

describe("command service schemas", () => {
  it("loads extracted command schemas", async () => {
    const schemas = await loadCommandSchemas();
    expect(schemas.length).toBeGreaterThan(0);
    expect(schemas.some((schema) => schema.name === "config.show")).toBe(true);
  });

  it("executes extracted config.show command", async () => {
    const result = await executeCommand("config.show", {
      path: "./tests/fixtures/missing-server.toml"
    });

    expect(result).toEqual({
      bind: "127.0.0.1:7430",
      bearer_token: null
    });
  });

  it("executes routed display, calendar, and rotation commands", async () => {
    const current = await executeCommand("display.current", { role: "time" });
    expect(current.role).toBe("time");
    expect(current.content.object.type).toBe("TimeObject");

    const calendar = await executeCommand("calendar.refresh", {});
    expect(Array.isArray(calendar.events)).toBe(true);
    expect(typeof calendar.generatedAt).toBe("string");

    const rotation = await executeCommand("orchestrator.rotation.plan.get", { displayId: "hallway" });
    expect(rotation.displayId).toBe("hallway");
    expect(Array.isArray(rotation.pages)).toBe(true);
    expect(typeof rotation.generatedAt).toBe("string");
  });

  it("returns default provider config when no state manager is available", async () => {
    const result = await executeCommand("calendar.get.provider.config", {});

    expect(Array.isArray(result)).toBe(true);
    expect(result.some((provider) => provider.providerId === "microsoft")).toBe(true);
    expect(result.some((provider) => provider.providerId === "google")).toBe(true);
  });

  it("bootstraps a default provider session when auth tokens are requested", async () => {
    const result = await executeCommand("auth.get.token", { providerId: "google" });

    expect(result).not.toBeNull();
    expect(result.providerId).toBe("google");
    expect(typeof result.value).toBe("string");

    const user = await executeCommand("auth.get.user", { providerId: "google" });
    expect(user).not.toBeNull();
    expect(user.providerId).toBe("google");
  });
});
