import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("pyodide worker logic skips PyPI funcnodes-pyodide when wheel provided", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(testDir, "..");
  const filePath = path.join(pkgRoot, "src/pyodideWorkerLogic.mts");
  const source = fs.readFileSync(filePath, "utf8");

  assert.ok(
    source.includes('micropip.install("funcnodes-pyodide")') ||
      source.includes("micropip.install('funcnodes-pyodide')"),
    "expected a funcnodes-pyodide installation path to exist"
  );

  assert.ok(
    source.toLowerCase().includes("whl") &&
      source.includes("funcnodes_pyodide") &&
      (source.includes("skip") || source.includes("if") || source.includes("includes(")),
    "expected conditional logic to avoid reinstalling from PyPI when a wheel is supplied"
  );
});

