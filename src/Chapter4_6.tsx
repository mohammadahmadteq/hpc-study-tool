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
      Five exam-style problems on §4.6, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Skew to enable interchange"
      statement={
        <>
          <p className="mb-2">
            A nest has dependence distances <Code>(1, 1)</Code> and <Code>(1, −1)</Code>. Find the smallest skew factor{' '}
            <Code>f</Code> that makes loop interchange legal, and give the resulting distances.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Interchange fails because <Code>(1,−1)</Code> is <Code>(&lt;,&gt;)</Code>. Skewing maps{' '}
            <Code>(d₁,d₂) → (d₁, d₂ + f·d₁)</Code>. Apply to both:
          </p>
          <Table
            head={['f', '(1,1) →', '(1,−1) →', 'legal?']}
            rows={[
              ['0', <Code>(1,1)</Code>, <Bad>(1,−1)</Bad>, <Bad>no</Bad>],
              ['1', <Code>(1,2)</Code>, <Code>(1,0)</Code>, <Good>yes</Good>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>f = 1.</Good> The distances become <Code>(1,2)</Code> and <Code>(1,0)</Code> — no <Code>(&lt;,&gt;)</Code>{' '}
            remains, so after skewing the loops can be interchanged. (This is the PDF's example{' '}
            <Code>a[i][j]=0.5·(a[i−1][j−1]+a[i−1][j+1])</Code>.)
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Why does normalization matter?"
      statement={
        <>
          <p className="mb-2">
            Before normalization a nest has distances <Code>(0,1)</Code> and <Code>(1,0)</Code> (interchangeable). After
            normalization they are <Code>(0,1)</Code> and <Code>(1,−1)</Code>. What happened, and what is the general
            lesson?
          </p>
        </>
      }
      solution={
        <>
          <Panel className="text-sm leading-relaxed">
            Normalization rewrote the index expressions, and the second distance changed from <Code>(1,0)</Code> to{' '}
            <Code>(1,−1)</Code> = <Code>(&lt;,&gt;)</Code> — the one direction vector for which interchange is illegal. So
            the normalized nest can <Bad>no longer</Bad> be interchanged.
            <div className="mt-1">
              <strong>Lesson:</strong> normalization is not free — it can <em>prevent</em> loop interchange. Loop skewing
              is the counter-move that restores it.
            </div>
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Compute skewed distances"
      statement={
        <>
          <p className="mb-2">
            A nest has distances <Code>(1, −2)</Code> and <Code>(2, −1)</Code>. (a) Which block interchange? (b) Give the
            distances after skewing with <Code>f = 1</Code> and with <Code>f = 2</Code>. (c) What is the smallest{' '}
            <Code>f</Code> that makes interchange legal?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> Both are <Code>(&lt;,&gt;)</Code> (positive outer, negative inner) ⇒ both block
            interchange.
          </p>
          <Table
            head={['original', 'f = 1', 'f = 2']}
            rows={[
              [<Code>(1, −2)</Code>, <Code>(1, −1)</Code>, <Code>(1, 0)</Code>],
              [<Code>(2, −1)</Code>, <Code>(2, 1)</Code>, <Code>(2, 3)</Code>],
            ]}
          />
          <p className="text-sm mb-1">
            Using <Code>(d₁, d₂ + f·d₁)</Code>. With <Code>f = 1</Code>, <Code>(1,−2)→(1,−1)</Code> is still{' '}
            <Code>(&lt;,&gt;)</Code> — <Bad>not enough</Bad>. With <Code>f = 2</Code>, they become <Code>(1,0)</Code> and{' '}
            <Code>(2,3)</Code> — <Good>neither is (&lt;,&gt;)</Good>.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(c)</strong> The smallest legal factor is <Good>f = 2</Good>. (For a distance <Code>(d₁,d₂)</Code>{' '}
            with <Code>d₂ &lt; 0</Code> we need <Code>d₂ + f·d₁ ≥ 0</Code>, i.e. <Code>f ≥ ⌈−d₂/d₁⌉</Code>; the binding one
            is <Code>(1,−2)</Code> ⇒ <Code>f ≥ 2</Code>.)
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Derive the skewed index and bounds"
      statement={
        <>
          <p className="mb-2">
            For the nest below, skew with <Code>f = 1</Code> and give the skewed loop complex (index recovery and bounds),
            before any interchange.
          </p>
          <Pre>{`for (i = 2; i <= n; i++)
  for (j = 2; j <= m; j++)
    a[i][j] = 0.5 * (a[i-1][j-1] + a[i-1][j+1]);`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Normalized: <Code>i = iₙ+2</Code>, <Code>j = jₙ+2</Code>. Skew goal: <Code>iₛ = iₙ</Code>,{' '}
            <Code>jₛ = jₙ + iₙ</Code> ⇒ recovery <Code>i = iₛ+2</Code>, <Code>j = jₛ − iₛ + 2</Code>.
          </p>
          <p className="text-sm mb-1">Substituting into <Code>2 ≤ i ≤ n</Code>, <Code>2 ≤ j ≤ m</Code>:</p>
          <Formula>{`0  ≤ iₛ ≤ n − 2
iₛ ≤ jₛ ≤ m + iₛ − 2`}</Formula>
          <Pre>{`for (is = 0; is <= n-2; is++)
  for (js = is; js <= m + is - 2; js++) {
    i = is + 2;  j = js - is + 2;
    a[i][j] = 0.5 * (a[i-1][j-1] + a[i-1][j+1]);
  }`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Correct.</Good> The inner bound <Code>jₛ ≥ iₛ</Code> encodes the skew: each row of the space is shifted
            right by <Code>iₛ</Code>.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Skew, then interchange with max/min bounds"
      statement={
        <>
          <p className="mb-2">
            Continue Q4: interchange the skewed nest so <Code>jₛ</Code> is the outer loop, and give the final loop complex
            with correct bounds. Explain where the <Code>max</Code> and <Code>min</Code> come from.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            From <Code>iₛ ≤ jₛ ≤ m + iₛ − 2</Code> we solve for <Code>iₛ</Code>: <Code>jₛ − m + 2 ≤ iₛ ≤ jₛ</Code>. Combine
            with <Code>0 ≤ iₛ ≤ n − 2</Code>. The outer <Code>jₛ</Code> then ranges over <Code>0 … m + n − 4</Code>:
          </p>
          <Pre>{`for (js = 0; js <= m + n - 4; js++)
  for (is = max(0, js-m+2); is <= min(js, n-2); is++) {
    i = is + 2;  j = js - is + 2;
    a[i][j] = 0.5 * (a[i-1][j-1] + a[i-1][j+1]);
  }`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>Where max/min come from:</strong> the inner index must satisfy <em>both</em> pairs of bounds at once.
            The lower bound is the <Code>max</Code> of the two lower limits (<Code>0</Code> and <Code>jₛ−m+2</Code>); the
            upper bound is the <Code>min</Code> of the two upper limits (<Code>jₛ</Code> and <Code>n−2</Code>). Geometrically
            they clip the inner run to the <strong>parallelogram</strong> the skew produced.
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
