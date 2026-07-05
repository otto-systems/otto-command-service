import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

function resolveMaestroRoot() {
  if (process.env.OTTO_MAESTRO_ROOT) {
    return process.env.OTTO_MAESTRO_ROOT;
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../Maestro");
}

function runHook(hookRelativePath, params = {}) {
  const maestroRoot = resolveMaestroRoot();
  const hookPath = path.join(maestroRoot, hookRelativePath);
  const dryRun = process.env.OTTO_DRY_RUN === "1" || params.dryRun === true;

  if (dryRun) {
    return {
      ok: true,
      mode: "dry-run",
      hook: hookPath,
      params
    };
  }

  const result = spawnSync("bash", [hookPath], {
    cwd: maestroRoot,
    stdio: "pipe",
    encoding: "utf8"
  });

  if (result.status === 0) {
    return {
      ok: true,
      mode: "execute",
      hook: hookPath,
      output: (result.stdout || "").trim(),
      params
    };
  }

  return {
    ok: false,
    mode: "execute",
    hook: hookPath,
    error: (result.stderr || result.stdout || "hook failed").trim(),
    params
  };
}

export function runPreInstall(params = {}) {
  return runHook("installer/hooks/pre-install.sh", params);
}

export function runPostInstall(params = {}) {
  return runHook("installer/hooks/post-install.sh", params);
}

export function runPreUpdate(params = {}) {
  return runHook("installer/hooks/pre-update.sh", params);
}

export function runPostUpdate(params = {}) {
  return runHook("installer/hooks/post-update.sh", params);
}
