import test from "node:test";
import assert from "node:assert/strict";

import { createSharedWorkerPortRegistry } from "../src/sharedWorkerPorts.ts";

test("shared worker port registry disconnect closes on last port", () => {
  let closed = 0;
  const reg = createSharedWorkerPortRegistry(() => {
    closed += 1;
  });

  const p1 = {};
  const p2 = {};

  reg.add(p1);
  reg.add(p2);
  assert.equal(reg.size(), 2);

  reg.disconnect(p1);
  assert.equal(reg.size(), 1);
  assert.equal(closed, 0);

  reg.disconnect(p2);
  assert.equal(reg.size(), 0);
  assert.equal(closed, 1);
});

test("shared worker port registry disconnect is safe for unknown ports", () => {
  let closed = 0;
  const reg = createSharedWorkerPortRegistry(() => {
    closed += 1;
  });

  reg.disconnect({});
  assert.equal(reg.size(), 0);
  assert.equal(closed, 0);
});

