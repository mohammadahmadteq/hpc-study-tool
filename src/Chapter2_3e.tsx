import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import {
  Code,
  Pre,
  Panel,
  Good,
  Bad,
  Stepper,
  QuestionCard,
  StudyShell,
  FlowGraph,
  type Fill,
  type StepPanel,
  type GNode,
  type GEdge,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  §2.3.1 — Optimizing transformations for Quicksort  (PDF pp. 105–119)
 *  The end-to-end case study that uses all four applications.
 * ------------------------------------------------------------------ */

const qsNodes: GNode[] = [
  { id: 'B1', x: 50, y: 150, label: 'B1' },
  { id: 'B2', x: 150, y: 70, label: 'B2' },
  { id: 'B3', x: 290, y: 70, label: 'B3' },
  { id: 'B4', x: 290, y: 165, label: 'B4' },
  { id: 'B5', x: 165, y: 250, label: 'B5' },
  { id: 'B6', x: 340, y: 255, label: 'B6' },
]
const qsEdges: GEdge[] = [
  { from: 'B1', to: 'B2' },
  { from: 'B2', to: 'B2', bend: 0 },
  { from: 'B2', to: 'B3' },
  { from: 'B3', to: 'B3', bend: 0 },
  { from: 'B3', to: 'B4' },
  { from: 'B4', to: 'B5' },
  { from: 'B4', to: 'B6' },
  { from: 'B5', to: 'B2', bend: 60 },
]

const qsCode: Record<string, string[]> = {
  B1: ['i := m−1', 'j := n', 't1 := 4·n', 'v := a[t1]'],
  B2: ['i := i+1', 't2 := 4·i', 't3 := a[t2]', 'if t3 < v goto B2'],
  B3: ['j := j−1', 't4 := 4·j', 't5 := a[t4]', 'if t5 > v goto B3'],
  B4: ['if i >= j goto B6'],
  B5: ['t6 := 4·i', 'x := a[t6]', 't7 := 4·i', 't8 := 4·j', 't9 := a[t8]', 'a[t7] := t9', 't10 := 4·j', 'a[t10] := x', 'goto B2'],
  B6: ['t11 := 4·i', 'x := a[t11]', 't12 := 4·i', 't13 := 4·n', 't14 := a[t13]', 'a[t12] := t14', 't15 := 4·n', 'a[t15] := x'],
}

const QsExplorer: React.FC<{ codeMap?: Record<string, string[]>; note?: string }> = ({ codeMap = qsCode, note }) => {
  const [sel, setSel] = useState('B5')
  const fillOf = (id: string): Fill => (id === sel ? 'active' : 'none')
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
      <div>
        <FlowGraph nodes={qsNodes} edges={qsEdges} width={400} height={310} maxW={340} fillOf={fillOf} onPick={(id) => codeMap[id] && setSel(id)} />
        <p className="text-center text-xs text-muted-foreground">click a block</p>
      </div>
      <div>
        <Panel>
          <div className="text-xs font-semibold text-muted-foreground mb-1">{sel}</div>
          <div className="font-mono text-[12px] whitespace-pre leading-[1.55]">{codeMap[sel].join('\n')}</div>
        </Panel>
        {note && <p className="text-xs text-muted-foreground mt-2">{note}</p>}
      </div>
    </div>
  )
}

/* B5 transformation chain (PDF p.113 + p.116) */
const b5Steps: StepPanel[] = [
  {
    title: '0 · B5 after local CSE',
    body: <Pre>{`t6 := 4·i
x  := a[t6]
t8 := 4·j
t9 := a[t8]
a[t6] := t9
a[t8] := x
goto B2`}</Pre>,
  },
  {
    title: '1 · Global CSE — reuse 4·i (=t2) and 4·j (=t4) from B2/B3',
    body: (
      <>
        <Pre>{`t6 := t2        (4·i computed in B2)
x  := a[t6]
t8 := t4        (4·j computed in B3)
t9 := a[t8]
a[t6] := t9
a[t8] := x
goto B2`}</Pre>
        <p className="text-xs text-muted-foreground">Available expressions show <Code>4·i</Code>/<Code>4·j</Code> reach B5 unchanged.</p>
      </>
    ),
  },
  {
    title: '2 · Local copy propagation (t6→t2, t8→t4)',
    body: <Pre>{`t6 := t2
x  := a[t2]
t8 := t4
t9 := a[t4]
a[t2] := t9
a[t4] := x
goto B2`}</Pre>,
  },
  {
    title: '3 · Global CSE on the loads — a[t2]=t3, a[t4]=t5',
    body: <Pre>{`t6 := t2
x  := t3        (a[t2] already computed in B2)
t8 := t4
t9 := t5        (a[t4] already computed in B3)
a[t2] := t9
a[t4] := x
goto B2`}</Pre>,
  },
  {
    title: '4 · Local copy propagation (t9→t5)',
    body: <Pre>{`t6 := t2
x  := t3
t8 := t4
t9 := t5
a[t2] := t5
a[t4] := x
goto B2`}</Pre>,
  },
  {
    title: '5 · Dead-code elimination — t6, t8, t9 unused',
    body: (
      <>
        <Pre>{`x := t3
a[t2] := t5
a[t4] := x
goto B2`}</Pre>
        <p className="text-sm">
          A final copy-prop of <Code>x</Code> + dead-code gives <Code>a[t4] := t3</Code>, leaving just two stores. Four
          multiplies and two loads are gone from the loop body.
        </p>
      </>
    ),
  },
]

/* B6 transformation chain (PDF p.114 + p.116) */
const b6Steps: StepPanel[] = [
  {
    title: '0 · B6 after local CSE',
    body: <Pre>{`t11 := 4·i
x   := a[t11]
t13 := 4·n
t14 := a[t13]
a[t11] := t14
a[t13] := x`}</Pre>,
  },
  {
    title: '1 · Global CSE — 4·i = t2, 4·n = t1',
    body: <Pre>{`t11 := t2
x   := a[t11]
t13 := t1
t14 := a[t13]
a[t11] := t14
a[t13] := x`}</Pre>,
  },
  {
    title: '2 · Local copy propagation (t11→t2, t13→t1)',
    body: <Pre>{`t11 := t2
x   := a[t2]
t13 := t1
t14 := a[t1]
a[t2] := t14
a[t1] := x`}</Pre>,
  },
  {
    title: '3 · Global CSE — a[t2] = t3',
    body: <Pre>{`t11 := t2
x   := t3
t13 := t1
t14 := a[t1]
a[t2] := t14
a[t1] := x`}</Pre>,
  },
  {
    title: '4 · Dead-code elimination — t11, t13 unused (+ final copy-prop of x)',
    body: (
      <>
        <Pre>{`t14 := a[t1]
a[t2] := t14
a[t1] := t3`}</Pre>
        <p className="text-sm">
          <Code>4·n</Code> was already <Code>t1</Code> from B1, so the recomputations vanish; only the genuine load{' '}
          <Code>a[t1]</Code> and the two stores remain.
        </p>
      </>
    ),
  },
]

const finalCode: Record<string, string[]> = {
  B1: ['i := m−1', 'j := n', 't1 := 4·n', 'v := a[t1]', 't2 := 4·i', 't4 := 4·j'],
  B2: ['t2 := t2+4', 't3 := a[t2]', 'if t3 < v goto B2'],
  B3: ['t4 := t4−4', 't5 := a[t4]', 'if t5 > v goto B3'],
  B4: ['if t2 >= t4 goto B6'],
  B5: ['a[t2] := t5', 'a[t4] := t3', 'goto B2'],
  B6: ['t14 := a[t1]', 'a[t2] := t14', 'a[t1] := t3'],
}

/* ---- section bodies ---- */

const CodeCfg: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The partition step of Quicksort</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`void quicksort(int m, int n) {
  int i, j, v, x;
  if (n <= m) return;
  i = m−1; j = n; v = a[n];
  while (1) {
    do i = i+1; while (a[i] < v);
    do j = j−1; while (a[j] > v);
    if (i >= j) break;
    x = a[i]; a[i] = a[j]; a[j] = x;   // swap
  }
  x = a[i]; a[i] = a[n]; a[n] = x;
  quicksort(m, j); quicksort(i+1, n);
}`}</Pre>
        <p className="text-sm">
          The partition loop is the hot path. We translate it to three-address code, build the flow graph, then apply{' '}
          <strong>all four §2.3 applications</strong> in turn.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Three-address code (30 instructions)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Pre>{` (1) i  := m−1
 (2) j  := n
 (3) t1 := 4·n
 (4) v  := a[t1]
 (5) i  := i+1
 (6) t2 := 4·i
 (7) t3 := a[t2]
 (8) if t3 < v goto (5)
 (9) j  := j−1
(10) t4 := 4·j
(11) t5 := a[t4]
(12) if t5 > v goto (9)
(13) if i >= j goto (23)
(14) t6 := 4·i
(15) x  := a[t6]`}</Pre>
          <Pre>{`(16) t7  := 4·i
(17) t8  := 4·j
(18) t9  := a[t8]
(19) a[t7]  := t9
(20) t10 := 4·j
(21) a[t10] := x
(22) goto (5)
(23) t11 := 4·i
(24) x   := a[t11]
(25) t12 := 4·i
(26) t13 := 4·n
(27) t14 := a[t13]
(28) a[t12] := t14
(29) t15 := 4·n
(30) a[t15] := x`}</Pre>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Flow graph — explore the blocks</CardTitle>
      </CardHeader>
      <CardContent>
        <QsExplorer note="B2 and B3 are the inner do-while loops (self edges). B4 is the i>=j test; B5 does the swap and loops back to B2; B6 is the final placement of the pivot." />
      </CardContent>
    </Card>
  </div>
)

const LocalCse: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Step 1 — local common subexpressions in B5</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Inside B5, <Code>4·i</Code> appears as <Code>t6</Code> and <Code>t7</Code> (<Code>i</Code> not redefined), and{' '}
          <Code>4·j</Code> as <Code>t8</Code> and <Code>t10</Code>. Use the first of each.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">B5 before</div>
            <Pre>{`t6  := 4·i
x   := a[t6]
t7  := 4·i
t8  := 4·j
t9  := a[t8]
a[t7]  := t9
t10 := 4·j
a[t10] := x
goto B2`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">B5 after (use t6, t8)</div>
            <Pre>{`t6 := 4·i
x  := a[t6]
t8 := 4·j
t9 := a[t8]
a[t6] := t9
a[t8] := x
goto B2`}</Pre>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Step 1 — local common subexpressions in B6</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          In B6, <Code>4·i</Code> is <Code>t11</Code>/<Code>t12</Code> and <Code>4·n</Code> is <Code>t13</Code>/
          <Code>t15</Code>. Use <Code>t11</Code> and <Code>t13</Code>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">B6 before</div>
            <Pre>{`t11 := 4·i
x   := a[t11]
t12 := 4·i
t13 := 4·n
t14 := a[t13]
a[t12] := t14
t15 := 4·n
a[t15] := x`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">B6 after (use t11, t13)</div>
            <Pre>{`t11 := 4·i
x   := a[t11]
t13 := 4·n
t14 := a[t13]
a[t11] := t14
a[t13] := x`}</Pre>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Local CSE needs no data-flow sets — both copies are visible inside the block.
        </p>
      </CardContent>
    </Card>
  </div>
)

const GlobalChain: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Step 2 — global CSE + copy propagation + dead code (B5)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Now reach across blocks: <Code>4·i = t2</Code> (B2), <Code>4·j = t4</Code> (B3), and the loads{' '}
          <Code>a[t2]=t3</Code>, <Code>a[t4]=t5</Code>. Walk the chain:
        </p>
        <Stepper steps={b5Steps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Step 2 — the same chain on B6</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          B6 reuses <Code>4·i = t2</Code>, <Code>4·n = t1</Code>, and <Code>a[t2] = t3</Code>:
        </p>
        <Stepper steps={b6Steps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Flow graph after global CSE / copy-prop / dead-code</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          B5 and B6 collapse to a handful of stores. (B2/B3 still recompute <Code>4·i</Code>/<Code>4·j</Code> — that is the
          next step.)
        </p>
        <QsExplorer
          codeMap={{
            ...qsCode,
            B5: ['a[t2] := t5', 'a[t4] := t3', 'goto B2'],
            B6: ['t14 := a[t1]', 'a[t2] := t14', 'a[t1] := t3'],
          }}
          note="Click B5 / B6 to see the reduced bodies; B2, B3, B4 are unchanged so far."
        />
      </CardContent>
    </Card>
  </div>
)

const IvFinal: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Step 3 — induction variables &amp; strength reduction</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          In B2, <Code>i</Code> is a simple IV and <Code>t2 = 4·i</Code> has triple <Code>(i,4,0)</Code>. In B3,{' '}
          <Code>j</Code> is simple and <Code>t4 = 4·j</Code> has triple <Code>(j,4,0)</Code>. Strength-reduce both:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">B2 before / after</div>
            <Pre>{`i := i+1          ⇒    t2 := t2 + 4
t2 := 4·i               t3 := a[t2]
t3 := a[t2]             if t3 < v goto B2
if t3 < v goto B2
   pre-header B1: t2 := 4·i`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">B3 before / after</div>
            <Pre>{`j := j−1          ⇒    t4 := t4 − 4
t4 := 4·j               t5 := a[t4]
t5 := a[t4]             if t5 > v goto B3
if t5 > v goto B3
   pre-header B1: t4 := 4·j`}</Pre>
          </div>
        </div>
        <Panel className="text-sm mt-1">
          Each loop multiply became an <Good>addition</Good>. Since <Code>t2</Code>, <Code>t4</Code> now track{' '}
          <Code>4·i</Code>, <Code>4·j</Code>, the test <Code>if i &gt;= j</Code> in B4 can use <Code>if t2 &gt;= t4</Code> —
          after which <Code>i</Code> and <Code>j</Code> are dead and <Bad>their updates are removed entirely</Bad>.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Final optimized flow graph</CardTitle>
      </CardHeader>
      <CardContent>
        <QsExplorer codeMap={finalCode} note="i and j are gone; B2/B3 run additions; B4 tests t2 >= t4. Compare B1 — it now also initializes t2 and t4 (the strength-reduction pre-header inits)." />
        <p className="text-sm mt-2">
          From 30 instructions with a multiply on every iteration to additions only, no <Code>i</Code>/<Code>j</Code>, and
          minimal stores — the cumulative payoff of CSE → copy propagation → dead code → induction-variable elimination →
          strength reduction.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ---- questions ---- */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on the Quicksort optimization, easy → hardest. Q1 is fully worked; do the rest on paper,
      then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Local CSE on block B5"
      statement={
        <>
          <p className="mb-2">Eliminate the local common subexpressions in B5:</p>
          <Pre>{`t6  := 4·i
x   := a[t6]
t7  := 4·i
t8  := 4·j
t9  := a[t8]
a[t7]  := t9
t10 := 4·j
a[t10] := x
goto B2`}</Pre>
          <p>Identify each common subexpression and give the resulting block.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">
            <Code>t7 := 4·i</Code> equals <Code>t6 := 4·i</Code> (<Code>i</Code> not redefined between) → use{' '}
            <Code>t6</Code>. <Code>t10 := 4·j</Code> equals <Code>t8 := 4·j</Code> → use <Code>t8</Code>.
          </p>
          <Pre>{`t6 := 4·i
x  := a[t6]
t8 := 4·j
t9 := a[t8]
a[t6] := t9
a[t8] := x
goto B2`}</Pre>
          <p className="text-xs text-muted-foreground">
            Two redundant multiplies removed; all reasoning stays inside the block (no data-flow sets needed).
          </p>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Why B2 and B3 are loops"
      statement={
        <p>
          From the three-address code, explain which instructions form the basic blocks <Code>B2</Code> and{' '}
          <Code>B3</Code>, and why each is a single-block loop. What source construct do they come from?
        </p>
      }
      solution={
        <>
          <Panel className="text-sm">
            <Code>B2</Code> = (5)–(8): <Code>i:=i+1; t2:=4·i; t3:=a[t2]; if t3&lt;v goto (5)</Code>. The branch targets its
            own first instruction (5) → a self-loop. It is the <Code>do i=i+1; while(a[i]&lt;v)</Code> loop.
          </Panel>
          <Panel className="text-sm">
            <Code>B3</Code> = (9)–(12): <Code>j:=j−1; t4:=4·j; t5:=a[t4]; if t5&gt;v goto (9)</Code> — the{' '}
            <Code>do j=j−1; while(a[j]&gt;v)</Code> loop, likewise a self-loop.
          </Panel>
          <p className="text-xs text-muted-foreground">A conditional branch back to the block’s leader creates the back edge → the loop.</p>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Global CSE across B2 and B5"
      statement={
        <>
          <p className="mb-2">After local CSE, B5 begins:</p>
          <Pre>{`t6 := 4·i
x  := a[t6]
…
a[t6] := t9`}</Pre>
          <p>
            B2 contains <Code>t2 := 4·i</Code>. Using available-expressions reasoning, justify replacing <Code>t6 := 4·i</Code>{' '}
            by <Code>t6 := t2</Code>, then propagate the copy.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">
            On every path from B2 to B5, <Code>4·i</Code> is computed (in B2) and <Code>i</Code> is not reassigned before
            B5 (B5’s entry precedes any change). So <Code>4·i</Code> is <Good>available</Good> at B5 → replace its
            recomputation: <Code>t6 := t2</Code>.
          </p>
          <p className="text-sm mb-2">
            <Code>t6 := t2</Code> is the only definition of <Code>t6</Code> reaching its uses and <Code>t2</Code> isn’t
            reassigned, so copy-propagate <Code>t6 → t2</Code>:
          </p>
          <Pre>{`x := a[t2]
…
a[t2] := t9      (t6 := t2 now dead → removed)`}</Pre>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Full transformation chain on B6"
      statement={
        <>
          <p className="mb-2">Starting from B6 after local CSE:</p>
          <Pre>{`t11 := 4·i
x   := a[t11]
t13 := 4·n
t14 := a[t13]
a[t11] := t14
a[t13] := x`}</Pre>
          <p>
            Apply global CSE (<Code>4·i=t2</Code>, <Code>4·n=t1</Code>, <Code>a[t2]=t3</Code>), local copy propagation, and
            dead-code elimination. Give the final B6.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">Global CSE + copy propagation</p>
          <Pre>{`t11 := t2 ;  x := a[t2] → x := t3
t13 := t1 ;  t14 := a[t1]
a[t2]  := t14
a[t1]  := x → a[t1] := t3   (x = t3)`}</Pre>
          <p className="text-sm font-medium mb-1">Dead-code elimination (t11, t13, x unused)</p>
          <Pre>{`t14 := a[t1]
a[t2] := t14
a[t1] := t3`}</Pre>
          <Panel className="text-sm">
            <Code>4·n</Code> was already <Code>t1</Code> from B1 and <Code>4·i</Code> already <Code>t2</Code> from B2, so
            both recomputations disappear. Only the real load <Code>a[t1]</Code> and the two stores remain.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Strength reduction and eliminating i, j"
      statement={
        <>
          <p className="mb-2">After CSE, B2 and B3 still hold:</p>
          <Pre>{`B2:  i := i+1;  t2 := 4·i;  t3 := a[t2];  if t3 < v goto B2
B3:  j := j−1;  t4 := 4·j;  t5 := a[t4];  if t5 > v goto B3
B4:  if i >= j goto B6`}</Pre>
          <p>
            (a) Strength-reduce <Code>t2</Code> and <Code>t4</Code>, giving the pre-header inits. (b) Show how the test in
            B4 lets <Code>i</Code> and <Code>j</Code> be eliminated.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Strength reduction (triples (i,4,0), (j,4,0))</p>
          <Pre>{`pre-header B1:  t2 := 4·i      t4 := 4·j
B2:  t2 := t2 + 4 ;  t3 := a[t2] ;  if t3 < v goto B2
B3:  t4 := t4 − 4 ;  t5 := a[t4] ;  if t5 > v goto B3`}</Pre>
          <p className="text-xs text-muted-foreground mb-2">
            <Code>i:=i+1</Code> with <Code>c·n = 4·1 = 4</Code> → <Code>t2 := t2+4</Code>; <Code>j:=j−1</Code> with{' '}
            <Code>4·(−1) = −4</Code> → <Code>t4 := t4−4</Code>.
          </p>
          <p className="text-sm font-medium mb-1">(b) Removing i and j</p>
          <Panel className="text-sm">
            <Code>i</Code> and <Code>j</Code> are now used <em>only</em> in the comparison <Code>i &gt;= j</Code>. Since{' '}
            <Code>t2 = 4i</Code> and <Code>t4 = 4j</Code> are monotonic in <Code>i</Code>, <Code>j</Code>, the test{' '}
            <Code>i &gt;= j ⇔ 4i &gt;= 4j ⇔ t2 &gt;= t4</Code>. Replace B4 with <Code>if t2 &gt;= t4 goto B6</Code>; then{' '}
            <Code>i := i+1</Code> and <Code>j := j−1</Code> have no remaining uses → <Bad>dead</Bad> → removed. The loop
            now carries only <Code>t2</Code>, <Code>t4</Code> with additions — the final flow graph.
          </Panel>
        </>
      }
    />
  </div>
)

const tabs: TabDef[] = [
  { id: 'code', label: 'Code & flow graph', render: () => <CodeCfg /> },
  { id: 'localcse', label: 'Local CSE', render: () => <LocalCse /> },
  { id: 'global', label: 'Global CSE chain', render: () => <GlobalChain /> },
  { id: 'iv', label: 'IV & final graph', render: () => <IvFinal /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function QuicksortStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 2 · §2.3.1 · Case study"
      title="Optimizing Quicksort"
      subtitle="The full pipeline on Quicksort's partition loop: three-address code → local & global common subexpression elimination → copy propagation → dead code → induction variables & strength reduction."
      tabs={tabs}
    />
  )
}
