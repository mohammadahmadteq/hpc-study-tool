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
 *  Chapter 3 · §3.3 — Data Dependence Analysis for Arrays  (PDF 151–158)
 *  Builds the dependence system A·i = c and limit inequalities B·i ≤ c,
 *  solving conditions (integer + in-bounds), and the three complications.
 * ------------------------------------------------------------------ */

/* ---- unknown of the dependence system: iˡ for def (d) / use (u) --- */

const IV: React.FC<{ s: 'd' | 'u'; k?: 1 | 2 }> = ({ s, k }) => (
  <span className="font-mono whitespace-nowrap">
    i<sup>{s}</sup>
    {k ? <sub>{k}</sub> : null}
  </span>
)

/* ---- bracketed matrix / column vector --------------------------- *
 *  A span carrying left/right + top/bottom strokes fakes the [ … ]   *
 *  brackets; works for matrices and (single-column) vectors alike.   */

const Bracketed: React.FC<{ rows: React.ReactNode[][]; className?: string }> = ({ rows, className }) => {
  const cols = rows[0]?.length ?? 0
  const fg = 'var(--color-foreground)'
  return (
    <span className={cn('inline-flex items-stretch align-middle my-1', className)}>
      <span className="w-[6px] shrink-0 rounded-l-[3px]" style={{ borderLeft: `2px solid ${fg}`, borderTop: `2px solid ${fg}`, borderBottom: `2px solid ${fg}` }} />
      <span
        className="grid gap-x-3 gap-y-1 px-2 py-1 text-[12.5px] font-mono leading-tight"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(16px, max-content))` }}
      >
        {rows.flat().map((c, i) => (
          <span key={i} className="text-center tabular-nums">
            {c}
          </span>
        ))}
      </span>
      <span className="w-[6px] shrink-0 rounded-r-[3px]" style={{ borderRight: `2px solid ${fg}`, borderTop: `2px solid ${fg}`, borderBottom: `2px solid ${fg}` }} />
    </span>
  )
}

const Row: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex items-center gap-2 flex-wrap my-2', className)}>{children}</div>
)

/* column vector of the four unknowns, in the fixed order i1ᵈ, i1ᵘ, i2ᵈ, i2ᵘ */
const X4: React.ReactNode[][] = [[<IV s="d" k={1} />], [<IV s="u" k={1} />], [<IV s="d" k={2} />], [<IV s="u" k={2} />]]
const X2: React.ReactNode[][] = [[<IV s="d" />], [<IV s="u" />]]

/* ------------------------------------------------------------------ *
 *  Tab 1 · why arrays need more than data-flow analysis
 * ------------------------------------------------------------------ */

const subscripts = [
  { e: 'a[i]', lin: true, why: 'linear in the induction variable i — analysable' },
  { e: 'a[i-1][j]', lin: true, why: 'each dimension is linear in i, j — analysable' },
  { e: 'a[2*i + 3]', lin: true, why: 'affine (coefficient 2, constant 3) — still linear, analysable' },
  { e: 'a[i*j]', lin: false, why: 'product of two induction variables — nonlinear; this dimension is ignored' },
  { e: 'a[b[i]]', lin: false, why: 'indirect / index array — nonlinear in i; this dimension is ignored' },
  { e: 'a[i*i]', lin: false, why: 'quadratic in i — nonlinear; this dimension is ignored' },
]

const LinearityDemo: React.FC = () => {
  const [sel, setSel] = useState(0)
  const s = subscripts[sel]
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {subscripts.map((x, i) => (
          <button
            key={x.e}
            onClick={() => setSel(i)}
            className={cn(
              'text-[12px] font-mono px-2.5 py-1.5 rounded-lg border transition-colors',
              sel === i ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {x.e}
          </button>
        ))}
      </div>
      <Panel>
        <div className="flex items-center gap-2 mb-1 text-[13px]">
          <span className="font-mono">{s.e}</span>
          {s.lin ? <Good>linear → analyse</Good> : <Bad>nonlinear → ignore this dimension</Bad>}
        </div>
        <div className="text-[13px] leading-relaxed">{s.why}</div>
      </Panel>
    </div>
  )
}

const IntroSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Scalars vs arrays</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['', 'How a dependence is found']}
          rows={[
            [<strong>scalar variable</strong>, 'data-flow analysis (reaching definitions, etc.) — §2.2'],
            [<strong>array</strong>, <>examine the <strong>subscript expressions</strong> to decide dependences between <em>single elements</em>, not whole arrays</>],
          ]}
        />
        <p className="text-sm mt-2">
          Treating an array as one scalar is far too pessimistic: <Code>a[i]</Code> and <Code>a[i+1]</Code> never collide,
          yet a whole-array view would force them to be ordered. Array analysis works element-by-element through the
          index functions.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Only linear subscripts are analysed</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The method concentrates on subscripts that depend <strong>linearly</strong> on the induction variables. A{' '}
          <strong>nonlinear</strong> subscript in some dimension makes that dimension <strong>ignored</strong> (treated as
          "could be anything" — conservatively dependent). Click each subscript:
        </p>
        <LinearityDemo />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The goal: exclude dependences → parallelize</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The point of the analysis is usually <strong>negative</strong>: to <strong>prove no dependence exists</strong>{' '}
          between two instructions, so a compiler may run or vectorize them in parallel. If it cannot prove independence,
          it must conservatively assume a dependence.
        </p>
        <p className="text-sm mb-1 font-medium">Two-step technique for a pair of array references:</p>
        <Step n="a">
          <strong>Build a data dependence system</strong> — the unknowns are the induction variables used.
        </Step>
        <Step n="b">
          <strong>Solve</strong> the system ⇝ it is a set of <strong>diophantine (integer) equations</strong> with range
          constraints.
        </Step>
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Tab 2 · building A·i = c  (first worked example)
 * ------------------------------------------------------------------ */

const buildSteps: StepPanel[] = [
  {
    title: '0 · The loop nest (depth k = 2, array dimension d = 2)',
    body: (
      <>
        <Pre>{`for (i = 2; i <= n; i++)
  for (j = 1; j <= i; j++)
    b[i][j] = b[i-1][j] + a[i] * c[j];`}</Pre>
        <p className="text-sm">
          Test the two references to <Code>b</Code>: the <strong>definition</strong> <Code>b[i][j]</Code> (write) against
          the <strong>use</strong> <Code>b[i-1][j]</Code> (read). <Code>a[i]</Code> and <Code>c[j]</Code> are different
          arrays — no <Code>b</Code>-dependence comes from them.
        </p>
      </>
    ),
  },
  {
    title: '1 · Normalize the loops (0-based, step 1)',
    body: (
      <>
        <p className="text-sm mb-1">
          Rewrite each counter to start at 0: the new <Code>i</Code> means "iterations since the start", so the original
          index is <Code>i+2</Code>; original <Code>j</Code> is <Code>j+1</Code>. The two references become:
        </p>
        <Formula>{`definition  b[i][j]    →  b[i+2][j+1]
use         b[i-1][j]  →  b[i+1][j+1]`}</Formula>
        <p className="text-xs text-muted-foreground">
          (b[i−1] = b[(i+2)−1] = b[i+1] in the normalized counter.) Normalizing lets every nesting level be compared on a
          common 0-based footing.
        </p>
      </>
    ),
  },
  {
    title: '2 · Name the unknowns, equate the same element',
    body: (
      <>
        <p className="text-sm mb-1">
          <IV s="d" k={1} />, <IV s="d" k={2} /> = induction-variable values of the <strong>defining</strong> access;{' '}
          <IV s="u" k={1} />, <IV s="u" k={2} /> = those of the <strong>using</strong> access. A dependence needs both to
          touch the <em>same</em> array element — one equation per dimension:
        </p>
        <Formula>{`dim 1:   iᵈ₁ + 2 = iᵘ₁ + 1
dim 2:   iᵈ₂ + 1 = iᵘ₂ + 1`}</Formula>
        <p className="text-xs text-muted-foreground">Four unknowns, two equations (d = 2 dimensions).</p>
      </>
    ),
  },
  {
    title: '3 · Rearrange into A·i = c',
    body: (
      <>
        <p className="text-sm mb-1">Move unknowns left, constants right (order of unknowns: iᵈ₁, iᵘ₁, iᵈ₂, iᵘ₂):</p>
        <Formula>{`iᵈ₁ − iᵘ₁ = −1
iᵈ₂ − iᵘ₂ =  0`}</Formula>
        <Row>
          <Bracketed rows={[['1', '−1', '0', '0'], ['0', '0', '1', '−1']]} />
          <Bracketed rows={X4} />
          <span className="font-mono">=</span>
          <Bracketed rows={[['−1'], ['0']]} />
        </Row>
      </>
    ),
  },
  {
    title: '4 · Sizes — A is d × 2k',
    body: (
      <>
        <Table
          head={['Object', 'Meaning', 'Size here (d=2, k=2)']}
          rows={[
            [<Code>A</Code>, 'coefficient matrix from the fⱼ, f′ⱼ', 'd × 2k = 2 × 4'],
            [<Code>i</Code>, 'unknown induction-variable values', '2k = 4'],
            [<Code>c</Code>, 'constants from the fⱼ, f′ⱼ', 'd = 2'],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          In general each <Code>fⱼ = aⱼ₀ + Σ aⱼₗ·iₗ</Code> and <Code>f′ⱼ = bⱼ₀ + Σ bⱼₗ·iₗ</Code> are the linear index
          functions; <Code>A</Code> collects the <Code>aⱼₗ, −bⱼₗ</Code> and <Code>c</Code> collects <Code>bⱼ₀ − aⱼ₀</Code>.
        </p>
      </>
    ),
  },
]

const SystemSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Two accesses, linear index functions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Take a defining and a using access of the same array in a nest of depth <Code>k</Code>, each dimension a linear
          function of the induction variables <Code>i₁,…,iₖ</Code>:
        </p>
        <Formula>{`a[ f₁(i₁,…,iₖ) ] … [ f_d(i₁,…,iₖ) ]          (definition)
a[ f′₁(i₁,…,iₖ) ] … [ f′_d(i₁,…,iₖ) ]        (use)

f_j  = a_j0 + Σ a_jl · i_l
f′_j = b_j0 + Σ b_jl · i_l       (1 ≤ j ≤ d)`}</Formula>
        <p className="text-sm">
          Equating the two accesses element-by-element gives a linear system <Code>A·i = c</Code>, with <Code>A</Code> of
          size <Code>d × 2k</Code>, unknown vector <Code>i</Code> of size <Code>2k</Code>, and constants <Code>c</Code> of
          size <Code>d</Code>.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — build A·i = c</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Step through the construction for <Code>b[i][j] = b[i-1][j] + …</Code>. Each step normalizes, equates the same
          element, and assembles the matrix.
        </p>
        <Stepper steps={buildSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Tab 3 · loop limits → inequalities B·i ≤ c  (second worked example)
 * ------------------------------------------------------------------ */

const Ineqs: React.FC = () => (
  <Row className="items-stretch">
    <Bracketed
      rows={[
        ['−1', '0', '0', '0'],
        ['1', '0', '0', '0'],
        ['0', '−1', '0', '0'],
        ['0', '1', '0', '0'],
        ['0', '0', '−1', '0'],
        ['−1', '0', '1', '0'],
        ['0', '0', '0', '−1'],
        ['0', '−1', '0', '1'],
      ]}
    />
    <Bracketed rows={X4} />
    <span className="font-mono self-center">≤</span>
    <Bracketed rows={[['0'], ['98'], ['0'], ['98'], ['0'], ['2'], ['0'], ['2']]} />
    <span className="font-mono self-center">⇔</span>
    <div className="text-[12px] font-mono leading-[1.7] self-center">
      <div>iᵈ₁ ≥ 0</div>
      <div>iᵈ₁ ≤ 98</div>
      <div>iᵘ₁ ≥ 0</div>
      <div>iᵘ₁ ≤ 98</div>
      <div>iᵈ₂ ≥ 0</div>
      <div>−iᵈ₁ + iᵈ₂ ≤ 2</div>
      <div>iᵘ₂ ≥ 0</div>
      <div>−iᵘ₁ + iᵘ₂ ≤ 2</div>
    </div>
  </Row>
)

const limitSteps: StepPanel[] = [
  {
    title: '0 · A loop with a transposed access and a variable limit',
    body: (
      <>
        <Pre>{`for (i = 2; i <= 100; i++)
  for (j = 1; j <= i+1; j++)
    b[i][j] = b[j][i];`}</Pre>
        <p className="text-sm">
          Two complications at once: the use <Code>b[j][i]</Code> <strong>swaps the subscripts</strong>, and the inner
          upper limit <Code>i+1</Code> <strong>depends on the outer variable</strong>.
        </p>
      </>
    ),
  },
  {
    title: '1 · Normalize → references',
    body: (
      <>
        <p className="text-sm mb-1">Original i is i+2 (i: 0…98); original j is j+1. The accessed elements become:</p>
        <Formula>{`definition  b[i][j]  →  b[i+2][j+1]
use         b[j][i]  →  b[j+1][i+2]`}</Formula>
      </>
    ),
  },
  {
    title: '2 · Equate the same element (note the swap!)',
    body: (
      <>
        <p className="text-sm mb-1">
          The use's <em>first</em> index is its <Code>j</Code> = <IV s="u" k={2} />; its <em>second</em> index is its{' '}
          <Code>i</Code> = <IV s="u" k={1} />. Matching dimension-by-dimension with the definition:
        </p>
        <Formula>{`dim 1:   iᵈ₁ + 2 = iᵘ₂ + 1
dim 2:   iᵈ₂ + 1 = iᵘ₁ + 2`}</Formula>
      </>
    ),
  },
  {
    title: '3 · Matrix form (3.1)',
    body: (
      <>
        <Row>
          <Bracketed rows={[['1', '0', '0', '−1'], ['0', '−1', '1', '0']]} />
          <Bracketed rows={X4} />
          <span className="font-mono">=</span>
          <Bracketed rows={[['−1'], ['1']]} />
        </Row>
        <p className="text-xs text-muted-foreground">
          iᵈ₁ − iᵘ₂ = −1 and −iᵘ₁ + iᵈ₂ = 1. The swap is why the −1 lands in the iᵘ₂ column, not iᵘ₁.
        </p>
      </>
    ),
  },
  {
    title: '4 · Read off the loop limits',
    body: (
      <>
        <p className="text-sm mb-1">Lower limits are all 0. Upper limits (for both def and use):</p>
        <Formula>{`0 ≤ i₁ ≡ i ≤ 98
0 ≤ i₂ ≡ j ≤ i₁ + 2`}</Formula>
        <p className="text-sm">
          The second one couples the unknowns: <Code>iᵈ₂ ≤ iᵈ₁ + 2</Code> and <Code>iᵘ₂ ≤ iᵘ₁ + 2</Code> (i.e.{' '}
          <Code>−iᵈ₁ + iᵈ₂ ≤ 2</Code>, <Code>−iᵘ₁ + iᵘ₂ ≤ 2</Code>).
        </p>
      </>
    ),
  },
  {
    title: '5 · The inequality system (3.2)',
    body: (
      <>
        <p className="text-sm mb-1">
          One inequality per unknown for each of the upper and lower limit (the same unknown appears once with a{' '}
          <strong>positive</strong> and once with a <strong>negative</strong> coefficient):
        </p>
        <div className="overflow-x-auto">
          <Ineqs />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Sizes: <Code>B</Code> is <Code>2·2k × 2k = 8 × 4</Code>, <Code>i</Code> is <Code>2k = 4</Code>, <Code>c</Code> is{' '}
          <Code>4k = 8</Code>.
        </p>
      </>
    ),
  },
  {
    title: '6 · The dependence system',
    body: (
      <Panel className="text-sm leading-relaxed">
        Equations <strong>(3.1)</strong> together with the inequalities <strong>(3.2)</strong> form the{' '}
        <strong>dependence system</strong>. A dependence exists only if this system has a common <strong>integer</strong>{' '}
        solution. If none exists, the two references are independent and may run in parallel.
      </Panel>
    ),
  },
]

const LimitsSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">When can the solution count?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A solution of <Code>A·i = c</Code> only signals a real dependence from the defining to the using access if:
        </p>
        <Step n="1">
          every <IV s="d" k={1} /> / <IV s="u" k={1} /> lies <strong>within the normalized loop limits</strong> of its
          nesting level, and
        </Step>
        <Step n="2">
          the solution is an <strong>integer</strong> solution.
        </Step>
        <p className="text-sm mt-2">
          For normalized loops the limit is <Code>0 ≤ value ≤ (number of iterations)</Code>. These bounds become a system
          of linear inequalities <Code>B·i ≤ c</Code>.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — build B·i ≤ c</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          The loop <Code>b[i][j] = b[j][i]</Code> shows both a transposed subscript and a variable inner limit. Step
          through equations (3.1) and inequalities (3.2):
        </p>
        <Stepper steps={limitSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Tab 4 · solving, complications, and the constraint example
 * ------------------------------------------------------------------ */

const mChoices = [0, 1, 2, 5, 9, 10, 12]
const MExplorer: React.FC = () => {
  const [m, setM] = useState(2)
  const inRange = m >= 0 && m <= 9 // ∃ iᵘ∈[0,9] with iᵈ = iᵘ+m ∈ [0,9]  ⇔  0 ≤ m ≤ 9
  const excluded = m === 0 // removed by  if (m > 0)
  const sampleU = 0
  const sampleD = sampleU + m
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {mChoices.map((v) => (
          <button
            key={v}
            onClick={() => setM(v)}
            className={cn(
              'text-[12.5px] font-mono px-2.5 py-1.5 rounded-lg border transition-colors',
              m === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            m = {v}
          </button>
        ))}
      </div>
      <Panel>
        <div className="text-[13px] font-mono mb-2">
          equation: iᵈ = iᵘ + {m}{'   '}with{'   '}0 ≤ iᵈ, iᵘ ≤ 9
        </div>
        {excluded ? (
          <div className="text-[13px] leading-relaxed">
            <Bad>m = 0 is excluded</Bad> by the guard <Code>if (m &gt; 0)</Code>. That is exactly why the constraint{' '}
            <Code>1 ≤ m</Code> is added to the system.
          </div>
        ) : inRange ? (
          <div className="text-[13px] leading-relaxed">
            <Bad>Dependence possible.</Bad> An in-bounds integer solution exists, e.g.{' '}
            <Code>iᵘ = {sampleU}, iᵈ = {sampleD}</Code>. The compiler <strong>cannot</strong> exclude the dependence ⇒ it
            must keep the accesses ordered.
          </div>
        ) : (
          <div className="text-[13px] leading-relaxed">
            <Good>No dependence.</Good> With <Code>m = {m}</Code> the gap <Code>iᵈ − iᵘ = {m}</Code> exceeds the range
            <Code>9</Code>, so no in-bounds solution exists ⇒ the loop is <strong>parallelizable</strong>.
          </div>
        )}
      </Panel>
      <p className="text-xs text-muted-foreground mt-1">
        Knowing only <Code>m ≥ 1</Code>, a solution exists for every <Code>1 ≤ m ≤ 9</Code>, so the compiler must
        conservatively assume a dependence. Only extra knowledge such as <Code>m ≥ 10</Code> (from data-flow analysis)
        would let it parallelize.
      </p>
    </div>
  )
}

const SolvingSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Solving → diophantine equations</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The dependence system is a set of linear equations that must be solved over the <strong>integers</strong>,
          subject to the range inequalities. Three outcomes:
        </p>
        <Table
          head={['Result of solving', 'Conclusion']}
          rows={[
            ['no integer solution', <Good>independent → may parallelize / vectorize</Good>],
            ['no in-bounds solution', <Good>independent within these loops</Good>],
            ['an in-bounds integer solution', <Bad>a dependence may exist → keep ordered</Bad>],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Because the analysis is conservative, "cannot prove independent" is treated as "dependent". The actual integer
          solving (GCD / Banerjee tests, the Omega test, …) is the subject of the following sections.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Three complications when building the system</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Complication', 'Solution']}
          rows={[
            [
              <>(a) <strong>user variables</strong> (non-induction) appear in subscripts</>,
              'add them as additional unknowns of the system',
            ],
            [
              <>(b) <Code>min(…)</Code> / <Code>max(…)</Code> as loop limits (e.g. after transformations)</>,
              'one inequality per expression inside the min/max ⇒ a larger inequality system',
            ],
            [
              <>(c) <strong>additional constraints</strong> on variables, found by data-flow analysis</>,
              'add them to the system — they can tighten it and exclude more dependences',
            ],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Example — a user variable + an extra constraint</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`if (m > 0)
  for (i = 1; i <= 10; i++)
    a[i] = a[i+m] + b[i];`}</Pre>
        <p className="text-sm mb-1">Normalizing (i: 0…9), the write <Code>a[i]</Code> and read <Code>a[i+m]</Code> give:</p>
        <Formula>{`equation:      iᵈ + 1 = iᵘ + m + 1
inequalities:  0 ≤ iᵈ ≤ 9
               0 ≤ iᵘ ≤ 9
               1 ≤ m            ← from  if (m > 0)`}</Formula>
        <p className="text-sm mb-2">
          <Code>m</Code> is a user variable, so it joins as an <strong>extra unknown</strong>; the guard contributes the
          extra constraint <Code>1 ≤ m</Code>. Pick an <Code>m</Code> and see whether a dependence survives:
        </p>
        <MExplorer />
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
      Five exam-style problems on §3.3, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Build the dependence system for a 1-D loop"
      statement={
        <>
          <p className="mb-2">Build the dependence equation, the matrix form A·i = c, and the range inequalities; then decide whether a dependence exists.</p>
          <Pre>{`for (i = 1; i <= n; i++)
  a[i] = a[i-1] + b[i];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Normalize</strong> (i: 0…n−1, original index = i+1): write <Code>a[i] → a[iᵈ+1]</Code>, read{' '}
            <Code>a[i-1] → a[iᵘ]</Code>.
          </p>
          <p className="text-sm mb-1"><strong>Equation</strong> (same element):</p>
          <Formula>{`iᵈ + 1 = iᵘ      ⇒   iᵈ − iᵘ = −1`}</Formula>
          <p className="text-sm mb-1"><strong>Matrix form</strong> (k = 1, d = 1, so A is 1 × 2):</p>
          <Row>
            <Bracketed rows={[['1', '−1']]} />
            <Bracketed rows={X2} />
            <span className="font-mono">=</span>
            <Bracketed rows={[['−1']]} />
          </Row>
          <p className="text-sm mb-1"><strong>Range</strong>: <Code>0 ≤ iᵈ ≤ n−1</Code>, <Code>0 ≤ iᵘ ≤ n−1</Code>.</p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Bad>Dependence exists.</Bad> Integer in-bounds solutions abound, e.g. <Code>iᵘ = 1, iᵈ = 0</Code>: the value
            written in iteration 0 is read in iteration 1 — a <strong>flow (true) dependence of distance 1</strong>, so
            this loop cannot be parallelized.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Normalize and form the equation"
      statement={
        <>
          <Pre>{`for (i = 3; i <= n; i++)
  x[i] = x[i-2] + 1;`}</Pre>
          <p>Give the normalized references, the dependence equation, and the matrix form A·i = c.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">Normalize (i: 0…, original index = i+3): write <Code>x[iᵈ+3]</Code>, read <Code>x[iᵘ+1]</Code> (since i−2 = i+1).</p>
          <Formula>{`iᵈ + 3 = iᵘ + 1     ⇒   iᵈ − iᵘ = −2`}</Formula>
          <Row>
            <Bracketed rows={[['1', '−1']]} />
            <Bracketed rows={X2} />
            <span className="font-mono">=</span>
            <Bracketed rows={[['−2']]} />
          </Row>
          <p className="text-xs text-muted-foreground mt-1">A distance-2 carried dependence: the write of iteration 0 is read in iteration 2.</p>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="2-D nest: build A·i = c"
      statement={
        <>
          <Pre>{`for (i = 1; i <= n; i++)
  for (j = 1; j <= m; j++)
    a[i][j] = a[i-1][j+1] + c;`}</Pre>
          <p>Normalize, write the two dependence equations, and give the matrix form (order of unknowns iᵈ₁, iᵘ₁, iᵈ₂, iᵘ₂).</p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Normalize (i, j: 0-based, original = +1). Write <Code>a[iᵈ₁+1][iᵈ₂+1]</Code>; read{' '}
            <Code>a[i-1][j+1] → a[iᵘ₁][iᵘ₂+2]</Code>.
          </p>
          <Formula>{`dim 1:   iᵈ₁ + 1 = iᵘ₁        ⇒  iᵈ₁ − iᵘ₁ = −1
dim 2:   iᵈ₂ + 1 = iᵘ₂ + 2    ⇒  iᵈ₂ − iᵘ₂ =  1`}</Formula>
          <Row>
            <Bracketed rows={[['1', '−1', '0', '0'], ['0', '0', '1', '−1']]} />
            <Bracketed rows={X4} />
            <span className="font-mono">=</span>
            <Bracketed rows={[['−1'], ['1']]} />
          </Row>
          <p className="text-xs text-muted-foreground mt-1">
            Distance vector <Code>(−1, 1)</Code> from def to use; direction has a leading <Code>&lt;</Code> at level 1, so
            it is a valid carried dependence.
          </p>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Transposed subscript + variable limit → full B·i ≤ c"
      statement={
        <>
          <Pre>{`for (i = 1; i <= 50; i++)
  for (j = 1; j <= i; j++)
    a[i][j] = a[j][i] + 1;`}</Pre>
          <p>Build the equations A·i = c and the complete inequality system B·i ≤ c.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Normalize (i: 0…49; j: 0…, with <Code>j ≤ i</Code> ⇒ <Code>i₂ ≤ i₁</Code>). Write{' '}
            <Code>a[iᵈ₁+1][iᵈ₂+1]</Code>; read <Code>a[j][i] → a[iᵘ₂+1][iᵘ₁+1]</Code>.
          </p>
          <Formula>{`dim 1:   iᵈ₁ + 1 = iᵘ₂ + 1   ⇒  iᵈ₁ − iᵘ₂ = 0
dim 2:   iᵈ₂ + 1 = iᵘ₁ + 1   ⇒  −iᵘ₁ + iᵈ₂ = 0`}</Formula>
          <Row>
            <Bracketed rows={[['1', '0', '0', '−1'], ['0', '−1', '1', '0']]} />
            <Bracketed rows={X4} />
            <span className="font-mono">=</span>
            <Bracketed rows={[['0'], ['0']]} />
          </Row>
          <p className="text-sm mt-2 mb-1">Ranges: <Code>0 ≤ i₁ ≤ 49</Code> and <Code>0 ≤ i₂ ≤ i₁</Code> (so <Code>−i₁ + i₂ ≤ 0</Code>), for both def and use:</p>
          <div className="overflow-x-auto">
            <Row className="items-stretch">
              <Bracketed
                rows={[
                  ['−1', '0', '0', '0'],
                  ['1', '0', '0', '0'],
                  ['0', '−1', '0', '0'],
                  ['0', '1', '0', '0'],
                  ['0', '0', '−1', '0'],
                  ['−1', '0', '1', '0'],
                  ['0', '0', '0', '−1'],
                  ['0', '−1', '0', '1'],
                ]}
              />
              <Bracketed rows={X4} />
              <span className="font-mono self-center">≤</span>
              <Bracketed rows={[['0'], ['49'], ['0'], ['49'], ['0'], ['0'], ['0'], ['0']]} />
            </Row>
          </div>
          <Panel className="text-sm leading-relaxed mt-1">
            The system is solvable (any diagonal point <Code>iᵈ₁ = iᵘ₂</Code>, <Code>iᵈ₂ = iᵘ₁</Code> within bounds, e.g.
            <Code>iᵈ₁=2, iᵘ₂=2, iᵈ₂=1, iᵘ₁=1</Code> with <Code>1 ≤ 2</Code>) ⇒ a dependence exists; the references are{' '}
            <em>not</em> independent.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="User variable, extra constraint, and the exclusion question"
      statement={
        <>
          <Pre>{`if (m > 0)
  for (i = 1; i <= 10; i++)
    a[i] = a[i+m] + b[i];`}</Pre>
          <p>
            (a) Build the dependence equation and all inequalities. (b) How is <Code>m</Code> handled? (c) For which values
            of <Code>m</Code> can the dependence be <strong>excluded</strong>, and what may the compiler conclude knowing
            only <Code>m &gt; 0</Code>?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) System</p>
          <Formula>{`equation:      iᵈ + 1 = iᵘ + m + 1     (⇒  iᵈ − iᵘ = m)
inequalities:  0 ≤ iᵈ ≤ 9
               0 ≤ iᵘ ≤ 9
               1 ≤ m`}</Formula>
          <p className="text-sm font-medium mb-1">(b) The variable m</p>
          <p className="text-sm mb-2">
            <Code>m</Code> is a <strong>user (non-induction) variable</strong> in a subscript, so it becomes an{' '}
            <strong>additional unknown</strong>. The guard <Code>if (m &gt; 0)</Code> adds the constraint <Code>1 ≤ m</Code>.
          </p>
          <p className="text-sm font-medium mb-1">(c) Exclusion</p>
          <p className="text-sm mb-2">
            A dependence needs <Code>iᵈ = iᵘ + m</Code> with both in <Code>[0,9]</Code>, i.e. <Code>1 ≤ m ≤ 9</Code>. So:
          </p>
          <Table
            head={['m', 'in-bounds integer solution?', 'verdict']}
            rows={[
              ['1 ≤ m ≤ 9', 'yes (e.g. iᵘ=0, iᵈ=m)', <Bad>dependence — keep ordered</Bad>],
              ['m ≥ 10', 'no (gap exceeds range)', <Good>independent — parallelizable</Good>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            Knowing only <Code>m &gt; 0</Code>, the compiler cannot rule out <Code>1 ≤ m ≤ 9</Code>, so it must{' '}
            <strong>conservatively assume a dependence</strong>. Only an extra fact such as <Code>m ≥ 10</Code> (from
            data-flow analysis — complication (c)) would let it exclude the dependence and parallelize.
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
  { id: 'why', label: 'Why arrays differ', render: () => <IntroSection /> },
  { id: 'system', label: 'Building A·i = c', render: () => <SystemSection /> },
  { id: 'limits', label: 'Limits → B·i ≤ c', render: () => <LimitsSection /> },
  { id: 'solving', label: 'Solving & complications', render: () => <SolvingSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function ArrayDependenceStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 3 · §3.3 · Data Dependence Analysis for Arrays"
      title="Data Dependence Analysis for Arrays"
      subtitle="From array subscripts to a dependence system: build A·i = c from the index functions, add the loop-limit inequalities B·i ≤ c, and solve over the integers to exclude (or confirm) a dependence — including user variables and extra constraints."
      tabs={tabs}
    />
  )
}
