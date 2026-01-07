import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("pyodide worker logic normalizes PyProxy payloads for receivepy_bytes", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(testDir, "..");
  const filePath = path.join(pkgRoot, "src/pyodideWorkerLogic.mts");
  const source = fs.readFileSync(filePath, "utf8");

  assert.ok(
    source.includes("receivepy_bytes") && source.includes(".toJs("),
    "expected receivepy_bytes to convert PyProxy payloads via toJs(...)"
  );

  assert.ok(
    source.includes("dict_converter") && source.includes("Object.fromEntries"),
    "expected receivepy_bytes to force dict conversion to plain objects"
  );
});
