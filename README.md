# funcnodes-pyodide

Run **FuncNodes** completely in the browser by executing the backend worker inside **Pyodide** (Python compiled to WebAssembly) and driving it from the standard **React Flow** editor UI.

This package exists so FuncNodes workflows can be:

- Embedded as **live, interactive examples** in static sites / documentation (no server-side worker needed).
- Shipped as a **“try it in your browser”** demo.
- Used in environments where running a Python worker process is inconvenient, but browser-only execution is acceptable.

> In the “normal” FuncNodes architecture, the React UI talks to a Python `funcnodes-worker` process via WebSockets. Here, the “worker process” is replaced by a browser Web Worker that boots Pyodide, installs the needed Python packages, and then runs a `RemoteWorker`-compatible worker inside that Pyodide interpreter.

---

## What’s in this folder

This repo subtree contains _two_ deliverables plus a prebuilt demo:

### 1) Python package: `funcnodes-pyodide` (AGPL-3.0)

Located in `src/funcnodes_pyodide/`.

Key pieces:

- `funcnodes_pyodide.worker.PyodideWorker`
  - A minimal `funcnodes_worker.RemoteWorker` transport that doesn’t use sockets.
  - Instead it forwards JSON + binary messages to a JavaScript “receiver” (the Web Worker global scope) via `receivepy(...)` / `receivepy_bytes(...)`.
- `funcnodes_pyodide.patch.patch()`
  - Disables file-based logging handlers (Pyodide environments typically don’t have a normal writable filesystem).
  - This patch auto-runs on import when `sys.platform == "emscripten"`.
- `python -m funcnodes_pyodide`
  - Serves the prebuilt static demo UI from `src/funcnodes_pyodide/static/` on a random free local port.

### 2) JavaScript/TypeScript package: `@linkdlab/funcnodes_pyodide_react_flow` (MIT)

Located in `src/react/`.

Key pieces:

- `FuncnodesPyodideWorker` (`src/react/src/pyodineworker.ts`)
  - A `@linkdlab/funcnodes_react_flow`-compatible worker implementation.
  - Talks to a (Shared)WebWorker that runs the Pyodide runtime + Python worker.
- Web Worker runtime (`src/react/src/pyodideWorkerLogic.mts`, `src/react/src/pyodideWorkerLayout.mts`)
  - Loads Pyodide via dynamic `import(...)`.
  - Uses `micropip` to install Python packages at runtime.
  - Imports `funcnodes_pyodide`, creates Python worker instances via `funcnodes_pyodide.new_worker(...)`,
    and bridges messages between JS ↔ Python worker.

### 3) Prebuilt static demo bundle

Located in `src/funcnodes_pyodide/static/` and includes:

- `index.html`
- `funcnodes_pyodide_react_flow.es.js` (+ `.iife.js`)
- `funcnodes_pyodide_react_flow.css`

---

## How it works (high level)

1. The page loads the **FuncNodes React Flow UI** bundle.
2. The UI creates a `FuncnodesPyodideWorker` instance (JS).
3. That JS worker spins up a (Shared)WebWorker.
4. The WebWorker:
   - Dynamically imports Pyodide (`pyodide.mjs`),
   - Installs Python dependencies via `micropip`,
   - Imports `funcnodes_pyodide`,
   - Creates a `PyodideWorker` (Python) and attaches the WebWorker as its “receiver”.
5. From then on, the UI uses the regular FuncNodes worker protocol:
   - UI → WebWorker → Python `RemoteWorker.receive_message(...)`
   - Python events/results → WebWorker → UI

---

## Quickstart: run the local demo page

Recommended environment variables (keep caches/config local):

- `UV_CACHE_DIR=.cache/uv`
- `FUNCNODES_CONFIG_DIR=.funcnodes`

From this repo (this folder contains its own `uv.lock`):

```bash
cd funcnodes_pyodide
uv sync
FUNCNODES_CONFIG_DIR=.funcnodes uv run python -m funcnodes_pyodide
```

Open the printed `http://localhost:<port>` URL in a browser.

The first load is expected to be slow because the WebWorker will download Pyodide and install Python packages.

You can preload an example workflow export via URL, e.g.
`?load=examples/cat.fnw`.

---

## Using it from JavaScript (embedding)

The build registers a few helpers on `window.FuncNodes` (which is a function exported by `@linkdlab/funcnodes_react_flow` and can also carry properties):

- `window.FuncNodes.FuncnodesPyodideWorker` — the JS worker class
- `window.FuncNodes.FuncnodesPyodide(...)` — helper to mount the UI with a Pyodide worker

### Recommended: `FuncnodesPyodide(...)`

This is the recommended API when using the prebuilt browser bundle:

```html
<div id="root" style="height: 100vh"></div>
<script type="module" src="./funcnodes_pyodide_react_flow.es.js"></script>
<link rel="stylesheet" href="./funcnodes_pyodide_react_flow.css" />
<script type="module">
  window.FuncNodes.FuncnodesPyodide("root", {
    useWorkerManager: false,
    debug: true,
    // pyodide_url: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.mjs",
    // packages: ["https://example.com/your.whl"],
    // restore_worker_state_on_load: true,
  });
</script>
```

### Advanced: construct a `FuncnodesPyodideWorker` yourself

This gives you direct access to the worker instance (for example to call
`save_worker_state()`).

```html
<div id="root" style="height: 100vh"></div>
<script type="module" src="./funcnodes_pyodide_react_flow.es.js"></script>
<link rel="stylesheet" href="./funcnodes_pyodide_react_flow.css" />
<script type="module">
  const worker = new window.FuncNodes.FuncnodesPyodideWorker({
    uuid: "root",
    shared_worker: false,
  });

  window.FuncNodes("root", {
    useWorkerManager: false,
    worker,
  });
</script>
```

### Configuration knobs

`FuncnodesPyodideWorker` accepts (among others):

- `uuid`: logical worker id (used to route messages)
- `shared_worker`: `true` to use a `SharedWorker`, `false` for a dedicated `Worker`
- `pyodide_url`: URL to `pyodide.mjs` (defaults to the jsDelivr CDN)
- `packages`: additional Python packages to install via `micropip` _before_ starting the worker
- `worker_url` / `worker`: provide your own Worker/SharedWorker instance or URL instead of using the inline worker bundles
- `debug`: enable more verbose console logs during boot

---

## Where this is used in the FuncNodes ecosystem

FuncNodes’ documentation site can embed live graphs that run fully in-browser using this package.

---

## Limitations / gotchas

- **Network required by default**: the default setup fetches Pyodide and Python wheels at runtime (PyPI/CDNs).
- **Package compatibility**: `micropip` can only install packages that are compatible with Pyodide (pure Python wheels or Pyodide-provided packages). Many native extensions won’t work.
- **Concurrency constraints**: Pyodide does not provide CPython-style multiprocessing, and browser threading constraints apply. Heavy CPU work can freeze the worker.
- **File system semantics**: Pyodide’s filesystem is virtual/in-memory unless you explicitly mount persistent storage; file-based logging is disabled by `funcnodes_pyodide.patch`.
- **Interrupt support is best-effort**: the WebWorker tries to use `SharedArrayBuffer` for interrupts, but this requires cross-origin isolation headers (COOP/COEP) and isn’t available everywhere.

---

## Development: using local Python changes in the browser

By default, the Pyodide worker installs `funcnodes-pyodide` from PyPI via
`micropip`. For local development you typically want to install a wheel
built from your working tree instead.

1. Build a wheel:

```bash
cd funcnodes_pyodide
uv build --wheel
```

2. Copy the wheel into the React dev server `public/` folder (keep the
   original filename, don’t rename it):

```bash
mkdir -p src/react/public/pywheels
cp dist/*.whl src/react/public/pywheels/
```

3. Point `packages` at the served wheel URL:

```js
const wheelUrl = `${
  window.location.origin
}/pywheels/funcnodes_pyodide-<version>-py3-none-any.whl?t=${Date.now()}`;
window.FuncNodes.FuncnodesPyodide("root", { packages: [wheelUrl] });
```

Notes:

- `micropip` downloads via `http(s)`; a plain `/pywheels/...` path may be
  interpreted as a non-remote URL depending on where it’s constructed.
- This repo’s JS worker code normalizes common relative/absolute paths to
  absolute URLs before sending them to the worker.

---

## Development (building + tests)

### Python (package + tests)

```bash
git clone https://github.com/Linkdlab/funcnodes_pyodide
cd funcnodes_pyodide
UV_CACHE_DIR=.cache/uv uv sync --group dev
FUNCNODES_CONFIG_DIR=.funcnodes uv run pytest
```

### JS/TS (worker + UI bundle)

```bash
cd funcnodes_pyodide/src/react
yarn install
yarn watch
yarn test
yarn build
```

`yarn build` writes a production browser bundle into `src/funcnodes_pyodide/static/`
(see `vite.browser.config.js`), which is what `python -m funcnodes_pyodide` serves.

---

## License

- Python package `funcnodes-pyodide`: **AGPL-3.0**
- JS package `@linkdlab/funcnodes_pyodide_react_flow`: **MIT**
