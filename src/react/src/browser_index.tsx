declare global {
  interface Window {
    FuncNodes: any;
  }
}

import * as React from "react";
import { createRoot } from "react-dom/client";
import FuncnodesPyodideWorker from "./pyodineworker";
import FuncNodes, {
  FuncnodesReactFlowProps,
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

window.FuncNodes = FuncNodesRenderer;
window.FuncNodes.FuncnodesPyodideWorker = FuncnodesPyodideWorker;
export default FuncNodesRenderer;
