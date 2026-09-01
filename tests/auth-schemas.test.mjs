import test from "node:test";
import assert from "node:assert/strict";

// Test that schema files are valid JSON and have required fields
test("auth.get.token schema is valid", async () => {
  const module = await import("../src/schemas/auth.get.token.json", { assert: { type: "json" } });
  const schema = module.default;

  assert.equal(schema.name, "auth.get.token");
  assert.equal(typeof schema.description, "string");
  assert.ok(Array.isArray(schema.errorTypes));
  assert.ok(schema.routing);
  assert.equal(schema.routing.handlerExport, "handle");
});

test("auth.get.user schema is valid", async () => {
  const module = await import("../src/schemas/auth.get.user.json", { assert: { type: "json" } });
  const schema = module.default;

  assert.equal(schema.name, "auth.get.user");
  assert.equal(typeof schema.description, "string");
  assert.ok(Array.isArray(schema.errorTypes));
});

test("auth.refresh schema is valid", async () => {
  const module = await import("../src/schemas/auth.refresh.json", { assert: { type: "json" } });
  const schema = module.default;

  assert.equal(schema.name, "auth.refresh");
  assert.equal(typeof schema.description, "string");
  assert.ok(Array.isArray(schema.errorTypes));
  assert.equal(schema.routing.handlerModule, "authRefresh.mjs");
});
