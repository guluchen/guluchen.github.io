/* EasyQECC Live Web Worker: Rust encode WASM + JS CaDiCaL (cadical-wasm). */

import { Cadical, createModule } from "./vendor/cadical-wasm/index.js";
import init, {
  setSatBridge,
  runSolve,
  cancelSolve,
  parseGraphEl,
} from "./pkg/easyqecc_wasm.js";

let ready = null;
let solver = null;
let cadicalMod = null;
let cancelled = false;
let deadlineMs = null;
let timedOut = false;

function ensureTerminate() {
  if (!solver) return;
  solver.setTerminate(() => {
    if (cancelled) return true;
    if (deadlineMs != null && performance.now() >= deadlineMs) {
      timedOut = true;
      return true;
    }
    return false;
  });
}

function resetSolver() {
  if (solver) {
    try {
      solver.dispose();
    } catch (_) {
      /* ignore */
    }
  }
  solver = new Cadical(cadicalMod, { quiet: 1 });
  ensureTerminate();
  timedOut = false;
  deadlineMs = null;
}

function wireBridge() {
  setSatBridge(
    () => {
      resetSolver();
    },
    (lits) => {
      const arr = [];
      for (let i = 0; i < lits.length; i++) arr.push(lits[i]);
      solver.addClause(arr);
    },
    (assumps) => {
      const opts = {};
      if (assumps && assumps.length) {
        const a = [];
        for (let i = 0; i < assumps.length; i++) a.push(assumps[i]);
        opts.assumptions = a;
      }
      return solver.solve(opts);
    },
    (lit) => solver.value(lit),
    (ms) => {
      timedOut = false;
      deadlineMs = performance.now() + Number(ms);
      ensureTerminate();
    },
    () => {
      deadlineMs = null;
    },
    () => timedOut
  );
}

async function ensureReady() {
  if (ready) return ready;
  ready = (async () => {
    cadicalMod = await createModule({
      locateFile: (file) => {
        if (file.endsWith(".wasm")) {
          return new URL("./vendor/cadical-wasm/cadical.wasm", import.meta.url).href;
        }
        return file;
      },
    });
    await init(new URL("./pkg/easyqecc_wasm_bg.wasm", import.meta.url));
    wireBridge();
  })();
  return ready;
}

self.onmessage = async (ev) => {
  const msg = ev.data || {};
  try {
    if (msg.type === "init") {
      await ensureReady();
      self.postMessage({ type: "ready" });
      return;
    }
    if (msg.type === "cancel") {
      cancelled = true;
      cancelSolve();
      if (solver) {
        try {
          solver.terminate();
        } catch (_) {
          /* ignore */
        }
      }
      return;
    }
    if (msg.type === "parseGraph") {
      await ensureReady();
      const json = parseGraphEl(msg.id || "custom", msg.el || "");
      self.postMessage({ type: "graph", graph: JSON.parse(json) });
      return;
    }
    if (msg.type === "solve") {
      await ensureReady();
      cancelled = false;
      timedOut = false;
      deadlineMs = null;
      const req = msg.request || {};
      runSolve(JSON.stringify(req), (evJson) => {
        let event;
        try {
          event = JSON.parse(evJson);
        } catch (_) {
          event = { type: "error", message: String(evJson) };
        }
        self.postMessage({ type: "event", event });
      });
      self.postMessage({ type: "solveDone" });
      return;
    }
  } catch (e) {
    self.postMessage({
      type: "error",
      message: String(e && e.message ? e.message : e),
    });
  }
};
