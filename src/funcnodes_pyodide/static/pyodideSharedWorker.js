import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

// File: src/pyodideWorker.mjs
var _a;
// @ts-nocheck
console.log("pyodideSharedWorker.mjs");
// Cast the global object (self) to our extended type:
const globaleSlf = self;
const params = new URLSearchParams(self.location.search);
globaleSlf.connectedPorts = []; // Store all connected ports
globaleSlf.worker = undefined;
globaleSlf.pyodide = undefined;
globaleSlf.micropip = undefined;
globaleSlf.bufferstate = {};
globaleSlf.debug = ((_a = params.get("debug")) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "true";
function initializePyodide() {
    return __awaiter(this, void 0, void 0, function* () {
        if (globaleSlf.pyodide === undefined) {
            globaleSlf.pyodide = yield loadPyodide();
        }
        if (globaleSlf.micropip === undefined) {
            yield globaleSlf.pyodide.loadPackage("micropip");
            globaleSlf.micropip = globaleSlf.pyodide.pyimport("micropip");
        }
    });
}
function initializeFuncNodesWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield initializePyodide();
            if (globaleSlf.worker === undefined) {
                console.debug("Pyodide ready");
                console.debug("Installing funcnodes");
                yield globaleSlf.micropip.install("funcnodes-pyodide");
                console.debug("Importing funcnodes");
                yield globaleSlf.pyodide.runPythonAsync("import funcnodes_pyodide");
                console.debug("Creating worker:", `funcnodes_pyodide.new_worker(debug=${globaleSlf.debug ? 1 : 0})`);
                globaleSlf.worker = yield globaleSlf.pyodide.runPythonAsync(`funcnodes_pyodide.new_worker(debug=${globaleSlf.debug ? 1 : 0})`);
                globaleSlf.worker.run_forever_async();
                globaleSlf.worker.set_receiver(self);
                console.debug("Worker ready");
            }
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    });
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
    port.onmessage = (event) => __awaiter(void 0, void 0, void 0, function* () {
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
                }
                else if (cmd === "state") {
                    const t = {};
                    data.result = {
                        state: {
                            loaded: yield Promise.race([
                                globaleSlf.pyodideReadyPromise,
                                t,
                            ]).then((v) => (v === t ? false : true), () => undefined),
                        },
                    };
                }
                else if (cmd === "send") {
                    globaleSlf.worker.receivejs(event.data.msg);
                }
                else {
                    throw new Error("Unknown command: " + cmd);
                }
            }
            else {
                throw new Error("Unknown message", event.data);
            }
        }
        catch (error) {
            data.error = error.message;
        }
        // Send the response back via the port
        port.postMessage(JSON.parse(JSON.stringify(data)));
    });
    // Optionally, remove disconnected ports (if your app needs cleanup)
    port.addEventListener("close", () => {
        globaleSlf.connectedPorts = globaleSlf.connectedPorts.filter((p) => p !== port);
    });
};
//# sourceMappingURL=pyodideSharedWorker.js.map
