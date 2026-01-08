import type { WorkerFactoryProps } from "./workerFactory";
import { createWorkerFromData as createWorkerFromDataCore } from "./workerFactory";
import { shouldPreferInlineWorkers } from "./workerFactory";

import InlineDedicatedWorker from "./pyodideDedicatedWorker.mts?worker&inline";
import InlineSharedWorker from "./pyodideSharedWorker.mts?sharedworker&inline";

export const createWorkerFromData = (data: WorkerFactoryProps): any => {
  // Preserve all explicit customization paths.
  if (data.worker) return data.worker;
  if (data.worker_url !== undefined) return createWorkerFromDataCore(data);
  if (data.worker_classes?.Dedicated || data.worker_classes?.Shared)
    return createWorkerFromDataCore(data);

  const name = data.uuid;
  const shared = !!data.shared_worker;
  const preferInline = shouldPreferInlineWorkers({
    pageOrigin:
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : undefined,
    scriptUrl: typeof import.meta !== "undefined" ? import.meta.url : undefined,
  });

  if (shared) {
    if (typeof SharedWorker === "undefined") {
      throw new Error(
        "SharedWorker is not available; provide worker, worker_url or worker_classes.Shared"
      );
    }
    if (preferInline) return new InlineSharedWorker({ name });
    try {
      // Prefer separate worker assets for caching.
      return new SharedWorker(
        new URL("./pyodideSharedWorker.mts", import.meta.url),
        { name, type: "module" }
      );
    } catch {
      // Cross-origin Worker restrictions (e.g. CDN script on different origin):
      // fall back to an inline worker (blob) produced by the bundler.
      return new InlineSharedWorker({ name });
    }
  }

  if (typeof Worker === "undefined") {
    throw new Error(
      "Worker is not available; provide worker, worker_url or worker_classes.Dedicated"
    );
  }
  if (preferInline) return new InlineDedicatedWorker({ name });
  try {
    // Prefer separate worker assets for caching.
    return new Worker(new URL("./pyodideDedicatedWorker.mts", import.meta.url), {
      name,
      type: "module",
    });
  } catch {
    // Cross-origin Worker restrictions (e.g. CDN script on different origin):
    // fall back to an inline worker (blob) produced by the bundler.
    return new InlineDedicatedWorker({ name });
  }
};
