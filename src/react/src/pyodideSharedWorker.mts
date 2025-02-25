import gself, {
  ExtendetSharedWorkerGlobalScope,
} from "./pyodideWorkerLayout.mjs";

const globaleSlf = gself as unknown as ExtendetSharedWorkerGlobalScope;

globaleSlf.init_shared_worker({});
