import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
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
 *  Chapter 4 · §4.3 — Loop Distribution (Loop Fission)   (PDF 190–194)
 *  Split one loop into several: the SCC-based algorithm, topological
 *  ordering of the resulting loops, and nested-loop distribution.
 * ------------------------------------------------------------------ */

/* ================================================================== *
 *  Tab 1 · What & why
 * ================================================================== */

const SplitToggle: React.FC = () => {
  const [split, setSplit] = useState(false)
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" variant={split ? 'outline' : 'default'} onClick={() => setSplit(false)}>
          one loop
        </Button>
        <Button size="sm" variant={split ? 'default' : 'outline'} onClick={() => setSplit(true)}>
          distribute ⇒
        </Button>
      </div>
      <Pre>{split
        ? `for (i = 0; i < n; i++)
  loop-body-1;
for (i = 0; i < n; i++)
  loop-body-2;`
        : `for (i = 0; i < n; i++) {
  loop-body-1;
  loop-body-2;
}`}</Pre>
      <Panel className="text-sm leading-relaxed">
        {split ? (
          <>
            <Good>Distributed.</Good> The one loop is split into two loops with <strong>smaller bodies</strong>, each
            iterating over the same range. This is the <strong>inverse</strong> of loop fusion (§4.2).
          </>
        ) : (
          <>
            One loop with a large body. <strong>Loop distribution</strong> (a.k.a. <strong>loop fission</strong>) breaks
            it into several loops — provided the data dependences allow it.
          </>
        )}
      </Panel>
    </div>
  )
}

const IntroSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The idea — split one loop into several</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>Loop distribution</strong> (or <strong>loop fission</strong>) does the opposite of fusion: it splits a
          loop into <strong>two or more loops with a smaller body</strong>, each running over the original index range.
        </p>
        <SplitToggle />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why distribute</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          <Panel className="my-0">
            <Tag tone="good">Instruction cache</Tag>
            <p className="text-sm mt-1.5">
              Splitting a <strong>large</strong> loop reduces the number of <strong>instruction-cache misses</strong> on
              machines with a <strong>small instruction cache</strong> — each smaller body fits better.
            </p>
          </Panel>
          <Panel className="my-0">
            <Tag tone="good">Data locality</Tag>
            <p className="text-sm mt-1.5">
              Splitting a loop with <strong>many array accesses</strong> into loops with <strong>few</strong> accesses
              each can <strong>increase the locality</strong> of memory references (fewer arrays streamed at once).
            </p>
          </Panel>
        </div>
        <p className="text-sm mt-3">
          Distribution is also an <em>enabler</em>: separating the independent parts of a loop can expose a loop that
          carries no dependences and is therefore vectorizable / parallelizable (as in §3.2).
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">When is it legal? The 4-step method</CardTitle>
      </CardHeader>
      <CardContent>
        <Step n="1">
          <strong>Build the local data dependence graph</strong> of the statements in the loop body. Ignore dependences
          carried by <em>outer</em> loops; a nested loop inside the body counts as a <strong>single node</strong>.
        </Step>
        <Step n="2">
          <strong>No cycle</strong> ⇒ the nodes may be distributed into separate loops, run in any{' '}
          <strong>topological order</strong> of the graph.
        </Step>
        <Step n="3">
          <strong>Cycles</strong> ⇒ the nodes on one cycle <strong>cannot</strong> be split apart. Cycles come from{' '}
          <strong>loop-carried dependences</strong>.
        </Step>
        <Step n="4">
          <strong>Algorithm:</strong> put each <strong>strongly connected component (SCC)</strong> into one loop, then
          order the loops by a <strong>topological ordering</strong> of the dependence graph.
        </Step>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · The SCC algorithm  (the 4-statement example)
 * ================================================================== */

// scc groups for the s1..s4 example
const sccOf: Record<string, 'Z1' | 'Z2' | 'Z3'> = { s1: 'Z1', s2: 'Z2', s3: 'Z2', s4: 'Z3' }
const sccFill: Record<string, Fill> = { Z1: 'pred', Z2: 'loop', Z3: 'succ' }

const dagNodes: GNode[] = [
  { id: 's1', x: 60, y: 34, label: 's₁' },
  { id: 's2', x: 60, y: 112, label: 's₂' },
  { id: 's3', x: 60, y: 190, label: 's₃' },
  { id: 's4', x: 60, y: 268, label: 's₄' },
]
const dagEdges: GEdge[] = [
  { from: 's2', to: 's1', label: 'δᵗ(1)', bend: 26 },
  { from: 's2', to: 's3', label: 'δᵗ(0)', bend: 30 },
  { from: 's3', to: 's2', label: 'δᵗ(1)', bend: 30 },
  { from: 's3', to: 's4', label: 'δᵗ(0)', bend: 26 },
]

const distSteps: StepPanel[] = [
  {
    title: '0 · The loop',
    body: (
      <>
        <Pre>{`for (i = 1; i <= n; i++) {
  s1: a[i] = a[i] + b[i-1];
  s2: b[i] = c[i-1] * x;
  s3: c[i] = 1 / b[i];
  s4: d[i] = sqrt(c[i]);
}`}</Pre>
        <p className="text-sm">Four statements, several arrays. We want to split it into as many loops as legal.</p>
      </>
    ),
  },
  {
    title: '1 · The data dependences',
    body: (
      <>
        <Table
          head={['Dep', 'Via', 'Distance', 'Why']}
          rows={[
            [<Code>s₂ → s₃</Code>, <Code>b[i]</Code>, '(0)', <>s₂ writes <Code>b[i]</Code>, s₃ reads it same iteration</>],
            [<Code>s₃ → s₂</Code>, <Code>c[i]</Code>, '(1)', <>s₃ writes <Code>c[i]</Code>, s₂ reads <Code>c[i−1]</Code> next iteration</>],
            [<Code>s₂ → s₁</Code>, <Code>b[i]</Code>, '(1)', <>s₂ writes <Code>b[i]</Code>, s₁ reads <Code>b[i−1]</Code> next iteration</>],
            [<Code>s₃ → s₄</Code>, <Code>c[i]</Code>, '(0)', <>s₃ writes <Code>c[i]</Code>, s₄ reads it same iteration</>],
          ]}
        />
        <p className="text-sm">
          The pair <Code>s₂ ⇄ s₃</Code> points <strong>both ways</strong> — a cycle, caused by the loop-carried{' '}
          <Code>c[i−1]</Code>.
        </p>
      </>
    ),
  },
  {
    title: '2 · Strongly connected components',
    body: (
      <>
        <p className="text-sm mb-1">Collapse each cycle into one component:</p>
        <Formula>{`Z1 = { s1 }        (no cycle)
Z2 = { s2, s3 }    (cycle s2 ⇄ s3  ← must stay together)
Z3 = { s4 }        (no cycle)`}</Formula>
        <p className="text-sm">
          Only <Code>s₂</Code> and <Code>s₃</Code> are trapped together; everything else is free to move to its own loop.
        </p>
      </>
    ),
  },
  {
    title: '3 · Topological order of the components',
    body: (
      <>
        <p className="text-sm mb-1">
          Edges between components: <Code>Z2 → Z1</Code> (s₂→s₁) and <Code>Z2 → Z3</Code> (s₃→s₄). So <Code>Z2</Code>{' '}
          must run first; <Code>Z1</Code> and <Code>Z3</Code> may follow in any order:
        </p>
        <Formula>{`possible topological order:   Z2 ,  Z1 ,  Z3`}</Formula>
      </>
    ),
  },
  {
    title: '4 · Emit one loop per component',
    body: (
      <>
        <p className="text-sm mb-1">
          Normalise the index (<Code>i = ib + 1</Code>, <Code>ib = 0 … n−1</Code>) and output the loops in that order:
        </p>
        <Pre>{`for (ib = 0; ib < n; ib++) {        // Z2 = {s2, s3}
  b[ib+1] = c[ib] * x;
  c[ib+1] = 1 / b[ib+1];
}
for (ib = 0; ib < n; ib++)          // Z1 = {s1}
  a[ib+1] = a[ib+1] + b[ib];
for (ib = 0; ib < n; ib++)          // Z3 = {s4}
  d[ib+1] = sqrt(c[ib+1]);`}</Pre>
        <Panel className="text-sm leading-relaxed">
          <Good>Result:</Good> three loops instead of one. <Code>s₂/s₃</Code> stay fused (their cycle forbids splitting),
          while <Code>s₁</Code> and <Code>s₄</Code> each get their own smaller loop.
        </Panel>
      </>
    ),
  },
]

const SccExplorer: React.FC = () => (
  <div className="flex flex-col sm:flex-row gap-4">
    <div className="shrink-0">
      <FlowGraph
        nodes={dagNodes}
        edges={dagEdges}
        width={180}
        height={300}
        maxW={190}
        fillOf={(id) => sccFill[sccOf[id]]}
        caption="dependence graph — coloured by SCC"
      />
      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground mt-1">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--color-primary)' }} /> Z₂ = {'{s₂, s₃}'} (cycle)</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#10b981' }} /> Z₁ = {'{s₁}'}</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} /> Z₃ = {'{s₄}'}</span>
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <Stepper steps={distSteps} showProgress />
    </div>
  </div>
)

const AlgoSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — SCCs then topological order</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          The graph on the left is coloured by strongly connected component. Step through the algorithm on the right:
          find the dependences, collapse cycles into SCCs, order them topologically, and emit one loop per SCC.
        </p>
        <SccExplorer />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The two things that can go wrong</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Situation', 'Consequence']}
          rows={[
            [<>a <strong>cycle</strong> in the DDG</>, <>those statements <Bad>cannot</Bad> be separated — they share one loop</>],
            [<>wrong <strong>order</strong> of the split loops</>, <>a forward dependence <Bad>breaks</Bad> — always emit in topological order</>],
          ]}
        />
        <p className="text-sm mt-1">
          Statements you deliberately want to keep together (e.g. for another optimization) can be modelled as a{' '}
          <strong>single node</strong> from the start.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · Nested loops
 * ================================================================== */

const nestNodes: GNode[] = [
  { id: 's1', x: 50, y: 36, label: 's₁' },
  { id: 's2', x: 50, y: 116, label: 's₂' },
  { id: 's3', x: 50, y: 196, label: 's₃' },
]
const nestEdges: GEdge[] = [
  { from: 's1', to: 's2', label: '(0,0)', bend: 30 },
  { from: 's2', to: 's1', label: '(1,0)', bend: 30 },
  { from: 's2', to: 's3', label: '(1,0)', bend: 22 },
]

const nestSteps: StepPanel[] = [
  {
    title: '0 · The nested loop',
    body: (
      <>
        <Pre>{`for (I = 1; I <= 100; I++)
  for (J = 1; J <= 100; J++) {
    s1: A[I][J]   = B[I][J] + C[I][J];
    s2: C[I+1][J] = C[I][J] + A[I][J];
    s3: D[I][J]   = C[I][J] - 1;
  }`}</Pre>
        <p className="text-sm">Split this into a maximum number of loops.</p>
      </>
    ),
  },
  {
    title: '1 · Dependences (2-D distance vectors)',
    body: (
      <>
        <Table
          head={['Dep', 'Via', 'Distance (I,J)']}
          rows={[
            [<Code>s₁ → s₂</Code>, <Code>A[I][J]</Code>, '(0,0)'],
            [<Code>s₂ → s₁</Code>, <Code>C[I+1][J]</Code>, '(1,0)'],
            [<Code>s₂ → s₃</Code>, <Code>C[I+1][J]</Code>, '(1,0)'],
          ]}
        />
        <p className="text-sm">
          <Code>s₁ ⇄ s₂</Code> form a cycle (via <Code>(0,0)</Code> and <Code>(1,0)</Code>) ⇒ SCC <Code>{'{s₁,s₂}'}</Code>;{' '}
          <Code>s₃</Code> is separate.
        </p>
      </>
    ),
  },
  {
    title: '2 · Distribute the INNER loop first',
    body: (
      <>
        <p className="text-sm mb-1">
          For the inner (J) loop we <strong>ignore dependences carried by the outer loop</strong> — the <Code>(1,0)</Code>{' '}
          edges have J-distance 0 and are carried by I, so they drop out. Only the loop-independent <Code>s₁ → s₂</Code>{' '}
          remains ⇒ <strong>no cycle</strong>, split into three inner loops:
        </p>
        <Pre>{`for (I = 1; I <= 100; I++) {
  for (h2 = 0; h2 <= 99; h2++)
    A[I][h2+1]   = B[I][h2+1] + C[I][h2+1];
  for (h2 = 0; h2 <= 99; h2++)
    C[I+1][h2+1] = C[I][h2+1] + A[I][h2+1];
  for (h2 = 0; h2 <= 99; h2++)
    D[I][h2+1]   = C[I][h2+1] - 1;
}`}</Pre>
      </>
    ),
  },
  {
    title: '3 · Distribute the OUTER loop — inner loops are atomic',
    body: (
      <>
        <p className="text-sm mb-1">
          Now treat each inner loop as one node. The cycle <Code>s₁ ⇄ s₂</Code> (via the outer-carried <Code>(1,0)</Code>)
          keeps their loops together; <Code>s₃</Code>'s loop splits off after:
        </p>
        <Pre>{`for (h1 = 0; h1 <= 99; h1++) {
  for (h2 = 0; h2 <= 99; h2++)
    A[h1+1][h2+1] = B[h1+1][h2+1] + C[h1+1][h2+1];
  for (h2 = 0; h2 <= 99; h2++)
    C[h1+2][h2+1] = C[h1+1][h2+1] + A[h1+1][h2+1];
}
for (h1 = 0; h1 <= 99; h1++)
  for (h2 = 0; h2 <= 99; h2++)
    D[h1+1][h2+1] = C[h1+1][h2+1] - 1;`}</Pre>
        <Panel className="text-sm leading-relaxed">
          <Good>Done.</Good> The <Code>{'{s₁,s₂}'}</Code> nest stays fused because their cycle is carried by the{' '}
          <em>outer</em> loop; <Code>s₃</Code> becomes its own nest.
        </Panel>
      </>
    ),
  },
]

const NestSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Nested loops — inside-out</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Nested loops are distributed <strong>from the innermost loop outward</strong>. When distributing an outer loop,
          each already-formed <strong>inner loop is treated as one atomic unit</strong>. The same SCC test applies at each
          level — but which dependences <em>count</em> changes with the level.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="shrink-0">
            <FlowGraph
              nodes={nestNodes}
              edges={nestEdges}
              width={170}
              height={240}
              maxW={180}
              fillOf={(id) => (id === 's3' ? 'succ' : 'loop')}
              caption="{s₁,s₂} cycle (via (1,0)) · s₃ apart"
            />
          </div>
          <div className="flex-1 min-w-0">
            <Stepper steps={nestSteps} showProgress />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The level rule in one line</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          A dependence with distance <Code>(d₁, d₂)</Code> is <strong>carried by the inner loop</strong> iff{' '}
          <Code>d₁ = 0</Code> (and <Code>d₂ ≠ 0</Code>); it is <strong>carried by the outer loop</strong> iff{' '}
          <Code>d₁ ≠ 0</Code>. When distributing a given level, only the dependences it carries (plus loop-independent
          ones, <Code>(0,0)</Code>) can create a cycle at that level.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 4 · Questions
 * ================================================================== */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on §4.3, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Distribute using SCCs and topological order"
      statement={
        <>
          <p className="mb-2">
            Build the dependence graph, find the SCCs, and give the distributed loops in a correct order.
          </p>
          <Pre>{`for (i = 1; i <= n; i++) {
  s1: x[i] = y[i-1] + 1;
  s2: y[i] = x[i] * 2;
  s3: z[i] = y[i] + w[i];
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1"><strong>Dependences:</strong></p>
          <Table
            head={['Dep', 'Via', 'Distance']}
            rows={[
              [<Code>s₁ → s₂</Code>, <Code>x[i]</Code>, '(0)'],
              [<Code>s₂ → s₁</Code>, <Code>y[i-1]</Code>, '(1)'],
              [<Code>s₂ → s₃</Code>, <Code>y[i]</Code>, '(0)'],
            ]}
          />
          <p className="text-sm mb-1">
            <strong>SCCs:</strong> <Code>s₁ ⇄ s₂</Code> form a cycle (<Code>x[i]</Code> forward, <Code>y[i−1]</Code>{' '}
            backward) ⇒ <Code>{'{s₁,s₂}'}</Code>; <Code>s₃</Code> alone. <strong>Order:</strong> <Code>{'{s₁,s₂}'}</Code>{' '}
            before <Code>{'{s₃}'}</Code> (edge s₂→s₃).
          </p>
          <Pre>{`for (ib = 0; ib < n; ib++) {   // {s1, s2} — cycle, cannot split
  x[ib+1] = y[ib] + 1;
  y[ib+1] = x[ib+1] * 2;
}
for (ib = 0; ib < n; ib++)     // {s3}
  z[ib+1] = y[ib+1] + w[ib+1];`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Legal:</Good> the cyclic pair stays fused, and putting <Code>s₃</Code>'s loop after preserves the
            forward dependence <Code>s₂ → s₃</Code> on <Code>y[i]</Code>.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="No cycle — split into the maximum number of loops"
      statement={
        <>
          <p className="mb-2">Distribute this loop into as many loops as legal, and name the advantage.</p>
          <Pre>{`for (i = 0; i < n; i++) {
  s1: a[i] = b[i] + 1;
  s2: c[i] = d[i] * 2;
  s3: e[i] = a[i] + c[i];
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Dependences: <Code>s₁ → s₃</Code> (via <Code>a[i]</Code>, distance 0) and <Code>s₂ → s₃</Code> (via{' '}
            <Code>c[i]</Code>, distance 0). <strong>No cycle</strong>, so all three can be separated. A valid topological
            order is <Code>s₁, s₂, s₃</Code> (s₃ must come last):
          </p>
          <Pre>{`for (i = 0; i < n; i++)  a[i] = b[i] + 1;
for (i = 0; i < n; i++)  c[i] = d[i] * 2;
for (i = 0; i < n; i++)  e[i] = a[i] + c[i];`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Advantage:</Good> each loop has a small body and touches fewer arrays ⇒ better instruction-cache
            behaviour and data locality. (The <Code>s₁</Code> and <Code>s₂</Code> loops are independent and could even run
            in parallel.)
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="A cycle that cannot be split"
      statement={
        <>
          <p className="mb-2">Can this loop be distributed? Build the graph and justify.</p>
          <Pre>{`for (i = 1; i <= n; i++) {
  s1: a[i] = b[i] + c[i-1];
  s2: c[i] = a[i] - 1;
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Dependences: <Code>s₁ → s₂</Code> (via <Code>a[i]</Code>, distance 0) and <Code>s₂ → s₁</Code> (via{' '}
            <Code>c[i−1]</Code>, distance 1). The two edges form a <strong>cycle</strong>, so <Code>{'{s₁,s₂}'}</Code> is a
            single SCC.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Bad>Not distributable.</Bad> The loop-carried <Code>c[i−1]</Code> creates a back-edge; splitting <Code>s₁</Code>{' '}
            and <Code>s₂</Code> into separate loops would break the cycle. The loop must stay as one — distribution yields
            no split here.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Four statements, three loops"
      statement={
        <>
          <p className="mb-2">
            Give the dependence graph with distances, the SCCs, a topological order, and the fully distributed code.
          </p>
          <Pre>{`for (i = 1; i <= n; i++) {
  s1: a[i] = a[i] + b[i-1];
  s2: b[i] = c[i-1] * x;
  s3: c[i] = 1 / b[i];
  s4: d[i] = sqrt(c[i]);
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1"><strong>Dependences:</strong></p>
          <Formula>{`s2 →(0) s3   (b[i])        s3 →(1) s2   (c[i-1])
s2 →(1) s1   (b[i-1])      s3 →(0) s4   (c[i])`}</Formula>
          <p className="text-sm mb-1">
            <strong>SCCs:</strong> <Code>Z₁={'{s₁}'}</Code>, <Code>Z₂={'{s₂,s₃}'}</Code> (cycle), <Code>Z₃={'{s₄}'}</Code>.{' '}
            <strong>Topological order:</strong> <Code>Z₂, Z₁, Z₃</Code>.
          </p>
          <Pre>{`for (ib = 0; ib < n; ib++) {   // Z2 = {s2, s3}
  b[ib+1] = c[ib] * x;
  c[ib+1] = 1 / b[ib+1];
}
for (ib = 0; ib < n; ib++)     // Z1 = {s1}
  a[ib+1] = a[ib+1] + b[ib];
for (ib = 0; ib < n; ib++)     // Z3 = {s4}
  d[ib+1] = sqrt(c[ib+1]);`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Correct:</Good> the cyclic <Code>{'{s₂,s₃}'}</Code> stays fused and runs first (everything depends on
            it); <Code>s₁</Code> and <Code>s₄</Code> each split into their own loop.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Nested-loop distribution (inner then outer)"
      statement={
        <>
          <p className="mb-2">
            Split this nest into the maximum number of loops. Distribute the inner loop first, then the outer, treating
            inner loops as atomic.
          </p>
          <Pre>{`for (I = 1; I <= 100; I++)
  for (J = 1; J <= 100; J++) {
    s1: A[I][J]   = B[I][J] + C[I][J];
    s2: C[I+1][J] = C[I][J] + A[I][J];
    s3: D[I][J]   = C[I][J] - 1;
  }`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Dependences:</strong> <Code>s₁ →(0,0) s₂</Code> (via <Code>A[I][J]</Code>),{' '}
            <Code>s₂ →(1,0) s₁</Code> and <Code>s₂ →(1,0) s₃</Code> (via <Code>C[I+1][J]</Code>). So <Code>{'{s₁,s₂}'}</Code>{' '}
            is an SCC; <Code>s₃</Code> is separate.
          </p>
          <p className="text-sm mb-1">
            <strong>Inner (J) distribution:</strong> the <Code>(1,0)</Code> edges are carried by the outer loop (J-distance
            0), so ignore them — only <Code>s₁→s₂ (0,0)</Code> remains ⇒ no cycle ⇒ three inner loops:
          </p>
          <Pre>{`for (I = 1; I <= 100; I++) {
  for (h2 = 0; h2 <= 99; h2++)  A[I][h2+1]   = B[I][h2+1] + C[I][h2+1];
  for (h2 = 0; h2 <= 99; h2++)  C[I+1][h2+1] = C[I][h2+1] + A[I][h2+1];
  for (h2 = 0; h2 <= 99; h2++)  D[I][h2+1]   = C[I][h2+1] - 1;
}`}</Pre>
          <p className="text-sm mb-1">
            <strong>Outer (I) distribution:</strong> now the <Code>(1,0)</Code> cycle <Code>s₁ ⇄ s₂</Code> is carried by
            the outer loop ⇒ their loops stay together; <Code>s₃</Code>'s loop splits off:
          </p>
          <Pre>{`for (h1 = 0; h1 <= 99; h1++) {
  for (h2 = 0; h2 <= 99; h2++)  A[h1+1][h2+1] = B[h1+1][h2+1] + C[h1+1][h2+1];
  for (h2 = 0; h2 <= 99; h2++)  C[h1+2][h2+1] = C[h1+1][h2+1] + A[h1+1][h2+1];
}
for (h1 = 0; h1 <= 99; h1++)
  for (h2 = 0; h2 <= 99; h2++)  D[h1+1][h2+1] = C[h1+1][h2+1] - 1;`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Key idea:</Good> a dependence blocks distribution only at the level that <em>carries</em> it. The
            <Code> (1,0)</Code> cycle is invisible to the inner loop but binding for the outer one.
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
  { id: 'algo', label: 'The SCC algorithm', render: () => <AlgoSection /> },
  { id: 'nested', label: 'Nested loops', render: () => <NestSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function LoopDistributionStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 4 · §4.3 · Loop Distribution"
      title="Loop Distribution (Fission)"
      subtitle="The inverse of fusion: split one loop into several smaller loops for better instruction-cache and data locality. The algorithm collapses the dependence graph into strongly connected components — cycles stay together — and emits one loop per component in topological order. Nested loops are handled inside-out."
      tabs={tabs}
    />
  )
}
