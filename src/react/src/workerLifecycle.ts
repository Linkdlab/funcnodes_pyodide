type DedicatedWorkerLike = {
  postMessage: (data: any) => void;
  addEventListener: (type: "message", listener: (ev: MessageEvent) => void) => void;
  removeEventListener?: (
    type: "message",
    listener: (ev: MessageEvent) => void
  ) => void;
  terminate?: () => void;
};

type SharedWorkerLike = {
  port: MessagePort;
};

const isSharedWorkerLike = (w: any): w is SharedWorkerLike =>
  !!w && typeof w === "object" && "port" in w && !!(w as any).port;

const isDedicatedWorkerLike = (w: any): w is DedicatedWorkerLike =>
  !!w &&
  typeof w === "object" &&
  typeof (w as any).postMessage === "function" &&
  typeof (w as any).addEventListener === "function" &&
  !("port" in w);

export type AnyWorkerLike = DedicatedWorkerLike | SharedWorkerLike;

export type WorkerLifecycleOptions = {
  worker_id?: string;
  onMessage?: (event: MessageEvent) => void;
};

export class WorkerLifecycle {
  private _worker: AnyWorkerLike;
  private _port: MessagePort | undefined;
  private _onmessage_bound: ((event: MessageEvent) => void) | undefined;
  private _disposed = false;
  private _intervals: ReturnType<typeof setInterval>[] = [];
  private _worker_id: string | undefined;

  constructor(worker: AnyWorkerLike, options: WorkerLifecycleOptions = {}) {
    this._worker = worker;
    this._worker_id = options.worker_id;

    if (options.onMessage) {
      this._onmessage_bound = options.onMessage;
      if (isSharedWorkerLike(worker)) {
        this._port = worker.port;
        this._port.start();
        this._port.addEventListener("message", this._onmessage_bound);
      } else if (isDedicatedWorkerLike(worker)) {
        worker.addEventListener("message", this._onmessage_bound);
      } else {
        throw new Error("worker must be a DedicatedWorkerLike or SharedWorkerLike");
      }
    } else if (isSharedWorkerLike(worker)) {
      this._port = worker.port;
      this._port.start();
    } else if (!isDedicatedWorkerLike(worker)) {
      throw new Error("worker must be a DedicatedWorkerLike or SharedWorkerLike");
    }
  }

  get disposed() {
    return this._disposed;
  }

  get shared() {
    return !!this._port;
  }

  private _decorate(message: any) {
    return this._worker_id === undefined
      ? message
      : { ...message, worker_id: this._worker_id };
  }

  postMessage(message: any) {
    if (this._disposed) return;
    this._postRaw(message);
  }

  private _postRaw(message: any) {
    const data = this._decorate(message);
    if (this._port) this._port.postMessage(data);
    else (this._worker as DedicatedWorkerLike).postMessage(data);
  }

  startStatePolling({ intervalMs = 400 } = {}) {
    if (this._disposed) return;
    const handle = setInterval(() => {
      this.postMessage({ cmd: "state" });
    }, intervalMs);
    this._intervals.push(handle);
  }

  stopPolling() {
    for (const handle of this._intervals) clearInterval(handle);
    this._intervals = [];
  }

  dispose() {
    if (this._disposed) return;
    if (this._port) {
      try {
        this._postRaw({ cmd: "disconnect" });
      } catch {}
    }
    this._disposed = true;

    this.stopPolling();

    try {
      if (this._port && this._onmessage_bound) {
        this._port.removeEventListener("message", this._onmessage_bound);
      } else if (this._onmessage_bound) {
        (this._worker as DedicatedWorkerLike).removeEventListener?.(
          "message",
          this._onmessage_bound
        );
      }
    } catch {}

    if (this._port) {
      try {
        this._port.close();
      } catch {}
      this._port = undefined;
    } else {
      try {
        (this._worker as DedicatedWorkerLike).terminate?.();
      } catch {}
    }
  }
}
