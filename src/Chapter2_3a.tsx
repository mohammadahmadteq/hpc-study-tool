import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import {
  Code,
  Pre,
  Formula,
  Step,
  Table,
  Panel,
  Good,
  Bad,
  Stepper,
  QuestionCard,
  StudyShell,
  FlowGraph,
  type StepPanel,
  type GNode,
  type GEdge,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  §2.3 Application 1 — global common subexpression elimination
 *  (PDF pp. 86–88, plus the local-CSE idea from the quicksort run)
 * ------------------------------------------------------------------ */

/* The p.88 worked example: two computations of 4·i on one path. */
const cseExampleSteps: StepPanel[] = [
  {
    title: '0 · Starting point — 4·i computed twice on the same path',
    body: (
      <>
        <p className="text-sm mb-2">
          The lower block recomputes <Code>4·i</Code>, but availability analysis says <Code>4·i ∈ in[B]</Code> and neither{' '}
          <Code>i</Code> is reassigned in between. So <Code>t6 := 4·i</Code> is a <strong>redundant</strong> recomputation.
        </p>
        <Pre>{`   t2 := 4·i        ← s′ : w := y op z   (w = t2)
   t3 := a[t2]
      ⋮   (path, i not redefined)
   t6 := 4·i        ← s  : x := y op z   (x = t6)
   t7 := a[t6]`}</Pre>
      </>
    ),
  },
  {
    title: '1 · Backward traversal — find every computation of y op z',
    body: (
      <>
        <p className="text-sm mb-2">
          From <Code>s : t6 := 4·i</Code> walk <strong>backward</strong> through the flow graph and collect every
          statement of the form <Code>w := 4·i</Code>. Here that is just <Code>s′ : t2 := 4·i</Code>.
        </p>
        <Panel className="text-sm">
          In general there may be <em>several</em> such <Code>s′</Code> (one per reaching path). The transformation only
          works if the value ends up in the <strong>same variable</strong> on all of them — that is the Remark.
        </Panel>
      </>
    ),
  },
  {
    title: '2 · Introduce one fresh variable u for the shared value',
    body: (
      <>
        <p className="text-sm mb-2">
          Pick a new variable <Code>u</Code>. Rewrite each <Code>s′ : w := y op z</Code> as a pair — compute once into{' '}
          <Code>u</Code>, then copy:
        </p>
        <Pre>{`   u  := 4·i        (was s′ : t2 := 4·i)
   t2 := u
   t3 := a[t2]
      ⋮
   t6 := u           ← s replaced by  x := u
   t7 := a[t6]`}</Pre>
        <p className="text-sm">
          <Code>s : t6 := 4·i</Code> becomes the cheap copy <Code>t6 := u</Code>. The expensive multiply now happens once.
        </p>
      </>
    ),
  },
  {
    title: '3 · Copy propagation cleans up the copies',
    body: (
      <>
        <p className="text-sm mb-2">
          Because <Code>t2 := u</Code> is a copy, later uses of <Code>t2</Code> can read <Code>u</Code> directly; then{' '}
          <Code>a[t6] = a[u] = a[t2]</Code> was already computed as <Code>t3</Code>, so it too is a common subexpression:
        </p>
        <Pre>{`   u  := 4·i
   t2 := u
   t3 := a[u]        (copy-propagated t2 → u)
      ⋮
   t6 := u
   t7 := t3          (a[t6] = a[u] = a[t2] = t3, reused)`}</Pre>
        <p className="text-sm">
          One multiply and one array load remain on the path. Dead copies like <Code>t2 := u</Code> are removed later by{' '}
          <Good>dead-code elimination</Good> if unused. CSE feeds copy propagation feeds CSE — the optimizer iterates.
        </p>
      </>
    ),
  },
]

/* tiny CFG for the local-vs-global illustration */
const lgNodes: GNode[] = [
  { id: 'entry', x: 150, y: 22, label: 'entry', point: true },
  { id: 'B1', x: 150, y: 78, label: 'B1' },
  { id: 'B2', x: 70, y: 158, label: 'B2' },
  { id: 'B3', x: 230, y: 158, label: 'B3' },
  { id: 'B4', x: 150, y: 238, label: 'B4' },
  { id: 'exit', x: 150, y: 294, label: 'exit', point: true },
]
const lgEdges: GEdge[] = [
  { from: 'entry', to: 'B1' },
  { from: 'B1', to: 'B2' },
  { from: 'B1', to: 'B3' },
  { from: 'B2', to: 'B4' },
  { from: 'B3', to: 'B4' },
  { from: 'B4', to: 'exit' },
]

/* ---- section bodies ---- */

const Overview: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">From analysis to transformation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          §2.2 computed global <Code>in</Code>/<Code>out</Code> sets. §2.3 <em>spends</em> that information: the data-flow
          facts justify <strong>optimizing transformations</strong> that change the flow graph while preserving meaning.
          The first application is removing repeated computations.
        </p>
        <Table
          head={['', 'Common subexpression elimination']}
          rows={[
            ['Input', <>flow graph + data-flow info for <Code>available expressions</Code></>],
            ['Output', 'flow graph without repeated computation of common subexpressions'],
            ['Enabling fact', <>the expression is <Code>available</Code> — computed on every path, operands unchanged</>],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What makes an expression a common subexpression</CardTitle>
      </CardHeader>
      <CardContent>
        <Panel className="text-sm leading-relaxed">
          An expression <Code>y op z</Code> at a statement <Code>s : x := y op z</Code> is a <strong>common
          subexpression</strong> if it is already <Code>available</Code> there, i.e. <Code>y op z ∈ in[B]</Code> and
          neither <Code>y</Code> nor <Code>z</Code> is reassigned in <Code>B</Code> before <Code>s</Code>.
        </Panel>
        <p className="text-sm mt-2">
          Then its value was computed earlier and is unchanged, so recomputing it is wasted work. Replace the
          recomputation with a reference to the earlier result.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          ⚠ This needs the <strong>intersection</strong>-flavoured availability analysis: the expression must be live on{' '}
          <em>all</em> incoming paths, not just one — otherwise the “earlier value” might not exist at runtime.
        </p>
      </CardContent>
    </Card>
  </div>
)

const Algorithm: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The replacement procedure</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Consider <Code>s : x := y op z</Code> in block <Code>B</Code>, assuming <Code>y op z ∈ in[B]</Code> and{' '}
          <Code>y</Code>, <Code>z</Code> are not redefined before <Code>s</Code>:
        </p>
        <Step n="a">
          <strong>Backward traversal.</strong> Starting from <Code>B</Code>, find <em>all</em> computations of{' '}
          <Code>y op z</Code> — statements <Code>s′ : w := y op z</Code>.
        </Step>
        <Step n="b">
          <strong>Capture into a fresh variable.</strong> Let <Code>u</Code> be new; replace each <Code>s′</Code> by{' '}
          <Code>u := y op z; w := u</Code>.
        </Step>
        <Step n="c">
          <strong>Reuse.</strong> Replace <Code>s</Code> by <Code>s : x := u</Code>.
        </Step>
        <Panel className="text-sm mt-2">
          <strong>Remark.</strong> To replace <Code>s</Code> the common subexpression must be stored in the{' '}
          <strong>same variable</strong> <Code>u</Code> for all reaching paths — otherwise no single name holds the value
          at <Code>s</Code>.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — walk the 4·i example</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The classic PDF example: <Code>4·i</Code> computed twice on one path, then cleaned up by copy propagation.
        </p>
        <Stepper steps={cseExampleSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

const LocalGlobal: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Local vs. global elimination</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Scope', 'How it is found', 'Data needed']}
          rows={[
            [
              <Good>local</Good>,
              <>two equal RHS in <em>one</em> basic block with no redefinition between — a single scan</>,
              'none beyond the block',
            ],
            [
              <Good>global</Good>,
              <>equal RHS in <em>different</em> blocks linked by the CFG</>,
              <>available-expressions <Code>in</Code>/<Code>out</Code></>,
            ],
          ]}
        />
        <p className="text-sm mt-2">
          Local elimination is just the special case of the algorithm where the backward traversal never leaves the
          block. Compilers do local first (cheap), then global.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why “available on all paths” matters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <FlowGraph nodes={lgNodes} edges={lgEdges} width={300} height={316} maxW={260} />
          <div className="text-sm">
            <p className="mb-2">
              Suppose <Code>4·i</Code> is computed in <Code>B2</Code> and <Code>B3</Code>, and <Code>B4</Code> recomputes
              it. If <strong>both</strong> predecessors compute it and don’t touch <Code>i</Code> afterwards, it is in{' '}
              <Code>in[B4] = out[B2] ∩ out[B3]</Code> → <Good>reuse is safe</Good>.
            </p>
            <p>
              If only <Code>B2</Code> computes it (or <Code>B3</Code> redefines <Code>i</Code>), the intersection drops it →{' '}
              <Bad>recompute in B4</Bad>. The intersection in the availability equation is exactly this safety check.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)

/* ---- questions ---- */

const qNodes: GNode[] = [
  { id: 'B1', x: 150, y: 26, label: 'B1' },
  { id: 'B2', x: 75, y: 116, label: 'B2' },
  { id: 'B3', x: 225, y: 116, label: 'B3' },
  { id: 'B4', x: 150, y: 206, label: 'B4' },
]
const qEdges: GEdge[] = [
  { from: 'B1', to: 'B2' },
  { from: 'B1', to: 'B3' },
  { from: 'B2', to: 'B4' },
  { from: 'B3', to: 'B4' },
]

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Apply the replacement algorithm to a redundant multiply"
      statement={
        <>
          <p className="mb-2">On a single path the three-address code is</p>
          <Pre>{`   t1 := 4·k
   b  := a[t1]
      ⋮     (k not redefined)
   t9 := 4·k
   c  := a[t9]`}</Pre>
          <p>
            Availability says <Code>4·k</Code> is available at <Code>t9 := 4·k</Code>. Eliminate the redundancy using the
            a/b/c procedure, then say what copy propagation can do next.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Backward traversal</p>
          <p className="text-sm mb-2">
            From <Code>s : t9 := 4·k</Code> the only earlier computation is <Code>s′ : t1 := 4·k</Code>.
          </p>
          <p className="text-sm font-medium mb-1">(b) Capture into u, (c) reuse</p>
          <Pre>{`   u  := 4·k
   t1 := u          (s′ rewritten)
   b  := a[t1]
      ⋮
   t9 := u          (s replaced by x := u)
   c  := a[t9]`}</Pre>
          <p className="text-sm font-medium mb-1">Next: copy propagation</p>
          <Pre>{`   u  := 4·k
   t1 := u
   b  := a[u]       (t1 → u)
      ⋮
   t9 := u
   c  := b          (a[t9]=a[u]=a[t1]=b, reused)`}</Pre>
          <Panel className="text-sm">
            One multiply and one load remain. If <Code>t1</Code>, <Code>t9</Code> become unused, dead-code elimination
            deletes the copies. This is the <Code>4·i</Code> example with renamed variables.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Local common subexpression elimination in one block"
      statement={
        <>
          <p className="mb-2">A single basic block:</p>
          <Pre>{`   t1 := 4·i
   x  := a[t1]
   t2 := 4·i
   y  := a[t2]`}</Pre>
          <p>Eliminate the local common subexpressions. Which statements survive?</p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">
            <Code>i</Code> is not redefined between the two <Code>4·i</Code>, so <Code>t2 := 4·i</Code> is redundant — use{' '}
            <Code>t1</Code>. Then <Code>a[t2] = a[t1]</Code>, so <Code>y := a[t2]</Code> can read <Code>t1</Code> too.
          </p>
          <Pre>{`   t1 := 4·i
   x  := a[t1]
   y  := a[t1]      (t2 and its load both eliminated)`}</Pre>
          <p className="text-xs text-muted-foreground">
            No data-flow sets were needed — everything is visible inside the block (local CSE).
          </p>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Decide availability across a merge"
      statement={
        <>
          <p className="mb-2">Flow graph (start B1), <Code>U = {'{a+b}'}</Code>:</p>
          <Pre>{`B1:  (branch only)
B2:  s := a + b
B3:  a := read()
B4:  t := a + b`}</Pre>
          <FlowGraph nodes={qNodes} edges={qEdges} width={300} height={250} maxW={260} />
          <p>
            Is <Code>a+b</Code> a common subexpression at <Code>B4</Code>? Justify with <Code>in[B4]</Code>.
          </p>
        </>
      }
      solution={
        <>
          <Formula>{`out[B2] = {a+b}
out[B3] = ∅                  (B3 redefines a, kills a+b)
in[B4]  = out[B2] ∩ out[B3] = {a+b} ∩ ∅ = ∅`}</Formula>
          <Panel className="text-sm">
            <Code>in[B4] = ∅</Code> → <Code>a+b</Code> is <Bad>not available</Bad> at B4. On the path through B3 the
            operand <Code>a</Code> changes, so no single earlier value is valid. <strong>Recompute</strong> in B4 — CSE
            does not apply. (If B3 did <em>not</em> touch <Code>a</Code>, the intersection would keep <Code>a+b</Code> and
            reuse would be legal.)
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Two reaching computations need the same variable"
      statement={
        <>
          <p className="mb-2">
            Both predecessors of a block compute <Code>x*y</Code>, but into different names:
          </p>
          <Pre>{`B2:  p := x · y      (then path to B4)
B3:  q := x · y      (then path to B4)
B4:  r := x · y      ← eliminate this`}</Pre>
          <p>
            Can <Code>r := x·y</Code> in B4 be replaced by a copy? Explain the role of the <em>“same variable for all
            reaching paths”</em> remark and how the algorithm achieves it.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">
            As-is, B4 cannot just say <Code>r := p</Code> (B3’s path has no <Code>p</Code>) nor <Code>r := q</Code> (B2’s
            path has no <Code>q</Code>). No single name holds the value on every path → the remark is violated.
          </p>
          <p className="text-sm mb-1">The algorithm fixes this by introducing one fresh <Code>u</Code> on all paths:</p>
          <Pre>{`B2:  u := x · y;  p := u
B3:  u := x · y;  q := u
B4:  r := u`}</Pre>
          <Panel className="text-sm">
            Now <Code>u</Code> holds <Code>x·y</Code> on <em>both</em> incoming paths, so <Code>r := u</Code> is valid.
            Step (b) of the procedure exists precisely to guarantee the single shared variable demanded by the remark.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="CSE + copy propagation + dead code, end to end"
      statement={
        <>
          <p className="mb-2">
            Inside one block (with <Code>t2 := 4·i</Code> and <Code>t4 := 4·j</Code> available from earlier blocks B2/B3):
          </p>
          <Pre>{`   t6 := 4·i
   x  := a[t6]
   t8 := 4·j
   t9 := a[t8]
   a[t6] := t9
   a[t8] := x`}</Pre>
          <p>
            Apply global CSE (reuse <Code>t2</Code>, <Code>t4</Code>, and the loads <Code>t3=a[t2]</Code>,{' '}
            <Code>t5=a[t4]</Code>), then local copy propagation and dead-code elimination. Give the final block.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">Step 1 — global CSE on the multiplies</p>
          <Pre>{`   t6 := t2          (4·i ⇒ t2)
   x  := a[t6]
   t8 := t4          (4·j ⇒ t4)
   t9 := a[t8]
   a[t6] := t9
   a[t8] := x`}</Pre>
          <p className="text-sm font-medium mb-1">Step 2 — copy propagation + CSE on the loads</p>
          <Pre>{`   x  := t3          (a[t2] already = t3)
   t9 := t5          (a[t4] already = t5)
   a[t2] := t5       (t9 propagated)
   a[t4] := x`}</Pre>
          <p className="text-sm font-medium mb-1">Step 3 — dead-code elimination</p>
          <Pre>{`   x      := t3
   a[t2]  := t5
   a[t4]  := x`}</Pre>
          <Panel className="text-sm">
            <Code>t6</Code>, <Code>t8</Code>, <Code>t9</Code> became unused copies and were removed. Four array-index
            multiplies and two loads collapsed to register copies — this is exactly the quicksort <Code>B5</Code>{' '}
            transformation chain, condensed.
          </Panel>
        </>
      }
    />
  </div>
)

const tabs: TabDef[] = [
  { id: 'overview', label: 'Overview', render: () => <Overview /> },
  { id: 'algorithm', label: 'Replacement algorithm', render: () => <Algorithm /> },
  { id: 'localglobal', label: 'Local vs global', render: () => <LocalGlobal /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function CseStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 2 · §2.3 · Application 1"
      title="Common subexpression elimination"
      subtitle="Use available-expressions data flow to remove repeated computations: the backward-traversal replacement algorithm, local vs global, and the copy-propagation follow-up."
      tabs={tabs}
    />
  )
}
