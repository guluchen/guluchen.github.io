export declare const OPTION_NAMES: ReadonlySet<string>;
/**
 * CaDiCaL solver options. Options with range 0..1 are flags and typed as
 * booleans (0/1 also accepted); the rest are integers, clamped to their
 * range by the solver.
 */
export interface SolverOptions {
    /** allocate clauses in arena (default true) */
    arena?: boolean | 0 | 1;
    /** keep clauses compact (default true) */
    arenacompact?: boolean | 0 | 1;
    /** sort clauses in arena (default true) */
    arenasort?: boolean | 0 | 1;
    /** 1=clause, 2=var, 3=queue (default 3, range 1..3) */
    arenatype?: number;
    /** binary clause backbone (default 1, range 0..2) */
    backbone?: number;
    /** binary effort in per mile (default 20, range 0..1e5) */
    backboneeffort?: number;
    /** backbone rounds limit (default 1e3, range 0..1e5) */
    backbonemaxrounds?: number;
    /** backbone rounds limit (default 100, range 0..1e5) */
    backbonerounds?: number;
    /** delay if ticks smaller thresh*clauses (default 5, range 0..1e9) */
    backbonethresh?: number;
    /** use binary proof format (default true) */
    binary?: boolean | 0 | 1;
    /** blocked clause elimination (default false) */
    block?: boolean | 0 | 1;
    /** maximum clause size (default 1e5, range 1..2e9) */
    blockmaxclslim?: number;
    /** minimum clause size (default 2, range 2..2e9) */
    blockminclslim?: number;
    /** occurrence limit (default 1e2, range 1..2e9) */
    blockocclim?: number;
    /** bump variables (default true) */
    bump?: boolean | 0 | 1;
    /** bump reason literals too (default true) */
    bumpreason?: boolean | 0 | 1;
    /** bump reason depth (default 1, range 1..3) */
    bumpreasondepth?: number;
    /** bump reason limit (default 10, range 1..2e9) */
    bumpreasonlimit?: number;
    /** bump reason decision rate (default 100, range 1..2e9) */
    bumpreasonrate?: number;
    /** enable internal checking (default false) */
    check?: boolean | 0 | 1;
    /** check assumptions satisfied (default true) */
    checkassumptions?: boolean | 0 | 1;
    /** check constraint satisfied (default true) */
    checkconstraint?: boolean | 0 | 1;
    /** check failed literals form core (default true) */
    checkfailed?: boolean | 0 | 1;
    /** check all frozen semantics (default false) */
    checkfrozen?: boolean | 0 | 1;
    /** 1=drat, 2=lrat, 3=both (default 3, range 0..3) */
    checkproof?: number;
    /** check witness internally (default true) */
    checkwitness?: boolean | 0 | 1;
    /** chronological backtracking (default 1, range 0..2) */
    chrono?: number;
    /** force always chronological (default false) */
    chronoalways?: boolean | 0 | 1;
    /** chronological level limit (default 1e2, range 0..2e9) */
    chronolevelim?: number;
    /** reuse trail chronologically (default true) */
    chronoreusetrail?: boolean | 0 | 1;
    /** compact internal variables (default true) */
    compact?: boolean | 0 | 1;
    /** compacting interval (default 2e3, range 1..2e9) */
    compactint?: number;
    /** inactive limit per mille (default 1e2, range 0..1e3) */
    compactlim?: number;
    /** minimum inactive limit (default 1e2, range 1..2e9) */
    compactmin?: number;
    /** globally blocked clause elim (default false) */
    condition?: boolean | 0 | 1;
    /** relative efficiency per mille (default 100, range 1..1e5) */
    conditioneffort?: number;
    /** initial conflict interval (default 1e4, range 1..2e9) */
    conditionint?: number;
    /** maximum condition efficiency (default 1e7, range 0..2e9) */
    conditionmaxeff?: number;
    /** maximum clause variable ratio (default 100, range 1..2e9) */
    conditionmaxrat?: number;
    /** minimum condition efficiency (default 0, range 0..2e9) */
    conditionmineff?: number;
    /** congruence closure (default true) */
    congruence?: boolean | 0 | 1;
    /** extract AND gates (default true) */
    congruenceand?: boolean | 0 | 1;
    /** AND gate arity limit (default 1e6, range 2..5e7) */
    congruenceandarity?: number;
    /** extract binary and strengthen ternary clauses (default true) */
    congruencebinaries?: boolean | 0 | 1;
    /** extract ITE gates (default true) */
    congruenceite?: boolean | 0 | 1;
    /** extract XOR gates (default true) */
    congruencexor?: boolean | 0 | 1;
    /** XOR gate arity limit (default 4, range 2..31) */
    congruencexorarity?: number;
    /** XOR gate round (default 1, range 1..5e6) */
    congruencexorcounts?: number;
    /** covered clause elimination (default false) */
    cover?: boolean | 0 | 1;
    /** relative efficiency per mille (default 4, range 1..1e5) */
    covereffort?: number;
    /** maximum clause size (default 1e5, range 1..2e9) */
    covermaxclslim?: number;
    /** maximum cover efficiency (default 1e8, range 0..2e9) */
    covermaxeff?: number;
    /** minimum clause size (default 2, range 2..2e9) */
    coverminclslim?: number;
    /** minimum cover efficiency (default 0, range 0..2e9) */
    covermineff?: number;
    /** decompose BIG in SCCs and ELS (default true) */
    decompose?: boolean | 0 | 1;
    /** number of decompose rounds (default 2, range 1..16) */
    decomposerounds?: number;
    /** remove duplicated binaries (default true) */
    deduplicate?: boolean | 0 | 1;
    /** remove duplicated clauses once before solving (default false) */
    deduplicateallinit?: boolean | 0 | 1;
    /** subsume recently learned (default true) */
    eagersubsume?: boolean | 0 | 1;
    /** limit on subsumed candidates (default 20, range 1..1e3) */
    eagersubsumelim?: number;
    /** elevate during clause addition (default 2, range -1..3) */
    elevate?: number;
    /** bounded variable elimination (default true) */
    elim?: boolean | 0 | 1;
    /** find AND gates (default true) */
    elimands?: boolean | 0 | 1;
    /** eager backward subsumption (default true) */
    elimbackward?: boolean | 0 | 1;
    /** maximum elimination bound (default 16, range -1..2e6) */
    elimboundmax?: number;
    /** minimum elimination bound (default 0, range -1..2e6) */
    elimboundmin?: number;
    /** resolvent size limit (default 1e2, range 2..2e9) */
    elimclslim?: number;
    /** mine definitions with kitten (default false) */
    elimdef?: boolean | 0 | 1;
    /** number of unsat cores (default 1, range 1..100) */
    elimdefcores?: number;
    /** kitten ticks limit (default 2e5, range 0..2e9) */
    elimdefticks?: number;
    /** relative efficiency per mille (default 1e3, range 1..1e5) */
    elimeffort?: number;
    /** find equivalence gates (default true) */
    elimequivs?: boolean | 0 | 1;
    /** elimination interval (default 2e3, range 1..2e9) */
    elimint?: number;
    /** find if-then-else gates (default true) */
    elimites?: boolean | 0 | 1;
    /** limit resolutions (default true) */
    elimlimited?: boolean | 0 | 1;
    /** maximum elimination efficiency (default 2e9, range 0..2e9) */
    elimmaxeff?: number;
    /** minimum elimination efficiency (default 1e7, range 0..2e9) */
    elimmineff?: number;
    /** occurrence limit (default 1e2, range 0..2e9) */
    elimocclim?: number;
    /** elim score product weight (default 1, range 0..1e4) */
    elimprod?: number;
    /** usual number of rounds (default 2, range 1..512) */
    elimrounds?: number;
    /** elimination by substitution (default true) */
    elimsubst?: boolean | 0 | 1;
    /** elimination score sum weight (default 1, range 0..1e4) */
    elimsum?: number;
    /** maximum XOR size (default 5, range 2..27) */
    elimxorlim?: number;
    /** find XOR gates (default true) */
    elimxors?: boolean | 0 | 1;
    /** window decision rate (default 1e5, range 1..2e9) */
    emadecisions?: number;
    /** window fast glue (default 33, range 1..2e9) */
    emagluefast?: number;
    /** window slow glue (default 1e5, range 1..2e9) */
    emaglueslow?: number;
    /** window back-jump level (default 1e5, range 1..2e9) */
    emajump?: number;
    /** window back-track level (default 1e5, range 1..2e9) */
    emalevel?: number;
    /** window learned clause size (default 1e5, range 1..2e9) */
    emasize?: number;
    /** window fast trail (default 1e2, range 1..2e9) */
    ematrailfast?: number;
    /** window slow trail (default 1e5, range 1..2e9) */
    ematrailslow?: number;
    /** eagerly ask for all reasons (0: only when needed) (default false) */
    exteagerreasons?: boolean | 0 | 1;
    /** after eagerly asking for reasons recalculate all levels (0: trust the external tool) (default true) */
    exteagerrecalc?: boolean | 0 | 1;
    /** trace propagator call-backs when tracing API calls (default false) */
    exttracecalls?: boolean | 0 | 1;
    /** bounded variable addition (default false) */
    factor?: boolean | 0 | 1;
    /** candidates reduction rounds (default 2, range 0..2e9) */
    factorcandrounds?: number;
    /** API checks that variables have been declared (1 = only with factor on, 2 = always) (default 1, range 0..2) */
    factorcheck?: number;
    /** delay bounded variable addition between eliminations (default 4, range 0..12) */
    factordelay?: number;
    /** relative effort per mille (default 50, range 0..1e6) */
    factoreffort?: number;
    /** initial effort in millions (default 300, range 1..1e6) */
    factoriniticks?: number;
    /** clause size limit (default 5, range 2..2e9) */
    factorsize?: number;
    /** delay if ticks smaller thresh*clauses (default 7, range 0..100) */
    factorthresh?: number;
    /** extension variable with lowest importance [1: as in kissat] (default true) */
    factorunbump?: boolean | 0 | 1;
    /** fast BVE during preprocessing (default true) */
    fastelim?: boolean | 0 | 1;
    /** fast BVE bound during preprocessing (default 8, range 1..1e3) */
    fastelimbound?: number;
    /** fast BVE resolvent size limit (default 1e2, range 2..2e9) */
    fastelimclslim?: number;
    /** fast BVE occurence limit during preprocessing (default 100, range 1..2e9) */
    fastelimocclim?: number;
    /** number of fastelim rounds (default 4, range 1..512) */
    fastelimrounds?: number;
    /** flush redundant clauses (default false) */
    flush?: boolean | 0 | 1;
    /** interval increase (default 3, range 1..1e3) */
    flushfactor?: number;
    /** initial limit (default 1e5, range 1..2e9) */
    flushint?: number;
    /** always use initial phase (default false) */
    forcephase?: boolean | 0 | 1;
    /** 1=frat(lrat), 2=frat(drat) (default 0, range 0..2) */
    frat?: number;
    /** incremental proof format (default false) */
    idrup?: boolean | 0 | 1;
    /** ILB (incremental lazy backtrack) (0: no, 1: assumptions only, 2: everything) (default 0, range 0..2) */
    ilb?: number;
    /** decay clauses when doing incremental clauses (default 1, range 0..4) */
    incdecay?: number;
    /** decay interval when doing incremental clauses (default 1e6, range 1..2e9) */
    incdecayint?: number;
    /** inprobing interval (default 100, range 1..2e9) */
    inprobeint?: number;
    /** enable probe inprocessing (default true) */
    inprobing?: boolean | 0 | 1;
    /** enable general inprocessing (default true) */
    inprocessing?: boolean | 0 | 1;
    /** variable instantiation (default false) */
    instantiate?: boolean | 0 | 1;
    /** minimum clause size (default 3, range 2..2e9) */
    instantiateclslim?: number;
    /** maximum occurrence limit (default 1, range 1..2e9) */
    instantiateocclim?: number;
    /** instantiate each clause once (default true) */
    instantiateonce?: boolean | 0 | 1;
    /** linear incremental proof format (default false) */
    lidrup?: boolean | 0 | 1;
    /** use LRAT proof format (default false) */
    lrat?: boolean | 0 | 1;
    /** lucky phases (default true) */
    lucky?: boolean | 0 | 1;
    /** lucky phases with assumptions (default true) */
    luckyassumptions?: boolean | 0 | 1;
    /** lucky phases before preprocessing (default true) */
    luckyearly?: boolean | 0 | 1;
    /** lucky phases after preprocessing (default true) */
    luckylate?: boolean | 0 | 1;
    /** minimize learned clauses (default true) */
    minimize?: boolean | 0 | 1;
    /** minimization depth (default 1e3, range 0..1e3) */
    minimizedepth?: number;
    /** increment ticks in minimization (default true) */
    minimizeticks?: boolean | 0 | 1;
    /** on-the-fly self subsumption (default true) */
    otfs?: boolean | 0 | 1;
    /** initial phase (default true) */
    phase?: boolean | 0 | 1;
    /** initial preprocessing base limit (default 2e6, range 0..2e9) */
    preprocessinit?: number;
    /** lightweight preprocessing (default false) */
    preprocesslight?: boolean | 0 | 1;
    /** failed literal probing (default true) */
    probe?: boolean | 0 | 1;
    /** relative efficiency per mille (default 8, range 1..1e5) */
    probeeffort?: number;
    /** learn hyper binary clauses (default true) */
    probehbr?: boolean | 0 | 1;
    /** delay if ticks smaller thresh*clauses (default 0, range 0..100) */
    probethresh?: number;
    /** profiling level (default 2, range 0..4) */
    profile?: number;
    /** disable all messages (default false) */
    quiet?: boolean | 0 | 1;
    /** radix sort limit (default 32, range 0..2e9) */
    radixsortlim?: number;
    /** random decisions (default false) */
    randec?: boolean | 0 | 1;
    /** random decisions in focused mode (default true) */
    randecfocused?: boolean | 0 | 1;
    /** inital random decision interval (default 1e3, range 2..2e9) */
    randecinit?: number;
    /** random conflict length (default 500, range 0..2e9) */
    randecint?: number;
    /** length random decisions phases (default 10, range 1..1e9) */
    randeclength?: number;
    /** random decisions in stable mode (default false) */
    randecstable?: boolean | 0 | 1;
    /** real instead of process time (default false) */
    realtime?: boolean | 0 | 1;
    /** recompute tiers (default true) */
    recomputetier?: boolean | 0 | 1;
    /** reduce useless clauses (default true) */
    reduce?: boolean | 0 | 1;
    /** initial interval (default 300, range 1..1e6) */
    reduceinit?: number;
    /** reduce interval (default 25, range 2..1e6) */
    reduceint?: number;
    /** 0=prct,1=sqrt,2=max (default 1, range 0..2) */
    reduceopt?: number;
    /** reduce fraction in percent (default 75, range 10..1e2) */
    reducetarget?: number;
    /** glue of kept learned clauses (default 2, range 1..2e9) */
    reducetier1glue?: number;
    /** glue of tier two clauses (default 6, range 1..2e9) */
    reducetier2glue?: number;
    /** stable reluctant doubling restarts (default true) */
    reluctant?: boolean | 0 | 1;
    /** reluctant doubling period (default 1024, range 0..2e9) */
    reluctantint?: number;
    /** maximum reluctant doubling period (default 1048576, range 0..2e9) */
    reluctantmax?: number;
    /** enable resetting phase (0=no,1=always,2=stable-only) (default 1, range 0..2) */
    rephase?: number;
    /** rephase interval (default 1e3, range 1..2e9) */
    rephaseint?: number;
    /** enable reporting (default false) */
    report?: boolean | 0 | 1;
    /** report even if not successful (default false) */
    reportall?: boolean | 0 | 1;
    /** use solving not process time (default false) */
    reportsolve?: boolean | 0 | 1;
    /** enable restarts (default true) */
    restart?: boolean | 0 | 1;
    /** restart interval (default 2, range 1..2e9) */
    restartint?: number;
    /** focused slow fast margin in percent (default 10, range 0..25) */
    restartmarginfocused?: number;
    /** stable slow fast margin in percent (default 25, range 0..25) */
    restartmarginstable?: number;
    /** enable trail reuse (default true) */
    restartreusetrail?: boolean | 0 | 1;
    /** restore all clauses (2=really) (default 0, range 0..2) */
    restoreall?: number;
    /** remove satisfied clauses (default false) */
    restoreflush?: boolean | 0 | 1;
    /** reverse variable ordering (default false) */
    reverse?: boolean | 0 | 1;
    /** use EVSIDS scores (default true) */
    score?: boolean | 0 | 1;
    /** score factor per mille (default 950, range 500..1e3) */
    scorefactor?: number;
    /** random seed (default 0, range 0..2e9) */
    seed?: number;
    /** shrink conflict clause (1=binary-only,2=minimize-on-pulling,3=full) (default 3, range 0..3) */
    shrink?: number;
    /** use a reap for shrinking (default true) */
    shrinkreap?: boolean | 0 | 1;
    /** shuffle variables (default false) */
    shuffle?: boolean | 0 | 1;
    /** shuffle variable queue (default true) */
    shufflequeue?: boolean | 0 | 1;
    /** not reverse but random (default false) */
    shufflerandom?: boolean | 0 | 1;
    /** shuffle variable scores (default true) */
    shufflescores?: boolean | 0 | 1;
    /** enable stabilizing phases (default true) */
    stabilize?: boolean | 0 | 1;
    /** stabilizing interval (default 1e3, range 1..2e9) */
    stabilizeinit?: number;
    /** only stabilizing phases (default false) */
    stabilizeonly?: boolean | 0 | 1;
    /** print all statistics at the end of the run (default false) */
    stats?: boolean | 0 | 1;
    /** force phases to I/O in focused mode every once in a while (requires rephase==2) (default false) */
    stubbornIOfocused?: boolean | 0 | 1;
    /** enable clause subsumption (default true) */
    subsume?: boolean | 0 | 1;
    /** watch list length limit (default 1e4, range 0..2e9) */
    subsumebinlim?: number;
    /** clause length limit (default 1e2, range 0..2e9) */
    subsumeclslim?: number;
    /** relative efficiency per mille (default 1e3, range 1..1e5) */
    subsumeeffort?: number;
    /** limit subsumption checks (default true) */
    subsumelimited?: boolean | 0 | 1;
    /** maximum subsuming efficiency (default 1e8, range 0..2e9) */
    subsumemaxeff?: number;
    /** minimum subsuming efficiency (default 0, range 0..2e9) */
    subsumemineff?: number;
    /** watch list length limit (default 1e2, range 0..2e9) */
    subsumeocclim?: number;
    /** subsume strengthen (default true) */
    subsumestr?: boolean | 0 | 1;
    /** enable SAT sweeping (default true) */
    sweep?: boolean | 0 | 1;
    /** environment clauses (default 1024, range 0..2e9) */
    sweepclauses?: number;
    /** run SAT sweeping to completion (default false) */
    sweepcomplete?: boolean | 0 | 1;
    /** count binaries to environment (default true) */
    sweepcountbinary?: boolean | 0 | 1;
    /** environment depth (default 2, range 0..2e9) */
    sweepdepth?: number;
    /** relative effort in ticks per mille (default 1e2, range 0..1e4) */
    sweepeffort?: number;
    /** flipping rounds (default 1, range 0..2e9) */
    sweepfliprounds?: number;
    /** maximum environment clauses (default 3e5, range 2..2e9) */
    sweepmaxclauses?: number;
    /** maximum environment depth (default 3, range 1..2e9) */
    sweepmaxdepth?: number;
    /** maximum environment variables (default 8192, range 2..2e9) */
    sweepmaxvars?: number;
    /** randomize sweeping environment (default false) */
    sweeprand?: boolean | 0 | 1;
    /** delay if ticks smaller thresh*clauses (default 5, range 0..100) */
    sweepthresh?: number;
    /** environment variables (default 256, range 0..2e9) */
    sweepvars?: number;
    /** target phases (1=stable only) (default 1, range 0..2) */
    target?: number;
    /** termination check interval (default 10, range 0..1e4) */
    terminateint?: number;
    /** hyper ternary resolution (default true) */
    ternary?: boolean | 0 | 1;
    /** relative efficiency per mille (default 8, range 1..1e5) */
    ternaryeffort?: number;
    /** max clauses added in percent (default 1e3, range 0..1e4) */
    ternarymaxadd?: number;
    /** ternary occurrence limit (default 1e2, range 1..2e9) */
    ternaryocclim?: number;
    /** maximum ternary rounds (default 2, range 1..16) */
    ternaryrounds?: number;
    /** delay if ticks smaller thresh*clauses (default 6, range 0..100) */
    ternarythresh?: number;
    /** limit of tier1 usage in percentage (default 50, range 0..100) */
    tier1limit?: number;
    /** lowest tier1 limit (default 0, range 0..100) */
    tier1minglue?: number;
    /** limit of tier2 usage in percentage (default 90, range 0..100) */
    tier2limit?: number;
    /** lowest tier2 limit (default 0, range 0..100) */
    tier2minglue?: number;
    /** transitive reduction of BIG (default true) */
    transred?: boolean | 0 | 1;
    /** relative efficiency per mille (default 1e2, range 1..1e5) */
    transredeffort?: number;
    /** maximum efficiency (default 1e8, range 0..2e9) */
    transredmaxeff?: number;
    /** minimum efficiency (default 0, range 0..2e9) */
    transredmineff?: number;
    /** more verbose messages (default 0, range 0..3) */
    verbose?: number;
    /** odd=check-deletions, >2 drat (default 0, range 0..4) */
    veripb?: number;
    /** vivification (default true) */
    vivify?: boolean | 0 | 1;
    /** recalculate tier limits (default false) */
    vivifycalctier?: boolean | 0 | 1;
    /** demote irredundant or delete directly (default false) */
    vivifydemote?: boolean | 0 | 1;
    /** overall efficiency per mille (default 50, range 0..1e5) */
    vivifyeffort?: number;
    /** flush subsumed before vivification rounds (default true) */
    vivifyflush?: boolean | 0 | 1;
    /** instantiate last literal when vivify (default true) */
    vivifyinst?: boolean | 0 | 1;
    /** vivification of irredundant clauses (default true) */
    vivifyirred?: boolean | 0 | 1;
    /** irredundant efficiency per mille (default 3, range 1..100) */
    vivifyirredeff?: number;
    /** vivify once: 1=red, 2=red+irr (default 0, range 0..2) */
    vivifyonce?: number;
    /** re-vivify clause if vivify was successful (default 0, range 0..5) */
    vivifyretry?: number;
    /** maximum schedule size (default 5e3, range 10..2e9) */
    vivifyschedmax?: number;
    /** delay if ticks smaller thresh*clauses (default 20, range 0..100) */
    vivifythresh?: number;
    /** vivification tier1 (default true) */
    vivifytier1?: boolean | 0 | 1;
    /** relative tier1 effort (default 4, range 0..100) */
    vivifytier1eff?: number;
    /** vivification tier2 (default true) */
    vivifytier2?: boolean | 0 | 1;
    /** relative tier2 effort (default 2, range 1..100) */
    vivifytier2eff?: number;
    /** vivification tier3 (default true) */
    vivifytier3?: boolean | 0 | 1;
    /** relative tier3 effort (default 1, range 1..100) */
    vivifytier3eff?: number;
    /** enable random walks (default true) */
    walk?: boolean | 0 | 1;
    /** relative efficiency per mille (default 80, range 1..1e5) */
    walkeffort?: number;
    /** use Kissat's full occurrences instead of the single watched (default false) */
    walkfullocc?: boolean | 0 | 1;
    /** maximum efficiency (in 1e3 ticks) (default 1e7, range 0..2e9) */
    walkmaxeff?: number;
    /** minimum efficiency (default 0, range 0..1e7) */
    walkmineff?: number;
    /** walk in non-stabilizing phase (default true) */
    walknonstable?: boolean | 0 | 1;
    /** walk redundant clauses too (default false) */
    walkredundant?: boolean | 0 | 1;
    /** warmup before walk using propagation (default true) */
    warmup?: boolean | 0 | 1;
}
