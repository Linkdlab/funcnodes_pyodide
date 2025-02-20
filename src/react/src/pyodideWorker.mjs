// @ts-nocheck
console.log("pyodideWorker.mjs");
// webworker.mjs
// @ts-ignore
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs";

async function initializePyodide() {
  self.pyodide = await loadPyodide();
  await self.pyodide.loadPackage("micropip");
  self.micropip = self.pyodide.pyimport("micropip");
}

async function initializeFuncNodesWorker() {
  try {
    await initializePyodide();
    console.debug("Pyodide ready");
    console.debug("Installing funcnodes");
    await self.micropip.install("funcnodes-pyodide");
    console.debug("importing funcnodes");
    await self.pyodide.runPythonAsync("import funcnodes_pyodide");
    console.debug("Creating worker");
    self.worker = await self.pyodide.runPythonAsync(
      `funcnodes_pyodide.new_worker()`
    );
    self.worker.run_forever_async();
    self.worker.set_receiver(self);
    console.debug("Worker ready");
  } catch (e) {
    console.error(e);
    throw e;
  }
}

self.receivepy = (msg) => {
  self.postMessage({ cmd: "receive", msg: msg });
};

const pyodideReadyPromise = initializeFuncNodesWorker();

self.onmessage = async (event) => {
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
            loaded: await Promise.race([pyodideReadyPromise, t]).then(
              (v) => (v === t ? false : true),
              () => undefined
            ),
          },
        };
      } else if (cmd === "send") {
        self.worker.receivejs(event.data.msg);
      } else {
        throw new Error("Unknown command: " + cmd);
      }
    } else {
      throw new Error("Unknown message", event.data);
    }
  } catch (error) {
    data.error = error.message;
  }

  self.postMessage(JSON.parse(JSON.stringify(data)));
};
