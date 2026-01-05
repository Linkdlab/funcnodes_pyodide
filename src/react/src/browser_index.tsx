declare global {
  interface Window {
    FuncNodes: any;
  }
}

import * as React from "react";
import { createRoot } from "react-dom/client";
import FuncnodesPyodideWorker, {
  FuncnodesPyodideWorkerProps,
} from "./pyodineworker";
import {
  FuncNodes,
  FuncnodesReactFlowProps,
  WorkerProps,
} from "@linkdlab/funcnodes_react_flow";
import "@linkdlab/funcnodes_react_flow/dist/funcnodes_react_flow.css";

const FuncNodesRenderer = (
  id_or_element: string | HTMLElement,
  options?: Partial<FuncnodesReactFlowProps>
) => {
  if (options === undefined) {
    options = {};
  }

  const { element, ele_id } =
    typeof id_or_element === "string"
      ? {
          element: document.getElementById(id_or_element) as HTMLElement,
          ele_id: id_or_element,
        }
      : { element: id_or_element, ele_id: id_or_element.id };

  const content = <FuncNodes {...options} id={options.id || ele_id} />;

  const root = createRoot(element);
  root.render(content);
  return {
    root,
    content,
  };
};

const FuncnodesPyodide = (
  id_or_element: string | HTMLElement,
  data: FuncnodesPyodideWorkerProps & WorkerProps
) => {
  if (data.shared_worker) {
    data.shared_worker = true;
  } else {
    data.shared_worker = false;
  }

  if (!data.uuid) {
    const ele_id =
      typeof id_or_element === "string" ? id_or_element : id_or_element.id;

    if (ele_id !== undefined) {
      data.uuid = ele_id;
    }
  }

  const worker = new FuncnodesPyodideWorker(data);

  window.FuncNodes(id_or_element, {
    useWorkerManager: false,
    worker: worker,
  });
};

window.FuncNodes = FuncNodesRenderer;
window.FuncNodes.FuncnodesPyodideWorker = FuncnodesPyodideWorker;

window.FuncNodes.FuncnodesPyodide = FuncnodesPyodide;

export default FuncNodesRenderer;
