export type WorkerFactoryProps = {
  uuid?: string;
  shared_worker?: boolean;
  worker_url?: string;
  worker?: any;
  worker_classes?: {
    Shared?: new (options?: { name?: string }) => any;
    Dedicated?: new (options?: { name?: string }) => any;
  };
};

const hasUrlObjectUrls = (): boolean =>
  typeof URL !== "undefined" &&
  typeof (URL as any).createObjectURL === "function" &&
  typeof (URL as any).revokeObjectURL === "function" &&
  typeof Blob !== "undefined";

const moduleBlobUrlForImport = (targetUrl: string): string | undefined => {
  if (!hasUrlObjectUrls()) return undefined;
  const source = `await import(${JSON.stringify(targetUrl)});`;
  const blob = new Blob([source], { type: "text/javascript" });
  return (URL as any).createObjectURL(blob);
};

const createWithModuleBlobFallback = (
  create: (scriptUrl: string) => any,
  targetUrl: string
) => {
  try {
    return create(targetUrl);
  } catch (err) {
    const blobUrl = moduleBlobUrlForImport(targetUrl);
    if (!blobUrl) throw err;
    try {
      return create(blobUrl);
    } finally {
      try {
        (URL as any).revokeObjectURL(blobUrl);
      } catch {}
    }
  }
};

export const createWorkerFromData = (data: WorkerFactoryProps): any => {
  if (data.worker) return data.worker;

  const name = data.uuid;
  const shared = !!data.shared_worker;

  if (shared) {
    if (data.worker_url === undefined) {
      if (data.worker_classes?.Shared) {
        return new data.worker_classes.Shared({ name });
      }
      if (typeof SharedWorker === "undefined") {
        throw new Error(
          "SharedWorker is not available; provide worker, worker_url or worker_classes.Shared"
        );
      }
      try {
        // Keep Vite's worker chunking pattern intact.
        return new SharedWorker(new URL("./pyodideSharedWorker.mts", import.meta.url), {
          name,
          type: "module",
        });
      } catch (err) {
        return createWithModuleBlobFallback(
          (scriptUrl) => new SharedWorker(scriptUrl, { name, type: "module" }),
          new URL("./pyodideSharedWorker.mts", import.meta.url).href
        );
      }
    }

    if (data.worker_classes?.Shared) {
      // If caller gives worker_url, prefer the platform constructor for that URL
      // (worker_classes.Shared is typically used for bundler-inline constructors).
    }

    if (typeof SharedWorker === "undefined") {
      throw new Error(
        "SharedWorker is not available; provide worker or set shared_worker=false"
      );
    }
    return createWithModuleBlobFallback(
      (scriptUrl) => new SharedWorker(scriptUrl, { name, type: "module" }),
      data.worker_url
    );
  }

  // Dedicated worker
  if (data.worker_url === undefined) {
    if (data.worker_classes?.Dedicated) {
      return new data.worker_classes.Dedicated({ name });
    }
    if (typeof Worker === "undefined") {
      throw new Error(
        "Worker is not available; provide worker, worker_url or worker_classes.Dedicated"
      );
    }
    try {
      // Keep Vite's worker chunking pattern intact.
      return new Worker(new URL("./pyodideDedicatedWorker.mts", import.meta.url), {
        name,
        type: "module",
      });
    } catch (err) {
      return createWithModuleBlobFallback(
        (scriptUrl) => new Worker(scriptUrl, { name, type: "module" }),
        new URL("./pyodideDedicatedWorker.mts", import.meta.url).href
      );
    }
  }

  if (typeof Worker === "undefined") {
    throw new Error(
      "Worker is not available; provide worker or set shared_worker=true"
    );
  }
  return createWithModuleBlobFallback(
    (scriptUrl) => new Worker(scriptUrl, { name, type: "module" }),
    data.worker_url
  );
};
