import { FuncNodesWorker, WorkerProps } from "@linkdlab/funcnodes_react_flow";
import { v4 as uuidv4 } from "uuid";
import { WorkerSendMessage } from "./pyodideWorkerLogic.mjs";

import pyodideDedicatedWorker from "./pyodideDedicatedWorker.mts?worker";
import pyodideSharedWorker from "./pyodideSharedWorker.mts?worker";

// @ts-ignore
// import workerScript from "./pyodideWorker.mjs";

// const intitalize_pyodide_worker = (debug: boolean = false): Worker => {
//   const _workerscript = workerScript.replace(
//     "_DEBUG_",
//     debug ? "true" : "false"
//   );

//   const workerBlob = new Blob([_workerscript], {
//     type: "application/javascript",
//   });
//   const workerURL = URL.createObjectURL(workerBlob);
//   const pyiodide_worker = new Worker(workerURL, { type: "module" });

// const communicator = new WorkerCommunicator(pyiodide_worker, worker);

// @ts-ignore

//   return pyiodide_worker;
// };

export interface FuncnodesPyodideWorkerProps extends Partial<WorkerProps> {
  debug?: boolean;
  worker_url?: string;
  worker_baseurl?: string;
  shared_worker?: boolean;
  worker?: Worker | SharedWorker;
  pyodide_url?: string;
  packages?: string[];
}

export const worker_from_data = (
  data: FuncnodesPyodideWorkerProps
): Worker | SharedWorker => {
  if (data.worker) return data.worker;

  if (data.shared_worker) {
    if (data.worker_url === undefined) {
      data.worker = new pyodideSharedWorker({
        name: data.uuid,
      });
    } else {
      data.worker = new SharedWorker(data.worker_url, {
        name: data.uuid,
        type: "module",
      });
    }
  } else {
    if (data.worker_url === undefined) {
      data.worker = new pyodideDedicatedWorker({
        name: data.uuid,
      });
    } else {
      data.worker = new Worker(data.worker_url, {
        name: data.uuid,
        type: "module",
      });
    }
    // data.worker = new Worker(paramurl, {
    //   type: "module",
    // });
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
  _port: MessagePort | undefined;
  _message_hooks: ((data: any) => Promise<void>)[] = [];
  constructor(_data: FuncnodesPyodideWorkerProps) {
    const data: FuncnodesPyodideWorkerProps & WorkerProps = {
      uuid: uuidv4(),
      ..._data,
    };
    super(data);
    this._worker = worker_from_data(data);
    if (this._worker instanceof SharedWorker) {
      data.shared_worker = true;
      this._port = this._worker.port;
      this._port.start(); // Ensure the port is active
      this._port.addEventListener("message", this.onmessage.bind(this));
    } else if (this._worker instanceof Worker) {
      data.shared_worker = false;
      this._worker.addEventListener("message", this.onmessage.bind(this));
    } else {
      throw new Error("worker must be an instance of Worker or SharedWorker");
    }

    this.postMessage({
      cmd: "init",
      data: {
        debug: data.debug,
        pyodide_url: data.pyodide_url,
        packages: data.packages,
      },
    });

    const stateinterval = setInterval(() => {
      this.postMessage({ cmd: "state" });
    }, 400);

    this._workerstate = { loaded: false, msg: "loading", progress: 0 };
    this.initPromise = new Promise<void>(async (resolve) => {
      while (!this._workerstate.loaded) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      clearInterval(stateinterval);
      this.is_open = true;
      this._zustand?.auto_progress();
      resolve();
    });

    this.initPromise.then(() => {
      this.stepwise_fullsync();
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
    data.worker_id = this.uuid;

    if (this._port) {
      this._port.postMessage(data);
    } else {
      (this._worker as Worker).postMessage(data);
    }
  }

  registerMessageHook(hook: (data: any) => Promise<void>): () => void {
    this._message_hooks.push(hook);

    // return a function to unregister the hook
    return () => {
      this._message_hooks = this._message_hooks.filter((h) => h !== hook);
    };
  }

  onmessage(event: MessageEvent) {
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
          this.receive(JSON.parse(event.data.msg));
      } else if (event.data.cmd === "receive_bytes") {
        if (event.data.worker_id === undefined) {
          throw new Error("worker_id is undefined");
        }
        if (event.data.worker_id === this.uuid) this.onbytes(event.data.msg);
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
            const subtarget = file.webkitRelativePath || file.name;
            const target = root ? `${root}/${subtarget}` : subtarget;
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
    const fileresults = await Promise.all(promises);
    // get common root
    const common_root = fileresults.reduce((acc, val) => {
      const split = val.split("/");
      const split_acc = acc.split("/");
      const common = [];
      for (let i = 0; i < split.length; i++) {
        if (split[i] === split_acc[i]) {
          common.push(split[i]);
        } else {
          break;
        }
      }
      return common.join("/");
    }, fileresults[0]);
    return common_root;
  }
}

export default FuncnodesPyodideWorker;
// export { intitalize_pyodide_worker };
