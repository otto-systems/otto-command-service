import { describe, expect, it, vi } from "vitest";

import { handle } from "../src/handlers/updateCheck.mjs";
import * as preflightModule from "../src/handlers/updateInstallPreflight.mjs";
import * as sharedModule from "../src/handlers/updateShared.mjs";

describe("updateCheck.handle", () => {
  it("blocks update.check when preflight fails", async () => {
    const preflightSpy = vi.spyOn(preflightModule, "runUpdateInstallPreflight").mockResolvedValueOnce({
      ok: false,
      issues: [{ message: "outdated module detected" }]
    } as any);
    const callSpy = vi.spyOn(sharedModule, "callOttoUpdate");

    await expect(handle()).rejects.toThrow("Update check blocked: outdated module detected");
    expect(preflightSpy).toHaveBeenCalledTimes(1);
    expect(callSpy).not.toHaveBeenCalled();
  });

  it("triggers update.check and returns preflight data when preflight passes", async () => {
    const preflight = { ok: true, issues: [], summary: { issueCount: 0 } };
    vi.spyOn(preflightModule, "runUpdateInstallPreflight").mockResolvedValueOnce(preflight as any);
    const callSpy = vi.spyOn(sharedModule, "callOttoUpdate").mockResolvedValueOnce({
      check_id: "check-123",
      triggered_at: "2026-09-03T00:00:00.000Z"
    } as any);

    const result = await handle();

    expect(callSpy).toHaveBeenCalledWith("POST", "/v1/check", undefined, [200, 202]);
    expect(result).toEqual({
      check_id: "check-123",
      triggered_at: "2026-09-03T00:00:00.000Z",
      preflight
    });
  });

  it("surfaces otto-update backend failures after preflight passes", async () => {
    vi.spyOn(preflightModule, "runUpdateInstallPreflight").mockResolvedValueOnce({ ok: true, issues: [] } as any);
    const callSpy = vi.spyOn(sharedModule, "callOttoUpdate").mockRejectedValueOnce(new Error("fetch failed"));

    await expect(handle()).rejects.toThrow("fetch failed");
    expect(callSpy).toHaveBeenCalledWith("POST", "/v1/check", undefined, [200, 202]);
  });
});
