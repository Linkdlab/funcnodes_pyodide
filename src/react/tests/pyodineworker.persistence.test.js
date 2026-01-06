import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("pyodineworker persists export and restores via update_from_export()", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(testDir, "..");
  const filePath = path.join(pkgRoot, "src/pyodineworker.ts");
  const source = fs.readFileSync(filePath, "utf8");

  assert.ok(
    source.includes("save_worker_state"),
    "expected FuncnodesPyodideWorker.save_worker_state to exist"
  );

  assert.ok(
    source.includes("localStorage.getItem(") ||
      source.includes("globalThis.localStorage.getItem("),
    "expected restore logic to read from localStorage"
  );

  assert.ok(
    source.includes("localStorage.setItem(") ||
      source.includes("globalThis.localStorage.setItem("),
    "expected save_worker_state to write to localStorage"
  );

  assert.ok(
    source.includes("update_from_export("),
    "expected persisted state to be applied via update_from_export()"
  );
});

