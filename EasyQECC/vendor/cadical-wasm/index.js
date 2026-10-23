import createCadicalModule from './cadical.js';
import { OPTION_NAMES } from './options.generated.js';
let sharedModulePromise = null;
/**
 * Create a fresh, isolated wasm module instance with its own heap.
 * Solvers constructed on it (new Cadical(mod)) are fully independent of
 * the shared module, and all their memory is reclaimed when the module
 * itself is garbage collected.
 */
export function createModule(options) {
    // Copy: Emscripten mutates the object it is given.
    return createCadicalModule({ ...options });
}
/**
 * Load the shared, default-configured wasm module used by Cadical.create().
 * It takes no options: module options (locateFile, print, ...) are
 * instantiation-time and global to a module, so a shared module cannot
 * meaningfully accept them. If you need them, create your own module with
 * createModule(options) and construct solvers with new Cadical(mod).
 */
export function loadCadical() {
    if (!sharedModulePromise)
        sharedModulePromise = createModule();
    return sharedModulePromise;
}
function makeBindings(mod) {
    const w = (name, ret, args) => mod.cwrap('ccadical_' + name, ret, args);
    return {
        signature: w('signature', 'string', []),
        init: w('init', 'number', []),
        release: w('release', null, ['number']),
        add: w('add', null, ['number', 'number']),
        assume: w('assume', null, ['number', 'number']),
        solve: w('solve', 'number', ['number']),
        val: w('val', 'number', ['number', 'number']),
        failed: w('failed', 'number', ['number', 'number']),
        setTerminate: w('set_terminate', null, ['number', 'number', 'number']),
        setLearn: w('set_learn', null, ['number', 'number', 'number', 'number']),
        constrain: w('constrain', null, ['number', 'number']),
        constraintFailed: w('constraint_failed', 'number', ['number']),
        setOption: w('set_option', null, ['number', 'string', 'number']),
        getOption: w('get_option', 'number', ['number', 'string']),
        limit: w('limit', null, ['number', 'string', 'number']),
        printStatistics: w('print_statistics', null, ['number']),
        active: w('active', 'number', ['number']),
        irredundant: w('irredundant', 'number', ['number']),
        fixed: w('fixed', 'number', ['number', 'number']),
        conclude: w('conclude', null, ['number']),
        terminate: w('terminate', null, ['number']),
        freeze: w('freeze', null, ['number', 'number']),
        frozen: w('frozen', 'number', ['number', 'number']),
        melt: w('melt', null, ['number', 'number']),
        simplify: w('simplify', 'number', ['number']),
        vars: w('vars', 'number', ['number']),
        declareMoreVariables: w('declare_more_variables', 'number', ['number', 'number']),
        declareOneMoreVariable: w('declare_one_more_variable', 'number', ['number']),
        phase: w('phase', null, ['number', 'number']),
        unphase: w('unphase', null, ['number', 'number']),
    };
}
const bindingsCache = new WeakMap();
function bindings(mod) {
    let c = bindingsCache.get(mod);
    if (!c) {
        c = makeBindings(mod);
        bindingsCache.set(mod, c);
    }
    return c;
}
// Frees the native solver and its function-table slots. `state` is a
// solver-independent record: the finalizer below must be able to hold it
// without keeping the Cadical object itself alive.
function disposeNative(state) {
    if (!state.ptr)
        return;
    if (state.terminatePtr)
        state.mod.removeFunction(state.terminatePtr);
    if (state.learnPtr)
        state.mod.removeFunction(state.learnPtr);
    state.terminatePtr = 0;
    state.learnPtr = 0;
    bindings(state.mod).release(state.ptr);
    state.ptr = 0;
}
// Backstop: solvers that are garbage collected without dispose() are
// disposed here. GC timing is nondeterministic, so explicit dispose()
// (or `using`) is still preferred for large or long-lived solvers.
const finalizers = typeof FinalizationRegistry === 'undefined'
    ? null
    : new FinalizationRegistry(disposeNative);
const LIMIT_NAMES = ['conflicts', 'decisions', 'preprocessing', 'localsearch'];
const SOLVE_OPTION_NAMES = new Set(['assumptions', ...LIMIT_NAMES]);
// IPASIR / SAT-competition exit codes, internal to the wrapper.
function statusToString(status) {
    if (status === 10)
        return 'satisfiable';
    if (status === 20)
        return 'unsatisfiable';
    return 'unknown';
}
export class Cadical {
    _mod;
    _c;
    _ptr;
    _onTerminate;
    _onLearn;
    _lastAssumptions;
    _finalizerState;
    // Which variables the user has introduced (used in a clause,
    // constraint, or assumption, or declared via newVar/ensureVars).
    // With the 'factor' option, the solver introduces extension variables
    // of its own; those are not the user's and cannot be queried with
    // val(), so model() must skip them.
    _isUserVar;
    _maxUserVar;
    /**
     * Create a solver on the shared wasm module, loading it if necessary,
     * with optional solver options (see SolverOptions), e.g.
     * Cadical.create({ quiet: true }). Options are fixed at creation:
     * CaDiCaL only allows setting them before the solver is used. For a
     * solver on a custom-configured or isolated wasm module, use
     * createModule(moduleOptions) plus new Cadical(mod, options).
     */
    static async create(options) {
        return new Cadical(await loadCadical(), options);
    }
    /**
     * Construct from an already-loaded module (see loadCadical /
     * createModule), with optional solver options (see SolverOptions).
     */
    constructor(mod, options) {
        if (options) {
            for (const name of Object.keys(options)) {
                if (!OPTION_NAMES.has(name))
                    throw new Error(`Unknown solver option '${name}'`);
            }
        }
        this._mod = mod;
        this._c = bindings(mod);
        this._ptr = this._c.init();
        this._onTerminate = null;
        this._onLearn = null;
        this._lastAssumptions = [];
        this._isUserVar = [];
        this._maxUserVar = 0;
        this._finalizerState = { mod, ptr: this._ptr, terminatePtr: 0, learnPtr: 0 };
        if (finalizers)
            finalizers.register(this, this._finalizerState, this);
        if (options) {
            for (const [name, value] of Object.entries(options)) {
                this._c.setOption(this._ptr, name, Number(value));
            }
        }
    }
    /** Whether dispose() has been called. A disposed solver cannot be used. */
    get disposed() {
        return this._ptr === 0;
    }
    /**
     * Dispose the solver, immediately freeing the native memory backing it.
     * Also available via `using` (Symbol.dispose). Solvers that are garbage
     * collected undisposed get disposed then, but GC timing is up to the
     * engine, so disposing explicitly is preferred for large or long-lived
     * solvers. Idempotent.
     */
    dispose() {
        if (this.disposed)
            return;
        if (finalizers)
            finalizers.unregister(this);
        disposeNative(this._finalizerState);
        this._ptr = 0;
        this._onTerminate = null;
        this._onLearn = null;
    }
    _checkNotDisposed() {
        if (this.disposed)
            throw new Error('Solver has been disposed');
    }
    _markUserVar(v) {
        this._isUserVar[v] = true;
        if (v > this._maxUserVar)
            this._maxUserVar = v;
    }
    /** Version string of the underlying CaDiCaL build. */
    get signature() {
        return this._c.signature();
    }
    /**
     * Add a clause: an array of non-zero integer literals, where a positive
     * integer v means variable v and -v means its negation.
     */
    addClause(lits) {
        this._checkNotDisposed();
        for (const lit of lits) {
            if (!lit)
                throw new Error('Clause literals must be non-zero');
            this._markUserVar(Math.abs(lit));
            this._c.add(this._ptr, lit);
        }
        this._c.add(this._ptr, 0);
    }
    /** Add many clauses at once. */
    addClauses(clauses) {
        for (const clause of clauses)
            this.addClause(clause);
    }
    /**
     * Add clauses from a DIMACS CNF string. Comment lines and the problem
     * header are ignored; literals are streamed straight into the solver.
     */
    addDimacs(text) {
        this._checkNotDisposed();
        const re = /\S+/g;
        let m;
        let expectHeader = 0;
        while ((m = re.exec(text))) {
            const tok = m[0];
            if (expectHeader > 0) {
                expectHeader--;
                continue;
            }
            if (tok === 'c') {
                const nl = text.indexOf('\n', re.lastIndex);
                if (nl === -1)
                    break;
                re.lastIndex = nl;
                continue;
            }
            if (tok === 'p') {
                expectHeader = 3; // skip "cnf <vars> <clauses>"
                continue;
            }
            const lit = Number(tok);
            if (!Number.isInteger(lit))
                throw new Error(`Invalid DIMACS token: ${tok}`);
            if (lit)
                this._markUserVar(Math.abs(lit));
            this._c.add(this._ptr, lit);
        }
    }
    /**
     * Constrain the next solve() calls with a clause that must hold in
     * addition to the regular clauses, until the next call to constrain()
     * or addClause() replaces or drops it (see CaDiCaL docs).
     */
    constrain(lits) {
        this._checkNotDisposed();
        for (const lit of lits) {
            if (!lit)
                throw new Error('Constraint literals must be non-zero');
            this._markUserVar(Math.abs(lit));
            this._c.constrain(this._ptr, lit);
        }
        this._c.constrain(this._ptr, 0);
    }
    /** Whether the constraint was used to prove unsatisfiability. */
    constraintFailed() {
        this._checkNotDisposed();
        return this._c.constraintFailed(this._ptr) !== 0;
    }
    /**
     * Solve. Returns 'satisfiable', 'unsatisfiable', or 'unknown'. All
     * options apply to this call only:
     * - assumptions: literals assumed to hold for this solve
     * - conflicts, decisions: give up (-> 'unknown') after this many
     *   (default unlimited)
     * - preprocessing, localsearch: rounds to run before search (default 0)
     */
    solve(options = {}) {
        this._checkNotDisposed();
        for (const key of Object.keys(options)) {
            if (!SOLVE_OPTION_NAMES.has(key))
                throw new Error(`Unknown solve option '${key}'`);
        }
        for (const name of LIMIT_NAMES) {
            const value = options[name];
            if (value !== undefined)
                this._c.limit(this._ptr, name, value);
        }
        this._lastAssumptions = [...(options.assumptions ?? [])];
        for (const lit of this._lastAssumptions) {
            if (!lit)
                throw new Error('Assumption literals must be non-zero');
            this._markUserVar(Math.abs(lit));
            this._c.assume(this._ptr, lit);
        }
        return statusToString(this._c.solve(this._ptr));
    }
    /** After a satisfiable solve: is this literal true in the model? */
    value(lit) {
        this._checkNotDisposed();
        return this._c.val(this._ptr, lit) === lit;
    }
    /**
     * After a satisfiable solve: the full model as an array where model[v]
     * is the boolean value of variable v (1-based; index 0 is unused).
     * Covers the variables you used or declared; solver-internal extension
     * variables (introduced by the 'factor' option) are excluded and read
     * as false.
     */
    model() {
        this._checkNotDisposed();
        const n = this._maxUserVar;
        const model = new Array(n + 1).fill(false);
        for (let v = 1; v <= n; v++) {
            if (this._isUserVar[v])
                model[v] = this.value(v);
        }
        return model;
    }
    /** After an unsatisfiable solve: was this assumption used in the refutation? */
    failed(lit) {
        this._checkNotDisposed();
        return this._c.failed(this._ptr, lit) !== 0;
    }
    /**
     * After an unsatisfiable solve: the subset of the solve() call's
     * assumptions that were used in the refutation (an unsatisfiable core).
     */
    failedAssumptions() {
        this._checkNotDisposed();
        return this._lastAssumptions.filter((lit) => this.failed(lit));
    }
    // The wasm function table must be able to call a registered callback,
    // but a table entry is a GC root, so it must not strongly reference the
    // solver (else a callback capturing its own solver could never be
    // collected). Hence the entry is a trampoline holding only a WeakRef;
    // the real callback lives on the instance. The deref cannot miss while
    // solving: solve() is synchronous, so the solver is on the stack.
    _weakRef() {
        return typeof WeakRef === 'undefined' ? { deref: () => this } : new WeakRef(this);
    }
    /**
     * Register a callback polled during solving; return true to abort the
     * current solve() (which then returns 'unknown'). Pass null to clear.
     */
    setTerminate(callback) {
        this._checkNotDisposed();
        const state = this._finalizerState;
        if (state.terminatePtr) {
            this._mod.removeFunction(state.terminatePtr);
            state.terminatePtr = 0;
        }
        this._onTerminate = callback;
        if (callback) {
            const ref = this._weakRef();
            state.terminatePtr = this._mod.addFunction(() => {
                const solver = ref.deref();
                return solver && solver._onTerminate && solver._onTerminate() ? 1 : 0;
            }, 'ii');
        }
        this._c.setTerminate(this._ptr, 0, state.terminatePtr);
    }
    /**
     * Register a callback receiving learned clauses (as arrays of literals)
     * of length <= maxLength. Pass null to clear.
     */
    setLearn(maxLength, callback) {
        this._checkNotDisposed();
        const state = this._finalizerState;
        if (state.learnPtr) {
            this._mod.removeFunction(state.learnPtr);
            state.learnPtr = 0;
        }
        this._onLearn = callback;
        if (callback) {
            const ref = this._weakRef();
            state.learnPtr = this._mod.addFunction((_state, clausePtr) => {
                const solver = ref.deref();
                if (!solver || !solver._onLearn)
                    return;
                const clause = [];
                // Re-read HEAP32 each call: memory growth invalidates cached views.
                const heap = solver._mod.HEAP32;
                for (let i = clausePtr >> 2; heap[i] !== 0; i++)
                    clause.push(heap[i]);
                solver._onLearn(clause);
            }, 'vii');
        }
        this._c.setLearn(this._ptr, 0, maxLength, state.learnPtr);
    }
    /** Current value of a solver option (as set at construction, else its default). */
    getOption(name) {
        this._checkNotDisposed();
        if (!OPTION_NAMES.has(name))
            throw new Error(`Unknown solver option '${name}'`);
        return this._c.getOption(this._ptr, name);
    }
    /** Asynchronously request that an in-progress solve stop. */
    terminate() {
        this._checkNotDisposed();
        this._c.terminate(this._ptr);
    }
    /** Run preprocessing only. Returns 'satisfiable', 'unsatisfiable', or 'unknown'. */
    simplify() {
        this._checkNotDisposed();
        return statusToString(this._c.simplify(this._ptr));
    }
    conclude() {
        this._checkNotDisposed();
        this._c.conclude(this._ptr);
    }
    freeze(lit) {
        this._checkNotDisposed();
        this._c.freeze(this._ptr, lit);
    }
    frozen(lit) {
        this._checkNotDisposed();
        return this._c.frozen(this._ptr, lit) !== 0;
    }
    melt(lit) {
        this._checkNotDisposed();
        this._c.melt(this._ptr, lit);
    }
    /** Suggest a decision phase for a variable. */
    phase(lit) {
        this._checkNotDisposed();
        this._c.phase(this._ptr, lit);
    }
    unphase(lit) {
        this._checkNotDisposed();
        this._c.unphase(this._ptr, lit);
    }
    /** Number of variables seen so far. */
    vars() {
        this._checkNotDisposed();
        return this._c.vars(this._ptr);
    }
    /**
     * Allocate a fresh variable and return its index. Preferable to picking
     * vars() + 1 yourself: the solver can introduce internal variables
     * (bounded variable addition), and declared variables are protected
     * from that reuse.
     */
    newVar() {
        this._checkNotDisposed();
        const v = this._c.declareOneMoreVariable(this._ptr);
        this._markUserVar(v);
        return v;
    }
    /**
     * Ensure variables 1..maxVar exist even if not yet mentioned in any
     * clause, so model() reports them and the solver will not reuse them
     * internally.  With the 'factor' option, solver-introduced extension
     * variables count toward the variable indices, so the declared range
     * can extend past maxVar; the returned value is the actual maximum
     * declared variable (like declare_more_variables in CaDiCaL).
     */
    ensureVars(maxVar) {
        this._checkNotDisposed();
        const missing = maxVar - this._c.vars(this._ptr);
        if (missing > 0) {
            const newMax = this._c.declareMoreVariables(this._ptr, missing);
            for (let v = newMax - missing + 1; v <= newMax; v++)
                this._markUserVar(v);
            return newMax;
        }
        return this._c.vars(this._ptr);
    }
    /** Number of active (unassigned, uneliminated) variables. */
    active() {
        this._checkNotDisposed();
        return this._c.active(this._ptr);
    }
    /** Number of irredundant clauses. */
    irredundant() {
        this._checkNotDisposed();
        return this._c.irredundant(this._ptr);
    }
    /** true / false if this literal is root-level fixed, null if not fixed. */
    fixed(lit) {
        this._checkNotDisposed();
        const f = this._c.fixed(this._ptr, lit);
        return f === 0 ? null : f > 0;
    }
    /** Print solver statistics to the console. */
    printStatistics() {
        this._checkNotDisposed();
        this._c.printStatistics(this._ptr);
    }
}
if (typeof Symbol !== 'undefined' && Symbol.dispose) {
    Cadical.prototype[Symbol.dispose] = Cadical.prototype.dispose;
}
/**
 * One-shot convenience: solve a DIMACS CNF string on the shared module.
 * Returns { status, model } where model (for satisfiable instances) maps
 * variable v to model[v] (true/false; index 0 unused).
 */
export async function solveDimacs(text) {
    const solver = await Cadical.create();
    try {
        solver.addDimacs(text);
        const status = solver.solve();
        return { status, model: status === 'satisfiable' ? solver.model() : null };
    }
    finally {
        solver.dispose();
    }
}
export default Cadical;
