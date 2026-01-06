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
    source.includes("searchParams") &&
      (source.includes('"load"') || source.includes("'load'")),
    "expected index.html to read a load query param"
  );

  assert.ok(
    source.includes("fetch("),
    "expected index.html to fetch the referenced export file"
  );

  assert.ok(
    source.includes("arrayBuffer") && source.includes("btoa("),
    "expected index.html to base64-encode binary exports"
  );

  assert.ok(
    source.includes("update_from_export("),
    "expected index.html to apply the loaded export via update_from_export()"
  );
});
