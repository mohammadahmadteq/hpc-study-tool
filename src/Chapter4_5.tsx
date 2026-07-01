import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'
import {
  Code,
  Pre,
  Formula,
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
      Five exam-style problems on §4.5, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Is reversal legal here?"
      statement={
        <>
          <p className="mb-2">May this loop be reversed? Justify, and write the reversed loop if so.</p>
          <Pre>{`for (i = 0; i < n; i++)
  a[i] = b[i] * 2 + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Check for loop-carried dependences.</strong> Iteration <Code>i</Code> writes <Code>a[i]</Code> and
            reads only <Code>b[i]</Code> — no iteration reads or writes another iteration's data. The loop carries{' '}
            <strong>no</strong> dependence.
          </p>
          <Pre>{`for (i = n-1; i >= 0; i--)
  a[i] = b[i] * 2 + 1;`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Legal.</Good> With no loop-carried dependence, iteration order is irrelevant, so running backward
            produces exactly the same array <Code>a</Code>.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="When reversal breaks"
      statement={
        <>
          <p className="mb-2">Explain why this loop may <em>not</em> be reversed.</p>
          <Pre>{`for (i = 1; i < n; i++)
  a[i] = a[i-1] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <Panel className="text-sm leading-relaxed">
            <Bad>Illegal.</Bad> The loop carries a flow dependence of distance <Code>1</Code>: <Code>a[i]</Code> uses{' '}
            <Code>a[i−1]</Code> from the previous iteration. Reversal <strong>negates</strong> the distance to{' '}
            <Code>−1</Code>, so a backward run would compute <Code>a[i]</Code> before <Code>a[i−1]</Code> exists — reading
            an old/uninitialised value. Reversal is correct only when the loop carries <strong>no</strong> dependence.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Effect on the distance vector"
      statement={
        <>
          <p className="mb-2">
            A single loop over <Code>i</Code> has a dependence with distance <Code>2</Code>. (a) What does reversal do to
            this distance? (b) Is reversal legal? (c) State the general rule reversal has on dependence distances.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> Reversal negates the distance: <Code>2 → −2</Code>.{' '}
            <strong>(b)</strong> <Bad>Illegal</Bad> — a nonzero distance means the loop <em>carries</em> a dependence, and
            after negation the source would run after the target.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(c)</strong> Loop reversal <strong>negates every dependence distance</strong> the loop carries.
            Therefore it is correct only when the loop carries no dependence (all carried distances are <Code>0</Code>, i.e.
            none) — otherwise a positive distance flips negative and is violated.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Reverse to enable fusion"
      statement={
        <>
          <p className="mb-2">
            Show that these two loops cannot be fused as written, then use loop reversal to make fusion legal and give the
            fused loop.
          </p>
          <Pre>{`for (i = 0; i <= n; i++) {
  a[i] = b[i] + 1;
  c[i] = a[i] / 2;
}
for (i = 0; i <= n; i++)
  d[i] = c[i+1] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Blocked forward.</strong> Fusing directly, <Code>d[i] = c[i+1] + 1</Code> would read{' '}
            <Code>c[i+1]</Code> before the first body writes it at iteration <Code>i+1</Code> — a backward{' '}
            <Code>body-2 → body-1</Code> dependence (the §4.2 trap). Illegal.
          </p>
          <p className="text-sm mb-1">
            <strong>Reverse both loops</strong> (neither carries a dependence), then fuse:
          </p>
          <Pre>{`for (i = n; i > 0; i--) {
  a[i] = b[i] + 1;
  c[i] = a[i] / 2;
  d[i] = c[i+1] + 1;
}`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Legal.</Good> In the reversed order iteration <Code>i+1</Code> runs before iteration <Code>i</Code>, so{' '}
            <Code>c[i+1]</Code> is already computed when <Code>d[i]</Code> reads it. The forward reference has become a
            backward one in execution order, so the fused body is correct.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Reverse only one of two loops?"
      statement={
        <>
          <p className="mb-2">
            In Q4 both loops were reversed. Suppose you reverse <strong>only the second</strong> loop and leave the first
            counting up. (a) Is each loop individually still legal? (b) Can the two loops now be fused? Explain carefully.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> Yes — each loop carries no dependence, so reversing either one in isolation is legal and
            computes the same arrays.
          </p>
          <p className="text-sm mb-1">
            <strong>(b)</strong> <Bad>No, they cannot be fused.</Bad> Fusion requires <em>both</em> bodies to iterate in
            the <strong>same</strong> direction over the same index so they can share one header. With the first loop
            ascending (<Code>i = 0 … n</Code>) and the second descending (<Code>i = n … 0</Code>), there is no common loop
            counter to merge them under.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Point:</Good> reversal enables fusion here only because we reverse <strong>both</strong> loops — that
            simultaneously (i) keeps a common iteration direction and (ii) turns the forward reference{' '}
            <Code>c[i+1]</Code> into a satisfied backward one. Reversing just one achieves neither jointly.
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
