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
  steps: StepPanel[]
}
const extremeCases: ExtremeCase[] = [
  {
    key: '*',
    title: 'arbitrary direction (∗) — no constraint, pure loop limits',
    steps: [
      {
        title: '0 · Read off each coefficient and decide which limit to plug',
        body: (
          <>
            <p className="text-sm mb-1">
              The expression is <Code>E = −m + iᵈ − iᵘ</Code>. Before eliminating anything, list each variable, its
              coefficient sign, and (from the sign rule) which limit it contributes to which bound:
            </p>
            <Table
              head={['variable', 'coefficient', 'range', 'for the lower limit plug…', 'for the upper limit plug…']}
              rows={[
                [<Code>m</Code>, '−1 (negative)', '[1, ∞]', 'its max: ∞', 'its min: 1'],
                [<Code>iᵈ</Code>, '+1 (positive)', '[0, 9]', 'its min: 0', 'its max: 9'],
                [<Code>iᵘ</Code>, '−1 (negative)', '[0, 9]', 'its max: 9', 'its min: 0'],
              ]}
            />
            <p className="text-xs text-muted-foreground mt-1">
              That table already <em>is</em> the whole test — the following steps just substitute one variable at a time
              so you can see the expression shrink.
            </p>
          </>
        ),
      },
      {
        title: '1 · Eliminate iᵘ  (coefficient −1)',
        body: (
          <>
            <p className="text-sm mb-1">
              <Code>iᵘ</Code> appears as <Code>−iᵘ</Code>. To make <Code>E</Code> as <strong>small</strong> as possible,
              subtract the <strong>biggest</strong> <Code>iᵘ</Code> (= 9); to make it as <strong>big</strong> as possible,
              subtract the <strong>smallest</strong> (= 0):
            </p>
            <Formula>{`lower:  −m + iᵈ − 9        (plugged iᵘ = 9)
upper:  −m + iᵈ − 0        (plugged iᵘ = 0)`}</Formula>
          </>
        ),
      },
      {
        title: '2 · Eliminate iᵈ  (coefficient +1)',
        body: (
          <>
            <p className="text-sm mb-1">
              <Code>iᵈ</Code> appears with a <strong>positive</strong> sign, so it's the other way round: small value for
              the lower limit, big value for the upper limit:
            </p>
            <Formula>{`lower:  −m + 0 − 9 = −m − 9    (plugged iᵈ = 0)
upper:  −m + 9 − 0 = −m + 9    (plugged iᵈ = 9)`}</Formula>
          </>
        ),
      },
      {
        title: '3 · Eliminate m  (coefficient −1, range [1, ∞])',
        body: (
          <>
            <p className="text-sm mb-1">
              <Code>m</Code> is negative in <Code>E</Code>, and its range is unbounded above — so the lower limit runs
              away to <Code>−∞</Code>, while the upper limit uses the smallest <Code>m = 1</Code>:
            </p>
            <Formula>{`lower:  −∞ − 9  = −∞          (m → ∞)
upper:  −1 + 9  = 8            (m = 1)

E ∈ [−∞, 8]`}</Formula>
          </>
        ),
      },
      {
        title: '4 · Verdict: is c in the interval?',
        body: (
          <Panel className="text-sm leading-relaxed">
            The equation demands <Code>E = c = 0</Code>, and <Code>0 ∈ [−∞, 8]</Code> — a dependence{' '}
            <Bad>cannot be excluded</Bad>. The interval is too loose because it allowed <em>any</em> relation between{' '}
            <Code>iᵈ</Code> and <Code>iᵘ</Code>. Next: constrain the direction and watch the interval tighten.
          </Panel>
        ),
      },
    ],
  },
  {
    key: '<',
    title: 'direction <  (iᵈ < iᵘ)',
    steps: [
      {
        title: '0 · Turn the direction into an inequality — this is the new bound',
        body: (
          <>
            <p className="text-sm mb-1">
              Over integers, <Code>iᵈ &lt; iᵘ</Code> means <Code>iᵘ ≥ iᵈ + 1</Code> (equivalently{' '}
              <Code>iᵈ ≤ iᵘ − 1</Code>). So <Code>iᵘ</Code> now has <strong>two lower limits</strong>:
            </p>
            <Table
              head={['lower limit of iᵘ', 'source', 'which is tighter?']}
              rows={[
                [<Code>0</Code>, 'loop limit', ''],
                [<Code>iᵈ + 1</Code>, 'direction constraint', <>tighter — since <Code>iᵈ ≥ 0</Code>, we have <Code>iᵈ + 1 ≥ 1 &gt; 0</Code></>],
              ]}
            />
            <p className="text-sm mt-1">
              <strong>Rule:</strong> a variable can pick up extra limits from a direction constraint; always use the{' '}
              <em>tightest</em> one, even if it still contains another variable. Eliminate the constrained variable{' '}
              <em>first</em> — the leftover <Code>iᵈ</Code> terms then cancel.
            </p>
          </>
        ),
      },
      {
        title: '1 · Eliminate iᵘ — the constraint replaces one loop limit',
        body: (
          <>
            <p className="text-sm mb-1">
              For the <strong>upper</strong> limit we need the smallest <Code>iᵘ</Code>, which is now{' '}
              <Code>iᵈ + 1</Code> instead of 0. For the <strong>lower</strong> limit we need the largest <Code>iᵘ</Code> —
              the direction adds no upper bound on <Code>iᵘ</Code>, so the loop limit 9 still applies:
            </p>
            <Formula>{`lower:  −m + iᵈ − 9                       (iᵘ = 9, unchanged)
upper:  −m + iᵈ − (iᵈ + 1) = −m − 1      (iᵘ = iᵈ + 1)`}</Formula>
            <Panel className="text-sm leading-relaxed mt-1">
              Note the payoff: <Code>+iᵈ</Code> and <Code>−iᵈ</Code> <strong>cancel</strong> in the upper limit. This is
              why the constrained variable is eliminated first — the substituted bound carries the other variable with the
              opposite sign.
            </Panel>
          </>
        ),
      },
      {
        title: '2 · Eliminate iᵈ, then m',
        body: (
          <>
            <p className="text-sm mb-1">
              The upper limit no longer contains <Code>iᵈ</Code>. In the lower limit, <Code>iᵈ</Code> is positive → plug
              its minimum 0. Finally <Code>m</Code> as before (max ∞ for lower, min 1 for upper):
            </p>
            <Formula>{`lower:  −m + 0 − 9 = −m − 9   →   −∞         (m → ∞)
upper:  −m − 1            →   −1 − 1 = −2   (m = 1)

E ∈ [−∞, −2]`}</Formula>
          </>
        ),
      },
      {
        title: '3 · Verdict',
        body: (
          <Panel className="text-sm leading-relaxed">
            <Code>c = 0 ∉ [−∞, −2]</Code> ⇒ <Good>no dependence with direction &lt;</Good>. Intuitively: with{' '}
            <Code>iᵈ &lt; iᵘ</Code> the term <Code>iᵈ − iᵘ</Code> is at most −1, and <Code>−m</Code> is at most −1, so{' '}
            <Code>E</Code> can never climb back up to 0.
          </Panel>
        ),
      },
    ],
  },
  {
    key: '=',
    title: 'direction =  (iᵈ = iᵘ)',
    steps: [
      {
        title: '0 · An equality constraint is even better: substitute, don’t bound',
        body: (
          <>
            <p className="text-sm mb-1">
              <Code>=</Code> is the strongest constraint of the three: it doesn't tighten a limit, it removes both
              variables outright. Setting <Code>iᵈ = iᵘ</Code> makes <Code>iᵈ − iᵘ = 0</Code>:
            </p>
            <Formula>{`E = −m + iᵈ − iᵘ  =  −m`}</Formula>
          </>
        ),
      },
      {
        title: '1 · Eliminate the only remaining variable, m',
        body: (
          <Formula>{`lower:  −m  →  −∞     (m → ∞)
upper:  −m  →  −1     (m = 1)

E ∈ [−∞, −1]`}</Formula>
        ),
      },
      {
        title: '2 · Verdict',
        body: (
          <Panel className="text-sm leading-relaxed">
            <Code>c = 0 ∉ [−∞, −1]</Code> ⇒ <Good>no dependence with direction =</Good>. Reading and writing the same
            iteration's element would need <Code>m = 0</Code>, but the guard forces <Code>m ≥ 1</Code>.
          </Panel>
        ),
      },
    ],
  },
  {
    key: '>',
    title: 'direction >  (iᵈ > iᵘ)',
    steps: [
      {
        title: '0 · Turn the direction into an inequality',
        body: (
          <>
            <p className="text-sm mb-1">
              <Code>iᵈ &gt; iᵘ</Code> over integers means <Code>iᵘ ≤ iᵈ − 1</Code>. This time <Code>iᵘ</Code> gets a
              second <strong>upper</strong> limit:
            </p>
            <Table
              head={['upper limit of iᵘ', 'source', 'which is tighter?']}
              rows={[
                [<Code>9</Code>, 'loop limit', ''],
                [<Code>iᵈ − 1</Code>, 'direction constraint', <>tighter — since <Code>iᵈ ≤ 9</Code>, we have <Code>iᵈ − 1 ≤ 8 &lt; 9</Code></>],
              ]}
            />
          </>
        ),
      },
      {
        title: '1 · Eliminate iᵘ',
        body: (
          <>
            <p className="text-sm mb-1">
              <Code>iᵘ</Code> is negative in <Code>E</Code>, so the <strong>lower</strong> limit wants the largest{' '}
              <Code>iᵘ</Code> — now <Code>iᵈ − 1</Code> instead of 9. The <strong>upper</strong> limit wants the smallest{' '}
              <Code>iᵘ</Code>; the constraint adds no lower bound, so the loop limit 0 stays:
            </p>
            <Formula>{`lower:  −m + iᵈ − (iᵈ − 1) = −m + 1     (iᵘ = iᵈ − 1, iᵈ cancels)
upper:  −m + iᵈ − 0                     (iᵘ = 0, unchanged)`}</Formula>
          </>
        ),
      },
      {
        title: '2 · Eliminate iᵈ, then m',
        body: (
          <Formula>{`lower:  −m + 1        →   −∞           (m → ∞)
upper:  −m + 9        →   −1 + 9 = 8    (iᵈ = 9, then m = 1)

E ∈ [−∞, 8]`}</Formula>
        ),
      },
      {
        title: '3 · Verdict',
        body: (
          <Panel className="text-sm leading-relaxed">
            <Code>c = 0 ∈ [−∞, 8]</Code> ⇒ a dependence is <Bad>possible</Bad> — e.g. <Code>m = 1, iᵈ = 1, iᵘ = 0</Code>{' '}
            gives exactly 0. Since <Code>iᵈ &gt; iᵘ</Code> the read (use) happens <em>before</em> the write (def): an{' '}
            <strong>anti-dependence</strong>.
          </Panel>
        ),
      },
    ],
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
      <div className="text-sm font-medium mb-2">{cse.title}</div>
      <Stepper key={cse.key} steps={cse.steps} showProgress />
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
          A complementary, range-based filter. The idea: the left-hand side <Code>Σ aₖ·iₖ</Code> of the dependence
          equation can only take values in some interval, because each <Code>iₖ</Code> is boxed in by its loop limits. If
          the required constant <Code>c</Code> falls <em>outside</em> that interval, the equation has no solution at all:
        </p>
        <Formula>{`compute the interval  [ min Σ aₖ·iₖ ,  max Σ aₖ·iₖ ]  over the loop limits.
a dependence can only exist if  c  lies inside that interval.`}</Formula>
        <p className="text-sm mb-2">
          The min and max are easy because every term is independent — you just have to plug in the right end of each
          variable's range, and which end is "right" depends only on the <strong>sign of its coefficient</strong>:
        </p>
        <Table
          head={['coefficient aₖ', 'for the upper limit (maximize)', 'for the lower limit (minimize)']}
          rows={[
            [<><Code>aₖ &gt; 0</Code> — the term grows with iₖ</>, <>plug the <strong>upper</strong> loop limit</>, <>plug the <strong>lower</strong> loop limit</>],
            [<><Code>aₖ &lt; 0</Code> — the term shrinks as iₖ grows</>, <>plug the <strong>lower</strong> loop limit</>, <>plug the <strong>upper</strong> loop limit</>],
          ]}
        />
        <p className="text-sm mt-2">
          In practice you eliminate one variable per step: replace it by the chosen limit in the running lower- and
          upper-limit expressions, simplify, and move to the next variable until only numbers remain.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">How a direction constraint changes the bounds</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A direction vector entry for loop <Code>k</Code> is just an extra inequality between <Code>iᵈₖ</Code> and{' '}
          <Code>iᵘₖ</Code>, and inequalities are extra limits (over integers, "&lt;" gains a "±1"):
        </p>
        <Table
          head={['direction', 'as inequality', 'what it adds']}
          rows={[
            [<Code>&lt;</Code>, <Code>iᵘ ≥ iᵈ + 1</Code>, <>a new <strong>lower</strong> limit for iᵘ (or upper limit <Code>iᵈ ≤ iᵘ − 1</Code> for iᵈ)</>],
            [<Code>=</Code>, <Code>iᵈ = iᵘ</Code>, <>no limits at all — <strong>substitute</strong> and both variables drop out</>],
            [<Code>&gt;</Code>, <Code>iᵘ ≤ iᵈ − 1</Code>, <>a new <strong>upper</strong> limit for iᵘ (or lower limit <Code>iᵈ ≥ iᵘ + 1</Code> for iᵈ)</>],
          ]}
        />
        <div className="mt-2 space-y-2">
          <Step n="1">
            The constrained variable now has <strong>two candidate limits</strong> on one side: the loop limit and the
            constraint limit. Take the <strong>tighter</strong> one — that is the whole "modification".
          </Step>
          <Step n="2">
            The constraint limit contains the <em>other</em> variable (e.g. <Code>iᵈ + 1</Code>). That's fine: eliminate
            the constrained variable <strong>first</strong>. Because iᵈ and iᵘ usually enter with opposite coefficients,
            the substitution makes them <strong>cancel</strong>, and the interval tightens.
          </Step>
          <Step n="3">
            The other side of the range is untouched: <Code>&lt;</Code> pushes up only the lower limit of iᵘ,{' '}
            <Code>&gt;</Code> pulls down only its upper limit.
          </Step>
        </div>
        <Panel className="text-sm leading-relaxed mt-2">
          <strong>Shortcut for the common case:</strong> when the pair enters as <Code>a·iᵈ − a·iᵘ</Code>, only the{' '}
          <em>difference</em> <Code>Δ = iᵈ − iᵘ</Code> matters. With loop range <Code>[L, U]</Code>, the base range is{' '}
          <Code>Δ ∈ [L−U, U−L]</Code>, and the direction simply clips it: <Code>&lt;</Code> → <Code>[L−U, −1]</Code>,{' '}
          <Code>=</Code> → <Code>{'{0}'}</Code>, <Code>&gt;</Code> → <Code>[1, U−L]</Code>. This is exactly what the
          cancellation in the long procedure computes.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — and refining by direction</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`if (m > 0)
  for (i = 1; i <= 10; i++)
    a[i] = a[i+m] + b[i];`}</Pre>
        <p className="text-sm mb-2">
          <strong>Setting it up first.</strong> Normalize the loop to <Code>i = 0…9</Code>: the write becomes{' '}
          <Code>a[iᵈ + 1]</Code>, the read <Code>a[iᵘ + m + 1]</Code>. Same cell means{' '}
          <Code>iᵈ + 1 = iᵘ + m + 1</Code>, i.e. <Code>−m + iᵈ − iᵘ = 0</Code>. The limits come straight from the code:
          the loop gives <Code>0 ≤ iᵈ, iᵘ ≤ 9</Code>, and the <Code>if (m &gt; 0)</Code> guard gives{' '}
          <Code>1 ≤ m ≤ ∞</Code> — an unknown like <Code>m</Code> with no known upper bound simply gets <Code>∞</Code> as
          its upper limit.
        </p>
        <Formula>{`dependence equation:  −m + iᵈ − iᵘ = 0      (c = 0)
limits:  1 ≤ m ≤ ∞,   0 ≤ iᵈ ≤ 9,   0 ≤ iᵘ ≤ 9`}</Formula>
        <p className="text-sm mb-3">
          The arbitrary-direction case can't decide, but each direction constraint tightens the interval. Toggle the four
          cases and step through — every step says <em>which</em> limit is plugged in and <em>why</em>:
        </p>
        <ExtremeExplorer />
        <Panel className="text-sm leading-relaxed mt-2">
          <strong>Putting the four cases together:</strong> (∗) is inconclusive; <Code>&lt;</Code> and <Code>=</Code> both
          exclude a dependence, so there is <strong>no flow dependence</strong> (no iteration writes a cell a later
          iteration reads); only <Code>&gt;</Code> survives ⇒ an <strong>anti-dependence</strong> is possible (a later
          iteration overwrites what an earlier one read — real, since <Code>a[i]</Code> reads ahead by <Code>m</Code>).
          Note this test only uses loop limits — it does <em>not</em> check for an integer solution, so it pairs naturally
          with the GCD test.
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
  deriv: string
  note: React.ReactNode
}
const dvNodes: DvNode[] = [
  { id: 's', label: '(∗,∗)', x: 320, y: 34, kind: 'refine', interval: '[−99, 99]', eq: '10·iᵈ₁ − 10·iᵘ₁ + iᵈ₂ − iᵘ₂ = −1',
    deriv: 'Δ₁ ∈ [−9, 9] (∗)   Δ₂ ∈ [−9, 9] (∗)\n10·Δ₁ + Δ₂ ∈ [10·(−9) + (−9), 10·9 + 9] = [−99, 99]',
    note: 'No constraints yet: both differences take their full loop range. GCD test allows it and −1 ∈ [−99, 99] ⇒ refine the first dimension into <, =, >.' },
  { id: '<', label: '(<,∗)', x: 150, y: 150, kind: 'refine', interval: '[−99, −1]',
    deriv: 'Δ₁ ∈ [−9, −1] (<)   Δ₂ ∈ [−9, 9] (∗)\n10·Δ₁ + Δ₂ ∈ [10·(−9) + (−9), 10·(−1) + 9] = [−99, −1]',
    note: '< clips Δ₁ from [−9, 9] to [−9, −1] (its upper end drops to −1); Δ₂ still free. −1 ∈ [−99, −1] — barely, at the very edge — ⇒ refine the second dimension.' },
  { id: '=', label: '(=,∗)', x: 360, y: 150, kind: 'refine', interval: '[−9, 9]', eq: 'iᵈ₂ − iᵘ₂ = −1',
    deriv: 'Δ₁ = 0 (=)   Δ₂ ∈ [−9, 9] (∗)\n10·0 + Δ₂ ∈ [−9, 9]',
    note: '= pins Δ₁ to 0, so the 10·Δ₁ term vanishes and the equation collapses to iᵈ₂ − iᵘ₂ = −1. −1 ∈ [−9, 9] ⇒ refine.' },
  { id: '>', label: '(>,∗)', x: 560, y: 150, kind: 'independent', interval: '[1, 99]',
    deriv: 'Δ₁ ∈ [1, 9] (>)   Δ₂ ∈ [−9, 9] (∗)\n10·Δ₁ + Δ₂ ∈ [10·1 + (−9), 10·9 + 9] = [1, 99]',
    note: '> clips Δ₁ to [1, 9], so 10·Δ₁ ≥ 10 — even the most negative Δ₂ (−9) can only pull the sum down to 1. −1 ∉ [1, 99] ⇒ the whole branch is pruned: no need to test (>,<), (>,=), (>,>).' },
  { id: '<<', label: '(<,<)', x: 60, y: 280, kind: 'independent', interval: '[−99, −11]',
    deriv: 'Δ₁ ∈ [−9, −1]   Δ₂ ∈ [−9, −1]\n10·Δ₁ + Δ₂ ∈ [−90 − 9, −10 − 1] = [−99, −11]',
    note: 'Both differences are now ≤ −1, so the sum is at best 10·(−1) + (−1) = −11. −1 ∉ [−99, −11] ⇒ independent.' },
  { id: '<=', label: '(<,=)', x: 150, y: 280, kind: 'independent', interval: '[−90, −10]', eq: '10·iᵈ₁ − 10·iᵘ₁ = −1',
    deriv: 'Δ₁ ∈ [−9, −1]   Δ₂ = 0\n10·Δ₁ ∈ [−90, −10]',
    note: 'Δ₂ = 0 leaves only multiples of 10. Two independent proofs: gcd 10 ∤ −1, and −1 ∉ [−90, −10] ⇒ independent.' },
  { id: '<>', label: '(<,>)', x: 240, y: 280, kind: 'possible', interval: '[−89, −1]',
    deriv: 'Δ₁ ∈ [−9, −1]   Δ₂ ∈ [1, 9]\n10·Δ₁ + Δ₂ ∈ [−90 + 1, −10 + 9] = [−89, −1]',
    note: '−1 ∈ [−89, −1]: reached with Δ₁ = −1, Δ₂ = 9 — write A[i·10+9], read it back next row as A[(i+1)·10+0]. Dependence possible, carried by the outer loop (the row wrap-around).' },
  { id: '=<', label: '(=,<)', x: 300, y: 280, kind: 'possible', interval: '[−9, −1]',
    deriv: 'Δ₁ = 0   Δ₂ ∈ [−9, −1]\nΔ₂ ∈ [−9, −1]',
    note: '−1 ∈ [−9, −1]: reached with Δ₂ = −1 — consecutive j in the same row. Dependence possible, carried by the inner loop.' },
  { id: '==', label: '(=,=)', x: 372, y: 280, kind: 'independent', interval: '{0}', eq: '0 = −1',
    deriv: 'Δ₁ = 0   Δ₂ = 0\n10·0 + 0 = 0 ≠ −1',
    note: 'Both differences pinned to 0: the left side can only be 0, but the equation needs −1 ⇒ no solution, independent.' },
  { id: '=>', label: '(=,>)', x: 444, y: 280, kind: 'independent', interval: '[1, 9]',
    deriv: 'Δ₁ = 0   Δ₂ ∈ [1, 9]\nΔ₂ ∈ [1, 9]',
    note: 'Δ₂ ≥ 1 makes the sum positive, but we need −1 ∉ [1, 9] ⇒ independent.' },
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
        <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap bg-muted/60 rounded-md px-2.5 py-1.5 mb-1.5">{node.deriv}</pre>
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
        <Step n="1">start at the root <Code>(∗,∗,…)</Code>: every dimension unconstrained;</Step>
        <Step n="2">run the extreme value test with the node's constraints; if <Code>c</Code> falls outside the interval ⇒ independent ⇒ <strong>prune the entire subtree</strong> (a child only <em>adds</em> constraints, so its interval can only shrink — it can never re-admit <Code>c</Code>);</Step>
        <Step n="3">if <Code>c</Code> is still inside ⇒ refine: pick the leftmost <Code>∗</Code>, replace it by <Code>&lt;</Code>, <Code>=</Code>, <Code>&gt;</Code> in turn, and recurse into each child;</Step>
        <Step n="4">a node with no <Code>∗</Code> left and <Code>c</Code> still inside its interval is a <strong>surviving direction vector</strong> — a possible dependence with exactly that direction.</Step>
        <p className="text-xs text-muted-foreground mt-1">
          Because the test is inexact, it can happen that <Code>(∗)</Code> is inconclusive yet all three refinements{' '}
          <Code>&lt;, =, &gt;</Code> are excludable — that's why refining is worthwhile even when the parent says "maybe".
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">How each node's interval is computed</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          In the example below the equation is <Code>10·iᵈ₁ − 10·iᵘ₁ + iᵈ₂ − iᵘ₂ = −1</Code>. Each index pair enters with
          equal-and-opposite coefficients, so only the <strong>differences</strong> matter — write the equation with{' '}
          <Code>Δₖ = iᵈₖ − iᵘₖ</Code>:
        </p>
        <Formula>{`10·Δ₁ + Δ₂ = −1        with  Δₖ = iᵈₖ − iᵘₖ

loop limits 0 ≤ iᵈₖ, iᵘₖ ≤ 9  ⇒  base range  Δₖ ∈ [0 − 9, 9 − 0] = [−9, 9]`}</Formula>
        <p className="text-sm mb-2">
          A direction symbol for dimension <Code>k</Code> is a constraint on <Code>Δₖ</Code> alone, and just{' '}
          <strong>clips its range</strong>:
        </p>
        <Table
          head={['symbol', 'constraint on Δₖ', 'clipped range']}
          rows={[
            [<Code>∗</Code>, 'none', <Code>[−9, 9]</Code>],
            [<Code>&lt;</Code>, <><Code>iᵈ &lt; iᵘ</Code> ⇒ <Code>Δₖ ≤ −1</Code></>, <Code>[−9, −1]</Code>],
            [<Code>=</Code>, <Code>Δₖ = 0</Code>, <Code>{'{0}'}</Code>],
            [<Code>&gt;</Code>, <><Code>iᵈ &gt; iᵘ</Code> ⇒ <Code>Δₖ ≥ 1</Code></>, <Code>[1, 9]</Code>],
          ]}
        />
        <p className="text-sm mt-2">
          Then the node's interval is plain interval arithmetic — coefficient 10 is positive, so lower goes with lower,
          upper with upper:
        </p>
        <Formula>{`10·Δ₁ + Δ₂  ∈  [ 10·min(Δ₁) + min(Δ₂),  10·max(Δ₁) + max(Δ₂) ]`}</Formula>
        <p className="text-sm">
          Verdict: if <Code>−1</Code> is outside ⇒ independent, prune. If inside and a <Code>∗</Code> remains ⇒ refine. If
          inside at a leaf ⇒ dependence possible. Every node in the tree below shows this two-line computation.
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

10·iᵈ₁ − 10·iᵘ₁ + iᵈ₂ − iᵘ₂ = −1,    0 ≤ all unknowns ≤ 9
⇔  10·Δ₁ + Δ₂ = −1,                  Δ₁, Δ₂ ∈ [−9, 9]`}</Pre>
        <p className="text-sm mb-3">
          Click a node: it shows the clipped Δ-ranges its direction symbols impose, the interval they produce, and the
          verdict. Only two leaves survive — the outer-loop wrap and the inner-loop neighbour:
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

const possASteps: StepPanel[] = [
  {
    title: '0 · One equation per dimension — derive both from the code',
    body: (
      <>
        <Pre>{`for (i = 1; i <= 10; i++) {
  a[i][i]   = ...
  ...       = a[i][i-1]
}`}</Pre>
        <p className="text-sm mb-1">
          Normalize <Code>i = 0…9</Code> (original index = i + 1). The write touches <Code>a[iᵈ+1][iᵈ+1]</Code>, the read{' '}
          <Code>a[iᵘ+1][iᵘ]</Code>. The <em>same</em> cell means <strong>every dimension</strong> matches — each dimension
          contributes its own equation over the <em>same</em> unknowns iᵈ, iᵘ:
        </p>
        <Formula>{`dim 1 (rows):     iᵈ + 1 = iᵘ + 1   ⇔   iᵈ − iᵘ = 0
dim 2 (columns):  iᵈ + 1 = iᵘ       ⇔   iᵈ − iᵘ = −1`}</Formula>
      </>
    ),
  },
  {
    title: '1 · Solve each equation alone with a single-equation test',
    body: (
      <>
        <p className="text-sm mb-1">
          Run the machinery from the earlier tabs on each equation separately, and record what each one <em>demands</em>{' '}
          as a distance / direction:
        </p>
        <Table
          head={['Equation', 'Solvable alone?', 'Demands']}
          rows={[
            [<Code>iᵈ − iᵘ = 0</Code>, 'yes (any iᵈ = iᵘ)', <>distance 0 ⇒ direction <Code>(=)</Code></>],
            [<Code>iᵈ − iᵘ = −1</Code>, 'yes (any iᵈ = iᵘ − 1)', <>distance 1 ⇒ direction <Code>(&lt;)</Code></>],
          ]}
        />
        <p className="text-sm mt-1">
          Each equation on its own is harmless — plenty of solutions. The question is whether they have a{' '}
          <strong>common</strong> one.
        </p>
      </>
    ),
  },
  {
    title: '2 · Intersect the solution sets',
    body: (
      <>
        <p className="text-sm mb-1">
          Both equations constrain the <em>same</em> pair <Code>(iᵈ, iᵘ)</Code>, so a dependence needs one pair satisfying
          both at once. Compare their demands on the single quantity <Code>iᵈ − iᵘ</Code>:
        </p>
        <Formula>{`dim 1 demands   iᵈ − iᵘ = 0        (direction =)
dim 2 demands   iᵈ − iᵘ = −1       (direction <)

0 ≠ −1  ⇒  intersection is empty`}</Formula>
        <Panel className="text-sm leading-relaxed">
          <strong>No common direction vector ⇒ no dependence</strong> <Good>— exact result, cheaply.</Good> Geometrically:
          the writes walk the diagonal <Code>a[i][i]</Code>, the reads the sub-diagonal <Code>a[i][i−1]</Code> — the two
          never touch the same cell. Intersecting via distance/direction vectors is the practical way to intersect,
          because they summarize each equation's solution set in comparable form.
        </Panel>
      </>
    ),
  },
]

const possBSteps: StepPanel[] = [
  {
    title: '0 · The code and its two dependence equations',
    body: (
      <>
        <Pre>{`double a[30][20];
for (i = 1; i <= 10; i++)
  for (j = 1; j <= 10; j++) {
    a[i+j+1][j+1] = ...
    ...           = a[j+i][j+1]
  }`}</Pre>
        <p className="text-sm mb-1">
          Dimension by dimension (write index = read index), with <Code>Δₖ = iᵈₖ − iᵘₖ</Code>:
        </p>
        <Formula>{`dim 1:  iᵈ₁ + iᵈ₂ + 1 = iᵘ₁ + iᵘ₂    ⇔  Δ₁ + Δ₂ = −1     (1)
dim 2:  iᵈ₂ + 1 = iᵘ₂ + 1            ⇔  Δ₂ = 0           (2)`}</Formula>
      </>
    ),
  },
  {
    title: '1 · The idea: fold the system into one equation',
    body: (
      <>
        <p className="text-sm mb-1">
          Our solvers handle <em>one</em> equation. So build a single linear combination{' '}
          <Code>λ₁·(1) + λ₂·(2)</Code>. The logic only runs one way:
        </p>
        <Formula>{`(iᵈ, iᵘ) solves (1) AND (2)   ⇒   it solves  λ₁·(1) + λ₂·(2)
but NOT conversely`}</Formula>
        <p className="text-sm">
          So if the <em>combined</em> equation has no solution, the system has none either (<Good>safe "no
          dependence"</Good>). But the combined equation may have extra solutions that solve neither original — then we
          report a <Bad>spurious dependence</Bad>. The method is <strong>conservative but inexact</strong>.
        </p>
      </>
    ),
  },
  {
    title: '2 · Choosing the weights: linearize by storage order',
    body: (
      <>
        <p className="text-sm mb-1">
          Which λ's? A natural choice comes from how the array sits in memory. With <Code>double a[30][20]</Code> in
          row-major order, element <Code>a[x][y]</Code> lives at offset <Code>x·20 + y</Code> — so "same cell" in memory
          means the <em>flattened</em> indices agree, which is precisely <Code>20·(dim 1 equation) + (dim 2
          equation)</Code>:
        </p>
        <Formula>{`20·(1) + (2):    20·Δ₁ + 20·Δ₂ + Δ₂ = 20·(−1) + 0
            ⇔    20·Δ₁ + 21·Δ₂ = −20`}</Formula>
        <p className="text-sm">
          i.e. treat the 2-D array as the 1-D array it really is, and set up the single dependence equation on addresses.
        </p>
      </>
    ),
  },
  {
    title: '3 · Why this is inexact — a concrete spurious solution',
    body: (
      <>
        <p className="text-sm mb-1">
          The combined equation lets one dimension "pay for" another. For example:
        </p>
        <Formula>{`Δ₁ = −22, Δ₂ = 20:   20·(−22) + 21·20 = −440 + 420 = −20  ✓ combined
but  Δ₂ = 20 ≠ 0  ✗ violates (2)`}</Formula>
        <p className="text-sm">
          A column difference of 20 wraps exactly one row, so the flat addresses collide even though the 2-D indices
          differ. Here the loop limits keep <Code>Δ₂ ∈ [−9, 9]</Code>, so no spurious solution is in range — but with
          bigger loops or unknown limits the combined equation would admit them, and the test would answer "maybe" where
          the system says "no".
        </p>
      </>
    ),
  },
  {
    title: '4 · Cleaner alternative: let one equation eliminate',
    body: (
      <>
        <p className="text-sm mb-1">
          When one equation is as simple as (2), don't combine — <strong>substitute</strong>. (2) forces{' '}
          <Code>Δ₂ = 0</Code>; put that into (1):
        </p>
        <Formula>{`Δ₁ + 0 = −1   ⇒   Δ₁ = −1   (and Δ₂ = 0)`}</Formula>
        <Panel className="text-sm leading-relaxed">
          Distance vector <Code>(1, 0)</Code>, direction <Code>(&lt;, =)</Code>: iteration <Code>(i, j)</Code> writes
          the cell that iteration <Code>(i+1, j)</Code> reads — a dependence carried by the <strong>outer</strong> loop,
          derived exactly. This substitution idea, done systematically, is Possibility C.
        </Panel>
      </>
    ),
  },
]

const elimSteps: StepPanel[] = [
  {
    title: '0 · A system of two dependence equations — the plan',
    body: (
      <>
        <Formula>{`(1)  3·i₁ + 2·i₂ − i₃  = 9
(2)  2·i₁ − 2·i₂ + 5·i₃ = 7`}</Formula>
        <p className="text-sm">
          <strong>Plan:</strong> use one equation to express one variable through the others and substitute it into the
          remaining equations. Each round removes one equation and one variable, so after <Code>n − 1</Code> rounds a
          system of <Code>n</Code> equations is down to a single equation — which the single-equation machinery (GCD test,
          parametrization) already handles.
        </p>
      </>
    ),
  },
  {
    title: '1 · Use (1) to eliminate i₃ — pick a ±1 coefficient',
    body: (
      <>
        <p className="text-sm mb-1">
          Which variable to eliminate? One whose coefficient is <strong>±1</strong>, so solving for it stays integer:
          in (1), <Code>i₃</Code> has coefficient −1. Solve (1) for it:
        </p>
        <Formula>{`i₃ = 3·i₁ + 2·i₂ − 9              (3.9)

into (2):  2·i₁ − 2·i₂ + 5·(3·i₁ + 2·i₂ − 9) = 7
        ⇔  2·i₁ − 2·i₂ + 15·i₁ + 10·i₂ − 45 = 7
        ⇔  17·i₁ + 8·i₂ = 52            (3.10)`}</Formula>
        <p className="text-sm">
          Equation (1) is now satisfied <em>by construction</em> — whatever <Code>i₁, i₂</Code> end up being, (3.9)
          manufactures the matching <Code>i₃</Code>. Only (3.10) is left to solve.
        </p>
      </>
    ),
  },
  {
    title: '2 · (3.10) has no ±1 coefficient → variable substitution (tab 2 recipe)',
    body: (
      <>
        <p className="text-sm mb-1">
          Neither 17 nor 8 is ±1, so apply the recipe from the "Finding solutions" tab: substitute the
          smallest-magnitude coefficient (<Code>aₗ = 8</Code> on <Code>i₂</Code>) with a new variable{' '}
          <Code>jₗ = Σ (aₖ div aₗ)·iₖ</Code>:
        </p>
        <Formula>{`j₂ = (17 div 8)·i₁ + (8 div 8)·i₂ = 2·i₁ + i₂   ⇒   i₂ = j₂ − 2·i₁

into (3.10):  17·i₁ + 8·(j₂ − 2·i₁) = 52
           ⇔  17·i₁ − 16·i₁ + 8·j₂ = 52
           ⇔  i₁ + 8·j₂ = 52`}</Formula>
        <p className="text-sm">
          The coefficient of <Code>i₁</Code> dropped from 17 to <strong>1</strong> — now the ±1 case applies and we can
          parametrize.
        </p>
      </>
    ),
  },
  {
    title: '3 · Parametrize everything by the free variable j₂',
    body: (
      <>
        <p className="text-sm mb-1">
          Solve for <Code>i₁</Code>, then unwind the two substitutions (<Code>i₂ = j₂ − 2·i₁</Code>, then (3.9)):
        </p>
        <Formula>{`i₁ = 52 − 8·j₂
i₂ = j₂ − 2·(52 − 8·j₂)          = 17·j₂ − 104
i₃ = 3·(52 − 8·j₂) + 2·(17·j₂ − 104) − 9 = 10·j₂ − 61`}</Formula>
        <p className="text-sm mb-1">
          <strong>Sanity check</strong> with <Code>j₂ = 7</Code>: <Code>(i₁, i₂, i₃) = (−4, 15, 9)</Code>:
        </p>
        <Formula>{`(1):  3·(−4) + 2·15 − 9   = −12 + 30 − 9 = 9  ✓
(2):  2·(−4) − 2·15 + 5·9 = −8 − 30 + 45 = 7  ✓`}</Formula>
        <p className="text-sm">
          Every integer <Code>j₂</Code> gives a simultaneous solution of both equations — the full solution set is a line
          through ℤ³, parametrized by <Code>j₂</Code>.
        </p>
      </>
    ),
  },
  {
    title: '4 · Last step of a real test: intersect with the loop limits',
    body: (
      <>
        <p className="text-sm mb-1">
          A dependence needs an <em>in-bounds</em> solution. Suppose the loops gave <Code>0 ≤ i₁, i₂, i₃ ≤ 9</Code>.
          Each formula becomes a constraint on <Code>j₂</Code>:
        </p>
        <Formula>{`0 ≤ 52 − 8·j₂  ≤ 9   ⇒   5.375 ≤ j₂ ≤ 6.5   ⇒   j₂ = 6  (only integer)

check j₂ = 6:   i₁ = 4 ✓     i₂ = 17·6 − 104 = −2 ✗  (out of range)`}</Formula>
        <Panel className="text-sm leading-relaxed">
          The only candidate fails the <Code>i₂</Code> range ⇒ <Good>no in-bounds solution ⇒ no dependence</Good> for
          these limits. This is the complete pipeline: <strong>eliminate</strong> equations one by one →{' '}
          <strong>parametrize</strong> the joint solution set → <strong>intersect</strong> with the loop-limit box.
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
        <p className="text-sm mb-2">
          So far every test handled <em>one</em> equation. But a <Code>d</Code>-dimensional array access produces{' '}
          <Code>d</Code> equations — one per dimension, all over the <strong>same</strong> unknowns{' '}
          <Code>iᵈ, iᵘ</Code> — and two accesses touch the same element only if <strong>all of them hold
          simultaneously</strong>.
        </p>
        <p className="text-sm mb-2">
          That "simultaneously" is the whole difficulty: each equation alone may be easily solvable, yet the{' '}
          <em>system</em> may have no common solution (⇒ no dependence). Three strategies:
        </p>
        <Table
          head={['Strategy', 'Idea', 'Exactness']}
          rows={[
            [<strong>A</strong>, 'solve each equation alone, intersect the solution sets', 'exact if the intersection is done exactly'],
            [<strong>B</strong>, 'fold all equations into one linear combination, solve that', <>inexact — may report a <em>spurious</em> dependence</>],
            [<strong>C</strong>, 'use one equation to eliminate a variable in the rest; repeat', 'exact — ends in one equation, fully parametrized'],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Possibility A — solve separately, intersect</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Solve each equation with a single-equation solver, summarize each solution set as distance/direction vectors,
          then check whether any vector is common to all dimensions. Walk the example:
        </p>
        <Stepper steps={possASteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Possibility B — combine into one equation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Fold the system into a single equation via a linear combination — typically the one the memory layout dictates.
          Cheap, safe, but one-directional: it can prove independence, never a dependence. Walk the example:
        </p>
        <Stepper steps={possBSteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Possibility C — stepwise elimination</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Use one equation to substitute a variable in the others (that variable becomes dependent); repeat{' '}
          <Code>n−1</Code> times for <Code>n</Code> equations until a single equation remains, then parametrize it and
          check the loop limits. Walk the full pipeline:
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
