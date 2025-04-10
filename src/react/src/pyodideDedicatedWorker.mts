import gself, {
  ExtendetDedicatedWorkerGlobalScope,
} from "./pyodideWorkerLayout.mjs";

const globaleSlf = gself as ExtendetDedicatedWorkerGlobalScope;

globaleSlf.init_dedicated_worker({});
