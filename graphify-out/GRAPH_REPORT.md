# Graph Report - .  (2026-07-03)

## Corpus Check
- 49 files · ~106,583 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 716 nodes · 1433 edges · 44 communities (39 shown, 5 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.81)
- Token cost: 284,089 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Data-Flow Analysis (Ch 2.2)|Data-Flow Analysis (Ch 2.2)]]
- [[_COMMUNITY_OpenMP Synchronization Concepts|OpenMP Synchronization Concepts]]
- [[_COMMUNITY_Optimization Case Study Quicksort (Ch 2.3e)|Optimization Case Study: Quicksort (Ch 2.3e)]]
- [[_COMMUNITY_Control-Flow Graphs & Dominators (Ch 2)|Control-Flow Graphs & Dominators (Ch 2)]]
- [[_COMMUNITY_Chapter Study-Tool Components|Chapter Study-Tool Components]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_OpenMP Tasking Model (Ch 5.3)|OpenMP Tasking Model (Ch 5.3)]]
- [[_COMMUNITY_Dependence Vector Solver (Ch 3.4)|Dependence Vector Solver (Ch 3.4)]]
- [[_COMMUNITY_Vectorization & Code Generation (Ch 3.2)|Vectorization & Code Generation (Ch 3.2)]]
- [[_COMMUNITY_Copy Propagation (Ch 2.3b)|Copy Propagation (Ch 2.3b)]]
- [[_COMMUNITY_Data Dependence Graphs (Ch 3)|Data Dependence Graphs (Ch 3)]]
- [[_COMMUNITY_Loop Transformation Legality (Ch 4)|Loop Transformation Legality (Ch 4)]]
- [[_COMMUNITY_TypeScript App Config|TypeScript App Config]]
- [[_COMMUNITY_Classic Data-Flow Problems (local dup)|Classic Data-Flow Problems (local dup)]]
- [[_COMMUNITY_Project Conventions (CLAUDE.md)|Project Conventions (CLAUDE.md)]]
- [[_COMMUNITY_Loop-Invariant Code Motion (Ch 2.3c)|Loop-Invariant Code Motion (Ch 2.3c)]]
- [[_COMMUNITY_Array Dependence Testing (Ch 3.3)|Array Dependence Testing (Ch 3.3)]]
- [[_COMMUNITY_TypeScript Node Config|TypeScript Node Config]]
- [[_COMMUNITY_Loop Distribution (Ch 4.3)|Loop Distribution (Ch 4.3)]]
- [[_COMMUNITY_Shared UI Helpers & Duplicates|Shared UI Helpers & Duplicates]]
- [[_COMMUNITY_Loop Interchange (Ch 4.4)|Loop Interchange (Ch 4.4)]]
- [[_COMMUNITY_Loop Fusion (Ch 4.2)|Loop Fusion (Ch 4.2)]]
- [[_COMMUNITY_Loop Skewing & Distance Vectors (Ch 4.7)|Loop Skewing & Distance Vectors (Ch 4.7)]]
- [[_COMMUNITY_Loop Tiling for Matrix Multiply (Ch 4.9)|Loop Tiling for Matrix Multiply (Ch 4.9)]]
- [[_COMMUNITY_Induction Variable Detection (Ch 2.3d)|Induction Variable Detection (Ch 2.3d)]]
- [[_COMMUNITY_Common Subexpression Elimination (Ch 2.3a)|Common Subexpression Elimination (Ch 2.3a)]]
- [[_COMMUNITY_Shared BlockGraph Kit Component|Shared BlockGraph Kit Component]]
- [[_COMMUNITY_Chapter Selector & Card UI|Chapter Selector & Card UI]]
- [[_COMMUNITY_Project Root Config & Deployment|Project Root Config & Deployment]]
- [[_COMMUNITY_Icon Sprite Assets|Icon Sprite Assets]]
- [[_COMMUNITY_Data-Flow Solver Set Operations|Data-Flow Solver Set Operations]]
- [[_COMMUNITY_Reveal Toggle & Button UI|Reveal Toggle & Button UI]]
- [[_COMMUNITY_Hero Branding Image|Hero Branding Image]]
- [[_COMMUNITY_Favicon Branding|Favicon Branding]]
- [[_COMMUNITY_React Logo Asset|React Logo Asset]]
- [[_COMMUNITY_Vite Logo Asset|Vite Logo Asset]]
- [[_COMMUNITY_Cross-Chapter Worked Examples|Cross-Chapter Worked Examples]]
- [[_COMMUNITY_Root TypeScript Config|Root TypeScript Config]]
- [[_COMMUNITY_Claude Code Settings|Claude Code Settings]]
- [[_COMMUNITY_Unified Solver Panel (Ch 2.2)|Unified Solver Panel (Ch 2.2)]]
- [[_COMMUNITY_Graph Layout Geometry Helpers|Graph Layout Geometry Helpers]]
- [[_COMMUNITY_Misc Local State (Ch 2.2)|Misc Local State (Ch 2.2)]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 60 edges
2. `QuestionCard()` - 36 edges
3. `StudyShell()` - 34 edges
4. `Card` - 30 edges
5. `CardContent` - 27 edges
6. `Stepper()` - 26 edges
7. `FlowGraph()` - 26 edges
8. `CardHeader` - 25 edges
9. `CardTitle` - 25 edges
10. `Panel()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Two-part study framework (explain tabs + 5-question exam tab)` --rationale_for--> `Questions()`  [INFERRED]
  CLAUDE.md → src/Chapter5_3.tsx
- `Two-part study framework (explain tabs + 5-question exam tab)` --rationale_for--> `Questions()`  [INFERRED]
  CLAUDE.md → src/Chapter5.tsx
- `Two-part study framework (explain tabs + 5-question exam tab)` --rationale_for--> `Questions()`  [INFERRED]
  CLAUDE.md → src/Chapter5_2.tsx
- `Two-part study framework (explain tabs + 5-question exam tab)` --rationale_for--> `QuestionCard()`  [INFERRED]
  CLAUDE.md → src/components/study/kit.tsx
- `Two-part study framework (explain tabs + 5-question exam tab)` --rationale_for--> `StudyShell()`  [INFERRED]
  CLAUDE.md → src/components/study/kit.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Project Tech Stack** — claudemd_react, claudemd_typescript, claudemd_vite, claudemd_tailwind [EXTRACTED 0.90]
- **Interactive Learning Components** — claudemd_interactive_examples, claudemd_stepper, claudemd_flowgraph, claudemd_ui_primitives [EXTRACTED 0.80]
- **App Bootstrap Flow** — index_html_entry, index_html_main_tsx, index_html_root [EXTRACTED 0.85]
- **Chapters that build their tabbed UI on the shared study kit (StudyShell/QuestionCard/FlowGraph)** — study_kit_studyshell, study_kit_questioncard, study_kit_flowgraph, src_chapter2_3a_csestudytool, src_chapter2_3b_copypropstudytool, src_chapter2_3c_loopinvariantstudytool, src_chapter2_3d_inductionstudytool, src_chapter2_3e_quicksortstudytool, src_chapter3_datadependencestudytool [EXTRACTED 1.00]
- **The four classic data-flow analyses solved by the same forward/backward union/intersection fixpoint algorithm in Chapter2_2** — chapter2_2_reachingdefinitions, chapter2_2_livevariables, chapter2_2_availableexpressions, chapter2_2_verybusyexpressions, chapter2_2_solvedataflow [EXTRACTED 1.00]
- **Optimization applications composed together in the end-to-end Quicksort case study** — chapter2_3e_quicksort_pipeline, chapter2_3a_cse_algorithm, chapter2_3b_copyprop_conditions, chapter2_3d_inductionvariable, chapter2_3d_strengthreduction [EXTRACTED 1.00]
- **Chapter 5 (§5.1/5.2/5.3) StudyShell tabbed-page pattern** — src_chapter5_openmpstudytool, src_chapter5_2_synchronizationstudytool, src_chapter5_3_paralleltasksstudytool, study_kit_studyshell, study_kit_tabdef, study_kit_questioncard [INFERRED 0.90]
- **Three generations of OpenMP task models (2.5 pool, Intel taskq/task, 3.0 task/taskwait)** — src_chapter5_3_taskpoolsection, src_chapter5_3_intelsection, src_chapter5_3_taskdirectivesection, src_chapter5_3_taskwaitsection, concept_task_pool, concept_intel_taskq, concept_omp30_task [EXTRACTED 0.95]
- **OpenMP §5.2 synchronization mechanisms (critical, atomic, reduction, barrier/flush, lock)** — src_chapter5_2_mutexsection, src_chapter5_2_reductionsection, src_chapter5_2_barrierflushsection, src_chapter5_2_masterlocksection, concept_data_race [EXTRACTED 0.90]

## Communities (44 total, 5 thin omitted)

### Community 0 - "Data-Flow Analysis (Ch 2.2)"
Cohesion: 0.03
Nodes (44): availSteps, caseSteps, D, DFConfig, DFStep, diaAllowNodes, diaEdges, Diff (+36 more)

### Community 1 - "OpenMP Synchronization Concepts"
Cohesion: 0.06
Nodes (49): barrier and flush (memory consistency), Mutual exclusion: critical vs atomic, Data race / race condition, Fork-join execution model, Lock variables (simple vs nestable), Nested parallelism (omp_set_nested), reduction clause (private-copy + combine), shared/private data-sharing clauses (+41 more)

### Community 2 - "Optimization Case Study: Quicksort (Ch 2.3e)"
Cohesion: 0.05
Nodes (24): b5Steps, b6Steps, finalCode, qsCode, qsEdges, qsNodes, tabs, revSteps (+16 more)

### Community 3 - "Control-Flow Graphs & Dominators (Ch 2)"
Cohesion: 0.04
Nodes (28): bbSteps, Diff, diffClass, DOM, domEdges, domNodes, edgeGeom(), fibEdges (+20 more)

### Community 4 - "Chapter Study-Tool Components"
Cohesion: 0.12
Nodes (33): FlowGraph (Chapter2_2.tsx local copy), FlowGraph (Chapter2.tsx local copy), QuestionCard (Chapter2.tsx local copy), Two-part study framework (explain tabs + 5-question exam tab), App(), DataFlowStudyTool(), CseStudyTool(), CopyPropStudyTool() (+25 more)

### Community 5 - "Package Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, class-variance-authority, clsx, lucide-react, react, react-dom, tailwind-merge, tailwindcss (+23 more)

### Community 6 - "OpenMP Tasking Model (Ch 5.3)"
Cohesion: 0.11
Nodes (26): Intel taskq/task workqueueing extensions, OpenMP 3.0 task directive, omp for scheduling (static/dynamic/guided/runtime), Task grain-size cutoff (if() clause, task explosion), Task pool pattern (OpenMP 2.5, hand-rolled), taskwait / postorder correctness guarantee, IntelSection(), ListCaptureDemo() (+18 more)

### Community 7 - "Dependence Vector Solver (Ch 3.4)"
Cohesion: 0.08
Nodes (16): DirKey, dvEdges, DvNode, dvNodes, elimSteps, ExtremeCase, extremeCases, gcdAll() (+8 more)

### Community 8 - "Vectorization & Code Generation (Ch 3.2)"
Cohesion: 0.08
Nodes (17): bigEdgesD, bigEdgesD2, bigEdgesD3, bigNodes, codegenSteps, cyclicFill(), depClass, DepKind (+9 more)

### Community 9 - "Copy Propagation (Ch 2.3b)"
Cohesion: 0.12
Nodes (13): Stepper (Chapter2.tsx local copy), cpCode, cpEdges, cpExampleSteps, cpLocal, cpNodes, CpSnap, cpSnaps (+5 more)

### Community 10 - "Data Dependence Graphs (Ch 3)"
Cohesion: 0.10
Nodes (12): ddgEdges, ddgInfo, ddgNodes, Dep(), depClass, DepKind, distSteps, iterLineEdges (+4 more)

### Community 11 - "Loop Transformation Legality (Ch 4)"
Cohesion: 0.10
Nodes (10): ddgEdges, ddgNodes, Dep, deps, PeelDemo(), reorderSteps, Role, Stmt (+2 more)

### Community 12 - "TypeScript App Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 13 - "Classic Data-Flow Problems (local dup)"
Cohesion: 0.14
Nodes (18): algoLines (pseudocode generator matching solver config), AllLocalSetsExplorer (compare gen/kill across 4 analyses), Available expressions (data-flow analysis, forward/intersection), DFConfig (data-flow problem configuration type), Live variables (data-flow analysis, backward/union), Reaching definitions (data-flow analysis, forward/union), solveDataFlow (generic iterative fixpoint solver), Very busy expressions (data-flow analysis, backward/intersection) (+10 more)

### Community 14 - "Project Conventions (CLAUDE.md)"
Cohesion: 0.15
Nodes (17): bun run build (tsc + vite), Self-Contained Chapter Component, FlowGraph SVG Diagram, HPC Study Tool, Interactive Examples Principle, Questions Tab (Exam Practice), React 19, Stepper Component (+9 more)

### Community 15 - "Loop-Invariant Code Motion (Ch 2.3c)"
Cohesion: 0.12
Nodes (11): cautionSteps, ex1Code, ex2Code, LOOP, loopEdges, loopNodes, phAfter, phAfterE (+3 more)

### Community 16 - "Array Dependence Testing (Ch 3.3)"
Cohesion: 0.12
Nodes (7): buildSteps, limitSteps, mChoices, subscripts, tabs, X2, X4

### Community 17 - "TypeScript Node Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 18 - "Loop Distribution (Ch 4.3)"
Cohesion: 0.12
Nodes (9): dagEdges, dagNodes, distSteps, nestEdges, nestNodes, nestSteps, sccFill, sccOf (+1 more)

### Community 19 - "Shared UI Helpers & Duplicates"
Cohesion: 0.17
Nodes (13): cn(), Panel(), QuestionCard(), ReachingIteration(), Panel(), QuestionCard(), Dep(), Bracketed() (+5 more)

### Community 20 - "Loop Interchange (Ch 4.4)"
Cohesion: 0.15
Nodes (7): Dir, dirLabel(), dirSign, InterchangeChecker(), lexPositive(), tabs, triSteps

### Community 21 - "Loop Fusion (Ch 4.2)"
Cohesion: 0.14
Nodes (4): peelFuseSteps, tabs, TrapMode, trapNodes

### Community 22 - "Loop Skewing & Distance Vectors (Ch 4.7)"
Cohesion: 0.18
Nodes (8): DistanceCalc(), divS(), modS(), StripArcs(), stripPalette, stripSteps, tabs, Tag()

### Community 23 - "Loop Tiling for Matrix Multiply (Ch 4.9)"
Cohesion: 0.14
Nodes (5): bigMSteps, MatMulPicker(), Order, ReuseFactorTable(), tabs

### Community 24 - "Induction Variable Detection (Ch 2.3d)"
Cohesion: 0.15
Nodes (7): Form, forms, ivEdges, ivNodes, srSteps, tabs, Step()

### Community 25 - "Common Subexpression Elimination (Ch 2.3a)"
Cohesion: 0.17
Nodes (7): cseExampleSteps, lgEdges, lgNodes, qEdges, qNodes, tabs, Table()

### Community 26 - "Shared BlockGraph Kit Component"
Cohesion: 0.23
Nodes (11): BlockGraph(), BNode, Diff, diffClass, Fill, GEdge, GNode, S() (+3 more)

### Community 27 - "Chapter Selector & Card UI"
Cohesion: 0.33
Nodes (7): Chapter, ChapterSelectProps, Section, CardContent, CardDescription, CardHeader, CardTitle

### Community 28 - "Project Root Config & Deployment"
Cohesion: 0.32
Nodes (8): eslint.config.js (flat ESLint config), package.json (project manifest, scripts, deps), README.md (project blurb), tsconfig.json (root TS project references), tsconfig.app.json (app TypeScript config), tsconfig.node.json (Node/Vite-config TypeScript config), vite.config.ts (Vite build config), deploy.yml (GitHub Pages deploy workflow)

### Community 29 - "Icon Sprite Assets"
Cohesion: 0.48
Nodes (7): Bluesky Icon, Discord Icon, Documentation Icon, GitHub Icon, Social Icon, Icon Sprite Sheet, X Twitter Icon

### Community 30 - "Data-Flow Solver Set Operations"
Cohesion: 0.40
Nodes (5): solveDataFlow(), uDiff(), uOrder(), uSame(), uUnion()

### Community 31 - "Reveal Toggle & Button UI"
Cohesion: 0.50
Nodes (4): Reveal(), Button, ButtonProps, buttonVariants

### Community 32 - "Hero Branding Image"
Cohesion: 0.67
Nodes (4): App Branding / Hero Visual, Hero Image (Stacked Layers Logo), Isometric Stacked Rounded Squares, Purple/Violet Gradient Accent

### Community 33 - "Favicon Branding"
Cohesion: 0.50
Nodes (4): HPC Study Tool App Branding, Blurred Glow/Gradient Light Effects, Favicon Icon (Stylized Lightning/Z Glyph), Purple Lightning-Bolt Z-Shaped Glyph

### Community 34 - "React Logo Asset"
Cohesion: 0.67
Nodes (3): Atomic Orbital Symbol, React (JavaScript Library), React Logo

### Community 35 - "Vite Logo Asset"
Cohesion: 0.67
Nodes (3): Vite Build Tool, Vite Logo, Vite Scaffold Default Asset

### Community 36 - "Cross-Chapter Worked Examples"
Cohesion: 0.67
Nodes (3): Row(), ReversalDemo(), WorkedStatic()

## Ambiguous Edges - Review These
- `Code()` → `cn()`  [AMBIGUOUS]
  src/components/study/kit.tsx · relation: calls
- `sub()` → `BNode`  [AMBIGUOUS]
  src/components/study/kit.tsx · relation: shares_data_with
- `badgeVariants` → `cn()`  [AMBIGUOUS]
  src/components/ui/badge.tsx · relation: shares_data_with
- `solveDataFlow (generic iterative fixpoint solver)` → `AllLocalSetsExplorer (compare gen/kill across 4 analyses)`  [AMBIGUOUS]
  src/Chapter2_2.tsx · relation: calls

## Knowledge Gaps
- **319 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+314 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Code()` and `cn()`?**
  _Edge tagged AMBIGUOUS (relation: calls) - confidence is low._
- **What is the exact relationship between `sub()` and `BNode`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `badgeVariants` and `cn()`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `solveDataFlow (generic iterative fixpoint solver)` and `AllLocalSetsExplorer (compare gen/kill across 4 analyses)`?**
  _Edge tagged AMBIGUOUS (relation: calls) - confidence is low._
- **Why does `cn()` connect `Shared UI Helpers & Duplicates` to `Data-Flow Analysis (Ch 2.2)`, `OpenMP Synchronization Concepts`, `Optimization Case Study: Quicksort (Ch 2.3e)`, `Control-Flow Graphs & Dominators (Ch 2)`, `Chapter Study-Tool Components`, `OpenMP Tasking Model (Ch 5.3)`, `Dependence Vector Solver (Ch 3.4)`, `Vectorization & Code Generation (Ch 3.2)`, `Copy Propagation (Ch 2.3b)`, `Data Dependence Graphs (Ch 3)`, `Loop Transformation Legality (Ch 4)`, `Loop-Invariant Code Motion (Ch 2.3c)`, `Array Dependence Testing (Ch 3.3)`, `Loop Interchange (Ch 4.4)`, `Loop Fusion (Ch 4.2)`, `Loop Skewing & Distance Vectors (Ch 4.7)`, `Loop Tiling for Matrix Multiply (Ch 4.9)`, `Shared BlockGraph Kit Component`, `Chapter Selector & Card UI`, `Reveal Toggle & Button UI`, `Cross-Chapter Worked Examples`, `Unified Solver Panel (Ch 2.2)`, `Misc Local State (Ch 2.2)`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `Card` connect `OpenMP Synchronization Concepts` to `Data-Flow Analysis (Ch 2.2)`, `Optimization Case Study: Quicksort (Ch 2.3e)`, `Control-Flow Graphs & Dominators (Ch 2)`, `Chapter Study-Tool Components`, `Dependence Vector Solver (Ch 3.4)`, `Vectorization & Code Generation (Ch 3.2)`, `Copy Propagation (Ch 2.3b)`, `Data Dependence Graphs (Ch 3)`, `Loop Transformation Legality (Ch 4)`, `Loop-Invariant Code Motion (Ch 2.3c)`, `Array Dependence Testing (Ch 3.3)`, `Loop Distribution (Ch 4.3)`, `Shared UI Helpers & Duplicates`, `Loop Interchange (Ch 4.4)`, `Loop Fusion (Ch 4.2)`, `Loop Skewing & Distance Vectors (Ch 4.7)`, `Loop Tiling for Matrix Multiply (Ch 4.9)`, `Induction Variable Detection (Ch 2.3d)`, `Common Subexpression Elimination (Ch 2.3a)`, `Shared BlockGraph Kit Component`, `Chapter Selector & Card UI`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `CardContent` connect `Chapter Selector & Card UI` to `Data-Flow Analysis (Ch 2.2)`, `OpenMP Synchronization Concepts`, `Optimization Case Study: Quicksort (Ch 2.3e)`, `Control-Flow Graphs & Dominators (Ch 2)`, `Chapter Study-Tool Components`, `Dependence Vector Solver (Ch 3.4)`, `Vectorization & Code Generation (Ch 3.2)`, `Copy Propagation (Ch 2.3b)`, `Data Dependence Graphs (Ch 3)`, `Loop Transformation Legality (Ch 4)`, `Loop-Invariant Code Motion (Ch 2.3c)`, `Array Dependence Testing (Ch 3.3)`, `Loop Distribution (Ch 4.3)`, `Shared UI Helpers & Duplicates`, `Loop Interchange (Ch 4.4)`, `Loop Fusion (Ch 4.2)`, `Loop Skewing & Distance Vectors (Ch 4.7)`, `Loop Tiling for Matrix Multiply (Ch 4.9)`, `Induction Variable Detection (Ch 2.3d)`, `Common Subexpression Elimination (Ch 2.3a)`, `Shared BlockGraph Kit Component`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._