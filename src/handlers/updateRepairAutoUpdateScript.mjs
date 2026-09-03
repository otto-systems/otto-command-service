import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

/**
 * Required functions that auto-update.sh must contain to be considered "current".
 * If any of these are missing, the script is considered stale and should be regenerated.
 */
const REQUIRED_FUNCTIONS = [
  "legacy_update_fallback",
  "read_manifest_version",
  "run_command"
];

/**
 * Checks if auto-update.sh contains all required functions.
 * @param {string} scriptContent - The content of auto-update.sh
 * @returns {Object} { isHealthy: boolean, missingFunctions: string[] }
 */
export function validateAutoUpdateScript(scriptContent) {
  const missingFunctions = [];

  for (const funcName of REQUIRED_FUNCTIONS) {
    // Look for function definition: "funcName() {" or "function funcName {" or "funcName(){"
    const patterns = [
      new RegExp(`\\b${funcName}\\s*\\(\\s*\\)\\s*\\{`),
      new RegExp(`\\bfunction\\s+${funcName}\\s*\\{`)
    ];

    const found = patterns.some((pattern) => pattern.test(scriptContent));
    if (!found) {
      missingFunctions.push(funcName);
    }
  }

  return {
    isHealthy: missingFunctions.length === 0,
    missingFunctions
  };
}

/**
 * Reads the canonical auto-update.sh template from the deployed package.
 * @param {Object} options - Configuration
 * @returns {Promise<string|null>} The canonical template content, or null if not found
 */
async function getCanonicalTemplate(options = {}) {
  const workspaceRoot = typeof options.workspaceRoot === "string" && options.workspaceRoot
    ? path.resolve(options.workspaceRoot)
    : WORKSPACE_ROOT;

  // Try to read from runtime/ (deployed location)
  const runtimeTemplate = path.join(workspaceRoot, "runtime", "auto-update.sh.template");
  try {
    return await fs.readFile(runtimeTemplate, "utf8");
  } catch {
    // Fallback: try to read from tools/pi/ (source location)
    const toolsTemplate = path.join(workspaceRoot, "tools", "pi", "auto-update.sh");
    try {
      return await fs.readFile(toolsTemplate, "utf8");
    } catch {
      return null;
    }
  }
}

/**
 * Repairs auto-update.sh by regenerating it from the canonical template.
 * On Pi, this is typically at /opt/otto-display-system/auto-update.sh
 * @param {Object} options - Configuration
 * @returns {Promise<Object>} Result with repaired flag and details
 */
export async function repairAutoUpdateScript(options = {}) {
  const installRoot = typeof options.installRoot === "string" && options.installRoot
    ? path.resolve(options.installRoot)
    : "/opt/otto-display-system";

  const autoUpdatePath = path.join(installRoot, "auto-update.sh");
  const workspaceRoot = options.workspaceRoot || WORKSPACE_ROOT;

  const details = {
    installRoot,
    autoUpdatePath,
    repaired: false,
    reason: null,
    previousValidation: null,
    newValidation: null,
    error: null
  };

  try {
    // Step 1: Check if auto-update.sh exists
    let currentContent = null;
    try {
      currentContent = await fs.readFile(autoUpdatePath, "utf8");
    } catch (error) {
      details.reason = "missing";
      details.error = error instanceof Error ? error.message : String(error);
    }

    // Step 2: Validate current script
    if (currentContent) {
      details.previousValidation = validateAutoUpdateScript(currentContent);
      if (details.previousValidation.isHealthy) {
        return {
          success: true,
          repaired: false,
          details: {
            ...details,
            reason: "already-healthy"
          }
        };
      }
      details.reason = `stale-missing-functions: ${details.previousValidation.missingFunctions.join(", ")}`;
    }

    // Step 3: Fetch canonical template
    const canonicalTemplate = await getCanonicalTemplate({ workspaceRoot });
    if (!canonicalTemplate) {
      return {
        success: false,
        repaired: false,
        details: {
          ...details,
          error: "canonical-template-not-found",
          reason: "Could not find canonical auto-update.sh template in runtime/ or tools/pi/"
        }
      };
    }

    // Step 4: Validate canonical template before writing
    const canonicalValidation = validateAutoUpdateScript(canonicalTemplate);
    if (!canonicalValidation.isHealthy) {
      return {
        success: false,
        repaired: false,
        details: {
          ...details,
          error: "canonical-template-invalid",
          reason: `Canonical template is invalid; missing functions: ${canonicalValidation.missingFunctions.join(", ")}`
        }
      };
    }

    // Step 5: Write the canonical template
    await fs.mkdir(path.dirname(autoUpdatePath), { recursive: true });
    await fs.writeFile(autoUpdatePath, canonicalTemplate, { mode: 0o755 });

    details.repaired = true;
    details.newValidation = canonicalValidation;

    return {
      success: true,
      repaired: true,
      details
    };
  } catch (error) {
    return {
      success: false,
      repaired: false,
      details: {
        ...details,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Command handler for update.repair.auto-update-script
 * Detects and repairs stale auto-update.sh scripts
 */
export default async function updateRepairAutoUpdateScriptHandler(params) {
  const installRoot = params.installRoot || "/opt/otto-display-system";
  const workspaceRoot = params.workspaceRoot;

  const result = await repairAutoUpdateScript({ installRoot, workspaceRoot });

  if (!result.success) {
    throw new Error(`Failed to repair auto-update.sh: ${result.details.error || "unknown error"}`);
  }

  return {
    repaired: result.repaired,
    installRoot: result.details.installRoot,
    scriptPath: result.details.autoUpdatePath,
    reason: result.details.reason,
    previousValidation: result.details.previousValidation,
    newValidation: result.details.newValidation,
    message: result.repaired
      ? `Auto-update script repaired and regenerated from canonical template (reason: ${result.details.reason})`
      : "Auto-update script is already healthy"
  };
}
