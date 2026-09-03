import { describe, it, expect } from "vitest";
import { validateAutoUpdateScript } from "../src/handlers/updateRepairAutoUpdateScript.mjs";

describe("updateRepairAutoUpdateScript", () => {
  describe("validateAutoUpdateScript", () => {
    it("should return healthy=true when all required functions are present", () => {
      const scriptWithAllFunctions = `
        #!/usr/bin/env bash
        run_command() {
          node script.mjs "\$@"
        }
        read_manifest_version() {
          curl -s http://example.com/manifest.json
        }
        legacy_update_fallback() {
          echo "fallback"
        }
      `;

      const result = validateAutoUpdateScript(scriptWithAllFunctions);
      expect(result.isHealthy).toBe(true);
      expect(result.missingFunctions).toEqual([]);
    });

    it("should detect missing legacy_update_fallback", () => {
      const scriptWithoutFallback = `
        #!/usr/bin/env bash
        run_command() {
          node script.mjs "\$@"
        }
        read_manifest_version() {
          curl -s http://example.com/manifest.json
        }
      `;

      const result = validateAutoUpdateScript(scriptWithoutFallback);
      expect(result.isHealthy).toBe(false);
      expect(result.missingFunctions).toContain("legacy_update_fallback");
    });

    it("should detect missing read_manifest_version", () => {
      const scriptWithoutManifest = `
        #!/usr/bin/env bash
        run_command() {
          node script.mjs "\$@"
        }
        legacy_update_fallback() {
          echo "fallback"
        }
      `;

      const result = validateAutoUpdateScript(scriptWithoutManifest);
      expect(result.isHealthy).toBe(false);
      expect(result.missingFunctions).toContain("read_manifest_version");
    });

    it("should detect missing run_command", () => {
      const scriptWithoutRunCommand = `
        #!/usr/bin/env bash
        read_manifest_version() {
          curl -s http://example.com/manifest.json
        }
        legacy_update_fallback() {
          echo "fallback"
        }
      `;

      const result = validateAutoUpdateScript(scriptWithoutRunCommand);
      expect(result.isHealthy).toBe(false);
      expect(result.missingFunctions).toContain("run_command");
    });

    it("should handle both function definition styles", () => {
      const bashStyle = `
        function legacy_update_fallback {
          echo "fallback"
        }
        run_command() {
          true
        }
        read_manifest_version() {
          true
        }
      `;

      const result = validateAutoUpdateScript(bashStyle);
      expect(result.isHealthy).toBe(true);
      expect(result.missingFunctions).toEqual([]);
    });

    it("should detect all three missing functions", () => {
      const emptyScript = "#!/usr/bin/env bash\necho 'hello'";

      const result = validateAutoUpdateScript(emptyScript);
      expect(result.isHealthy).toBe(false);
      expect(result.missingFunctions).toHaveLength(3);
      expect(result.missingFunctions).toContain("legacy_update_fallback");
      expect(result.missingFunctions).toContain("read_manifest_version");
      expect(result.missingFunctions).toContain("run_command");
    });

    it("should validate script with new AUTO_REPAIR_SCRIPTS variable", () => {
      const scriptWithRepairVar = `
        #!/usr/bin/env bash
        AUTO_REPAIR_SCRIPTS="\${OTTO_AUTO_REPAIR_SCRIPTS:-true}"
        run_command() { true; }
        read_manifest_version() { true; }
        legacy_update_fallback() { true; }
      `;

      const result = validateAutoUpdateScript(scriptWithRepairVar);
      expect(result.isHealthy).toBe(true);
      expect(result.missingFunctions).toEqual([]);
    });
  });
});
