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
