import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("pyodineworker normalizes package URLs before init", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(testDir, "..");
  const filePath = path.join(pkgRoot, "src/pyodineworker.ts");
  const source = fs.readFileSync(filePath, "utf8");

  assert.ok(
    source.includes("packages") && source.includes('cmd: "init"'),
    "expected init message to include packages"
  );

  assert.ok(
    source.includes("new URL(") &&
      (source.includes("window.location") || source.includes("globalThis.location")),
    "expected packages to be normalized via URL resolution in the browser"
  );
});

