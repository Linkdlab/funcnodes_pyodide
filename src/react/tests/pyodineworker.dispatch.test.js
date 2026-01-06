import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("pyodineworker routes receive_bytes messages to CommunicationManager.onbytes()", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(testDir, "..");
  const filePath = path.join(pkgRoot, "src/pyodineworker.ts");
  const source = fs.readFileSync(filePath, "utf8");

  assert.ok(
    source.includes('event.data.cmd === "receive_bytes"') ||
      source.includes("event.data.cmd === 'receive_bytes'"),
    "expected a receive_bytes message handler"
  );
  assert.ok(
    source.includes("this.getCommunicationManager().onbytes(event.data.msg)"),
    "expected receive_bytes messages to route to CommunicationManager.onbytes()"
  );
  assert.ok(
    !source.includes("this.getCommunicationManager().receive_bytes(event.data.msg)") &&
      !source.includes("this.getCommunicationManager().recieve_bytes(event.data.msg)"),
    "receive_bytes/recieve_bytes should not be called with a single argument"
  );
});
