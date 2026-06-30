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
  edgeKey,
  QuestionCard,
  StudyShell,
  type StepPanel,
  type GNode,
  type GEdge,
  type Fill,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 3 · §3.1 — Classification of Data Dependences  (PDF 121–140)
 *  Reuses the shared study-kit (StudyShell / QuestionCard / FlowGraph).
 * ------------------------------------------------------------------ */

/* ---- local helper: coloured δ-dependence tags -------------------- */

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

/* ------------------------------------------------------------------ *
 *  Interactive data-dependence graph for the s1…s4 example
 *  s1: a = 1 ; s2: b = a+2 ; s3: a = c+d ; s4: a = b+1
 * ------------------------------------------------------------------ */

const ddgNodes: GNode[] = [
  { id: 'S1', x: 96, y: 38, label: 'S₁' },
  { id: 'S2', x: 96, y: 116, label: 'S₂' },
  { id: 'S3', x: 96, y: 194, label: 'S₃' },
  { id: 'S4', x: 96, y: 272, label: 'S₄' },
]
const ddgEdges: GEdge[] = [
  { from: 'S1', to: 'S2', label: 'δᵗ' },
  { from: 'S2', to: 'S3', label: 'δᵃ' },
  { from: 'S3', to: 'S4', label: 'δᵒ' },
  { from: 'S2', to: 'S4', label: 'δᵗ', bend: -64 },
  { from: 'S1', to: 'S4', label: 'δᵒ', bend: 70 },
]
const ddgInfo: Record<string, { k: DepKind; tag: string; on: string; text: React.ReactNode }> = {
  'S1->S2': { k: 't', tag: 'δᵗ flow', on: 'a', text: <>S1 writes <Code>a</Code>, S2 reads it — the value really flows. Order must be kept.</> },
  'S2->S3': { k: 'a', tag: 'δᵃ anti', on: 'a', text: <>S2 reads <Code>a</Code> (the value from S1); S3 then overwrites <Code>a</Code>. Reordering would make S2 read S3's new value.</> },
  'S3->S4': { k: 'o', tag: 'δᵒ output', on: 'a', text: <>S3 and S4 both write <Code>a</Code>. Reordering changes which value later instructions see.</> },
  'S2->S4': { k: 't', tag: 'δᵗ flow', on: 'b', text: <>S2 writes <Code>b</Code>, S4 reads <Code>b</Code> — a second flow dependence, on a different variable.</> },
  'S1->S4': { k: 'o', tag: 'δᵒ output', on: 'a', text: <>S1 and S4 both write <Code>a</Code>: an <strong>address-based</strong> output dependence. It is <em>not</em> value-based — S3 overwrites <Code>a</Code> in between, so S1's value never reaches S4.</> },
}

const DdgExplorer: React.FC = () => {
  const [sel, setSel] = useState<string | null>(null)
  const out = ddgEdges.filter((e) => (sel ? e.from === sel : false))
  const active = out.map(edgeKey)
  const fillOf = (id: string): Fill => (sel === id ? 'active' : 'none')
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
      <div>
        <FlowGraph
          nodes={ddgNodes}
          edges={ddgEdges}
          width={210}
          height={310}
          maxW={230}
          fillOf={fillOf}
          activeEdges={active}
          onPick={(id) => setSel((s) => (s === id ? null : id))}
        />
        <p className="text-center text-xs text-muted-foreground">click a statement to trace its dependences</p>
      </div>
      <div>
        {sel ? (
          out.length ? (
            <Panel>
              <div className="text-xs font-semibold text-muted-foreground mb-2">Outgoing dependences of {sel}</div>
              <div className="space-y-2">
                {out.map((e) => {
                  const info = ddgInfo[edgeKey(e)]
                  return (
                    <div key={edgeKey(e)} className="text-[13px] leading-relaxed">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono">{e.from} → {e.to}</span>
                        <Dep k={info.k}>{info.tag}</Dep>
                        <span className="text-xs text-muted-foreground">on {info.on}</span>
                      </div>
                      <div>{info.text}</div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          ) : (
            <Panel>
              <div className="text-[13px]">{sel} has no outgoing dependence edges — nothing later reuses what it touches.</div>
            </Panel>
          )
        ) : (
          <Panel>
            <div className="text-[13px] leading-relaxed">
              <div className="font-mono whitespace-pre mb-2">{`S1: a = 1
S2: b = a + 2
S3: a = c + d
S4: a = b + 1`}</div>
              Vertices are instructions; an edge is a dependence that forbids swapping its two endpoints. Click a node to
              see which dependences leave it.
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  Iteration-space lattice (uniform per-column dependence arrows)
 * ------------------------------------------------------------------ */

const Lattice: React.FC<{
  xs: string[]
  ys: string[] // top → bottom as displayed
  arrow: 'down' | 'up'
  xLabel: string
  yLabel: string
}> = ({ xs, ys, arrow, xLabel, yLabel }) => {
  const mL = 52
  const yAxisX = 28
  const dx = 46
  const dy = 40
  const mT = 20
  const X = (c: number) => mL + c * dx
  const Y = (r: number) => mT + r * dy
  const axisY = Y(ys.length - 1) + 20
  const W = mL + (xs.length - 1) * dx + 36
  const H = axisY + 26
  const fg = 'var(--color-foreground)'
  const mut = 'var(--color-muted-foreground)'
  const prim = 'var(--color-primary)'
  return (
    <div className="my-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mx-auto block select-none" style={{ height: 'auto', maxWidth: Math.min(W, 300) }}>
        <defs>
          <marker id="latar" markerWidth="8" markerHeight="8" refX="5" refY="2.5" orient="auto">
            <path d="M0,0 L6,2.5 L0,5 Z" fill={prim} />
          </marker>
        </defs>
        {/* axes */}
        <line x1={yAxisX} y1={axisY} x2={W - 4} y2={axisY} stroke={mut} strokeWidth={1.1} />
        <line x1={yAxisX} y1={axisY} x2={yAxisX} y2={8} stroke={mut} strokeWidth={1.1} />
        <text x={yAxisX + 4} y={12} fontSize="11" fontStyle="italic" fill={mut}>{yLabel}</text>
        <text x={W - 4} y={axisY - 6} textAnchor="end" fontSize="11" fontStyle="italic" fill={mut}>{xLabel}</text>
        {/* dependence arrows: identical chain in every column */}
        {xs.map((_, ci) =>
          ys.slice(0, -1).map((__, ri) => {
            const x = X(ci)
            const top = Y(ri)
            const bot = Y(ri + 1)
            const [y1, y2] = arrow === 'down' ? [top + 7, bot - 7] : [bot - 7, top + 7]
            return <line key={`a${ci}-${ri}`} x1={x} y1={y1} x2={x} y2={y2} stroke={prim} strokeWidth={1.6} markerEnd="url(#latar)" />
          })
        )}
        {/* dots */}
        {xs.map((_, ci) => ys.map((__, ri) => <circle key={`d${ci}-${ri}`} cx={X(ci)} cy={Y(ri)} r={3} fill={fg} />))}
        {/* labels */}
        {ys.map((yl, ri) => (
          <text key={`yl${ri}`} x={yAxisX - 6} y={Y(ri) + 3} textAnchor="end" fontSize="10" fill={mut}>{yl}</text>
        ))}
        {xs.map((xl, ci) => (
          <text key={`xl${ci}`} x={X(ci)} y={axisY + 15} textAnchor="middle" fontSize="10" fill={mut}>{xl}</text>
        ))}
      </svg>
    </div>
  )
}

/* 1-D iteration-space dependence graph  (i = 2 … 9) */
const iterLineNodes: GNode[] = [2, 3, 4, 5, 6, 7, 8, 9].map((v, k) => ({ id: `i${v}`, x: 28 + k * 42, y: 30, label: String(v), r: 13 }))
const iterLineEdges: GEdge[] = [2, 3, 4, 5, 6, 7, 8].map((v) => ({ from: `i${v}`, to: `i${v + 1}` }))

/* ------------------------------------------------------------------ *
 *  Steppers
 * ------------------------------------------------------------------ */

const normSteps: StepPanel[] = [
  {
    title: '0 · The loop nest',
    body: (
      <>
        <Pre>{`for (i = 3; i <= 7; i++)
  for (j = 6; j >= 2; j -= 2)
    s: a[i][j] = a[i][j+2] + 1;`}</Pre>
        <p className="text-sm">
          The <Code>i</Code>-loop counts up 3,4,5,6,7; the <Code>j</Code>-loop counts <em>down</em> 6,4,2 with step −2.
          Normalisation rewrites both so they start at 0 with step 1.
        </p>
      </>
    ),
  },
  {
    title: '1 · Read off lower limit u and step s per dimension',
    body: (
      <Table
        head={['Dim', 'Loop', 'lower limit u', 'step s']}
        rows={[
          ['1', 'i: 3 → 7, i++', '3', '+1'],
          ['2', 'j: 6 → 2, j−=2', '6', '−2'],
        ]}
      />
    ),
  },
  {
    title: '2 · Apply  iₖⁿ = (iₖ − uₖ) / sₖ',
    body: (
      <>
        <Formula>{`i:  iⁿ = (i − 3)/1   →  3,4,5,6,7  ↦  0,1,2,3,4
j:  jⁿ = (j − 6)/(−2) →  6,4,2      ↦  0,1,2`}</Formula>
        <p className="text-sm">Each original index maps to a 0-based count. The inverse is iₖ = iₖⁿ·sₖ + uₖ.</p>
      </>
    ),
  },
  {
    title: '3 · The normalised nest',
    body: (
      <>
        <Pre>{`for (iⁿ = 0; iⁿ <= 4; iⁿ++)
  for (jⁿ = 0; jⁿ <= 2; jⁿ++)
    s: a[...] = a[...] + 1;   // same body, re-indexed`}</Pre>
        <p className="text-sm">
          Now every dimension runs 0,1,2,… with step 1, so distance and direction vectors can be compared across loops
          on a common footing.
        </p>
      </>
    ),
  },
]

const distSteps: StepPanel[] = [
  {
    title: '0 · Identify source and sink',
    body: (
      <>
        <Pre>{`for (i = 3; i <= 7; i++)
  for (j = 6; j >= 2; j -= 2)
    s: a[i][j] = a[i][j+2] + 1;`}</Pre>
        <p className="text-sm">
          Instance <Code>s[i,j]</Code> reads <Code>a[i][j+2]</Code> — the cell that instance <Code>s[i,j+2]</Code> wrote
          earlier. So the <strong>source</strong> is iteration <Code>(i, j+2)</Code>, the <strong>sink</strong> is{' '}
          <Code>(i, j)</Code>.
        </p>
      </>
    ),
  },
  {
    title: '1 · Same-cell equations',
    body: (
      <Formula>{`source writes a[i_s][j_s],  sink reads a[i_t][j_t + 2]
same memory cell  ⇒
  dim 1:  i_s = i_t
  dim 2:  j_s = j_t + 2`}</Formula>
    ),
  },
  {
    title: '2 · Distance vector d = i_t − i_s',
    body: (
      <>
        <Formula>{`d_1 = i_t − i_s = 0
d_2 = j_t − j_s = j_t − (j_t + 2) = −2

d = (0, −2)`}</Formula>
        <p className="text-sm">Same for every iteration → one constant distance vector for the whole nest.</p>
      </>
    ),
  },
  {
    title: '3 · Direction vector θ (sign of each dₖ)',
    body: (
      <>
        <Table
          head={['Level', 'dₖ', 'θₖ', 'why']}
          rows={[
            ['1 (i)', '0', '=', 'same i'],
            ['2 (j)', '−2 < 0', '>', 'source j is larger (j decreases)'],
          ]}
        />
        <Formula>{`θ = (=, >)`}</Formula>
      </>
    ),
  },
  {
    title: '4 · Why normalise: the direction flips',
    body: (
      <Panel className="text-sm leading-relaxed">
        On the <strong>normalised</strong> vectors jⁿ counts <em>up</em>, so the same dependence has distance{' '}
        <Code>dⁿ = (0, +1)</Code> and direction <Code>(=, &lt;)</Code>. A loop-carried dependence must have a leading
        non-<Code>=</Code> entry of <Code>&lt;</Code> in normalised form — which is exactly why level analysis always
        works on normalised iteration vectors.
      </Panel>
    ),
  },
]

const sinkSteps: StepPanel[] = [
  {
    title: '0 · Backward substitution (non-tightly nested)',
    body: (
      <>
        <Pre>{`for (i = 1; i <= n; i++) {
  s1: b[i] = b[i] / a[i][i];          // outside the inner loop
  for (j = i+1; j <= n; j++)
    s2: b[j] = b[j] − a[i][j] * b[i];
}`}</Pre>
        <p className="text-sm">
          <Code>s1</Code> sits in the outer loop only, so its iteration vector is <Code>(i)</Code> — length 1 — while{' '}
          <Code>s2</Code>'s is <Code>(i, j)</Code> — length 2.
        </p>
      </>
    ),
  },
  {
    title: '1 · The three flow dependences',
    body: (
      <Table
        head={['#', 'Pair', 'Reason', 'Notation']}
        rows={[
          ['a', 's1 → s2', <>s2 reads <Code>b[i]</Code> written by s1, every j</>, <>s1 δᵗ<sub>(0)</sub> s2</>],
          ['b', 's2 → s1', <>at j=i+1, s2 writes <Code>b[i+1]</Code>, used by s1 next outer iter</>, <>s2 δᵗ<sub>(1)</sub> s1</>],
          ['c', 's2 → s2', <><Code>b[j]</Code> written in iter i, read in iter i+1</>, <>s2 δᵗ<sub>(1,0)</sub> s2</>],
        ]}
      />
    ),
  },
  {
    title: '2 · The problem: unequal vector lengths',
    body: (
      <Panel className="text-sm leading-relaxed">
        Dependence (a) goes from a length-1 vector <Code>(i)</Code> to a length-2 vector <Code>(i, j)</Code>. You cannot
        subtract them to get a distance vector, and you cannot compare directions level-by-level.
      </Panel>
    ),
  },
  {
    title: '3 · Code sinking — push s1 into the inner loop',
    body: (
      <>
        <Pre>{`for (i = 1; i <= n; i++)
  for (j = i; j <= n; j++) {        // start one earlier
    s1: if (j == i) b[i] = b[i] / a[i][j];
    s2: else        b[j] = b[j] − a[i][j] * b[i];
  }`}</Pre>
        <p className="text-sm">
          Fuse the pre-loop instruction with the first iteration (here by extending the inner loop to start at{' '}
          <Code>j = i</Code> and guarding with <Code>j == i</Code>). Now every instruction lives at depth 2.
        </p>
      </>
    ),
  },
  {
    title: '4 · Equal-length vectors',
    body: (
      <Table
        head={['Pair', 'Distance / direction', 'meaning']}
        rows={[
          ['a) s1 → s2', <>s1 δᵗ<sub>(=,&lt;)</sub> s2</>, 'no fixed inner distance, but same i, later j'],
          ['b) s2 → s1', <>s2 δᵗ<sub>(1,0)</sub> s1</>, 'from iter (i, i+1) to iter (i+1, i+1)'],
        ]}
      />
    ),
  },
]

/* ------------------------------------------------------------------ *
 *  Section bodies
 * ------------------------------------------------------------------ */

const TypesSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why dependences matter</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          A sequential language fixes a linear order of instructions, but many instructions may be reordered or run in
          parallel without changing the result. A <strong>dependence</strong> is exactly what forbids that.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Panel>
            <Pre>{`a := b + c
d := e + f`}</Pre>
            <p className="text-sm"><Good>Independent</Good> — reverse them or run in parallel.</p>
          </Panel>
          <Panel>
            <Pre>{`a := b + c
e := a + f`}</Pre>
            <p className="text-sm"><Bad>Ordered</Bad> — the second needs <Code>a</Code> from the first.</p>
          </Panel>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Control vs data dependence</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A <strong>control dependence</strong> from S1 to S2 means S1 decides whether S2 runs:
        </p>
        <Pre>{`S1: if (t != 0)
S2:   a = a / t;     // S2 controlled by S1`}</Pre>
        <p className="text-sm mt-2 mb-1">
          A <strong>data dependence</strong> from S1 to S2 exists iff <em>both</em>:
        </p>
        <Step n="1">there is a possible execution path from S1 to S2, and</Step>
        <Step n="2">they access the <strong>same memory location</strong> and at least one access is a <strong>write</strong>.</Step>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The three data-dependence types</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">Classify by the order of read/write accesses to the shared location:</p>
        <Table
          head={['Symbol', 'Name', 'Pattern', 'Removable?']}
          rows={[
            [<Dep k="t">δᵗ</Dep>, 'Flow (true)', 'write → read (RAW)', <Bad>no — real data flow</Bad>],
            [<Dep k="a">δᵃ</Dep>, 'Anti', 'read → write (WAR)', <Good>yes — rename</Good>],
            [<Dep k="o">δᵒ</Dep>, 'Output', 'write → write (WAW)', <Good>yes — rename</Good>],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Anti and output are <em>name</em> dependences: rename the reused variable and they vanish. Flow reflects a
          value genuinely produced then consumed and cannot be removed.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked classification — s1 … s4</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`s1: a = 1
s2: b = a + 2
s3: a = c + d
s4: a = b + 1`}</Pre>
        <Table
          head={['Pair', 'Var', 'Type', 'Reason']}
          rows={[
            ['s1 → s2', 'a', <Dep k="t">δᵗ flow</Dep>, 's1 writes a, s2 reads a'],
            ['s2 → s3', 'a', <Dep k="a">δᵃ anti</Dep>, 's2 reads a, s3 overwrites a'],
            ['s3 → s4', 'a', <Dep k="o">δᵒ output</Dep>, 'both write a'],
            ['s2 → s4', 'b', <Dep k="t">δᵗ flow</Dep>, 's2 writes b, s4 reads b'],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Each edge says "interchanging these two would change the program". The reasons are the heart of §3.1.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Data dependence graph — explore it</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The dependences above form a <strong>data dependence graph</strong>: vertices are instructions, edges are the
          dependences that forbid reordering. Click a statement to trace its outgoing edges.
        </p>
        <DdgExplorer />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Address-based vs value-based</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">Two different questions about the same pair of accesses:</p>
        <Table
          head={['Kind', 'Detects a dependence when…']}
          rows={[
            [<strong>Address-based</strong>, 'the two accesses hit the same address — regardless of whether the value survives'],
            [<strong>Value-based</strong>, 'the value written by the source actually reaches the sink (no kill in between)'],
          ]}
        />
        <Panel className="mt-2 text-sm leading-relaxed">
          In s1 … s4 there is an <strong>address-based</strong> output dependence <Code>s1 δᵒ s4</Code> (both write{' '}
          <Code>a</Code>). But s3 overwrites <Code>a</Code> between them, so s1's value never reaches s4 →{' '}
          <strong>no value-based</strong> <Code>s1 δᵒ s4</Code>. Every value-based dependence is address-based; not the
          reverse.
        </Panel>
      </CardContent>
    </Card>
  </div>
)

const LoopsSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">One vertex, many instances</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A loop body is a template: each loop-counter value creates a distinct <strong>instance</strong>, but the graph
          keeps a single vertex per instruction. So dependences can run between instances of <em>different</em> iterations.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <Pre>{`for (i = 2; i <= 9; i++) {
  s1: x[i] = y[i] + z[i];
  s2: a[i] = x[i-1] + 1;
}`}</Pre>
          <Panel className="text-sm leading-relaxed">
            <Code>s2[i]</Code> reads <Code>x[i-1]</Code>, written by <Code>s1[i-1]</Code> in the <em>previous</em>{' '}
            iteration → a <strong>loop-carried</strong> flow dependence <Code>s1 δᵗ s2</Code>.
          </Panel>
        </div>
        <Table
          head={['Term', 'Meaning']}
          rows={[
            ['loop-independent', 'both instances are in the same iteration'],
            ['loop-carried', 'the instances are in different iterations'],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Iteration space &amp; its dependence graph</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The <strong>iteration space</strong> has one node per iteration of the innermost loop. If an iteration depends
          on an earlier one, draw an edge. For the loop above:
        </p>
        <FlowGraph nodes={iterLineNodes} edges={iterLineEdges} width={350} height={56} maxW={430} caption="iteration-space dependence graph: each i depends on i−1" />
        <p className="text-xs text-muted-foreground mt-1">
          Because iteration counts are often unknown or huge at compile time, this graph is usually <em>not</em> built
          explicitly — instead the data-dependence-graph edges are annotated with the dependence information (distance /
          direction, next tab).
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Iteration vectors</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">A loop nest of depth n labels each innermost iteration with a vector:</p>
        <Formula>{`L1: for (i1 = u1; i1 <= v1; i1++)
 L2:  for (i2 = u2; i2 <= v2; i2++)
        ...
 Ln:     for (in = un; in <= vn; in++)
            s
⇒ iteration vector (I1, …, In),  uk ≤ Ik ≤ vk`}</Formula>
        <p className="text-sm mt-2 mb-1">
          A dependence from S1 to S2 exists in the nest iff there are iteration vectors <Code>i</Code> and{' '}
          <Code>j</Code> with:
        </p>
        <Step n="1"><Code>i &lt; j</Code> or <Code>i = j</Code> (lexicographic order) and a path S1 → S2 in the body;</Step>
        <Step n="2">both access the same memory location M (in iterations <Code>i</Code> and <Code>j</Code>);</Step>
        <Step n="3">at least one of the two accesses is a write.</Step>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Normalised iteration vectors</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          To compare loops uniformly, renumber every dimension to start at 0 with step 1:
        </p>
        <Formula>{`iₖⁿ = (iₖ − uₖ) / sₖ        (inverse: iₖ = iₖⁿ·sₖ + uₖ)
  uₖ = lower limit,  sₖ = original step size`}</Formula>
        <div className="mt-3">
          <Stepper steps={normSteps} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1 text-center">original space</div>
            <Lattice xs={['3', '4', '5', '6', '7']} ys={['6', '4', '2']} arrow="down" xLabel="i" yLabel="j" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1 text-center">normalised space</div>
            <Lattice xs={['0', '1', '2', '3', '4']} ys={['2', '1', '0']} arrow="up" xLabel="iⁿ" yLabel="jⁿ" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Same dependence, both pictures. Arrows point the way the value flows (source → sink); normalising flips the{' '}
          <Code>j</Code> axis so the arrow becomes "forward".
        </p>
      </CardContent>
    </Card>
  </div>
)

const VectorsSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distance vector — the recipe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <Formula>{`d = i_t − i_s     (sink iteration − source iteration, per level)
S1 δ(d) S2  :  dependence from S1[i] to S2[i + d]`}</Formula>
        <Step n="1">Write the two subscript expressions: one for the writing instance, one for the reading instance.</Step>
        <Step n="2">Set them equal — one equation per array dimension (same memory cell).</Step>
        <Step n="3">Solve for the source/sink index relationship.</Step>
        <Step n="4">Subtract per level: <Code>dₖ = iₖ_sink − iₖ_source</Code>.</Step>
        <Step n="5">If the distance changes across iterations, write <Code>(∗)</Code> for that component.</Step>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Direction vector — from distance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['dₖ', 'θₖ', 'meaning']}
          rows={[
            ['dₖ > 0', '<', 'sink iteration later (same loop)'],
            ['dₖ = 0', '=', 'same iteration in that dimension'],
            ['dₖ < 0', '>', 'source later — only valid if an earlier level is <'],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-2">
          The direction vector is a <strong>coarsening</strong> of the distance vector: it keeps only the sign of each
          component, not the magnitude.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive derivation — d = (0, −2)</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={distSteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">When the distance varies — use a direction</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`for (i = 1; i <= 10; i++) {
  S1: A[2*i] = B[i] + 1;
  S2: C[i]   = A[i];
}`}</Pre>
        <Table
          head={['Iteration', 'S1 writes', 'S2 reads', 'feeds']}
          rows={[
            ['1', 'A[2]', 'A[1]', '—'],
            ['2', 'A[4]', 'A[2]', '← from iter 1'],
            ['3', 'A[6]', 'A[3]', '—'],
            ['4', 'A[8]', 'A[4]', '← from iter 2'],
          ]}
        />
        <Panel className="text-sm leading-relaxed mt-1">
          <Code>B</Code> is only read and <Code>C</Code> only written (distinct cells) → no dependence there.
          For <Code>A</Code>, the write <Code>A[2i]</Code> is read later as <Code>A[i']</Code>; the distance ranges from
          1 (iter 1→2) up to 5 (iter 5→10), so there is no single distance: <Code>S1 δᵗ<sub>(∗)</sub> S2</Code>. The
          direction is still uniform — the sink is always later — so <Code>S1 δᵗ<sub>(&lt;)</sub> S2</Code>.
        </Panel>
      </CardContent>
    </Card>
  </div>
)

const CarrySection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Dependence level &amp; which loop carries it</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Read the normalised direction vector left to right. The <strong>level</strong> k is the position of the first
          non-<Code>=</Code> entry (which must be <Code>&lt;</Code>):
        </p>
        <Formula>{`θ = (=, …, =)                  →  loop-independent  (δ∞)
θ = (=, …, =, <, …)            →  loop k carries it  (δk)
                ↑ position k`}</Formula>
        <Table
          head={['Notation', 'Meaning']}
          rows={[
            [<>S1 δ<sub>∞</sub> S2</>, 'loop-independent: same iteration, all-= direction'],
            [<>S1 δ<sub>k</sub> S2</>, 'loop-carried at level k: the k-th loop carries the dependence'],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — which loop carries each?</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`for (i = 1; i <= n; i++)
  for (j = 1; j <= m; j++) {
    s1: a[i][j]   = ...
    s2: ...       = a[i][j]
    s3: b[i][j+1] = ...
    s4: ...       = b[i][j]
    s5: c[i+1][j] = ...
    s6: ...       = c[i][j+1]
  }`}</Pre>
        <Table
          head={['Pair', 'd', 'θ', 'verdict']}
          rows={[
            ['s1 → s2 (a)', '(0,0)', '(=,=)', <><Dep k="inf">δ∞</Dep> loop-independent</>],
            ['s3 → s4 (b)', '(0,1)', '(=,<)', 'level 2 — the j-loop carries it'],
            ['s5 → s6 (c)', '(1,−1)', '(<,>)', 'level 1 — the i-loop carries it'],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          For <Code>s5 → s6</Code>: <Code>c[i+1][j]</Code> written, <Code>c[i][j+1]</Code> read → source iter{' '}
          <Code>(i−1, j+1)</Code>, sink <Code>(i, j)</Code>, distance <Code>(1, −1)</Code>. Leading <Code>&lt;</Code> at
          level 1, so the magnitude <Code>−1</Code> at level 2 is fine.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Loop-transformation legality</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">A transformation preserves a level-k carried dependence if it:</p>
        <Step n="1">does not change the iteration order of loop k;</Step>
        <Step n="2">moves no loop from level &lt; k into loop k;</Step>
        <Step n="3">moves no loop from level &gt; k out of loop k.</Step>
        <p className="text-xs text-muted-foreground mb-3">Consequence: rearranging entirely inside or entirely outside loop k is allowed.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Panel>
            <div className="text-sm font-medium mb-1"><Good>Legal</Good> — dependence carried at level 1</div>
            <Pre>{`for i … for j … for k …
  a[i+1][j+2][k+3] = a[i][j][k] + b;
⇒ swap the j- and k-loops`}</Pre>
            <p className="text-xs text-muted-foreground">d = (1,1,1), carried by the i-loop (level 1). Reordering the inner loops is safe.</p>
          </Panel>
          <Panel>
            <div className="text-sm font-medium mb-1"><Bad>Illegal</Bad> — loop-independent dependence</div>
            <Pre>{`for i … {
  a[i] = b[i] + c;
  d[i] = a[i] + e;     // δ∞ : a[i] flows here
}
⇒ peeling that moves d[0] before the loop`}</Pre>
            <p className="text-xs text-muted-foreground">Moving instruction instances between iterations breaks the same-iteration δ∞.</p>
          </Panel>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Non-tightly nested loops &amp; code sinking</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          When an instruction sits in an outer loop, its iteration vector is shorter than the innermost statements'. Then
          distances can't be subtracted. <strong>Code sinking</strong> pushes such instructions into the inner loop so
          all vectors have equal length.
        </p>
        <Stepper steps={sinkSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Questions  (exactly 5, easy → hardest, Q1 fully worked)
 * ------------------------------------------------------------------ */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on §3.1, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Classify all dependences in a straight-line sequence"
      statement={
        <>
          <p className="mb-2">List every data dependence (type + variable) and describe the dependence graph:</p>
          <Pre>{`s1: x = a + b
s2: y = x − c
s3: x = d + e
s4: a = x + y`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">Scan every pair sharing a variable with at least one write:</p>
          <Table
            head={['Pair', 'Var', 'Type', 'Reason']}
            rows={[
              ['s1 → s2', 'x', <Dep k="t">δᵗ flow</Dep>, 's1 writes x, s2 reads x'],
              ['s2 → s3', 'x', <Dep k="a">δᵃ anti</Dep>, 's2 reads x, s3 overwrites x'],
              ['s1 → s3', 'x', <Dep k="o">δᵒ output</Dep>, 's1 and s3 both write x'],
              ['s3 → s4', 'x', <Dep k="t">δᵗ flow</Dep>, 's3 writes x, s4 reads x'],
              ['s2 → s4', 'y', <Dep k="t">δᵗ flow</Dep>, 's2 writes y, s4 reads y'],
              ['s1 → s4', 'a', <Dep k="a">δᵃ anti</Dep>, 's1 reads a, s4 writes a'],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            The DDG has nodes s1–s4 and the six edges above. Note <Code>s1 δᵗ s4</Code> on <Code>x</Code> is{' '}
            <em>address-based only</em>: s3 rewrites <Code>x</Code> before s4, so value-based analysis keeps just{' '}
            <Code>s3 δᵗ s4</Code> for the value read by s4.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Distance, direction, and level of a 1-D loop"
      statement={
        <>
          <Pre>{`for (i = 2; i <= n; i++)
  s: a[i] = a[i-2] + c;`}</Pre>
          <p>Give the dependence type, distance vector, direction vector, level, and say whether it is loop-carried.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">
            Write <Code>a[i_s]</Code>, read <Code>a[i_t − 2]</Code>. Same cell ⇒ <Code>i_s = i_t − 2</Code>, so{' '}
            <Code>d = i_t − i_s = 2</Code>.
          </p>
          <Table
            head={['Type', 'd', 'θ', 'Level', 'Carried?']}
            rows={[[<Dep k="t">δᵗ flow</Dep>, '(2)', '(<)', '1', <Good>loop-carried by the i-loop</Good>]]}
          />
          <p className="text-xs text-muted-foreground mt-1">Distance 2 (not 1) — the dependence skips an iteration, but it is still level 1.</p>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Address-based vs value-based"
      statement={
        <>
          <Pre>{`s1: A[i] = 0;
s2: A[i] = B[i] + 1;
s3: C[i] = A[i] * 2;`}</Pre>
          <p>List all address-based dependences, then say which survive as value-based and why.</p>
        </>
      }
      solution={
        <>
          <Table
            head={['Pair', 'Type', 'Address-based', 'Value-based?']}
            rows={[
              ['s1 → s2 (A[i])', <Dep k="o">δᵒ output</Dep>, '✓', <Bad>no — s1's value killed by s2</Bad>],
              ['s1 → s3 (A[i])', <Dep k="t">δᵗ flow</Dep>, '✓', <Bad>no — s2 overwrites before s3 reads</Bad>],
              ['s2 → s3 (A[i])', <Dep k="t">δᵗ flow</Dep>, '✓', <Good>yes — s2's value reaches s3</Good>],
            ]}
          />
          <p className="text-sm mt-1">
            Only <Code>s2 δᵗ s3</Code> is value-based: it is the one write whose value is actually read with no
            intervening kill.
          </p>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="2-D nest: vectors and carrying loops"
      statement={
        <>
          <Pre>{`for (i = 1; i <= N; i++)
  for (j = 2; j <= M; j++)
    s: A[i][j] = A[i-1][j+1] + A[i][j-1];`}</Pre>
          <p>
            Find the distance vector, direction vector and dependence level for each flow dependence on <Code>A</Code>,
            and state which loop carries it. Does normalising change the answer?
          </p>
        </>
      }
      solution={
        <>
          <Table
            head={['Read', 'same-cell', 'd', 'θ', 'Level / carrier']}
            rows={[
              ['A[i-1][j+1]', 'i_s=i_t−1, j_s=j_t+1', '(1,−1)', '(<,>)', 'level 1 — i-loop'],
              ['A[i][j-1]', 'i_s=i_t, j_s=j_t−1', '(0,1)', '(=,<)', 'level 2 — j-loop'],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            Both are <Dep k="t">δᵗ flow</Dep>. For <Code>(1,−1)</Code> the leading <Code>&lt;</Code> at level 1 makes it
            valid (the <Code>−1</Code> at level 2 is allowed). Normalising here uses step 1 and a constant shift, which{' '}
            <strong>does not change differences</strong> → distances/directions are unchanged. Since one dependence is
            carried at each level, neither loop is fully parallel without skewing.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Non-tightly nested loops + code sinking"
      statement={
        <>
          <Pre>{`for (i = 1; i <= n; i++) {
  s1: b[i] = b[i] / a[i][i];
  for (j = i+1; j <= n; j++)
    s2: b[j] = b[j] − a[i][j] * b[i];
}`}</Pre>
          <p>
            (a) Name the three flow dependences with their distance vectors. (b) Why can't they all be written as
            equal-length vectors? (c) Apply code sinking and give the new vectors for s1→s2 and s2→s1.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Three flow dependences</p>
          <Table
            head={['Pair', 'Reason', 'Notation']}
            rows={[
              ['s1 → s2', <>s2 reads <Code>b[i]</Code> written by s1</>, <>s1 δᵗ<sub>(0)</sub> s2</>],
              ['s2 → s1', <>at j=i+1, s2 writes <Code>b[i+1]</Code> used next outer iter</>, <>s2 δᵗ<sub>(1)</sub> s1</>],
              ['s2 → s2', <><Code>b[j]</Code> written iter i, read iter i+1</>, <>s2 δᵗ<sub>(1,0)</sub> s2</>],
            ]}
          />
          <p className="text-sm mt-2 mb-1">(b) Length mismatch</p>
          <p className="text-sm mb-2">
            <Code>s1</Code>'s iteration vector is <Code>(i)</Code> (depth 1) but <Code>s2</Code>'s is <Code>(i, j)</Code>{' '}
            (depth 2). You can't subtract a length-1 from a length-2 vector, so distance/level comparison is undefined.
          </p>
          <p className="text-sm font-medium mb-1">(c) After code sinking (s1 pushed into the inner loop)</p>
          <Pre>{`for (i = 1; i <= n; i++)
  for (j = i; j <= n; j++) {
    s1: if (j == i) b[i] = b[i] / a[i][j];
    s2: else        b[j] = b[j] − a[i][j] * b[i];
  }`}</Pre>
          <Table
            head={['Pair', 'Vector']}
            rows={[
              ['s1 → s2', <>s1 δᵗ<sub>(=,&lt;)</sub> s2 — same i, later j (no fixed distance)</>],
              ['s2 → s1', <>s2 δᵗ<sub>(1,0)</sub> s1 — iter (i, i+1) → (i+1, i+1)</>],
            ]}
          />
        </>
      }
    />
  </div>
)

/* ------------------------------------------------------------------ *
 *  Root
 * ------------------------------------------------------------------ */

const tabs: TabDef[] = [
  { id: 'types', label: 'Dependence types', render: () => <TypesSection /> },
  { id: 'loops', label: 'Loops & iteration space', render: () => <LoopsSection /> },
  { id: 'vectors', label: 'Distance & direction', render: () => <VectorsSection /> },
  { id: 'carry', label: 'Carrying loops & transforms', render: () => <CarrySection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function DataDependenceStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 3 · §3.1 · Classification of Data Dependences"
      title="Classification of Data Dependences"
      subtitle="Flow / anti / output dependences, the dependence graph, iteration space & (normalised) iteration vectors, distance and direction vectors, dependence level, and code sinking for non-tightly nested loops."
      tabs={tabs}
    />
  )
}
