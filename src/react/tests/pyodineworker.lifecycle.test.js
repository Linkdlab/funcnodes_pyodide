import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

import { WorkerLifecycle } from "../src/workerLifecycle.ts";

class FakeWorker {
  constructor() {
    this.messages = [];
    this.terminated = 0;
    this._listeners = new Map();
  }
  addEventListener(type, handler) {
    const list = this._listeners.get(type) || [];
    list.push(handler);
    this._listeners.set(type, list);
  }
  removeEventListener(type, handler) {
    const list = this._listeners.get(type) || [];
    this._listeners.set(
      type,
      list.filter((h) => h !== handler)
    );
  }
  postMessage(message) {
    this.messages.push(message);
  }
  terminate() {
    this.terminated += 1;
  }
  dispatchMessage(data) {
    const list = this._listeners.get("message") || [];
    for (const handler of list) handler({ data });
  }
}

class FakeMessagePort {
  constructor() {
    this.messages = [];
    this.closed = 0;
    this.started = 0;
    this._listeners = new Map();
  }
  start() {
    this.started += 1;
  }
  addEventListener(type, handler) {
    const list = this._listeners.get(type) || [];
    list.push(handler);
    this._listeners.set(type, list);
  }
  removeEventListener(type, handler) {
    const list = this._listeners.get(type) || [];
    this._listeners.set(
      type,
      list.filter((h) => h !== handler)
    );
  }
  postMessage(message) {
    this.messages.push(message);
  }
  close() {
    this.closed += 1;
  }
  dispatchMessage(data) {
    const list = this._listeners.get("message") || [];
    for (const handler of list) handler({ data });
  }
}

class FakeSharedWorker {
  constructor() {
    this.port = new FakeMessagePort();
  }
}

test("FuncnodesPyodideWorker.dispose terminates dedicated worker and stops state polling", async () => {
  const fake = new FakeWorker();
  const lifecycle = new WorkerLifecycle(fake, { worker_id: "test" });
  lifecycle.startStatePolling();

  await sleep(900);
  const before = fake.messages.filter((m) => m?.cmd === "state").length;
  assert.ok(before >= 2, `expected >=2 state polls, got ${before}`);

  lifecycle.dispose();
  assert.equal(fake.terminated, 1, "expected dedicated worker to be terminated");

  await sleep(900);
  const after = fake.messages.filter((m) => m?.cmd === "state").length;
  assert.equal(after, before, "expected polling to stop after dispose()");
});

test("WorkerLifecycle.dispose is idempotent (dedicated)", async () => {
  const fake = new FakeWorker();
  const lifecycle = new WorkerLifecycle(fake, { worker_id: "test" });

  lifecycle.dispose();
  lifecycle.dispose();
  assert.equal(fake.terminated, 1, "expected only one terminate() call");
});

test("WorkerLifecycle.dispose closes shared worker port and sends disconnect", async () => {
  const shared = new FakeSharedWorker();
  const lifecycle = new WorkerLifecycle(shared, { worker_id: "test" });

  lifecycle.dispose();
  assert.equal(shared.port.closed, 1, "expected shared worker port to be closed");
  assert.ok(
    shared.port.messages.some((m) => m?.cmd === "disconnect"),
    "expected dispose() to send cmd:disconnect over the shared worker port"
  );
});
