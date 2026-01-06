import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("pyodide worker logic defaults to Pyodide v0.29.0", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(testDir, "..");
  const filePath = path.join(pkgRoot, "src/pyodideWorkerLogic.mts");
  const source = fs.readFileSync(filePath, "utf8");

  assert.ok(
    source.includes("pyodide/v0.29.0") || source.includes("v0.29.0"),
    "expected the default pyodide.mjs URL to point at v0.29.0"
  );
});

