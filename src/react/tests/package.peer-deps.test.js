import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("package.json peer dependencies same version as devDependencies", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(testDir, "..");
  const filePath = path.join(pkgRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const devDependencies = pkg.devDependencies;
  const peerDependencies = pkg.peerDependencies;

  for (const [key, value] of Object.entries(peerDependencies)) {
    assert.equal(
      value,
      devDependencies[key],
      `expected peerDependencies.${key} to be the same as devDependencies.${key}`
    );
  }
});
