import type { CommandEnvelope } from "@otto/protocol";

export type GovernanceDecision = {
  allowed: boolean;
  reason?: string;
};

export function evaluateGovernance(command: CommandEnvelope): GovernanceDecision {
  if (!command.command.trim()) {
    return { allowed: false, reason: "Command name is required" };
  }

  if (!command.requestedBy.trim()) {
    return { allowed: false, reason: "Requester is required" };
  }

  return { allowed: true };
}
