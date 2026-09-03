import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { executeEdsCommand } from "../../../otto-kernel/src/eds/eds-runtime.mjs";
import { getGlobalSelfHealingRegistry } from "../../../otto-update/dist/selfHealing/index.js";

const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

const REQUIRED_PATHS = [
  "apps/display-runtime/src/server.mjs",
  "external/otto/otto-command-service/src/schemas/update.check.json",
  "external/otto/otto-kernel/src/eds/eds-runtime.mjs",
  "runtime/extension-registry.json"
];

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function toIssue(code, severity, message, detail = {}) {
  return {
    code,
    severity,
    message,
    detail
  };
}

function isWorkspaceConstraint(constraint) {
  return typeof constraint === "string" && constraint.startsWith("workspace:");
}

function formatDependencyName(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const extension = value.extension ? String(value.extension) : "unknown-extension";
    const dependency = value.apiDependency ? String(value.apiDependency) : JSON.stringify(value);
    return `${extension}:${dependency}`;
  }

  return String(value);
}

export async function runUpdateInstallPreflightWithOptions(options = {}) {
  const issues = [];
  const missingRequiredPaths = [];
  const workspaceRoot = typeof options.workspaceRoot === "string" && options.workspaceRoot
    ? path.resolve(options.workspaceRoot)
    : WORKSPACE_ROOT;
  const pathExistsImpl = typeof options.pathExists === "function" ? options.pathExists : pathExists;
  const readFileImpl = typeof options.readFile === "function" 
    ? options.readFile 
    : (filePath) => fs.readFile(filePath, "utf8");
  const getRegistryImpl = typeof options.getRegistry === "function"
    ? options.getRegistry
    : async (root) => executeEdsCommand("eds.get.registry", { workspaceRoot: root });
  const scanDependenciesImpl = typeof options.scanDependencies === "function"
    ? options.scanDependencies
    : async (root) => executeEdsCommand("eds.scan", { workspaceRoot: root });

  for (const relativePath of REQUIRED_PATHS) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    if (!(await pathExistsImpl(absolutePath))) {
      missingRequiredPaths.push(relativePath);
      issues.push(
        toIssue(
          "missing_required_path",
          "error",
          `Required install path is missing: ${relativePath}`,
          { path: relativePath }
        )
      );
    }
  }

  // Check auto-update.sh staleness using self-healing framework
  // The framework is initialized in display-runtime and provides automatic validation
  try {
    const registry = getGlobalSelfHealingRegistry();
    const autoUpdateArtifact = registry.getArtifact("display-auto-update-script");
    
    if (autoUpdateArtifact) {
      // Framework has registered the artifact - use it to validate
      const healthCheck = await registry.performHealthCheck();
      
      // Check for issues in the health check results
      const artifactResult = healthCheck.issues.find(i => i.artifactId === autoUpdateArtifact.id);
      if (artifactResult && !artifactResult.isHealthy) {
        issues.push(
          toIssue(
            "stale_auto_update_script",
            artifactResult.severity === "error" ? "error" : "warning",
            `Auto-update script is unhealthy: ${JSON.stringify(artifactResult.details)}. Self-healing framework recommends automatic repair before update.`,
            { 
              artifactId: autoUpdateArtifact.id,
              severity: artifactResult.severity,
              details: artifactResult.details
            }
          )
        );
      }
    } else {
      // Framework not initialized yet (local dev) - skip check
      // This happens when running in workspace without deployed auto-update.sh
    }
  } catch (error) {
    // Auto-update.sh not found or framework not initialized - not a blocking issue in dev
  }

  let dependencyValidation = null;
  let registryFetched = false;
  try {
    const registry = await getRegistryImpl(workspaceRoot);
    dependencyValidation = registry?.dependencyValidation ?? null;
    registryFetched = Boolean(dependencyValidation);
  } catch (error) {
    registryFetched = false;
  }

  if (!dependencyValidation) {
    try {
      const scan = await scanDependenciesImpl(workspaceRoot);
      dependencyValidation = scan?.registry?.dependencyValidation ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const severity = registryFetched ? "warning" : "error";
      issues.push(
        toIssue(
          "eds_scan_failed",
          severity,
          `Failed to run EDS dependency scan: ${message}`,
          { message }
        )
      );
    }
  }

  const dependencyBreakdown = {
    missingRequiredExtensions: dependencyValidation?.missingRequiredExtensions ?? [],
    missingContractDependencies: dependencyValidation?.missingContractDependencies ?? [],
    missingApiDependencies: dependencyValidation?.missingApiDependencies ?? [],
    missingToolDependencies: dependencyValidation?.missingToolDependencies ?? [],
    versionConflicts: dependencyValidation?.versionConflicts ?? [],
    compatibilityConflicts: dependencyValidation?.compatibilityConflicts ?? [],
    cycles: dependencyValidation?.cycles ?? []
  };

  for (const extensionName of dependencyBreakdown.missingRequiredExtensions) {
    issues.push(
      toIssue(
        "missing_required_extension",
        "error",
        `Required extension is missing: ${extensionName}`,
        { extension: extensionName }
      )
    );
  }

  for (const contractName of dependencyBreakdown.missingContractDependencies) {
    issues.push(
      toIssue(
        "missing_contract_dependency",
        "error",
        `Required command contract is missing: ${contractName}`,
        { contract: contractName }
      )
    );
  }

  for (const apiDependency of dependencyBreakdown.missingApiDependencies) {
    issues.push(
      toIssue(
        "missing_api_dependency",
        "warning",
        `Required API dependency is missing: ${formatDependencyName(apiDependency)}`,
        { apiDependency }
      )
    );
  }

  for (const toolDependency of dependencyBreakdown.missingToolDependencies) {
    issues.push(
      toIssue(
        "missing_tool_dependency",
        "error",
        `Required tool dependency is missing: ${toolDependency}`,
        { toolDependency }
      )
    );
  }

  for (const conflict of dependencyBreakdown.versionConflicts) {
    if (isWorkspaceConstraint(conflict.constraint)) {
      continue;
    }

    issues.push(
      toIssue(
        "version_conflict",
        "error",
        `Outdated or incompatible module version for ${conflict.dependency} required by ${conflict.extension} (constraint=${conflict.constraint}, actual=${conflict.actualVersion ?? "missing"})`,
        conflict
      )
    );
  }

  for (const conflict of dependencyBreakdown.compatibilityConflicts) {
    if (isWorkspaceConstraint(conflict.constraint)) {
      continue;
    }

    issues.push(
      toIssue(
        "compatibility_conflict",
        "error",
        `Compatibility conflict for ${conflict.dependency} required by ${conflict.extension} (constraint=${conflict.constraint}, actual=${conflict.actualVersion ?? "missing"})`,
        conflict
      )
    );
  }

  for (const cycle of dependencyBreakdown.cycles) {
    issues.push(
      toIssue(
        "dependency_cycle",
        "error",
        `Dependency cycle detected: ${Array.isArray(cycle) ? cycle.join(" -> ") : String(cycle)}`,
        { cycle }
      )
    );
  }

  const blockingIssueCount = issues.filter((issue) => issue.severity === "error").length;
  const warningIssueCount = issues.filter((issue) => issue.severity === "warning").length;
  const ok = blockingIssueCount === 0;
  return {
    ok,
    workspaceRoot,
    checkedAt: new Date().toISOString(),
    summary: {
      issueCount: issues.length,
      blockingIssueCount,
      warningIssueCount,
      missingPathCount: missingRequiredPaths.length,
      missingRequiredExtensionCount: dependencyBreakdown.missingRequiredExtensions.length,
      missingContractDependencyCount: dependencyBreakdown.missingContractDependencies.length,
      missingApiDependencyCount: dependencyBreakdown.missingApiDependencies.length,
      missingToolDependencyCount: dependencyBreakdown.missingToolDependencies.length,
      versionConflictCount: dependencyBreakdown.versionConflicts.length,
      compatibilityConflictCount: dependencyBreakdown.compatibilityConflicts.length,
      cycleCount: dependencyBreakdown.cycles.length
    },
    missingRequiredPaths,
    dependencyValidation: dependencyBreakdown,
    issues
  };
}

export async function runUpdateInstallPreflight() {
  return runUpdateInstallPreflightWithOptions();
}
