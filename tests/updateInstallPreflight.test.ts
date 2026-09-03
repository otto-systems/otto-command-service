import { describe, expect, it } from "vitest";

import { runUpdateInstallPreflightWithOptions } from "../src/handlers/updateInstallPreflight.mjs";

describe("runUpdateInstallPreflightWithOptions", () => {
  it("returns ok=true when required paths and dependency validation are clean", async () => {
    const result = await runUpdateInstallPreflightWithOptions({
      workspaceRoot: "C:/mock/workspace",
      pathExists: async () => true,
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
      scanDependencies: async () => {
        throw new Error("EDS unavailable");
      }
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "eds_scan_failed")).toBe(true);
  });
});
