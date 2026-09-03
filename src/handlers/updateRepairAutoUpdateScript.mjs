/**
 * Handler: update.repair.auto-update-script
 * 
 * Repairs the deployed auto-update.sh script if it's stale or missing functions.
 * Regenerates from the canonical template stored in the repository.
 * 
 * This handler is called by the auto-update.sh script itself during the preflight check
 * if auto-repair is enabled (OTTO_AUTO_REPAIR_SCRIPTS=true).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

export async function updateRepairAutoUpdateScript() {
  const installRoot = '/opt/otto-display-system';
  const autoUpdatePath = path.join(installRoot, 'auto-update.sh');

  try {
    // Try to read canonical template from deployed location
    const runtimeTemplate = path.join(ROOT, 'runtime', 'auto-update.sh.template');
    let canonicalContent = null;

    try {
      canonicalContent = await fs.readFile(runtimeTemplate, 'utf8');
    } catch {
      // Fallback: try source location in tools
      const toolsTemplate = path.join(ROOT, 'tools', 'pi', 'auto-update.sh');
      try {
        canonicalContent = await fs.readFile(toolsTemplate, 'utf8');
      } catch {
        return {
          ok: false,
          reason: 'template-not-found',
          message: 'Could not find canonical template in runtime/ or tools/pi/'
        };
      }
    }

    // Validate the canonical template before deploying it
    const REQUIRED_FUNCTIONS = [
      'legacy_update_fallback',
      'read_manifest_version',
      'run_command'
    ];

    const missingFunctions = [];
    for (const funcName of REQUIRED_FUNCTIONS) {
      const patterns = [
        new RegExp(`\\b${funcName}\\s*\\(\\s*\\)\\s*\\{`),
        new RegExp(`\\bfunction\\s+${funcName}\\s*\\{`)
      ];
      const found = patterns.some((pattern) => pattern.test(canonicalContent));
      if (!found) {
        missingFunctions.push(funcName);
      }
    }

    if (missingFunctions.length > 0) {
      return {
        ok: false,
        reason: 'canonical-template-invalid',
        message: `Canonical template is invalid: missing ${missingFunctions.join(', ')}`
      };
    }

    // Write the canonical template
    await fs.mkdir(path.dirname(autoUpdatePath), { recursive: true });
    await fs.writeFile(autoUpdatePath, canonicalContent, { mode: 0o755 });

    return {
      ok: true,
      message: 'Auto-update script regenerated from canonical template',
      path: autoUpdatePath
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'repair-failed',
      message: error instanceof Error ? error.message : 'Unknown error during repair'
    };
  }
}
