import gself, {
  DedicatedWorkerInitParams,
  ExtendetDedicatedWorkerGlobalScope,
  SharedWorkerInitParams,
  ExtendetSharedWorkerGlobalScope,
} from "./pyodideWorkerLayout.mjs";
export * from "./pyodideWorkerLayout.mjs";
export * from "./pyodideWorkerLogic.mjs";

const initDedicatedWorker = (params: DedicatedWorkerInitParams) => {
  const globaleSlf = gself as ExtendetDedicatedWorkerGlobalScope;
  globaleSlf.init_dedicated_worker(params);
};

const initSharedWorker = (params: SharedWorkerInitParams) => {
  const globaleSlf = gself as unknown as ExtendetSharedWorkerGlobalScope;
  globaleSlf.init_shared_worker(params);
};

export {gself, initDedicatedWorker, initSharedWorker };

//export all export   from pyodideWorkerLogic
