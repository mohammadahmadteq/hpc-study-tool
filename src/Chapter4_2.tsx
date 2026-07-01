import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'
import {
  Code,
  Pre,
  Formula,
  Step,
  Table,
  Panel,
  Good,
  Bad,
  Tag,
  Stepper,
  FlowGraph,
  QuestionCard,
  StudyShell,
  sub,
  type GNode,
  type GEdge,
  type Fill,
  type StepPanel,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 4 · §4.2 — Loop Fusion   (PDF 185–189)
 *  Combining adjacent loops with the same bounds into one loop:
 *  the idea + advantages/drawback, the three legality conditions,
 *  the dependence trap (body-2 → body-1), and peeling → fusion.
 * ------------------------------------------------------------------ */

/* ================================================================== *
 *  Tab 1 · What & why  (the observation + advantages / drawback)
 * ================================================================== */

const FuseToggle: React.FC = () => {
  const [fused, setFused] = useState(false)
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" variant={fused ? 'outline' : 'default'} onClick={() => setFused(false)}>
          two loops
        </Button>
        <Button size="sm" variant={fused ? 'default' : 'outline'} onClick={() => setFused(true)}>
          fuse ⇒
        </Button>
      </div>
      <Pre>{fused
        ? `for (i = 0; i < n; i++) {
  loop-body-1;
  loop-body-2;
}`
        : `for (i = 0; i < n; i++)
  loop-body-1;
for (i = 0; i < n; i++)
  loop-body-2;`}</Pre>
      <Panel className="text-sm leading-relaxed">
        {fused ? (
          <>
            <Good>Fused.</Good> The two bodies now run inside <strong>one</strong> loop header, so each index{' '}
            <Code>i</Code> is visited once and both bodies execute back-to-back. The loop is entered once and the counter
            is advanced once per iteration instead of twice.
          </>
        ) : (
          <>
            Two <strong>adjacent</strong> loops with the <strong>same loop bounds</strong> (<Code>i = 0 … n−1</Code>).
            Because they iterate over the exact same index range, they are candidates for fusion.
          </>
        )}
      </Panel>
    </div>
  )
}

/* --- temporal-locality visualiser: reuse distance of a[k] --------- */

const LocalityTrace: React.FC = () => {
  const n = 6
  const [k, setK] = useState(2)

  // separate: W0..W5 then R0..R5   |   fused: W0 R0 W1 R1 ...
  const sepCells = [
    ...Array.from({ length: n }, (_, i) => ({ kind: 'W' as const, idx: i })),
    ...Array.from({ length: n }, (_, i) => ({ kind: 'R' as const, idx: i })),
  ]
  const fusCells = Array.from({ length: n }, (_, i) => [
    { kind: 'W' as const, idx: i },
    { kind: 'R' as const, idx: i },
  ]).flat()

  const cell = (c: { kind: 'W' | 'R'; idx: number }, j: number) => {
    const on = c.idx === k
    return (
      <div
        key={j}
        className={cn(
          'w-8 h-8 shrink-0 rounded-md border flex items-center justify-center text-[11px] font-mono',
          on
            ? c.kind === 'W'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-amber-500/25 text-foreground border-amber-500/60'
            : 'bg-muted text-muted-foreground border-border'
        )}
      >
        {c.kind}
        <sub>{c.idx}</sub>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        track element a[k], k =
        {Array.from({ length: n }, (_, i) => (
          <button
            key={i}
            onClick={() => setK(i)}
            className={cn(
              'w-6 h-6 rounded-full border text-[11px] font-mono transition-colors',
              k === i ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            )}
          >
            {i}
          </button>
        ))}
      </div>

      <div className="text-xs font-semibold text-muted-foreground mb-1">separate loops — write everything, then read</div>
      <div className="flex flex-wrap gap-1 mb-1">{sepCells.map(cell)}</div>
      <div className="text-[13px] mb-3">
        reuse distance of <Code>a[{k}]</Code> = <Bad>{n} (= n)</Bad> — if the cache holds fewer than <Code>n</Code>{' '}
        elements, <Code>a[{k}]</Code> is evicted before loop 2 reads it ⇒ a <strong>cache miss</strong>.
      </div>

      <div className="text-xs font-semibold text-muted-foreground mb-1">fused loop — write then read, immediately</div>
      <div className="flex flex-wrap gap-1 mb-1">{fusCells.map(cell)}</div>
      <div className="text-[13px]">
        reuse distance of <Code>a[{k}]</Code> = <Good>1</Good> — the read follows the write at once, so <Code>a[{k}]</Code>{' '}
        is still in a register / L1 ⇒ a <strong>cache hit</strong>.
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: 'var(--color-primary)' }} />
        write of the tracked element ·
        <span className="inline-block w-3 h-3 rounded-sm align-middle mx-1" style={{ background: '#f59e0b' }} />
        its read. Fusion shrinks the gap between producing a value and consuming it — the essence of the locality win.
      </p>
    </div>
  )
}

const IntroSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The observation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>Loop fusion</strong> (also <em>loop jamming</em>) combines <strong>adjacent loops with the same loop
          bounds</strong> into a <strong>single loop</strong> whose body is the concatenation of the original bodies.
        </p>
        <p className="text-sm mb-3">
          Nothing about <em>what</em> is computed changes — only that both bodies now share one loop header and are
          visited together for each index <Code>i</Code>.
        </p>
        <FuseToggle />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why fuse — temporal locality</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The main payoff is <strong>temporal locality</strong>: a value produced in body-1 is consumed by body-2 in the{' '}
          <em>same</em> iteration, so it is still hot in a register or the L1 cache. Consider:
        </p>
        <Pre>{`for (i = 0; i < n; i++)  a[i] = b[i] + 1;   // producer
for (i = 0; i < n; i++)  c[i] = a[i] * 2;   // consumer`}</Pre>
        <p className="text-sm mb-3">
          Separately, all of <Code>a</Code> is streamed to memory in loop 1 and reloaded in loop 2. If <Code>a</Code> does
          not fit in cache, every reload is a miss. Fused, each <Code>a[i]</Code> is written and immediately read.
        </p>
        <LocalityTrace />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Advantages &amp; the drawback</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Panel className="my-0">
            <Tag tone="good">Advantage 1</Tag>
            <p className="text-sm mt-1.5">
              <strong>Temporal locality ↑.</strong> Memory accesses to the same data move closer together ⇒ the{' '}
              <strong>average memory access time drops</strong> on machines with a cache hierarchy.
            </p>
          </Panel>
          <Panel className="my-0">
            <Tag tone="good">Advantage 2</Tag>
            <p className="text-sm mt-1.5">
              <strong>More scalar optimization.</strong> A <strong>larger loop body</strong> gives the compiler more
              scope for CSE, register reuse, and other local optimizations across the two former bodies.
            </p>
          </Panel>
        </div>
        <Panel className="my-0">
          <Tag tone="warn">Drawback</Tag>
          <p className="text-sm mt-1.5">
            <strong>Instruction locality ↓.</strong> The bigger body may not fit as nicely in the instruction cache, so a
            few <strong>extra instruction-cache loads</strong> may be needed. This is <em>rather seldom</em> in practice.
          </p>
        </Panel>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · The three conditions
 * ================================================================== */

const CondSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">When may we fuse? Three conditions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">Loop fusion is legal only when <strong>all three</strong> conditions hold:</p>
        <Step n="1">
          <strong>The data dependences are preserved.</strong> Fusion may not change the order in which any dependent
          pair executes. This is the subtle one — see the next tab.
        </Step>
        <Step n="2">
          <strong>The loops are adjacent and compatible.</strong> They must have the <strong>same number of
          iterations</strong>, and that number must be <strong>known at compile time</strong>. If the counts differ,{' '}
          <strong>loop peeling</strong> on the loop with the <em>larger</em> count can equalise them.
        </Step>
        <Step n="3">
          <strong>The induction variables are adjusted</strong> if they are not already identical, so a single shared
          counter drives both bodies.
        </Step>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why dependences are the hard part</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Before fusion, with two separate loops and no enclosing loop, a dependence between the bodies can only run{' '}
          <strong>one way</strong>: from body-1 to body-2 (body-1 runs entirely first).
        </p>
        <div className="grid sm:grid-cols-2 gap-3 items-center">
          <Panel className="my-0 text-sm leading-relaxed">
            <div className="font-semibold mb-1">before — two loops</div>
            body-1 finishes completely, <em>then</em> body-2 begins. Any dependence points{' '}
            <Code>body-1 → body-2</Code> only.
          </Panel>
          <Panel className="my-0 text-sm leading-relaxed">
            <div className="font-semibold mb-1">after — one loop</div>
            all statements share the loop, so at iteration <Code>i</Code> body-2 can now depend on body-1 of a{' '}
            <em>later</em> iteration ⇒ a new <Code>body-2 → body-1</Code> dependence becomes possible.
          </Panel>
        </div>
        <p className="text-sm mt-3">
          That freshly-created <Code>body-2 → body-1</Code> direction is exactly what can make fusion{' '}
          <Bad>illegal</Bad>. When a body-2 statement reads an array element that a body-1 statement writes in a{' '}
          <em>later</em> iteration, fusion makes the read see the <strong>old</strong> value.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Condition 2 in one picture — peel to line up the bounds</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          If one loop runs one more iteration than the other, split that extra iteration off with{' '}
          <strong>loop peeling</strong> (§4.1). After peeling, both loops have the same trip count and fusion can proceed
          — this is why peeling and fusion are usually taught together.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">incompatible (99 vs 98)</div>
            <Pre>{`for (i=1; i<=99; i++) ...   // 99 iters
for (i=1; i<=98; i++) ...   // 98 iters`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after peeling the 1st of loop 1</div>
            <Pre>{`... ;                       // peeled i=1
for (i=2; i<=99; i++) ...   // 98 iters
for (i=1; i<=98; i++) ...   // 98 iters`}</Pre>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · The dependence trap  (the s1/s2/s3 example, interactive)
 * ================================================================== */

type TrapMode = 'separate' | 'first2' | 'all3'

const trapNodes: GNode[] = [
  { id: 's1', x: 46, y: 30, label: 's₁' },
  { id: 's2', x: 46, y: 96, label: 's₂' },
  { id: 's3', x: 46, y: 162, label: 's₃' },
]

const FusionTrap: React.FC = () => {
  const [mode, setMode] = useState<TrapMode>('all3')
  const N = 4 // iterations i = 0..3, arrays indexed 0..4 so c[i+1] stays in range
  const [i, setI] = useState(0)

  const fusedAll = mode === 'all3'
  // edges of the dependence graph for the chosen mode
  const edges: GEdge[] = fusedAll
    ? [
        { from: 's1', to: 's2', label: 'δᵗ', bend: -14 },
        { from: 's3', to: 's2', label: 'δᵃ', bend: 46 },
      ]
    : [
        { from: 's1', to: 's2', label: 'δᵗ', bend: -14 },
        { from: 's2', to: 's3', label: 'δᵗ', bend: -14 },
      ]
  const activeEdges = fusedAll ? ['s3->s2'] : []
  const fillOf = (id: string): Fill => (fusedAll && (id === 's2' || id === 's3') ? 'succ' : 'none')

  // which c-indices are written by the time s3 reads at iteration i
  const writtenUpTo = fusedAll ? i : N // separate / first2: loop 2 fully finished ⇒ all of c written
  const readIdx = i + 1
  const fresh = readIdx <= writtenUpTo

  return (
    <div>
      <Pre>{`for (i = 0; i < n; i++)  s1: a[i] = b[i] + 1;
for (i = 0; i < n; i++)  s2: c[i] = a[i] / 2;
for (i = 0; i < n; i++)  s3: d[i] = c[i+1] + 1;`}</Pre>

      <div className="flex flex-wrap items-center gap-2 my-3">
        {(
          [
            ['separate', 'keep 3 loops'],
            ['first2', 'fuse loops 1+2'],
            ['all3', 'fuse all three'],
          ] as [TrapMode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'text-[12px] px-2.5 py-1 rounded-full border transition-colors',
              mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="shrink-0">
          <FlowGraph
            nodes={trapNodes}
            edges={edges}
            width={140}
            height={200}
            maxW={150}
            fillOf={fillOf}
            activeEdges={activeEdges}
            caption={fusedAll ? 'fused: s₃ δᵃ s₂ appears' : 's₁ δᵗ s₂ , s₂ δᵗ s₃'}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            array <Code>c</Code> — value read by <Code>s₃</Code> at iteration i = {i}
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {Array.from({ length: N + 1 }, (_, j) => {
              const written = j <= writtenUpTo
              const isRead = j === readIdx
              return (
                <div
                  key={j}
                  className={cn(
                    'w-9 h-9 rounded-md border flex flex-col items-center justify-center text-[10px] font-mono',
                    written ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-muted border-border text-muted-foreground',
                    isRead && (fresh ? 'ring-2 ring-emerald-500' : 'ring-2 ring-red-500')
                  )}
                >
                  <span>c{sub(String(j))}</span>
                  <span className="text-[8px]">{written ? 'set' : '—'}</span>
                </div>
              )
            })}
          </div>

          {fusedAll ? (
            <div className="flex items-center gap-2 mb-2">
              <Button size="sm" variant="outline" onClick={() => setI((p) => Math.max(0, p - 1))} disabled={i === 0}>
                ← prev i
              </Button>
              <span className="text-xs text-muted-foreground">iteration i = {i}</span>
              <Button size="sm" variant="outline" onClick={() => setI((p) => Math.min(N - 1, p + 1))} disabled={i === N - 1}>
                next i →
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mb-2">
              loops 1{mode === 'first2' ? ' & 2 are fused and' : ' – 2'} finish before loop 3 starts, so all of{' '}
              <Code>c</Code> is already written when <Code>s₃</Code> reads.
            </p>
          )}

          <Panel className="my-0 text-sm leading-relaxed">
            <Code>s₃</Code> reads <Code>c[{readIdx}]</Code>.{' '}
            {fresh ? (
              <>
                <Good>Fresh.</Good> It was already written by <Code>s₂</Code> ⇒ the value is correct.
              </>
            ) : (
              <>
                <Bad>Stale.</Bad> <Code>s₂</Code> writes <Code>c[{readIdx}]</Code> only at iteration {readIdx} (later), so
                the read gets the <strong>old</strong> value — the result is wrong.
              </>
            )}
          </Panel>
        </div>
      </div>

      <Panel className="text-sm leading-relaxed mt-3">
        {mode === 'separate' && (
          <>
            <Good>Correct.</Good> Three separate loops. <Code>s₂</Code> writes the whole array <Code>c</Code> before{' '}
            <Code>s₃</Code> reads any of it, so every <Code>c[i+1]</Code> is fresh. Dependences:{' '}
            <Code>s₁ δᵗ s₂</Code> and <Code>s₂ δᵗ s₃</Code>.
          </>
        )}
        {mode === 'first2' && (
          <>
            <Good>Correct.</Good> Fusing loops 1 and 2 keeps <Code>a[i]</Code> written-then-read in one iteration (
            <Code>s₁ δᵗ s₂</Code> preserved), and loop 3 still runs afterwards over the fully-built <Code>c</Code>. This
            is the <strong>legal</strong> fusion.
          </>
        )}
        {mode === 'all3' && (
          <>
            <Bad>Incorrect.</Bad> Fusing all three makes <Code>s₃</Code> read <Code>c[i+1]</Code> before <Code>s₂</Code>{' '}
            writes it. The flow dependence <Code>s₂ δᵗ s₃</Code> flips into a backward, loop-carried anti-dependence{' '}
            <Code>s₃ δᵃ s₂</Code> — the forbidden <Code>body-2 → body-1</Code> direction. Fusing all three loops is{' '}
            <strong>wrong</strong>; fuse only the first two.
          </>
        )}
      </Panel>
    </div>
  )
}

const TrapSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The dependence trap</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Here are three adjacent loops. Two of them can be fused safely; fusing <em>all three</em> silently changes the
          result. The difference is a single forward array reference, <Code>c[i+1]</Code>.
        </p>
        <p className="text-sm">
          Pick how much to fuse, then step through the iterations and watch whether <Code>s₃</Code> reads a{' '}
          <Good>fresh</Good> or a <Bad>stale</Bad> value of <Code>c</Code>.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fuse and trace</CardTitle>
      </CardHeader>
      <CardContent>
        <FusionTrap />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The rule to remember</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Fusion', 'Dependences', 'Verdict']}
          rows={[
            [
              <>separate loops</>,
              <><Code>s₁ δᵗ s₂</Code>, <Code>s₂ δᵗ s₃</Code></>,
              <Good>reference (correct)</Good>,
            ],
            [
              <>fuse loops 1 &amp; 2</>,
              <><Code>s₁ δᵗ s₂</Code> preserved</>,
              <Good>legal</Good>,
            ],
            [
              <>fuse all three</>,
              <><Code>s₁ δᵗ s₂</Code>, <Code>s₃ δᵃ s₂</Code> (new backward dep)</>,
              <Bad>illegal</Bad>,
            ],
          ]}
        />
        <p className="text-sm mt-1">
          A body-2 statement that reads <Code>x[i+1]</Code> (a value body-1 produces <em>later</em>) is the classic
          fusion-breaker. Check every cross-body array subscript before you jam the loops together.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 4 · Peel then fuse  (the 99 / 98 worked example)
 * ================================================================== */

const AlignBars: React.FC = () => {
  const [peeled, setPeeled] = useState(false)
  const scale = 2.6
  const bar = (lo: number, len: number, tone: string) => (
    <div
      className={cn('h-6 rounded-md border flex items-center justify-center text-[10px] font-mono px-1', tone)}
      style={{ width: len * scale }}
    >
      i = {lo} … {lo + len - 1}
    </div>
  )
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" variant={peeled ? 'outline' : 'default'} onClick={() => setPeeled(false)}>
          original
        </Button>
        <Button size="sm" variant={peeled ? 'default' : 'outline'} onClick={() => setPeeled(true)}>
          after peeling loop 1
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-muted-foreground">loop 1</span>
          {peeled && (
            <div className="h-6 w-10 rounded-md border border-primary bg-primary/15 flex items-center justify-center text-[10px] font-mono">
              a[1]
            </div>
          )}
          {peeled ? bar(2, 98, 'bg-emerald-500/15 border-emerald-500/50') : bar(1, 99, 'bg-emerald-500/15 border-emerald-500/50')}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-muted-foreground">loop 2</span>
          {peeled && <div className="w-10 shrink-0" />}
          {bar(1, 98, 'bg-amber-500/15 border-amber-500/50')}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        {peeled ? (
          <>
            <span className="text-primary font-medium">a[1] peeled off</span> — both loops now run{' '}
            <strong>98 iterations</strong> and their bars line up. Ready to fuse.
          </>
        ) : (
          <>
            Loop 1 runs <strong>99</strong> iterations, loop 2 runs <strong>98</strong> — the bars differ by one, so
            fusion is blocked by condition&nbsp;2.
          </>
        )}
      </p>
    </div>
  )
}

const peelFuseSteps: StepPanel[] = [
  {
    title: '0 · Two loops with different trip counts',
    body: (
      <>
        <Pre>{`for (i = 1; i <= 99; i++)          // 99 iterations
  a[i] = b[i] + 1;
for (i = 1; i <= 98; i++)          // 98 iterations
  c[i] = 2 * a[i+1];`}</Pre>
        <p className="text-sm">
          Loop 2 reads <Code>a[i+1]</Code>, produced by loop 1. We would like to fuse them for locality, but the trip
          counts are <strong>99 vs 98</strong> — condition 2 fails.
        </p>
      </>
    ),
  },
  {
    title: '1 · Peel the loop with the larger count',
    body: (
      <>
        <p className="text-sm mb-1">
          Apply <strong>loop peeling</strong> to loop 1 (the longer one). Split off its <strong>first</strong> iteration{' '}
          <Code>i = 1</Code>:
        </p>
        <Pre>{`a[1] = b[1] + 1;                   // peeled
for (i = 2; i <= 99; i++)          // 98 iterations
  a[i] = b[i] + 1;
for (i = 1; i <= 98; i++)          // 98 iterations
  c[i] = 2 * a[i+1];`}</Pre>
        <p className="text-sm">Both loops now run exactly 98 times — condition 2 is satisfied.</p>
      </>
    ),
  },
  {
    title: '2 · Adjust the induction variables',
    body: (
      <>
        <p className="text-sm mb-1">
          The two loops still use different index ranges (<Code>2 … 99</Code> vs <Code>1 … 98</Code>). Introduce one
          shared counter <Code>ib = 0 … 97</Code> and express each original index from it (condition 3):
        </p>
        <Formula>{`loop 1:  i = ib + 2     (2 … 99)
loop 2:  i = ib + 1     (1 … 98)`}</Formula>
        <p className="text-sm">Now a single header can drive both bodies.</p>
      </>
    ),
  },
  {
    title: '3 · Fuse',
    body: (
      <>
        <Pre>{`a[1] = b[1] + 1;
for (ib = 0; ib <= 97; ib++) {
  i = ib + 2;  a[i] = b[i] + 1;
  i = ib + 1;  c[i] = 2 * a[i+1];
}`}</Pre>
        <p className="text-sm">
          This is exactly the resulting loop nest from the lecture. One header, both bodies, 98 iterations.
        </p>
      </>
    ),
  },
  {
    title: '4 · Why it is legal',
    body: (
      <>
        <p className="text-sm mb-1">
          In the fused body, loop 2 reads <Code>a[i+1] = a[ib+2]</Code>, and loop 1 writes <Code>a[ib+2]</Code>{' '}
          <em>just above it in the same iteration</em>:
        </p>
        <Formula>{`iteration ib:
  write a[ib+2]      (loop-1 body)
  read  a[ib+2]      (loop-2 body, as a[i+1])   ← write-before-read ✓`}</Formula>
        <Panel className="text-sm leading-relaxed">
          <Good>Preserved.</Good> Every read of <Code>a[i+1]</Code> sees the value produced earlier in the same fused
          iteration — the same value the original separate loops would have used. The peeled <Code>a[1]</Code> is never
          read by loop 2; it existed only to balance the counts.
        </Panel>
      </>
    ),
  },
]

const PeelSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Peeling opens the door to fusion</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          When two otherwise-fusable loops differ by one iteration, <strong>loop peeling</strong> equalises their trip
          counts, then the induction variables are adjusted so a single loop can carry both bodies. Watch the bars line
          up:
        </p>
        <AlignBars />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — peel, adjust, fuse</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={peelFuseSteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Which iteration to peel matters</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          We peeled the <strong>first</strong> iteration on purpose. Because loop 2 reads <Code>a[i+1]</Code> (a{' '}
          <em>forward</em> reference), the producer must run before the consumer <em>inside</em> the fused iteration.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Panel className="my-0 text-sm leading-relaxed">
            <Tag tone="good">peel first (i = 1)</Tag>
            <p className="mt-1.5">
              Shifting loop 1 to <Code>i = ib+2</Code> aligns the write <Code>a[ib+2]</Code> just before the read{' '}
              <Code>a[ib+2]</Code> — write-before-read. <Good>Legal.</Good>
            </p>
          </Panel>
          <Panel className="my-0 text-sm leading-relaxed">
            <Tag tone="bad">peel last (i = 99)</Tag>
            <p className="mt-1.5">
              Both loops keep index <Code>i</Code>, so <Code>c[i] = 2·a[i+1]</Code> would read <Code>a[i+1]</Code> before
              the next iteration writes it — the old value. <Bad>Illegal.</Bad>
            </p>
          </Panel>
        </div>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 5 · Questions  (exactly 5, easy → hardest, Q1 fully worked)
 * ================================================================== */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on §4.2, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Fuse two loops and justify legality"
      statement={
        <>
          <p className="mb-2">
            Fuse the two loops below. State the dependence between the bodies, confirm it is preserved, and name the
            advantage.
          </p>
          <Pre>{`for (i = 0; i < n; i++)  a[i] = b[i] + 1;
for (i = 0; i < n; i++)  c[i] = a[i] * 2;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Conditions 2 &amp; 3.</strong> Both loops iterate <Code>i = 0 … n−1</Code> — same, compile-time trip
            count, same induction variable. Nothing to peel or rename.
          </p>
          <p className="text-sm mb-1">
            <strong>Condition 1 — dependence.</strong> The second body reads <Code>a[i]</Code>, which the first body
            writes at the <em>same</em> index: a flow dependence <Code>s₁ δᵗ s₂</Code> with distance 0.
          </p>
          <p className="text-sm mb-1"><strong>Fuse:</strong></p>
          <Pre>{`for (i = 0; i < n; i++) {
  a[i] = b[i] + 1;
  c[i] = a[i] * 2;
}`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Legal:</Good> in the fused body <Code>a[i]</Code> is written by the first statement and read by the
            second in the same iteration, so the source still precedes the target — the dependence is preserved.{' '}
            <Good>Advantage:</Good> <Code>a[i]</Code> is produced and immediately consumed (still in a register / L1
            instead of streamed to memory and reloaded) ⇒ better <strong>temporal locality</strong>, plus half the loop
            overhead and a larger body for scalar optimization.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Fuse loops that share a read — advantage and drawback"
      statement={
        <>
          <p className="mb-2">
            May these two loops be fused? Do it, then state the <strong>advantage</strong> and the one{' '}
            <strong>drawback</strong> of loop fusion.
          </p>
          <Pre>{`for (i = 0; i < n; i++)  y[i] = x[i] + 1;
for (i = 0; i < n; i++)  z[i] = x[i] - 1;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Same bounds, same induction variable. The bodies write <em>different</em> arrays (<Code>y</Code>,{' '}
            <Code>z</Code>) and only <em>read</em> <Code>x</Code> — there is <strong>no</strong> dependence between them,
            so no ordering constraint is at risk. Fuse:
          </p>
          <Pre>{`for (i = 0; i < n; i++) {
  y[i] = x[i] + 1;
  z[i] = x[i] - 1;
}`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Advantage:</Good> <Code>x[i]</Code> is loaded once and used by both statements (it was loaded twice
            before — once per loop) ⇒ better temporal locality, and the loop overhead is paid once.{' '}
            <Tag tone="warn">Drawback:</Tag> the body is larger, so instruction locality can drop — on a machine with a
            small instruction cache a few extra instruction-cache loads may result (seldom in practice).
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Which loops may be fused? (the c[i+1] trap)"
      statement={
        <>
          <p className="mb-2">
            Decide which of these three loops may be fused. Give the dependences before and after, and justify.
          </p>
          <Pre>{`for (i = 0; i < n; i++)  s1: a[i] = b[i] + 1;
for (i = 0; i < n; i++)  s2: c[i] = a[i] / 2;
for (i = 0; i < n; i++)  s3: d[i] = c[i+1] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Before (three separate loops):</strong> <Code>s₁ δᵗ s₂</Code> (<Code>s₂</Code> reads <Code>a[i]</Code>{' '}
            at the same index) and <Code>s₂ δᵗ s₃</Code> (loop 2 writes <em>all</em> of <Code>c</Code>, then loop 3 reads
            it — every <Code>c[i+1]</Code> is fresh).
          </p>
          <p className="text-sm mb-1">
            <strong>Fuse loops 1 &amp; 2 — legal.</strong> <Code>a[i]</Code> is written then read in one iteration (
            <Code>s₁ δᵗ s₂</Code> preserved), and loop 3 still runs afterwards over the finished <Code>c</Code>.
          </p>
          <p className="text-sm mb-1">
            <strong>Fuse all three — illegal.</strong> At iteration <Code>i</Code>, <Code>s₃</Code> reads{' '}
            <Code>c[i+1]</Code>, but <Code>s₂</Code> writes <Code>c[i+1]</Code> only at iteration <Code>i+1</Code>{' '}
            (later). So <Code>s₃</Code> gets the <strong>old</strong> value: the flow dep <Code>s₂ δᵗ s₃</Code> becomes a
            backward loop-carried anti-dependence <Code>s₃ δᵃ s₂</Code> (a <Code>body-2 → body-1</Code> dependence).
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Answer:</Good> fuse loops 1 and 2 only; leave loop 3 separate. The forward reference{' '}
            <Code>c[i+1]</Code> is what breaks the full fusion.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Peel, adjust induction variables, and fuse"
      statement={
        <>
          <p className="mb-2">
            The two loops below have different trip counts. Make them fusable and give the final fused code with the
            induction variables adjusted. Argue the fusion is legal.
          </p>
          <Pre>{`for (i = 1; i <= 99; i++)  a[i] = b[i] + 1;
for (i = 1; i <= 98; i++)  c[i] = 2 * a[i+1];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Condition 2 fails</strong> (99 vs 98 iterations). Peel the <em>first</em> iteration off the larger
            loop:
          </p>
          <Pre>{`a[1] = b[1] + 1;                 // peeled
for (i = 2; i <= 99; i++)  a[i] = b[i] + 1;   // 98
for (i = 1; i <= 98; i++)  c[i] = 2*a[i+1];   // 98`}</Pre>
          <p className="text-sm mb-1">
            <strong>Adjust induction variables</strong> to a common <Code>ib = 0 … 97</Code>: loop 1 uses{' '}
            <Code>i = ib+2</Code>, loop 2 uses <Code>i = ib+1</Code>. <strong>Fuse:</strong>
          </p>
          <Pre>{`a[1] = b[1] + 1;
for (ib = 0; ib <= 97; ib++) {
  i = ib + 2;  a[i] = b[i] + 1;
  i = ib + 1;  c[i] = 2 * a[i+1];
}`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Legal:</Good> loop 2 reads <Code>a[i+1] = a[ib+2]</Code>, which loop 1 writes just above in the same
            iteration ⇒ write-before-read, so the read sees the same value as in the original separate loops. The peeled{' '}
            <Code>a[1]</Code> is not read by loop 2; it only equalised the trip counts.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Why peel the first iteration, not the last?"
      statement={
        <>
          <p className="mb-2">Using the same loop pair as Q4:</p>
          <Pre>{`for (i = 1; i <= 99; i++)  a[i] = b[i] + 1;
for (i = 1; i <= 98; i++)  c[i] = 2 * a[i+1];`}</Pre>
          <p className="mb-0">
            (a) Show that peeling the <strong>last</strong> iteration of the longer loop does <em>not</em> yield a correct
            fusion. (b) State the final (correct) fused code and prove every data dependence is preserved.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a) Peel the last iteration.</strong> Splitting off <Code>i = 99</Code> leaves both loops at{' '}
            <Code>i = 1 … 98</Code> with the <em>same</em> index variable, so a naive fusion is:
          </p>
          <Pre>{`for (i = 1; i <= 98; i++) {
  a[i] = b[i] + 1;
  c[i] = 2 * a[i+1];   // reads a[i+1]
}
a[99] = b[99] + 1;`}</Pre>
          <p className="text-sm mb-1">
            For <Code>i = 1 … 97</Code>, <Code>c[i]</Code> reads <Code>a[i+1]</Code>, but that element is written by the
            <Code> a</Code>-statement of the <em>next</em> iteration <Code>(i+1)</Code>, which has not run yet ⇒{' '}
            <Bad>old value</Bad>. (Also <Code>c[98]</Code> needs <Code>a[99]</Code>, produced only after the loop.) This
            is the backward <Code>body-2 → body-1</Code> dependence again — <Bad>incorrect</Bad>.
          </p>
          <p className="text-sm mb-1">
            The forward reference <Code>a[i+1]</Code> forces the producer to run <em>before</em> the consumer within the
            fused iteration. Only peeling the <strong>first</strong> iteration and shifting loop 1 to <Code>i = ib+2</Code>{' '}
            achieves that alignment.
          </p>
          <p className="text-sm mb-1"><strong>(b) Correct fused code:</strong></p>
          <Pre>{`a[1] = b[1] + 1;
for (ib = 0; ib <= 97; ib++) {
  i = ib + 2;  a[i] = b[i] + 1;    // writes a[ib+2]
  i = ib + 1;  c[i] = 2 * a[i+1];  // reads  a[ib+2]
}`}</Pre>
          <Table
            head={['Read in loop 2', 'Produced by', 'When', 'Preserved?']}
            rows={[
              [<Code>a[i+1] = a[ib+2]</Code>, <><Code>a[ib+2] = b[ib+2]+1</Code></>, <>same iteration, one line earlier</>, <Good>✓ write-before-read</Good>],
              [<><Code>a[1]</Code> (peeled)</>, <>peeled statement</>, <>before the loop</>, <Good>✓ (never read by loop 2)</Good>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Proof complete:</Good> every read of <Code>a[i+1]</Code> resolves to <Code>a[ib+2]</Code>, written one
            statement earlier in the same iteration — identical to the value the original loops used. No dependence is
            reversed, so the fusion is legal.
          </Panel>
        </>
      }
    />
  </div>
)

/* ================================================================== *
 *  Root
 * ================================================================== */

const tabs: TabDef[] = [
  { id: 'intro', label: 'What & why', render: () => <IntroSection /> },
  { id: 'cond', label: 'Conditions', render: () => <CondSection /> },
  { id: 'trap', label: 'The dependence trap', render: () => <TrapSection /> },
  { id: 'peel', label: 'Peel then fuse', render: () => <PeelSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function LoopFusionStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 4 · §4.2 · Loop Fusion"
      title="Loop Fusion"
      subtitle="Adjacent loops with the same bounds can be combined into one loop, improving temporal locality — as long as every data dependence is preserved. This section covers the idea and its trade-offs, the three legality conditions, the dependence trap that makes naive fusion wrong, and peeling loops into fusable shape."
      tabs={tabs}
    />
  )
}
