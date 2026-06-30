import React, { useState } from 'react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Progress } from './components/ui/progress'
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
  Stepper,
  QuestionCard,
  StudyShell,
  FlowGraph,
  edgeKey,
  type Fill,
  type StepPanel,
  type GNode,
  type GEdge,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  §2.3 Application 2 — copy propagation  (PDF pp. 89–92)
 * ------------------------------------------------------------------ */

/* The p.92 worked flow graph. Predecessors that make the numbers work:
 *   B1→B2, B1→B3, B3→B4, B2→B5, B4→B5      (no loops ⇒ one pass) */
const cpNodes: GNode[] = [
  { id: 'entry', x: 150, y: 20, label: 'entry', point: true },
  { id: 'B1', x: 150, y: 74, label: 'B1' },
  { id: 'B2', x: 66, y: 156, label: 'B2' },
  { id: 'B3', x: 234, y: 156, label: 'B3' },
  { id: 'B4', x: 234, y: 234, label: 'B4' },
  { id: 'B5', x: 150, y: 314, label: 'B5' },
  { id: 'exit', x: 150, y: 366, label: 'exit', point: true },
]
const cpEdges: GEdge[] = [
  { from: 'entry', to: 'B1' },
  { from: 'B1', to: 'B2' },
  { from: 'B1', to: 'B3' },
  { from: 'B3', to: 'B4' },
  { from: 'B2', to: 'B5', bend: 40 },
  { from: 'B4', to: 'B5' },
  { from: 'B5', to: 'exit' },
]

const cpCode: Record<string, string[]> = {
  B1: ['x := y'],
  B2: ['y := …'],
  B3: ['x := z'],
  B4: ['… := x'],
  B5: ['… := x'],
}
const cpLocal: Record<string, { cgen: string; ckill: string }> = {
  B1: { cgen: '{x:=y}', ckill: '{x:=z}' },
  B2: { cgen: '∅', ckill: '{x:=y}' },
  B3: { cgen: '{x:=z}', ckill: '{x:=y}' },
  B4: { cgen: '∅', ckill: '∅' },
  B5: { cgen: '∅', ckill: '∅' },
}

interface CpSnap {
  active: string | null
  ins: Record<string, string>
  outs: Record<string, string>
  note: React.ReactNode
}
const cpSnaps: CpSnap[] = [
  {
    active: null,
    ins: { B1: '·', B2: '·', B3: '·', B4: '·', B5: '·' },
    outs: { B1: '·', B2: '·', B3: '·', B4: '·', B5: '·' },
    note: (
      <>
        Two copy statements exist: <Code>x:=y</Code> (in B1) and <Code>x:=z</Code> (in B3). We solve the same equations as
        for available expressions — <strong>intersection</strong> at merges, <Code>in[B1]=∅</Code>.
      </>
    ),
  },
  {
    active: 'B1',
    ins: { B1: '∅', B2: '·', B3: '·', B4: '·', B5: '·' },
    outs: { B1: '{x:=y}', B2: '·', B3: '·', B4: '·', B5: '·' },
    note: (
      <>
        <Code>in[B1]=∅</Code> (start node). <Code>out[B1] = c-gen ∪ (in − c-kill) = {'{x:=y}'} ∪ ∅ = {'{x:=y}'}</Code>.
      </>
    ),
  },
  {
    active: 'B2',
    ins: { B1: '∅', B2: '{x:=y}', B3: '·', B4: '·', B5: '·' },
    outs: { B1: '{x:=y}', B2: '∅', B3: '·', B4: '·', B5: '·' },
    note: (
      <>
        <Code>in[B2] = out[B1] = {'{x:=y}'}</Code>. But B2 assigns <Code>y</Code>, so it <em>kills</em> <Code>x:=y</Code>:{' '}
        <Code>out[B2] = ∅ ∪ ({'{x:=y}'} − {'{x:=y}'}) = ∅</Code>.
      </>
    ),
  },
  {
    active: 'B3',
    ins: { B1: '∅', B2: '{x:=y}', B3: '{x:=y}', B4: '·', B5: '·' },
    outs: { B1: '{x:=y}', B2: '∅', B3: '{x:=z}', B4: '·', B5: '·' },
    note: (
      <>
        <Code>in[B3] = out[B1] = {'{x:=y}'}</Code>. B3 reassigns <Code>x</Code> (killing <Code>x:=y</Code>) and generates
        the new copy: <Code>out[B3] = {'{x:=z}'} ∪ ({'{x:=y}'} − {'{x:=y}'}) = {'{x:=z}'}</Code>.
      </>
    ),
  },
  {
    active: 'B4',
    ins: { B1: '∅', B2: '{x:=y}', B3: '{x:=y}', B4: '{x:=z}', B5: '·' },
    outs: { B1: '{x:=y}', B2: '∅', B3: '{x:=z}', B4: '{x:=z}', B5: '·' },
    note: (
      <>
        Only predecessor of B4 is B3, so <Code>in[B4] = out[B3] = {'{x:=z}'}</Code>; B4 doesn’t touch <Code>x</Code> or{' '}
        <Code>z</Code>, so <Code>out[B4] = {'{x:=z}'}</Code> too. → in B4, <Good>x can be replaced by z</Good>.
      </>
    ),
  },
  {
    active: 'B5',
    ins: { B1: '∅', B2: '{x:=y}', B3: '{x:=y}', B4: '{x:=z}', B5: '∅' },
    outs: { B1: '{x:=y}', B2: '∅', B3: '{x:=z}', B4: '{x:=z}', B5: '∅' },
    note: (
      <>
        B5 has predecessors B2 and B4: <Code>in[B5] = out[B2] ∩ out[B4] = ∅ ∩ {'{x:=z}'} = ∅</Code>. Graph has no loops →
        done. → in B5, <Bad>x cannot be replaced</Bad> by y (condition 2 fails on the B1→B3→B4→B5 path, which reassigns x).
      </>
    ),
  },
]

const CpIteration: React.FC = () => {
  const [i, setI] = useState(0)
  const snap = cpSnaps[i]
  const go = (d: number) => setI((p) => Math.max(0, Math.min(cpSnaps.length - 1, p + d)))
  const fillOf = (id: string): Fill => (id === snap.active ? 'active' : 'none')
  const activeEdges = snap.active ? cpEdges.filter((e) => e.to === snap.active).map(edgeKey) : []
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <FlowGraph nodes={cpNodes} edges={cpEdges} width={300} height={386} maxW={260} fillOf={fillOf} activeEdges={activeEdges} />
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className="bg-muted px-2 py-1 text-left font-medium border-b">B</th>
                  <th className="bg-muted px-2 py-1 text-left font-medium border-b">code</th>
                  <th className="bg-muted px-2 py-1 text-left font-medium border-b">in[B]</th>
                  <th className="bg-muted px-2 py-1 text-left font-medium border-b">out[B]</th>
                </tr>
              </thead>
              <tbody>
                {['B1', 'B2', 'B3', 'B4', 'B5'].map((b) => (
                  <tr key={b} className={cn('border-b last:border-b-0', b === snap.active && 'bg-primary/10')}>
                    <td className="px-2 py-1 font-mono font-semibold">{b}</td>
                    <td className="px-2 py-1 font-mono text-[11px]">{cpCode[b].join('; ')}</td>
                    <td className="px-2 py-1 font-mono text-[11px]">{snap.ins[b]}</td>
                    <td className="px-2 py-1 font-mono text-[11px]">{snap.outs[b]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Panel className="text-sm mt-1">{snap.note}</Panel>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={i === 0}>
          ← back
        </Button>
        <span className="flex-1 text-center text-xs text-muted-foreground">
          step {i + 1} of {cpSnaps.length}
        </span>
        <Button variant="outline" size="sm" onClick={() => go(1)} disabled={i === cpSnaps.length - 1}>
          next →
        </Button>
      </div>
      <Progress value={Math.round(((i + 1) / cpSnaps.length) * 100)} className="mt-3" />
    </div>
  )
}

/* ---- section bodies ---- */

const Motivation: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Where copy statements come from</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Optimizations (especially CSE in §2.3a) introduce <strong>copy statements</strong> <Code>x := y</Code>. By
          itself a copy does no work — its job is to make the value of <Code>y</Code> available under a second name. Copy
          propagation removes that indirection by using <Code>y</Code> directly.
        </p>
        <Panel className="text-sm">
          <div className="font-medium mb-1">Two payoffs of propagating a copy x := y</div>
          <Step n="a">
            <strong>Enables further transformations</strong> — e.g. <Code>a[t2]</Code> instead of <Code>a[t6]</Code>{' '}
            exposes a new common subexpression (the §2.3a example).
          </Step>
          <Step n="b">
            <strong>Eliminates the copy itself</strong> — if every use of <Code>x</Code> reached by <Code>x := y</Code> can
            read <Code>y</Code>, the statement <Code>x := y</Code> becomes dead and is deleted.
          </Step>
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The picture</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`   x := y
      ⋮            propagate          ⋮
   z := x · 3   ───────────────►   z := y · 3
                                   (and x := y may now be dead)`}</Pre>
        <p className="text-xs text-muted-foreground">
          Safe only if <Code>y</Code> still holds the same value at the use — that is what the conditions below pin down.
        </p>
      </CardContent>
    </Card>
  </div>
)

const Conditions: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">When is replacing x by y legal?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          For a copy <Code>s : x := y</Code> and a usage point <Code>u</Code> of <Code>x</Code>, replace <Code>x</Code> by{' '}
          <Code>y</Code> at <Code>u</Code> iff:
        </p>
        <Step n="1">
          <strong>s is the only definition of x reaching u.</strong> Otherwise some other value of <Code>x</Code> could
          arrive — checked with <Code>reaching definitions</Code>.
        </Step>
        <Step n="2">
          <strong>No path from s to u assigns to y.</strong> Otherwise <Code>y</Code> may no longer equal the copied
          value. (Counts paths that loop through <Code>u</Code> many times but pass <Code>s</Code> once.)
        </Step>
        <Panel className="text-sm mt-2">
          Condition (1) ⇐ reaching definitions (already available). Condition (2) needs a <strong>new</strong> data-flow
          problem — copy propagation’s own <Code>in</Code>/<Code>out</Code> sets, next tab.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reading the two conditions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Condition', 'Guards against', 'Verified by']}
          rows={[
            [<>(1) only def of <Code>x</Code></>, <>a different value of <Code>x</Code> reaching <Code>u</Code></>, <Code>reaching definitions</Code>],
            [<>(2) no assignment to <Code>y</Code></>, <><Code>y</Code> being changed after the copy</>, <>copy-propagation <Code>in</Code> sets</>],
          ]}
        />
      </CardContent>
    </Card>
  </div>
)

const DataFlow: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">A new data-flow problem for condition (2)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Set', 'Meaning']}
          rows={[
            [<Code>in[B]</Code>, <>copies <Code>x:=y</Code> s.t. <em>every</em> path start→B contains it with no later assignment to <Code>x</Code> or <Code>y</Code></>],
            [<Code>out[B]</Code>, <>same, holding to the <em>end</em> of B</>],
            [<Code>c-gen[B]</Code>, <>copies <Code>x:=y</Code> in B with no later assignment to <Code>x</Code> or <Code>y</Code> in B</>],
            [<Code>c-kill[B]</Code>, <>copies (outside B) invalidated because B assigns <Code>x</Code> or <Code>y</Code></>],
          ]}
        />
        <Formula>{`out[B] = c-gen[B] ∪ (in[B] \\ c-kill[B])
in[B]  = ∩  out[P]   over predecessors P of B
in[B1] = ∅           (start node)`}</Formula>
        <Panel className="text-sm">
          These are the <strong>same equations as available expressions</strong> (forward, intersection at merges) → the
          identical iterative solver works. A copy is “available” exactly when neither side has been clobbered on all
          paths.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Local c-gen / c-kill of the example</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['B', 'code', 'c-gen', 'c-kill']}
          rows={['B1', 'B2', 'B3', 'B4', 'B5'].map((b) => [
            b,
            <Code>{cpCode[b].join('; ')}</Code>,
            <span className="font-mono text-emerald-600 dark:text-emerald-400">{cpLocal[b].cgen}</span>,
            <span className="font-mono text-red-600 dark:text-red-400">{cpLocal[b].ckill}</span>,
          ])}
        />
        <p className="text-xs text-muted-foreground">
          B2 has empty c-gen but kills <Code>x:=y</Code> (it reassigns <Code>y</Code>). B3 generates <Code>x:=z</Code> and
          kills <Code>x:=y</Code> (it reassigns <Code>x</Code>).
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — solve the example flow graph</CardTitle>
      </CardHeader>
      <CardContent>
        <CpIteration />
      </CardContent>
    </Card>
  </div>
)

/* ---- questions ---- */

const cpExampleSteps: StepPanel[] = [
  {
    title: 'Before — the copy introduced by CSE',
    body: <Pre>{`   t6 := t2
   x  := a[t6]
      ⋮
   a[t6] := t9`}</Pre>,
  },
  {
    title: 'Condition check',
    body: (
      <p className="text-sm">
        <Code>t6 := t2</Code> is the <strong>only</strong> definition of <Code>t6</Code> reaching both uses (cond. 1), and{' '}
        nothing reassigns <Code>t2</Code> in between (cond. 2). So every <Code>t6</Code> may be replaced by <Code>t2</Code>.
      </p>
    ),
  },
  {
    title: 'After propagation (then t6:=t2 is dead)',
    body: <Pre>{`   x  := a[t2]
      ⋮
   a[t2] := t9      (t6 := t2 now removable)`}</Pre>,
  },
]

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems, easy → hardest. Q1 is fully worked; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Propagate a copy and remove it"
      statement={
        <>
          <p className="mb-2">
            CSE produced the copy <Code>t6 := t2</Code>. Decide whether <Code>t6</Code> can be replaced by <Code>t2</Code>{' '}
            at both uses below, then simplify.
          </p>
          <Pre>{`   t6 := t2
   x  := a[t6]
      ⋮     (t2 not reassigned)
   a[t6] := t9`}</Pre>
        </>
      }
      solution={<Stepper steps={cpExampleSteps} showProgress />}
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="State the two conditions"
      statement={
        <p>
          For a copy <Code>s : x := y</Code> and a use <Code>u</Code> of <Code>x</Code>, give the two conditions under
          which <Code>x</Code> may be replaced by <Code>y</Code> at <Code>u</Code>, and name the analysis that checks each.
        </p>
      }
      solution={
        <>
          <Step n="1">
            <Code>s</Code> is the <strong>only definition of x</strong> that reaches <Code>u</Code> — checked by{' '}
            <Code>reaching definitions</Code>.
          </Step>
          <Step n="2">
            <strong>No path from s to u assigns to y</strong> — checked by the copy-propagation data-flow problem (the
            copy <Code>x:=y ∈ in</Code> at <Code>u</Code>).
          </Step>
          <p className="text-xs text-muted-foreground mt-1">
            If both hold for <em>every</em> use reached by <Code>s</Code>, the copy itself becomes dead and is deleted.
          </p>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Compute c-gen and c-kill"
      statement={
        <>
          <p className="mb-2">
            The whole program contains the copy statements <Code>x:=y</Code>, <Code>x:=z</Code>, and <Code>p:=q</Code>. A
            block B is:
          </p>
          <Pre>{`B:  p := q
    y := p + 1`}</Pre>
          <p>Give <Code>c-gen[B]</Code> and <Code>c-kill[B]</Code>. Explain each entry.</p>
        </>
      }
      solution={
        <>
          <Formula>{`c-gen[B]  = {p:=q}
c-kill[B] = {x:=y}`}</Formula>
          <Panel className="text-sm">
            <strong>c-gen.</strong> The only copy statement in B is <Code>p:=q</Code>. After it, B does not assign{' '}
            <Code>p</Code> or <Code>q</Code> (the next line assigns <Code>y</Code>), so the copy survives to the end →{' '}
            <Code>c-gen[B] = {'{p:=q}'}</Code>. (<Code>y:=p+1</Code> is an expression, not a copy, so it never enters
            c-gen.)
          </Panel>
          <Panel className="text-sm">
            <strong>c-kill.</strong> B assigns <Code>y</Code>, which invalidates any external copy mentioning <Code>y</Code>{' '}
            → <Code>x:=y</Code> is killed. B does not assign <Code>x</Code> or <Code>z</Code>, so <Code>x:=z</Code> is{' '}
            <em>not</em> killed. → <Code>c-kill[B] = {'{x:=y}'}</Code>. (c-kill only ever lists copies defined{' '}
            <em>outside</em> B.)
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Run the solver on the lecture graph"
      statement={
        <>
          <p className="mb-2">
            Flow graph (edges <Code>B1→B2, B1→B3, B3→B4, B2→B5, B4→B5</Code>):
          </p>
          <Pre>{`B1:  x := y
B2:  y := …
B3:  x := z
B4:  … := x
B5:  … := x`}</Pre>
          <p>
            Compute <Code>in</Code>/<Code>out</Code>. At which uses of <Code>x</Code> is a replacement legal, and by what?
          </p>
        </>
      }
      solution={
        <>
          <Table
            head={['B', 'in[B]', 'out[B]']}
            rows={[
              ['B1', '∅', '{x:=y}'],
              ['B2', '{x:=y}', '∅'],
              ['B3', '{x:=y}', '{x:=z}'],
              ['B4', '{x:=z}', '{x:=z}'],
              ['B5', '∅', '∅'],
            ]}
          />
          <Panel className="text-sm">
            In <Good>B4</Good>: <Code>x:=z ∈ in[B4]</Code> → replace <Code>x</Code> by <Code>z</Code>. In <Bad>B5</Bad>:{' '}
            <Code>in[B5]=∅</Code> → no replacement (the path <Code>B1→B3→B4→B5</Code> reassigns <Code>x</Code> via{' '}
            <Code>x:=z</Code>, so the intersection drops every copy). No loops ⇒ a single pass suffices.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Why intersection, and a loop that breaks naïve propagation"
      statement={
        <>
          <p className="mb-2">Consider a loop:</p>
          <Pre>{`B1:  x := y
L:   use(x)          (loop header, body below)
B2:  y := y + 1
     goto L`}</Pre>
          <p>
            (a) May <Code>x</Code> be replaced by <Code>y</Code> at <Code>use(x)</Code>? (b) Explain via condition (2) and
            why the data-flow problem uses <strong>intersection</strong> at the loop merge.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) No.</p>
          <p className="text-sm mb-2">
            On the path <Code>B1 → L → B2 → L</Code>, block <Code>B2</Code> executes <Code>y := y+1</Code> — an assignment
            to <Code>y</Code> between the copy <Code>s</Code> and the use. Condition (2) fails.
          </p>
          <p className="text-sm font-medium mb-1">(b) Intersection enforces “on every path”.</p>
          <Formula>{`in[L] = out[B1] ∩ out[B2]
out[B1] = {x:=y}        out[B2] = ∅   (B2 kills x:=y)
in[L] = {x:=y} ∩ ∅ = ∅`}</Formula>
          <Panel className="text-sm">
            The first iteration reaches <Code>L</Code> with the copy valid, but the back edge from <Code>B2</Code> arrives
            with it killed. Intersection keeps a copy only if it survives <em>all</em> incoming edges — including the back
            edge — so <Code>in[L]=∅</Code> and the replacement is correctly forbidden. Union would have wrongly kept it.
          </Panel>
        </>
      }
    />
  </div>
)

const tabs: TabDef[] = [
  { id: 'motivation', label: 'Motivation', render: () => <Motivation /> },
  { id: 'conditions', label: 'Two conditions', render: () => <Conditions /> },
  { id: 'dataflow', label: 'Data-flow problem', render: () => <DataFlow /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function CopyPropStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 2 · §2.3 · Application 2"
      title="Copy propagation"
      subtitle="Replace x by y after a copy x := y: the two legality conditions, and the dedicated forward/intersection data-flow problem (c-gen, c-kill) that shares the available-expressions solver."
      tabs={tabs}
    />
  )
}
