import gself, {
  workerStateType,
  PyodideLogicGlobals,
} from "./pyodideWorkerLogic.mjs";
import { createSharedWorkerPortRegistry } from "./sharedWorkerPorts";

interface CommonWorkerLayout extends PyodideLogicGlobals {
  general_initalization: (p: FullInitParams) => void;
}

interface ExtendetDedicatedWorkerGlobalScope
  extends DedicatedWorkerGlobalScope,
    CommonWorkerLayout {
  init_dedicated_worker: (params: DedicatedWorkerInitParams) => void;
}

interface ExtendetSharedWorkerGlobalScope
  extends SharedWorkerGlobalScope,
    CommonWorkerLayout {
  connectedPorts: MessagePort[];
  init_shared_worker: (params: SharedWorkerInitParams) => void;
}

interface WorkerInitParams {
  post_pyodide_ready?: (workerState: workerStateType) => Promise<void>;
}

interface FullInitParams extends WorkerInitParams {
  receivepy: (msg: string, worker_id: string) => void;
  receivepy_bytes: (msg: Uint8Array, worker_id: string) => void;
}
interface DedicatedWorkerInitParams extends WorkerInitParams {}
interface SharedWorkerInitParams extends WorkerInitParams {}

const globaleSlf = gself as unknown as
  | ExtendetDedicatedWorkerGlobalScope
  | ExtendetSharedWorkerGlobalScope;

globaleSlf.general_initalization = (p: FullInitParams) => {
  const url_params = globaleSlf.read_url_params();
  globaleSlf.startInitialization({
    ...p,
    ...url_params,
  });
};

const globaleSlfShared = globaleSlf as ExtendetSharedWorkerGlobalScope;
const globaleSlfDedicated = globaleSlf as ExtendetDedicatedWorkerGlobalScope;

globaleSlfDedicated.init_dedicated_worker = (
  params: DedicatedWorkerInitParams
) => {
  const globaleSlf = gself as unknown as ExtendetDedicatedWorkerGlobalScope;

  globaleSlf.onmessage = async (event) => {
    const message = event.data;
    const response = await globaleSlf.handleMessage(message);
    globaleSlf.postMessage(response);
  };

  const full_params: FullInitParams = {
    ...params,
    receivepy: (msg: any, worker_id: string) => {
      // Broadcast the message to every connected port
      globaleSlf.postMessage({ cmd: "receive", msg, worker_id: worker_id });
    },
    receivepy_bytes(msg: Uint8Array, worker_id: string) {
      // Broadcast the message to every connected port
      globaleSlf.postMessage({
        cmd: "receive_bytes",
        msg: msg,
        worker_id: worker_id,
      });
    },
  };

  globaleSlf.general_initalization(full_params);
};

globaleSlfShared.init_shared_worker = (params: SharedWorkerInitParams) => {
  const globaleSlf = gself as unknown as ExtendetSharedWorkerGlobalScope;

  const ports = createSharedWorkerPortRegistry(() => {
    try {
      // Close the shared worker once no clients are connected.
      (globaleSlf as unknown as SharedWorkerGlobalScope).close();
    } catch {}
  });
  globaleSlf.connectedPorts = [];

  globaleSlf.onconnect = (event) => {
    const port = event.ports[0];
    globaleSlf.connectedPorts.push(port);
    ports.add(port);
    port.start();
    console.debug("Port connected in shared worker");

    port.onmessage = async (event) => {
      const message = event.data;
      if (message?.cmd === "disconnect") {
        ports.disconnect(port);
        globaleSlf.connectedPorts = globaleSlf.connectedPorts.filter(
          (p) => p !== port
        );
        // Best-effort cleanup: clear handler; closing is optional in spec but supported.
        try {
          port.onmessage = null;
        } catch {}
        try {
          port.close();
        } catch {}
        return;
      }
      const response = await globaleSlf.handleMessage(message);
      port.postMessage(response);
    };

    // Note: The MessagePort API does not define a "close" event.
    // If needed, implement a custom protocol for cleanup.
  };

  const full_params: FullInitParams = {
    ...params,
    receivepy: (msg: any, worker_id: string) => {
      // Broadcast the message to every connected port
      ports.forEach((port) => {
        port.postMessage({ cmd: "receive", msg, worker_id: worker_id });
      });
    },
    receivepy_bytes(msg: Uint8Array, worker_id: string) {
      // Broadcast the message to every connected port
      ports.forEach((port) => {
        port.postMessage({
          cmd: "receive_bytes",
          msg: msg,
          worker_id: worker_id,
        });
      });
    },
  };

  globaleSlf.general_initalization(full_params);
};

export default globaleSlf;
export type {
  workerStateType,
  SharedWorkerInitParams,
  DedicatedWorkerInitParams,
  ExtendetDedicatedWorkerGlobalScope,
  ExtendetSharedWorkerGlobalScope,
  CommonWorkerLayout,
};
