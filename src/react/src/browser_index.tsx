import FuncnodesPyodideWorker, {
  FuncnodesPyodideWorkerProps,
} from "./pyodineworker";
import {
  FuncnodesReactFlowProps,
  FuncNodes,
  FuncNodesRenderer,
} from "@linkdlab/funcnodes_react_flow";
import "@linkdlab/funcnodes_react_flow/dist/funcnodes_react_flow.css";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { observeDisconnectByPolling } from "./observeDisconnect";
import { createMountRegistry, type MountRegistry } from "./mountRegistry";

declare global {
  interface Window {
    FuncNodes: typeof FuncNodesRenderer;
  }
}

type FuncnodesPyodideHandle = {
  worker: FuncnodesPyodideWorker;
  dispose: () => void;
};

const getMountRegistry = () => {
  const g = globalThis as any;
  if (!g.__funcnodes_pyodide_mount_registry) {
    g.__funcnodes_pyodide_mount_registry =
      createMountRegistry<HTMLElement, FuncnodesPyodideHandle>();
  }
  return g.__funcnodes_pyodide_mount_registry as MountRegistry<
    HTMLElement,
    FuncnodesPyodideHandle
  >;
};

const resolveElement = (id_or_element: string | HTMLElement): HTMLElement => {
  if (typeof id_or_element !== "string") return id_or_element;
  const el = document.getElementById(id_or_element);
  if (!el) throw new Error(`Element with id '${id_or_element}' not found`);
  return el;
};

const FuncnodesPyodide = (
  id_or_element: string | HTMLElement,
  data: FuncnodesPyodideWorkerProps,
  fn_props: Partial<FuncnodesReactFlowProps> = {}
) => {
  if (data.shared_worker) {
    data.shared_worker = true;
  } else {
    data.shared_worker = false;
  }

  const element = resolveElement(id_or_element);

  if (!data.uuid) {
    const ele_id = element.id;
    if (ele_id) data.uuid = ele_id;
  }

  const worker = new FuncnodesPyodideWorker(data);
  const fn_props_with_worker: Partial<FuncnodesReactFlowProps> = {
    ...fn_props,
    worker: worker,
    useWorkerManager: false,
    id: worker.uuid,
    debug: data.debug || false,
    worker_url: "dummy", // dummy url as the current implementation requires one (will be removed in the next release of funcnodes_react_flow)
  };

  const registry = getMountRegistry();
  let disposed = false;
  let root: Root | undefined;
  let unregister = () => {};
  let stopObserve = () => {};

  const handle: FuncnodesPyodideHandle = {
    worker,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      try {
        stopObserve();
      } catch {}
      try {
        root?.unmount();
      } catch {}
      try {
        worker.dispose?.();
      } catch {}
      try {
        unregister();
      } catch {}
    },
  };

  unregister = registry.register(element, handle);
  root = createRoot(element);
  root.render(
    <React.StrictMode>
      <FuncNodes {...(fn_props_with_worker as any)} />
    </React.StrictMode>
  );
  stopObserve = observeDisconnectByPolling(element, handle.dispose, {
    intervalMs: 250,
  });

  return handle;
};

if (!window.FuncNodes) {
  window.FuncNodes = FuncNodesRenderer;
}

(window.FuncNodes as any).FuncnodesPyodideWorker = FuncnodesPyodideWorker;
(window.FuncNodes as any).FuncnodesPyodide = FuncnodesPyodide;

export default FuncnodesPyodide;
