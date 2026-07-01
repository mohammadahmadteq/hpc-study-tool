import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'
import {
  Code,
  Pre,
  Formula,
  Table,
  Panel,
  Good,
  Bad,
  Tag,
  Stepper,
  QuestionCard,
  StudyShell,
  type StepPanel,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 4 · §4.4 — Loop Interchange   (PDF 195–197)
 *  Swapping the order of nested loops: the direction-vector legality
 *  rule ((<,>) is the only illegal case), the locality/parallelism
 *  motivation, and triangular loop-bound adjustment.
 * ------------------------------------------------------------------ */

/* ================================================================== *
 *  Tab 1 · What & why  (+ memory-traversal locality demo)
 * ================================================================== */

const TraversalDemo: React.FC = () => {
  const n = 5
  const [iOuter, setIOuter] = useState(true)
  // storage is row-major: a[i][j] → address i*n + j
  const order: { i: number; j: number; step: number }[] = []
  let step = 0
  if (iOuter) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) order.push({ i, j, step: step++ })
  } else {
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) order.push({ i, j, step: step++ })
  }
  const stepAt: Record<string, number> = {}
  order.forEach((o) => (stepAt[`${o.i}-${o.j}`] = o.step))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">loop order:</span>
        <Button size="sm" variant={iOuter ? 'default' : 'outline'} onClick={() => setIOuter(true)}>
          i outer, j inner
        </Button>
        <Button size="sm" variant={iOuter ? 'outline' : 'default'} onClick={() => setIOuter(false)}>
          j outer, i inner
        </Button>
      </div>

      <div className="inline-block">
        <div className="flex">
          <div className="w-6" />
          {Array.from({ length: n }, (_, j) => (
            <div key={j} className="w-9 text-center text-[11px] text-muted-foreground font-mono">
              j{j}
            </div>
          ))}
        </div>
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="flex items-center">
            <div className="w-6 text-center text-[11px] text-muted-foreground font-mono">i{i}</div>
            {Array.from({ length: n }, (_, j) => {
              const s = stepAt[`${i}-${j}`]
              const early = s < n // first n accesses highlighted
              return (
                <div
                  key={j}
                  className={cn(
                    'w-9 h-9 border flex items-center justify-center text-[11px] font-mono',
                    early ? 'bg-primary/20 border-primary/50' : 'bg-muted border-border text-muted-foreground'
                  )}
                >
                  {s}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Numbers = visitation order. Memory is <strong>row-major</strong> (<Code>a[i][j]</Code> at address{' '}
        <Code>i·n + j</Code>), so a row is contiguous.{' '}
        {iOuter ? (
          <>
            <Good>i outer</Good> walks each row left-to-right ⇒ <strong>stride 1</strong>, consecutive accesses share a
            cache line — good locality.
          </>
        ) : (
          <>
            <Bad>j outer</Bad> walks down a column ⇒ <strong>stride n</strong>, every access jumps to a new cache line —
            poor locality.
          </>
        )}
      </p>
    </div>
  )
}

const IntroSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Swapping nested loops</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>Loop interchange</strong> exchanges the order of two loops in a nest — the outer loop becomes inner and
          vice versa:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">before</div>
            <Pre>{`for (i = 0; i < n; i++)
  for (j = 0; j < n; j++)
    loop-body;`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after</div>
            <Pre>{`for (j = 0; j < n; j++)
  for (i = 0; i < n; i++)
    loop-body;`}</Pre>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why interchange</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Panel className="my-0">
            <Tag tone="good">Parallelism</Tag>
            <p className="text-sm mt-1.5">
              If the <strong>inner</strong> loop after the interchange carries <strong>no dependence</strong>, its
              iterations are independent and can run <strong>concurrently</strong> (vectorize / parallelize).
            </p>
          </Panel>
          <Panel className="my-0">
            <Tag tone="good">Locality</Tag>
            <p className="text-sm mt-1.5">
              Interchange changes the <strong>order of memory accesses</strong>, which can dramatically improve{' '}
              <strong>cache locality</strong> — e.g. traversing a row-major array along rows instead of columns.
            </p>
          </Panel>
        </div>
        <p className="text-sm mb-3">
          The classic locality win: for a row-major array, keep the <em>contiguous</em> index in the inner loop. Toggle
          the order below and watch the access stride change.
        </p>
        <TraversalDemo />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · The legality rule  (direction-vector checker)
 * ================================================================== */

type Dir = '<' | '=' | '>'
const dirSign: Record<Dir, number> = { '<': 1, '=': 0, '>': -1 }
// lexicographically positive = leading non-zero is '<' (+1)
const lexPositive = (v: [number, number]): boolean => (v[0] !== 0 ? v[0] > 0 : v[1] > 0)
const dirLabel = (v: [number, number]): string => {
  const c = (x: number) => (x > 0 ? '<' : x < 0 ? '>' : '=')
  return `(${c(v[0])}, ${c(v[1])})`
}

const InterchangeChecker: React.FC = () => {
  const [outer, setOuter] = useState<Dir>('<')
  const [inner, setInner] = useState<Dir>('>')
  const vec: [number, number] = [dirSign[outer], dirSign[inner]]
  const swapped: [number, number] = [vec[1], vec[0]]
  const validBefore = lexPositive(vec) || (vec[0] === 0 && vec[1] === 0)
  const isRealDep = !(vec[0] === 0 && vec[1] === 0) && lexPositive(vec)
  const legal = vec[0] === 0 && vec[1] === 0 ? true : lexPositive(swapped)

  const pick = (label: string, set: (d: Dir) => void, cur: Dir) => (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">{label}</span>
      {(['<', '=', '>'] as Dir[]).map((d) => (
        <button
          key={d}
          onClick={() => set(d)}
          className={cn(
            'w-8 h-8 rounded-md border font-mono text-sm transition-colors',
            cur === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
          )}
        >
          {d}
        </button>
      ))}
    </div>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-3">
        {pick('outer:', setOuter, outer)}
        {pick('inner:', setInner, inner)}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Panel className="my-0 text-sm leading-relaxed">
          <div className="font-semibold mb-1">before interchange</div>
          direction vector <Code>{dirLabel(vec)}</Code>
          <div className="mt-1">
            {vec[0] === 0 && vec[1] === 0 ? (
              <span className="text-muted-foreground">loop-independent — no ordering constraint</span>
            ) : isRealDep ? (
              <Good>valid dependence (source before target)</Good>
            ) : (
              <Bad>not a realizable dependence (source after target) — pick a lexicographically positive vector</Bad>
            )}
          </div>
        </Panel>
        <Panel className="my-0 text-sm leading-relaxed">
          <div className="font-semibold mb-1">after interchange (swap the two entries)</div>
          direction vector <Code>{dirLabel(swapped)}</Code>
          <div className="mt-1">
            {!validBefore && !isRealDep ? (
              <span className="text-muted-foreground">—</span>
            ) : legal ? (
              <Good>still source-before-target ⇒ interchange preserved it</Good>
            ) : (
              <Bad>source now after target ⇒ dependence reversed</Bad>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        className={cn(
          'my-3 text-sm leading-relaxed border-2',
          !isRealDep && !(vec[0] === 0 && vec[1] === 0)
            ? 'border-border'
            : legal
              ? 'border-emerald-500/60'
              : 'border-red-500/60'
        )}
      >
        {vec[0] === 0 && vec[1] === 0 ? (
          <>
            <Tag>note</Tag> <span className="ml-1">Loop-independent dependences are <strong>not relevant</strong> to
            interchange — they hold no matter the loop order.</span>
          </>
        ) : !isRealDep ? (
          <>
            <Tag tone="warn">not a dependence</Tag>{' '}
            <span className="ml-1">A real dependence must be lexicographically positive. Try <Code>(&lt;,&gt;)</Code>,{' '}
            <Code>(&lt;,&lt;)</Code>, <Code>(&lt;,=)</Code> or <Code>(=,&lt;)</Code>.</span>
          </>
        ) : legal ? (
          <>
            <Good>Interchange is legal.</Good> The swapped vector is still lexicographically positive, so every
            dependence source still precedes its target.
          </>
        ) : (
          <>
            <Bad>Interchange is ILLEGAL.</Bad> This is the direction vector <Code>(&lt;,&gt;)</Code> — swapping gives{' '}
            <Code>(&gt;,&lt;)</Code>, which puts the source <em>after</em> the target. It is the <strong>only</strong>{' '}
            illegal case.
          </>
        )}
      </Panel>
    </div>
  )
}

const LegalitySection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The one condition: don't alter the dependences</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Interchange is legal exactly when it does <strong>not change</strong> any data dependence. Reasoning by the
          distance / direction vector <Code>(d₁, d₂)</Code> = (outer, inner):
        </p>
        <Table
          head={['Dependence', 'After interchange']}
          rows={[
            [<>loop-independent <Code>(=,=)</Code></>, <>irrelevant — holds in any order</>],
            [<>carried by inner loop <Code>(=,&lt;)</Code></>, <>outer distance 0 ⇒ still carried by the same loop <Good>✓</Good></>],
            [<>carried by outer, 0 in inner <Code>(&lt;,=)</Code></>, <>correctly carried by the same loop after swap <Good>✓</Good></>],
            [<>nonzero in both, <Code>(&lt;,&lt;)</Code></>, <>both entries positive ⇒ preserved <Good>✓</Good></>],
            [<>nonzero in both, <Code>(&lt;,&gt;)</Code></>, <>swap ⇒ <Code>(&gt;,&lt;)</Code>, reversed <Bad>✗</Bad></>],
          ]}
        />
        <Formula>{`Conclusion:  loop interchange is INCORRECT only for direction vector (<, >).`}</Formula>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Try it — the direction-vector checker</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Pick a direction vector and watch it flip when the loops swap. Interchange is legal iff the swapped vector is
          still lexicographically positive (leading non-zero is <Code>&lt;</Code>).
        </p>
        <InterchangeChecker />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Example — a legal interchange</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">before (j outer, i inner)</div>
            <Pre>{`for (j = 2; j < m; j++)
  for (i = 1; i < n; i++)
    s: a[i][j] = a[i][j-1] + 1;`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after (i outer, j inner)</div>
            <Pre>{`for (i = 1; i < n; i++)
  for (j = 2; j < m; j++)
    s: a[i][j] = a[i][j-1] + 1;`}</Pre>
          </div>
        </div>
        <p className="text-sm mt-2">
          The only dependence is <Code>s δᵗ(1,0) s</Code>: <Code>a[i][j]</Code> is written and <Code>a[i][j−1]</Code> read
          — carried by the outer <Code>j</Code> loop, distance 0 in <Code>i</Code>. Direction <Code>(&lt;,=)</Code> is{' '}
          <strong>not</strong> <Code>(&lt;,&gt;)</Code>, so the interchange is <Good>correct</Good>.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · Triangular bounds
 * ================================================================== */

const TriGrid: React.FC<{ swapped: boolean }> = ({ swapped }) => {
  // iteration space: i = 1..4, j = i..6
  const pts: { i: number; j: number }[] = []
  for (let i = 1; i <= 4; i++) for (let j = i; j <= 6; j++) pts.push({ i, j })
  const cell = 26
  const W = 6 * cell + 30
  const H = 6 * cell + 20
  const px = (i: number) => 24 + (i - 1) * cell
  const py = (j: number) => H - 14 - (j - 1) * cell
  const highlight = (p: { i: number; j: number }) =>
    swapped ? p.j === 3 : p.i === 2 // show one "line" of the traversal

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mx-auto block select-none" style={{ height: 'auto', maxWidth: 260 }}>
      {/* axes */}
      <line x1={20} y1={H - 14} x2={W - 4} y2={H - 14} stroke="var(--color-muted-foreground)" strokeWidth={1} />
      <line x1={20} y1={H - 14} x2={20} y2={6} stroke="var(--color-muted-foreground)" strokeWidth={1} />
      <text x={W - 8} y={H - 2} fontSize="10" fill="var(--color-muted-foreground)">i</text>
      <text x={6} y={12} fontSize="10" fill="var(--color-muted-foreground)">j</text>
      {[1, 2, 3, 4].map((i) => (
        <text key={i} x={px(i)} y={H - 2} fontSize="9" textAnchor="middle" fill="var(--color-muted-foreground)">{i}</text>
      ))}
      {[1, 2, 3, 4, 5, 6].map((j) => (
        <text key={j} x={10} y={py(j) + 3} fontSize="9" textAnchor="middle" fill="var(--color-muted-foreground)">{j}</text>
      ))}
      {pts.map((p) => (
        <circle
          key={`${p.i}-${p.j}`}
          cx={px(p.i)}
          cy={py(p.j)}
          r={5}
          fill={highlight(p) ? 'var(--color-primary)' : 'var(--color-card)'}
          stroke={highlight(p) ? 'var(--color-primary)' : 'var(--color-foreground)'}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  )
}

const TriDemo: React.FC = () => {
  const [swapped, setSwapped] = useState(false)
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" variant={swapped ? 'outline' : 'default'} onClick={() => setSwapped(false)}>
          i outer (rows)
        </Button>
        <Button size="sm" variant={swapped ? 'default' : 'outline'} onClick={() => setSwapped(true)}>
          j outer (interchanged)
        </Button>
      </div>
      <TriGrid swapped={swapped} />
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Same triangular iteration space <Code>{'{ (i,j) : 1 ≤ i ≤ 4, i ≤ j ≤ 6 }'}</Code>, highlighted line ={' '}
        {swapped ? <><Code>j = 3</Code> column: <Code>i = 1 … min(4,3)</Code></> : <><Code>i = 2</Code> row: <Code>j = 2 … 6</Code></>}.
      </p>
    </div>
  )
}

const triSteps: StepPanel[] = [
  {
    title: '0 · A triangular nest',
    body: (
      <>
        <Pre>{`for (i = 1; i <= 4; i++)
  for (j = i; j <= 6; j++)
    a[i][j] = a[i][j+1];`}</Pre>
        <p className="text-sm">
          The inner bound <Code>j = i</Code> depends on the outer index — the iteration space is a{' '}
          <strong>triangle</strong>, not a rectangle. We cannot just swap the headers; the bounds must be recomputed.
        </p>
      </>
    ),
  },
  {
    title: '1 · Describe the space as inequalities',
    body: (
      <>
        <p className="text-sm mb-1">Write every loop bound as a linear inequality:</p>
        <Formula>{`−i ≤ −1     (1)   i ≥ 1
 i ≤  4     (2)
 i − j ≤ 0  (3)   j ≥ i
 j ≤  6     (4)`}</Formula>
        <p className="text-sm">This system defines the exact set of iteration points — independent of loop order.</p>
      </>
    ),
  },
  {
    title: '2 · Re-project with j outer, i inner',
    body: (
      <>
        <p className="text-sm mb-1">
          Now make <Code>j</Code> the outer loop. From the inequalities: <Code>j</Code> ranges <Code>1 … 6</Code>; for a
          fixed <Code>j</Code>, <Code>i</Code> satisfies <Code>i ≥ 1</Code>, <Code>i ≤ 4</Code>, and <Code>i ≤ j</Code>{' '}
          (from (3)) ⇒ <Code>i ≤ min(4, j)</Code>:
        </p>
        <Pre>{`for (j = 1; j <= 6; j++)
  for (i = 1; i <= min(4, j); i++)
    a[i][j] = a[i][j+1];`}</Pre>
        <Panel className="text-sm leading-relaxed">
          <Good>Same iteration space, swapped order.</Good> The <Code>min(4, j)</Code> upper bound reproduces the triangle
          exactly. (Interchange is legal here because the only dependence, on <Code>a[i][j+1]</Code>, is not{' '}
          <Code>(&lt;,&gt;)</Code>.)
        </Panel>
      </>
    ),
  },
]

const TriSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">When the inner bounds depend on the outer index</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          If the inner loop's bounds mention the outer index (a <strong>non-rectangular</strong> iteration space), the
          bounds must be <strong>adjusted</strong> so the interchanged nest covers the <em>same</em> points. The trick:
          describe the space as a <strong>system of inequalities</strong>, then re-solve for the new outer/inner order.
        </p>
        <TriDemo />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — recompute the bounds</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={triSteps} showProgress />
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
      Five exam-style problems on §4.4, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Is this interchange legal? Use the direction vector"
      statement={
        <>
          <p className="mb-2">Decide whether the loops may be interchanged, and justify with the direction vector.</p>
          <Pre>{`for (i = 1; i < n; i++)
  for (j = 1; j < n; j++)
    a[i][j] = a[i-1][j] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Dependence.</strong> <Code>a[i][j]</Code> is written; <Code>a[i−1][j]</Code> is read one iteration
            later in <Code>i</Code>, same <Code>j</Code>. Distance vector <Code>(1, 0)</Code> ⇒ direction{' '}
            <Code>(&lt;, =)</Code>.
          </p>
          <p className="text-sm mb-1">
            <strong>Swap the entries:</strong> <Code>(&lt;,=)</Code> → <Code>(=,&lt;)</Code>, still lexicographically
            positive (leading non-zero is <Code>&lt;</Code>). It is <strong>not</strong> the forbidden{' '}
            <Code>(&lt;,&gt;)</Code>.
          </p>
          <Pre>{`for (j = 1; j < n; j++)
  for (i = 1; i < n; i++)
    a[i][j] = a[i-1][j] + 1;`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Legal.</Good> After the swap the dependence is carried by the (now inner) <Code>i</Code> loop, source
            still before target. Bonus: the new <em>inner</em> loop over <Code>i</Code> carries the dependence, so the new{' '}
            <em>outer</em> <Code>j</Code> loop is now parallel.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="The illegal case"
      statement={
        <>
          <p className="mb-2">
            A loop nest has a single dependence with direction vector <Code>(&lt;, &gt;)</Code>. May the loops be
            interchanged? Explain in one or two sentences.
          </p>
        </>
      }
      solution={
        <>
          <Panel className="text-sm leading-relaxed">
            <Bad>No.</Bad> Swapping the loops swaps the vector entries: <Code>(&lt;,&gt;)</Code> → <Code>(&gt;,&lt;)</Code>.
            The leading entry becomes <Code>&gt;</Code>, meaning the source iteration would now run <em>after</em> the
            target — the dependence is reversed and the result changes. <Code>(&lt;,&gt;)</Code> is the{' '}
            <strong>only</strong> direction vector for which loop interchange is incorrect.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Interchange for locality"
      statement={
        <>
          <p className="mb-2">
            The array <Code>a</Code> is stored row-major (<Code>a[i][j]</Code> contiguous in <Code>j</Code>). Which loop
            order gives better cache locality, and is the interchange legal here?
          </p>
          <Pre>{`for (j = 0; j < n; j++)
  for (i = 0; i < n; i++)
    a[i][j] = a[i][j] * 2;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            As written, the inner loop varies <Code>i</Code>, so successive accesses <Code>a[0][j], a[1][j], …</Code> are{' '}
            <strong>stride n</strong> apart — a new cache line each time. Interchanging to put <Code>j</Code> inner makes
            accesses <strong>stride 1</strong> (contiguous):
          </p>
          <Pre>{`for (i = 0; i < n; i++)
  for (j = 0; j < n; j++)
    a[i][j] = a[i][j] * 2;`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Legal &amp; faster.</Good> The only "dependence" is the trivial self-write with distance <Code>(0,0)</Code>{' '}
            (loop-independent), which is irrelevant to interchange. Putting the contiguous index <Code>j</Code> innermost
            maximises spatial locality.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Triangular bounds — adjust for the swap"
      statement={
        <>
          <p className="mb-2">Interchange this nest, recomputing the bounds so the iteration space is unchanged.</p>
          <Pre>{`for (i = 1; i <= 4; i++)
  for (j = i; j <= 6; j++)
    a[i][j] = a[i][j+1];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">Write the space as inequalities:</p>
          <Formula>{`i ≥ 1 ,  i ≤ 4 ,  j ≥ i ,  j ≤ 6`}</Formula>
          <p className="text-sm mb-1">
            Put <Code>j</Code> outer: <Code>j</Code> runs <Code>1 … 6</Code>; for fixed <Code>j</Code>, <Code>i</Code>{' '}
            satisfies <Code>1 ≤ i ≤ 4</Code> and <Code>i ≤ j</Code> ⇒ <Code>i ≤ min(4, j)</Code>:
          </p>
          <Pre>{`for (j = 1; j <= 6; j++)
  for (i = 1; i <= min(4, j); i++)
    a[i][j] = a[i][j+1];`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Correct.</Good> The <Code>min(4, j)</Code> reproduces the triangle exactly, and the dependence via{' '}
            <Code>a[i][j+1]</Code> is not <Code>(&lt;,&gt;)</Code>, so the swap is legal.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Classify every dependence, then decide"
      statement={
        <>
          <p className="mb-2">
            A nest <Code>for i / for j</Code> has three dependences with distance vectors <Code>(0,1)</Code>,{' '}
            <Code>(1,0)</Code>, and <Code>(1,−1)</Code>. (a) For each, give the direction vector and say whether swapping
            preserves it. (b) Is the interchange of the whole nest legal? (c) If not, which single dependence blocks it?
          </p>
        </>
      }
      solution={
        <>
          <Table
            head={['Distance', 'Direction', 'Swapped', 'Preserved?']}
            rows={[
              [<Code>(0,1)</Code>, <Code>(=,&lt;)</Code>, <Code>(&lt;,=)</Code>, <Good>✓</Good>],
              [<Code>(1,0)</Code>, <Code>(&lt;,=)</Code>, <Code>(=,&lt;)</Code>, <Good>✓</Good>],
              [<Code>(1,−1)</Code>, <Code>(&lt;,&gt;)</Code>, <Code>(&gt;,&lt;)</Code>, <Bad>✗</Bad>],
            ]}
          />
          <p className="text-sm mb-1">
            <strong>(a)</strong> Only <Code>(1,−1)</Code> flips to a lexicographically <em>negative</em> vector when
            swapped.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(b)</strong> <Bad>The interchange is illegal.</Bad> Interchange is legal only if <em>every</em>{' '}
            dependence survives; here one does not. <strong>(c)</strong> The blocker is <Code>(1,−1)</Code> — direction{' '}
            <Code>(&lt;,&gt;)</Code>, the single forbidden pattern. (This is exactly the situation §4.6 fixes with{' '}
            <strong>loop skewing</strong>.)
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
  { id: 'legality', label: 'The legality rule', render: () => <LegalitySection /> },
  { id: 'triangular', label: 'Triangular bounds', render: () => <TriSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function LoopInterchangeStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 4 · §4.4 · Loop Interchange"
      title="Loop Interchange"
      subtitle="Swapping the order of nested loops to expose parallelism or improve cache locality. The transformation is legal unless it reverses a dependence — and that happens for exactly one direction vector, (<,>). Non-rectangular nests need their bounds recomputed so the iteration space is preserved."
      tabs={tabs}
    />
  )
}
