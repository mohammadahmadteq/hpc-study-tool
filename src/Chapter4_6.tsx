import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { cn } from './lib/utils'
import {
  Code,
  Pre,
  Formula,
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
 *  Chapter 4 · §4.6 — Loop Skewing   (PDF 200–205)
 *  Normalization can destroy interchangeability; skewing reshapes the
 *  iteration space ( (i,j) → (i, j+f·i) ) to restore it. Distance
 *  (d1,d2) → (d1, d2 + f·d1); index & bound adjustment; re-interchange.
 * ------------------------------------------------------------------ */

/* helper: a distance vector (d1,d2) blocks interchange iff it is (<,>) */
const blocks = (d1: number, d2: number) => d1 > 0 && d2 < 0
const dirOf = (d: number) => (d > 0 ? '<' : d < 0 ? '>' : '=')

/* ================================================================== *
 *  Tab 1 · Normalization can block interchange
 * ================================================================== */

const normSteps: StepPanel[] = [
  {
    title: '0 · A nest that IS interchangeable',
    body: (
      <>
        <Pre>{`for (i = 2; i <= n; i++)
  for (j = i; j <= n; j++)
    a[i][j] = 0.5 * (a[i][j-1] + a[i-1][j]);`}</Pre>
        <p className="text-sm">
          Two reuses: <Code>a[i][j−1]</Code> (previous <Code>j</Code>) and <Code>a[i−1][j]</Code> (previous <Code>i</Code>).
        </p>
      </>
    ),
  },
  {
    title: '1 · Distances in the non-normalized nest',
    body: (
      <>
        <Table
          head={['Reuse', 'Distance (i,j)', 'Direction']}
          rows={[
            [<Code>a[i][j-1]</Code>, <Code>(0, 1)</Code>, <Code>(=, &lt;)</Code>],
            [<Code>a[i-1][j]</Code>, <Code>(1, 0)</Code>, <Code>(&lt;, =)</Code>],
          ]}
        />
        <p className="text-sm">
          Neither is <Code>(&lt;,&gt;)</Code> ⇒ <Good>interchange is possible</Good> (see §4.4):
        </p>
        <Pre>{`for (j = 2; j <= n; j++)
  for (i = 2; i <= j; i++)
    a[i][j] = 0.5 * (a[i][j-1] + a[i-1][j]);`}</Pre>
      </>
    ),
  },
  {
    title: '2 · Now normalize the loop',
    body: (
      <>
        <p className="text-sm mb-1">
          Normalization rewrites the indices to start at 0 (<Code>i = iₙ+2</Code>, <Code>j = jₙ + iₙ + 2</Code>):
        </p>
        <Pre>{`for (i = 0; i <= n-2; i++)
  for (j = 0; j <= n-i-2; j++)
    a[i+2][j+i+2] = 0.5 * (a[i+2][j+i+1] + a[i+1][j+i+2]);`}</Pre>
        <p className="text-sm">The reference expressions changed — so the distance vectors change too.</p>
      </>
    ),
  },
  {
    title: '3 · Distances in the normalized nest',
    body: (
      <>
        <Table
          head={['Reuse', 'Distance (i,j)', 'Direction']}
          rows={[
            [<Code>a[i+2][j+i+1]</Code>, <Code>(0, 1)</Code>, <Code>(=, &lt;)</Code>],
            [<Code>a[i+1][j+i+2]</Code>, <Code>(1, −1)</Code>, <Bad>(&lt;, &gt;)</Bad>],
          ]}
        />
        <Panel className="text-sm leading-relaxed">
          <Bad>Interchange is now impossible.</Bad> Normalization turned the <Code>(1,0)</Code> dependence into{' '}
          <Code>(1,−1)</Code> — direction <Code>(&lt;,&gt;)</Code>, the one forbidden case.
          <div className="mt-1"><strong>Conclusion:</strong> <em>normalization can prevent loop interchange.</em></div>
        </Panel>
      </>
    ),
  },
]

const NormSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The problem: normalization can block interchange</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Loop <strong>normalization</strong> (rewriting every loop to start at 0 with step 1) is a common
          pre-processing step — but it changes the array index expressions, and therefore the dependence{' '}
          <strong>distance vectors</strong>. Sometimes it manufactures the one direction vector, <Code>(&lt;,&gt;)</Code>,
          that makes interchange illegal.
        </p>
        <Stepper steps={normSteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The idea of loop skewing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          <strong>Loop skewing</strong> modifies the iteration space by a transformation <em>reverse</em> to
          normalization — it re-slants the iterations so the offending <Code>(&lt;,&gt;)</Code> distance disappears and
          loop interchange becomes possible again.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · The skewing transform  (interactive)
 * ================================================================== */

const SkewLattice: React.FC<{ f: number }> = ({ f }) => {
  const C = 30
  const MX = 26
  const MY = 26
  const maxY = 2 + f * 2
  const H = maxY * C + 2 * MY
  const W = 2 * C + 2 * MX + 10
  const sx = (i: number) => MX + i * C
  const sy = (i: number, j: number) => H - MY - (j + f * i) * C

  // source (0,1); deps (1,1) and (1,-1)
  const src = { i: 0, j: 1 }
  const t1 = { i: 1, j: 2 } // via (1,1)
  const t2 = { i: 1, j: 0 } // via (1,-1)

  const arrow = (a: { i: number; j: number }, b: { i: number; j: number }, key: string, bad: boolean) => (
    <line
      key={key}
      x1={sx(a.i)}
      y1={sy(a.i, a.j)}
      x2={sx(b.i)}
      y2={sy(b.i, b.j)}
      stroke={bad ? '#ef4444' : '#10b981'}
      strokeWidth={2}
      markerEnd={`url(#sk-${bad ? 'bad' : 'good'})`}
    />
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mx-auto block select-none" style={{ height: 'auto', maxWidth: 240 }}>
      <defs>
        <marker id="sk-good" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#10b981" />
        </marker>
        <marker id="sk-bad" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
        </marker>
      </defs>
      {[0, 1, 2].map((i) =>
        [0, 1, 2].map((j) => (
          <circle
            key={`${i}-${j}`}
            cx={sx(i)}
            cy={sy(i, j)}
            r={4}
            fill={i === src.i && j === src.j ? 'var(--color-primary)' : 'var(--color-card)'}
            stroke={i === src.i && j === src.j ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
            strokeWidth={1.4}
          />
        ))
      )}
      {arrow(src, t1, 'a1', blocks(1, 1 + f * 1))}
      {arrow(src, t2, 'a2', blocks(1, -1 + f * 1))}
    </svg>
  )
}

const SkewCalculator: React.FC = () => {
  const [f, setF] = useState(0)
  const base: [number, number][] = [
    [1, 1],
    [1, -1],
  ]
  const skewed = base.map(([d1, d2]) => [d1, d2 + f * d1] as [number, number])
  const anyBlocked = skewed.some(([d1, d2]) => blocks(d1, d2))

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-muted-foreground">skew factor f =</span>
        {[0, 1, 2, 3].map((v) => (
          <button
            key={v}
            onClick={() => setF(v)}
            className={cn(
              'w-8 h-8 rounded-md border font-mono text-sm transition-colors',
              f === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0">
          <Formula>{`skew:  (i, j) → (i, j + f·i)
       distance (d1, d2) → (d1, d2 + f·d1)`}</Formula>
          <Table
            head={['original', 'skewed', 'direction', 'blocks?']}
            rows={base.map(([d1, d2], k) => {
              const [s1, s2] = skewed[k]
              const bad = blocks(s1, s2)
              return [
                <Code>{`(${d1}, ${d2})`}</Code>,
                <Code>{`(${s1}, ${s2})`}</Code>,
                <Code>{`(${dirOf(s1)}, ${dirOf(s2)})`}</Code>,
                bad ? <Bad>✗ (&lt;,&gt;)</Bad> : <Good>✓</Good>,
              ]
            })}
          />
          <Panel className={cn('my-2 text-sm leading-relaxed border-2', anyBlocked ? 'border-red-500/60' : 'border-emerald-500/60')}>
            {anyBlocked ? (
              <>
                <Bad>Interchange still blocked.</Bad> A skewed distance is still <Code>(&lt;,&gt;)</Code>. Increase{' '}
                <Code>f</Code>.
              </>
            ) : (
              <>
                <Good>Interchange now possible!</Good> No skewed distance is <Code>(&lt;,&gt;)</Code> — skewing with
                factor <Code>f = {f}</Code> removed the offending direction.
              </>
            )}
          </Panel>
        </div>
        <div className="shrink-0 w-full sm:w-auto">
          <SkewLattice f={f} />
          <div className="text-[11px] text-muted-foreground text-center mt-1">
            iteration space skewed by <Code>f = {f}</Code>
            <div className="mt-1 flex gap-3 justify-center">
              <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: '#10b981' }} /> ok</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: '#ef4444' }} /> (&lt;,&gt;)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const TransformSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The skew and its effect on distances</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>Method:</strong> add the outer index to the inner index — iteration <Code>(i, j)</Code> becomes{' '}
          <Code>(i, j + i)</Code>. In general, skewing with <strong>factor f</strong> maps <Code>(i, j) → (i, j + f·i)</Code>,
          and a dependence distance transforms as:
        </p>
        <Formula>{`(d1, d2)  →  (d1, d2 + f·d1)`}</Formula>
        <p className="text-sm">
          The outer distance <Code>d1</Code> is unchanged; the inner distance is shifted by <Code>f·d1</Code>. Choose{' '}
          <Code>f</Code> large enough to push every <Code>(&lt;,&gt;)</Code> up to <Code>(&lt;,=)</Code> or{' '}
          <Code>(&lt;,&lt;)</Code>.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Try it — skew until interchange unlocks</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          The distances <Code>(1,1)</Code> and <Code>(1,−1)</Code> come from{' '}
          <Code>a[i][j] = 0.5·(a[i−1][j−1] + a[i−1][j+1])</Code>. Raise <Code>f</Code> and watch the red{' '}
          <Code>(&lt;,&gt;)</Code> arrow rotate up until interchange becomes legal.
        </p>
        <SkewCalculator />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · Full worked example  (index & bound adjustment + interchange)
 * ================================================================== */

const fullSteps: StepPanel[] = [
  {
    title: '0 · The loop nest',
    body: (
      <>
        <Pre>{`for (i = 2; i <= n; i++)
  for (j = 2; j <= m; j++)
    a[i][j] = 0.5 * (a[i-1][j-1] + a[i-1][j+1]);`}</Pre>
        <p className="text-sm">
          Reuses: <Code>a[i−1][j−1]</Code> ⇒ distance <Code>(1,1)</Code>; <Code>a[i−1][j+1]</Code> ⇒ distance{' '}
          <Code>(1,−1)</Code>. The <Code>(1,−1)</Code> = <Code>(&lt;,&gt;)</Code> makes interchange{' '}
          <Bad>impossible</Bad>.
        </p>
      </>
    ),
  },
  {
    title: '1 · Skew with factor 1',
    body: (
      <>
        <p className="text-sm mb-1">Apply <Code>(d1,d2) → (d1, d2 + 1·d1)</Code>:</p>
        <Formula>{`(1,  1) → (1, 2)
(1, −1) → (1, 0)`}</Formula>
        <p className="text-sm">
          Neither result is <Code>(&lt;,&gt;)</Code> ⇒ after skewing, <Good>loop interchange becomes possible</Good>.
        </p>
      </>
    ),
  },
  {
    title: '2 · Set up the index vectors',
    body: (
      <>
        <p className="text-sm mb-1">
          Let <Code>(iₙ, jₙ)</Code> be the normalized vector and <Code>(iₛ, jₛ)</Code> the skewed vector.
        </p>
        <Formula>{`before skewing:   i = iₙ + 2 ,  j = jₙ + 2
goal of skew:     iₛ = iₙ ,      jₛ = jₙ + iₙ
combination:      i = iₛ + 2 ,  j = jₛ − iₛ + 2`}</Formula>
        <p className="text-sm">The last line lets us recover the real indices from the skewed counters.</p>
      </>
    ),
  },
  {
    title: '3 · Derive the loop bounds',
    body: (
      <>
        <p className="text-sm mb-1">Substitute <Code>i = iₛ+2</Code> and <Code>j = jₛ−iₛ+2</Code> into the original bounds:</p>
        <Formula>{`2 ≤ iₛ + 2       ≤ n       ⟹   0  ≤ iₛ ≤ n − 2
2 ≤ jₛ − iₛ + 2  ≤ m       ⟹   iₛ ≤ jₛ ≤ m + iₛ − 2`}</Formula>
        <Pre>{`for (is = 0; is <= n-2; is++)
  for (js = is; js <= m + is - 2; js++) {
    i = is + 2;  j = js - is + 2;
    a[i][j] = 0.5 * (a[i-1][j-1] + a[i-1][j+1]);
  }`}</Pre>
        <p className="text-sm">This is the <strong>skewed</strong> nest — same computation, re-slanted iteration space.</p>
      </>
    ),
  },
  {
    title: '4 · Interchange the skewed loops',
    body: (
      <>
        <p className="text-sm mb-1">
          Now <Code>jₛ</Code> may become the outer loop. Re-solve the two-sided bounds for <Code>iₛ</Code>:{' '}
          <Code>jₛ − m + 2 ≤ iₛ ≤ jₛ</Code> together with <Code>0 ≤ iₛ ≤ n − 2</Code>:
        </p>
        <Pre>{`for (js = 0; js <= m + n - 4; js++)
  for (is = max(0, js-m+2); is <= min(js, n-2); is++) {
    i = is + 2;  j = js - is + 2;
    a[i][j] = 0.5 * (a[i-1][j-1] + a[i-1][j+1]);
  }`}</Pre>
        <Panel className="text-sm leading-relaxed">
          <Good>Done.</Good> Skewing reshaped the iteration space so the forbidden <Code>(1,−1)</Code> became{' '}
          <Code>(1,0)</Code>; then the loops could be interchanged with <Code>max/min</Code> bounds guarding the
          parallelogram-shaped space.
        </Panel>
      </>
    ),
  },
]

const FullSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">End-to-end: skew, then interchange</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          The full recipe on a real nest: identify the distances, pick a skew factor that kills the <Code>(&lt;,&gt;)</Code>,
          rewrite the indices <Code>(iₛ, jₛ)</Code>, adjust the bounds, and finally interchange.
        </p>
        <Stepper steps={fullSteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why the bounds get max / min</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Skewing turns a rectangle into a <strong>parallelogram</strong> in <Code>(iₛ, jₛ)</Code> space. After
          interchange, for a fixed outer <Code>jₛ</Code> the inner <Code>iₛ</Code> is bounded on both sides by
          slanted edges — hence <Code>iₛ = max(0, jₛ−m+2) … min(jₛ, n−2)</Code>. The <Code>max/min</Code> clip the
          inner range to the slanted region, exactly as <Code>min(4, j)</Code> did for the triangle in §4.4.
        </p>
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
      Five exam-style problems on §4.6, easy → hardest — all on <em>fresh</em> code, not the lecture examples. Q1 is
      fully worked to set the pattern; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Find the minimal skew — three dependences at once"
      statement={
        <>
          <p className="mb-2">
            A nest has <em>three</em> dependences with distances <Code>(1, 0)</Code>, <Code>(1, −3)</Code>, and{' '}
            <Code>(2, −1)</Code>. Find the smallest integer skew factor <Code>f</Code> that clears <em>every</em>{' '}
            <Code>(&lt;,&gt;)</Code> simultaneously, and give the resulting distances.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Step 1 — who's blocking?</strong> A distance <Code>(d₁,d₂)</Code> is <Code>(&lt;,&gt;)</Code> iff{' '}
            <Code>d₁ &gt; 0</Code> and <Code>d₂ &lt; 0</Code>. That rules in <Code>(1,−3)</Code> and{' '}
            <Code>(2,−1)</Code>; <Code>(1,0)</Code> is already fine (<Code>d₂ = 0</Code> is not <Code>&lt;</Code>).
          </p>
          <p className="text-sm mb-1">
            <strong>Step 2 — skewing formula</strong> <Code>(d₁,d₂) → (d₁, d₂+f·d₁)</Code>. This applies to{' '}
            <em>every</em> dependence, not only the blockers — <Code>(1,0)</Code> will change value too, it just never
            becomes unsafe (its <Code>d₂</Code> starts at 0, and <Code>f·d₁ ≥ 0</Code> for <Code>f,d₁ ≥ 0</Code> only
            ever pushes it up). For each blocker, solve <Code>d₂ + f·d₁ ≥ 0</Code>, i.e. <Code>f ≥ −d₂/d₁</Code>, and
            round up (integer factor):
          </p>
          <Table
            head={['Dependence', 'Need f ≥', 'at f=2', 'at f=3']}
            rows={[
              [<Code>(1,0)</Code>, 'any f (safe already)', <Code>(1,2)</Code>, <Code>(1,3)</Code>],
              [<Code>(1,−3)</Code>, <Code>3/1 = 3</Code>, <Bad>(1,−1)</Bad>, <Good>(1,0)</Good>],
              [<Code>(2,−1)</Code>, <Code>1/2 = 0.5 → 1</Code>, <Good>(2,3)</Good>, <Good>(2,5)</Good>],
            ]}
          />
          <p className="text-sm mb-1">
            The <strong>binding constraint</strong> is the largest requirement across all dependences —{' '}
            <Code>(1,−3)</Code> needs <Code>f ≥ 3</Code>, which also satisfies <Code>(2,−1)</Code>'s weaker{' '}
            <Code>f ≥ 1</Code>. At <Code>f = 2</Code> the second dependence is still <Code>(1,−1) = (&lt;,&gt;)</Code> —{' '}
            <Bad>not enough</Bad>.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>f = 3.</Good> Results: <Code>(1,3)</Code>, <Code>(1,0)</Code>, <Code>(2,5)</Code> — no{' '}
            <Code>(&lt;,&gt;)</Code> survives. <strong>Pattern:</strong> compute each dependence's own minimal{' '}
            <Code>f</Code>, then take the <strong>maximum</strong> over all of them — one skew factor must satisfy every
            dependence at once, and remember it re-scales <em>all</em> distances, not just the ones you were worried
            about.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="A nest where skewing is not needed at all"
      statement={
        <>
          <p className="mb-2">
            A nest has distances <Code>(1, 2)</Code> and <Code>(0, 3)</Code>. Is skewing necessary before interchange?
            Justify, and state what skewing with <Code>f = 5</Code> would do to it anyway (harmless or harmful?).
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Directions: <Code>(1,2) → (&lt;,&lt;)</Code>, <Code>(0,3) → (=,&lt;)</Code>. Neither is{' '}
            <Code>(&lt;,&gt;)</Code> — <strong>interchange is already legal</strong>, no skew required.
          </p>
          <p className="text-sm mb-1">
            Applying <Code>f = 5</Code> anyway: <Code>(1,2) → (1, 2+5) = (1,7)</Code>, still <Code>(&lt;,&lt;)</Code>;{' '}
            <Code>(0,3) → (0, 3+0) = (0,3)</Code>, unchanged (its <Code>d₁ = 0</Code>, so skewing never touches it).
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Harmless but pointless.</Good> Skewing a dependence that is already legal can never turn it{' '}
            <em>into</em> <Code>(&lt;,&gt;)</Code> — the formula only ever <em>adds</em> a non-negative amount (for{' '}
            <Code>f ≥ 0</Code>, <Code>d₁ ≥ 0</Code>) to <Code>d₂</Code>, so a non-negative <Code>d₂</Code> stays
            non-negative. It does, however, cost you: the loop bounds still get the <Code>max/min</Code> parallelogram
            treatment for no benefit. <strong>Only skew dependences that are actually broken.</strong>
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Skewing can go too far — check both ends"
      statement={
        <>
          <p className="mb-2">
            A nest has two dependences: <Code>(1, −4)</Code> and <Code>(3, 2)</Code>. (a) Find the minimal{' '}
            <Code>f</Code>. (b) Show that <Code>f</Code> can also be <em>too small</em> or (for this pair) needlessly
            large — is there an upper limit on a "safe" <Code>f</Code>, or can you pick any <Code>f</Code> above the
            minimum?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> Only <Code>(1,−4)</Code> is <Code>(&lt;,&gt;)</Code>; it needs{' '}
            <Code>f ≥ 4</Code>. Check <Code>(3,2)</Code> is unaffected in sign for any <Code>f ≥ 0</Code> (already{' '}
            <Code>d₂ &gt; 0</Code>, and skewing only adds a non-negative amount) — so the binding constraint is{' '}
            <Code>f = 4</Code>: <Code>(1,−4) → (1,0)</Code>, <Code>(3,2) → (3, 2+12) = (3,14)</Code>.
          </p>
          <p className="text-sm mb-1">
            <strong>(b)</strong> Any <Code>f ≥ 4</Code> works — <Code>f = 4, 5, 100, …</Code> all clear the{' '}
            <Code>(&lt;,&gt;)</Code> for <Code>(1,−4)</Code>, and larger <Code>f</Code> never re-introduces a negative{' '}
            <Code>d₂</Code> once it's non-negative. There is <strong>no</strong> upper limit on correctness — but larger{' '}
            <Code>f</Code> skews the iteration space into a thinner, more elongated parallelogram, which is bad for
            practice (worse locality, uglier bounds) even though it stays legal. <strong>Always pick the minimal{' '}
            <Code>f</Code></strong> — never more skew than the blocking dependence requires.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Answer:</Good> minimal <Code>f = 4</Code>; anything larger is still legal but only makes the
            parallelogram (and its bounds) worse for no correctness benefit.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Full derivation on a differently-shaped nest"
      statement={
        <>
          <p className="mb-2">
            For the nest below, find the minimal skew factor, then derive the skewed loop complex (index recovery and
            bounds) — before any interchange.
          </p>
          <Pre>{`for (p = 0; p <= n; p++)
  for (q = 0; q <= p; q++)
    h[p][q] = h[p-1][q] - h[p-1][q+2];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Dependences:</strong> <Code>h[p-1][q]</Code> ⇒ distance <Code>(1,0)</Code>; <Code>h[p-1][q+2]</Code>{' '}
            ⇒ distance <Code>(1,−2)</Code>. Only the second is <Code>(&lt;,&gt;)</Code>; it needs{' '}
            <Code>f ≥ 2</Code>. Check <Code>f = 2</Code> on <em>both</em> (skewing transforms every dependence, not just
            the blocker): <Code>(1,0) → (1, 0+2) = (1,2)</Code> and <Code>(1,−2) → (1, −2+2) = (1,0)</Code> —{' '}
            <Good>neither is (&lt;,&gt;), f = 2 clears both.</Good>
          </p>
          <p className="text-sm mb-1">
            The loop is already normalized (<Code>p, q</Code> start at 0). Skew goal: <Code>pₛ = p</Code>,{' '}
            <Code>qₛ = q + f·p = q + 2p</Code> ⇒ recovery <Code>p = pₛ</Code>, <Code>q = qₛ − 2pₛ</Code>.
          </p>
          <p className="text-sm mb-1">Substitute into <Code>0 ≤ p ≤ n</Code>, <Code>0 ≤ q ≤ p</Code>:</p>
          <Formula>{`0 ≤ pₛ ≤ n
0 ≤ qₛ − 2pₛ ≤ pₛ   ⟹   2pₛ ≤ qₛ ≤ 3pₛ`}</Formula>
          <Pre>{`for (ps = 0; ps <= n; ps++)
  for (qs = 2*ps; qs <= 3*ps; qs++) {
    p = ps;  q = qs - 2*ps;
    h[p][q] = h[p-1][q] - h[p-1][q+2];
  }`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Correct.</Good> Note the skew factor <Code>f = 2</Code> shows up directly as the <Code>2·ps</Code>{' '}
            shift in <Code>qₛ</Code>'s bounds — each successive row of the space is shifted right by{' '}
            <em>twice</em> its row index, a steeper slant than the <Code>f = 1</Code> case.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Skew, interchange, and re-verify from scratch"
      statement={
        <>
          <p className="mb-2">
            Continue Q4: (a) interchange the skewed nest so <Code>qₛ</Code> is outer, giving correct{' '}
            <Code>max</Code>/<Code>min</Code> bounds. (b) Independently re-derive the distance vector of both original
            dependences <em>in the interchanged skewed nest</em> and confirm neither is <Code>(&lt;,&gt;)</Code> — don't
            just trust the earlier calculation.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a) Interchange.</strong> From <Code>2pₛ ≤ qₛ ≤ 3pₛ</Code> solve for <Code>pₛ</Code>:{' '}
            <Code>qₛ/3 ≤ pₛ ≤ qₛ/2</Code>. Combined with <Code>0 ≤ pₛ ≤ n</Code>, and <Code>qₛ</Code> ranging{' '}
            <Code>0 … 3n</Code>:
          </p>
          <Pre>{`for (qs = 0; qs <= 3*n; qs++)
  for (ps = max(0, ceil(qs/3)); ps <= min(n, floor(qs/2)); ps++) {
    p = ps;  q = qs - 2*ps;
    h[p][q] = h[p-1][q] - h[p-1][q+2];
  }`}</Pre>
          <p className="text-sm mb-1">
            (Integer division needs the explicit <Code>ceil</Code>/<Code>floor</Code> here because <Code>qₛ</Code> is
            not always a multiple of 2 or 3 — unlike Q4's worked example where the bare fractions sufficed.)
          </p>
          <p className="text-sm mb-1">
            <strong>(b) Re-derive independently.</strong> In the <em>interchanged skewed</em> nest, the outer loop is now{' '}
            <Code>qₛ</Code>, inner is <Code>pₛ</Code> — so a fresh distance vector is <Code>(Δqₛ, Δpₛ)</Code>, in that
            order. Q4's post-skew distances, in original <Code>(pₛ,qₛ)</Code> order, are <Code>(1,2)</Code> (from{' '}
            <Code>(1,0)</Code>) and <Code>(1,0)</Code> (from <Code>(1,−2)</Code>) — recomputed above, not just assumed.
            Swap the two components for the new loop order:
          </p>
          <Formula>{`(pₛ,qₛ)-order (1,2), (1,0)  →  (qₛ,pₛ)-order (2,1), (0,1)`}</Formula>
          <Panel className="text-sm leading-relaxed mt-1">
            Both are lexicographically positive — <Code>(2,1)</Code> is <Code>(&lt;,&lt;)</Code>, <Code>(0,1)</Code> is{' '}
            <Code>(=,&lt;)</Code> — neither is <Code>(&lt;,&gt;)</Code>. <Good>Confirmed independently:</Good> the
            interchange is legal, matching what skewing promised. <strong>Why this check matters:</strong> skewing
            guarantees no <Code>(&lt;,&gt;)</Code> in the <em>pre-interchange</em> order; verifying it survives{' '}
            <em>after</em> swapping the two loop roles is a separate, necessary step — algebraically it always will
            (that's the theorem), but re-deriving it by hand here confirms no bookkeeping slip crept into (a).
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
  { id: 'norm', label: 'Normalization blocks interchange', render: () => <NormSection /> },
  { id: 'transform', label: 'The skew transform', render: () => <TransformSection /> },
  { id: 'full', label: 'Full worked example', render: () => <FullSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function LoopSkewingStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 4 · §4.6 · Loop Skewing"
      title="Loop Skewing"
      subtitle="Normalization can turn a dependence into the forbidden (<,>) direction and block loop interchange. Skewing re-slants the iteration space — (i,j) → (i, j+f·i), so a distance (d1,d2) becomes (d1, d2+f·d1) — to remove the (<,>) and make interchange possible again, at the cost of adjusted indices and max/min loop bounds."
      tabs={tabs}
    />
  )
}
