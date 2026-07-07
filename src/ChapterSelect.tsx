import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { BookOpen, Lock, ChevronRight } from 'lucide-react'

interface Section {
  id: string
  label: string
  title: string
  description: string
}

interface Chapter {
  number: number
  title: string
  description: string
  available: boolean
  badge?: string
  sections: Section[]
}

const chapters: Chapter[] = [
  {
    number: 1,
    title: 'Introduction to HPC',
    description: 'Memory hierarchy, cache effects, and the roofline model. Understanding performance bottlenecks.',
    available: false,
    badge: 'Coming soon',
    sections: [],
  },
  {
    number: 2,
    title: 'Program Analysis Techniques',
    description: 'Control-flow analysis and global data flow analysis — the foundation for every code optimization.',
    available: true,
    sections: [
      {
        id: '2.1',
        label: '§2.1',
        title: 'Control-flow analysis',
        description: 'Basic blocks, flow graphs, dominators, finding loops, SCCs, and reducible flow graphs.',
      },
      {
        id: '2.2',
        label: '§2.2',
        title: 'Global data flow analysis',
        description:
          'gen/kill sets, the iterative solver, reaching definitions, available expressions, live variables and very busy expressions.',
      },
      {
        id: '2.3a',
        label: '§2.3a',
        title: 'Common subexpression elimination',
        description:
          'Application 1: use available-expressions data flow + the backward-traversal replacement algorithm to remove repeated computations.',
      },
      {
        id: '2.3b',
        label: '§2.3b',
        title: 'Copy propagation',
        description:
          'Application 2: replacing x by y after x := y — the two legality conditions and the c-gen/c-kill data-flow problem.',
      },
      {
        id: '2.3c',
        label: '§2.3c',
        title: 'Loop-invariant code motion',
        description:
          'Application 3: detect invariants, insert a pre-header, and hoist safely — the two heuristic rules and the temp-variable fallback.',
      },
      {
        id: '2.3d',
        label: '§2.3d',
        title: 'Induction variables & strength reduction',
        description:
          'Application 4: the family triple (i, c, d), the detection method, and turning a loop multiply into a running addition.',
      },
      {
        id: '2.3e',
        label: '§2.3.1',
        title: 'Optimizing Quicksort (case study)',
        description:
          'The whole §2.3 pipeline applied end-to-end to Quicksort’s partition loop, block by block.',
      },
    ],
  },
  {
    number: 3,
    title: 'Data Dependence Analysis',
    description: 'Flow, anti, and output dependences, the dependence graph, iteration space & vectors, distance/direction vectors, code sinking, and turning all of that into vectorization.',
    available: true,
    sections: [
      {
        id: '3',
        label: '§3.1',
        title: 'Classification of Data Dependences',
        description:
          'Flow/anti/output dependences, address- vs value-based, the data dependence graph, iteration space & (normalised) iteration vectors, distance/direction vectors, dependence level, and code sinking.',
      },
      {
        id: '3.2',
        label: '§3.2',
        title: 'Introduction to Vectorization and Parallelization',
        description:
          'Parallel loops, vector-operation semantics, loop distribution, the SCC-based vectorize() algorithm, and the recursive multidimensional codegen() walked end-to-end on the 4-statement example.',
      },
      {
        id: '3.3',
        label: '§3.3',
        title: 'Data Dependence Analysis for Arrays',
        description:
          'Subscript-based dependence testing: build the system A·i = c from the linear index functions, add the loop-limit inequalities B·i ≤ c, and solve over the integers to exclude dependences — with user variables and extra constraints.',
      },
      {
        id: '3.4',
        label: '§3.4',
        title: 'Solving the Data Dependence System',
        description:
          'The GCD and extreme-value tests for a Diophantine equation, parametrizing the solution set, the 3ᵈ direction-vector hierarchy, and three ways to treat one equation per array dimension.',
      },
      {
        id: '3.5',
        label: 'Exam',
        title: 'Chapter 3 Exam Practice',
        description:
          'Ten written-exam problems (79 points) with full solutions and point splits, covering every concept of §3.1–§3.4 — including the original exercise-sheet questions 4.2, 4.3, 5.2 and 6.1 (dependence graphs, distance/direction, dependence systems, stepwise elimination, and codegen()).',
      },
    ],
  },
  {
    number: 4,
    title: 'Program Transformations',
    description: 'Reordering compute-intensive code (mostly loops) to run faster on the target machine, while preserving every data dependence.',
    available: true,
    sections: [
      {
        id: '4.1',
        label: '§4.1',
        title: 'Statement Reordering',
        description:
          'The legality rule (preserve all dependences), statement reordering for spatial locality with the data dependence graph, loop unswitching of invariant conditionals, and loop peeling / splitting.',
      },
      {
        id: '4.2',
        label: '§4.2',
        title: 'Loop Fusion',
        description:
          'Combining adjacent same-bound loops into one for temporal locality: advantages vs. the instruction-locality drawback, the three legality conditions, the c[i+1] dependence trap (body-2 → body-1), and peeling loops into fusable shape with adjusted induction variables.',
      },
      {
        id: '4.3',
        label: '§4.3',
        title: 'Loop Distribution (Fission)',
        description:
          'The inverse of fusion: split one loop into several for instruction-cache and data locality. Build the dependence graph, collapse cycles into strongly connected components (which must stay together), and emit one loop per SCC in topological order — with nested loops handled inside-out.',
      },
      {
        id: '4.4',
        label: '§4.4',
        title: 'Loop Interchange',
        description:
          'Swapping nested loops for parallelism or cache locality. The legality rule via direction vectors — interchange is incorrect only for (<,>) — an interactive checker, and adjusting non-rectangular (triangular) bounds with min/max so the iteration space is preserved.',
      },
      {
        id: '4.5',
        label: '§4.5',
        title: 'Loop Reversal',
        description:
          'Running a loop backward: legal only when it carries no dependence (reversal negates every distance), used as an enabler — reversing both loops turns a forward c[i+1] reference into a satisfied backward one so fusion becomes legal.',
      },
      {
        id: '4.6',
        label: '§4.6',
        title: 'Loop Skewing',
        description:
          'How normalization can manufacture the forbidden (<,>) direction and block interchange, and how skewing — (i,j) → (i, j+f·i), so (d1,d2) → (d1, d2+f·d1) — removes it. Full worked derivation of the skewed indices, bounds, and the follow-up interchange with max/min bounds.',
      },
      {
        id: '4.7',
        label: '§4.7',
        title: 'Strip Mining',
        description:
          'Split one loop into an outer block loop and an inner strip loop of size s (with min() for the partial tail) to feed a vector processor. Re-express a distance d as (d div s, d mod s), plus the boundary-crossing vector (d div s+1, d mod s−s) when d mod s ≠ 0 — shown on the iteration line.',
      },
      {
        id: '4.8',
        label: '§4.8',
        title: 'Loop Tiling',
        description:
          'Strip mining generalized to nested loops: rectangular tiles (size ts, offset to) for cache blocking. The ⌊(lo−to)/ts⌋·ts+to first/last-tile formulas cover the space exactly, distances adapt as in strip mining, and a follow-up interchange pushes the within-tile loops innermost — walked through the triangular 2-D example.',
      },
      {
        id: '4.9',
        label: '§4.9',
        title: 'Optimizing for Locality',
        description:
          'The capstone: the memory hierarchy and temporal/spatial/sequential locality; making the step-1 or loop-invariant loop innermost; the affine access model x[A·i+c] with temporal (A·d=0) and spatial reuse factors and data footprints; group reuse across multiple references; and choosing the loop order — with the matrix-multiplication case study.',
      },
      {
        id: '4.10',
        label: 'Exam',
        title: 'Chapter 4 Exam Practice',
        description:
          'Ten written-exam problems (68 points) with full solutions and point splits, covering every transformation of §4.1–§4.9 — including the original exercise-sheet questions 6.2, 7.1, 7.2, 7.3 and 8.1 (strip mining, unswitching/splitting, fusion, skewing, and tiling).',
      },
    ],
  },
  {
    number: 5,
    title: 'Introduction to OpenMP',
    description:
      'The portable standard for shared-memory parallelism: the fork–join model, parallel regions and work-sharing, scheduling, and the coordination/synchronization constructs that keep shared data correct.',
    available: true,
    sections: [
      {
        id: '5.1',
        label: '§5.1',
        title: 'Control of the parallel execution',
        description:
          'The fork–join model and SPMD execution; #pragma omp parallel with num_threads and shared/private/default clauses; runtime functions for thread ids and counts; parallel loops with static/dynamic/guided/runtime scheduling, nowait and nesting; the sections and single work-sharing constructs, syntactic abbreviations, and nested-parallelism control.',
      },
      {
        id: '5.2',
        label: '§5.2',
        title: 'Coordination and Synchronization',
        description:
          'Mutual exclusion with critical (named/unnamed) and atomic; the reduction clause and its private-copy semantics; event synchronization with barrier and the flush memory-consistency model; the master directive; simple and nestable lock variables (set/unset/test); and wall-clock timing with omp_get_wtime.',
      },
      {
        id: '5.3',
        label: '§5.3',
        title: 'Parallel Tasks',
        description:
          'Beyond regular parallel loops: hand-rolled task pools with OpenMP 2.5 (nextTask/runTask, critical); the Intel taskq/task workqueueing extensions with captureprivate; and the standardized OpenMP 3.0 task directive — firstprivate capture, untied/if clauses, taskwait, scheduling points, and the postorder-traversal correctness argument.',
      },
    ],
  },
  {
    number: 6,
    title: 'Scheduling Methods',
    description:
      'Mapping computations onto compute resources: static vs. dynamic scheduling, and instruction scheduling in depth — the machine model, list scheduling, trace scheduling, and loop scheduling via software pipelining.',
    available: true,
    sections: [
      {
        id: '6.1',
        label: '§6.1',
        title: 'Instruction Scheduling',
        description:
          'Superscalar (dynamic) vs. VLIW (static) scheduling and the formal machine model; List Scheduling with the highest-level-first heuristic; Trace Scheduling with its off-trace/join-edge compensation-code rules and code explosion; and loop scheduling via software pipelining — kernel, prologue, epilogue, and register renaming across pipeline stages.',
      },
    ],
  },
]

interface ChapterSelectProps {
  onSelect: (id: string) => void
}

export default function ChapterSelect({ onSelect }: ChapterSelectProps): React.JSX.Element {
  const [openChapter, setOpenChapter] = useState<number | null>(null)

  const handleChapterClick = (ch: Chapter) => {
    if (!ch.available) return
    if (ch.sections.length === 1) {
      onSelect(ch.sections[0].id)
    } else {
      setOpenChapter(ch.number)
    }
  }

  const active = chapters.find((c) => c.number === openChapter) ?? null

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-5 py-12 flex-1">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">HPC Study Tool</h1>
          <p className="text-muted-foreground mt-2">
            {active
              ? `Chapter ${active.number} — pick a section to study.`
              : 'Interactive study materials for High Performance Computing. Select a chapter to begin.'}
          </p>
        </div>

        {active ? (
          /* ---- Section list for the opened chapter ---- */
          <div>
            <button
              onClick={() => setOpenChapter(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              ← All chapters
            </button>

            <div className="mb-5">
              <div className="text-xs text-muted-foreground font-medium mb-0.5">Chapter {active.number}</div>
              <h2 className="text-xl font-semibold tracking-tight">{active.title}</h2>
            </div>

            <div className="space-y-3">
              {active.sections.map((sec) => (
                <Card
                  key={sec.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelect(sec.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xs font-semibold">
                        {sec.label}
                      </div>
                      <CardTitle className="text-base">{sec.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <CardDescription className="text-[13px] leading-relaxed ml-11">{sec.description}</CardDescription>
                    <div className="ml-11 mt-3">
                      <Button size="sm" onClick={() => onSelect(sec.id)}>
                        Open section →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* ---- Top-level chapter list ---- */
          <div className="space-y-3">
            {chapters.map((ch) => {
              const multi = ch.sections.length > 1
              return (
                <Card
                  key={ch.number}
                  className={ch.available ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-60'}
                  onClick={ch.available ? () => handleChapterClick(ch) : undefined}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          {ch.available ? (
                            <BookOpen className="w-4 h-4 text-foreground" />
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground font-medium mb-0.5">Chapter {ch.number}</div>
                          <CardTitle className="text-base">{ch.title}</CardTitle>
                        </div>
                      </div>
                      {ch.badge ? (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {ch.badge}
                        </Badge>
                      ) : multi ? (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {ch.sections.length} sections
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <CardDescription className="text-[13px] leading-relaxed ml-11">{ch.description}</CardDescription>
                    {ch.available && (
                      <div className="ml-11 mt-3">
                        <Button size="sm" onClick={() => handleChapterClick(ch)}>
                          {multi ? (
                            <>
                              Choose section <ChevronRight className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            'Open chapter →'
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        University of Bayreuth · Summer 2026
      </footer>
    </div>
  )
}
