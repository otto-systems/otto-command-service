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
});
