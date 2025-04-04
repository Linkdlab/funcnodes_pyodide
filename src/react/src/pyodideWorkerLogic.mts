/**
 * File: pyodideWorkerLogic.mjs
 * This module contains the common logic for initializing Pyodide, installing packages,
 * creating the funcnodes worker, and handling incoming messages.
 */

// Import Pyodide for typing
import { loadPyodide as loadPyodideType, PyodideInterface } from "pyodide";

const __DEFAULT_PYODIDE_URL__ =
  "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs";

// Assume PYCODE is provided via a bundler or global constant.

type anyworker = any;
type anymicropip = any;

interface FuncNodesWorkerState {
  worker: anyworker | null;
  make_promise: Promise<anyworker>;
  reject_promise?: (reason?: any) => void;
}

interface receivepyParams {
  msg: any;
  worker_id: string;
}

type receivepyMsgType = string | receivepyParams;
type receivepyKwargsType = Partial<receivepyParams> | string | undefined;

interface PyodideLogicGlobals {
  reset: () => Promise<void>;
  initializePyodide: () => Promise<{
    pyodide: PyodideInterface;
    micropip: anymicropip;
  }>;
  workerState: workerStateType;
  interrupt: () => void;
  list_workers: () => string[];
  get_worker: (id: string) => Promise<FuncNodesWorkerState>;
  has_worker: (id: string) => boolean;
  get_or_create_worker: (id: string) => Promise<FuncNodesWorkerState>;
  initializeFuncNodesWorker: (uuid: string) => Promise<FuncNodesWorkerState>;
  receivepy: (msg: receivepyMsgType, worker_id: receivepyKwargsType) => void;
  startInitialization: (params: startInitializationParams) => workerStateType;
  register_cmd_message: <T extends CommandMessage>(
    cmd: T["cmd"],
    handler: (msg: T) => Promise<any>
  ) => void;
  handleMessage: (message: Message) => Promise<Messageresponse>;
  read_url_params: () => { debug: boolean; pyodide_url: string | undefined };
  globalThis: PyodideLogicGlobals;
}

const globalThis = self as unknown as PyodideLogicGlobals;

interface workerStateType {
  pyodide: PyodideInterface | null;
  micropip: anymicropip;
  pyodide_url: string;
  worker: { [key: string]: FuncNodesWorkerState };
  pyodideReady: boolean;
  pyodideReadyPromise: Promise<{
    pyodide: PyodideInterface;
    micropip: anymicropip;
  }> | null;
  debug: boolean;
  interruptBuffer: Uint8Array<SharedArrayBuffer> | null;
  receivepy: (msg: string, worker_id: string) => void;
  handel_register: {
    [key: string]: (msg: CommandMessage) => Promise<any>;
  };
  post_pyodide_ready?: (workerState: workerStateType) => Promise<void>;
}

globalThis.workerState = {
  pyodide: null,
  pyodide_url: __DEFAULT_PYODIDE_URL__,
  micropip: null,
  worker: {},
  pyodideReady: false,
  pyodideReadyPromise: null,
  debug: false,
  interruptBuffer: null,
  receivepy: (_msg: any, _worker_id: string) => void 0,
  handel_register: {},
  post_pyodide_ready: undefined,
};

globalThis.reset = async () => {
  for (const key in globalThis.list_workers()) {
    try {
      const worker = await globalThis.get_worker(key);
      if (worker.worker) {
        worker.worker.stop();
      }
      worker.reject_promise?.("Worker reset");
    } catch (e) {}
  }
  if (globalThis.workerState.pyodide) {
    globalThis.interrupt();
  }
  globalThis.workerState.pyodide = null;
  globalThis.workerState.micropip = null;
  globalThis.workerState.worker = {};
  globalThis.workerState.pyodideReady = false;

  try {
    globalThis.workerState.interruptBuffer = new Uint8Array(
      new SharedArrayBuffer(1)
    ); // not supported by most browsers
    globalThis.workerState.interruptBuffer[0] = 0;
  } catch (e) {}
};

globalThis.initializePyodide = async (): Promise<{
  pyodide: PyodideInterface;
  micropip: anymicropip;
}> => {
  if (!globalThis.workerState.pyodide) {
    console.debug("Loading Pyodide...");
    await globalThis.reset();
    console.debug("Loading Pyodide module...");
    const pyodideModule = await import(globalThis.workerState.pyodide_url);
    console.debug("Loading Pyodide instance...");
    const loadPyodide = pyodideModule.loadPyodide as typeof loadPyodideType;

    // index url is the folder of workerState.pyodide_url (which points to .../pyodide.mjs)
    const indexURL = globalThis.workerState.pyodide_url
      .split("/")
      .slice(0, -1)
      .join("/");
    globalThis.workerState.pyodide = await (
      loadPyodide as typeof loadPyodideType
    )({
      packages: ["micropip"],
      indexURL: indexURL,
    });
    if (globalThis.workerState.interruptBuffer) {
      globalThis.workerState.pyodide.setInterruptBuffer(
        globalThis.workerState.interruptBuffer
      );
    }
  }
  if (!globalThis.workerState.micropip) {
    console.debug("Importing micropip...");
    globalThis.workerState.micropip =
      globalThis.workerState.pyodide.pyimport("micropip");
  }

  console.debug("Pyodide ready. Installing funcnodes...");
  await globalThis.workerState.micropip.install("funcnodes-pyodide");
  console.debug("Importing funcnodes...");
  await globalThis.workerState.pyodide.runPythonAsync(
    "import funcnodes_pyodide"
  );

  console.debug("Running post_pyodide_ready...");
  await globalThis.workerState.post_pyodide_ready?.(globalThis.workerState);
  console.debug("Pyodide ready");
  globalThis.workerState.pyodideReady = true;
  return {
    pyodide: globalThis.workerState.pyodide,
    micropip: globalThis.workerState.micropip,
  };
};

globalThis.interrupt = () => {
  if (globalThis.workerState.interruptBuffer) {
    globalThis.workerState.interruptBuffer[0] = 1;
  }
};

globalThis.list_workers = (): string[] => {
  return Object.keys(globalThis.workerState.worker);
};

globalThis.get_worker = async (id: string): Promise<FuncNodesWorkerState> => {
  if (!id) throw new Error("Worker id is required");
  if (!globalThis.workerState.worker[id]) {
    throw new Error(`Worker with id ${id} not found`);
  }
  await globalThis.workerState.worker[id].make_promise;
  return globalThis.workerState.worker[id];
};

globalThis.has_worker = (id: string): boolean => {
  if (!id) throw new Error("Worker id is required");
  return !!globalThis.workerState.worker[id];
};

globalThis.get_or_create_worker = async (id: string) => {
  if (!id) throw new Error("Worker id is required");
  if (!globalThis.workerState.worker[id]) {
    await globalThis.initializeFuncNodesWorker(id);
  }
  return globalThis.get_worker(id);
};

globalThis.initializeFuncNodesWorker = async (
  uuid: string
): Promise<FuncNodesWorkerState> => {
  try {
    const { pyodide } = await globalThis.initializePyodide();
    if (!globalThis.has_worker(uuid)) {
      globalThis.workerState.worker[uuid] = {
        worker: null,
        //@ts-ignore
        make_promise: undefined,
      };

      const make_promise = new Promise<anyworker>(async (resolve, reject) => {
        globalThis.workerState.worker[uuid].reject_promise = reject;
        console.debug(`Creating worker (${uuid})...`);
        const new_worker = (await pyodide.runPythonAsync(
          `funcnodes_pyodide.new_worker(debug=${
            globalThis.workerState.debug ? 1 : 0
          }, uuid="${uuid}")`
        )) as anyworker;
        console.debug("Worker created:", new_worker);
        if (typeof new_worker.set_receiver === "function") {
          new_worker.set_receiver(self);
        } else {
          throw new Error("Worker does not expose a 'set_receiver' method.");
        }
        globalThis.workerState.worker[uuid].worker = new_worker;
        console.debug("Worker ready");
        resolve(new_worker);
      });
      globalThis.workerState.worker[uuid].make_promise = make_promise;
    }

    return globalThis.get_worker(uuid);
  } catch (e) {
    console.error("Error during worker initialization:", e);
    throw e;
  }
};

globalThis.receivepy = (msg: receivepyMsgType, kwargs: receivepyKwargsType) => {
  try {
    let data: Partial<receivepyParams> = {};
    if (typeof msg === "string") {
      data.msg = msg;
    } else {
      data = msg;
    }

    if (data.msg === undefined) return;

    if (typeof data.msg !== "string") {
      data.msg = JSON.stringify(data.msg);
    }

    if (kwargs !== undefined) {
      if (typeof kwargs === "string") {
        if (!data.worker_id) {
          data.worker_id = kwargs;
        }
      } else {
        data = { ...kwargs, ...data };
      }
    }

    const worker_id = data.worker_id;
    if (!worker_id) {
      throw new Error(
        `Worker id not provided in receivepy(${JSON.stringify(data)})`
      );
      return;
    }
    if (!globalThis.workerState.worker[worker_id]) {
      throw new Error(
        `Worker with id ${worker_id} not found in receivepy(${JSON.stringify(
          data
        )})`
      );
      return;
    }
    globalThis.workerState.receivepy(msg as string, worker_id);
  } catch (e) {
    console.error("Error during receivepy:", e);
    return;
  }
};

interface startInitializationParams {
  debug: boolean;
  receivepy: (msg: string, worker_id: string) => void;
  pyodide_url?: string;
  post_pyodide_ready?: (workerState: workerStateType) => Promise<void>;
}

globalThis.startInitialization = ({
  debug = false,
  receivepy,
  pyodide_url,
  post_pyodide_ready,
}: startInitializationParams): workerStateType => {
  globalThis.workerState.debug = debug;
  globalThis.workerState.pyodide_url = pyodide_url || __DEFAULT_PYODIDE_URL__;
  globalThis.workerState.receivepy = receivepy;
  globalThis.workerState.pyodideReadyPromise = globalThis.initializePyodide();
  globalThis.workerState.post_pyodide_ready = post_pyodide_ready;
  return globalThis.workerState;
};

interface Messageresponse {
  id?: string;
  result?: any;
  error?: string;
  original: Message;
}

interface BaseMessage {
  id?: string;
  msg?: string;
  toJs?: boolean;
}
interface CommandMessage extends BaseMessage {
  cmd: string;
}

interface PingMessage extends CommandMessage {
  cmd: "ping";
}

interface WorkerMessage extends CommandMessage {
  worker_id: string;
}

interface StateMessage extends CommandMessage {
  cmd: "state";
}
interface WorkerSendMessage extends WorkerMessage {
  cmd: "worker:send";
}

type Message = PingMessage | StateMessage | WorkerSendMessage;

globalThis.register_cmd_message = <T extends CommandMessage>(
  cmd: T["cmd"],
  handler: (msg: T) => Promise<any>
) => {
  if (globalThis.workerState.handel_register[cmd]) {
    throw new Error(`Command ${cmd} already registered`);
  }
  globalThis.workerState.handel_register[cmd] = handler as (
    msg: CommandMessage
  ) => Promise<any>;
};

globalThis.register_cmd_message("ping", async (_msg: PingMessage) => {
  return "pong";
});

globalThis.register_cmd_message("state", async (_msg: StateMessage) => {
  return { state: { loaded: globalThis.workerState.pyodideReady } };
});

globalThis.register_cmd_message("worker:state", async (msg: WorkerMessage) => {
  const worker = await globalThis.get_or_create_worker(msg.worker_id);
  return { state: { loaded: !!worker.worker } };
});

globalThis.register_cmd_message("worker:stop", async (msg: WorkerMessage) => {
  const worker = await globalThis.get_or_create_worker(msg.worker_id);
  if (worker.worker) {
    worker.worker.stop();
    worker.worker = null;
    worker.reject_promise?.("Worker stopped");
  }

  delete globalThis.workerState.worker[msg.worker_id];

  return { state: { loaded: false } };
});

globalThis.register_cmd_message(
  "worker:send",
  async (msg: WorkerSendMessage) => {
    const worker = await globalThis.get_or_create_worker(msg.worker_id);
    if (!worker.worker) throw new Error("Worker is not initialized");
    if (typeof worker.worker.receivejs !== "function") {
      throw new Error(
        `Worker does not support receivejs: ${typeof worker.worker.receivejs}`
      );
    }
    worker.worker.receivejs(msg.msg);
  }
);

globalThis.handleMessage = async (message: Message) => {
  const response: Messageresponse = {
    original: message,
  };
  if (message.id) {
    response.id = message.id;
  }
  // Default toJs to true if not provided.
  if (message.toJs === undefined) {
    message.toJs = true;
  }
  try {
    if (message.cmd) {
      const cmdmessage = message as CommandMessage;

      if (globalThis.workerState.handel_register[cmdmessage.cmd]) {
        response.result = await globalThis.workerState.handel_register[
          cmdmessage.cmd
        ](cmdmessage);
        return response;
      } else {
        throw new Error("Unknown command: " + cmdmessage.cmd);
      }
    } else {
      throw new Error("Unknown message format: " + JSON.stringify(message));
    }
  } catch (error: any) {
    response.error = error.message;
  }
  return response;
};

globalThis.read_url_params = () => {
  // Use URL parameters (if any) to determine debug settings.
  const params = new URLSearchParams(self.location.search);
  const debug = params.get("debug")?.toLowerCase() === "true";
  const pyodide_url = params.get("pyodide_url") || undefined;

  console.log("Debug:", debug, "Pyodide URL:", pyodide_url);
  return { debug, pyodide_url };
};

export default globalThis;
export type {
  workerStateType,
  startInitializationParams,
  FuncNodesWorkerState,
  BaseMessage,
  CommandMessage,
  PingMessage,
  StateMessage,
  WorkerMessage,
  WorkerSendMessage,
  PyodideLogicGlobals,
  Message,
  Messageresponse,
};
