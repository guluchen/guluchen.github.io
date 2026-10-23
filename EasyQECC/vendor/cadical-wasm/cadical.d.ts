// Hand-written types for the Emscripten-generated glue (dist/cadical.js).
// This is the only hand-maintained declaration file; all other types are
// compiled from TypeScript source.

/**
 * Options forwarded to the Emscripten module factory. They are
 * instantiation-time and global to the module instance. `locateFile` is
 * the one you are most likely to need: return the URL/path of
 * `cadical.wasm` if it is not served next to the JS glue code.
 */
export interface ModuleOptions {
  locateFile?: (path: string, prefix: string) => string;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  [key: string]: unknown;
}

/**
 * A loaded Emscripten module: one wasm instantiation with its own heap.
 * Only the runtime helpers the wrapper uses are typed here.
 */
export interface CadicalModule {
  // Returns `any`: this is the untyped C boundary; the wrapper assigns
  // precise types at each call site.
  cwrap(
    name: string,
    returnType: string | null,
    argTypes: string[]
  ): (...args: (number | string)[]) => any;
  addFunction(fn: (...args: number[]) => number | void, signature: string): number;
  removeFunction(ptr: number): void;
  HEAP32: Int32Array;
  [key: string]: unknown;
}

/** Instantiate the CaDiCaL wasm module. */
export default function createCadicalModule(options?: ModuleOptions): Promise<CadicalModule>;
