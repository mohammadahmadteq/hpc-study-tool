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
  QuestionCard,
  StudyShell,
  type StepPanel,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 3 · §3.4 — Solving the Data Dependence System  (PDF 159–178)
 *  3.4.1 single-equation solvers (GCD + extreme value),
 *  3.4.2 direction-vector hierarchy, 3.4.3 multiple equations.
 * ------------------------------------------------------------------ */

const gcd2 = (a: number, b: number): number => {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}
const gcdAll = (xs: number[]) => xs.reduce((g, x) => gcd2(g, x), 0)

/* ------------------------------------------------------------------ *
 *  Tab 1 · the GCD test
 * ------------------------------------------------------------------ */

interface GcdCase {
  label: string
  coeffs: number[]
  c: number
  note?: React.ReactNode
}
const gcdCases: GcdCase[] = [
  { label: 'iᵈ₁ − iᵘ₁ + 2·iᵈ₂ − 2·iᵘ₂ = −1', coeffs: [1, -1, 2, -2], c: -1, note: 'the a[i+2j] example, full nest' },
  { label: '2·iᵈ₂ − 2·iᵘ₂ = −1', coeffs: [2, -2], c: -1, note: 'same example, restricted to one outer iteration (iᵈ₁ = iᵘ₁)' },
  { label: '6·i₁ − 4·i₂ + 14·i₃ = 98', coeffs: [6, -4, 14], c: 98 },
  { label: '10·iᵈ₁ − 10·iᵘ₁ + iᵈ₂ − iᵘ₂ = −1', coeffs: [10, -10, 1, -1], c: -1, note: 'the A[i·10+j] example' },
  { label: '2·iᵈ − 2·iᵘ = 1', coeffs: [2, -2], c: 1, note: 'even writes vs odd reads' },
]

const GcdChecker: React.FC = () => {
  const [sel, setSel] = useState(0)
  const cse = gcdCases[sel]
  const g = gcdAll(cse.coeffs)
  const divides = cse.c % g === 0
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {gcdCases.map((x, i) => (
          <button
            key={i}
            onClick={() => setSel(i)}
            className={cn(
              'text-[11.5px] font-mono px-2 py-1.5 rounded-lg border transition-colors',
              sel === i ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {x.label}
          </button>
        ))}
      </div>
      <Panel>
        <div className="text-[13px] font-mono mb-1">
          gcd({cse.coeffs.join(', ')}) = <strong>{g}</strong>
        </div>
        <div className="text-[13px] font-mono mb-2">
          does {g} divide c = {cse.c}?{'  '}
          {divides ? <span className="text-amber-600 dark:text-amber-400 font-semibold">yes</span> : <span className="text-emerald-600 dark:text-emerald-400 font-semibold">no</span>}
        </div>
        {divides ? (
          <div className="text-[13px] leading-relaxed">
            <Bad>A solution is not excluded</Bad> — the GCD test cannot rule out a dependence.{' '}
            {g === 1 && <span>(With gcd = 1 it never can: 1 divides every c.)</span>}
          </div>
        ) : (
          <div className="text-[13px] leading-relaxed">
            <Good>No integer solution → no dependence.</Good> Since {g} ∤ {cse.c}, the Diophantine equation is unsolvable,
            so these accesses are independent and may run in parallel.
          </div>
        )}
        {cse.note && <div className="text-xs text-muted-foreground mt-2">{cse.note}</div>}
      </Panel>
    </div>
  )
}

const gcdExampleSteps: StepPanel[] = [
  {
    title: '0 · The loop nest',
    body: (
      <>
        <Pre>{`for (i = 1; i <= n; i++)
  for (j = 2; j <= 10; j++) {
    a[i + 2*j]     = ...
    ...            = a[i + 2*j - 1]
  }`}</Pre>
        <p className="text-sm">Write <Code>a[i+2j]</Code>, read <Code>a[i+2j−1]</Code> — one array dimension, two induction variables.</p>
      </>
    ),
  },
  {
    title: '1 · Normalized dependence equation',
    body: (
      <>
        <Formula>{`iᵈ₁ + 2·iᵈ₂ + 5 = iᵘ₁ + 2·iᵘ₂ + 4
⇔  iᵈ₁ − iᵘ₁ + 2·iᵈ₂ − 2·iᵘ₂ = −1`}</Formula>
      </>
    ),
  },
  {
    title: '2 · GCD test on the full equation',
    body: (
      <>
        <Formula>{`gcd(1, −1, 2, −2) = 1   and   1 | −1`}</Formula>
        <p className="text-sm">
          1 divides −1, so a solution <strong>cannot be excluded</strong> ⇒ there is (potentially) a dependence across the
          whole nest.
        </p>
      </>
    ),
  },
  {
    title: '3 · Refine: only the inner loop (fix the outer iteration)',
    body: (
      <>
        <p className="text-sm mb-1">
          Ask whether different <em>inner</em> iterations depend on each other <em>within one outer iteration</em>. Then
          additionally <Code>iᵈ₁ = iᵘ₁</Code>, and the equation simplifies:
        </p>
        <Formula>{`2·iᵈ₂ − 2·iᵘ₂ = −1
gcd(2, −2) = 2   and   2 ∤ −1  ⇒  no solution`}</Formula>
        <Panel className="text-sm leading-relaxed">
          <Good>No dependence between inner iterations.</Good> The inner loop carries nothing ⇒ its iterations can be
          processed in parallel — <strong>parallelization of the inner loop</strong>.
        </Panel>
      </>
    ),
  },
]

const GcdSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">A solver's three answers</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">Solving the dependence system, a solver returns one of three verdicts:</p>
        <Table
          head={['Answer', 'Meaning']}
          rows={[
            [<>(a) <strong>no</strong> integer solution</>, <Good>there is no dependence</Good>],
            [<>(b) an integer solution exists</>, <Bad>there surely is a dependence</Bad>],
            [<>(c) there <strong>may</strong> be a solution</>, <>inexact: solver neither found one nor proved none — no conclusion</>],
          ]}
        />
        <Panel className="text-sm leading-relaxed mt-2">
          <strong>Conservativeness is mandatory:</strong> answer (a) must be <em>certain</em>. A solver may fall back to (c)
          and lose precision, but it must never claim "no dependence" unless there truly is none — otherwise the compiler
          would parallelize unsafely.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The GCD test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          For a single linear Diophantine equation <Code>Σ aₖ·iₖ = c</Code>, number theory gives an exact solvability
          criterion:
        </p>
        <Formula>{`g = gcd(a₁, …, aₙ)
the equation  Σ aₖ·iₖ = c  has an integer solution  ⇔  g | c

⇒  if g does NOT divide c, there is no integer solution (no dependence).`}</Formula>
        <p className="text-sm mt-2 mb-1">The gcd itself comes from Euclid's algorithm, extended over a list:</p>
        <Pre>{`gcd(a, b) = gcd(b, a mod b)   if b ≠ 0
gcd(a, 0) = |a|

g = |a₁|;
for (k = 2; k <= n; k++)  g = gcd(g, aₖ);`}</Pre>
        <Panel className="text-sm leading-relaxed mt-1">
          <strong>Weakness:</strong> very often <Code>gcd = 1</Code>, and 1 divides every <Code>c</Code> — so the test
          cannot exclude a dependence. It is a cheap, one-sided filter: great at proving independence when it can, useless
          when the gcd is 1.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Try the GCD test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">Pick a dependence equation; the checker computes the gcd and tests divisibility of c.</p>
        <GcdChecker />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — and parallelizing the inner loop</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          The gcd = 1 case looks hopeless, but <em>restricting</em> the question to the inner loop (fixing the outer
          index) can sharpen it into a clean "no":
        </p>
        <Stepper steps={gcdExampleSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Tab 2 · finding solutions (±1 split / variable substitution)
 * ------------------------------------------------------------------ */

const substSteps: StepPanel[] = [
  {
    title: '0 · The equation, none of whose coefficients is ±1',
    body: (
      <>
        <Formula>{`6·i₁ − 4·i₂ + 14·i₃ = 98`}</Formula>
        <p className="text-sm">The ±1 shortcut does not apply, so we reduce coefficients by variable substitution.</p>
      </>
    ),
  },
  {
    title: '1 · Divide out the gcd',
    body: (
      <>
        <Formula>{`gcd(6, −4, 14) = 2
÷2 :   3·i₁ − 2·i₂ + 7·i₃ = 49      (3.7)`}</Formula>
      </>
    ),
  },
  {
    title: '2 · Substitute the smallest-magnitude coefficient (a₂ = −2)',
    body: (
      <>
        <p className="text-sm mb-1">Define a new variable with the integer divisions <Code>aₖ div a₂</Code>:</p>
        <Formula>{`j₂ = Σ (aₖ div a₂)·iₖ
   = (3 div −2)·i₁ + (−2 div −2)·i₂ + (7 div −2)·i₃
   = −i₁ + i₂ − 3·i₃

solve for i₂ :   i₂ = i₁ + j₂ + 3·i₃         (3.8)`}</Formula>
      </>
    ),
  },
  {
    title: '3 · Back-substitute → coefficients shrink',
    body: (
      <>
        <p className="text-sm mb-1">Putting <Code>i₂</Code> into (3.7), every coefficient now has magnitude &lt; 2:</p>
        <Formula>{`3·i₁ − 2·(i₁ + j₂ + 3·i₃) + 7·i₃ = 49
⇔  i₁ − 2·j₂ + i₃ = 49`}</Formula>
        <p className="text-sm">A ±1 coefficient (on <Code>i₁</Code> and <Code>i₃</Code>) has appeared — now the ±1 case applies.</p>
      </>
    ),
  },
  {
    title: '4 · Choose a dependent variable and express the rest',
    body: (
      <>
        <p className="text-sm mb-1">Take <Code>i₁</Code> dependent; back-substitute through (3.8):</p>
        <Formula>{`i₁ = 2·j₂ − i₃ + 49
i₂ = 3·j₂ + 2·i₃ + 49`}</Formula>
        <Panel className="text-sm leading-relaxed">
          <strong>Conclusion:</strong> for <em>any</em> values of the independent variables <Code>j₂</Code> and{' '}
          <Code>i₃</Code>, these formulas give <Code>i₁, i₂</Code> solving the equation. The full integer solution set is
          parametrized — exactly what a dependence test needs to then check against the loop limits.
        </Panel>
      </>
    ),
  },
]

const SolutionsSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">When a solution exists, describe all of them</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Once the GCD test says a solution exists, the solver builds the parametric solution set: one{' '}
          <strong>dependent</strong> variable expressed through the others (the <strong>independent</strong>/free ones).
          Two cases:
        </p>
        <Step n="1">
          <strong>Some coefficient is ±1</strong> (say <Code>a₁ = 1</Code>): solve directly for that variable —
          <Formula>{`i₁ = c − a₂·i₂ − a₃·i₃ − … − aₙ·iₙ      (3.4)`}</Formula>
          any choice of the others yields the dependent one.
        </Step>
        <Step n="2">
          <strong>No coefficient is ±1</strong>: substitute the <em>smallest-magnitude</em> coefficient <Code>aₗ</Code> by a
          new variable
          <Formula>{`jₗ = Σ (aₖ div aₗ)·iₖ          (3.5)

substituting back :  Σ (aₖ − aₗ·(aₖ div aₗ))·iₖ + aₗ·jₗ = c   (3.6)`}</Formula>
          all new coefficients are smaller than <Code>aₗ</Code>; divide by their gcd and repeat until a ±1 appears.
        </Step>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — variable substitution</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={substSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Tab 3 · the extreme value test
 * ------------------------------------------------------------------ */

type DirKey = '*' | '<' | '=' | '>'
interface ExtremeCase {
  key: DirKey
  title: string
  extra?: string
  rows: React.ReactNode[][]
  interval: string
  dep: boolean
  verdict: React.ReactNode
}
const extremeCases: ExtremeCase[] = [
  {
    key: '*',
    title: 'arbitrary direction (∗)',
    rows: [
      ['original  −m + iᵈ − iᵘ', '−m + iᵈ − iᵘ', '−m + iᵈ − iᵘ'],
      ['eliminate iᵘ', '−m + iᵈ − 9', '−m + iᵈ − 0'],
      ['eliminate iᵈ', '−m − 9', '−m + 9'],
      ['eliminate m', '−∞', '8'],
    ],
    interval: '[−∞, 8]',
    dep: true,
    verdict: (
      <>
        Since <Code>c ≡ 0 ∈ [−∞, 8]</Code>, a dependence <Bad>cannot be excluded</Bad> in general — refine by direction.
      </>
    ),
  },
  {
    key: '<',
    title: 'direction <  (iᵈ < iᵘ ⇔ iᵈ ≤ iᵘ − 1)',
    extra: 'use iᵘ ≥ iᵈ + 1 when eliminating iᵘ',
    rows: [
      ['original  −m + iᵈ − iᵘ', '−m + iᵈ − iᵘ', '−m + iᵈ − iᵘ'],
      ['eliminate iᵘ', '−m + iᵈ − 9', '−m + iᵈ − (iᵈ+1) = −m − 1'],
      ['eliminate iᵈ', '−m − 9', '−m − 1'],
      ['eliminate m', '−∞', '−2'],
    ],
    interval: '[−∞, −2]',
    dep: false,
    verdict: (
      <>
        <Code>c ≡ 0 ∉ [−∞, −2]</Code> ⇒ <Good>no dependence with direction &lt;</Good>.
      </>
    ),
  },
  {
    key: '=',
    title: 'direction =  (iᵈ = iᵘ)',
    extra: 'the equation collapses to −m = 0',
    rows: [
      ['simplified  −m', '−m', '−m'],
      ['eliminate m  (1 ≤ m ≤ ∞)', '−∞', '−1'],
    ],
    interval: '[−∞, −1]',
    dep: false,
    verdict: (
      <>
        <Code>c ≡ 0 ∉ [−∞, −1]</Code> ⇒ <Good>no dependence with direction =</Good>.
      </>
    ),
  },
  {
    key: '>',
    title: 'direction >  (iᵈ > iᵘ ⇔ iᵘ ≤ iᵈ − 1)',
    rows: [
      ['original  −m + iᵈ − iᵘ', '−m + iᵈ − iᵘ', '−m + iᵈ − iᵘ'],
      ['eliminate iᵘ (iᵘ = 0)', '−m + iᵈ − (iᵈ−1) = −m − 1', '−m + iᵈ'],
      ['eliminate iᵈ', '−m − 1', '−m + 9'],
      ['eliminate m', '−∞', '8'],
    ],
    interval: '[−∞, 8]',
    dep: true,
    verdict: (
      <>
        <Code>c ≡ 0 ∈ [−∞, 8]</Code> ⇒ a dependence is <Bad>possible</Bad>. Since iᵈ &gt; iᵘ (use before def), it is an{' '}
        <strong>anti-dependence</strong>.
      </>
    ),
  },
]

const ExtremeExplorer: React.FC = () => {
  const [k, setK] = useState<DirKey>('*')
  const cse = extremeCases.find((c) => c.key === k)!
  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {extremeCases.map((c) => (
          <button
            key={c.key}
            onClick={() => setK(c.key)}
            className={cn(
              'text-[12.5px] font-mono px-3 py-1.5 rounded-full border transition-colors',
              k === c.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            ({c.key})
          </button>
        ))}
      </div>
      <div className="text-sm font-medium mb-1">{cse.title}</div>
      {cse.extra && <div className="text-xs text-muted-foreground mb-1">{cse.extra}</div>}
      <Table head={['step', 'lower limit', 'upper limit']} rows={cse.rows} />
      <Panel className="text-sm leading-relaxed mt-1">
        extreme values <Code>{cse.interval}</Code>{' — '}
        {cse.verdict}
      </Panel>
    </div>
  )
}

const ExtremeSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The extreme value test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A complementary, range-based filter. Plug the <strong>lower and upper loop limits</strong> of each unknown into
          the expression <Code>Σ aₖ·iₖ</Code> to bound it:
        </p>
        <Formula>{`compute the interval  [ min Σ aₖ·iₖ ,  max Σ aₖ·iₖ ]  over the loop limits.
a dependence can only exist if  c  lies inside that interval.`}</Formula>
        <p className="text-sm">
          Eliminate one unknown at a time, taking the limit that minimizes (for the lower bound) or maximizes (for the
          upper bound) the running expression.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — and refining by direction</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`if (m > 0)
  for (i = 1; i <= 10; i++)
    a[i] = a[i+m] + b[i];

dependence equation:  −m + iᵈ − iᵘ = 0
limits:  1 ≤ m ≤ ∞,   0 ≤ iᵈ ≤ 9,   0 ≤ iᵘ ≤ 9`}</Pre>
        <p className="text-sm mb-3">
          The arbitrary-direction case can't decide, but constraining the direction vector tightens the interval enough to
          exclude the flow dependence. Toggle the cases:
        </p>
        <ExtremeExplorer />
        <Panel className="text-sm leading-relaxed mt-2">
          (∗) is inconclusive; <Code>&lt;</Code> and <Code>=</Code> both exclude a dependence, so there is{' '}
          <strong>no flow dependence</strong>; only <Code>&gt;</Code> survives ⇒ an <strong>anti-dependence</strong> is
          possible. Note this test only uses loop limits — it does <em>not</em> check for an integer solution, so it pairs
          naturally with the GCD test.
        </Panel>
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Tab 4 · direction vector hierarchy (interactive tree)
 * ------------------------------------------------------------------ */

type Kind = 'refine' | 'possible' | 'independent'
interface DvNode {
  id: string
  label: string
  x: number
  y: number
  kind: Kind
  interval: string
  eq?: string
  note: React.ReactNode
}
const dvNodes: DvNode[] = [
  { id: 's', label: '(∗,∗)', x: 320, y: 34, kind: 'refine', interval: '[−99, 99]', eq: '10·iᵈ₁ − 10·iᵘ₁ + iᵈ₂ − iᵘ₂ = −1', note: 'GCD test allows it; −1 ∈ [−99, 99] ⇒ refine the first dimension.' },
  { id: '<', label: '(<,∗)', x: 150, y: 150, kind: 'refine', interval: '[−99, −1]', note: 'add iᵈ₁ ≤ iᵘ₁ − 1; −1 ∈ [−99, −1] ⇒ refine further.' },
  { id: '=', label: '(=,∗)', x: 360, y: 150, kind: 'refine', interval: '[−9, 9]', eq: 'iᵈ₂ − iᵘ₂ = −1', note: 'add iᵈ₁ = iᵘ₁, the equation simplifies; −1 ∈ [−9, 9] ⇒ refine.' },
  { id: '>', label: '(>,∗)', x: 560, y: 150, kind: 'independent', interval: '[1, 99]', note: 'add iᵘ₁ ≤ iᵈ₁ − 1; −1 ∉ [1, 99] ⇒ whole branch independent.' },
  { id: '<<', label: '(<,<)', x: 60, y: 280, kind: 'independent', interval: '[−99, −11]', note: '−1 ∉ [−99, −11] ⇒ independent.' },
  { id: '<=', label: '(<,=)', x: 150, y: 280, kind: 'independent', interval: '[−90, −10]', eq: '10·iᵈ₁ − 10·iᵘ₁ = −1', note: 'gcd 10 ∤ −1, and −1 ∉ [−90, −10] ⇒ independent.' },
  { id: '<>', label: '(<,>)', x: 240, y: 280, kind: 'possible', interval: '[−89, −1]', note: '−1 ∈ [−89, −1] ⇒ dependence possible (carried by the outer loop — the row wrap-around).' },
  { id: '=<', label: '(=,<)', x: 300, y: 280, kind: 'possible', interval: '[−9, −1]', note: '−1 ∈ [−9, −1] ⇒ dependence possible (carried by the inner loop — consecutive j).' },
  { id: '==', label: '(=,=)', x: 372, y: 280, kind: 'independent', interval: '{0}', eq: '0 = −1', note: '0 ≠ −1 ⇒ no solution, independent.' },
  { id: '=>', label: '(=,>)', x: 444, y: 280, kind: 'independent', interval: '[1, 9]', note: '−1 ∉ [1, 9] ⇒ independent.' },
]
const dvEdges: [string, string][] = [
  ['s', '<'], ['s', '='], ['s', '>'],
  ['<', '<<'], ['<', '<='], ['<', '<>'],
  ['=', '=<'], ['=', '=='], ['=', '=>'],
]
const kindStyle: Record<Kind, { stroke: string; fill: string }> = {
  refine: { stroke: 'var(--color-muted-foreground)', fill: 'var(--color-card)' },
  possible: { stroke: '#dc2626', fill: 'rgba(239,68,68,0.16)' },
  independent: { stroke: '#059669', fill: 'rgba(16,185,129,0.16)' },
}

const DvTree: React.FC = () => {
  const [sel, setSel] = useState('s')
  const node = dvNodes.find((n) => n.id === sel)!
  const map = Object.fromEntries(dvNodes.map((n) => [n.id, n]))
  const W = 56
  const H = 26
  return (
    <div>
      <svg viewBox="0 0 640 320" className="w-full mx-auto block select-none" style={{ height: 'auto', maxWidth: 640 }}>
        {dvEdges.map(([a, b]) => {
          const na = map[a]
          const nb = map[b]
          return <line key={`${a}-${b}`} x1={na.x} y1={na.y + H / 2} x2={nb.x} y2={nb.y - H / 2} stroke="var(--color-muted-foreground)" strokeWidth={1.2} />
        })}
        {dvNodes.map((n) => {
          const st = kindStyle[n.kind]
          const on = sel === n.id
          return (
            <g key={n.id} onClick={() => setSel(n.id)} style={{ cursor: 'pointer' }}>
              <rect
                x={n.x - W / 2}
                y={n.y - H / 2}
                width={W}
                height={H}
                rx={6}
                fill={st.fill}
                stroke={on ? 'var(--color-primary)' : st.stroke}
                strokeWidth={on ? 2.6 : 1.6}
              />
              <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" fontSize="12.5" fontWeight={600} fontFamily="ui-monospace, monospace" fill="var(--color-foreground)">
                {n.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-3 justify-center text-[11px] text-muted-foreground my-1">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm border" style={{ background: kindStyle.refine.fill, borderColor: kindStyle.refine.stroke }} /> refine</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: kindStyle.possible.fill, border: `1px solid ${kindStyle.possible.stroke}` }} /> dependence possible</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: kindStyle.independent.fill, border: `1px solid ${kindStyle.independent.stroke}` }} /> independent</span>
      </div>
      <Panel>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-sm font-semibold">{node.label}</span>
          {node.kind === 'possible' ? <Bad>dependence possible</Bad> : node.kind === 'independent' ? <Good>independent</Good> : <span className="text-xs text-muted-foreground">needs refinement</span>}
          <span className="text-xs text-muted-foreground font-mono ml-auto">interval {node.interval}</span>
        </div>
        {node.eq && <div className="font-mono text-[12.5px] mb-1">{node.eq}</div>}
        <div className="text-[13px] leading-relaxed">{node.note}</div>
      </Panel>
    </div>
  )
}

const HierarchySection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Searching all direction vectors</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Any test that accepts a direction constraint can be driven over the whole space of direction vectors. With{' '}
          <Code>d</Code> dimensions there are <Code>3ᵈ</Code> of them; organise the search as a tree with one level per
          dimension:
        </p>
        <Step n="1">test a dimension with the wildcard <Code>(∗)</Code> first;</Step>
        <Step n="2">if independent ⇒ <strong>prune the entire branch</strong>;</Step>
        <Step n="3">if a dependence is possible ⇒ refine that dimension into <Code>&lt;, =, &gt;</Code> and recurse independently.</Step>
        <p className="text-xs text-muted-foreground mt-1">
          Because the test is inexact, it can happen that <Code>(∗)</Code> is inconclusive yet all three refinements{' '}
          <Code>&lt;, =, &gt;</Code> are excludable.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — explore the hierarchy</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`for (i = 1; i <= 10; i++)
  for (j = 1; j <= 10; j++) {
    A[i*10 + j]     = ...
    ...             = A[i*10 + j - 1]
  }

10·iᵈ₁ − 10·iᵘ₁ + iᵈ₂ − iᵘ₂ = −1,    0 ≤ all unknowns ≤ 9`}</Pre>
        <p className="text-sm mb-3">
          Click a node to see its added constraint, extreme-value interval, and verdict. Only two leaves survive — the
          outer-loop wrap and the inner-loop neighbour:
        </p>
        <DvTree />
        <p className="text-xs text-muted-foreground mt-2">
          Surviving dependences: <Code>(&lt;,&gt;)</Code> (write <Code>A[i·10+9]</Code>, read it next row as{' '}
          <Code>A[(i+1)·10+0]</Code>) and <Code>(=,&lt;)</Code> (consecutive inner iterations). Everything else is proven
          independent.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Tab 5 · treating multiple equations  (A / B / C)
 * ------------------------------------------------------------------ */

const elimSteps: StepPanel[] = [
  {
    title: '0 · A system of two dependence equations',
    body: (
      <Formula>{`3·i₁ + 2·i₂ − i₃ = 9
2·i₁ − 2·i₂ + 5·i₃ = 7`}</Formula>
    ),
  },
  {
    title: '1 · Use eqn (1) to eliminate i₃',
    body: (
      <>
        <Formula>{`i₃ = 3·i₁ + 2·i₂ − 9              (3.9)

into (2):  2·i₁ − 2·i₂ + 5·(3·i₁+2·i₂−9) = 7
        ⇔  17·i₁ + 8·i₂ = 52            (3.10)`}</Formula>
      </>
    ),
  },
  {
    title: '2 · No ±1 coefficient → substitute again',
    body: (
      <>
        <Formula>{`new variable  j₂ = 2·i₁ + i₂   ⇒  i₂ = j₂ − 2·i₁
into (3.10):  17·i₁ + 8·(j₂ − 2·i₁) = 52
           ⇔  i₁ + 8·j₂ = 52`}</Formula>
        <p className="text-sm">A ±1 coefficient on <Code>i₁</Code> appears.</p>
      </>
    ),
  },
  {
    title: '3 · Parametrize by the free variable j₂',
    body: (
      <>
        <Formula>{`i₁ = 52 − 8·j₂
i₂ = 17·j₂ − 104
i₃ = 10·j₂ − 61`}</Formula>
        <Panel className="text-sm leading-relaxed">
          Both equations are satisfied simultaneously for every integer <Code>j₂</Code>. (For a real loop, one would now
          intersect this line with the loop-limit box to decide whether any in-bounds point exists.)
        </Panel>
      </>
    ),
  },
]

const MultiSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">One equation per array dimension</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          A <Code>d</Code>-dimensional array gives <Code>d</Code> dependence equations. A dependence exists only if{' '}
          <strong>all of them hold simultaneously</strong>. Three strategies handle the system.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Possibility A — solve separately, intersect</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Solve each equation alone (with a single-equation solver), then intersect the solution sets — usually via their
          distance/direction vectors.
        </p>
        <Pre>{`for (i = 1; i <= 10; i++) {
  a[i][i]   = ...
  ...       = a[i][i-1]
}`}</Pre>
        <Table
          head={['Dimension', 'Equation', 'Requires']}
          rows={[
            ['1st', <>iᵈ + 1 = iᵘ + 1 ⇔ iᵈ − iᵘ = 0</>, <>distance 0, direction <Code>(=)</Code></>],
            ['2nd', <>iᵈ + 1 = iᵘ ⇔ iᵈ − iᵘ = −1</>, <>distance 1, direction <Code>(&lt;)</Code></>],
          ]}
        />
        <Panel className="text-sm leading-relaxed mt-1">
          The single index <Code>i</Code> cannot satisfy both <Code>iᵈ − iᵘ = 0</Code> and <Code>iᵈ − iᵘ = −1</Code>:{' '}
          <strong>no common direction vector</strong> ⇒ <Good>no solution ⇒ no dependence</Good>.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Possibility B — combine into one equation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Fold the equations into a single linear combination. Every simultaneous solution of the originals solves the
          combination — but <strong>not</strong> conversely, so the method is <em>inexact</em> (it may report a spurious
          dependence). A common choice linearizes by the memory storage order.
        </p>
        <Pre>{`double a[30][20];
for (i = 1; i <= 10; i++)
  for (j = 1; j <= 10; j++) {
    a[i+j+1][j+1] = ...
    ...           = a[j+i][j+1]
  }`}</Pre>
        <Formula>{`(1)  iᵈ₁ − iᵘ₁ + iᵈ₂ − iᵘ₂ = −1
(2)  iᵈ₂ − iᵘ₂ = 0

row-major:  a[i][j] @ i·20 + j   ⇒   combine  20·(1) + (2):
20·iᵈ₁ − 20·iᵘ₁ + 21·iᵈ₂ − 21·iᵘ₂ = −20`}</Formula>
        <Panel className="text-sm leading-relaxed mt-1">
          <strong>Cleaner alternative:</strong> use one equation to eliminate. (2) forces <Code>iᵈ₂ = iᵘ₂</Code>;
          substituting into (1) gives <Code>iᵈ₁ − iᵘ₁ = −1</Code> ⇒ distance vector <Code>(1, 0)</Code> is possible.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Possibility C — stepwise elimination</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Use one equation to substitute a variable in the others (it becomes dependent); repeat <Code>n−1</Code> times
          for <Code>n</Code> equations, parametrizing by the remaining free variables.
        </p>
        <Stepper steps={elimSteps} showProgress />
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
      Five exam-style problems on §3.4, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="GCD test on a single dependence equation"
      statement={
        <>
          <p className="mb-2">Build the normalized dependence equation, apply the GCD test, and decide.</p>
          <Pre>{`for (i = 1; i <= n; i++)
  a[2*i] = a[2*i + 1] + b[i];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Normalize</strong> (i: 0…n−1, original = i+1): write <Code>a[2·iᵈ + 2]</Code>, read{' '}
            <Code>a[2·iᵘ + 3]</Code>.
          </p>
          <Formula>{`2·iᵈ + 2 = 2·iᵘ + 3   ⇔   2·iᵈ − 2·iᵘ = 1`}</Formula>
          <p className="text-sm mb-1"><strong>GCD test:</strong></p>
          <Formula>{`gcd(2, −2) = 2     2 ∤ 1`}</Formula>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>No integer solution ⇒ no dependence.</Good> Even indices are written and odd indices are read — they can
            never be the same cell. The loop is fully parallelizable.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="GCD test with several coefficients"
      statement={
        <>
          <Pre>{`for (i = 1; i <= n; i++)
  for (j = 1; j <= m; j++)
    a[3*i + j] = a[3*i + j - 1] + c;`}</Pre>
          <p>Form the dependence equation and apply the GCD test. Can a dependence be excluded?</p>
        </>
      }
      solution={
        <>
          <Formula>{`3·iᵈ₁ + iᵈ₂ = 3·iᵘ₁ + iᵘ₂ − 1
⇔  3·iᵈ₁ − 3·iᵘ₁ + iᵈ₂ − iᵘ₂ = −1

gcd(3, −3, 1, −1) = 1     and     1 | −1`}</Formula>
          <Panel className="text-sm leading-relaxed mt-1">
            <Bad>Cannot be excluded.</Bad> With gcd = 1 the test is powerless (1 divides every c). A sharper test
            (extreme value / direction vectors) is needed — here the real dependence is the inner-loop neighbour{' '}
            <Code>(=,&lt;)</Code>.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Extreme value test"
      statement={
        <>
          <Pre>{`for (i = 1; i <= 10; i++)
  a[i] = a[i + 20] + b[i];`}</Pre>
          <p>Use the extreme value test to decide whether a dependence can exist.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">Normalize (i: 0…9): write <Code>a[iᵈ + 1]</Code>, read <Code>a[iᵘ + 21]</Code>.</p>
          <Formula>{`iᵈ + 1 = iᵘ + 21   ⇔   iᵈ − iᵘ = 20`}</Formula>
          <Table
            head={['step', 'lower', 'upper']}
            rows={[
              ['iᵈ − iᵘ', 'iᵈ − iᵘ', 'iᵈ − iᵘ'],
              ['eliminate iᵘ', 'iᵈ − 9', 'iᵈ − 0'],
              ['eliminate iᵈ', '−9', '9'],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            The reachable interval is <Code>[−9, 9]</Code> but the equation needs <Code>c = 20</Code>. Since{' '}
            <Code>20 ∉ [−9, 9]</Code> ⇒ <Good>no dependence</Good>: the offset 20 jumps clean past the 10-iteration range,
            so the loop is parallelizable.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Multiple equations — solve separately and intersect"
      statement={
        <>
          <Pre>{`for (i = 1; i <= 10; i++) {
  a[i+1][i] = ...
  ...       = a[i][i]
}`}</Pre>
          <p>Treat the two array dimensions as separate dependence equations (Possibility A) and decide whether a dependence exists.</p>
        </>
      }
      solution={
        <>
          <Table
            head={['Dim', 'Equation', 'Requires']}
            rows={[
              ['1st', <>iᵈ + 1 = iᵘ ⇔ iᵈ − iᵘ = −1</>, <>distance 1, direction <Code>(&lt;)</Code></>],
              ['2nd', <>iᵈ = iᵘ ⇔ iᵈ − iᵘ = 0</>, <>distance 0, direction <Code>(=)</Code></>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            One single index <Code>i</Code> must satisfy both equations at once, but <Code>iᵈ − iᵘ</Code> cannot equal both
            <Code>−1</Code> and <Code>0</Code>. The solution sets are disjoint — <strong>no common direction vector</strong>{' '}
            ⇒ <Good>no dependence</Good>. The accesses run on the super-diagonal vs. diagonal and never collide.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Stepwise elimination + GCD on the reduced equation"
      statement={
        <>
          <p className="mb-2">Two dependence equations of a 2-D access:</p>
          <Pre>{`(1)  i₁ + 2·i₂ + 3·i₃ = 6
(2)  2·i₁ − i₂ + i₃   = 4`}</Pre>
          <p>Eliminate one variable (Possibility C), then decide solvability of the result. Does a dependence exist?</p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1"><strong>Eliminate i₁</strong> using (1), which has coefficient 1:</p>
          <Formula>{`i₁ = 6 − 2·i₂ − 3·i₃

into (2):  2·(6 − 2·i₂ − 3·i₃) − i₂ + i₃ = 4
        ⇔  12 − 5·i₂ − 5·i₃ = 4
        ⇔  5·i₂ + 5·i₃ = 8`}</Formula>
          <p className="text-sm mb-1"><strong>GCD test on the reduced equation:</strong></p>
          <Formula>{`gcd(5, 5) = 5     5 ∤ 8`}</Formula>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>No integer solution ⇒ no dependence.</Good> Although (1) alone is solvable, the two equations have{' '}
            <strong>no common</strong> integer solution: after eliminating <Code>i₁</Code>, the leftover{' '}
            <Code>5·i₂ + 5·i₃ = 8</Code> fails the GCD test. Combining elimination with the GCD test is what makes the
            multi-equation case decidable here.
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
  { id: 'gcd', label: 'GCD test', render: () => <GcdSection /> },
  { id: 'solutions', label: 'Finding solutions', render: () => <SolutionsSection /> },
  { id: 'extreme', label: 'Extreme value test', render: () => <ExtremeSection /> },
  { id: 'hierarchy', label: 'Direction-vector hierarchy', render: () => <HierarchySection /> },
  { id: 'multi', label: 'Multiple equations', render: () => <MultiSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function DependenceSolverStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 3 · §3.4 · Solving the Data Dependence System"
      title="Solving the Data Dependence System"
      subtitle="The GCD and extreme-value tests for a single Diophantine equation, parametrizing the solution set, the direction-vector hierarchy that searches all 3ᵈ direction vectors, and three ways to handle one equation per array dimension."
      tabs={tabs}
    />
  )
}
