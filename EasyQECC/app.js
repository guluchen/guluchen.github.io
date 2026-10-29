/* EasyQECC demo UI — Live (local server) + Static (saved cases). */

const COLORS = {
  bg: "#162028",
  edge: "#4a5c68",
  edgeOrtho: "#9eb4c2",
  edgeDiag: "#b88858",
  edgeUsed: "#e8eef2",
  unused: "#6a7a86",
  data: "#247882",
  ancX: "#2860a0",
  ancZ: "#b47828",
  anc: "#b47828",
  flag: "#2e8c46",
  text: "#e8eef2",
};

const SESSION_KEY = "easyqecc-demo-live-v1";

const state = {
  mode: "live", // live | static
  /** "http" = local `easyqecc serve`; "wasm" = in-browser CaDiCaL. */
  backend: null,
  worker: null,
  workerReady: null,
  /** Bumped to ignore stale worker message listeners (Cancel / re-Run). */
  wasmRunId: 0,
  /** Cached .el text for WASM Live (keyed by preset id). */
  graphEl: {},
  presets: [],
  cases: [],
  /** Currently displayed graph/layout (Live or Static). */
  graph: null,
  layout: null,
  jobId: null,
  jobCursor: 0,
  /**
   * Live session buffer — only Live runs / poll events write here.
   * Static browsing must never mutate this, so switching back restores correctly.
   */
  live: {
    graph: null,
    layout: null,
    stageHead: "Select a chip to begin",
    logHtml: "",
    pcmText: "",
    pcmHint: "Qubits & stabilizers indexed 1…n / 1…m",
    pcmHidden: true,
    presetId: null,
  },
  /** Form values while browsing Static (restored when returning to Live). */
  liveFormSnapshot: null,
  staticCaseId: null,
};

const el = (id) => document.getElementById(id);

function updateRunBadge() {
  el("runBadge").classList.toggle("hidden", !state.jobId);
}

function saveLiveSession() {
  try {
    const payload = {
      jobId: state.jobId,
      jobCursor: state.jobCursor,
      mode: state.mode,
      live: {
        graph: state.live.graph,
        layout: state.live.layout,
        stageHead: state.live.stageHead,
        logHtml: state.live.logHtml,
        pcmText: state.live.pcmText,
        pcmHint: state.live.pcmHint,
        pcmHidden: state.live.pcmHidden,
        presetId: state.live.presetId || el("presetSelect")?.value || null,
      },
      form: {
        runMode: el("runMode")?.value,
        kMin: el("kMin")?.value,
        nFixed: el("nFixed")?.value,
        kFixed: el("kFixed")?.value,
        placeCode: el("placeCode")?.value,
        distanceMode: el("distanceMode")?.value,
        css: el("css")?.checked,
        distinct: el("distinct")?.checked,
        fpa: el("fpa")?.value,
        timeout: el("timeout")?.value,
        saveCase: el("saveCase")?.checked,
        customEl: el("customEl")?.value,
      },
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch (_) {
    /* quota / private mode — ignore */
  }
}

function restoreLiveSession() {
  let raw;
  try {
    raw = sessionStorage.getItem(SESSION_KEY);
  } catch (_) {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function applyRestoredForm(form) {
  if (!form) return;
  if (form.runMode) el("runMode").value = form.runMode;
  if (form.kMin != null) el("kMin").value = form.kMin;
  if (form.nFixed != null) el("nFixed").value = form.nFixed;
  if (form.kFixed != null) el("kFixed").value = form.kFixed;
  if (form.placeCode && [...el("placeCode").options].some((o) => o.value === form.placeCode)) {
    el("placeCode").value = form.placeCode;
  }
  if (form.distanceMode && [...el("distanceMode").options].some((o) => o.value === form.distanceMode)) {
    el("distanceMode").value = form.distanceMode;
  }
  if (form.css != null) el("css").checked = !!form.css;
  if (form.distinct != null) el("distinct").checked = !!form.distinct;
  if (form.fpa != null) el("fpa").value = form.fpa;
  if (form.timeout != null) el("timeout").value = form.timeout;
  if (form.saveCase != null) el("saveCase").checked = !!form.saveCase;
  if (form.customEl != null) el("customEl").value = form.customEl;
  syncTaskParams();
  syncCustomGraphUi();
}

function pcmFieldsFromLayout(layout) {
  if (!layout) {
    return {
      pcmText: "",
      pcmHint: "Qubits & stabilizers indexed 1…n / 1…m",
      pcmHidden: true,
    };
  }
  const rows = stabilizerPauliStrings(layout);
  return {
    // Stabilizers and code qubits both 1-based (matches X1Z2… Pauli strings).
    pcmText: rows.map((s, i) => `S${i + 1}:  ${s}`).join("\n"),
    pcmHint:
      `[[n=${layout.n}, k=${layout.k ?? layout.n - layout.m}, m=${layout.m}]] · qubits & stabilizers 1…${layout.n} / 1…${layout.m}` +
      (layout.css ? " · CSS" : ""),
    pcmHidden: false,
  };
}

/** Push a progress line into the Live buffer; mirror to DOM only in Live mode. */
function liveLog(msg, cls = "info") {
  const line = document.createElement("div");
  line.className = cls;
  line.textContent = msg;
  const wrap = document.createElement("div");
  wrap.innerHTML = state.live.logHtml;
  wrap.appendChild(line);
  state.live.logHtml = wrap.innerHTML;
  if (state.mode === "live") {
    el("log").appendChild(line.cloneNode(true));
    el("log").scrollTop = el("log").scrollHeight;
  }
  saveLiveSession();
}

function clearLiveLog() {
  state.live.logHtml = "";
  if (state.mode === "live") el("log").textContent = "";
  saveLiveSession();
}

function setLiveGraph(graph, stageHead) {
  state.live.graph = graph;
  state.live.layout = null;
  state.live.stageHead = stageHead;
  state.live.presetId = el("presetSelect")?.value || state.live.presetId;
  Object.assign(state.live, pcmFieldsFromLayout(null));
  if (state.mode === "live") applyLiveToDom();
  saveLiveSession();
}

function setLiveLayout(layout) {
  state.live.layout = layout;
  Object.assign(state.live, pcmFieldsFromLayout(layout));
  if (state.mode === "live") {
    state.layout = layout;
    renderPcmDom(layout);
    draw();
  }
  saveLiveSession();
}

function applyLiveToDom() {
  state.graph = state.live.graph;
  state.layout = state.live.layout;
  el("stageHead").textContent = state.live.stageHead;
  el("log").innerHTML = state.live.logHtml;
  el("pcm").textContent = state.live.pcmText;
  el("pcmHint").textContent = state.live.pcmHint;
  el("pcmWrap").classList.toggle("hidden", state.live.pcmHidden);
  el("log").scrollTop = el("log").scrollHeight;
  draw();
}

/** DOM-only log (Static case view). Never touches state.live. */
function viewLog(msg, cls = "info") {
  const box = el("log");
  const line = document.createElement("div");
  line.className = cls;
  line.textContent = msg;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function log(msg, cls = "info") {
  // Default: Live-session log (used by Live controls / poll).
  liveLog(msg, cls);
}

function clearLog() {
  clearLiveLog();
}

/** Compact PCM rows: X1X2, Z1Z3… (1-based code qubit indices). */
function stabilizerPauliStrings(layout) {
  if (!layout) return [];
  if (Array.isArray(layout.stabilizers) && layout.stabilizers.length) {
    return layout.stabilizers;
  }
  const n = layout.n || 0;
  const m = layout.m || 0;
  const map = layout.data_of_qubit || [];
  const out = [];
  for (let i = 0; i < m; i++) {
    let s = "";
    for (let q = 0; q < n; q++) {
      const v = map[q];
      const x = !!(layout.h_x?.[i]?.[v]);
      const z = !!(layout.h_z?.[i]?.[v]);
      const p = x && z ? "Y" : x ? "X" : z ? "Z" : null;
      if (p) s += `${p}${q + 1}`;
    }
    out.push(s || "I");
  }
  return out;
}

function renderPcmDom(layout) {
  const f = pcmFieldsFromLayout(layout);
  el("pcmHint").textContent = f.pcmHint;
  el("pcm").textContent = f.pcmText;
  el("pcmWrap").classList.toggle("hidden", f.pcmHidden);
}

function renderPcm(layout) {
  // Live helper: update Live buffer + DOM when in Live mode.
  Object.assign(state.live, pcmFieldsFromLayout(layout));
  state.live.layout = layout;
  if (state.mode === "live") renderPcmDom(layout);
}

async function fetchJson(url, opts) {
  let r;
  try {
    r = await fetch(url, opts);
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      throw new Error("Lost connection to the demo server. Is `easyqecc serve` still running?");
    }
    throw e;
  }
  if (!r.ok) {
    let detail = r.statusText;
    let body = null;
    try {
      body = await r.json();
      detail = body.error || body.message || detail;
    } catch (_) {}
    const err = new Error(detail);
    err.status = r.status;
    err.body = body;
    throw err;
  }
  return r.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function snapshotLiveForm() {
  return {
    presetId: el("presetSelect").value,
    runMode: el("runMode").value,
    kMin: el("kMin").value,
    nFixed: el("nFixed").value,
    kFixed: el("kFixed").value,
    placeCode: el("placeCode").value,
    distanceMode: el("distanceMode").value,
    css: el("css").checked,
    distinct: el("distinct").checked,
    saveCase: el("saveCase").checked,
    fpa: el("fpa").value,
    timeout: el("timeout").value,
    customEl: el("customEl").value,
  };
}

function applyFormSnapshot(s) {
  if (!s) return;
  if (s.presetId && [...el("presetSelect").options].some((o) => o.value === s.presetId)) {
    el("presetSelect").value = s.presetId;
  }
  el("runMode").value = s.runMode || "search-min-n";
  el("kMin").value = s.kMin ?? "1";
  el("nFixed").value = s.nFixed ?? "7";
  el("kFixed").value = s.kFixed ?? "1";
  if (s.placeCode && [...el("placeCode").options].some((o) => o.value === s.placeCode)) {
    el("placeCode").value = s.placeCode;
  }
  if (s.distanceMode && [...el("distanceMode").options].some((o) => o.value === s.distanceMode)) {
    el("distanceMode").value = s.distanceMode;
  }
  el("css").checked = !!s.css;
  el("distinct").checked = s.distinct !== false;
  el("saveCase").checked = !!s.saveCase;
  el("fpa").value = s.fpa ?? "1";
  el("timeout").value = s.timeout ?? "90";
  if (s.customEl != null) el("customEl").value = s.customEl;
  syncTaskParams();
  syncCustomGraphUi();
}

/** Static: same Live form, but only the saved-case select is interactive. */
function setStaticChrome(on) {
  const body = el("controlsBody");
  body.classList.toggle("is-static", on);
  el("selectLabel").textContent = on ? "Saved case" : "Chip / graph";
  el("presetSelect").classList.toggle("hidden", on);
  el("caseSelect").classList.toggle("hidden", !on);
  el("staticCaseHint").classList.toggle("hidden", !on);
  el("liveActions").classList.toggle("hidden", on);
  el("customGraphWrap").classList.add("hidden");
  if (on) el("saveCaseLabel").classList.add("hidden");
  else syncSaveCaseUi();

  const lockIds = [
    "runMode",
    "kMin",
    "nFixed",
    "kFixed",
    "placeCode",
    "distanceMode",
    "css",
    "distinct",
    "saveCase",
    "fpa",
    "timeout",
    "runBtn",
    "cancelBtn",
    "previewCustomBtn",
    "customEl",
  ];
  for (const id of lockIds) {
    const node = el(id);
    if (!node) continue;
    // Leaving Static must not re-enable Run while a Live job is still running
    // (or stuck); that was making Run clickable again after Static ↔ Live.
    if (!on && id === "runBtn" && state.jobId) {
      node.disabled = true;
      continue;
    }
    node.disabled = on;
  }
  el("caseSelect").disabled = false;
  if (!on) syncCustomGraphUi();
}

function caseOptionLabel(c) {
  const st = c.status || "found";
  if (st === "found") return c.id;
  if (st === "timeout") return `${c.id}  ·  not found within limit`;
  // Proven absence (unsat / impossible params) — same demo wording.
  return `${c.id}  ·  no compatible layout`;
}

/** Prefer current Live chip + a successful run when opening Static. */
function pickDefaultStaticCaseId() {
  if (state.staticCaseId && state.cases.some((c) => c.id === state.staticCaseId)) {
    return state.staticCaseId;
  }
  const chip =
    state.liveFormSnapshot?.presetId ||
    state.live?.presetId ||
    el("presetSelect")?.value ||
    "";
  const forChip = chip ? state.cases.filter((c) => c.graph === chip) : [];
  const pool = forChip.length ? forChip : state.cases;
  const found = pool.find((c) => (c.status || "found") === "found");
  if (found) return found.id;
  return pool[0]?.id || "";
}

function fillCaseSelect() {
  const sel = el("caseSelect");
  const prev = pickDefaultStaticCaseId() || sel.value;
  sel.innerHTML = "";
  if (!state.cases.length) {
    const o = document.createElement("option");
    o.value = "";
    o.textContent = "No saved cases yet";
    sel.appendChild(o);
    return;
  }
  for (const c of state.cases) {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = caseOptionLabel(c);
    o.dataset.status = c.status || "found";
    sel.appendChild(o);
  }
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
  else sel.selectedIndex = 0;
}

function applyCaseParamsToForm(doc) {
  const p = doc.params || {};
  const id = doc.id || "";
  if (id.includes("place") || p.matrix || p.mode === "place") {
    el("runMode").value = "place";
    const matrix =
      p.matrix ||
      (id.includes("five-qubit")
        ? "examples/matrices/five-qubit.pcm"
        : id.includes("steane")
          ? "examples/matrices/steane-7-1-3.pcm"
          : id.includes("surface")
            ? "examples/matrices/surface-9-1-3.pcm"
            : null);
    if (matrix && [...el("placeCode").options].some((o) => o.value === matrix)) {
      el("placeCode").value = matrix;
    }
  } else if (p.mode === "search-min-n" || p.search_order === "min-n") {
    const k = Number(p.k_min) || 1;
    el("runMode").value = k === 2 ? "search-min-n-k2" : "search-min-n";
  } else if (p.k_min != null && p.n == null) {
    el("runMode").value = "search";
    el("kMin").value = String(p.k_min);
  } else if (p.n != null) {
    el("runMode").value = "fixed";
    el("nFixed").value = String(p.n);
    const k = p.k != null ? p.k : p.m != null ? p.n - p.m : 1;
    el("kFixed").value = String(k);
  } else if (p.k_min != null) {
    el("runMode").value = "search";
    el("kMin").value = String(p.k_min);
  }
  el("css").checked = !!p.css;
  if ("distinct_ancilla" in p) el("distinct").checked = !!p.distinct_ancilla;
  el("fpa").value = String(p.flags_per_ancilla ?? 0);
  if (p.timeout != null) el("timeout").value = String(p.timeout);
  const dm = normalizeDistanceMode(p.distance_mode || p.distanceMode);
  if (dm) el("distanceMode").value = dm;
  syncTaskParams();
}

function normalizeDistanceMode(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s === "cegar" || s === "lazy") return "cegar";
  if (s === "exact" || s === "eager") return "exact";
  if (s === "strict" || s === "detect-all" || s === "detect_all" || s === "detectall") return "strict";
  return null;
}

function setMode(mode) {
  if (mode === state.mode) return;

  state.mode = mode;
  el("modeLive").classList.toggle("active", mode === "live");
  el("modeStatic").classList.toggle("active", mode === "static");

  if (mode === "static") {
    state.liveFormSnapshot = snapshotLiveForm();
    setStaticChrome(true);
    el("modeHint").textContent = state.jobId
      ? "Browsing saved cases — Live search keeps running in the background."
      : "Browse saved runs; settings mirror the case and stay read-only.";
    refreshCatalog().then(async () => {
      fillCaseSelect();
      const id = el("caseSelect").value;
      if (id) await loadCase(id);
      else {
        el("log").textContent = "";
        viewLog("No saved cases yet. Run Live with “Save result” checked.", "info");
        state.graph = null;
        state.layout = null;
        renderPcmDom(null);
        draw();
      }
    });
  } else {
    setStaticChrome(false);
    applyFormSnapshot(state.liveFormSnapshot);
    state.liveFormSnapshot = null;
    applyLiveToDom();
    el("modeHint").textContent = state.jobId
      ? "Live search still running — progress continues below."
      : liveHintForBackend();
    syncSaveCaseUi();
  }
  updateRunBadge();
  saveLiveSession();
}

function syncTaskParams() {
  const mode = el("runMode").value;
  const minN = mode === "search-min-n" || mode === "search-min-n-k2";
  el("searchParams").classList.toggle("hidden", mode !== "search");
  el("searchMinNHint").classList.toggle("hidden", !minN);
  if (minN) {
    const k = mode === "search-min-n-k2" ? 2 : 1;
    el("searchMinNHint").textContent =
      `Tries [[n,${k},d≥3]] with n = ${k + 1}, ${k + 2}, … until a layout fits.`;
  }
  el("fixedParams").classList.toggle("hidden", mode !== "fixed");
  el("placeParams").classList.toggle("hidden", mode !== "place");
  el("distanceParams").classList.toggle("hidden", mode === "place");
}

function fillPresetSelect() {
  const sel = el("presetSelect");
  const prev = sel.value;
  sel.innerHTML = "";
  const groups = { vendor: "Vendor (superconducting)", local: "Local lattices" };
  for (const g of ["vendor", "local"]) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = groups[g];
    for (const p of state.presets.filter((x) => x.group === g)) {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = `${p.label}  (${p.n_qubits}q)`;
      optgroup.appendChild(o);
    }
    if (optgroup.childElementCount) sel.appendChild(optgroup);
  }
  const customOpt = document.createElement("option");
  customOpt.value = "custom";
  customOpt.textContent = "Custom edge list…";
  sel.appendChild(customOpt);
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
  syncCustomGraphUi();
}

function liveHintForBackend() {
  if (state.backend === "http") {
    return "Runs synthesis on this machine via the local demo server (native CaDiCaL).";
  }
  return "Runs synthesis in the browser (CaDiCaL WASM). Large chips may be slow — use Static for saved runs.";
}

function syncSaveCaseUi() {
  const label = el("saveCaseLabel");
  if (!label) return;
  // Pages / WASM has no write API.
  const hide = state.backend === "wasm" || state.mode === "static";
  label.classList.toggle("hidden", hide);
  if (state.backend === "wasm") el("saveCase").checked = false;
}

/** Probe local `serve` quickly; fall back to static/WASM on Pages. */
async function probeHttpPresets() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 900);
  try {
    const r = await fetch("/api/presets", { signal: ctrl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch presets + cases; never auto-loads a graph (avoids clobbering Live). */
async function refreshCatalog() {
  try {
    const data = await probeHttpPresets();
    state.presets = data.presets || [];
    state.cases = data.cases || [];
    state.backend = "http";
  } catch (_) {
    state.backend = "wasm";
    try {
      const data = await fetchJson("presets.json");
      state.presets = data.presets || [];
    } catch (e) {
      liveLog("Could not load presets.", "bad");
      return;
    }
    try {
      const idx = await fetchJson("cases/index.json").catch(() => ({ cases: [] }));
      state.cases = idx.cases || [];
    } catch (_) {
      state.cases = [];
    }
  }
  fillPresetSelect();
  if (state.mode === "static") fillCaseSelect();
  syncSaveCaseUi();
  if (state.mode === "live") el("modeHint").textContent = liveHintForBackend();
}

async function loadPresets() {
  await refreshCatalog();
  const hasSession =
    state.live.graph || state.live.logHtml || state.jobId || state.live.layout;
  if (state.mode === "live" && state.presets.length && !hasSession) {
    await loadGraph(state.presets[0].id);
  }
}

function syncCustomGraphUi() {
  const custom = el("presetSelect").value === "custom";
  el("customGraphWrap").classList.toggle("hidden", !custom);
}

function ensureWorker() {
  if (state.worker) return state.worker;
  state.worker = new Worker(new URL("worker.js", window.location.href), {
    type: "module",
  });
  return state.worker;
}

function workerReady() {
  if (state.workerReady) return state.workerReady;
  const w = ensureWorker();
  state.workerReady = new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      if (ev.data && ev.data.type === "ready") {
        w.removeEventListener("message", onMsg);
        resolve();
      } else if (ev.data && ev.data.type === "error") {
        w.removeEventListener("message", onMsg);
        reject(new Error(ev.data.message || "worker init failed"));
      }
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ type: "init" });
  });
  return state.workerReady;
}

function workerParseGraph(id, elText) {
  const w = ensureWorker();
  return workerReady().then(
    () =>
      new Promise((resolve, reject) => {
        const onMsg = (ev) => {
          const msg = ev.data || {};
          if (msg.type === "graph") {
            w.removeEventListener("message", onMsg);
            resolve(msg.graph);
          } else if (msg.type === "error") {
            w.removeEventListener("message", onMsg);
            reject(new Error(msg.message || "parse failed"));
          }
        };
        w.addEventListener("message", onMsg);
        w.postMessage({ type: "parseGraph", id, el: elText });
      })
  );
}

async function previewCustomGraph() {
  const text = el("customEl").value;
  if (!text.trim()) {
    liveLog("Paste an edge list first.", "bad");
    return;
  }
  try {
    let g;
    if (state.backend === "http") {
      g = await fetchJson("/api/graphs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ el: text }),
      });
    } else {
      g = await workerParseGraph("custom", text);
    }
    state.graphEl.custom = text;
    const head =
      `${g.name || "custom"}  ·  ${g.n_vertices} qubits  ·  ${g.edges.length} couplers`;
    setLiveGraph(g, head);
    liveLog(`Loaded custom graph: ${g.n_vertices} qubits, ${g.edges.length} couplers.`, "ok");
  } catch (e) {
    liveLog(String(e.message || e), "bad");
  }
}

async function loadGraph(id) {
  if (id === "custom") {
    syncCustomGraphUi();
    if (el("customEl").value.trim()) {
      await previewCustomGraph();
    } else {
      setLiveGraph(null, "Paste a custom edge list and Preview");
    }
    return;
  }
  syncCustomGraphUi();
  let g;
  try {
    if (state.backend === "http") {
      g = await fetchJson(`/api/graphs/${id}`);
    } else {
      throw new Error("use static");
    }
  } catch (_) {
    g = await fetchJson(`graphs/${id}.json`);
  }
  if (g.el) state.graphEl[id] = g.el;
  else if (!state.graphEl[id]) {
    try {
      state.graphEl[id] = await fetch(`graphs/${id}.el`).then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.text();
      });
    } catch (_) {
      /* place/search may still work if UI injects el another way */
    }
  }
  setLiveGraph(
    g,
    `${g.name || id}  ·  ${g.n_vertices} qubits  ·  ${g.edges.length} couplers`
  );
}

async function loadCase(id) {
  if (!id) return;
  state.staticCaseId = id;
  if (el("caseSelect").value !== id) el("caseSelect").value = id;
  // Static view only — never write into state.live.
  el("log").textContent = "";
  let doc;
  try {
    doc = await fetchJson(`/api/cases/${id}`);
  } catch (_) {
    doc = await fetchJson(`cases/${id}.json`);
  }
  applyCaseParamsToForm(doc);
  const st = doc.status || (doc.layout ? "found" : "none");
  const fallback =
    st === "found"
      ? "Layout found"
      : st === "timeout"
        ? "Not found within the resource limit"
        : "No compatible layout exists for these parameters";
  viewLog(doc.message || fallback, st === "found" ? "ok" : "bad");
  if (doc.params) {
    const bits = [];
    if (doc.params.n != null) bits.push(`n=${doc.params.n}`);
    if (doc.params.m != null) bits.push(`m=${doc.params.m}`);
    if (doc.params.k_min != null) bits.push(`k_min=${doc.params.k_min}`);
    if (doc.params.css) bits.push("css");
    if (doc.params.distinct_ancilla) bits.push("distinct-ancilla");
    if (doc.params.flags_per_ancilla) bits.push(`flags/ancilla=${doc.params.flags_per_ancilla}`);
    if (doc.params.timeout) bits.push(`timeout=${doc.params.timeout}s`);
    if (bits.length) viewLog(bits.join("  "), "info");
  }
  // Do not dump raw solver logs (they leak SAT jargon). Message above is enough.
  if (doc.graph) {
    try {
      let g;
      try {
        g = await fetchJson(`/api/graphs/${doc.graph}`);
      } catch (_) {
        g = await fetchJson(`graphs/${doc.graph}.json`);
      }
      state.graph = g;
      const tag = st === "found" ? "case" : st;
      el("stageHead").textContent =
        `${g.name || doc.graph}  ·  ${g.n_vertices} qubits  ·  ${g.edges.length} couplers  ·  ${tag} ${id}`;
    } catch (e) {
      viewLog(String(e.message || e), "bad");
    }
  }
  state.layout = doc.layout || null;
  renderPcmDom(state.layout);
  draw();
}

function roleOfVertex(layout, v) {
  if (!layout) return { kind: "unused", label: String(v) };
  const q = (layout.data_of_qubit || []).indexOf(v);
  // Display indices are 1-based (same as PCM Pauli strings).
  if (q >= 0) return { kind: "data", label: `q${q + 1}` };
  for (let i = 0; i < (layout.flags_of_stab || []).length; i++) {
    if ((layout.flags_of_stab[i] || []).includes(v)) {
      return { kind: "flag", label: `F${i + 1}` };
    }
  }
  const stabs = [];
  (layout.ancilla_of_stab || []).forEach((a, i) => {
    if (a === v) stabs.push(i + 1);
  });
  if (stabs.length) {
    if (layout.css) {
      // Infer X/Z from h_x / h_z rows (internal 0-based index = label - 1).
      const types = stabs.map((lab) => {
        const i = lab - 1;
        const hx = (layout.h_x[i] || []).some(Boolean);
        const hz = (layout.h_z[i] || []).some(Boolean);
        if (hx && !hz) return "X";
        if (hz && !hx) return "Z";
        return "A";
      });
      const uniq = [...new Set(types)];
      if (uniq.length === 1 && uniq[0] === "X") return { kind: "ancX", label: `X${stabs.join(",")}` };
      if (uniq.length === 1 && uniq[0] === "Z") return { kind: "ancZ", label: `Z${stabs.join(",")}` };
    }
    return { kind: "anc", label: `A${stabs.join(",")}` };
  }
  return { kind: "unused", label: "·" };
}

function usedEdges(layout) {
  const set = new Set();
  if (!layout) return set;
  const add = (a, b) => {
    const u = Math.min(a, b);
    const v = Math.max(a, b);
    set.add(`${u}-${v}`);
  };
  for (let i = 0; i < layout.m; i++) {
    const a = layout.ancilla_of_stab[i];
    for (let v = 0; v < layout.data.length; v++) {
      if ((layout.h_x[i] && layout.h_x[i][v]) || (layout.h_z[i] && layout.h_z[i][v])) {
        add(a, v);
      }
    }
    for (const f of layout.flags_of_stab[i] || []) add(a, f);
  }
  return set;
}

/** Classify coupler as orthogonal grid / diagonal / other from layout coords. */
function edgeKind(coords, ia, ib) {
  const [x0, y0] = coords[ia];
  const [x1, y1] = coords[ib];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const eps = 1e-3;
  if (Math.abs(dx) < eps && dy > eps) return "ortho";
  if (Math.abs(dy) < eps && dx > eps) return "ortho";
  if (Math.abs(dx - dy) < eps && dx > eps) return "diag";
  // integer lattice neighbors (step 1)
  if (Math.abs(dx - 1) < eps && Math.abs(dy) < eps) return "ortho";
  if (Math.abs(dy - 1) < eps && Math.abs(dx) < eps) return "ortho";
  if (Math.abs(dx - 1) < eps && Math.abs(dy - 1) < eps) return "diag";
  return "other";
}

function draw() {
  const canvas = el("graphCanvas");
  const ctx = canvas.getContext("2d");
  const g = state.graph;

  // Size stage before measuring — Eagle / large chips need more vertical room.
  const stage = canvas.parentElement;
  if (stage && g && g.n_vertices > 60) {
    stage.style.minHeight = "560px";
    canvas.style.minHeight = "520px";
  } else if (stage) {
    stage.style.minHeight = "";
    canvas.style.minHeight = "";
  }

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 900;
  const h = canvas.clientHeight || 640;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, w, h);

  if (!g) return;

  let coords = g.coords;
  if (!coords || coords.length !== g.n_vertices) {
    coords = [];
    for (let i = 0; i < g.n_vertices; i++) {
      const ang = (Math.PI * 2 * i) / Math.max(g.n_vertices, 1) - Math.PI / 2;
      coords.push([Math.cos(ang), Math.sin(ang)]);
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const pad = g.n_vertices > 60 ? 28 : 36;
  const sx = (w - 2 * pad) / Math.max(maxX - minX, 1e-6);
  const sy = (h - 2 * pad) / Math.max(maxY - minY, 1e-6);
  const s = Math.min(sx, sy);
  const map = ([x, y]) => [
    pad + (x - minX) * s + ((w - 2 * pad) - (maxX - minX) * s) / 2,
    pad + (y - minY) * s + ((h - 2 * pad) - (maxY - minY) * s) / 2,
  ];

  const idToIndex = {};
  g.vertices.forEach((id, i) => { idToIndex[id] = i; });
  const used = usedEdges(state.layout);
  const large = g.n_vertices > 60;

  // Draw diagonals first (under), then orthogonal grid on top.
  const classified = [];
  for (const [a, b] of g.edges) {
    const ia = idToIndex[a];
    const ib = idToIndex[b];
    if (ia == null || ib == null) continue;
    classified.push({ ia, ib, kind: edgeKind(coords, ia, ib) });
  }
  const order = { diag: 0, other: 1, ortho: 2 };
  classified.sort((u, v) => order[u.kind] - order[v.kind]);

  for (const { ia, ib, kind } of classified) {
    const [x0, y0] = map(coords[ia]);
    const [x1, y1] = map(coords[ib]);
    const key = `${Math.min(ia, ib)}-${Math.max(ia, ib)}`;
    const isUsed = used.has(key);
    if (isUsed) {
      ctx.strokeStyle = COLORS.edgeUsed;
      ctx.lineWidth = large ? 1.6 : 2.4;
    } else if (kind === "diag") {
      ctx.strokeStyle = COLORS.edgeDiag;
      ctx.lineWidth = large ? 1.1 : 1.8;
    } else if (kind === "ortho") {
      ctx.strokeStyle = COLORS.edgeOrtho;
      ctx.lineWidth = large ? 1.2 : 2.0;
    } else {
      ctx.strokeStyle = COLORS.edge;
      ctx.lineWidth = large ? 1.0 : 1.4;
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  const r = large
    ? Math.max(3.5, Math.min(7, 90 / Math.sqrt(g.n_vertices)))
    : Math.max(8, Math.min(16, 220 / Math.sqrt(g.n_vertices)));
  const showLabels = !large && (!state.layout || g.n_vertices <= 40);

  for (let i = 0; i < g.n_vertices; i++) {
    const [x, y] = map(coords[i]);
    const role = roleOfVertex(state.layout, i);
    const fill =
      role.kind === "data" ? COLORS.data :
      role.kind === "flag" ? COLORS.flag :
      role.kind === "ancX" ? COLORS.ancX :
      role.kind === "ancZ" ? COLORS.ancZ :
      role.kind === "anc" ? COLORS.anc :
      COLORS.unused;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = COLORS.edgeUsed;
    ctx.lineWidth = large ? 0.6 : 1;
    ctx.stroke();
    if (showLabels || (state.layout && role.kind !== "unused")) {
      const label = large && role.kind === "unused" ? "" : role.label;
      if (!label) continue;
      ctx.fillStyle = role.kind === "unused" ? "#0e1419" : COLORS.text;
      ctx.font = `${Math.max(large ? 7 : 9, r * 0.7)}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y);
    }
  }

  // Compact legend for grid+diag readability
  if (classified.some((e) => e.kind === "diag")) {
    const lx = 16;
    let ly = h - 28;
    ctx.font = `12px "IBM Plex Sans", sans-serif`;
    ctx.strokeStyle = COLORS.edgeOrtho;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 22, ly); ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "left";
    ctx.fillText("grid", lx + 28, ly);
    ctx.strokeStyle = COLORS.edgeDiag;
    ctx.beginPath(); ctx.moveTo(lx + 70, ly); ctx.lineTo(lx + 92, ly); ctx.stroke();
    ctx.fillText("diagonal", lx + 98, ly);
  }
}

async function runLiveWasm(body) {
  const w = ensureWorker();
  await workerReady();
  // Invalidate any prior listeners left behind by Cancel / a stuck solve.
  state.wasmRunId += 1;
  const runId = state.wasmRunId;
  state.jobId = "wasm";
  state.jobCursor = 0;
  updateRunBadge();
  saveLiveSession();
  await new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      if (runId !== state.wasmRunId) return;
      const msg = ev.data || {};
      if (msg.type === "event" && msg.event) {
        handleEvent(msg.event);
        return;
      }
      if (msg.type === "solveDone") {
        w.removeEventListener("message", onMsg);
        if (runId === state.wasmRunId) resolve();
        return;
      }
      if (msg.type === "error") {
        w.removeEventListener("message", onMsg);
        if (runId === state.wasmRunId) {
          reject(new Error(msg.message || "wasm solve failed"));
        }
      }
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ type: "solve", request: body });
  });
}

async function runLive() {
  if (state.mode !== "live") setMode("live");
  clearLiveLog();
  state.live.layout = null;
  Object.assign(state.live, pcmFieldsFromLayout(null));
  state.layout = null;
  renderPcmDom(null);
  draw();
  const graphId = el("presetSelect").value;
  const body = {
    graph: graphId,
    mode: el("runMode").value,
    distance_mode: el("distanceMode").value || "cegar",
    css: el("css").checked,
    distinct_ancilla: el("distinct").checked,
    flags_per_ancilla: Math.max(0, Math.floor(Number(el("fpa").value) || 0)),
    timeout_secs: Number(el("timeout").value) || 90,
    save_case: state.backend === "http" && el("saveCase").checked,
  };
  if (graphId === "custom") {
    const text = el("customEl").value;
    if (!text.trim()) {
      log("Paste a custom edge list first.", "bad");
      return;
    }
    body.el = text;
  }
  if (body.mode === "search") body.k_min = Number(el("kMin").value) || 1;
  if (body.mode === "search-min-n") {
    body.k_min = 1;
  } else if (body.mode === "search-min-n-k2") {
    body.mode = "search-min-n";
    body.k_min = 2;
  }
  if (body.mode === "fixed") {
    body.n = Number(el("nFixed").value);
    body.k = Number(el("kFixed").value);
  }
  if (body.mode === "place") {
    body.matrix = el("placeCode").value || "examples/matrices/five-qubit.pcm";
  }

  el("runBtn").disabled = true;
  log("Starting…", "info");
  try {
    if (graphId === "custom") {
      await previewCustomGraph();
    } else {
      await loadGraph(graphId);
    }
    if (state.backend !== "http") {
      if (!body.el) {
        body.el = state.graphEl[graphId];
        if (!body.el) {
          throw new Error(
            `Missing edge list for ${graphId}. Rebuild demo graphs (scripts/export_demo_graphs.sh).`
          );
        }
      }
      const nq = state.graph && state.graph.n_vertices;
      if (
        nq &&
        nq >= 50 &&
        (body.mode === "search" || body.mode === "search-min-n")
      ) {
        liveLog(
          `Warning: ${nq}-qubit search in-browser can be slow; Static cases may be faster.`,
          "info"
        );
      }
      await runLiveWasm(body);
    } else {
      const { job_id } = await fetchJson("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      state.jobId = job_id;
      state.jobCursor = 0;
      updateRunBadge();
      saveLiveSession();
      await pollJob(job_id, 0);
    }
  } catch (e) {
    liveLog(String(e.message || e), "bad");
  } finally {
    el("runBtn").disabled = false;
    state.jobId = null;
    state.jobCursor = 0;
    updateRunBadge();
    saveLiveSession();
    if (state.mode === "live") {
      el("modeHint").textContent = liveHintForBackend();
    } else {
      el("modeHint").textContent =
        "Browse saved runs; settings mirror the case and stay read-only.";
      refreshCatalog().then(() => fillCaseSelect());
    }
  }
}

async function pollJob(jobId, startCursor = 0) {
  let cursor = startCursor;
  let gaps = 0;
  state.jobCursor = cursor;
  saveLiveSession();
  for (;;) {
    let data;
    try {
      data = await fetchJson(`/api/jobs/${jobId}/events?cursor=${cursor}`);
      gaps = 0;
    } catch (e) {
      // Transient disconnects during long search: retry a few times instead of dumping
      // the raw browser "Failed to fetch" into Progress.
      if (e.status === 404 && e.body && e.body.done) {
        for (const ev of e.body.events || []) handleEvent(ev);
        if (!(e.body.events || []).length) {
          liveLog(e.message || "Search interrupted.", "bad");
        }
        state.jobId = null;
        state.jobCursor = 0;
        updateRunBadge();
        saveLiveSession();
        return;
      }
      gaps += 1;
      if (gaps > 8) {
        liveLog(e.message || "Lost connection to the demo server.", "bad");
        saveLiveSession();
        return;
      }
      await sleep(Math.min(1000 * gaps, 4000));
      continue;
    }
    // Replay: skip events already shown (cursor advanced), but on fresh resume
    // startCursor may be mid-stream — only append new ones from this response.
    for (const ev of data.events || []) {
      handleEvent(ev);
    }
    cursor = data.cursor;
    state.jobCursor = cursor;
    saveLiveSession();
    if (data.done || state._cancelSeen) {
      state._cancelSeen = false;
      break;
    }
    // Another cancel cleared jobId — stop polling this job.
    if (state.jobId !== jobId) break;
  }
  state.jobId = null;
  state.jobCursor = 0;
  updateRunBadge();
  saveLiveSession();
}

function handleEvent(ev) {
  // Always update the Live buffer; DOM mirrors only when mode === "live".
  if (ev.type === "status" || ev.type === "attempt") {
    liveLog(ev.message || JSON.stringify(ev), ev.status === "found" ? "ok" : "info");
  } else if (ev.type === "done") {
    const cls = ev.status === "found" ? "ok" : "bad";
    liveLog(ev.message || "Done", cls);
    if (ev.layout) {
      setLiveLayout(ev.layout);
      const rows = stabilizerPauliStrings(ev.layout);
      if (rows.length) {
        liveLog("Parity checks:", "info");
        for (let i = 0; i < rows.length; i++) liveLog(`  S${i + 1}: ${rows[i]}`, "ok");
      }
    } else {
      setLiveLayout(null);
    }
    if (ev.status === "found" && el("saveCase").checked) {
      liveLog("Saved into Static cases (if server write succeeded).", "ok");
      refreshCatalog().then(() => {
        if (state.mode === "static") fillCaseSelect();
      });
    }
    if (state.mode !== "live") {
      el("modeHint").textContent =
        "Live search finished — switch back to Live to see the result.";
    }
  } else if (ev.type === "cancelled") {
    liveLog(ev.message || "Cancelled", "bad");
    state._cancelSeen = true;
  } else if (ev.type === "error") {
    liveLog(ev.message || "Error", "bad");
  }
}

async function cancelJob() {
  const id = state.jobId;
  liveLog("Cancelling…", "info");
  if (state.backend === "wasm" || id === "wasm") {
    try {
      // Drop stale worker listeners so Progress lines are not duplicated.
      state.wasmRunId += 1;
      ensureWorker().postMessage({ type: "cancel" });
    } catch (e) {
      liveLog(String(e.message || e), "bad");
    }
  } else {
    try {
      // id may be null after reload; job 0 still clears a stuck server busy latch.
      await fetchJson(`/api/jobs/${id || 0}/cancel`, { method: "POST" });
    } catch (e) {
      liveLog(String(e.message || e), "bad");
    }
  }
  // Unblock Run immediately; poll loop exits when the server marks the job done.
  state.jobId = null;
  state.jobCursor = 0;
  state._cancelSeen = true;
  updateRunBadge();
  saveLiveSession();
  el("runBtn").disabled = false;
}

el("modeLive").addEventListener("click", () => setMode("live"));
el("modeStatic").addEventListener("click", () => setMode("static"));
el("runMode").addEventListener("change", syncTaskParams);
el("presetSelect").addEventListener("change", () => {
  if (state.mode !== "live") return;
  syncCustomGraphUi();
  loadGraph(el("presetSelect").value);
});
el("caseSelect").addEventListener("change", () => {
  if (state.mode !== "static") return;
  loadCase(el("caseSelect").value);
});
el("previewCustomBtn").addEventListener("click", previewCustomGraph);
el("runBtn").addEventListener("click", runLive);
el("cancelBtn").addEventListener("click", cancelJob);
el("cancelBadgeBtn").addEventListener("click", cancelJob);
window.addEventListener("resize", draw);

async function boot() {
  const saved = restoreLiveSession();
  if (saved?.form) applyRestoredForm(saved.form);
  if (saved?.live) {
    Object.assign(state.live, saved.live);
    if (saved.live.graph || saved.live.logHtml) {
      // Avoid treating restored session as empty on catalog load.
      state.live.graph = saved.live.graph;
      state.live.layout = saved.live.layout;
    }
  }
  if (saved?.jobId) {
    state.jobId = saved.jobId;
    state.jobCursor = saved.jobCursor || 0;
  }

  state.mode = "live";
  el("modeLive").classList.add("active");
  el("modeStatic").classList.remove("active");
  setStaticChrome(false);
  syncTaskParams();
  await loadPresets();

  if (saved?.live?.presetId) {
    const sel = el("presetSelect");
    if ([...sel.options].some((o) => o.value === saved.live.presetId)) {
      sel.value = saved.live.presetId;
      syncCustomGraphUi();
    }
  }

  if (saved?.live && (saved.live.logHtml || saved.live.graph)) {
    applyLiveToDom();
    if (saved.live.logHtml) {
      // Already restored via applyLiveToDom; mark resume quietly.
    }
  }

  updateRunBadge();

  if (state.jobId && state.jobId !== "wasm" && state.backend === "http") {
    el("runBtn").disabled = true;
    el("modeHint").textContent = "Resuming Live search after reload…";
    liveLog("(reloaded — resuming progress)", "info");
    try {
      await pollJob(state.jobId, state.jobCursor);
    } finally {
      el("runBtn").disabled = false;
      if (state.mode === "live") {
        el("modeHint").textContent = liveHintForBackend();
      }
    }
  } else if (state.jobId === "wasm") {
    // In-browser jobs cannot resume across reload.
    state.jobId = null;
    state.jobCursor = 0;
    updateRunBadge();
  }
  if (state.mode === "live") el("modeHint").textContent = liveHintForBackend();
}

boot();
