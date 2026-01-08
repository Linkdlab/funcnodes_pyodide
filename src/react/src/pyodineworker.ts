import { FuncNodesWorker, WorkerProps } from "@linkdlab/funcnodes_react_flow";
import { v4 as uuidv4 } from "uuid";
import { WorkerLifecycle } from "./workerLifecycle";

type WorkerSendMessage = {
  cmd: "worker:send";
  msg: string;
  worker_id: string;
};

export interface FuncnodesPyodideWorkerProps extends Partial<WorkerProps> {
  debug?: boolean;
  worker_url?: string;
  worker_baseurl?: string;
  shared_worker?: boolean;
  worker?: Worker | SharedWorker;
  pyodide_url?: string;
  packages?: string[];
  worker_classes?: {
    Shared: new (options?: { name?: string }) => SharedWorker;
    Dedicated: new (options?: { name?: string }) => Worker;
  };
  restore_worker_state_on_load?: boolean | string;
  post_worker_initialized?: (worker: FuncnodesPyodideWorker) => Promise<void>;
}

const normalizePackageSpecs = (
  packages: string[] | undefined,
  baseUrl?: string
): string[] | undefined => {
  if (!packages?.length) return packages;

  const base =
    baseUrl ??
    (typeof window !== "undefined" && window.location
      ? window.location.href
      : undefined);

  if (!base) return packages;

  return packages.map((spec) => {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(spec);
    if (hasScheme) return spec;
    if (
      spec.startsWith("/") ||
      spec.startsWith("./") ||
      spec.startsWith("../")
    ) {
      return new URL(spec, base).toString();
    }
    return spec;
  });
};

export const worker_from_data = (
  data: FuncnodesPyodideWorkerProps
): Worker | SharedWorker => {
  if (data.worker) return data.worker;

  if (data.shared_worker) {
    if (data.worker_url === undefined) {
      if (data.worker_classes?.Shared) {
        data.worker = new data.worker_classes.Shared({
          name: data.uuid,
        });
      } else {
        if (typeof SharedWorker === "undefined") {
          throw new Error(
            "SharedWorker is not available; provide worker, worker_url or worker_classes.Shared"
          );
        }
        data.worker = new SharedWorker(
          new URL("./pyodideSharedWorker.mts", import.meta.url),
          {
            name: data.uuid,
            type: "module",
          }
        );
      }
    } else {
      if (typeof SharedWorker === "undefined") {
        throw new Error(
          "SharedWorker is not available; provide worker or set shared_worker=false"
        );
      }
      data.worker = new SharedWorker(data.worker_url, {
        name: data.uuid,
        type: "module",
      });
    }
  } else {
    if (data.worker_url === undefined) {
      if (data.worker_classes?.Dedicated) {
        data.worker = new data.worker_classes.Dedicated({
          name: data.uuid,
        });
      } else {
        if (typeof Worker === "undefined") {
          throw new Error(
            "Worker is not available; provide worker, worker_url or worker_classes.Dedicated"
          );
        }
        data.worker = new Worker(
          new URL("./pyodideDedicatedWorker.mts", import.meta.url),
          {
            name: data.uuid,
            type: "module",
          }
        );
      }
    } else {
      if (typeof Worker === "undefined") {
        throw new Error(
          "Worker is not available; provide worker or set shared_worker=true"
        );
      }
      data.worker = new Worker(data.worker_url, {
        name: data.uuid,
        type: "module",
      });
    }
  }

  return data.worker;
};

class FuncnodesPyodideWorker extends FuncNodesWorker {
  _worker: Worker | SharedWorker | undefined;
  initPromise: Promise<void>;
  _workerstate: {
    loaded: boolean;
    msg: string;
    progress: number;
  };
  _message_hooks: ((data: any) => Promise<void>)[] = [];
  private _disposed = false;
  private _lifecycle: WorkerLifecycle;
  constructor(_data: FuncnodesPyodideWorkerProps) {
    const data: FuncnodesPyodideWorkerProps & WorkerProps = {
      uuid: uuidv4(),
      ..._data,
    };
    super(data);

    this._worker = worker_from_data(data);
    this._lifecycle = new WorkerLifecycle(this._worker as any, {
      worker_id: this.uuid,
      onMessage: this.onmessage.bind(this),
    });

    this.postMessage({
      cmd: "init",
      data: {
        debug: data.debug,
        pyodide_url: data.pyodide_url,
        packages: normalizePackageSpecs(data.packages, data.worker_baseurl),
      },
    });

    this._lifecycle.startStatePolling();

    this._workerstate = { loaded: false, msg: "loading", progress: 0 };
    this.initPromise = new Promise<void>(async (resolve) => {
      while (!this._workerstate.loaded && !this._disposed) {
        this._zustand?.set_progress({
          message: this._workerstate.msg,
          status: "info",
          progress: this._workerstate.progress,
          blocking: true,
        });

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this._lifecycle.stopPolling();
      if (!this._disposed) {
        this.is_open = true;
        this._zustand?.auto_progress();
      }
      resolve();
    });

    this.initPromise.then(async () => {
      if (this._disposed) return;
      if (data.restore_worker_state_on_load) {
        const key =
          typeof data.restore_worker_state_on_load === "string"
            ? data.restore_worker_state_on_load
            : this._storage_key();
        await this.restore_worker_state(key);
      }
      await this.getSyncManager().stepwise_fullsync();
      if (data.post_worker_initialized) {
        await data.post_worker_initialized(this);
      }
    });
  }

  override async send(data: any) {
    await this.initPromise;
    // this is the abstract method that should be implemented by subclasses
    // throw new Error("Not implemented");
    this.postMessage({
      cmd: "worker:send",
      msg: JSON.stringify(data),
      worker_id: this.uuid,
    } as WorkerSendMessage);
    return;
  }

  postMessage(data: any) {
    this._lifecycle.postMessage(data);
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.is_open = false;
    this._lifecycle.dispose();
  }

  registerMessageHook(hook: (data: any) => Promise<void>): () => void {
    this._message_hooks.push(hook);

    // return a function to unregister the hook
    return () => {
      this._message_hooks = this._message_hooks.filter((h) => h !== hook);
    };
  }

  onmessage(event: MessageEvent) {
    if (this._disposed) return;
    for (const hook of this._message_hooks) {
      hook(event.data);
    }
    if (event.data.result) {
      if (event.data.result.state) {
        this._workerstate = {
          ...this._workerstate,
          ...event.data.result.state,
        };
        if (
          event.data.result.state.msg &&
          event.data.result.state.msg !== "ready"
        ) {
          this._zustand?.set_progress({
            message: this._workerstate.msg,
            status: "info",
            progress: this._workerstate.progress,
            blocking: true,
          });
        }
      }
    } else if (event.data.cmd) {
      if (event.data.cmd === "receive") {
        if (event.data.worker_id === undefined) {
          throw new Error("worker_id is undefined");
        }
        if (event.data.worker_id === this.uuid)
          this.getCommunicationManager().receive(JSON.parse(event.data.msg));
      } else if (event.data.cmd === "receive_bytes") {
        if (event.data.worker_id === undefined) {
          throw new Error("worker_id is undefined");
        }
        if (event.data.worker_id === this.uuid)
          this.getCommunicationManager().onbytes(event.data.msg);
      }
    }
  }

  async upload_file({
    files: files,
    onProgressCallback: _onProgressCallback,
    root: root,
  }: {
    files: File[] | FileList;
    onProgressCallback?: (loaded: number, total?: number) => void;
    root?: string;
  }): Promise<string> {
    const promises: Promise<string>[] = [];
    const total = files.length;
    let loaded = 0;
    if (files.length === 0) {
      return "";
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const promise = new Promise<string>((resolve, reject) => {
        reader.onload = async (event) => {
          try {
            const data = (
              (event.target as FileReader).result as string
            )?.replace(/^data:.+;base64,/, "");
            const sub_target = file.webkitRelativePath || file.name;
            const target = root ? `${root}/${sub_target}` : sub_target;
            const ans = await this._send_cmd({
              cmd: "upload",
              kwargs: { data: data, filename: target },
              wait_for_response: true,
            });
            loaded++;
            if (_onProgressCallback) {
              _onProgressCallback(loaded, total);
            }
            resolve(ans);
          } catch (e) {
            reject(e);
          }
        };
        reader.readAsDataURL(file);
      });
      promises.push(promise);
    }
    const file_results = await Promise.all(promises);
    // get common root
    const common_root = file_results.reduce((acc, val) => {
      const split = val.split("/");
      const split_acc = acc.split("/");
      const common: string[] = [];
      for (let i = 0; i < split.length; i++) {
        if (split[i] === split_acc[i]) {
          common.push(split[i]);
        } else {
          break;
        }
      }
      return common.join("/");
    }, file_results[0]);
    return common_root;
  }

  get ready() {
    return this._workerstate.loaded;
  }

  private _storage_key(): string {
    return `funcnodes_pyodide:worker_export:${this.uuid}`;
  }

  private _has_local_storage(): boolean {
    try {
      return typeof globalThis !== "undefined" && "localStorage" in globalThis;
    } catch {
      return false;
    }
  }

  async save_worker_state({ withFiles = true } = {}): Promise<string> {
    const resp = await this.export({ withFiles });
    const export_str =
      typeof resp === "string" ? resp : (resp?.data as string | undefined);

    if (typeof export_str !== "string") {
      throw new Error("export_worker did not return a string export");
    }

    if (this._has_local_storage()) {
      globalThis.localStorage.setItem(this._storage_key(), export_str);
    }

    return export_str;
  }

  async restore_worker_state(key?: string): Promise<boolean> {
    if (!this._has_local_storage()) return false;

    const export_str = globalThis.localStorage.getItem(
      key || this._storage_key()
    );
    if (!export_str) return false;

    try {
      await this.update_from_export(export_str);
      return true;
    } catch (e) {
      console.warn("Failed to restore worker state from storage", e);
      return false;
    }
  }
}

export default FuncnodesPyodideWorker;
// export { initialize_pyodide_worker };
