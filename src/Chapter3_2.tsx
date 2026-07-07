import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
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
  FlowGraph,
  QuestionCard,
  StudyShell,
  type StepPanel,
  type GNode,
  type GEdge,
  type Fill,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 3 · §3.2 — Introduction to Vectorization and Parallelization
 *  (PDF 141–150).  Reuses the shared study-kit; redefines the small
 *  δ-dependence tag locally, matching Chapter3 (§3.1).
 * ------------------------------------------------------------------ */

type DepKind = 't' | 'a' | 'o' | 'inf'
const depClass: Record<DepKind, string> = {
  t: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  a: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  o: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  inf: 'bg-muted text-foreground',
}
const Dep: React.FC<{ k: DepKind; children: React.ReactNode }> = ({ k, children }) => (
  <span className={cn('inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', depClass[k])}>
    {children}
  </span>
)

const cyclicFill = (cyc: string[]) => (id: string): Fill => (cyc.includes(id) ? 'loop' : 'none')

/* ------------------------------------------------------------------ *
 *  Tab 1 · parallel loops & vector operations
 *  Interactive: pick a single-statement loop, see whether the
 *  "load all RHS, then store all LHS" vector form is equivalent.
 * ------------------------------------------------------------------ */

interface VecCase {
  id: string
  label: string
  loop: string
  vec: string
  ok: boolean
  carried?: string // distance of the carrying edge, if any (for the little graph)
  why: React.ReactNode
}

const vecCases: VecCase[] = [
  {
    id: 'ok',
    label: 'a[i] = b[i] + a[i]*c',
    loop: `for (i = 1; i <= n; i++)
  a[i] = b[i] + a[i] * c;`,
    vec: `a[1:n] = b[1:n] + a[1:n] * c;`,
    ok: true,
    why: (
      <>
        The only array on both sides is <Code>a[i]</Code> at the <em>same</em> index i. No iteration depends on another,
        so loading all of <Code>a[1:n]</Code> first and only then storing produces the identical result. A single-statement
        loop that carries no dependence is always vectorizable.
      </>
    ),
  },
  {
    id: 'bad1',
    label: 'a[i+1] = b[i] + a[i]*c',
    loop: `for (i = 1; i <= n; i++)
  a[i+1] = b[i] + a[i] * c;`,
    vec: `a[2:n+1] = b[1:n] + a[1:n] * c;   // NOT equivalent`,
    ok: false,
    carried: 'i → i+1  (flow, distance 1)',
    why: (
      <>
        Iteration i writes <Code>a[i+1]</Code>; iteration i+1 then reads <Code>a[i+1]</Code> as its <Code>a[i]</Code> — a{' '}
        loop-carried <Dep k="t">δᵗ flow</Dep> of distance 1. The vector form loads the <em>old</em> <Code>a[1:n]</Code>{' '}
        before any store, so it never sees the values produced inside the loop. The two are <Bad>not equivalent</Bad>.
      </>
    ),
  },
  {
    id: 'bad2',
    label: 'a[i] = a[i-2] + d',
    loop: `for (i = 3; i <= n; i++)
  a[i] = a[i-2] + d;`,
    vec: `a[3:n] = a[1:n-2] + d;   // NOT equivalent`,
    ok: false,
    carried: 'i → i+2  (flow, distance 2)',
    why: (
      <>
        <Code>a[i]</Code> reads <Code>a[i-2]</Code>, written two iterations earlier — a carried <Dep k="t">δᵗ flow</Dep>{' '}
        of distance 2. The statement sits in a cycle of dependences with itself, so it cannot be turned into one vector
        instruction. (Skipping an iteration does not help: the dependence still exists.)
      </>
    ),
  },
]

const VecExplorer: React.FC = () => {
  const [sel, setSel] = useState('ok')
  const c = vecCases.find((v) => v.id === sel)!
  // tiny iteration-space graph for the carried cases
  const dist = c.id === 'bad2' ? 2 : 1
  const vals = [1, 2, 3, 4, 5, 6]
  const lineNodes: GNode[] = vals.map((v, k) => ({ id: `i${v}`, x: 26 + k * 44, y: 26, label: String(v), r: 12 }))
  const lineEdges: GEdge[] = vals.filter((v) => v + dist <= vals[vals.length - 1]).map((v) => ({ from: `i${v}`, to: `i${v + dist}` }))
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {vecCases.map((v) => (
          <button
            key={v.id}
            onClick={() => setSel(v.id)}
            className={cn(
              'text-[12px] font-mono px-2.5 py-1.5 rounded-lg border transition-colors',
              sel === v.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">scalar loop</div>
          <Pre>{c.loop}</Pre>
          <div className="text-xs font-semibold text-muted-foreground mt-2 mb-1">vector form (load all RHS, then store LHS)</div>
          <Pre>{c.vec}</Pre>
        </div>
        <div>
          <Panel>
            <div className="flex items-center gap-2 mb-1.5">
              {c.ok ? <Good>✓ vectorizable</Good> : <Bad>✗ not vectorizable</Bad>}
            </div>
            <div className="text-[13px] leading-relaxed">{c.why}</div>
          </Panel>
          {c.carried && (
            <div className="mt-1">
              <FlowGraph nodes={lineNodes} edges={lineEdges} width={290} height={50} maxW={320} caption={`iteration space — ${c.carried}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ParallelSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Parallel loops &amp; loop parallelization</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A <strong>parallel loop</strong> is one whose iterations could all run at the same time, each in its own thread.
          The deciding question is dependences:
        </p>
        <Step n="✓">
          A <strong>sequential</strong> loop can be turned into a <strong>parallel</strong> loop exactly when it{' '}
          <strong>carries no dependence</strong> — this is called <strong>loop parallelization</strong>.
        </Step>
        <p className="text-xs text-muted-foreground mt-1">
          The whole section is about answering that question mechanically from the data-dependence graph of §3.1.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What a vector operation means</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A <strong>vector operation</strong> works on whole (slices of) arrays at once, written with the{' '}
          <Code>lo:hi</Code> slice notation:
        </p>
        <Formula>{`a[1:n] = b[1:n] + a[1:n] * c;`}</Formula>
        <Panel className="text-sm leading-relaxed">
          <strong>Semantics that matters:</strong> <em>all</em> array elements on the right-hand side are{' '}
          <strong>loaded first</strong>; <strong>only then</strong> are the assignments to the left-hand side performed.
          A scalar loop is vectorizable precisely when this "load-everything-then-store" order gives the same result as
          running the iterations one by one.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Vectorizable or not? — try it</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Each loop below has a single statement. Pick one and compare its scalar loop with the vector form. The
          difference is always whether the loop <strong>carries a dependence</strong>.
        </p>
        <VecExplorer />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The single-statement rule</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Loop body', 'Carries a dependence?', 'Vectorizable?']}
          rows={[
            ['single instruction', 'no', <Good>yes — one vector instruction</Good>],
            ['single instruction', 'yes (self-cycle)', <Bad>no (by itself)</Bad>],
            ['several instructions', 'no cycle among them', <Good>yes — after splitting (next tab)</Good>],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Key theorem: <em>a loop that carries no dependence and whose body is a single instruction is vectorizable.</em>{' '}
          Multi-statement loops and self-cycles need the machinery of the following tabs.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Tab 2 · loop distribution (splitting)
 * ------------------------------------------------------------------ */

const distSteps: StepPanel[] = [
  {
    title: '0 · A two-statement loop',
    body: (
      <>
        <Pre>{`for (i = 0; i <= n; i++) {
  S1: a[i+1] = b[i] + c;
  S2: d[i]   = a[i] + e;
}`}</Pre>
        <p className="text-sm">
          Two instructions in the body. We cannot vectorize the loop as a whole yet — but there is no cycle between{' '}
          <Code>S1</Code> and <Code>S2</Code>, only a one-way flow.
        </p>
      </>
    ),
  },
  {
    title: '1 · The only dependence is acyclic',
    body: (
      <>
        <p className="text-sm mb-1">
          <Code>S1</Code> writes <Code>a[i+1]</Code>; in the next iteration <Code>S2</Code> reads it as <Code>a[i]</Code>.
        </p>
        <Table
          head={['Pair', 'On', 'Type', 'Cycle?']}
          rows={[
            [<>S1 → S2</>, 'a', <Dep k="t">δᵗ flow (carried by i)</Dep>, <Good>no — one direction only</Good>],
          ]}
        />
        <p className="text-sm mt-1">No edge returns from <Code>S2</Code> to <Code>S1</Code>, so the two instructions are not mutually dependent.</p>
      </>
    ),
  },
  {
    title: '2 · Loop distribution — split into two loops',
    body: (
      <>
        <Pre>{`for (i = 0; i <= n; i++)
  S1: a[i+1] = b[i] + c;

for (i = 0; i <= n; i++)
  S2: d[i] = a[i] + e;`}</Pre>
        <p className="text-sm">
          Because <Code>S1</Code> never depends on <Code>S2</Code>, running <em>all</em> of <Code>S1</Code> first and then
          all of <Code>S2</Code> is equivalent to the fused loop. This split is called <strong>loop distribution</strong>.
        </p>
      </>
    ),
  },
  {
    title: '3 · Each split loop is a single statement → vectorize',
    body: (
      <>
        <Formula>{`a[1:n+1] = b[0:n] + c;
d[0:n]   = a[0:n] + e;`}</Formula>
        <Panel className="text-sm leading-relaxed">
          Each loop now has a single instruction and carries no dependence within itself, so each becomes one vector
          instruction. Note the value of <Code>a</Code> still flows correctly: the first vector op fully computes{' '}
          <Code>a</Code>, the second then reads it.
        </Panel>
      </>
    ),
  },
]

const DistributionSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Vectorizing despite a carried dependence</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A loop that carries a dependence is not automatically hopeless. If its body has several instructions and the
          dependence runs <em>between different</em> instructions (not in a cycle), the loop can be split so each piece
          vectorizes.
        </p>
        <Panel className="text-sm leading-relaxed">
          <strong>The rule:</strong> an instruction in a loop can be vectorized iff it is{' '}
          <strong>not contained in any cycle of dependences</strong>. Cycles are what force sequential execution; acyclic
          pieces can become vector operations.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Loop distribution — step through it</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={distSteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why the equivalent vector form is what it is</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">The fused loop and the two vector instructions below compute the same arrays:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">loop</div>
            <Pre>{`for (i = 0; i <= n; i++) {
  a[i+1] = b[i] + c;
  d[i]   = a[i] + e;
}`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">vector form</div>
            <Pre>{`a[1:n+1] = b[0:n] + c;
d[0:n]   = a[0:n] + e;`}</Pre>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Contrast with the single-statement <Code>a[i+1] = b[i] + a[i]*c</Code> from the previous tab: there the carried
          dependence is on the <em>same</em> instruction (a self-cycle), so there is nothing to split and no equivalent
          vector form.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Tab 3 · the basic vectorize() algorithm  (SCC condensation)
 * ------------------------------------------------------------------ */

/* Example 1: S1 → S2  (two singleton components) */
const ex1Nodes: GNode[] = [
  { id: 'S1', x: 60, y: 32, label: 'S₁' },
  { id: 'S2', x: 60, y: 108, label: 'S₂' },
]
const ex1Edges: GEdge[] = [{ from: 'S1', to: 'S2', label: 'δ⁽¹⁾' }]

/* Example 2: single self-dependent node */
const ex2Nodes: GNode[] = [{ id: 'S', x: 64, y: 60, label: 'S' }]
const ex2Edges: GEdge[] = [{ from: 'S', to: 'S', label: 'δᵗ(1,0)' }]

const SccExample: React.FC = () => {
  const [ex, setEx] = useState<'1' | '2'>('1')
  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {(['1', '2'] as const).map((e) => (
          <button
            key={e}
            onClick={() => setEx(e)}
            className={cn(
              'text-[12.5px] px-3 py-1.5 rounded-full border transition-colors',
              ex === e ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            Example {e}
          </button>
        ))}
      </div>

      {ex === '1' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div>
            <Pre>{`for (i = 0; i <= n; i++) {
  S1: a[i+1] = b[i] + c;
  S2: d[i]   = a[i] + e;
}`}</Pre>
            <FlowGraph nodes={ex1Nodes} edges={ex1Edges} width={120} height={140} maxW={150} caption="dependence graph D" />
          </div>
          <Panel className="text-sm leading-relaxed">
            One flow edge <Code>S1 δ⁽¹⁾ S2</Code>, no back-edge ⇒ <strong>two strongly connected components</strong>{' '}
            <Code>{'{S1}'}</Code> and <Code>{'{S2}'}</Code>, each a single instruction not in a cycle. The condensation{' '}
            <Code>Dπ</Code> is already acyclic, topological order <Code>S1, S2</Code>. The basis algorithm{' '}
            <Good>vectorizes both</Good> — exactly the loop distribution of the previous tab.
          </Panel>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div>
            <Pre>{`for (i = 1; i <= n; i++)
  for (j = 1; j <= m; j++)
    S: a[i+1,j] = a[i,j] + b;`}</Pre>
            <FlowGraph nodes={ex2Nodes} edges={ex2Edges} width={170} height={130} maxW={190} caption="dependence graph D — a self-cycle" />
          </div>
          <Panel className="text-sm leading-relaxed">
            <Code>S</Code> writes <Code>a[i+1,j]</Code> and reads <Code>a[i,j]</Code> ⇒ a self <Dep k="t">δᵗ(1,0)</Dep>{' '}
            carried by the <strong>i-loop</strong>. The single component is <strong>cyclic</strong>, so the basis
            algorithm <Bad>does not vectorize</Bad> <Code>S</Code>. <br />
            But the <strong>j-loop carries nothing</strong> (distance 0 in j), so the inner dimension still vectorizes:
            <Formula>{`for (i = 1; i <= n; i++)
  S: a[i+1, 1:m] = a[i, 1:m] + b;`}</Formula>
            This is the motivation for the multidimensional algorithm in the next tab.
          </Panel>
        </div>
      )}
    </div>
  )
}

/* ---- full worked run: vectorize() on a five-statement loop -------- */

const vrLoop = `for (i = 2; i <= n; i++) {
  S1: y[i] = a[i-1] * 2;
  S2: a[i] = x[i-1] + 3;
  S3: x[i] = a[i] * b[i];
  S4: d[i] = c[i+1] - 1;
  S5: c[i] = x[i] + d[i];
}`

const vrNodes: GNode[] = [
  { id: 'S1', x: 34, y: 95, label: 'S₁' },
  { id: 'S2', x: 106, y: 95, label: 'S₂' },
  { id: 'S3', x: 178, y: 95, label: 'S₃' },
  { id: 'S4', x: 250, y: 95, label: 'S₄' },
  { id: 'S5', x: 322, y: 95, label: 'S₅' },
]
/* nodes sit in textual order; first four edges are the a/x dependences
   (step 1), the last arrow carries both d/c dependences (step 2) */
const vrEdges: GEdge[] = [
  { from: 'S2', to: 'S3', label: 'δᵗ∞', bend: -22 },
  { from: 'S3', to: 'S2', label: 'δᵗ(1)', bend: -22 },
  { from: 'S2', to: 'S1', label: 'δᵗ(1)', bend: 26 },
  { from: 'S3', to: 'S5', label: 'δᵗ∞', bend: -56 },
  { from: 'S4', to: 'S5', label: 'δᵗ∞ + δᵃ(1)', bend: 26 },
]

const vrCondNodes: GNode[] = [
  { id: 'p1', x: 58, y: 52, label: 'π₁', sub: '{S₂,S₃}' },
  { id: 'p2', x: 216, y: 38, label: 'π₂', sub: '{S₁}' },
  { id: 'p3', x: 58, y: 140, label: 'π₃', sub: '{S₄}' },
  { id: 'p4', x: 216, y: 126, label: 'π₄', sub: '{S₅}' },
]
const vrCondEdges: GEdge[] = [
  { from: 'p1', to: 'p2', label: 'δᵗ(1)' },
  { from: 'p1', to: 'p4', label: 'δᵗ∞' },
  { from: 'p3', to: 'p4', label: 'δᵗ∞ + δᵃ(1)' },
]

const vrGraph = (edges: GEdge[], fill?: (id: string) => Fill, caption?: string) => (
  <FlowGraph nodes={vrNodes} edges={edges} width={356} height={150} maxW={390} fillOf={fill} caption={caption} />
)

const vecRunSteps: StepPanel[] = [
  {
    title: '0 · The loop — five statements, one non-nested loop',
    body: (
      <>
        <Pre>{vrLoop}</Pre>
        <p className="text-sm mb-1">
          Five statements, five arrays, dependences of several kinds. Which statements can become vector instructions?
          Don't guess — run the algorithm mechanically, exactly as you would in the exam:
        </p>
        <Step n="1">Find <strong>all</strong> dependences, array by array.</Step>
        <Step n="2">Draw D and split it into strongly connected components.</Step>
        <Step n="3">Condense to <Code>Dπ</Code> and pick a topological order.</Step>
        <Step n="4">Emit: cyclic component → sequential loop; acyclic single instruction → vector instruction.</Step>
      </>
    ),
  },
  {
    title: '1 · Dependences through a and x — a cycle forms',
    body: (
      <>
        <p className="text-sm mb-1">
          Go <strong>array by array</strong>: who writes it, who reads it, and how do the indices relate?{' '}
          <Code>a</Code> is written by S₂ and read by S₃ and S₁; <Code>x</Code> is written by S₃ and read by S₂ and S₅:
        </p>
        <Table
          head={['Pair', 'On', 'Type', 'Why']}
          rows={[
            [<>S₂ → S₃</>, 'a', <Dep k="t">δᵗ∞</Dep>, <>S₃ reads <Code>a[i]</Code> in the same iteration S₂ writes it</>],
            [<>S₃ → S₂</>, 'x', <Dep k="t">δᵗ(1)</Dep>, <>S₃ writes <Code>x[i]</Code>; the next iteration's S₂ reads it as <Code>x[i-1]</Code> — together with the row above, S₂ and S₃ depend on <em>each other</em></>],
            [<>S₂ → S₁</>, 'a', <Dep k="t">δᵗ(1)</Dep>, <>S₂ writes <Code>a[i]</Code>; the next iteration's S₁ reads it as <Code>a[i-1]</Code></>],
            [<>S₃ → S₅</>, 'x', <Dep k="t">δᵗ∞</Dep>, <>S₅ reads <Code>x[i]</Code> in the same iteration</>],
          ]}
        />
        {vrGraph(vrEdges.slice(0, 4), undefined, 'D so far — note the arrow running backwards into S₁: the first statement of the body depends on the second')}
      </>
    ),
  },
  {
    title: '2 · Dependences through d and c — the anti-dependence trap',
    body: (
      <>
        <Table
          head={['Pair', 'On', 'Type', 'Why']}
          rows={[
            [<>S₄ → S₅</>, 'd', <Dep k="t">δᵗ∞</Dep>, <>S₅ reads <Code>d[i]</Code> right after S₄ writes it</>],
            [<>S₄ → S₅</>, 'c', <Dep k="a">δᵃ(1)</Dep>, <>S₄ reads <Code>c[i+1]</Code>; <strong>one iteration later</strong> S₅ overwrites that element</>],
          ]}
        />
        <Panel className="text-sm leading-relaxed">
          The anti dependence is the easy one to miss: in the sequential loop S₄ always sees the <em>original</em> value
          of <Code>c[i+1]</Code>, because S₅ only clobbers it one iteration later. Any transformed program must keep
          every S₄-read <strong>before</strong> the S₅-write of the same element — the edge S₄ → S₅ records exactly
          that.
        </Panel>
        <p className="text-sm">
          <Code>b</Code> is only read, and <Code>y</Code> is written but never read inside the loop — no further edges.
          Six dependences in total:
        </p>
        {vrGraph(vrEdges, undefined, 'D complete — one arrow can carry two dependences (S₄ → S₅: flow on d, anti on c)')}
      </>
    ),
  },
  {
    title: '3 · Split D into strongly connected components',
    body: (
      <>
        <p className="text-sm mb-1">
          An SCC needs <strong>mutual</strong> reachability. <Code>S₂ → S₃ → S₂</Code> is the only round trip, so{' '}
          <Code>{'{S2,S3}'}</Code> collapses into one cyclic component. S₄ → S₅ carries two dependences, but both point
          the <em>same way</em> — no way back, so no cycle. S₁ only has incoming edges, and no statement depends on
          itself.
        </p>
        {vrGraph(vrEdges, cyclicFill(['S2', 'S3']), 'D — {S₂,S₃} is the only cycle (purple); the other three components are single acyclic instructions')}
        <Table
          head={['Component', 'Members', 'Cyclic?']}
          rows={[
            [<Code>π₁</Code>, <Code>{'{S2,S3}'}</Code>, <Bad>yes — S₂→S₃→S₂</Bad>],
            [<Code>π₂</Code>, <Code>{'{S1}'}</Code>, <Good>no</Good>],
            [<Code>π₃</Code>, <Code>{'{S4}'}</Code>, <Good>no</Good>],
            [<Code>π₄</Code>, <Code>{'{S5}'}</Code>, <Good>no</Good>],
          ]}
        />
      </>
    ),
  },
  {
    title: '4 · Condensation Dπ + a topological order',
    body: (
      <>
        <p className="text-sm mb-1">
          Reduce each component to one node; parallel dependences merge into a single edge. The condensation is always
          acyclic, so a topological order exists:
        </p>
        <FlowGraph
          nodes={vrCondNodes}
          edges={vrCondEdges}
          width={280}
          height={182}
          maxW={300}
          fillOf={cyclicFill(['p1'])}
          caption="Dπ — π₁ (purple, cyclic) and π₃ have no incoming edge; π₂ and π₄ must wait"
        />
        <p className="text-sm mb-1">
          Take <Code>π₁, π₂, π₃, π₄</Code>. This is not unique — <Code>π₃, π₁, π₄, π₂</Code> would be just as correct;
          any topological order gives an equivalent program.
        </p>
        <Panel className="text-sm leading-relaxed">
          <strong>Topological ≠ textual:</strong> <Code>{'π₂ = {S1}'}</Code> is the <em>first</em> statement of the
          body, yet the edge π₁ → π₂ forces it to be emitted <em>after</em> the sequential cycle. The algorithm reorders
          statements for free.
        </Panel>
      </>
    ),
  },
  {
    title: '5 · Emit code, component by component',
    body: (
      <>
        <Table
          head={['Component', 'Cyclic?', 'Emitted as']}
          rows={[
            [<Code>{'π₁ = {S2,S3}'}</Code>, <Bad>yes</Bad>, 'sequential loop, body in original order'],
            [<Code>{'π₂ = {S1}'}</Code>, <Good>no</Good>, 'vector instruction'],
            [<Code>{'π₃ = {S4}'}</Code>, <Good>no</Good>, 'vector instruction'],
            [<Code>{'π₄ = {S5}'}</Code>, <Good>no</Good>, 'vector instruction'],
          ]}
        />
        <Pre>{`for (i = 2; i <= n; i++) {        // π1: the real recurrence
  S2: a[i] = x[i-1] + 3;          //     stays sequential
  S3: x[i] = a[i] * b[i];
}
S1: y[2:n] = a[1:n-1] * 2;        // π2: was FIRST in the body
S4: d[2:n] = c[3:n+1] - 1;        // π3: must precede S5 (anti dep)
S5: c[2:n] = x[2:n] + d[2:n];     // π4: last — needs x and d final`}</Pre>
        <p className="text-sm">
          Three of the five statements became vector instructions; only the genuine a/x feedback stays sequential. And
          since a single-statement loop with no carried dependence is exactly a <em>parallel</em> loop, each vector line
          could equally be emitted as a parallel (forall) loop — the legality test is the same.
        </p>
      </>
    ),
  },
  {
    title: '6 · Sanity-check the order against every edge',
    body: (
      <>
        <p className="text-sm mb-1">Two "obvious" rearrangements show why the topological order is not optional:</p>
        <Table
          head={['Wrong version', 'Violated edge', 'What breaks']}
          rows={[
            [
              <>S₁ emitted <em>before</em> the loop</>,
              <Dep k="t">S₂ δᵗ(1) S₁</Dep>,
              <><Code>y[2:n]</Code> would be computed from the <em>original</em> <Code>a</Code> values instead of the ones the recurrence produces</>,
            ],
            [
              <>S₅ emitted <em>before</em> S₄</>,
              <Dep k="a">S₄ δᵃ(1) S₅</Dep>,
              <><Code>d[2:n] = c[3:n+1] - 1</Code> would read elements of <Code>c</Code> that S₅ has already overwritten</>,
            ],
          ]}
        />
        <Panel className="text-sm leading-relaxed">
          <strong>Exam habit:</strong> after emitting, walk every edge of D once and check that the source component
          comes before the target component (flow: the producer has finished; anti: the reader still sees the old
          value). Six edges, six checks — if all pass, the generated program is equivalent.
        </Panel>
      </>
    ),
  },
]

const AlgorithmSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The basic vectorize() algorithm</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Turn the dependence graph into an acyclic graph of components, walk it in topological order, and emit a vector
          instruction for every acyclic single-instruction node:
        </p>
        <Pre>{`procedure vectorize(loop nest L, dependence graph D) {
  split D into maximal strongly connected components {S1,...,Sm};
  construct Dπ from D by reducing each component to a single node;
  let {π1,...,πm} be a topological ordering of the nodes of Dπ;
  for (i = 1; i <= m; i++) {
    if ((πi is NOT in a cycle of dependences) and
        (πi is a single instruction))
      generate a vector instruction for πi;
    else
      generate a sequential loop around the instructions in πi;
  }
}`}</Pre>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why strongly connected components?</CardTitle>
      </CardHeader>
      <CardContent>
        <Step n="1">A <strong>strongly connected component (SCC)</strong> is a maximal set of instructions that all (transitively) depend on each other — i.e. a cycle of dependences.</Step>
        <Step n="2">Collapsing each SCC to one node yields the <strong>condensation</strong> <Code>Dπ</Code>, which is always acyclic, so it has a topological order.</Step>
        <Step n="3">A node that is a <em>single instruction not depending on itself</em> is <strong>acyclic</strong> → one vector instruction. Anything else stays a <strong>sequential loop</strong>.</Step>
        <p className="text-xs text-muted-foreground mt-1">
          The topological order guarantees a component is only emitted after everything it depends on — so values still
          flow correctly.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Two examples — explore</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Example 1 is fully handled by the basis algorithm; Example 2 shows its limit (a self-cycle) and why we need a
          multidimensional version.
        </p>
        <SccExample />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Full worked run — five statements, step by step</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          The two warm-up examples can be read off at a glance; this loop cannot. It mixes flow and anti dependences, a
          two-statement cycle, and an emission order that differs from the textual one. Step through the exact moves you
          would make on paper.
        </p>
        <Stepper steps={vecRunSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Tab 4 · multidimensional codegen()  +  the big worked example
 * ------------------------------------------------------------------ */

const bigNodes: GNode[] = [
  { id: 'S1', x: 46, y: 40, label: 'S₁' },
  { id: 'S2', x: 196, y: 40, label: 'S₂' },
  { id: 'S3', x: 196, y: 152, label: 'S₃' },
  { id: 'S4', x: 46, y: 152, label: 'S₄' },
]
const bigEdgesD: GEdge[] = [
  { from: 'S4', to: 'S1', label: 'δᵗ(1)' },
  { from: 'S2', to: 'S3', label: 'δᵗ∞', bend: 30 },
  { from: 'S3', to: 'S2', label: 'δᵗ(*,1)', bend: 30 },
  { from: 'S3', to: 'S4', label: 'δᵗ∞', bend: 24 },
  { from: 'S4', to: 'S3', label: 'δᵃ(1)', bend: 24 },
]
const bigEdgesD2: GEdge[] = [
  { from: 'S2', to: 'S3', label: 'δᵗ∞', bend: 30 },
  { from: 'S3', to: 'S2', label: 'δᵗ(*,1)', bend: 30 },
  { from: 'S3', to: 'S4', label: 'δᵗ∞' },
]
const bigEdgesD3: GEdge[] = [{ from: 'S2', to: 'S3', label: 'δᵗ∞', bend: 18 }]

const codegenSteps: StepPanel[] = [
  {
    title: '0 · The loop nest and its full dependence graph D',
    body: (
      <>
        <Pre>{`for (i = 1; i <= 100; i++) {
  S1: x[i] = y[i] + 10;
  for (j = 1; j <= 100; j++) {
    S2: b[j] = a[j,n];
    for (k = 1; k <= 100; k++)
      S3: a[j+1,k] = b[j] + c[j,k];
    S4: y[i+j] = a[j+1,n];
  }
}`}</Pre>
        <FlowGraph nodes={bigNodes} edges={bigEdgesD} width={252} height={196} maxW={320} fillOf={cyclicFill(['S2', 'S3', 'S4'])} caption="D — S2,S3,S4 form one cycle (purple); S1 is a separate sink" />
        <p className="text-xs text-muted-foreground">
          Besides the edges shown, each of S₂, S₃, S₄ has an output self-dependence <Code>δᵒ(1)</Code> carried by the
          i-loop (omitted for clarity). The arrow <Code>S4 δᵗ(1) S1</Code> feeds <Code>y</Code> from one i-iteration to the
          next.
        </p>
      </>
    ),
  },
  {
    title: '1 · k = 1: condense D, wrap the i-loop',
    body: (
      <>
        <Table
          head={['Component', 'Cyclic?', 'Action']}
          rows={[
            [<Code>{'π1 = {S1}'}</Code>, <Good>no</Good>, 'vectorize (it follows π2 in topological order)'],
            [<Code>{'π2 = {S2,S3,S4}'}</Code>, <Bad>yes</Bad>, 'sequential i-loop, recurse with k = 2'],
          ]}
        />
        <Pre>{`for (i = 1; i <= 100; i++)
  codegen({S2,S3,S4}, 2, D2);
x[1:100] = y[1:100] + 10;        // S1 vectorized: ρ=1, k=1 → 1 dim`}</Pre>
        <p className="text-sm">
          The cycle <Code>{'{S2,S3,S4}'}</Code> forces a sequential i-loop; <Code>S1</Code> is acyclic and, being last in
          topological order, is emitted after the loop as a 1-D vector instruction.
        </p>
      </>
    ),
  },
  {
    title: '2 · k = 2: drop i-carried edges → D2, vectorize S4',
    body: (
      <>
        <FlowGraph nodes={bigNodes.filter((n) => n.id !== 'S1')} edges={bigEdgesD2} width={252} height={196} maxW={300} fillOf={cyclicFill(['S2', 'S3'])} caption="D2 — only level ≥ 2 edges; {S2,S3} cyclic, S4 acyclic" />
        <Table
          head={['Component', 'Cyclic?', 'Action']}
          rows={[
            [<Code>{'π1 = {S2,S3}'}</Code>, <Bad>yes</Bad>, 'sequential j-loop, recurse with k = 3'],
            [<Code>{'π2 = {S4}'}</Code>, <Good>no</Good>, 'vectorize: ρ=2, k=2 → 1 dim'],
          ]}
        />
        <Pre>{`for (i = 1; i <= 100; i++) {
  for (j = 1; j <= 100; j++)
    codegen({S2,S3}, 3, D3);
  y[i+1:i+100] = a[2:101,n];      // S4 vectorized over j
}
x[1:100] = y[1:100] + 10;`}</Pre>
      </>
    ),
  },
  {
    title: '3 · k = 3: drop j-carried edges → D3, vectorize S2 and S3',
    body: (
      <>
        <FlowGraph nodes={bigNodes.filter((n) => n.id === 'S2' || n.id === 'S3')} edges={bigEdgesD3} width={252} height={150} maxW={240} fillOf={cyclicFill([])} caption="D3 — only S2 δᵗ∞ S3 remains; both acyclic" />
        <Table
          head={['Component', 'ρ (loops)', 'k', 'dims = ρ−k+1', 'result']}
          rows={[
            [<Code>{'{S2}'}</Code>, '2 (i,j)', '3', '0', <Code>b[j] = a[j,n]</Code>],
            [<Code>{'{S3}'}</Code>, '3 (i,j,k)', '3', '1', <Code>a[j+1,1:100] = b[j] + c[j,1:100]</Code>],
          ]}
        />
        <p className="text-sm">
          With the j-carried flow gone, <Code>S2</Code> and <Code>S3</Code> are separate acyclic nodes. <Code>S2</Code>{' '}
          vectorizes to <strong>0 dimensions</strong> — a plain scalar instruction — while <Code>S3</Code> vectorizes its
          innermost k-dimension.
        </p>
      </>
    ),
  },
  {
    title: '4 · The fully vectorized loop nest',
    body: (
      <>
        <Pre>{`for (i = 1; i <= 100; i++) {
  for (j = 1; j <= 100; j++) {
    b[j] = a[j,n];
    a[j+1,1:100] = b[j] + c[j,1:100];
  }
  y[i+1:i+100] = a[2:101,n];
}
x[1:100] = y[1:100] + 10;`}</Pre>
        <Panel className="text-sm leading-relaxed">
          Two loops survive (i and j, each carrying a real cycle); the k-loop, <Code>S4</Code> and <Code>S1</Code> all
          became vector instructions of the dimension predicted by <Code>ρ(πi) − k + 1</Code>.
        </Panel>
      </>
    ),
  },
]

const CodegenSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Generalizing to multidimensional vectorization</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Example 2 showed that even a cyclic instruction can vectorize an <em>inner</em> dimension. The extended
          algorithm <Code>codegen()</Code> walks the loop nest <strong>level by level from the outside in</strong>,
          peeling one loop per recursion:
        </p>
        <Pre>{`procedure codegen(region R, nesting depth k, dependence graph D) {
  split D into maximal SCCs {S1,...,Sm} for R;
  construct Dπ and Rπ by reducing each component to one node;
  let {π1,...,πm} be a topological ordering of Dπ;
  for (i = 1; i <= m; i++) {
    if (πi is cyclic) {
      generate a sequential loop at nesting depth k;
      Di = edges of D at level >= k+1 that are internal to πi;
      codegen(πi, k+1, Di);            // recurse one level deeper
    } else {  /* πi is acyclic */
      generate a vector instruction for πi
        in  ρ(πi) − k + 1  dimensions;  // ρ(πi) = # loops containing πi
    }
  }
}`}</Pre>
        <p className="text-xs text-muted-foreground mt-1">
          Note: an SCC is acyclic iff it is a single instruction that does not depend on itself.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ρ and k — what they are, and why dims = ρ − k + 1</CardTitle>
      </CardHeader>
      <CardContent>
        <Step n="ρ">
          <strong>ρ(π) = how many loops wrap the statement in the original nest.</strong> A fixed property of the
          program text — in the worked example below, <Code>S3</Code> sits inside i, j and k, so ρ(S₃) = 3.
        </Step>
        <Step n="k">
          <strong>k = the recursion depth at which the component is finally emitted.</strong> It counts what{' '}
          <Code>codegen()</Code> has already done on the way down: the outer loops <Code>1 … k−1</Code> have all been
          generated as <em>sequential</em> for-loops around it.
        </Step>
        <Panel className="text-sm leading-relaxed">
          Every loop around a statement ends up as exactly one of two things: <strong>sequential</strong> (loops{' '}
          <Code>1 … k−1</Code>, already fixed by the recursion) or a <strong>vector dimension</strong> (the still-open
          loops <Code>k … ρ(π)</Code>). Counting the open ones gives
          <Formula>{`dims = ρ(π) − k + 1     (the loops k, k+1, …, ρ)`}</Formula>
          The formula just says: <em>whatever the recursion hasn't made sequential yet, you may slice.</em>
        </Panel>
        <Table
          head={['Statement (worked example)', 'ρ', 'emitted at k', 'still-open loops k…ρ', 'result']}
          rows={[
            [<><Code>S1</Code> in i</>, '1', '1', 'the i-loop', '1-D slice'],
            [<><Code>S4</Code> in i, j</>, '2', '2', 'the j-loop', '1-D slice'],
            [<><Code>S3</Code> in i, j, k</>, '3', '3', 'the k-loop', '1-D slice'],
            [<><Code>S2</Code> in i, j</>, '2', '3', <em>none</em>, '0-D — plain scalar'],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          <strong>dims = 0</strong> happens exactly when all of the statement's own loops have already gone sequential
          (S₂). <strong>Exam check:</strong> in your final code, (sequential for-loops around an instruction) + (number
          of <Code>:</Code> slices in it) must equal its ρ — if not, you miscounted k.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — codegen() on a 4-statement nest</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Step through three levels of recursion. At each level the dependence graph loses the edges carried by the loop
          just made sequential, splitting the remaining cycle further until everything that can vectorize does.
        </p>
        <Stepper steps={codegenSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Questions  (exactly 5, easy → hardest, Q1 fully worked)
 * ------------------------------------------------------------------ */

const Q3Graph: React.FC = () => {
  const nodes: GNode[] = [
    { id: 'S1', x: 40, y: 60, label: 'S₁' },
    { id: 'S2', x: 150, y: 32, label: 'S₂' },
    { id: 'S3', x: 150, y: 110, label: 'S₃' },
  ]
  const edges: GEdge[] = [
    { from: 'S1', to: 'S2', label: 'δᵗ' },
    { from: 'S2', to: 'S3', label: 'δᵗ', bend: 26 },
    { from: 'S3', to: 'S2', label: 'δᵃ', bend: 26 },
  ]
  return <FlowGraph nodes={nodes} edges={edges} width={210} height={150} maxW={260} fillOf={cyclicFill(['S2', 'S3'])} caption="{S2,S3} is one cycle (purple); {S1} is acyclic" />
}

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on §3.2, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Decide vectorizability and give the vector form"
      statement={
        <>
          <p className="mb-2">For each single-statement loop, decide whether it is vectorizable. If yes, write the vector instruction; if no, explain why.</p>
          <Pre>{`(L1) for (i = 1; i <= n; i++)  a[i]   = b[i] + a[i] * c;
(L2) for (i = 1; i <= n; i++)  a[i+1] = b[i] + a[i] * c;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">
            A single-statement loop is vectorizable iff it carries no dependence — equivalently, iff "load all RHS, then
            store all LHS" matches the sequential run.
          </p>
          <Table
            head={['Loop', 'Carried dependence', 'Vectorizable?', 'Vector form']}
            rows={[
              ['L1', 'none — writes & reads a[i], same index', <Good>yes</Good>, <Code>a[1:n] = b[1:n] + a[1:n]*c</Code>],
              ['L2', <>flow <Code>a[i+1]→a[i]</Code>, distance 1</>, <Bad>no</Bad>, <Code>a[2:n+1] = …  (not equivalent)</Code>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            In <Code>L2</Code>, iteration i writes <Code>a[i+1]</Code>, which iteration i+1 needs as <Code>a[i]</Code>.
            The vector form loads the old <Code>a[1:n]</Code> before any store, so it never uses the freshly written
            values — the result differs. The self-cycle cannot be split, so there is no equivalent single vector
            instruction.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Loop distribution"
      statement={
        <>
          <Pre>{`for (i = 0; i <= n; i++) {
  S1: a[i+1] = b[i] + c;
  S2: d[i]   = a[i] + e;
}`}</Pre>
          <p>Split this loop so it can be vectorized, and give the two vector instructions. Justify why the split is legal.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">
            The only dependence is <Code>S1 δᵗ S2</Code> (S2 reads <Code>a[i]</Code> written by S1). It runs in one
            direction with <strong>no back-edge</strong>, so <Code>S1</Code> and <Code>S2</Code> are separate components —
            no cycle. Hence running all of S1 before all of S2 is equivalent (loop distribution):
          </p>
          <Pre>{`for (i = 0; i <= n; i++)  a[i+1] = b[i] + c;
for (i = 0; i <= n; i++)  d[i]   = a[i] + e;`}</Pre>
          <p className="text-sm mt-2 mb-1">Each split loop is a single instruction with no carried dependence ⇒ vectorize:</p>
          <Formula>{`a[1:n+1] = b[0:n] + c;
d[0:n]   = a[0:n] + e;`}</Formula>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Apply the basic vectorize() algorithm to a dependence graph"
      statement={
        <>
          <p className="mb-2">
            A loop body has instructions <Code>S1, S2, S3</Code> with dependences{' '}
            <Code>S1 δᵗ S2</Code>, <Code>S2 δᵗ S3</Code>, <Code>S3 δᵃ S2</Code>:
          </p>
          <Q3Graph />
          <p>List the strongly connected components, give a topological order of the condensation, and say which nodes become vector instructions and which become sequential loops.</p>
        </>
      }
      solution={
        <>
          <Table
            head={['Component', 'Members', 'Cyclic?', 'Generated code']}
            rows={[
              ['π1', <Code>{'{S1}'}</Code>, <Good>no</Good>, <>vector instruction for <Code>S1</Code></>],
              ['π2', <Code>{'{S2,S3}'}</Code>, <Bad>yes (S2→S3→S2)</Bad>, <>sequential loop around <Code>S2, S3</Code></>],
            ]}
          />
          <p className="text-sm mt-2">
            <Code>S2</Code> and <Code>S3</Code> depend on each other (<Code>S2 δᵗ S3</Code> and back <Code>S3 δᵃ S2</Code>),
            so they collapse into one cyclic component. The condensation <Code>Dπ</Code> is{' '}
            <Code>{'{S1} → {S2,S3}'}</Code>; topological order emits the vectorized <Code>S1</Code> first, then the
            sequential loop. Only <Code>S1</Code> vectorizes.
          </p>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="A self-cycle that still vectorizes an inner dimension"
      statement={
        <>
          <Pre>{`for (i = 1; i <= n; i++)
  for (j = 1; j <= m; j++)
    S: a[i+1,j] = a[i,j] + b;`}</Pre>
          <p>
            (a) Which dependence does <Code>S</Code> carry, and at what level? (b) Does the basic <Code>vectorize()</Code>{' '}
            algorithm vectorize <Code>S</Code>? Why or why not? (c) Show that a 1-dimensional vectorization is still
            possible and write it.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> <Code>S</Code> writes <Code>a[i+1,j]</Code> and reads <Code>a[i,j]</Code>: the value
            written in iteration <Code>i</Code> is read in iteration <Code>i+1</Code>. A self <Dep k="t">δᵗ(1,0)</Dep>{' '}
            flow, <strong>carried by the i-loop (level 1)</strong>; the j-component is 0.
          </p>
          <p className="text-sm mb-1">
            <strong>(b)</strong> <Bad>No.</Bad> <Code>S</Code> depends on itself, so its component is a cycle. The basic
            algorithm only vectorizes acyclic single-instruction components, so it emits a sequential loop instead.
          </p>
          <p className="text-sm mb-1">
            <strong>(c)</strong> The <strong>j-loop carries no dependence</strong> (distance 0 in j), so the inner
            dimension is free to vectorize. Keep the i-loop sequential and slice over j:
          </p>
          <Formula>{`for (i = 1; i <= n; i++)
  S: a[i+1, 1:m] = a[i, 1:m] + b;`}</Formula>
          <p className="text-xs text-muted-foreground mt-1">
            This is exactly what <Code>codegen()</Code> does automatically: cyclic at level 1 ⇒ sequential i-loop; at
            level 2 the self-edge is gone ⇒ <Code>S</Code> vectorizes in <Code>ρ−k+1 = 2−2+1 = 1</Code> dimension.
          </p>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Run codegen() on a 2-statement nest"
      statement={
        <>
          <Pre>{`for (i = 1; i <= n; i++)
  for (j = 1; j <= m; j++) {
    S1: a[i,j] = a[i-1,j] + b[i,j];
    S2: c[i,j] = a[i,j] + 1;
  }`}</Pre>
          <p>
            (a) Find all data dependences. (b) Apply <Code>codegen()</Code>: which components are sequential, which are
            vector, and in how many dimensions? (c) Give the final vectorized nest.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Dependences</p>
          <Table
            head={['Pair', 'On', 'Type', 'Level']}
            rows={[
              [<>S1 → S1</>, 'a', <Dep k="t">δᵗ(1,0)</Dep>, 'self, carried by i-loop (level 1)'],
              [<>S1 → S2</>, 'a', <Dep k="inf">δᵗ∞</Dep>, 'loop-independent (same iteration)'],
            ]}
          />
          <p className="text-sm font-medium mt-2 mb-1">(b) codegen() at k = 1</p>
          <Table
            head={['Component', 'Cyclic?', 'Action', 'dims = ρ−k+1']}
            rows={[
              [<Code>{'{S1}'}</Code>, <Bad>yes (self i-dep)</Bad>, 'sequential i-loop, recurse; at k=2 the self-edge is gone', '2−2+1 = 1 (over j)'],
              [<Code>{'{S2}'}</Code>, <Good>no</Good>, 'vectorize, emitted after the i-loop', '2−1+1 = 2 (over i and j)'],
            ]}
          />
          <p className="text-sm font-medium mt-2 mb-1">(c) Result</p>
          <Pre>{`for (i = 1; i <= n; i++)
  a[i,1:m] = a[i-1,1:m] + b[i,1:m];   // S1: i sequential, j vectorized
c[1:n,1:m] = a[1:n,1:m] + 1;          // S2: fully vectorized, 2-D`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Code>S1</Code>'s i-self-cycle forces a sequential i-loop with the j-dimension vectorized. <Code>S2</Code> is
            acyclic and comes after <Code>S1</Code> in topological order, so it is distributed out of the i-loop entirely:
            once the loop finishes, all of <Code>a</Code> exists and the loop-independent <Code>δᵗ∞</Code> is satisfied,
            letting <Code>S2</Code> vectorize in both dimensions.
          </Panel>
        </>
      }
    />
  </div>
)

/* ------------------------------------------------------------------ *
 *  Root
 * ------------------------------------------------------------------ */

const tabs: TabDef[] = [
  { id: 'parallel', label: 'Parallel loops & vector ops', render: () => <ParallelSection /> },
  { id: 'distribute', label: 'Loop distribution', render: () => <DistributionSection /> },
  { id: 'algorithm', label: 'The vectorize() algorithm', render: () => <AlgorithmSection /> },
  { id: 'codegen', label: 'Multidimensional codegen()', render: () => <CodegenSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function VectorizationStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 3 · §3.2 · Introduction to Vectorization and Parallelization"
      title="Introduction to Vectorization and Parallelization"
      subtitle="Parallel loops, vector-operation semantics, loop distribution, the SCC-based vectorize() algorithm, and the recursive multidimensional codegen() — walked end-to-end on the lecture's 4-statement example."
      tabs={tabs}
    />
  )
}
