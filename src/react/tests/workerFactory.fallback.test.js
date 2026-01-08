import test from "node:test";
import assert from "node:assert/strict";

import { createWorkerFromData } from "../src/workerFactory.ts";

test("createWorkerFromData falls back to module blob when Worker() throws", async () => {
  const originalWorker = globalThis.Worker;
  const originalBlob = globalThis.Blob;
  const originalURL = globalThis.URL;

  let createObjectURLCalls = 0;
  let revokeObjectURLCalls = 0;
  let lastBlob = null;

  class FakeWorker {
    constructor(scriptUrl, options) {
      this.scriptUrl = scriptUrl;
      this.options = options;
      if (scriptUrl.startsWith("https://")) {
        const err = new Error("SecurityError");
        err.name = "SecurityError";
        throw err;
      }
    }
  }

  try {
    globalThis.Worker = FakeWorker;

    // Node has Blob; keep it, but we need createObjectURL/revokeObjectURL.
    globalThis.URL = class URLShim extends originalURL {};
    globalThis.URL.createObjectURL = (blob) => {
      createObjectURLCalls += 1;
      lastBlob = blob;
      return "blob:fake-worker";
    };
    globalThis.URL.revokeObjectURL = (_url) => {
      revokeObjectURLCalls += 1;
    };

    const worker = createWorkerFromData({
      uuid: "u",
      shared_worker: false,
      worker_url: "https://cdn.example.com/worker.js",
    });

    assert.equal(worker.scriptUrl, "blob:fake-worker");
    assert.equal(worker.options?.type, "module");
    assert.equal(createObjectURLCalls, 1);
    assert.equal(revokeObjectURLCalls, 1);

    const text = await lastBlob.text();
    assert.match(
      text,
      /await import\("https:\/\/cdn\.example\.com\/worker\.js"\)/,
      "expected module-blob bootstrap to import the original worker URL"
    );
  } finally {
    globalThis.Worker = originalWorker;
    globalThis.Blob = originalBlob;
    globalThis.URL = originalURL;
  }
});

test("createWorkerFromData falls back to module blob when SharedWorker() throws", async () => {
  const originalSharedWorker = globalThis.SharedWorker;
  const originalURL = globalThis.URL;

  let createObjectURLCalls = 0;
  let lastBlob = null;

  class FakeSharedWorker {
    constructor(scriptUrl, options) {
      this.scriptUrl = scriptUrl;
      this.options = options;
      if (scriptUrl.startsWith("https://")) {
        const err = new Error("SecurityError");
        err.name = "SecurityError";
        throw err;
      }
      this.port = {};
    }
  }

  try {
    globalThis.SharedWorker = FakeSharedWorker;

    globalThis.URL = class URLShim extends originalURL {};
    globalThis.URL.createObjectURL = (blob) => {
      createObjectURLCalls += 1;
      lastBlob = blob;
      return "blob:fake-shared-worker";
    };
    globalThis.URL.revokeObjectURL = () => {};

    const worker = createWorkerFromData({
      uuid: "u",
      shared_worker: true,
      worker_url: "https://cdn.example.com/shared-worker.js",
    });

    assert.equal(worker.scriptUrl, "blob:fake-shared-worker");
    assert.equal(worker.options?.type, "module");
    assert.equal(createObjectURLCalls, 1);

    const text = await lastBlob.text();
    assert.match(
      text,
      /await import\("https:\/\/cdn\.example\.com\/shared-worker\.js"\)/,
      "expected module-blob bootstrap to import the original worker URL"
    );
  } finally {
    globalThis.SharedWorker = originalSharedWorker;
    globalThis.URL = originalURL;
  }
});

