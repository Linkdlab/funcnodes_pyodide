import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

test("TypeScript typecheck passes", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(testDir, "..");

  const tsconfigPath = ts.findConfigFile(
    pkgRoot,
    ts.sys.fileExists,
    "tsconfig.json"
  );
  assert.ok(tsconfigPath, "tsconfig.json not found");

  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    assert.fail(ts.formatDiagnostic(configFile.error, diagnosticHost(ts)));
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsconfigPath)
  );
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  });

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.category === ts.DiagnosticCategory.Error);

  assert.equal(
    diagnostics.length,
    0,
    diagnostics.length
      ? ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticHost(ts))
      : undefined
  );
});

function diagnosticHost(ts) {
  return {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    getNewLine: () => ts.sys.newLine,
  };
}
