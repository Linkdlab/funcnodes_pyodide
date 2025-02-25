import gself, { ExtendetWorkerGlobalScope } from "./pyodideWorkerLayout.mjs";

const globaleSlf = gself as ExtendetWorkerGlobalScope;

globaleSlf.init_dedicated_worker({});
