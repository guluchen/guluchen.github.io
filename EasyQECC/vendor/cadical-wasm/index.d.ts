import type { CadicalModule, ModuleOptions } from './cadical.js';
import type { SolverOptions } from './options.generated.js';
export type { CadicalModule, ModuleOptions, SolverOptions };
export type SolveStatus = 'satisfiable' | 'unsatisfiable' | 'unknown';
/** Options for a single solve() call; none of them persist beyond it. */
export interface SolveOptions {
    /** Literals assumed to hold for this solve only. */
    assumptions?: readonly number[];
    /** Give up ('unknown') after this many conflicts (default unlimited). */
    conflicts?: number;
    /** Give up ('unknown') after this many decisions (default unlimited). */
    decisions?: number;
    /** Preprocessing rounds to run before search (default 0). */
    preprocessing?: number;
    /** Local search rounds to run before search (default 0). */
    localsearch?: number;
}
/**
 * Create a fresh, isolated wasm module instance with its own heap.
 * Solvers constructed on it (new Cadical(mod)) are fully independent of
 * the shared module, and all their memory is reclaimed when the module
 * itself is garbage collected.
 */
export declare function createModule(options?: ModuleOptions): Promise<CadicalModule>;
/**
 * Load the shared, default-configured wasm module used by Cadical.create().
 * It takes no options: module options (locateFile, print, ...) are
 * instantiation-time and global to a module, so a shared module cannot
 * meaningfully accept them. If you need them, create your own module with
 * createModule(options) and construct solvers with new Cadical(mod).
 */
export declare function loadCadical(): Promise<CadicalModule>;
export declare class Cadical {
    private _mod;
    private _c;
    private _ptr;
    private _onTerminate;
    private _onLearn;
    private _lastAssumptions;
    private _finalizerState;
    private _isUserVar;
    private _maxUserVar;
    /**
     * Create a solver on the shared wasm module, loading it if necessary,
     * with optional solver options (see SolverOptions), e.g.
     * Cadical.create({ quiet: true }). Options are fixed at creation:
     * CaDiCaL only allows setting them before the solver is used. For a
     * solver on a custom-configured or isolated wasm module, use
     * createModule(moduleOptions) plus new Cadical(mod, options).
     */
    static create(options?: SolverOptions): Promise<Cadical>;
    /**
     * Construct from an already-loaded module (see loadCadical /
     * createModule), with optional solver options (see SolverOptions).
     */
    constructor(mod: CadicalModule, options?: SolverOptions);
    /** Whether dispose() has been called. A disposed solver cannot be used. */
    get disposed(): boolean;
    /**
     * Dispose the solver, immediately freeing the native memory backing it.
     * Also available via `using` (Symbol.dispose). Solvers that are garbage
     * collected undisposed get disposed then, but GC timing is up to the
     * engine, so disposing explicitly is preferred for large or long-lived
     * solvers. Idempotent.
     */
    dispose(): void;
    private _checkNotDisposed;
    private _markUserVar;
    /** Version string of the underlying CaDiCaL build. */
    get signature(): string;
    /**
     * Add a clause: an array of non-zero integer literals, where a positive
     * integer v means variable v and -v means its negation.
     */
    addClause(lits: Iterable<number>): void;
    /** Add many clauses at once. */
    addClauses(clauses: Iterable<Iterable<number>>): void;
    /**
     * Add clauses from a DIMACS CNF string. Comment lines and the problem
     * header are ignored; literals are streamed straight into the solver.
     */
    addDimacs(text: string): void;
    /**
     * Constrain the next solve() calls with a clause that must hold in
     * addition to the regular clauses, until the next call to constrain()
     * or addClause() replaces or drops it (see CaDiCaL docs).
     */
    constrain(lits: Iterable<number>): void;
    /** Whether the constraint was used to prove unsatisfiability. */
    constraintFailed(): boolean;
    /**
     * Solve. Returns 'satisfiable', 'unsatisfiable', or 'unknown'. All
     * options apply to this call only:
     * - assumptions: literals assumed to hold for this solve
     * - conflicts, decisions: give up (-> 'unknown') after this many
     *   (default unlimited)
     * - preprocessing, localsearch: rounds to run before search (default 0)
     */
    solve(options?: SolveOptions): SolveStatus;
    /** After a satisfiable solve: is this literal true in the model? */
    value(lit: number): boolean;
    /**
     * After a satisfiable solve: the full model as an array where model[v]
     * is the boolean value of variable v (1-based; index 0 is unused).
     * Covers the variables you used or declared; solver-internal extension
     * variables (introduced by the 'factor' option) are excluded and read
     * as false.
     */
    model(): boolean[];
    /** After an unsatisfiable solve: was this assumption used in the refutation? */
    failed(lit: number): boolean;
    /**
     * After an unsatisfiable solve: the subset of the solve() call's
     * assumptions that were used in the refutation (an unsatisfiable core).
     */
    failedAssumptions(): number[];
    private _weakRef;
    /**
     * Register a callback polled during solving; return true to abort the
     * current solve() (which then returns 'unknown'). Pass null to clear.
     */
    setTerminate(callback: (() => boolean) | null): void;
    /**
     * Register a callback receiving learned clauses (as arrays of literals)
     * of length <= maxLength. Pass null to clear.
     */
    setLearn(maxLength: number, callback: ((clause: number[]) => void) | null): void;
    /** Current value of a solver option (as set at construction, else its default). */
    getOption(name: keyof SolverOptions): number;
    /** Asynchronously request that an in-progress solve stop. */
    terminate(): void;
    /** Run preprocessing only. Returns 'satisfiable', 'unsatisfiable', or 'unknown'. */
    simplify(): SolveStatus;
    conclude(): void;
    freeze(lit: number): void;
    frozen(lit: number): boolean;
    melt(lit: number): void;
    /** Suggest a decision phase for a variable. */
    phase(lit: number): void;
    unphase(lit: number): void;
    /** Number of variables seen so far. */
    vars(): number;
    /**
     * Allocate a fresh variable and return its index. Preferable to picking
     * vars() + 1 yourself: the solver can introduce internal variables
     * (bounded variable addition), and declared variables are protected
     * from that reuse.
     */
    newVar(): number;
    /**
     * Ensure variables 1..maxVar exist even if not yet mentioned in any
     * clause, so model() reports them and the solver will not reuse them
     * internally.  With the 'factor' option, solver-introduced extension
     * variables count toward the variable indices, so the declared range
     * can extend past maxVar; the returned value is the actual maximum
     * declared variable (like declare_more_variables in CaDiCaL).
     */
    ensureVars(maxVar: number): number;
    /** Number of active (unassigned, uneliminated) variables. */
    active(): number;
    /** Number of irredundant clauses. */
    irredundant(): number;
    /** true / false if this literal is root-level fixed, null if not fixed. */
    fixed(lit: number): boolean | null;
    /** Print solver statistics to the console. */
    printStatistics(): void;
}
export interface Cadical {
    [Symbol.dispose](): void;
}
export interface SolveDimacsResult {
    status: SolveStatus;
    /** For satisfiable instances: model[v] is the value of variable v (1-based). */
    model: boolean[] | null;
}
/**
 * One-shot convenience: solve a DIMACS CNF string on the shared module.
 * Returns { status, model } where model (for satisfiable instances) maps
 * variable v to model[v] (true/false; index 0 unused).
 */
export declare function solveDimacs(text: string): Promise<SolveDimacsResult>;
export default Cadical;
