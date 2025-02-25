function e(e,r,o,t){return new(o||(o=Promise))((function(i,d){function n(e){try{a(t.next(e))}catch(e){d(e)}}function s(e){try{a(t.throw(e))}catch(e){d(e)}}function a(e){var r;e.done?i(e.value):(r=e.value,r instanceof o?r:new o((function(e){e(r)}))).then(n,s)}a((t=t.apply(e,r||[])).next())}))}"function"==typeof SuppressedError&&SuppressedError;const r=self;r.workerState={pyodide:null,pyodide_url:"https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs",micropip:null,worker:{},pyodideReady:!1,pyodideReadyPromise:null,debug:!1,interruptBuffer:null,receivepy:(e,r)=>{},handel_register:{},post_pyodide_ready:void 0},r.reset=()=>e(void 0,void 0,void 0,(function*(){var e;for(const o in r.list_workers())try{const t=yield r.get_worker(o);t.worker&&t.worker.stop(),null===(e=t.reject_promise)||void 0===e||e.call(t,"Worker reset")}catch(e){}r.workerState.pyodide&&r.interrupt(),r.workerState.pyodide=null,r.workerState.micropip=null,r.workerState.worker={},r.workerState.pyodideReady=!1;try{r.workerState.interruptBuffer=new Uint8Array(new SharedArrayBuffer(1)),r.workerState.interruptBuffer[0]=0}catch(e){}})),r.initializePyodide=()=>e(void 0,void 0,void 0,(function*(){var e,o;if(!r.workerState.pyodide){console.debug("Loading Pyodide..."),yield r.reset(),console.debug("Loading Pyodide module...");const e=yield import(r.workerState.pyodide_url);console.debug("Loading Pyodide instance...");const o=e.loadPyodide,t=r.workerState.pyodide_url.split("/").slice(0,-1).join("/");r.workerState.pyodide=yield o({packages:["micropip"],indexURL:t}),r.workerState.interruptBuffer&&r.workerState.pyodide.setInterruptBuffer(r.workerState.interruptBuffer)}return r.workerState.micropip||(console.debug("Importing micropip..."),r.workerState.micropip=r.workerState.pyodide.pyimport("micropip")),console.debug("Pyodide ready. Installing funcnodes..."),yield r.workerState.micropip.install("funcnodes-pyodide"),console.debug("Importing funcnodes..."),yield r.workerState.pyodide.runPythonAsync("import funcnodes_pyodide"),console.debug("Running post_pyodide_ready..."),yield null===(o=(e=r.workerState).post_pyodide_ready)||void 0===o?void 0:o.call(e,r.workerState),console.debug("Pyodide ready"),r.workerState.pyodideReady=!0,{pyodide:r.workerState.pyodide,micropip:r.workerState.micropip}})),r.interrupt=()=>{r.workerState.interruptBuffer&&(r.workerState.interruptBuffer[0]=1)},r.list_workers=()=>Object.keys(r.workerState.worker),r.get_worker=o=>e(void 0,void 0,void 0,(function*(){if(!o)throw new Error("Worker id is required");if(!r.workerState.worker[o])throw new Error(`Worker with id ${o} not found`);return yield r.workerState.worker[o].make_promise,r.workerState.worker[o]})),r.has_worker=e=>{if(!e)throw new Error("Worker id is required");return!!r.workerState.worker[e]},r.get_or_create_worker=o=>e(void 0,void 0,void 0,(function*(){if(!o)throw new Error("Worker id is required");return r.workerState.worker[o]||(yield r.initializeFuncNodesWorker(o)),r.get_worker(o)})),r.initializeFuncNodesWorker=o=>e(void 0,void 0,void 0,(function*(){try{const{pyodide:t}=yield r.initializePyodide();if(!r.has_worker(o)){r.workerState.worker[o]={worker:null,make_promise:void 0};const i=new Promise(((i,d)=>e(void 0,void 0,void 0,(function*(){r.workerState.worker[o].reject_promise=d,console.debug(`Creating worker (${o})...`);const e=yield t.runPythonAsync(`funcnodes_pyodide.new_worker(debug=${r.workerState.debug?1:0}, uuid="${o}")`);if(console.debug("Worker created:",e),"function"!=typeof e.set_receiver)throw new Error("Worker does not expose a 'set_receiver' method.");e.set_receiver(self),r.workerState.worker[o].worker=e,console.debug("Worker ready"),i(e)}))));r.workerState.worker[o].make_promise=i}return r.get_worker(o)}catch(e){throw console.error("Error during worker initialization:",e),e}})),r.receivepy=(e,o)=>{try{let t={};if("string"==typeof e?t.msg=e:t=e,void 0===t.msg)return;"string"!=typeof t.msg&&(t.msg=JSON.stringify(t.msg)),void 0!==o&&("string"==typeof o?t.worker_id||(t.worker_id=o):t=Object.assign(Object.assign({},o),t));const i=t.worker_id;if(!i)throw new Error(`Worker id not provided in receivepy(${JSON.stringify(t)})`);if(!r.workerState.worker[i])throw new Error(`Worker with id ${i} not found in receivepy(${JSON.stringify(t)})`);r.workerState.receivepy(e,i)}catch(e){return void console.error("Error during receivepy:",e)}},r.startInitialization=({debug:e=!1,receivepy:o,pyodide_url:t,post_pyodide_ready:i})=>(r.workerState.debug=e,r.workerState.pyodide_url=t||"https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs",r.workerState.receivepy=o,r.workerState.pyodideReadyPromise=r.initializePyodide(),r.workerState.post_pyodide_ready=i,r.workerState),r.register_cmd_message=(e,o)=>{if(r.workerState.handel_register[e])throw new Error(`Command ${e} already registered`);r.workerState.handel_register[e]=o},r.register_cmd_message("ping",(r=>e(void 0,void 0,void 0,(function*(){return"pong"})))),r.register_cmd_message("state",(o=>e(void 0,void 0,void 0,(function*(){return{state:{loaded:r.workerState.pyodideReady}}})))),r.register_cmd_message("worker:state",(o=>e(void 0,void 0,void 0,(function*(){return{state:{loaded:!!(yield r.get_or_create_worker(o.worker_id)).worker}}})))),r.register_cmd_message("worker:stop",(o=>e(void 0,void 0,void 0,(function*(){var e;const t=yield r.get_or_create_worker(o.worker_id);return t.worker&&(t.worker.stop(),t.worker=null,null===(e=t.reject_promise)||void 0===e||e.call(t,"Worker stopped")),delete r.workerState.worker[o.worker_id],{state:{loaded:!1}}})))),r.register_cmd_message("worker:send",(o=>e(void 0,void 0,void 0,(function*(){const e=yield r.get_or_create_worker(o.worker_id);if(!e.worker)throw new Error("Worker is not initialized");if("function"!=typeof e.worker.receivejs)throw new Error("Worker does not support receivejs: "+typeof e.worker.receivejs);e.worker.receivejs(o.msg)})))),r.handleMessage=o=>e(void 0,void 0,void 0,(function*(){const e={original:o};o.id&&(e.id=o.id),void 0===o.toJs&&(o.toJs=!0);try{if(o.cmd){const t=o;if(r.workerState.handel_register[t.cmd])return e.result=yield r.workerState.handel_register[t.cmd](t),e;throw new Error("Unknown command: "+t.cmd)}throw new Error("Unknown message format: "+JSON.stringify(o))}catch(r){e.error=r.message}return e})),r.read_url_params=()=>{var e;const r=new URLSearchParams(self.location.search),o="true"===(null===(e=r.get("debug"))||void 0===e?void 0:e.toLowerCase()),t=r.get("pyodide_url")||void 0;return console.log("Debug:",o,"Pyodide URL:",t),{debug:o,pyodide_url:t}};export{r as default};
//# sourceMappingURL=pyodideWorkerLogic.js.map
