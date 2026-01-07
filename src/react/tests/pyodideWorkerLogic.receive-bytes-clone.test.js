import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("pyodide worker logic forwards normalized bytes to workerState.receivepy_bytes", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(testDir, "..");
  const filePath = path.join(pkgRoot, "src/pyodideWorkerLogic.mts");
  const source = fs.readFileSync(filePath, "utf8");

  assert.ok(
    source.includes("globalThis.receivepy_bytes") && source.includes(".toJs("),
    "expected receivepy_bytes to convert PyProxy payloads via toJs(...)"
  );

  assert.ok(
    !source.includes("workerState.receivepy_bytes(msg as Uint8Array") &&
      !source.includes("workerState.receivepy_bytes(msg as unknown as Uint8Array"),
    "expected receivepy_bytes to avoid forwarding the original proxy msg to workerState.receivepy_bytes"
  );
});
