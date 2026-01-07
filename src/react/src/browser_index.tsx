import FuncnodesPyodideWorker, {
  FuncnodesPyodideWorkerProps,
} from "./pyodineworker";
import {
  FuncnodesReactFlowProps,
  FuncNodesRenderer,
} from "@linkdlab/funcnodes_react_flow";
import "@linkdlab/funcnodes_react_flow/dist/funcnodes_react_flow.css";

declare global {
  interface Window {
    FuncNodes: typeof FuncNodesRenderer;
  }
}

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

  if (!data.uuid) {
    const ele_id =
      typeof id_or_element === "string" ? id_or_element : id_or_element.id;

    if (ele_id !== undefined) {
      data.uuid = ele_id;
    }
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
  FuncNodesRenderer(id_or_element, fn_props_with_worker);
};

if (!window.FuncNodes) {
  window.FuncNodes = FuncNodesRenderer;
}

(window.FuncNodes as any).FuncnodesPyodideWorker = FuncnodesPyodideWorker;
(window.FuncNodes as any).FuncnodesPyodide = FuncnodesPyodide;

export default FuncnodesPyodide;
