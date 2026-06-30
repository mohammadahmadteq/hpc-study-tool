# Graph Report - .  (2026-06-30)

## Corpus Check
- Corpus is ~25,219 words - fits in a single context window. You may not need a graph.

## Summary
- 286 nodes · 343 edges · 20 communities (16 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.82)
- Token cost: 126,789 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Chapter 2.2 Data Flow Analysis|Chapter 2.2: Data Flow Analysis]]
- [[_COMMUNITY_Chapter 2 Control Flow & Dominators|Chapter 2: Control Flow & Dominators]]
- [[_COMMUNITY_Chapter 3 Data Dependence & Parallelism|Chapter 3: Data Dependence & Parallelism]]
- [[_COMMUNITY_Dev Dependencies & Build Tooling|Dev Dependencies & Build Tooling]]
- [[_COMMUNITY_Study Framework & Project Architecture|Study Framework & Project Architecture]]
- [[_COMMUNITY_App TypeScript Config|App TypeScript Config]]
- [[_COMMUNITY_Node TypeScript Config|Node TypeScript Config]]
- [[_COMMUNITY_App Shell & Card UI|App Shell & Card UI]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Social Icon Sprite Sheet|Social Icon Sprite Sheet]]
- [[_COMMUNITY_Hero Branding Visual|Hero Branding Visual]]
- [[_COMMUNITY_Favicon Branding|Favicon Branding]]
- [[_COMMUNITY_React Logo Asset|React Logo Asset]]
- [[_COMMUNITY_Vite Logo Asset|Vite Logo Asset]]
- [[_COMMUNITY_Root TypeScript Config|Root TypeScript Config]]
- [[_COMMUNITY_FlowGraph Geometry Helpers|FlowGraph Geometry Helpers]]
- [[_COMMUNITY_Set Helpers (S, SetT)|Set Helpers (S, SetT)]]
- [[_COMMUNITY_FlowGraph Geometry Helpers (2)|FlowGraph Geometry Helpers (2)]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `cn()` - 15 edges
3. `compilerOptions` - 15 edges
4. `React + TypeScript + Vite Template` - 6 edges
5. `Icon Sprite Sheet` - 6 edges
6. `scripts` - 5 edges
7. `Badge()` - 5 edges
8. `Button` - 5 edges
9. `Card` - 5 edges
10. `CardHeader` - 5 edges

## Surprising Connections (you probably didn't know these)
- `src/main.tsx Module Script` --references--> `React 19`  [INFERRED]
  index.html → CLAUDE.md
- `index.html Entry Point` --conceptually_related_to--> `React + TypeScript + Vite Template`  [INFERRED]
  index.html → README.md
- `React + TypeScript + Vite Template` --conceptually_related_to--> `Vite`  [EXTRACTED]
  README.md → CLAUDE.md
- `Panel()` --calls--> `cn()`  [EXTRACTED]
  src/Chapter2.tsx → src/lib/utils.ts
- `QuestionCard()` --calls--> `cn()`  [EXTRACTED]
  src/Chapter2.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Project Tech Stack** — claudemd_react, claudemd_typescript, claudemd_vite, claudemd_tailwind [EXTRACTED 0.90]
- **App Bootstrap Flow** — index_html_entry, index_html_main_tsx, index_html_root [EXTRACTED 0.85]
- **Interactive Learning Components** — claudemd_interactive_examples, claudemd_stepper, claudemd_flowgraph, claudemd_ui_primitives [EXTRACTED 0.80]

## Communities (20 total, 4 thin omitted)

### Community 0 - "Chapter 2.2: Data Flow Analysis"
Cohesion: 0.04
Nodes (31): availSteps, caseSteps, D, diaAllowNodes, diaEdges, Diff, diffClass, Fill (+23 more)

### Community 1 - "Chapter 2: Control Flow & Dominators"
Cohesion: 0.04
Nodes (26): bbSteps, Diff, diffClass, DOM, domEdges, domNodes, fibEdges, fibNodes (+18 more)

### Community 2 - "Chapter 3: Data Dependence & Parallelism"
Cohesion: 0.06
Nodes (26): cn(), Panel(), QuestionCard(), Panel(), QuestionCard(), codegenSteps, methodA, methodB (+18 more)

### Community 3 - "Dev Dependencies & Build Tooling"
Cohesion: 0.09
Nodes (22): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/node, @types/react (+14 more)

### Community 4 - "Study Framework & Project Architecture"
Cohesion: 0.12
Nodes (22): bun run build (tsc + vite), Self-Contained Chapter Component, FlowGraph SVG Diagram, HPC Study Tool, Interactive Examples Principle, Questions Tab (Exam Practice), React 19, Stepper Component (+14 more)

### Community 5 - "App TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 6 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 7 - "App Shell & Card UI"
Cohesion: 0.17
Nodes (10): Chapter, chapters, ChapterSelectProps, Section, Card, CardContent, CardDescription, CardFooter (+2 more)

### Community 8 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (9): dependencies, class-variance-authority, clsx, lucide-react, react, react-dom, tailwind-merge, tailwindcss (+1 more)

### Community 9 - "Social Icon Sprite Sheet"
Cohesion: 0.48
Nodes (7): Bluesky Icon, Discord Icon, Documentation Icon, GitHub Icon, Social Icon, Icon Sprite Sheet, X Twitter Icon

### Community 10 - "Hero Branding Visual"
Cohesion: 0.67
Nodes (4): App Branding / Hero Visual, Hero Image (Stacked Layers Logo), Isometric Stacked Rounded Squares, Purple/Violet Gradient Accent

### Community 11 - "Favicon Branding"
Cohesion: 0.50
Nodes (4): HPC Study Tool App Branding, Blurred Glow/Gradient Light Effects, Favicon Icon (Stylized Lightning/Z Glyph), Purple Lightning-Bolt Z-Shaped Glyph

### Community 12 - "React Logo Asset"
Cohesion: 0.67
Nodes (3): Atomic Orbital Symbol, React (JavaScript Library), React Logo

### Community 13 - "Vite Logo Asset"
Cohesion: 0.67
Nodes (3): Vite Build Tool, Vite Logo, Vite Scaffold Default Asset

## Knowledge Gaps
- **152 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+147 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Chapter 3: Data Dependence & Parallelism` to `Chapter 2.2: Data Flow Analysis`, `Chapter 2: Control Flow & Dominators`, `Set Helpers (S, SetT)`, `App Shell & Card UI`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `Button` connect `Chapter 3: Data Dependence & Parallelism` to `Chapter 2.2: Data Flow Analysis`, `Chapter 2: Control Flow & Dominators`, `App Shell & Card UI`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Card` connect `App Shell & Card UI` to `Chapter 2.2: Data Flow Analysis`, `Chapter 2: Control Flow & Dominators`, `Chapter 3: Data Dependence & Parallelism`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _153 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chapter 2.2: Data Flow Analysis` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._
- **Should `Chapter 2: Control Flow & Dominators` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Chapter 3: Data Dependence & Parallelism` be split into smaller, more focused modules?**
  _Cohesion score 0.05603864734299517 - nodes in this community are weakly interconnected._