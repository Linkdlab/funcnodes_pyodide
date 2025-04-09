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
import FuncNodes, {
  FuncnodesReactFlowProps,
  WorkerProps,
} from "@linkdlab/funcnodes_react_flow";
import "@linkdlab/funcnodes_react_flow/dist/style.css";

const FuncNodesRenderer = (
  id_or_element: string | HTMLElement,
  options?: Partial<FuncnodesReactFlowProps>
) => {
  if (options === undefined) {
    options = {};
  }

  const { element, eleid } =
    typeof id_or_element === "string"
      ? {
          element: document.getElementById(id_or_element) as HTMLElement,
          eleid: id_or_element,
        }
      : { element: id_or_element, eleid: id_or_element.id };

  const content = <FuncNodes {...options} id={options.id || eleid} />;

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
    const eleid =
      typeof id_or_element === "string" ? id_or_element : id_or_element.id;

    if (eleid !== undefined) {
      data.uuid = eleid;
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
