import { describe, expect, it } from "vitest";

describe("auth schemas", () => {
  it("auth.get.token schema is valid", async () => {
    const schema = (await import("../src/schemas/auth.get.token.json", { assert: { type: "json" } })).default;
    expect(schema.name).toBe("auth.get.token");
    expect(typeof schema.description).toBe("string");
    expect(Array.isArray(schema.errorTypes)).toBe(true);
    expect(schema.routing).toBeTruthy();
    expect(schema.routing.handlerExport).toBe("handle");
  });

  it("auth.get.user schema is valid", async () => {
    const schema = (await import("../src/schemas/auth.get.user.json", { assert: { type: "json" } })).default;
    expect(schema.name).toBe("auth.get.user");
    expect(typeof schema.description).toBe("string");
    expect(Array.isArray(schema.errorTypes)).toBe(true);
  });

  it("auth.refresh schema is valid", async () => {
    const schema = (await import("../src/schemas/auth.refresh.json", { assert: { type: "json" } })).default;
    expect(schema.name).toBe("auth.refresh");
    expect(typeof schema.description).toBe("string");
    expect(Array.isArray(schema.errorTypes)).toBe(true);
    expect(schema.routing.handlerModule).toBe("authRefresh.mjs");
  });
});
