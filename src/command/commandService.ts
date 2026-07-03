import type { CommandEnvelope } from "@otto/protocol";
import { evaluateGovernance } from "./governanceRules.js";
import { RateLimiter } from "./rateLimiter.js";

export type CommandServiceResult = {
  accepted: boolean;
  reason?: string;
};

export class CommandService {
  constructor(private readonly rateLimiter = new RateLimiter()) {}

  submit(command: CommandEnvelope): CommandServiceResult {
    const governance = evaluateGovernance(command);
    if (!governance.allowed) {
      return { accepted: false, reason: governance.reason };
    }

    if (!this.rateLimiter.allow(command.requestedBy)) {
      return { accepted: false, reason: "Rate limit exceeded" };
    }

    return { accepted: true };
  }
}
