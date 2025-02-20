import { FuncNodesWorker, WorkerProps } from "@linkdlab/funcnodes_react_flow";
import { v4 as uuidv4 } from "uuid";
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
}

class FuncnodesPyodideWorker extends FuncNodesWorker {
  _worker: Worker | SharedWorker;
  initPromise: Promise<void>;
  _workerstate: any;
  _port: MessagePort | undefined;
  constructor(_data: FuncnodesPyodideWorkerProps) {
    const data: FuncnodesPyodideWorkerProps & WorkerProps = {
      uuid: uuidv4(),
      ..._data,
    };
    super(data);
    const paramurl = `${data.worker_url}?debug=${data.debug}`;

    if (data.shared_worker) {
      this._worker = new SharedWorker(paramurl, {
        type: "module",
        name: data.uuid,
      });
      this._port = this._worker.port;
      this._port.start(); // Ensure the port is active
      this._port.addEventListener("message", this.onmessage.bind(this));
      // Example: regularly ask for state updates
      setInterval(() => {
        this._port?.postMessage({ cmd: "state" });
      }, 1000);
    } else {
      // this._worker = intitalize_pyodide_worker(data.debug);
      this._worker = new Worker(paramurl, {
        type: "module",
      });
      this._worker.addEventListener("message", this.onmessage.bind(this));
      setInterval(() => {
        (this._worker as Worker).postMessage({ cmd: "state" });
      }, 1000);
    }

    this._workerstate = { loaded: false };
    this.initPromise = new Promise<void>(async (resolve) => {
      // @ts-ignore
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
    if (this._port) {
      this._port.postMessage({ cmd: "send", msg: JSON.stringify(data) });
    } else {
      await (this._worker as Worker).postMessage({
        cmd: "send",
        msg: JSON.stringify(data),
      });
    }
    return;
  }
  onmessage(event: MessageEvent) {
    if (event.data.result) {
      if (event.data.result.state) {
        this._workerstate = event.data.result.state;
      }
    } else if (event.data.cmd) {
      if (event.data.cmd === "receive") {
        this.receive(JSON.parse(event.data.msg));
      }
    }
  }
}

export default FuncnodesPyodideWorker;
// export { intitalize_pyodide_worker };
