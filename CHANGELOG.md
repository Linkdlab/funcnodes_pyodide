## 2.0.1a0 (2026-01-08)

### Fix

- **react**: prefer inline workers on cross-origin pages
- **react**: fall back to inline workers on cross-origin failure
- **react**: dispose pyodide workers on unmount

## 2.0.0 (2026-01-07)

### BREAKING CHANGE

- Requires pyodide ^0.29.0 and bumps peer deps to
react ^19.2.3 and @linkdlab/funcnodes_react_flow ^2.1.2.
- Requires @linkdlab/funcnodes_react_flow ^2.

### Feat

- **workflows**: add npm publish and test workflows, enable corepack
- **react**: enhance receivepy_bytes to handle PyProxy and ArrayBuffer
- **react**: preload worker export from URL param
- **react**: preload worker export from URL param
- **pyodide**: document project and expose worker package info
- **react**: persist worker state and restore on load

### Fix

- **docs**: update README for funcnodes_pyodide paths and formatting
- **pyodide**: harden worker utilities and modernize asyncio usage
- **react**: support local wheel installs in pyodide worker Normalize package specs to absolute URLs, and skip installing funcnodes-pyodide from PyPI when a funcnodes_pyodide wheel is provided.
- **pyodide**: defer imports to avoid non-emscripten errors

### Refactor

- simplify post-worker initialization and ensure full sync in worker
- **react**: enhance worker export loading and validation
