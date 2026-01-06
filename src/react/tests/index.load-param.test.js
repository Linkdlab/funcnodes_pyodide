import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("index.html supports ?load=... to preload worker state from a .fnw file", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(testDir, "..");
  const filePath = path.join(pkgRoot, "index.html");
  const source = fs.readFileSync(filePath, "utf8");

  assert.ok(
    source.includes("URLSearchParams") &&
      (source.includes('.get("load"') || source.includes(".get('load'")),
    "expected index.html to read a load query param"
  );

  assert.ok(
    source.includes("fetch("),
    "expected index.html to fetch the referenced export file"
  );

  assert.ok(
    source.includes("localStorage.setItem(") &&
      source.includes("funcnodes_pyodide:worker_export:"),
    "expected index.html to store loaded export into localStorage under the worker key"
  );
});

