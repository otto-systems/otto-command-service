import { describe, expect, it, vi } from "vitest";

vi.mock("../src/handlers/updateInstallPreflight.mjs", () => ({
  runUpdateInstallPreflight: vi.fn()
}));

import { handle } from "../src/handlers/updateValidateInstall.mjs";
import { runUpdateInstallPreflight } from "../src/handlers/updateInstallPreflight.mjs";

describe("updateValidateInstall.handle", () => {
  it("returns preflight payload when strict=false", async () => {
    vi.mocked(runUpdateInstallPreflight).mockResolvedValueOnce({
      ok: false,
      issues: [{ code: "version_conflict", message: "stale module" }]
    } as any);

    const result = await handle({ strict: false });
    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(1);
  });

  it("throws when strict mode is enabled and preflight fails", async () => {
    vi.mocked(runUpdateInstallPreflight).mockResolvedValueOnce({
      ok: false,
      issues: [{ code: "missing_required_path", message: "missing runtime file" }]
    } as any);

    await expect(handle({ strict: true })).rejects.toThrow("Update install preflight failed");
  });

  it("returns preflight payload when validation passes", async () => {
    vi.mocked(runUpdateInstallPreflight).mockResolvedValueOnce({
      ok: true,
      issues: []
    } as any);

    const result = await handle();
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
