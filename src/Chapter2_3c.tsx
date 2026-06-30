import React, { useState } from 'react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { cn } from './lib/utils'
import {
  Code,
  Pre,
  Formula,
  Step,
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
 *  §2.3 Application 3 — loop-invariant computations & code motion
 *  (PDF pp. 93–98)
 * ------------------------------------------------------------------ */

/* shared loop CFG: B2 header, loop L = {B2,B3,B4}, exit node B4 → B5 */
const loopNodes: GNode[] = [
  { id: 'entry', x: 150, y: 16, label: 'entry', point: true },
  { id: 'B1', x: 150, y: 60, label: 'B1' },
  { id: 'B2', x: 150, y: 126, label: 'B2' },
  { id: 'B3', x: 60, y: 196, label: 'B3' },
  { id: 'B4', x: 150, y: 266, label: 'B4' },
  { id: 'B5', x: 150, y: 334, label: 'B5' },
  { id: 'exit', x: 150, y: 378, label: 'exit', point: true },
]
const loopEdges: GEdge[] = [
  { from: 'entry', to: 'B1' },
  { from: 'B1', to: 'B2' },
  { from: 'B2', to: 'B3', label: 'u<v' },
  { from: 'B2', to: 'B4', bend: 30 },
  { from: 'B3', to: 'B4' },
  { from: 'B4', to: 'B2', bend: -70 },
  { from: 'B4', to: 'B5' },
  { from: 'B5', to: 'exit' },
]

const ex1Code: Record<string, string[]> = {
  B1: ['i := 1'],
  B2: ['if u<v goto B3'],
  B3: ['i := 2', 'u := u+1'],
  B4: ['v := v−1', 'if v<20 goto B5'],
  B5: ['j := i'],
}
const ex2Code: Record<string, string[]> = {
  B1: ['i := 1'],
  B2: ['i := 3', 'if u<v goto B3'],
  B3: ['i := 2', 'u := u+1'],
  B4: ['v := v−1', 'if v<20 goto B5'],
  B5: ['j := i'],
}

const LOOP = new Set(['B2', 'B3', 'B4'])

/* interactive: switch examples, see invariant block / exit node / verdict */
const LoopExamples: React.FC = () => {
  const [ex, setEx] = useState<'1' | '2'>('1')
  const code = ex === '1' ? ex1Code : ex2Code
  const invBlock = ex === '1' ? 'B3' : 'B2' // block holding the candidate i:=2 / i:=3
  const invStmt = ex === '1' ? 'i := 2 (in B3)' : 'i := 3 (in B2)'

  const fillOf = (id: string): Fill => {
    if (id === invBlock) return 'move' // candidate statement
    if (id === 'B4') return 'succ' // exit node
    if (LOOP.has(id)) return 'loop'
    return 'none'
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(['1', '2'] as const).map((e) => (
          <Button key={e} size="sm" variant={ex === e ? 'default' : 'outline'} onClick={() => setEx(e)}>
            Example {e}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <div>
          <FlowGraph nodes={loopNodes} edges={loopEdges} width={300} height={398} maxW={250} fillOf={fillOf} />
          <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 justify-center">
            <span><span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: '#8b5cf6' }} />candidate stmt</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: '#f59e0b' }} />exit node B4</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1 bg-primary" />loop body</span>
          </div>
        </div>
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className="bg-muted px-2 py-1 text-left font-medium border-b">B</th>
                  <th className="bg-muted px-2 py-1 text-left font-medium border-b">code</th>
                </tr>
              </thead>
              <tbody>
                {['B1', 'B2', 'B3', 'B4', 'B5'].map((b) => (
                  <tr key={b} className={cn('border-b last:border-b-0', b === invBlock && 'bg-primary/10')}>
                    <td className="px-2 py-1 font-mono font-semibold align-top">{b}</td>
                    <td className="px-2 py-1 font-mono text-[11px] whitespace-pre">{code[b].join('\n')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ex === '1' ? (
            <Panel className="text-sm mt-2">
              Candidate <Code>{invStmt}</Code>. Rule 1 fails: block <Code>B3</Code> does <Bad>not</Bad> dominate the exit
              node <Code>B4</Code> (path <Code>B2→B4</Code> skips B3). If B3 never runs, hoisting <Code>i:=2</Code> would
              wrongly make <Code>j:=i</Code> read 2. → <Bad>illegal move</Bad>.
            </Panel>
          ) : (
            <Panel className="text-sm mt-2">
              Candidate <Code>{invStmt}</Code>. Rule 1 holds (header <Code>B2</Code> dominates <Code>B4</Code>), but rule 2
              fails: <Code>i</Code> is assigned <em>twice</em> in the loop (<Code>i:=3</Code> in B2, <Code>i:=2</Code> in
              B3). After hoisting, once B3 sets <Code>i:=2</Code> a re-entry to B2 no longer resets it. → <Bad>illegal move</Bad>.
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

/* before/after preheader insertion */
const phBefore: GNode[] = [
  { id: 'p1', x: 60, y: 18, label: '·', point: true },
  { id: 'p2', x: 110, y: 18, label: '·', point: true },
  { id: 'p3', x: 160, y: 18, label: '·', point: true },
  { id: 'H', x: 110, y: 80, label: 'H', sub: 'header' },
  { id: 'L', x: 110, y: 150, label: 'L', sub: 'loop' },
]
const phBeforeE: GEdge[] = [
  { from: 'p1', to: 'H' },
  { from: 'p2', to: 'H' },
  { from: 'p3', to: 'H' },
  { from: 'H', to: 'L' },
  { from: 'L', to: 'H', bend: -52 },
]
const phAfter: GNode[] = [
  { id: 'p1', x: 60, y: 18, label: '·', point: true },
  { id: 'p2', x: 110, y: 18, label: '·', point: true },
  { id: 'p3', x: 160, y: 18, label: '·', point: true },
  { id: 'PH', x: 110, y: 70, label: 'PH', sub: 'pre' },
  { id: 'H', x: 110, y: 140, label: 'H', sub: 'header' },
  { id: 'L', x: 110, y: 208, label: 'L', sub: 'loop' },
]
const phAfterE: GEdge[] = [
  { from: 'p1', to: 'PH' },
  { from: 'p2', to: 'PH' },
  { from: 'p3', to: 'PH' },
  { from: 'PH', to: 'H' },
  { from: 'H', to: 'L' },
  { from: 'L', to: 'H', bend: -52 },
]

/* ---- section bodies ---- */

const Detection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What is loop-invariant?</CardTitle>
      </CardHeader>
      <CardContent>
        <Panel className="text-sm leading-relaxed">
          A statement <Code>x := y op z</Code> is <strong>loop-invariant</strong> w.r.t. a loop <Code>S</Code> if all
          possible assignments to <Code>y</Code> or <Code>z</Code> lie <em>outside</em> <Code>S</Code>. Then{' '}
          <Code>y op z</Code> has the <strong>same value in every iteration</strong>.
        </Panel>
        <p className="text-sm mt-2">
          <strong>Detected with reaching definitions:</strong> <Code>s : x := y op z</Code> is invariant if every
          definition of <Code>y</Code> and of <Code>z</Code> that reaches <Code>s</Code> lies outside <Code>S</Code>{' '}
          (a constant or outside-defined operand also qualifies).
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Invariance grows by iteration</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Once <Code>x := y op z</Code> is known invariant, a statement that depends on it can also be invariant:
        </p>
        <Formula>{`if  x := y op z  is loop-invariant
and w is defined outside the loop
then  v := x + w  is loop-invariant too`}</Formula>
        <Step n="↻">
          Iterate over the loop body, adding newly-invariant statements, until a pass finds <strong>no new ones</strong>{' '}
          (a small fixpoint).
        </Step>
        <p className="text-xs text-muted-foreground mt-1">
          The candidates found here are what we then try to <em>move</em> in front of the loop — but moving needs care.
        </p>
      </CardContent>
    </Card>
  </div>
)

const PreHeader: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The pre-header block</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Invariant statements are hoisted into a new <strong>pre-header</strong>: a block inserted in front of the loop
          header whose only successor is the header. Every edge that used to enter the header is redirected into the
          pre-header.
        </p>
        <div className="grid grid-cols-2 gap-3 items-start">
          <div>
            <div className="text-xs font-semibold text-center text-muted-foreground mb-1">before</div>
            <FlowGraph nodes={phBefore} edges={phBeforeE} width={220} height={200} maxW={190} />
          </div>
          <div>
            <div className="text-xs font-semibold text-center text-muted-foreground mb-1">after</div>
            <FlowGraph nodes={phAfter} edges={phAfterE} width={220} height={250} maxW={190} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          The back edge still targets the <strong>header</strong>, not the pre-header — so hoisted code runs{' '}
          <strong>once</strong>, before the loop, exactly as intended.
        </p>
      </CardContent>
    </Card>
  </div>
)

const cautionSteps: StepPanel[] = [
  {
    title: 'Rule 1 — dominate all exit nodes',
    body: (
      <>
        <Panel className="text-sm">
          A loop-invariant statement <Code>s</Code> may be moved to the pre-header only if the block <Code>B</Code>{' '}
          containing <Code>s</Code> <strong>dominates all exit nodes</strong> of the loop. An <strong>exit node</strong>{' '}
          is a loop block with a successor outside the loop.
        </Panel>
        <p className="text-sm mt-2">
          This guarantees <Code>s</Code> ran on <em>every</em> path through the loop before the move, so hoisting can’t
          introduce a value that wouldn’t otherwise exist (the Example-1 <Code>j:=i</Code> bug).
        </p>
      </>
    ),
  },
  {
    title: 'Rule 2 — only assignment to x in the loop',
    body: (
      <>
        <Panel className="text-sm">
          A loop-invariant <Code>s : x := …</Code> may be moved only if <Code>s</Code> is the <strong>only assignment to
          x</strong> in the loop body.
        </Panel>
        <p className="text-sm mt-2">
          Otherwise (Example 2) another assignment <Code>i:=2</Code> can overwrite the hoisted value, and re-entering the
          header no longer restores it — the final value of <Code>x</Code> differs from the original program.
        </p>
      </>
    ),
  },
  {
    title: 'When a rule fails — the temp-variable trick',
    body: (
      <>
        <p className="text-sm mb-2">
          If rules 1 and 2 are not both satisfied, you can still hoist the <em>computation</em> (not the assignment):
        </p>
        <Formula>{`given loop-invariant  x := y op z

pre-header:   t := y op z        (t fresh)
loop:         x := t             (replaces x := y op z)`}</Formula>
        <p className="text-sm">
          The expensive <Code>y op z</Code> moves out (computed once), while <Code>x := t</Code> stays in the loop — so
          control flow and the multiple-assignment semantics are preserved.
        </p>
      </>
    ),
  },
]

const Rules: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Two heuristic rules (and the safe fallback)</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={cautionSteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — the two illegal-move examples</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Both look hoistable but aren’t. Switch between them and read which rule blocks the move.
        </p>
        <LoopExamples />
      </CardContent>
    </Card>
  </div>
)

/* ---- questions ---- */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems, easy → hardest. Q1 is fully worked; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Identify invariants and hoist them safely"
      statement={
        <>
          <p className="mb-2">
            A single-block loop <Code>L</Code> (self-edge; exit test at the end), with <Code>a</Code>, <Code>b</Code>,{' '}
            <Code>n</Code> defined only outside <Code>L</Code>:
          </p>
          <Pre>{`L:  t := a + b        (only def of t in L)
    c := t · 2
    x[i] := c
    i := i + 1
    if i < n goto L`}</Pre>
          <p>
            (a) Which statements are loop-invariant? (b) May they be hoisted to the pre-header? Check both rules.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Invariant statements</p>
          <p className="text-sm mb-2">
            <Code>t := a+b</Code> — operands <Code>a,b</Code> defined outside <Code>L</Code> → invariant. Then{' '}
            <Code>c := t·2</Code>: <Code>t</Code> is now invariant and <Code>2</Code> constant → also invariant (second
            iteration of the search). <Code>x[i]:=c</Code> and <Code>i:=i+1</Code> use the loop counter <Code>i</Code> →{' '}
            <strong>not</strong> invariant.
          </p>
          <p className="text-sm font-medium mb-1">(b) Legality</p>
          <Panel className="text-sm">
            <strong>Rule 1:</strong> <Code>L</Code> is the only block and the only exit node (its branch leaves the loop),
            and <Code>L</Code> trivially dominates itself → satisfied. <strong>Rule 2:</strong> <Code>t</Code> and{' '}
            <Code>c</Code> are each assigned once in <Code>L</Code> → satisfied. Both rules hold → hoist:
          </Panel>
          <Pre>{`pre-header:  t := a + b
             c := t · 2
L:  x[i] := c
    i := i + 1
    if i < n goto L`}</Pre>
          <p className="text-xs text-muted-foreground">Two operations per iteration removed from the loop.</p>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Define loop-invariant and the detection test"
      statement={
        <p>
          Define what it means for <Code>x := y op z</Code> to be loop-invariant w.r.t. a loop <Code>S</Code>, and state
          the reaching-definitions test used to detect it.
        </p>
      }
      solution={
        <>
          <Panel className="text-sm">
            Invariant ⇔ all assignments to <Code>y</Code> or <Code>z</Code> lie outside <Code>S</Code>, so{' '}
            <Code>y op z</Code> has the same value each iteration.
          </Panel>
          <p className="text-sm mt-2">
            <strong>Test:</strong> <Code>s : x := y op z</Code> is invariant if every definition of <Code>y</Code> and of{' '}
            <Code>z</Code> reaching <Code>s</Code> lies outside <Code>S</Code> (or the operand is a constant / defined
            outside). Iterating this lets statements that depend on already-invariant values become invariant too.
          </p>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Rule 1: dominance of exit nodes"
      statement={
        <>
          <p className="mb-2">For the lecture loop (header B2, loop {'{B2,B3,B4}'}, B4 exits to B5):</p>
          <Pre>{`B1:  i := 1
B2:  if u<v goto B3
B3:  i := 2;  u := u+1
B4:  v := v−1;  if v<20 goto B5
B5:  j := i`}</Pre>
          <p>
            <Code>i := 2</Code> is loop-invariant. Explain, using rule 1, why it cannot be hoisted, and what bug would
            appear if it were.
          </p>
        </>
      }
      solution={
        <>
          <Panel className="text-sm">
            The single exit node is <Code>B4</Code> (its successor <Code>B5</Code> is outside the loop). <Code>i:=2</Code>{' '}
            lives in <Code>B3</Code>, but <Code>B3</Code> does <Bad>not dominate</Bad> <Code>B4</Code>: the path{' '}
            <Code>B2→B4</Code> reaches the exit without visiting <Code>B3</Code>. Rule 1 forbids the move.
          </Panel>
          <p className="text-sm mt-2">
            <strong>Bug if hoisted:</strong> if the branch keeps taking <Code>B2→B4</Code> (B3 never runs), the original
            program leaves <Code>i</Code> at its entry value, but the hoisted pre-header has already set <Code>i:=2</Code>,
            so <Code>j:=i</Code> in B5 reads a wrong 2.
          </p>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Rule 2: multiple assignments in the loop"
      statement={
        <>
          <p className="mb-2">Now <Code>i:=3</Code> is added to the header:</p>
          <Pre>{`B2:  i := 3;  if u<v goto B3
B3:  i := 2;  u := u+1
B4:  v := v−1;  if v<20 goto B5`}</Pre>
          <p>
            Rule 1 now permits moving <Code>i:=3</Code> (B2 dominates B4). Why is the move still illegal, and how does the
            temp-variable technique apply (or not) here?
          </p>
        </>
      }
      solution={
        <>
          <Panel className="text-sm">
            <strong>Rule 2 fails:</strong> <Code>i</Code> is assigned <em>twice</em> in the loop (<Code>i:=3</Code> in B2,{' '}
            <Code>i:=2</Code> in B3). If <Code>i:=3</Code> is hoisted, then after B3 runs <Code>i</Code> holds 2, and
            re-entering B2 no longer resets it to 3 (the resetting statement is gone). The loop’s observable value of{' '}
            <Code>i</Code> changes → <Bad>illegal</Bad>.
          </Panel>
          <p className="text-sm mt-2">
            <strong>Temp trick:</strong> it is meant for an invariant <em>expression</em> <Code>x := y op z</Code> — hoist{' '}
            <Code>t := y op z</Code> and keep <Code>x := t</Code> inside. Here the statement is the constant{' '}
            <Code>i := 3</Code> with no expensive operand to extract, and the problem is the duplicate assignment, not the
            cost — so the trick gives no benefit. The correct action is simply <strong>not to move</strong>{' '}
            <Code>i:=3</Code>.
          </p>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Hoist when the rules fail, preserving semantics"
      statement={
        <>
          <p className="mb-2">A loop body has the invariant but awkwardly-placed statement:</p>
          <Pre>{`L:  ...                       (loop header)
B:  if cond goto B2           (exit node, leaves loop on one branch)
B2: p := q · r                (q, r defined outside L; only def of p in L)
    ...
    goto L`}</Pre>
          <p>
            <Code>p := q·r</Code> is invariant, but <Code>B2</Code> does not dominate the exit node <Code>B</Code>. Show
            how to still remove the multiplication from the loop, and argue correctness.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">
            Rule 1 forbids hoisting the <em>assignment</em> <Code>p := q·r</Code> (it might run when the original wouldn’t).
            Apply the temp-variable technique to move only the <strong>computation</strong>:
          </p>
          <Pre>{`pre-header:  t := q · r        (t fresh, always safe: q,r invariant)
L:  ...
B:  if cond goto B2
B2: p := t                     (cheap copy, stays in the loop)
    ...
    goto L`}</Pre>
          <Panel className="text-sm">
            <strong>Correctness.</strong> <Code>t := q·r</Code> has no side effects and its operands are loop-invariant, so
            computing it unconditionally in the pre-header changes nothing observable. The assignment to <Code>p</Code>{' '}
            stays exactly where it was (same control conditions, same multiplicity), so <Code>p</Code> still gets its value
            only on the original paths. We paid one safe multiply up front to delete it from every iteration —{' '}
            <Good>strictly faster, same result</Good>.
          </Panel>
        </>
      }
    />
  </div>
)

const tabs: TabDef[] = [
  { id: 'detection', label: 'Detecting invariants', render: () => <Detection /> },
  { id: 'preheader', label: 'Pre-header', render: () => <PreHeader /> },
  { id: 'rules', label: 'Rules & pitfalls', render: () => <Rules /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function LoopInvariantStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 2 · §2.3 · Application 3"
      title="Loop-invariant code motion"
      subtitle="Find computations whose value never changes in a loop, insert a pre-header, and move them out — with the two heuristic safety rules and the temp-variable fallback for when they fail."
      tabs={tabs}
    />
  )
}
