import test from "node:test";
import assert from "node:assert/strict";

import { createMountRegistry } from "../src/mountRegistry.ts";

test("mount registry replaces and disposes previous handle", () => {
  const reg = createMountRegistry();

  let disposed1 = 0;
  let disposed2 = 0;

  reg.register("root", { dispose: () => disposed1++ });
  reg.register("root", { dispose: () => disposed2++ });

  assert.equal(disposed1, 1);
  assert.equal(disposed2, 0);
});

test("mount registry unregister removes handle", () => {
  const reg = createMountRegistry();

  const handle = { dispose: () => {} };
  const unregister = reg.register("root", handle);

  assert.equal(reg.get("root"), handle);
  unregister();
  assert.equal(reg.get("root"), undefined);
});
