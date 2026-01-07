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
    source.includes("fnw_url: shouldPreload?loadParam:undefined"),
    "expected index.html to apply the loaded export via fnw_url"
  );
});
