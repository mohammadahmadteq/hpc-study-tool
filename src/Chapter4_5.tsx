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
 *  Chapter 4 · §4.5 — Loop Reversal   (PDF 198–199)
 *  Running a loop backward: legal iff no loop-carried dependence,
 *  effect = distances negated, used as an enabler for fusion.
 * ------------------------------------------------------------------ */

/* ================================================================== *
 *  Tab 1 · What & why  (distance-negation interactive)
 * ================================================================== */

const ReversalDemo: React.FC = () => {
  const n = 6
  const [carried, setCarried] = useState(true) // a[i] = a[i-1] + 1  vs  a[i] = b[i] + 1
  // dependence distance 1 when carried, none otherwise
  const arrows = carried // arrow from i-1 -> i

  const row = (reversed: boolean) => {
    const idx = reversed ? Array.from({ length: n }, (_, k) => n - 1 - k) : Array.from({ length: n }, (_, k) => k)
    // an arrow (i-1)->(i) is respected iff i-1 is processed before i
    const posOf: Record<number, number> = {}
    idx.forEach((v, p) => (posOf[v] = p))
    const violated = arrows && idx.some((i) => i >= 1 && posOf[i - 1] > posOf[i])
    return (
      <div className="mb-2">
        <div className="text-xs font-semibold text-muted-foreground mb-1">
          {reversed ? 'reversed: i = n … 0' : 'forward: i = 0 … n'}
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          {idx.map((i, p) => (
            <React.Fragment key={i}>
              <div className="w-9 h-9 rounded-md border bg-muted flex flex-col items-center justify-center text-[11px] font-mono">
                <span>i={i}</span>
                <span className="text-[8px] text-muted-foreground">#{p}</span>
              </div>
              {p < n - 1 && <span className="text-muted-foreground text-xs">→</span>}
            </React.Fragment>
          ))}
        </div>
        {arrows && (
          <div className={cn('text-[13px] mt-1', violated ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
            {violated ? (
              <>✗ dependence <Code>a[i] ← a[i−1]</Code> violated — target processed before its source</>
            ) : (
              <>✓ dependence <Code>a[i] ← a[i−1]</Code> respected — source before target</>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">loop body:</span>
        <Button size="sm" variant={carried ? 'outline' : 'default'} onClick={() => setCarried(false)}>
          a[i] = b[i] + 1 (independent)
        </Button>
        <Button size="sm" variant={carried ? 'default' : 'outline'} onClick={() => setCarried(true)}>
          a[i] = a[i-1] + 1 (carried)
        </Button>
      </div>
      {row(false)}
      {row(true)}
      <Panel className="text-sm leading-relaxed mt-1">
        {carried ? (
          <>
            <Bad>Reversal illegal.</Bad> The loop carries a dependence of distance <Code>1</Code>. Running backward{' '}
            <strong>negates</strong> it to <Code>−1</Code>: the target <Code>a[i]</Code> is now computed before its
            source <Code>a[i−1]</Code>, so the value is wrong.
          </>
        ) : (
          <>
            <Good>Reversal legal.</Good> Every iteration is independent (no loop-carried dependence), so the order of
            iterations does not matter — forward or backward gives the same result.
          </>
        )}
      </Panel>
    </div>
  )
}

const IntroSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Running a loop backward</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>Loop reversal</strong> processes the iterations in <strong>reversed order</strong> — counting down
          instead of up:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">before</div>
            <Pre>{`for (i = 0; i <= n; i++)
  loop-body;`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after reversal</div>
            <Pre>{`for (i = n; i >= 0; i--)
  loop-body;`}</Pre>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The rule, the effect, the point</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-3">
          <Panel className="my-0">
            <Tag tone="good">Correct when</Tag>
            <p className="text-sm mt-1.5">the loop carries <strong>no dependences</strong> — only then is iteration
            order irrelevant.</p>
          </Panel>
          <Panel className="my-0">
            <Tag>Effect</Tag>
            <p className="text-sm mt-1.5">dependence <strong>distances are negated</strong> (a distance <Code>d</Code>{' '}
            becomes <Code>−d</Code>).</p>
          </Panel>
          <Panel className="my-0">
            <Tag tone="good">Why bother</Tag>
            <p className="text-sm mt-1.5">it is an <strong>enabler</strong>: reversing a loop can unlock a later
            transformation (e.g. fusion).</p>
          </Panel>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">See the rule — negate the distance</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Toggle whether the body carries a dependence, and compare forward vs reversed traversal. A carried dependence's
          arrow gets reversed when you run backward — breaking it.
        </p>
        <ReversalDemo />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · Reverse to enable fusion  (the worked example)
 * ================================================================== */

const revSteps: StepPanel[] = [
  {
    title: '0 · Two loops we would like to fuse',
    body: (
      <>
        <Pre>{`for (i = 0; i <= n; i++) {
  a[i] = b[i] + 1;
  c[i] = a[i] / 2;
}
for (i = 0; i <= n; i++)
  d[i] = c[i+1] + 1;`}</Pre>
        <p className="text-sm">
          We'd like the second loop fused into the first for locality. But <Code>d[i] = c[i+1] + 1</Code> reads{' '}
          <Code>c[i+1]</Code>…
        </p>
      </>
    ),
  },
  {
    title: '1 · Forward fusion is blocked',
    body: (
      <>
        <p className="text-sm mb-1">
          If we fused directly (forward), at iteration <Code>i</Code> the statement <Code>d[i] = c[i+1] + 1</Code> would
          read <Code>c[i+1]</Code>, which the first body writes only at iteration <Code>i+1</Code> (later). That is the{' '}
          <strong>c[i+1] trap</strong> from §4.2:
        </p>
        <Formula>{`forward:  read c[i+1]  BEFORE  write c[i+1]   →  stale value  ✗`}</Formula>
        <p className="text-sm">So naive fusion is illegal. We first change the traversal direction.</p>
      </>
    ),
  },
  {
    title: '2 · Reverse both loops',
    body: (
      <>
        <p className="text-sm mb-1">
          Neither loop carries a dependence, so both may be reversed:
        </p>
        <Pre>{`for (i = n; i >= 0; i--) {
  a[i] = b[i] + 1;
  c[i] = a[i] / 2;
}
for (i = n; i >= 0; i--)
  d[i] = c[i+1] + 1;`}</Pre>
        <p className="text-sm">
          Now iterations run <Code>n, n−1, …, 0</Code>. When <Code>d[i]</Code> reads <Code>c[i+1]</Code>, iteration{' '}
          <Code>i+1</Code> has <strong>already</strong> run (it came earlier in the reversed order) — the value is fresh.
        </p>
      </>
    ),
  },
  {
    title: '3 · Now fuse',
    body: (
      <>
        <Pre>{`for (i = n; i > 0; i--) {
  a[i] = b[i] + 1;
  c[i] = a[i] / 2;
  d[i] = c[i+1] + 1;
}`}</Pre>
        <Panel className="text-sm leading-relaxed">
          <Good>Legal &amp; local.</Good> Reversal turned the forward reference <Code>c[i+1]</Code> into a{' '}
          <em>backward</em> one in execution order, so the producer runs before the consumer inside one iteration. The
          two loops collapse into a single fused loop — exactly the payoff of the reversal.
        </Panel>
        <p className="text-xs text-muted-foreground mt-2">
          Reversal on its own does not speed anything up here; its value is that it <strong>enabled</strong> the fusion.
        </p>
      </>
    ),
  },
]

const FusionSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reversal as an enabler for fusion</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The most common use of reversal is to <strong>line up dependences</strong> so another transformation becomes
          legal. Here a forward array reference <Code>c[i+1]</Code> blocks fusion — until we run both loops backward.
        </p>
        <Stepper steps={revSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · Questions
 * ================================================================== */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on §4.5, easy → hardest — all on <em>fresh</em> code, not the lecture examples. Q1 is
      fully worked to set the pattern; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Two references, two verdicts — check both"
      statement={
        <>
          <p className="mb-2">
            The loop below has two array references. Check <em>each</em> for a loop-carried dependence separately, then
            give the overall verdict on reversal.
          </p>
          <Pre>{`for (i = 0; i < n; i++) {
  s[i] = t[i] + 1;
  u[i] = s[i] * v[i];
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Reference by reference.</strong> A dependence is loop-<em>carried</em> only if it crosses iterations
            (nonzero distance in <Code>i</Code>):
          </p>
          <Table
            head={['Reference', 'Same iteration or across?', 'Carried?']}
            rows={[
              [<><Code>t[i]</Code> read by <Code>s[i]</Code></>, 'both index i — same iteration', 'no (distance 0)'],
              [<><Code>s[i]</Code> written then read by <Code>u[i]</Code></>, 'both index i — same iteration', 'no (distance 0)'],
              [<><Code>v[i]</Code> read by <Code>u[i]</Code></>, 'same iteration', 'no'],
            ]}
          />
          <p className="text-sm mb-1">
            Every dependence here is <strong>loop-independent</strong> (distance 0, entirely within one iteration) — none
            is carried across iterations. Reversal only ever needs to negate <em>carried</em> distances; there are none
            to negate.
          </p>
          <Pre>{`for (i = n-1; i >= 0; i--) {
  s[i] = t[i] + 1;
  u[i] = s[i] * v[i];
}`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Legal.</Good> Each iteration is a self-contained unit of work reading only that iteration's data —
            running the iterations in any order, including reversed, computes the same result.{' '}
            <Good>Pattern for Q2–Q5:</Good> check every reference's distance, not just "does <Code>i</Code> appear
            twice" — a same-index reference is always distance 0 and never blocks reversal.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="A carried dependence hiding behind unrelated code"
      statement={
        <>
          <p className="mb-2">
            One statement in this loop carries a dependence; the other does not. Identify which, and decide whether the
            whole loop may be reversed.
          </p>
          <Pre>{`for (i = 1; i < n; i++) {
  y[i] = x[i] - x[i-1];
  z[i] = w[i] * 2;
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <Code>y[i] = x[i] - x[i-1]</Code> only <em>reads</em> two elements of <Code>x</Code> — it never writes{' '}
            <Code>x</Code>, so despite the <Code>i</Code> / <Code>i−1</Code> pattern there is <strong>no dependence at
            all</strong> here (two reads never conflict). <Code>z[i] = w[i] * 2</Code> is entirely local to iteration{' '}
            <Code>i</Code>.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Legal.</Good> Neither statement carries a dependence (the first only reads across iterations, which is
            always safe), so the whole loop may be reversed:
            <Pre>{`for (i = n-1; i >= 1; i--) {
  y[i] = x[i] - x[i-1];
  z[i] = w[i] * 2;
}`}</Pre>
            <strong>Trap to avoid:</strong> seeing <Code>x[i-1]</Code> next to <Code>x[i]</Code> and assuming a
            dependence — a dependence needs a <em>write</em> on at least one side.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Distance vector in a 2-D loop — which dimension blocks reversal of which loop?"
      statement={
        <>
          <p className="mb-2">
            This nest has a single dependence with distance vector <Code>(0, 3)</Code> in <Code>(i, j)</Code> order. (a)
            May the <Code>i</Code>-loop alone be reversed? (b) May the <Code>j</Code>-loop alone be reversed? (c) Give the
            new distance vector for whichever reversal(s) are legal.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Reversing a single loop in a nest negates <strong>only that loop's</strong> component of every distance
            vector; the other components are untouched.
          </p>
          <p className="text-sm mb-1">
            <strong>(a) Reverse <Code>i</Code>:</strong> its component is already <Code>0</Code> — negating 0 gives 0.
            The vector stays <Code>(0, 3)</Code>, still lexicographically positive. <Good>Legal</Good> (unsurprising: a
            dependence not carried by a loop is indifferent to that loop's direction).
          </p>
          <p className="text-sm mb-1">
            <strong>(b) Reverse <Code>j</Code>:</strong> its component is <Code>3 ≠ 0</Code> — the dependence <em>is</em>{' '}
            carried by <Code>j</Code>. Negating gives <Code>(0, −3)</Code>, lexicographically <em>negative</em>.{' '}
            <Bad>Illegal.</Bad>
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(c)</strong> Only the <Code>i</Code>-reversal is legal, and it leaves the vector unchanged at{' '}
            <Code>(0, 3)</Code> (reversing a loop that carries nothing is a legal no-op on the dependence, though it
            still changes the physical access order — useful e.g. to fix locality without touching correctness).{' '}
            <strong>Rule:</strong> in a nest, ask "does <em>this specific</em> loop carry the dependence?" — only its own
            distance component matters for its own legality.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Reversal unlocks interchange, not fusion"
      statement={
        <>
          <p className="mb-2">
            This nest has one dependence, distance vector <Code>(1, −1)</Code> in <Code>(i, j)</Code> order — direction{' '}
            <Code>(&lt;, &gt;)</Code>, the one case §4.4 forbids for interchange. (a) Show reversing the <Code>j</Code>{' '}
            loop changes the picture. (b) Is interchange now legal? (c) Give the final code (reversed + interchanged).
          </p>
          <Pre>{`for (i = 1; i < n; i++)
  for (j = 1; j < m; j++)
    g[i][j] = g[i-1][j+1] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> The <Code>j</Code>-component of the distance is <Code>−1 ≠ 0</Code>, so <Code>j</Code>{' '}
            does carry part of the dependence — reversing it is only legal if that's consistent with the whole vector
            staying lexicographically positive. Check: negate just the <Code>j</Code> entry: <Code>(1,−1) → (1, 1)</Code>.
            Still lexicographically positive (leading entry <Code>1 &gt; 0</Code>) ⇒ <Good>reversal of j is legal</Good>{' '}
            (the sign of the leading, <Code>i</Code>, entry is what's actually protecting correctness here).
          </p>
          <Pre>{`for (i = 1; i < n; i++)
  for (j = m-1; j >= 1; j--)     // j reversed
    g[i][j] = g[i-1][j+1] + 1;`}</Pre>
          <p className="text-sm mb-1">
            <strong>(b)</strong> New distance vector <Code>(1, 1)</Code> ⇒ direction <Code>(&lt;, &lt;)</Code> — not{' '}
            <Code>(&lt;,&gt;)</Code> anymore. <Good>Interchange is now legal</Good> (swap gives <Code>(&lt;,&lt;)</Code>{' '}
            again, still positive).
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(c)</strong> Reverse <Code>j</Code>, then interchange:
            <Pre>{`for (j = m-1; j >= 1; j--)
  for (i = 1; i < n; i++)
    g[i][j] = g[i-1][j+1] + 1;`}</Pre>
            <Good>Takeaway:</Good> reversal doesn't only enable fusion (§4.5's headline example) — here it repairs a{' '}
            <Code>(&lt;,&gt;)</Code> direction vector so <strong>interchange</strong> (§4.4) becomes legal too, the same
            role loop skewing plays in §4.6 by a different mechanism.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Reversal alone cannot always save a fusion — prove it"
      statement={
        <>
          <p className="mb-2">
            Someone claims that reversing both loops below (as in the lecture's <Code>c[i+1]</Code> example) will make
            fusion legal. (a) Try it and show the claim fails. (b) Diagnose exactly why this case differs from the
            lecture example. (c) State a general condition for when reversal-then-fuse works.
          </p>
          <Pre>{`for (i = 0; i <= n; i++)  e[i] = f[i] * 2;
for (i = 0; i <= n; i++)  g[i] = e[i-1] + e[i+1];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a) Try the reversal.</strong> Both loops carry no internal dependence, so both may be reversed:
          </p>
          <Pre>{`for (i = n; i >= 0; i--)  e[i] = f[i] * 2;
for (i = n; i >= 0; i--)  g[i] = e[i-1] + e[i+1];`}</Pre>
          <p className="text-sm mb-1">
            Attempt to fuse under a common descending header. The body now needs, at iteration <Code>i</Code>: read{' '}
            <Code>e[i-1]</Code> (not yet computed — comes <em>later</em> in the descending order) <em>and</em> read{' '}
            <Code>e[i+1]</Code> (already computed — came earlier). <strong>One</strong> of the two references is now
            satisfied, but the other (<Code>e[i-1]</Code>) is <Bad>not</Bad> — reversal fixed the forward reference but
            broke the backward one.
          </p>
          <p className="text-sm mb-1">
            <strong>(b) Why it differs.</strong> The lecture's <Code>c[i+1]</Code> example has <em>only one</em>{' '}
            problematic reference (a pure forward stencil). Here <Code>g[i]</Code> reads <strong>both</strong>{' '}
            neighbours of <Code>e</Code> — a symmetric stencil. Reversal flips which side is "ahead", but it can never
            put <em>both</em> neighbours ahead of the consumer at once — exactly the same obstruction as the symmetric
            stencil in §4.2's harder fusion questions.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(c) General condition:</strong> reversal-then-fuse repairs exactly <em>one</em> forward (or
            backward) reference by flipping execution order. It works when the blocking dependence is between the two
            loops in <strong>one direction only</strong>. When a consumer needs values from <em>both</em> sides of the
            producer (a symmetric access pattern), no single traversal direction satisfies both references
            simultaneously, and fusion by reversal alone is impossible — a genuinely different producer/consumer
            restructuring (e.g. extra buffering) would be needed instead.
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
  { id: 'fusion', label: 'Reverse to enable fusion', render: () => <FusionSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function LoopReversalStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 4 · §4.5 · Loop Reversal"
      title="Loop Reversal"
      subtitle="Running a loop backward. It is correct only when the loop carries no dependence — reversal negates every dependence distance, so a positive distance would flip negative and break. Its main use is as an enabler: reversing loops can line up references so a later transformation such as fusion becomes legal."
      tabs={tabs}
    />
  )
}
