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
      Five exam-style problems on §4.4, easy → hardest — all on <em>fresh</em> code, not the lecture examples. Q1 is
      fully worked to set the pattern; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="From subscripts to verdict — including a counterexample"
      statement={
        <>
          <p className="mb-2">
            Derive the distance and direction vector from the subscripts, decide whether the loops may be interchanged,
            and — if not — give a <em>concrete pair of iterations</em> whose values change after the swap.
          </p>
          <Pre>{`for (i = 2; i <= n; i++)
  for (j = 1; j <= m-1; j++)
    b[i][j] = b[i-2][j+1] * 0.5;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Step 1 — the distance vector from the subscripts.</strong> Iteration <Code>(i, j)</Code> reads{' '}
            <Code>b[i−2][j+1]</Code>, which was <em>written</em> by iteration <Code>(i−2, j+1)</Code>. Distance = (read
            iteration) − (write iteration):
          </p>
          <Formula>{`d = (i, j) − (i−2, j+1) = (2, −1)   →   direction (<, >)`}</Formula>
          <p className="text-sm mb-1">
            The vector is lexicographically positive (leading entry 2 &gt; 0), so this is a real flow dependence — the
            write happens two <Code>i</Code>-iterations before the read, one <Code>j</Code>-iteration "behind".
          </p>
          <p className="text-sm mb-1">
            <strong>Step 2 — swap the entries:</strong> <Code>(2, −1) → (−1, 2)</Code>, i.e. <Code>(&lt;,&gt;)</Code> →{' '}
            <Code>(&gt;,&lt;)</Code>: lexicographically <em>negative</em>. <Bad>Interchange is illegal</Bad> — this is
            exactly the one forbidden direction.
          </p>
          <p className="text-sm mb-1">
            <strong>Step 3 — concrete counterexample.</strong> Take the write at <Code>(i,j) = (2,3)</Code> (produces{' '}
            <Code>b[2][3]</Code>) and the read at <Code>(4,2)</Code> (consumes <Code>b[2][3]</Code>):
          </p>
          <Table
            head={['Order', 'Which runs first?', 'The read of b[2][3] sees']}
            rows={[
              [<><Code>i</Code> outer (original)</>, <><Code>(2,3)</Code> before <Code>(4,2)</Code> — write first</>, <Good>the new value ✓</Good>],
              [<><Code>j</Code> outer (swapped)</>, <><Code>(j,i) = (2,4)</Code> before <Code>(3,2)</Code> — read first</>, <Bad>the stale value ✗</Bad>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Pattern for Q2–Q5:</Good> (i) distance = read-iteration − write-iteration (per index), (ii) check the
            write really precedes the read (lexicographically positive), (iii) swap the entries and test positivity
            again, (iv) when the verdict is "illegal", one concrete iteration pair is the cleanest proof.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Interchange to unlock vectorization"
      statement={
        <>
          <p className="mb-2">
            (a) Which loop carries the dependence, and why can the inner loop <em>not</em> be vectorized as written? (b)
            Show the interchange is legal. (c) Which loop carries the dependence afterwards — and what did we gain?
          </p>
          <Pre>{`for (i = 0; i < n; i++)
  for (j = 1; j < m; j++)
    c[i][j] = c[i][j-1] + u[i];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> Write <Code>c[i][j]</Code>, read <Code>c[i][j−1]</Code> → distance{' '}
            <Code>(0, 1)</Code>, direction <Code>(=, &lt;)</Code>. The first nonzero entry is in the <Code>j</Code>{' '}
            position: the <strong>inner loop carries it</strong> — each <Code>j</Code>-iteration needs its predecessor, a
            running recurrence, so the inner loop cannot be vectorized.
          </p>
          <p className="text-sm mb-1">
            <strong>(b)</strong> Swap: <Code>(=,&lt;) → (&lt;,=)</Code>, still lexicographically positive and not{' '}
            <Code>(&lt;,&gt;)</Code> ⇒ <Good>legal</Good>:
          </p>
          <Pre>{`for (j = 1; j < m; j++)
  for (i = 0; i < n; i++)
    c[i][j] = c[i][j-1] + u[i];`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(c)</strong> The swapped vector <Code>(&lt;,=)</Code> has its first nonzero in the new <em>outer</em>{' '}
            (<Code>j</Code>) position — the dependence is now carried by the outer loop, and the inner <Code>i</Code>{' '}
            loop carries <strong>nothing</strong>: all <Code>n</Code> rows advance independently, so the inner loop
            vectorizes / parallelizes. <Good>Interchange moved the recurrence out of the hot loop.</Good> (Caveat: for a
            row-major array the inner <Code>i</Code> accesses are strided — expect a locality trade-off, cf. Q3.)
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="When locality wants the swap but legality forbids it"
      statement={
        <>
          <p className="mb-2">
            <Code>A</Code> is row-major (<Code>A[i][j]</Code> contiguous in <Code>j</Code>). (a) Which loop order would
            give stride-1 accesses? (b) Derive the dependence — mind which access is the read and which the write — and
            decide whether that order can be reached by interchange. (c) State the outcome.
          </p>
          <Pre>{`for (j = 1; j < m-1; j++)
  for (i = 1; i < n; i++)
    A[i][j] = A[i-1][j+1] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> The inner loop varies <Code>i</Code> → consecutive accesses jump a whole row
            (stride <Code>m</Code>). For stride 1 we want <Code>j</Code> innermost, i.e. the interchanged order.
          </p>
          <p className="text-sm mb-1">
            <strong>(b)</strong> Careful — work in the loop order <Code>(j, i)</Code>. Iteration <Code>(j, i)</Code>{' '}
            reads <Code>A[i−1][j+1]</Code>; that element is written by iteration <Code>(j+1, i−1)</Code>, which runs{' '}
            <em>later</em> (larger <Code>j</Code>). Read-before-write ⇒ an <strong>anti</strong>-dependence, source =
            the reading iteration:
          </p>
          <Formula>{`d = (j+1, i−1) − (j, i) = (1, −1)   →   direction (<, >)`}</Formula>
          <p className="text-sm mb-1">
            That is precisely the forbidden vector: swapping gives <Code>(&gt;,&lt;)</Code>, the write would overtake the
            read and every <Code>A[i−1][j+1]</Code> would see an already-overwritten value. <Bad>Interchange
            illegal.</Bad>
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(c)</strong> The cache-friendly order exists but is unreachable by interchange alone — the nest is
            stuck with strided accesses. (Anti-dependences count exactly like flow dependences here; and this{' '}
            <Code>(&lt;,&gt;)</Code> blockade is the cue for <strong>loop skewing</strong>, §4.6.){' '}
            <Good>Lesson:</Good> profitability (a) and legality (b) are separate questions — always answer both.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Trapezoidal bounds — a max() lower bound appears"
      statement={
        <>
          <p className="mb-2">
            Interchange this nest, recomputing the bounds so the iteration space is preserved (sketch it first!), and
            verify legality via the dependence.
          </p>
          <Pre>{`for (i = 0; i <= 5; i++)
  for (j = 0; j <= i+2; j++)
    w[i][j] = w[i-1][j] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Legality first.</strong> Write <Code>w[i][j]</Code>, read <Code>w[i−1][j]</Code>: distance{' '}
            <Code>(1,0)</Code>, direction <Code>(&lt;,=)</Code> ≠ <Code>(&lt;,&gt;)</Code> ⇒ interchange allowed.
          </p>
          <p className="text-sm mb-1"><strong>The space as inequalities:</strong></p>
          <Formula>{`0 ≤ i ≤ 5,    0 ≤ j ≤ i + 2`}</Formula>
          <p className="text-sm mb-1">
            A trapezoid: rows get longer as <Code>i</Code> grows (row <Code>i</Code> has <Code>i+3</Code> points, up to{' '}
            <Code>j = 7</Code>). Now solve for <Code>j</Code> outer: from <Code>j ≤ i+2</Code> and <Code>i ≤ 5</Code>,{' '}
            <Code>j</Code> ranges <Code>0 … 7</Code>; for fixed <Code>j</Code>, the constraint <Code>j ≤ i+2</Code>{' '}
            becomes a <strong>lower</strong> bound on <Code>i</Code>: <Code>i ≥ j−2</Code>, together with{' '}
            <Code>i ≥ 0</Code>:
          </p>
          <Pre>{`for (j = 0; j <= 7; j++)
  for (i = max(0, j-2); i <= 5; i++)
    w[i][j] = w[i-1][j] + 1;`}</Pre>
          <p className="text-sm mb-1">
            <strong>Spot check:</strong> <Code>j = 0</Code> → <Code>i = 0…5</Code> (column 0 is full ✓); <Code>j = 7</Code>{' '}
            → <Code>i = 5…5</Code> (only the longest row reaches <Code>j = 7</Code> ✓). Total points:{' '}
            <Code>3+4+…+8 = 33</Code> in both versions.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Mirror rule of the lecture example:</Good> an outer index in the inner loop's <em>upper</em> bound
            turns into a <Code>min(…)</Code> upper bound after the swap — an outer index in the inner{' '}
            <em>upper</em> bound constraining from below (as here, <Code>j ≤ i+2</Code> read backwards) turns into a{' '}
            <Code>max(…)</Code> <em>lower</em> bound. Deriving from the inequality system gets both cases right
            automatically.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Three nested loops — which of the six orders are legal?"
      statement={
        <>
          <p className="mb-2">
            A nest <Code>for i / for j / for k</Code> has three dependences with distance vectors (in{' '}
            <Code>(i,j,k)</Code> order):
          </p>
          <Formula>{`d1 = (1, 1, −1),    d2 = (0, 1, 0),    d3 = (1, 0, 0)`}</Formula>
          <p className="mb-0">
            (a) State the legality rule for a general loop permutation. (b) Decide for each of the 6 orders whether it is
            legal. (c) Among the legal orders, which leave the <em>innermost</em> loop free of carried dependences (=
            vectorizable)? (d) Explain structurally why <Code>k</Code> can never be the outermost loop.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> A permutation is legal iff <em>every</em> distance vector, with its entries permuted the
            same way, stays <strong>lexicographically positive</strong> — the pairwise <Code>(&lt;,&gt;)</Code> rule is
            the 2-loop special case.
          </p>
          <p className="text-sm mb-1"><strong>(b)</strong> Permute all three vectors and test each order:</p>
          <Table
            head={['Order', 'd1', 'd2', 'd3', 'Verdict']}
            rows={[
              [<Code>i,j,k</Code>, <Code>(1,1,−1)</Code>, <Code>(0,1,0)</Code>, <Code>(1,0,0)</Code>, <Good>legal</Good>],
              [<Code>i,k,j</Code>, <Code>(1,−1,1)</Code>, <Code>(0,0,1)</Code>, <Code>(1,0,0)</Code>, <Good>legal</Good>],
              [<Code>j,i,k</Code>, <Code>(1,1,−1)</Code>, <Code>(1,0,0)</Code>, <Code>(0,1,0)</Code>, <Good>legal</Good>],
              [<Code>j,k,i</Code>, <Code>(1,−1,1)</Code>, <Code>(1,0,0)</Code>, <Code>(0,0,1)</Code>, <Good>legal</Good>],
              [<Code>k,i,j</Code>, <Code>(−1,1,1)</Code>, <Code>(0,0,1)</Code>, <Code>(0,1,0)</Code>, <Bad>illegal (d1)</Bad>],
              [<Code>k,j,i</Code>, <Code>(−1,1,1)</Code>, <Code>(0,1,0)</Code>, <Code>(0,0,1)</Code>, <Bad>illegal (d1)</Bad>],
            ]}
          />
          <p className="text-sm mb-1">
            <strong>(c)</strong> A dependence is carried by the loop of its <em>first nonzero</em> entry; the innermost
            loop is dependence-free iff no permuted vector has its first nonzero in the last position:
          </p>
          <Table
            head={['Legal order', 'Carriers (d1, d2, d3)', 'Innermost free?']}
            rows={[
              [<Code>i,j,k</Code>, 'i, j, i', <Good>✓ k free — vectorizable</Good>],
              [<Code>i,k,j</Code>, <>i, <strong>j (last!)</strong>, i</>, <Bad>✗ d2 carried innermost</Bad>],
              [<Code>j,i,k</Code>, 'j, j, i', <Good>✓ k free — vectorizable</Good>],
              [<Code>j,k,i</Code>, <>j, j, <strong>i (last!)</strong></>, <Bad>✗ d3 carried innermost</Bad>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(d)</strong> <Code>d1</Code> has a <strong>negative</strong> <Code>k</Code>-entry. A negative entry
            is only tolerable if some <em>positive</em> entry stands further out to keep the vector lexicographically
            positive — move <Code>k</Code> to the front and <Code>−1</Code> leads, which would mean the dependence runs
            backwards in time. <Good>General insight:</Good> a loop whose entry is negative in some dependence may move
            inward past positives, but never all the way out. Best choices here: <Code>i,j,k</Code> or{' '}
            <Code>j,i,k</Code> — legal <em>and</em> innermost-vectorizable; pick between them by which array's stride-1
            index ends up innermost.
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
