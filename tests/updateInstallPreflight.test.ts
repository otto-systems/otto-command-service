import { describe, expect, it } from "vitest";

import { runUpdateInstallPreflightWithOptions } from "../src/handlers/updateInstallPreflight.mjs";

describe("runUpdateInstallPreflightWithOptions", () => {
  it("returns ok=true when required paths and dependency validation are clean", async () => {
    const result = await runUpdateInstallPreflightWithOptions({
      workspaceRoot: "C:/mock/workspace",
      pathExists: async () => true,
      getRegistry: async () => ({ dependencyValidation: null }),
      scanDependencies: async () => ({
        registry: {
          dependencyValidation: {
            missingRequiredExtensions: [],
            missingContractDependencies: [],
            missingApiDependencies: [],
            missingToolDependencies: [],
            versionConflicts: [],
            compatibilityConflicts: [],
            cycles: []
          }
        }
      })
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.summary.issueCount).toBe(0);
  });

  it("flags broken install when required paths are missing", async () => {
    const result = await runUpdateInstallPreflightWithOptions({
      workspaceRoot: "C:/mock/workspace",
      pathExists: async (targetPath: string) => {
        const normalized = targetPath.replaceAll("\\", "/");
        return !normalized.endsWith("apps/display-runtime/src/server.mjs");
      },
      getRegistry: async () => ({ dependencyValidation: null }),
      scanDependencies: async () => ({
        registry: {
          dependencyValidation: {
            missingRequiredExtensions: [],
            missingContractDependencies: [],
            missingApiDependencies: [],
            missingToolDependencies: [],
            versionConflicts: [],
            compatibilityConflicts: [],
            cycles: []
          }
        }
      })
    });

    expect(result.ok).toBe(false);
    expect(result.missingRequiredPaths).toContain("apps/display-runtime/src/server.mjs");
    expect(result.issues.some((issue) => issue.code === "missing_required_path")).toBe(true);
  });

  it("flags stale module versions and dependency cycles", async () => {
    const result = await runUpdateInstallPreflightWithOptions({
      workspaceRoot: "C:/mock/workspace",
      pathExists: async () => true,
      getRegistry: async () => ({ dependencyValidation: null }),
      scanDependencies: async () => ({
        registry: {
          dependencyValidation: {
            missingRequiredExtensions: [],
            missingContractDependencies: [],
            missingApiDependencies: [],
            missingToolDependencies: [],
            versionConflicts: [
              {
                extension: "@otto/calendar-connector-extension",
                dependency: "@otto/protocol",
                constraint: ">=0.2.0",
                actualVersion: "0.1.4"
              }
            ],
            compatibilityConflicts: [],
            cycles: [["@otto/a", "@otto/b", "@otto/a"]]
          }
        }
      })
    });

    expect(result.ok).toBe(false);
    expect(result.summary.versionConflictCount).toBe(1);
    expect(result.summary.cycleCount).toBe(1);
    expect(result.issues.some((issue) => issue.code === "version_conflict")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "dependency_cycle")).toBe(true);
  });

  it("flags EDS scan failures as blocking errors", async () => {
    const result = await runUpdateInstallPreflightWithOptions({
      workspaceRoot: "C:/mock/workspace",
      pathExists: async () => true,
      getRegistry: async () => ({ dependencyValidation: null }),
      scanDependencies: async () => {
        throw new Error("EDS unavailable");
      }
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "eds_scan_failed")).toBe(true);
  });

  it("aggregates mixed dependency failures into summary counts", async () => {
    const result = await runUpdateInstallPreflightWithOptions({
      workspaceRoot: "C:/mock/workspace",
      pathExists: async () => true,
      getRegistry: async () => ({ dependencyValidation: null }),
      scanDependencies: async () => ({
        registry: {
          dependencyValidation: {
            missingRequiredExtensions: ["@otto/extension-a", "@otto/extension-b"],
            missingContractDependencies: ["calendar.list.events"],
            missingApiDependencies: ["/v1/commands/calendar/providers"],
            missingToolDependencies: ["file.rotate.logs"],
            versionConflicts: [
              {
                extension: "@otto/schedule-resolver",
                dependency: "@otto/protocol",
                constraint: ">=0.2.0",
                actualVersion: "0.1.9"
              }
            ],
            compatibilityConflicts: [
              {
                extension: "@otto/calendar-connector",
                dependency: "@otto/kernel",
                constraint: "^0.3.0",
                actualVersion: "0.2.4"
              }
            ],
            cycles: [["@otto/a", "@otto/b", "@otto/a"]]
          }
        }
      })
    });

    expect(result.ok).toBe(false);
    expect(result.summary.missingRequiredExtensionCount).toBe(2);
    expect(result.summary.missingContractDependencyCount).toBe(1);
    expect(result.summary.missingApiDependencyCount).toBe(1);
    expect(result.summary.missingToolDependencyCount).toBe(1);
    expect(result.summary.versionConflictCount).toBe(1);
    expect(result.summary.compatibilityConflictCount).toBe(1);
    expect(result.summary.cycleCount).toBe(1);
    expect(result.issues.length).toBe(8);
  });

  it("treats missing API dependencies as warnings and does not block by themselves", async () => {
    const result = await runUpdateInstallPreflightWithOptions({
      workspaceRoot: "C:/mock/workspace",
      pathExists: async () => true,
      getRegistry: async () => ({ dependencyValidation: null }),
      scanDependencies: async () => ({
        registry: {
          dependencyValidation: {
            missingRequiredExtensions: [],
            missingContractDependencies: [],
            missingApiDependencies: [
              { extension: "otto.auth.extension", apiDependency: "service.status" }
            ],
            missingToolDependencies: [],
            versionConflicts: [],
            compatibilityConflicts: [],
            cycles: []
          }
        }
      })
    });

    expect(result.ok).toBe(true);
    expect(result.summary.blockingIssueCount).toBe(0);
    expect(result.summary.warningIssueCount).toBe(1);
    expect(result.issues[0]?.severity).toBe("warning");
    expect(result.issues[0]?.message).toContain("otto.auth.extension:service.status");
  });

  it("detects stale auto-update.sh script as warning", async () => {
    const staleAutoUpdateScript = `
      #!/usr/bin/env bash
      echo "old script without required functions"
    `;

    const result = await runUpdateInstallPreflightWithOptions({
      workspaceRoot: "C:/opt/otto-display-system/current",
      pathExists: async (path: string) => true,
      readFile: async (path: string) => {
        // Simulate reading the stale auto-update.sh from parent directory
        if (path.includes("auto-update.sh")) {
          return staleAutoUpdateScript;
        }
        throw new Error("Not found");
      },
      getRegistry: async () => ({ dependencyValidation: null }),
      scanDependencies: async () => ({
        registry: {
          dependencyValidation: {
            missingRequiredExtensions: [],
            missingContractDependencies: [],
            missingApiDependencies: [],
            missingToolDependencies: [],
            versionConflicts: [],
            compatibilityConflicts: [],
            cycles: []
          }
        }
      })
    });

    expect(result.ok).toBe(true);
    expect(result.issues.some((issue) => issue.code === "stale_auto_update_script")).toBe(true);
    const staleIssue = result.issues.find((issue) => issue.code === "stale_auto_update_script");
    expect(staleIssue?.severity).toBe("warning");
  });
});
