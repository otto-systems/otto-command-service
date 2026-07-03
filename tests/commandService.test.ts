import { describe, expect, it } from "vitest";
import { createCommandEnvelope } from "@otto/protocol";

import { CommandService } from "../src/command/commandService.js";
import { RateLimiter } from "../src/command/rateLimiter.js";

describe("RateLimiter", () => {
  it("blocks after limit and allows after reset", () => {
    const limiter = new RateLimiter(2);

    expect(limiter.allow("u1")).toBe(true);
    expect(limiter.allow("u1")).toBe(true);
    expect(limiter.allow("u1")).toBe(false);

    limiter.reset("u1");
    expect(limiter.allow("u1")).toBe(true);
  });
});

describe("CommandService", () => {
  it("rejects invalid command envelope", () => {
    const service = new CommandService();
    const result = service.submit(createCommandEnvelope({ command: "" }));

    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("Command name");
  });

  it("rejects when rate limit is exceeded", () => {
    const service = new CommandService(new RateLimiter(1));
    const command = createCommandEnvelope({ requestedBy: "operator" });

    expect(service.submit(command).accepted).toBe(true);
    expect(service.submit(command).accepted).toBe(false);
  });
});
