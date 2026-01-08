import test from "node:test";
import assert from "node:assert/strict";

import { shouldPreferInlineWorkers } from "../src/workerFactory.ts";

test("shouldPreferInlineWorkers returns true when script origin differs", () => {
  assert.equal(
    shouldPreferInlineWorkers({
      pageOrigin: "http://127.0.0.1:8000",
      scriptUrl: "https://cdn.jsdelivr.net/gh/x/y@dev/static/app.js",
    }),
    true
  );
});

test("shouldPreferInlineWorkers returns false when origins match", () => {
  assert.equal(
    shouldPreferInlineWorkers({
      pageOrigin: "https://example.com",
      scriptUrl: "https://example.com/assets/app.js",
    }),
    false
  );
});

test("shouldPreferInlineWorkers returns false when origins cannot be computed", () => {
  assert.equal(
    shouldPreferInlineWorkers({ pageOrigin: "", scriptUrl: "" }),
    false
  );
});
