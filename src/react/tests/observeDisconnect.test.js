import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

import { observeDisconnectByPolling } from "../src/observeDisconnect.ts";

test("observeDisconnectByPolling calls onDisconnect once when element disconnects", async () => {
  const element = { isConnected: true };
  let calls = 0;
  const stop = observeDisconnectByPolling(
    element,
    () => {
      calls += 1;
    },
    { intervalMs: 50 }
  );

  await sleep(120);
  element.isConnected = false;

  await sleep(150);
  stop();
  assert.equal(calls, 1);
});

test("observeDisconnectByPolling stop prevents callback", async () => {
  const element = { isConnected: true };
  let calls = 0;
  const stop = observeDisconnectByPolling(
    element,
    () => {
      calls += 1;
    },
    { intervalMs: 50 }
  );

  stop();
  element.isConnected = false;
  await sleep(150);
  assert.equal(calls, 0);
});
