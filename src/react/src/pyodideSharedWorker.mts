// File: src/pyodideWorker.mjs

// @ts-nocheck
console.log("pyodideSharedWorker.mjs");

// Import Pyodide as before
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs";

// Define an interface that extends the SharedWorker global scope with your custom properties
interface ExtendedWorkerGlobalScope extends SharedWorkerGlobalScope {
  connectedPorts: MessagePort[];
  worker?: any;
  pyodide?: any;
  micropip?: any;
  pyodideReadyPromise: Promise<void>;
  // Also add the custom receiver function
  receivepy: (msg: any) => void;

  bufferstate: any;
  debug: boolean;
}

// Cast the global object (self) to our extended type:
const globaleSlf = self as ExtendedWorkerGlobalScope;
const params = new URLSearchParams(self.location.search);

globaleSlf.connectedPorts = []; // Store all connected ports

globaleSlf.worker = undefined;
globaleSlf.pyodide = undefined;
globaleSlf.micropip = undefined;
globaleSlf.bufferstate = {};

globaleSlf.debug = params.get("debug")?.toLowerCase() === "true";

async function initializePyodide() {
  if (globaleSlf.pyodide === undefined) {
    globaleSlf.pyodide = await loadPyodide();
  }
  if (globaleSlf.micropip === undefined) {
    await globaleSlf.pyodide.loadPackage("micropip");
    globaleSlf.micropip = globaleSlf.pyodide.pyimport("micropip");
  }
}

async function initializeFuncNodesWorker() {
  try {
    await initializePyodide();
    if (globaleSlf.worker === undefined) {
      console.debug("Pyodide ready");
      console.debug("Installing funcnodes");
      await globaleSlf.micropip.install("funcnodes-pyodide");
      console.debug("Importing funcnodes");
      await globaleSlf.pyodide.runPythonAsync("import funcnodes_pyodide");
      console.debug(
        "Creating worker:",
        `funcnodes_pyodide.new_worker(debug=${globaleSlf.debug ? 1 : 0})`
      );
      globaleSlf.worker = await globaleSlf.pyodide.runPythonAsync(
        `funcnodes_pyodide.new_worker(debug=${globaleSlf.debug ? 1 : 0})`
      );
      globaleSlf.worker.run_forever_async();
      globaleSlf.worker.set_receiver(self);
      console.debug("Worker ready");
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

// Override receivepy to broadcast to all connected ports
globaleSlf.receivepy = (msg) => {
  // Broadcast the message to every connected port
  globaleSlf.connectedPorts.forEach((port) => {
    port.postMessage({ cmd: "receive", msg });
  });
};

globaleSlf.pyodideReadyPromise = initializeFuncNodesWorker();

// For SharedWorker, listen for connections:
globaleSlf.onconnect = (event) => {
  // Each connecting client gets its own port
  const port = event.ports[0];
  globaleSlf.connectedPorts.push(port);
  port.start();

  port.onmessage = async (event) => {
    const data = {};

    if (event.data.id) {
      data.id = event.data.id;
    }
    if (event.data.toJs === undefined) {
      event.data.toJs = true;
    }

    try {
      if (event.data.cmd) {
        const cmd = event.data.cmd;
        if (cmd === "ping") {
          data.result = "pong";
        } else if (cmd === "state") {
          const t = {};
          data.result = {
            state: {
              loaded: await Promise.race([
                globaleSlf.pyodideReadyPromise,
                t,
              ]).then(
                (v) => (v === t ? false : true),
                () => undefined
              ),
            },
          };
        } else if (cmd === "send") {
          globaleSlf.worker.receivejs(event.data.msg);
        } else {
          throw new Error("Unknown command: " + cmd);
        }
      } else {
        throw new Error("Unknown message", event.data);
      }
    } catch (error) {
      data.error = error.message;
    }
    // Send the response back via the port
    port.postMessage(JSON.parse(JSON.stringify(data)));
  };

  // Optionally, remove disconnected ports (if your app needs cleanup)
  port.addEventListener("close", () => {
    globaleSlf.connectedPorts = globaleSlf.connectedPorts.filter(
      (p) => p !== port
    );
  });
};
