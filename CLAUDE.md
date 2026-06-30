# HPC Study Tool — project guide

Interactive study materials for the University of Bayreuth HPC course (Summer 2026).
React 19 + TypeScript + Vite + Tailwind v4. Each course chapter is one self-contained
component file (`src/ChapterN.tsx`) wired into `src/App.tsx` and `src/ChapterSelect.tsx`.

## The study framework (follow this for every section)

Each chapter/section is built in **two parts**, exposed as tabbed sections plus a final
Questions tab.

### 1. Explain the section in detail, interactively
- Break the source material (lecture PDF) into focused **tabs**, one concept group per tab.
- Each tab is a stack of `Card`s with clear prose explaining *what is happening and why*.
- Prefer **interactive examples** over static text wherever the concept is procedural or
  visual: use `Stepper` for step-by-step derivations, and inline diagrams (e.g. an SVG
  `FlowGraph` for control-flow graphs, dominator trees, loops) the learner can step through
  or click. Three-address code, CFGs, dominator trees etc. should be *shown and walked*,
  not just described.
- Reuse the shared presentational helpers (`Pre`, `Code`, `Formula`, `Step`, `Table`,
  `Panel`, `Tag`, `Stepper`). Keep dark-mode support and the pill tab nav consistent with
  existing chapters.

### 2. Questions tab (exam practice)
- **Exactly 5 questions**, ordered **easy → hardest**.
- **Question 1 is always a fully worked example** that illustrates the problem type for the
  rest — its solution is shown/revealed to set the pattern.
- Questions are **long, written-exam style** (construct/derive/prove), **not multiple choice**.
- Each question is an **expandable** card (collapsed by default, except the worked example
  which may default open).
- Each solution is **hidden behind a "Reveal solution" toggle**. Solutions should be
  detailed and, where it helps, themselves interactive/visual (tables, diagrams, steppers).

## Conventions
- Self-contained chapter file; redefine small helpers locally if needed (matches existing
  `Chapter3.tsx`). UI primitives live in `src/components/ui/`.
- Theme tokens are CSS vars from `src/index.css` (`var(--color-foreground)` etc.); use them
  in SVG so diagrams respect light/dark mode.
- Run `bun run build` (tsc + vite) to typecheck before declaring done.
