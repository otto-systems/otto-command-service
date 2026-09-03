import { describe, expect, it, vi } from "vitest";

vi.mock("../src/handlers/updateInstallPreflight.mjs", () => ({
  runUpdateInstallPreflight: vi.fn()
}));

vi.mock("../src/handlers/updateShared.mjs", () => ({
  callOttoUpdate: vi.fn()
}));

import { handle } from "../src/handlers/updateCheck.mjs";
import { runUpdateInstallPreflight } from "../src/handlers/updateInstallPreflight.mjs";
import { callOttoUpdate } from "../src/handlers/updateShared.mjs";

describe("updateCheck.handle", () => {
  it("blocks update.check when preflight fails", async () => {
    vi.mocked(runUpdateInstallPreflight).mockResolvedValueOnce({
      ok: false,
      issues: [{ message: "outdated module detected" }]
    } as any);

    await expect(handle()).rejects.toThrow("Update check blocked: outdated module detected");
    expect(callOttoUpdate).not.toHaveBeenCalled();
  });

  it("triggers update.check and returns preflight data when preflight passes", async () => {
    const preflight = { ok: true, issues: [], summary: { issueCount: 0 } };
    vi.mocked(runUpdateInstallPreflight).mockResolvedValueOnce(preflight as any);
    vi.mocked(callOttoUpdate).mockResolvedValueOnce({ check_id: "check-123", triggered_at: "2026-09-03T00:00:00.000Z" } as any);

    const result = await handle();

    expect(callOttoUpdate).toHaveBeenCalledWith("POST", "/v1/check", undefined, [200, 202]);
    expect(result).toEqual({
      check_id: "check-123",
      triggered_at: "2026-09-03T00:00:00.000Z",
      preflight
    });
  });
});
