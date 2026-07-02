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
      Five exam-style problems on §4.2, easy → hardest — all on <em>fresh</em> code, not the lecture examples. Q1 is
      fully worked to set the pattern; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Fuse across an anti-dependence"
      statement={
        <>
          <p className="mb-2">
            The first loop <em>reads</em> <Code>q</Code>; the second loop <em>overwrites</em> it. Check the three fusion
            conditions, name the dependence between the bodies (kind + distance), fuse, and argue every element of{' '}
            <Code>p</Code> still gets the original value of <Code>q</Code>.
          </p>
          <Pre>{`for (i = 0; i < n; i++)  p[i] = q[i] + r[i];
for (i = 0; i < n; i++)  q[i] = 0;            // reset for next phase`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Conditions 2 &amp; 3.</strong> Both loops run <Code>i = 0 … n−1</Code> with the same induction
            variable — nothing to peel or rename.
          </p>
          <p className="text-sm mb-1">
            <strong>Condition 1 — the dependence.</strong> Body 1 <em>reads</em> <Code>q[i]</Code>, body 2{' '}
            <em>writes</em> <Code>q[i]</Code> at the same index: an <strong>anti</strong>-dependence{' '}
            <Code>s₁ δᵃ s₂</Code> with distance 0. (Compare Q1s you have seen before: a flow dependence is
            write-then-read; here it is read-then-write — the legality reasoning is the same, only the direction of harm
            differs: the write must not move <em>before</em> the read.)
          </p>
          <p className="text-sm mb-1"><strong>Fuse:</strong></p>
          <Pre>{`for (i = 0; i < n; i++) {
  p[i] = q[i] + r[i];   // read q[i] …
  q[i] = 0;             // … then clobber it
}`}</Pre>
          <p className="text-sm mb-1">
            <strong>Element-by-element argument.</strong> In fused iteration <Code>i</Code> the read of{' '}
            <Code>q[i]</Code> still precedes the write of <Code>q[i]</Code> (distance 0, order kept inside the body). A
            later iteration <Code>j &gt; i</Code> reads <Code>q[j]</Code>, which no earlier fused iteration wrote —
            iteration <Code>i</Code> only zeroes <Code>q[i]</Code>. So every <Code>p[i]</Code> sees the original{' '}
            <Code>q[i]</Code>. <Good>Legal.</Good>
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Advantage:</Good> <Code>q[i]</Code> is touched twice within one iteration (read, then write) while its
            cache line is hot — before fusion the whole of <Code>q</Code> was streamed through the cache twice.{' '}
            <Good>Pattern for Q2–Q5:</Good> (i) check trip counts &amp; induction variables, (ii) find the
            body-to-body dependence with kind and distance, (iii) verify the fused body preserves its direction, (iv)
            state the locality win.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Different induction variables — repair, then fuse"
      statement={
        <>
          <p className="mb-2">
            Which of the three fusion conditions is violated here? Repair it, fuse, and state the dependence that the
            fused loop must (and does) preserve.
          </p>
          <Pre>{`for (i = 0; i < 512; i++)  h[i] = 0;
for (k = 0; k < 512; k++)  g[k] = h[k] + bias[k];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Violated: condition 3</strong> (same induction variable). Trip counts already match (512 each,
            compile-time constant — condition 2 ✓). Renaming an induction variable is always safe because its name has no
            meaning outside its loop: substitute <Code>k → i</Code>.
          </p>
          <p className="text-sm mb-1">
            <strong>Condition 1.</strong> Body 2 reads <Code>h[k] = h[i]</Code>, which body 1 writes at the same index: a
            flow dependence <Code>s₁ δᵗ s₂</Code>, distance 0. Fusing keeps write-before-read inside each iteration:
          </p>
          <Pre>{`for (i = 0; i < 512; i++) {
  h[i] = 0;
  g[i] = h[i] + bias[i];
}`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Legal.</Good> Each <Code>g[i]</Code> reads the freshly written <Code>h[i] = 0</Code> — the same value
            as in the two-loop version. (A follow-up scalar optimization could now even fold <Code>h[i]</Code> to the
            constant 0 inside the body — fusion enables it by making producer and consumer adjacent.)
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="A stencil consumer — which reference blocks fusion?"
      statement={
        <>
          <p className="mb-2">
            The second loop reads <em>two</em> neighbours of what the first loop produces. Decide whether the loops may
            be fused. If not: identify precisely which of the two references breaks it and what the broken dependence
            turns into. Would reversing both loops (running them from <Code>n−2</Code> down to 1) help?
          </p>
          <Pre>{`for (i = 1; i < n-1; i++)  s1: x[i] = w[i] * 2;
for (i = 1; i < n-1; i++)  s2: y[i] = x[i-1] + x[i+1];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Before fusion</strong> loop 1 finishes all of <Code>x</Code>, so both reads in <Code>s₂</Code> see
            fresh values: flow dependences <Code>s₁ δᵗ s₂</Code> via <Code>x[i−1]</Code> and via <Code>x[i+1]</Code>.
          </p>
          <p className="text-sm mb-1"><strong>Check each reference in a fused body:</strong></p>
          <Table
            head={['Reference', 'Producing iteration', 'Runs…', 'Verdict']}
            rows={[
              [<Code>x[i-1]</Code>, <>fused iteration <Code>i−1</Code></>, 'earlier — value already written', <Good>✓ preserved (distance +1)</Good>],
              [<Code>x[i+1]</Code>, <>fused iteration <Code>i+1</Code></>, <>later — read sees the <strong>old</strong> value</>, <Bad>✗ dependence reversed</Bad>],
            ]}
          />
          <p className="text-sm mb-1">
            The forward arm <Code>x[i+1]</Code> turns the flow dependence into a backward body-2 → body-1
            anti-dependence: <Bad>fusion is illegal</Bad>. One bad reference is enough — the good arm cannot save it.
          </p>
          <p className="text-sm mb-1">
            <strong>Reversal?</strong> Running both loops downwards swaps the roles: now <Code>x[i+1]</Code> is the
            already-computed side and <Code>x[i−1]</Code> is the not-yet-computed side — still exactly one broken arm.{' '}
            <Bad>No iteration order fixes a symmetric stencil</Bad>; the consumer genuinely needs both neighbours
            finished first.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Takeaway:</Good> fusability must be checked per <em>reference</em>, not per array. A symmetric stencil
            (<Code>i−1</Code> and <Code>i+1</Code>) can never be fused with its producer by reordering alone — the two
            loops must stay separate (or be decoupled with extra buffering, beyond §4.2).
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Trip counts off by two — peel and fuse (backward reference)"
      statement={
        <>
          <p className="mb-2">
            Make these loops fusable and give the final code. Then explain why for <em>this</em> pair — unlike for a
            forward reference such as <Code>a[i+1]</Code> — peeling the <strong>first</strong> two iterations and peeling
            the <strong>last</strong> two both lead to a correct fusion.
          </p>
          <Pre>{`for (i = 0; i <= 63; i++)  a[i] = e[i] * e[i];     // 64 iterations
for (i = 2; i <= 63; i++)  b[i] = a[i-2] + 1;      // 62 iterations`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Condition 2 fails:</strong> 64 vs 62 iterations. Peel the first two iterations (<Code>i = 0, 1</Code>)
            off loop 1 — then both loops run <Code>i = 2 … 63</Code> and even share their bounds literally, so no index
            shift is needed:
          </p>
          <Pre>{`a[0] = e[0] * e[0];            // peeled
a[1] = e[1] * e[1];            // peeled
for (i = 2; i <= 63; i++) {
  a[i]  = e[i] * e[i];
  b[i]  = a[i-2] + 1;          // reads a[i-2]
}`}</Pre>
          <p className="text-sm mb-1">
            <strong>Legality.</strong> In fused iteration <Code>i</Code>, <Code>b[i]</Code> reads <Code>a[i−2]</Code>:
            for <Code>i = 2, 3</Code> that is a peeled element (written before the loop); for <Code>i ≥ 4</Code> it was
            written by fused iteration <Code>i−2</Code>, two iterations <em>earlier</em>. Write always precedes read —
            the flow dependence (now loop-carried with distance 2) is preserved. <Good>Legal.</Good>
          </p>
          <p className="text-sm mb-1">
            <strong>Why does peeling the last two also work here?</strong> Peel <Code>i = 62, 63</Code> off loop 1
            instead: loop 1 becomes <Code>i = 0…61</Code>, loop 2 stays <Code>i = 2…63</Code>. With a common{' '}
            <Code>ib = 0…61</Code> (loop 1: <Code>i = ib</Code>, loop 2: <Code>i = ib+2</Code>) the fused body is{' '}
            <Code>a[ib] = e[ib]²; b[ib+2] = a[ib] + 1;</Code> — the read uses the value written <em>one line above in
            the same iteration</em>. Also write-before-read. <Good>Legal too.</Good>
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>The asymmetry explained:</Good> a <em>backward</em> reference (<Code>a[i−2]</Code>) means the consumer
            wants an <em>older</em> element — any alignment that keeps the producer at or ahead of the consumer works, so
            both peelings succeed. A <em>forward</em> reference (<Code>a[i+1]</Code>) wants a <em>newer</em> element —
            only shifting the producer ahead (peeling at the <strong>front</strong>) can supply it in time.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Full repair pipeline with symbolic bounds — rename, peel, shift, prove"
      statement={
        <>
          <p className="mb-2">
            All three fusion conditions fail for this pair (bounds are symbolic — reason in terms of <Code>n</Code>).
          </p>
          <Pre>{`for (i = 1; i <= n;   i++)  u[i] = f[i] + f[i-1];
for (j = 1; j <= n-1; j++)  v[j] = u[j] * u[j+1];`}</Pre>
          <p className="mb-0">
            (a) Name each violated condition and the reference that makes naive fusion dangerous. (b) Show that fusing
            after only equalising trip counts (without an index shift) is incorrect. (c) Derive the correct fused code.
            (d) Prove, read by read, that every value is the one the original program used.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1"><strong>(a) The three problems.</strong></p>
          <Table
            head={['Condition', 'Status']}
            rows={[
              ['1 · dependences preservable?', <><Code>v[j]</Code> reads <Code>u[j+1]</Code> — a <strong>forward</strong> reference: needs care</>],
              ['2 · equal trip counts?', <><Bad>✗</Bad> <Code>n</Code> vs <Code>n−1</Code></>],
              ['3 · same induction variable?', <><Bad>✗</Bad> <Code>i</Code> vs <Code>j</Code> (harmless — rename)</>],
            ]}
          />
          <p className="text-sm mb-1">
            <strong>(b) Equal counts alone are not enough.</strong> Peel the <em>last</em> iteration of loop 1 (both
            loops then run <Code>1 … n−1</Code>) and fuse with a shared index:
          </p>
          <Pre>{`for (i = 1; i <= n-1; i++) {
  u[i] = f[i] + f[i-1];
  v[i] = u[i] * u[i+1];   // u[i+1] not written yet!
}
u[n] = f[n] + f[n-1];`}</Pre>
          <p className="text-sm mb-1">
            At iteration <Code>i</Code> the read <Code>u[i+1]</Code> precedes its write (iteration <Code>i+1</Code>, or
            after the loop for <Code>i = n−1</Code>) ⇒ old values — <Bad>wrong</Bad>. The flow dependence would be
            reversed into a body-2 → body-1 dependence.
          </p>
          <p className="text-sm mb-1">
            <strong>(c) Correct pipeline.</strong> Peel the <em>first</em> iteration of loop 1 (producer runs ahead),
            rename, and shift onto a common <Code>ib = 0 … n−2</Code>: loop 1 uses <Code>i = ib+2</Code>, loop 2 uses{' '}
            <Code>j = ib+1</Code>:
          </p>
          <Pre>{`u[1] = f[1] + f[0];               // peeled i = 1
for (ib = 0; ib <= n-2; ib++) {
  u[ib+2] = f[ib+2] + f[ib+1];    // loop-1 body (i = ib+2)
  v[ib+1] = u[ib+1] * u[ib+2];    // loop-2 body (j = ib+1)
}`}</Pre>
          <p className="text-sm mb-1"><strong>(d) Proof, read by read:</strong></p>
          <Table
            head={['Read', 'Produced by', 'When', 'OK?']}
            rows={[
              [<Code>u[ib+2]</Code>, <Code>u[ib+2] = …</Code>, 'same iteration, one line earlier', <Good>✓</Good>],
              [<><Code>u[ib+1]</Code>, <Code>ib ≥ 1</Code></>, <>iteration <Code>ib−1</Code> (its <Code>u[ib+1]</Code>)</>, 'previous iteration', <Good>✓</Good>],
              [<><Code>u[1]</Code> at <Code>ib = 0</Code></>, 'peeled statement', 'before the loop', <Good>✓</Good>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>All reads resolve to already-written values</Good>, and the reads of <Code>f</Code> are unaffected
            (loop 1 never writes <Code>f</Code>). Every dependence keeps its direction, so the fusion is legal — and{' '}
            <Code>u[ib+2]</Code> is consumed while still hot, which was the point. Note the peeled-first /
            shift-producer-ahead recipe is forced by the <em>forward</em> reference, exactly as in Q4's analysis.
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
