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
  type GNode,
  type GEdge,
  type Fill,
  type StepPanel,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 4 · §4.1 — Statement Reordering   (PDF 179–184)
 *  Section-4 intro (goal + legality), statement reordering with the
 *  data-dependence graph, loop unswitching, and loop peeling.
 * ------------------------------------------------------------------ */

/* ================================================================== *
 *  Tab 1 · What & why  (the §4 intro: goal + the legality rule)
 * ================================================================== */

const LegalitySwap: React.FC = () => {
  const [swapped, setSwapped] = useState(false)
  const lines = swapped
    ? ['(2)  y = x - 1;', '(1)  x = a + b;']
    : ['(1)  x = a + b;', '(2)  y = x - 1;']
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" variant={swapped ? 'outline' : 'default'} onClick={() => setSwapped(false)}>
          original order
        </Button>
        <Button size="sm" variant={swapped ? 'default' : 'outline'} onClick={() => setSwapped(true)}>
          swap (1) ⇄ (2)
        </Button>
      </div>
      <Pre>{lines.join('\n')}</Pre>
      <Panel className="text-sm leading-relaxed">
        There is a <strong>flow dependence</strong> <Code>(1) → (2)</Code>: statement (2) reads <Code>x</Code>, which (1)
        writes.{' '}
        {swapped ? (
          <>
            <Bad>Illegal.</Bad> After the swap, (2) reads <Code>x</Code> <em>before</em> (1) computes it — the old value
            of <Code>x</Code> is used, so the result changes. The dependence (1)→(2) was <strong>not preserved</strong>.
          </>
        ) : (
          <>
            <Good>Legal.</Good> (1) still runs before (2), so the dependence (1)→(2) is preserved and the meaning of the
            program is unchanged.
          </>
        )}
      </Panel>
      <p className="text-xs text-muted-foreground mt-2">
        Rule of thumb: a reordering is allowed exactly when, for every dependence <Code>s → t</Code>, the source{' '}
        <Code>s</Code> still appears before the target <Code>t</Code>.
      </p>
    </div>
  )
}

const IntroSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What a program transformation is for</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A <strong>program transformation</strong> <em>reorders</em> the compute-intensive parts of a program — in most
          cases <strong>loops</strong> — so that the rearranged program runs <strong>faster on a specific target
          architecture</strong>.
        </p>
        <Step n="①">
          <strong>Goal — lower execution time.</strong> We move work around to use the machine better: caches, registers,
          vector units, multiple cores.
        </Step>
        <Step n="②">
          <strong>The architecture decides.</strong> Whether a given transformation actually helps depends on the target
          hardware — the same rewrite can be a win on one machine and a loss on another.
        </Step>
        <Panel className="text-sm leading-relaxed mt-1">
          Reordering does <em>not</em> change <em>what</em> the program computes — only the <em>order</em> in which it
          computes it, to fit the hardware.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The one hard requirement: preserve the dependences</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A transformation is only allowed if it does <strong>not alter the semantics</strong> of the program part: the{' '}
          <strong>dependences between the instructions must be preserved</strong>.
        </p>
        <Table
          head={['Dependence', 'Pattern', 'Means']}
          rows={[
            [<>flow (true)</>, <Code>write x … read x</Code>, <>the read must stay <em>after</em> the write</>],
            [<>anti</>, <Code>read x … write x</Code>, <>the write must stay <em>after</em> the read</>],
            [<>output</>, <Code>write x … write x</Code>, <>the two writes must keep their order</>],
          ]}
        />
        <p className="text-sm mt-1">
          (These three were classified in §3.1.) As long as every such ordering constraint survives, the reordering is{' '}
          <strong>safe</strong>.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">See it: legal vs. illegal reorder</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Toggle the order of two dependent statements and watch the legality flip — this single rule governs everything
          in this section.
        </p>
        <LegalitySwap />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The transformations in §4.1</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Transformation', 'Idea']}
          rows={[
            [<strong>Statement reordering</strong>, <>move statements (respecting dependences) to improve locality</>],
            [<strong>Loop unswitching</strong>, <>pull a loop-invariant <Code>if</Code> out of the loop</>],
            [<strong>Loop peeling</strong>, <>split the first/last iteration off, or split a loop in two</>],
          ]}
        />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · Statement reordering  (the 8-statement DDG example)
 * ================================================================== */

interface Stmt {
  id: string
  n: number
  code: string
}
const stmts: Stmt[] = [
  { id: '1', n: 1, code: 'a[1] = 0;' },
  { id: '2', n: 2, code: 'b[1] = 0;' },
  { id: '3', n: 3, code: 'if (c > 0) {' },
  { id: '4', n: 4, code: '  a[2] = 1;' },
  { id: '5', n: 5, code: '  b[2] = 9; }' },
  { id: '6', n: 6, code: 'for (i = 3; i <= 9; i++) {' },
  { id: '7', n: 7, code: '  a[i] = a[i-2] + a[i-1] - 2;' },
  { id: '8', n: 8, code: '  b[i] = b[i-2] + 2*b[i-1]; }' },
]

interface Dep {
  from: string
  to: string
  kind: 'flow' | 'control'
  why: React.ReactNode
}
const deps: Dep[] = [
  { from: '1', to: '7', kind: 'flow', why: <>a[i−2] reads a[1] when i = 3 — flow dependence from the write a[1]=0.</> },
  { from: '4', to: '7', kind: 'flow', why: <>a[i−1] reads a[2] at i = 3 (and a[i−2] at i = 4) — flow dependence from a[2]=1.</> },
  { from: '2', to: '8', kind: 'flow', why: <>b[i−2] reads b[1] when i = 3 — flow dependence from b[1]=0.</> },
  { from: '5', to: '8', kind: 'flow', why: <>b[i−1] reads b[2] at i = 3 (and b[i−2] at i = 4) — flow dependence from b[2]=9.</> },
  { from: '3', to: '4', kind: 'control', why: <>a[2]=1 runs only when c &gt; 0 — control dependence on the <Code>if</Code>.</> },
  { from: '3', to: '5', kind: 'control', why: <>b[2]=9 runs only when c &gt; 0 — control dependence on the <Code>if</Code>.</> },
  { from: '6', to: '7', kind: 'control', why: <>statement (7) is the loop body — controlled by the <Code>for</Code> header.</> },
  { from: '6', to: '8', kind: 'control', why: <>statement (8) is the loop body — controlled by the <Code>for</Code> header.</> },
  { from: '7', to: '7', kind: 'flow', why: <>a[i] uses a[i−1] and a[i−2] from earlier iterations — loop-carried self dependence.</> },
  { from: '8', to: '8', kind: 'flow', why: <>b[i] uses b[i−1] and b[i−2] from earlier iterations — loop-carried self dependence.</> },
]

const ddgNodes: GNode[] = stmts.map((s, i) => ({ id: s.id, x: 46, y: 26 + i * 40, label: String(s.n) }))
const ddgEdges: GEdge[] = [
  { from: '1', to: '7', bend: -82 },
  { from: '2', to: '8', bend: -104 },
  { from: '4', to: '7', bend: -40 },
  { from: '5', to: '8', bend: -58 },
  { from: '3', to: '4', bend: -16, dashed: true },
  { from: '3', to: '5', bend: -34, dashed: true },
  { from: '6', to: '7', bend: -16, dashed: true },
  { from: '6', to: '8', bend: -30, dashed: true },
  { from: '7', to: '7' },
  { from: '8', to: '8' },
]

type Role = 'sel' | 'pred' | 'succ' | 'none'
const roleOf = (sel: string, id: string): Role => {
  if (id === sel) return 'sel'
  const isPred = deps.some((d) => d.to === sel && d.from === id)
  const isSucc = deps.some((d) => d.from === sel && d.to === id)
  if (isPred) return 'pred'
  if (isSucc) return 'succ'
  return 'none'
}

const DependenceExplorer: React.FC = () => {
  const [sel, setSel] = useState('7')
  const fillOf = (id: string): Fill => {
    const r = roleOf(sel, id)
    return r === 'sel' ? 'active' : r === 'pred' ? 'pred' : r === 'succ' ? 'succ' : 'none'
  }
  const activeEdges = ddgEdges.filter((e) => e.from === sel || e.to === sel).map((e) => `${e.from}->${e.to}`)
  const incoming = deps.filter((d) => d.to === sel && d.from !== sel)
  const outgoing = deps.filter((d) => d.from === sel && d.to !== sel)
  const self = deps.find((d) => d.from === sel && d.to === sel)
  const stmtById = (id: string) => stmts.find((s) => s.id === id)!

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="shrink-0">
          <FlowGraph
            nodes={ddgNodes}
            edges={ddgEdges}
            width={210}
            height={350}
            maxW={210}
            fillOf={fillOf}
            activeEdges={activeEdges}
            onPick={setSel}
            caption="data dependence graph"
          />
        </div>
        <div className="flex-1 min-w-0">
          {stmts.map((s) => {
            const r = roleOf(sel, s.id)
            return (
              <button
                key={s.id}
                onClick={() => setSel(s.id)}
                className={cn(
                  'w-full text-left flex items-start gap-2 px-2 py-1 rounded-md border mb-1 font-mono text-[12px] transition-colors',
                  r === 'sel' && 'border-primary bg-primary/10',
                  r === 'pred' && 'border-emerald-500/50 bg-emerald-500/10',
                  r === 'succ' && 'border-amber-500/50 bg-amber-500/10',
                  r === 'none' && 'border-transparent hover:bg-muted'
                )}
              >
                <span className="shrink-0 text-muted-foreground">({s.n})</span>
                <span className="whitespace-pre">{s.code}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center text-[11px] text-muted-foreground my-2">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--color-primary)' }} /> selected</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#10b981' }} /> must run <strong>before</strong> (source)</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} /> must run <strong>after</strong> (target)</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed border-muted-foreground" /> control dep</span>
      </div>

      <Panel className="text-sm leading-relaxed">
        <div className="font-mono text-[13px] font-semibold mb-1">
          ({stmtById(sel).n}) {stmtById(sel).code.trim()}
        </div>
        {incoming.length > 0 && (
          <div className="mb-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">depends on: </span>
            {incoming.map((d) => (
              <span key={d.from} className="block ml-3 text-[13px]">• ({stmtById(d.from).n}) — {d.why}</span>
            ))}
          </div>
        )}
        {outgoing.length > 0 && (
          <div className="mb-1">
            <span className="text-amber-600 dark:text-amber-400 font-medium">is needed by: </span>
            {outgoing.map((d) => (
              <span key={d.to} className="block ml-3 text-[13px]">• ({stmtById(d.to).n}) — {d.why}</span>
            ))}
          </div>
        )}
        {self && <div className="text-[13px] ml-3">• loop-carried self dependence — {self.why}</div>}
        {incoming.length === 0 && outgoing.length === 0 && !self && (
          <div className="text-[13px] text-muted-foreground">No dependences — this statement can move freely.</div>
        )}
      </Panel>
    </div>
  )
}

const reorderSteps: StepPanel[] = [
  {
    title: '0 · The original sequence',
    body: (
      <>
        <Pre>{`(1) a[1] = 0;
(2) b[1] = 0;
(3) if (c > 0) {
(4)   a[2] = 1;
(5)   b[2] = 9; }
(6) for (i = 3; i <= 9; i++) {
(7)   a[i] = a[i-2] + a[i-1] - 2;
(8)   b[i] = b[i-2] + 2*b[i-1]; }`}</Pre>
        <p className="text-sm">
          The a-array is touched by (1), (4), (7); the b-array by (2), (5), (8). Right now the a-writes and b-writes are
          interleaved.
        </p>
      </>
    ),
  },
  {
    title: '1 · The constraints from the dependence graph',
    body: (
      <>
        <p className="text-sm mb-1">The reorder must respect every edge of the DDG (source before target):</p>
        <Formula>{`1 → 7      2 → 8        (loop reads the initial values)
4 → 7      5 → 8        (loop reads a[2], b[2])
3 → 4      3 → 5        (the if controls its body)
6 → 7      6 → 8        (the for controls its body)`}</Formula>
        <p className="text-sm">Within those limits we are free to permute.</p>
      </>
    ),
  },
  {
    title: '2 · The idea — improve spatial locality',
    body: (
      <>
        <p className="text-sm mb-1">
          Move the a-writes <Code>(1)</Code> and <Code>(4)</Code> as close together as possible, and likewise the
          b-writes <Code>(2)</Code> and <Code>(5)</Code>. Accesses to <Code>a[1], a[2]</Code> (and <Code>b[1], b[2]</Code>)
          sit on the same cache line, so doing them back-to-back keeps that line hot.
        </p>
        <p className="text-sm">
          But <Code>(4)</Code> and <Code>(5)</Code> live inside one <Code>if</Code>. To separate them we evaluate the
          condition once into a temporary <Code>test</Code> and guard each write with it — preserving the control
          dependence (3)→(4), (3)→(5).
        </p>
      </>
    ),
  },
  {
    title: '3 · A valid order: 2, 3, 5, 1, 4, 6, 7, 8',
    body: (
      <>
        <Table
          head={['Dependence', 'Source pos.', 'Target pos.', 'OK?']}
          rows={[
            [<Code>1 → 7</Code>, '4', '7', <Good>✓</Good>],
            [<Code>2 → 8</Code>, '1', '8', <Good>✓</Good>],
            [<Code>4 → 7</Code>, '5', '7', <Good>✓</Good>],
            [<Code>5 → 8</Code>, '3', '8', <Good>✓</Good>],
            [<Code>3 → 4</Code>, '2', '5', <Good>✓</Good>],
            [<Code>3 → 5</Code>, '2', '3', <Good>✓</Good>],
          ]}
        />
        <p className="text-sm">Every source still precedes its target ⇒ the reordering is legal.</p>
      </>
    ),
  },
  {
    title: '4 · The resulting equivalent code',
    body: (
      <>
        <Pre>{`b[1] = 0;             // (2)
test = c > 0;         // (3)  condition computed once
if (test) b[2] = 9;   // (5)
a[1] = 0;             // (1)
if (test) a[2] = 1;   // (4)
for (i = 3; i <= 9; i++) {   // (6)
  a[i] = a[i-2] + a[i-1] - 2;   // (7)
  b[i] = b[i-2] + 2*b[i-1];     // (8)
}`}</Pre>
        <Panel className="text-sm leading-relaxed">
          <Good>Advantage — better spatial locality.</Good> The writes to <Code>a[1]</Code> and <Code>a[2]</Code> now
          happen close together, as do <Code>b[1]</Code> and <Code>b[2]</Code>. The loop that immediately reads them finds
          those cache lines already warm.
        </Panel>
      </>
    ),
  },
]

const ReorderSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Statement reordering</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Take a sequence of statements and its data dependence graph. We may <strong>permute the statements</strong> as
          long as we respect the dependences. A common reason to do so is to <strong>increase locality</strong> — move
          statements that touch the same variable (or neighbouring memory) next to each other.
        </p>
        <p className="text-sm">
          The example below initialises two arrays <Code>a</Code> and <Code>b</Code> and then fills them in a loop.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Explore the dependence graph</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Click a node (or a line) to see what it <span className="text-emerald-600 dark:text-emerald-400">depends on</span>{' '}
          and what <span className="text-amber-600 dark:text-amber-400">depends on it</span>. These edges are exactly the
          orderings any reorder must keep.
        </p>
        <DependenceExplorer />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — reorder for locality</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={reorderSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · Loop unswitching
 * ================================================================== */

const UnswitchDemo: React.FC = () => {
  const [test, setTest] = useState(true)
  const [n, setN] = useState(1000)
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">iterations n:</span>
        {[8, 100, 1000].map((v) => (
          <button
            key={v}
            onClick={() => setN(v)}
            className={cn(
              'text-[12px] px-2.5 py-1 rounded-full border transition-colors',
              n === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {v}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">test:</span>
        <button
          onClick={() => setTest((t) => !t)}
          className="text-[12px] px-2.5 py-1 rounded-full border border-border hover:bg-muted font-mono"
        >
          test = {String(test)}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Panel className="my-0">
          <div className="text-xs font-semibold text-muted-foreground mb-1">before</div>
          <Pre>{`for (i = 0; i < n; i++) {
  s[i] = ...;
  if (test)  y[i] = f(x[i]);
  else       y[i] = g(x[i]);
}`}</Pre>
          <div className="text-[13px]">
            condition evaluated <Bad>{n} times</Bad>
          </div>
        </Panel>
        <Panel className="my-0">
          <div className="text-xs font-semibold text-muted-foreground mb-1">after unswitching</div>
          <Pre>{test
            ? `// test is true → only this loop runs
if (test)
  for (i = 0; i < n; i++) {
    s[i] = ...;
    y[i] = f(x[i]);
  }`
            : `// test is false → only this loop runs
else
  for (i = 0; i < n; i++) {
    s[i] = ...;
    y[i] = g(x[i]);
  }`}</Pre>
          <div className="text-[13px]">
            condition evaluated <Good>1 time</Good>
          </div>
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Because <Code>test</Code> does not change inside the loop, its value is the same every iteration — so it is safe to
        decide once, up front, which loop body to run.
      </p>
    </div>
  )
}

const UnswitchSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Unswitching of conditional statements in loops</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>Idea:</strong> a <strong>loop-invariant</strong> conditional (one whose <Code>test</Code> does not change
          across iterations) can be <strong>moved outside</strong> the loop. We duplicate the loop — once for the
          then-branch, once for the else-branch — and pick which to run before entering.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">before</div>
            <Pre>{`for (...) {
  stmts;
  if (test)
    if-branch;
  else
    else-branch;
  more-stmts;
}`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after</div>
            <Pre>{`if (test)
  for (...) {
    stmts;
    if-branch;
    more-stmts;
  }
else
  for (...) {
    stmts;
    else-branch;
    more-stmts;
  }`}</Pre>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why it helps — and what it costs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Panel className="my-0">
            <Tag tone="good">Advantage</Tag>
            <p className="text-sm mt-1.5">
              The condition <Code>test</Code> is <strong>evaluated only once</strong>, instead of in <em>every</em> loop
              iteration. The hot loop body also has no branch in it anymore.
            </p>
          </Panel>
          <Panel className="my-0">
            <Tag tone="warn">Drawback</Tag>
            <p className="text-sm mt-1.5">
              A <strong>more complicated loop structure</strong> may result. For nested loops the copies become{' '}
              <strong>non-perfectly nested</strong> — harder to analyse and to transform further.
            </p>
          </Panel>
        </div>
        <div className="text-xs font-semibold text-muted-foreground mb-1">drawback illustrated (nested loops)</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Pre>{`for (...)
  for (...)
    if (...)
    else`}</Pre>
          <Pre>{`for (...)
  if (...)
    for (...)
  else
    for (...)`}</Pre>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          The inner <Code>if</Code> is hoisted between the two loop levels, so the inner loop is no longer directly nested
          inside the outer one.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">See the saving</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">Pick a trip count and a branch; compare how often the condition is checked.</p>
        <UnswitchDemo />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 4 · Loop peeling
 * ================================================================== */

const PeelDemo: React.FC = () => {
  const n = 8
  const [mode, setMode] = useState<'peel' | 'split'>('peel')
  const [s, setS] = useState(3)
  const groupOf = (i: number): 'first' | 'rest' | 'A' | 'B' => {
    if (mode === 'peel') return i === 0 ? 'first' : 'rest'
    return i < s ? 'A' : 'B'
  }
  const color: Record<string, string> = {
    first: 'bg-primary text-primary-foreground border-primary',
    rest: 'bg-muted text-foreground border-border',
    A: 'bg-emerald-500/20 text-foreground border-emerald-500/50',
    B: 'bg-amber-500/20 text-foreground border-amber-500/50',
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={() => setMode('peel')}
          className={cn('text-[12px] px-2.5 py-1 rounded-full border transition-colors', mode === 'peel' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}
        >
          peel 1st iteration
        </button>
        <button
          onClick={() => setMode('split')}
          className={cn('text-[12px] px-2.5 py-1 rounded-full border transition-colors', mode === 'split' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}
        >
          split at s
        </button>
        {mode === 'split' && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
            s = {s}
            <input type="range" min={1} max={n - 1} value={s} onChange={(e) => setS(+e.target.value)} />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {Array.from({ length: n }, (_, i) => (
          <div
            key={i}
            className={cn('w-9 h-9 rounded-md border flex items-center justify-center text-[12px] font-mono', color[groupOf(i)])}
          >
            {i}
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        iteration space <Code>i = 0 … {n - 1}</Code>
        {mode === 'peel' ? (
          <> — <span className="text-primary font-medium">i = 0 peeled off</span>, the rest stays a loop <Code>i = 1 … {n - 1}</Code>.</>
        ) : (
          <> — split into <span className="text-emerald-600 dark:text-emerald-400 font-medium">i = 0 … {s - 1}</span> and <span className="text-amber-600 dark:text-amber-400 font-medium">i = {s} … {n - 1}</span>.</>
        )}
      </div>
    </div>
  )
}

const PeelSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Loop peeling</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>Idea:</strong> split the <strong>first</strong> (or the <strong>last</strong>) iteration off a loop, so
          it becomes straight-line code followed by a shorter loop.
        </p>
        <Panel className="text-sm leading-relaxed">
          <Tag tone="good">Advantage</Tag> <span className="ml-1">The loop boundaries change, which can <strong>enable
          further transformations</strong> — for example the <strong>fusion of adjacent loops</strong> once their bounds
          line up (see the next section).</span>
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Splitting off the 1st iteration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">before</div>
            <Pre>{`compute n;
for (i = 0; i < n; i++)
  loop-body;`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after (peeled)</div>
            <Pre>{`compute n;
if (n > 0) {
  i = 0;
  loop-body;
  for (i = 1; i < n; i++)
    loop-body;
}`}</Pre>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          The guard <Code>if (n &gt; 0)</Code> makes sure the peeled iteration only runs when the original loop would have
          executed at least once.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Generalization — split a loop into two</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">before</div>
            <Pre>{`compute n;
for (i = 0; i < n; i++)
  loop-body;`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after (split at s)</div>
            <Pre>{`compute n;
for (i = 0; i < s; i++)
  loop-body;
for (i = s; i < n; i++)
  loop-body;`}</Pre>
          </div>
        </div>
        <p className="text-sm mb-3">
          Peeling is just the special case <Code>s = 1</Code>. Drag <Code>s</Code> to see the iteration space split:
        </p>
        <PeelDemo />
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
      Five exam-style problems on §4.1, easy → hardest. These are <em>transfer</em> problems — none reuses an example
      from the content tabs. Q1 is fully worked to set the pattern; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Build the DDG — and discover a reordering that is impossible"
      statement={
        <>
          <p className="mb-2">
            Draw the data dependence graph of the sequence below, classify every edge (flow / anti / output), list{' '}
            <em>all</em> legal execution orders, and decide: can the two accesses to <Code>a[k]</Code> in (1) and (3) ever
            be brought next to each other?
          </p>
          <Pre>{`(1) x    = a[k] + 1;
(2) a[k] = y * 2;
(3) z    = a[k] - 3;
(4) y    = 7;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1"><strong>Step 1 — edges.</strong> Compare every pair on shared variables:</p>
          <Table
            head={['Pair', 'Kind', 'Why']}
            rows={[
              [<Code>1 → 2</Code>, 'anti', <>(1) reads <Code>a[k]</Code>, (2) overwrites it — the read must happen first</>],
              [<Code>2 → 3</Code>, 'flow', <>(2) writes <Code>a[k]</Code>, (3) reads the <em>new</em> value</>],
              [<Code>2 → 4</Code>, 'anti', <>(2) reads <Code>y</Code>, (4) overwrites <Code>y</Code></>],
            ]}
          />
          <p className="text-sm mb-1">
            No other pair shares a variable (note (1) and (3) both only <em>read</em> <Code>a[k]</Code> — two reads never
            make a dependence).
          </p>
          <p className="text-sm mb-1">
            <strong>Step 2 — legal orders.</strong> The constraints are 1&lt;2, 2&lt;3, 2&lt;4. Statement (4) may float
            anywhere after (2); everything else is fixed:
          </p>
          <Formula>{`1,2,3,4     1,2,4,3          — the only two legal orders`}</Formula>
          <p className="text-sm mb-1">
            <strong>Step 3 — can (1) and (3) become adjacent?</strong> <Bad>No.</Bad> The chain{' '}
            <Code>1 →(anti) 2 →(flow) 3</Code> forces (2) to sit <em>between</em> them in every legal order. This is the
            general lesson: a write to a location <em>pins itself between</em> the reads before and after it.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Pattern for the rest:</Good> (i) list edges by scanning pairs for a shared variable with at least one
            write, (ii) turn the edges into ordering constraints, (iii) only then argue what a reordering can and cannot
            achieve.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Unswitch what can be unswitched — and only that"
      statement={
        <>
          <p className="mb-2">
            The loop contains <strong>two</strong> conditionals. Decide for each whether loop unswitching applies, give
            the transformed code, and count how many condition evaluations remain per full run.
          </p>
          <Pre>{`for (i = 0; i < n; i++) {
  if (mode == FAST)  u[i] = v[i] * scale;
  else               u[i] = slow_fn(v[i]);
  if (u[i] > limit)  clip[i] = 1;
  else               clip[i] = 0;
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Which test is invariant?</strong> <Code>mode == FAST</Code> reads only <Code>mode</Code>, which the
            loop never writes → loop-invariant, unswitchable. <Code>u[i] &gt; limit</Code> reads <Code>u[i]</Code>, which
            is written <em>in the same iteration</em> → varies per iteration, <Bad>not unswitchable</Bad>.
          </p>
          <Pre>{`if (mode == FAST)
  for (i = 0; i < n; i++) {
    u[i] = v[i] * scale;
    if (u[i] > limit)  clip[i] = 1;
    else               clip[i] = 0;
  }
else
  for (i = 0; i < n; i++) {
    u[i] = slow_fn(v[i]);
    if (u[i] > limit)  clip[i] = 1;
    else               clip[i] = 0;
  }`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Count:</Good> before <Code>2n</Code> tests; after <Code>1 + n</Code> (one <Code>mode</Code> test, and{' '}
            <Code>u[i] &gt; limit</Code> unavoidably stays in the loop). The data-dependent branch is the part
            unswitching can never remove.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Peel the last iteration (not the first)"
      statement={
        <>
          <p className="mb-2">
            Every iteration but the final one pushes a value forward. Remove the <Code>if</Code> from the hot loop by
            peeling — but note which end of the iteration space you must peel, and keep the guard correct for{' '}
            <Code>n = 0</Code>.
          </p>
          <Pre>{`for (i = 0; i < n; i++) {
  s[i] = t[i] * t[i];
  if (i < n-1)  t[i+1] = t[i+1] + s[i];
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            The test <Code>i &lt; n−1</Code> fails only on the <strong>last</strong> iteration, so peeling the first
            iteration (the §4.1 template) removes nothing — we must peel the <strong>last</strong>:
          </p>
          <Pre>{`if (n > 0) {
  for (i = 0; i < n-1; i++) {   // all "true" iterations
    s[i] = t[i] * t[i];
    t[i+1] = t[i+1] + s[i];     // test gone
  }
  s[n-1] = t[n-1] * t[n-1];     // peeled i = n-1 (no push)
}`}</Pre>
          <p className="text-sm mb-1">
            <strong>Legality.</strong> The loop carries a flow dependence: iteration <Code>i</Code> writes{' '}
            <Code>t[i+1]</Code>, iteration <Code>i+1</Code> reads it. Peeling only cuts the iteration space at one end —
            every iteration still runs exactly once, in the original order — so the dependence chain is intact.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Check the corner:</Good> for <Code>n = 1</Code> the loop runs zero times and only{' '}
            <Code>s[0] = t[0]²</Code> executes — exactly what the original did (its single iteration failed the test).
            The <Code>if (n &gt; 0)</Code> guard covers <Code>n = 0</Code>.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="How far out can this conditional be hoisted?"
      statement={
        <>
          <p className="mb-2">
            The test <Code>r[i] &gt; 0</Code> is <em>not</em> invariant for the outer loop but <em>is</em> invariant for
            the inner one. Unswitch as far out as legality allows, give the code, count the condition evaluations before
            and after, and name the structural drawback of the result.
          </p>
          <Pre>{`for (i = 0; i < n; i++)
  for (j = 0; j < m; j++) {
    if (r[i] > 0)  A[i][j] = B[i][j] * r[i];
    else           A[i][j] = 0;
  }`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Invariance is relative to a loop.</strong> <Code>r[i]</Code> changes with <Code>i</Code>, so the test
            cannot leave the <Code>i</Code>-loop; it does not change with <Code>j</Code>, so it can leave the{' '}
            <Code>j</Code>-loop:
          </p>
          <Pre>{`for (i = 0; i < n; i++) {
  if (r[i] > 0)
    for (j = 0; j < m; j++)  A[i][j] = B[i][j] * r[i];
  else
    for (j = 0; j < m; j++)  A[i][j] = 0;
}`}</Pre>
          <Table
            head={['', 'Condition evaluations']}
            rows={[
              ['before', <Code>n · m</Code>],
              ['after', <><Code>n</Code> (once per outer iteration)</>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Tag tone="warn">Drawback:</Tag> the nest is no longer <strong>perfectly nested</strong> — between the{' '}
            <Code>i</Code>-loop and the <Code>j</Code>-loops now sits an <Code>if</Code>. Transformations that need a
            perfect nest (interchange, tiling, §4.4/§4.8) no longer apply directly. Bonus: the else-loop became a plain
            fill with 0 — a candidate for <Code>memset</Code>.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Combine peeling, unswitching and a branch-free hot loop"
      statement={
        <>
          <p className="mb-2">
            Transform this loop so that its hot inner part contains <strong>no branch at all</strong>, using loop peeling
            and loop unswitching together.
          </p>
          <Pre>{`for (i = 0; i < n; i++) {
  if (i == 0)  m[0] = seed;
  else         m[i] = m[i-1] * q;
  if (trace)   log[i] = m[i];
}`}</Pre>
          <p className="mb-0">
            (a) Give the final code. (b) Count condition evaluations before and after (in terms of <Code>n</Code>).
            (c) Does it matter whether you peel first or unswitch first? (d) Why can the flow dependence on{' '}
            <Code>m</Code> not be broken by either transformation?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> Peel <Code>i = 0</Code> (kills the <Code>i == 0</Code> test), then unswitch{' '}
            <Code>trace</Code> (loop-invariant) out of the remaining loop:
          </p>
          <Pre>{`if (n > 0) {
  m[0] = seed;                     // peeled i = 0
  if (trace)  log[0] = m[0];
  if (trace)
    for (i = 1; i < n; i++) {      // hot loop A — branch-free
      m[i] = m[i-1] * q;
      log[i] = m[i];
    }
  else
    for (i = 1; i < n; i++)        // hot loop B — branch-free
      m[i] = m[i-1] * q;
}`}</Pre>
          <p className="text-sm mb-1">
            <strong>(b)</strong> Before: every iteration tests <Code>i == 0</Code> and <Code>trace</Code> →{' '}
            <Code>2n</Code> evaluations. After: <Code>n &gt; 0</Code> once and <Code>trace</Code> twice (peeled iteration
            + loop choice) → <strong>3 total</strong>, independent of <Code>n</Code>.
          </p>
          <p className="text-sm mb-1">
            <strong>(c)</strong> The two transformations commute — both end states are equivalent. But peeling first is
            tidier: unswitching first would duplicate the <Code>i == 0</Code> special case into <em>both</em> loop
            copies, and you would then have to peel twice.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(d)</strong> <Code>m[i] = m[i−1] · q</Code> is a loop-carried <em>flow</em> dependence with distance
            1: iteration <Code>i</Code> needs the value produced by iteration <Code>i−1</Code>. Peeling and unswitching
            only restructure <em>control</em> — they never change which iteration computes what, nor the order of the
            iterations — so the chain (and the sequential nature of the recurrence) survives untouched.{' '}
            <Good>That is exactly why they are always legal</Good>, in contrast to the order-changing loop
            transformations of §4.2–§4.8.
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
  { id: 'reorder', label: 'Statement reordering', render: () => <ReorderSection /> },
  { id: 'unswitch', label: 'Loop unswitching', render: () => <UnswitchSection /> },
  { id: 'peel', label: 'Loop peeling', render: () => <PeelSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function StatementReorderingStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 4 · §4.1 · Statement Reordering"
      title="Statement Reordering"
      subtitle="Program transformations reorder compute-intensive code to run faster on the target machine — provided every dependence is preserved. This section covers statement reordering for locality (with the dependence graph), loop unswitching, and loop peeling."
      tabs={tabs}
    />
  )
}
