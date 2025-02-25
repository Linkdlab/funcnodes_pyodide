import { FuncNodesWorker, WorkerProps } from "@linkdlab/funcnodes_react_flow";
import { v4 as uuidv4 } from "uuid";
import { WorkerSendMessage } from "./pyodideWorkerLogic.mjs";
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

interface FuncnodesPyodideWorkerProps extends Partial<WorkerProps> {
  debug?: boolean;
  worker_url: string;
  shared_worker?: boolean;
  worker?: Worker | SharedWorker;
}

class FuncnodesPyodideWorker extends FuncNodesWorker {
  _worker: Worker | SharedWorker;
  initPromise: Promise<void>;
  _workerstate: {
    loaded: boolean;
  };
  _port: MessagePort | undefined;
  _message_hooks: ((data: any) => Promise<void>)[] = [];
  constructor(_data: FuncnodesPyodideWorkerProps) {
    const data: FuncnodesPyodideWorkerProps & WorkerProps = {
      uuid: uuidv4(),
      ..._data,
    };
    super(data);
    const paramurl = `${data.worker_url}?debug=${data.debug}`;

    if (data.worker) {
      if (data.worker instanceof SharedWorker) {
        data.shared_worker = true;
      } else if (data.worker instanceof Worker) {
        data.shared_worker = false;
      } else {
        throw new Error("worker must be an instance of Worker or SharedWorker");
      }
    }

    if (data.shared_worker) {
      if (!data.worker) {
        data.worker = new SharedWorker(paramurl, {
          type: "module",
          name: data.uuid,
        });
      }
      this._worker = data.worker as SharedWorker;
      this._port = this._worker.port;
      this._port.start(); // Ensure the port is active
      this._port.addEventListener("message", this.onmessage.bind(this));
      // Example: regularly ask for state updates
    } else {
      if (!data.worker) {
        data.worker = new Worker(paramurl, {
          type: "module",
        });
      }
      this._worker = data.worker as Worker;
      this._worker.addEventListener("message", this.onmessage.bind(this));
    }

    setInterval(() => {
      this.postMessage({ cmd: "state" });
    }, 1000);

    this._workerstate = { loaded: false };
    this.initPromise = new Promise<void>(async (resolve) => {
      while (!this._workerstate.loaded) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
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
      }
    } else if (event.data.cmd) {
      if (event.data.cmd === "receive") {
        if (event.data.worker_id === undefined) {
          throw new Error("worker_id is undefined");
        }
        if (event.data.worker_id === this.uuid)
          this.receive(JSON.parse(event.data.msg));
      }
    }
  }
}

export default FuncnodesPyodideWorker;
// export { intitalize_pyodide_worker };
