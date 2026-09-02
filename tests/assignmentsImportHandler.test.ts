import os from "node:os";
import path from "node:path";
import { mkdtemp, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { handle } from "../src/handlers/assignmentsImport.mjs";

describe("assignments.import handler", () => {
  it("returns empty normalized assignments when no file is provided", async () => {
    const result = await handle({});

    expect(result).toMatchObject({ count: 0, assignments: [] });
    expect(typeof result.generatedAt).toBe("string");
  });

  it("loads csv content from file and normalizes records through extension", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "otto-assignments-"));
    const csvPath = path.join(tempDir, "facts.csv");
    await writeFile(
      csvPath,
      "id,course,title,dueAt,notes\na2,Math,Worksheet,2026-09-03T10:00:00.000Z,chapter 3\na1,English,Essay,2026-09-02T10:00:00.000Z,draft",
      "utf8"
    );

    const result = await handle({ file: csvPath });

    expect(result.count).toBe(2);
    expect(result.assignments[0].id).toBe("a1");
    expect(result.assignments[1].id).toBe("a2");
  });
});
