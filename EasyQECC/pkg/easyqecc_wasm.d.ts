/* tslint:disable */
/* eslint-disable */

/**
 * Cooperative cancel for the in-flight wasm solve (and CaDiCaL terminate).
 */
export function cancelSolve(): void;

/**
 * Parse an edge-list string and return demo graph JSON.
 */
export function parseGraphEl(id: string, el: string): string;

/**
 * Run synthesis. Progress events are delivered as JSON strings to `on_event`.
 */
export function runSolve(req_json: string, on_event: Function): void;

/**
 * Wire JS CaDiCaL helpers. Call once after loading `cadical-wasm` in the worker.
 */
export function setSatBridge(reset: Function, add_clause: Function, solve: Function, value: Function, set_deadline_ms: Function, clear_deadline: Function, was_timed_out: Function): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly cancelSolve: () => void;
    readonly parseGraphEl: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly runSolve: (a: number, b: number, c: any) => [number, number];
    readonly setSatBridge: (a: any, b: any, c: any, d: any, e: any, f: any, g: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
