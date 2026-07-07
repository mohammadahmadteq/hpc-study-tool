import React from 'react'
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
  FlowGraph,
  QuestionCard,
  StudyShell,
  type StepPanel,
  type GNode,
  type GEdge,
  type TabDef,
} from './components/study/kit'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'

/* ------------------------------------------------------------------ *
 *  Chapter 4 · Exam Practice — 10 written-exam problems covering all
 *  of §4.1–§4.9 (reordering, unswitching/splitting, fusion, fission,
 *  interchange, reversal, skewing, strip mining, tiling, locality).
 *  Q3, Q4, Q7, Q8, Q10 are the original sheet questions (Ex 7.1, 6.2,
 *  7.2, 7.3, 8.1); the rest are new problems in the same style.
 * ------------------------------------------------------------------ */

/* ---- coloured δ-dependence tags (matches §3.1 / §4) --------------- */

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

/* ---- points banner ----------------------------------------------- */

const Pts: React.FC<{ split: string; total: number }> = ({ split, total }) => (
  <div className="flex justify-end mb-2">
    <Tag>{split} = {total} points</Tag>
  </div>
)

/* ================================================================== *
 *  Q1 — statement-reordering DDG                                      *
 * ================================================================== */

const reorderNodes: GNode[] = [
  { id: 'S1', x: 40, y: 40, label: 'S₁' },
  { id: 'S2', x: 40, y: 120, label: 'S₂' },
  { id: 'S3', x: 150, y: 40, label: 'S₃' },
  { id: 'S4', x: 150, y: 120, label: 'S₄' },
]
const reorderEdges: GEdge[] = [
  { from: 'S1', to: 'S2', label: 'δᵗ b[i]' },
  { from: 'S3', to: 'S4', label: 'δᵗ c[i]' },
]

/* ================================================================== *
 *  Q4 (Ex 6.2) — strip-mining iteration spaces                        *
 * ================================================================== */

/* 1-D line: i = 0…15, arrow i → i+3 (flow distance 3) */
const lineNodes: GNode[] = Array.from({ length: 16 }, (_, i) => ({
  id: `i${i}`,
  x: 20 + i * 30,
  y: 24,
  label: String(i),
  r: 11,
}))
const lineEdges: GEdge[] = Array.from({ length: 13 }, (_, i) => ({ from: `i${i}`, to: `i${i + 3}`, bend: -22 }))

/* 2-D strip grid: is (0…3) × ii (0…4), cell valid iff 5·is+ii ≤ 15 */
const StripGrid: React.FC = () => {
  const mL = 46
  const mT = 22
  const colGap = 74
  const rowGap = 42
  const X = (is: number) => mL + is * colGap
  const Y = (ii: number) => mT + ii * rowGap
  const pos = (i: number) => ({ x: X(Math.floor(i / 5)), y: Y(i % 5) })
  const valid = (i: number) => i <= 15
  const W = X(3) + 46
  const H = Y(4) + 40
  const within = '#0ea5e9'
  const cross = '#f43f5e'
  const fg = 'var(--color-foreground)'
  const mut = 'var(--color-muted-foreground)'
  return (
    <div className="my-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mx-auto block select-none" style={{ height: 'auto', maxWidth: 360 }}>
        <defs>
          <marker id="swin" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill={within} />
          </marker>
          <marker id="scro" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill={cross} />
          </marker>
        </defs>
        {/* axis labels */}
        <text x={W - 4} y={H - 6} textAnchor="end" fontSize="11" fontStyle="italic" fill={mut}>is (strip)</text>
        <text x={6} y={14} fontSize="11" fontStyle="italic" fill={mut}>ii</text>
        {[0, 1, 2, 3].map((is) => (
          <text key={`cx${is}`} x={X(is)} y={H - 6} textAnchor="middle" fontSize="10" fill={mut}>{is}</text>
        ))}
        {[0, 1, 2, 3, 4].map((ii) => (
          <text key={`cy${ii}`} x={mL - 18} y={Y(ii) + 3} textAnchor="middle" fontSize="10" fill={mut}>{ii}</text>
        ))}
        {/* dependence arrows i → i+3 */}
        {Array.from({ length: 13 }, (_, i) => i).map((i) => {
          if (!valid(i) || !valid(i + 3)) return null
          const a = pos(i)
          const b = pos(i + 3)
          const crossing = i % 5 > 1
          const col = crossing ? cross : within
          // shorten to node edges
          const dx = b.x - a.x
          const dy = b.y - a.y
          const L = Math.hypot(dx, dy) || 1
          const ux = dx / L
          const uy = dy / L
          return (
            <line
              key={`e${i}`}
              x1={a.x + ux * 13}
              y1={a.y + uy * 13}
              x2={b.x - ux * 15}
              y2={b.y - uy * 15}
              stroke={col}
              strokeWidth={1.7}
              markerEnd={`url(#${crossing ? 'scro' : 'swin'})`}
            />
          )
        })}
        {/* cells */}
        {Array.from({ length: 16 }, (_, i) => {
          const p = pos(i)
          return (
            <g key={`c${i}`}>
              <circle cx={p.x} cy={p.y} r={12} fill="var(--color-card)" stroke={fg} strokeWidth={1.4} />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fontFamily="ui-monospace, monospace" fill={fg}>{i}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex justify-center gap-4 text-[11px] text-muted-foreground mt-1">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-[2px]" style={{ background: within }} /> within strip (0, 3)</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-[2px]" style={{ background: cross }} /> crossing (1, −2)</span>
      </div>
    </div>
  )
}

/* ================================================================== *
 *  Q8 (Ex 7.3) — loop skewing derivation                              *
 * ================================================================== */

const skewSteps: StepPanel[] = [
  {
    title: '1 · Distance vectors of the original nest',
    body: (
      <>
        <p className="text-sm mb-1">
          Write <Code>a[i][j-1]</Code>; find the source iteration of each read (write <Code>a[i'][j'-1]</Code> = read):
        </p>
        <Table
          head={['Read', 'source (i′, j′)', 'd = sink − source', 'θ']}
          rows={[
            [<Code>a[i-2][j+2]</Code>, '(i−2, j+3)', '(2, −3)', '(<, >)'],
            [<Code>a[i-1][j]</Code>, '(i−1, j+1)', '(1, −1)', '(<, >)'],
            [<Code>a[i-1][j-1]</Code>, '(i−1, j)', '(1, 0)', '(<, =)'],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Two vectors have direction <Code>(&lt;, &gt;)</Code> — exactly the pattern that makes loop interchange{' '}
          <Bad>illegal</Bad>.
        </p>
      </>
    ),
  },
  {
    title: '2 · Skewing transforms the second component',
    body: (
      <>
        <p className="text-sm mb-1">
          Skew the inner index by the outer one: <Code>j′ = j + f·i</Code>. A distance vector transforms as
        </p>
        <Formula>{`(d₁, d₂)  ↦  (d₁, d₂ + f·d₁)`}</Formula>
        <p className="text-sm">
          To enable interchange every vector must lose its <Code>(&lt;, &gt;)</Code> shape, i.e. we need{' '}
          <Code>d₂ + f·d₁ ≥ 0</Code> for <em>all</em> dependences (all have <Code>d₁ ≥ 1</Code>).
        </p>
      </>
    ),
  },
  {
    title: '3 · Smallest feasible skewing factor',
    body: (
      <>
        <Table
          head={['d', 'condition d₂ + f·d₁ ≥ 0', 'needs']}
          rows={[
            ['(2, −3)', '−3 + 2f ≥ 0', 'f ≥ 1.5'],
            ['(1, −1)', '−1 + f ≥ 0', 'f ≥ 1'],
            ['(1, 0)', '0 + f ≥ 0', 'f ≥ 0'],
          ]}
        />
        <Formula>{`smallest integer f with f ≥ 1.5   ⇒   f = 2`}</Formula>
        <p className="text-sm">After skewing with f = 2 the distances become</p>
        <Formula>{`(2,−3) ↦ (2, 1)     (1,−1) ↦ (1, 1)     (1, 0) ↦ (1, 2)`}</Formula>
        <p className="text-sm">— all <Code>(&lt;, &lt;)</Code>, so no <Code>(&lt;, &gt;)</Code> remains ⇒ interchange is now legal.</p>
      </>
    ),
  },
  {
    title: '4 · The skewed loop nest (J = j + 2·i)',
    body: (
      <>
        <p className="text-sm mb-1">
          Substitute <Code>j = J − 2·i</Code>. For fixed <Code>i</Code>, <Code>j ∈ [1, m−1]</Code> ⇒{' '}
          <Code>J ∈ [2i+1, 2i+m−1]</Code>:
        </p>
        <Pre>{`for (i = 2; i < n; i++)
  for (J = 2*i + 1; J <= 2*i + m - 1; J++)
    a[i][J-2*i-1] = a[i-2][J-2*i+2]
                  + a[i-1][J-2*i]
                  + a[i-1][J-2*i-1];`}</Pre>
        <p className="text-sm">
          The loop body is unchanged in meaning — only the inner counter is renamed/shifted. Now interchanging the{' '}
          <Code>i</Code>- and <Code>J</Code>-loops (with the usual <Code>max/min</Code> bounds) is legal.
        </p>
      </>
    ),
  },
]

/* ================================================================== *
 *  Q10 (Ex 8.1) — loop tiling steps                                   *
 * ================================================================== */

const tileSteps: StepPanel[] = [
  {
    title: '1 · Tile origin from ⌊(lo − to)/ts⌋·ts + to',
    body: (
      <>
        <p className="text-sm mb-1">
          With <Code>ts = 128</Code>, <Code>to = 16</Code>, the first tile boundary ≤ the lower bound{' '}
          <Code>lo = 1</Code> is
        </p>
        <Formula>{`⌊(1 − 16)/128⌋·128 + 16 = (−1)·128 + 16 = −112`}</Formula>
        <p className="text-sm">
          So both tile loops start at <Code>−112</Code> and step by 128; the element loops are clamped with{' '}
          <Code>max</Code>/<Code>min</Code> to the real bounds.
        </p>
      </>
    ),
  },
  {
    title: '2 · Strip-mine both loops (order it, i, jt, j)',
    body: (
      <Pre>{`for (it = -112; it < 10000; it += 128)
  for (i = max(it, 1); i < min(it+128, 10000); i++)
    for (jt = ⌊(i-16)/128⌋*128 + 16; jt < 10000; jt += 128)
      for (j = max(jt, i); j < min(jt+128, 10000); j++)
        a[i][j] = a[i+1][j] + a[i][j+1];`}</Pre>
    ),
  },
  {
    title: '3 · Which dependences exist?',
    body: (
      <>
        <p className="text-sm mb-1">
          Write <Code>a[i][j]</Code>, read <Code>a[i+1][j]</Code> and <Code>a[i][j+1]</Code>. Each read touches a cell
          written in a <em>later</em> iteration ⇒ read-before-write = <strong>anti</strong>:
        </p>
        <Table
          head={['Read', 'written at', 'd', 'θ', 'type']}
          rows={[
            [<Code>a[i+1][j]</Code>, '(i+1, j)', '(1, 0)', '(<, =)', <Dep k="a">δᵃ anti</Dep>],
            [<Code>a[i][j+1]</Code>, '(i, j+1)', '(0, 1)', '(=, <)', <Dep k="a">δᵃ anti</Dep>],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Every cell is written once ⇒ no output dependence; nothing written is read later ⇒ no flow dependence. Both
          distance vectors are <strong>non-negative in every component</strong>.
        </p>
      </>
    ),
  },
  {
    title: '4 · Interchange the i-loop and the jt-loop',
    body: (
      <>
        <p className="text-sm mb-1">
          Push both tile loops outward (swap <Code>i</Code> and <Code>jt</Code>). Below-diagonal tiles are empty
          (<Code>j ≥ i</Code>), so <Code>jt</Code> may start at <Code>it</Code>:
        </p>
        <Pre>{`for (it = -112; it < 10000; it += 128)
  for (jt = it; jt < 10000; jt += 128)
    for (i = max(it, 1); i < min(it+128, 10000); i++)
      for (j = max(jt, i); j < min(jt+128, 10000); j++)
        a[i][j] = a[i+1][j] + a[i][j+1];`}</Pre>
      </>
    ),
  },
  {
    title: '5 · Do the dependences allow the interchange?',
    body: (
      <Panel className="text-sm leading-relaxed">
        <Good>Yes.</Good> Both distance vectors <Code>(1,0)</Code> and <Code>(0,1)</Code> are non-negative in every
        component, so the original nest is <strong>fully permutable</strong>. Strip mining preserves that property, and
        a fully permutable tiled nest may be reordered arbitrarily — in particular the <Code>i ↔ jt</Code> interchange
        is legal. (No dependence ever produces a <Code>(&lt;, &gt;)</Code> in the swapped positions.) This is exactly
        what makes tiling for cache blocking safe here.
      </Panel>
    ),
  },
]

/* ================================================================== *
 *  Questions 1–5                                                      *
 * ================================================================== */

const QuestionsA: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">How this section works</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Ten written-exam problems covering <strong>all of Chapter 4</strong> (§4.1 reordering · §4.2 fusion · §4.3
          distribution · §4.4 interchange · §4.5 reversal · §4.6 skewing · §4.7 strip mining · §4.8 tiling · §4.9
          locality), ordered easy → hardest, <strong>68 points</strong> total. Q3, Q4, Q7, Q8 and Q10 are the original
          exercise-sheet questions (Ex 7.1, 6.2, 7.2, 7.3, 8.1); the other five are new problems of the same style. Q1
          is fully worked — study its pattern first, then do each question on paper before revealing.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Tag>Q1–Q5 · reorder, reversal, unswitch, strip mine, interchange</Tag>
          <Tag>Q6–Q10 · fission, fusion, skewing, locality, tiling</Tag>
        </div>
      </CardContent>
    </Card>

    {/* ---------------------------------------------------------- Q1 */}
    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Statement reordering for locality (§4.1) · 4 P"
      statement={
        <>
          <Pts split="2 + 2" total={4} />
          <Pre>{`for (i = 1; i < n; i++) {
  S1: b[i] = a[i-1] + a[i];
  S2: x[i] = b[i] * b[i];
  S3: c[i] = a[i] + a[i+1];
  S4: y[i] = c[i] - 1;
}`}</Pre>
          <p className="mb-1">(a) Draw the data dependence graph of the loop body.</p>
          <p>
            (b) Reorder the statements to improve <strong>spatial/temporal locality</strong> of the array{' '}
            <Code>a</Code>, and argue that the reordering is legal.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 2 P</p>
          <p className="text-sm mb-1">
            Only two flow edges exist — <Code>S1 δᵗ S2</Code> (via <Code>b[i]</Code>) and <Code>S3 δᵗ S4</Code> (via{' '}
            <Code>c[i]</Code>). S1 and S3 both <em>read</em> <Code>a</Code> but never write it, so there is no edge
            between them; the two producer→consumer pairs are independent.
          </p>
          <FlowGraph nodes={reorderNodes} edges={reorderEdges} width={210} height={165} maxW={240} caption="two independent chains: S1→S2 and S3→S4" />
          <p className="text-sm font-medium mt-3 mb-1">(b) — 2 P</p>
          <p className="text-sm mb-1">
            S1 and S3 both touch <Code>a[i-1]</Code>, <Code>a[i]</Code>, <Code>a[i+1]</Code> — the same cache line.
            Placing them <strong>adjacent</strong> lets the second reuse the line the first loaded (temporal reuse),
            before it is evicted:
          </p>
          <Pre>{`for (i = 1; i < n; i++) {
  S1: b[i] = a[i-1] + a[i];
  S3: c[i] = a[i] + a[i+1];   // reuses a[i] (and the a[] line) right away
  S2: x[i] = b[i] * b[i];
  S4: y[i] = c[i] - 1;
}`}</Pre>
          <Panel className="text-sm leading-relaxed">
            <Good>Legal</Good>: the reordering keeps both dependence edges intact (S1 before S2, S3 before S4). Only
            statements with <em>no</em> dependence between them (S3 and S2) changed relative order — the DDG is
            respected, so the result is guaranteed equivalent.
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q2 */}
    <QuestionCard
      n={2}
      diff="Easy"
      title="Loop reversal — legality and as a fusion enabler (§4.5) · 4 P"
      statement={
        <>
          <Pts split="2 + 2" total={4} />
          <p className="text-xs font-semibold text-muted-foreground mb-1">(a) Which of these loops may be reversed? Justify.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Pre>{`// (i)
for (i = 1; i <= n; i++)
  a[i] = a[i] + b[i];`}</Pre>
            <Pre>{`// (ii)
for (i = 1; i < n; i++)
  a[i] = a[i+1] + 1;`}</Pre>
          </div>
          <p className="text-xs font-semibold text-muted-foreground mb-1 mt-2">
            (b) Use reversal to make the following pair fusable, then fuse them.
          </p>
          <Pre>{`for (i = 1; i <= n; i++)  a[i] = c[i] + 1;
for (i = n; i >= 1; i--)  b[i] = a[i] * 2;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 2 P</p>
          <Table
            head={['Loop', 'Carried dependence?', 'Reversible?']}
            rows={[
              ['(i)', 'none — a[i] uses only index i, b[i] read-only', <Good>yes</Good>],
              ['(ii)', <>anti on <Code>a</Code>: read <Code>a[i+1]</Code>, write <Code>a[i]</Code> ⇒ d = (1), θ = (&lt;)</>, <Bad>no</Bad>],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Reversal negates every distance. Loop (ii)'s distance (1) would become (−1), i.e. direction (&gt;) — the
            sink would run before its source. Reversal is legal <strong>only for a loop that carries no dependence</strong>.
          </p>
          <p className="text-sm font-medium mb-1">(b) — 2 P</p>
          <p className="text-sm mb-1">
            The loops run in opposite directions, so they cannot be fused directly. Neither carries a dependence, so
            either may be reversed; reverse the second so both ascend:
          </p>
          <Pre>{`for (i = 1; i <= n; i++)  a[i] = c[i] + 1;
for (i = 1; i <= n; i++)  b[i] = a[i] * 2;   // reversed — legal
⇓ fuse
for (i = 1; i <= n; i++) {
  a[i] = c[i] + 1;
  b[i] = a[i] * 2;      // reads a[i] just produced ⇒ δ∞, fine
}`}</Pre>
          <p className="text-xs text-muted-foreground mt-1">
            After fusion the dependence <Code>a[i]</Code> (loop 1) → <Code>a[i]</Code> (loop 2) is loop-independent and
            forward, so fusion is legal.
          </p>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q3 */}
    <QuestionCard
      n={3}
      diff="Easy"
      title="Eliminate a conditional by unswitching + splitting (Ex 7.1) · 4 P"
      statement={
        <>
          <Pts split="4" total={4} />
          <Pre>{`for (i = 1; i <= 100; i++)
  for (j = 1; j <= 100; j++)
    if (i >= 50)
      a[i][j] = a[i+1][j] / a[i][j+2];
    else
      a[i][j] = a[i+1][j] * a[i][j+2];`}</Pre>
          <p>
            Which program transformations can be used to eliminate the (explicit) conditional{' '}
            <Code>if (i &gt;= 50)</Code>? Carry them out and show the resulting code along the way.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Step 1 — loop unswitching.</strong> The test <Code>i &gt;= 50</Code> does not depend on the inner
            variable <Code>j</Code>: it is <em>invariant</em> to the j-loop. Hoist it out, duplicating the loop:
          </p>
          <Pre>{`for (i = 1; i <= 100; i++)
  if (i >= 50)
    for (j = 1; j <= 100; j++)
      a[i][j] = a[i+1][j] / a[i][j+2];
  else
    for (j = 1; j <= 100; j++)
      a[i][j] = a[i+1][j] * a[i][j+2];`}</Pre>
          <p className="text-sm mb-1">
            <strong>Step 2 — index-set splitting.</strong> The condition is now monotone in the outer variable{' '}
            <Code>i</Code> (false for <Code>i &lt; 50</Code>, true for <Code>i ≥ 50</Code>). Split the i-range at 50 so
            each part takes exactly one branch — the conditional disappears:
          </p>
          <Pre>{`for (i = 1; i <= 49; i++)             // i < 50  ⇒  else branch
  for (j = 1; j <= 100; j++)
    a[i][j] = a[i+1][j] * a[i][j+2];

for (i = 50; i <= 100; i++)           // i >= 50 ⇒  then branch
  for (j = 1; j <= 100; j++)
    a[i][j] = a[i+1][j] / a[i][j+2];`}</Pre>
          <Panel className="text-sm leading-relaxed">
            The two transformations are <strong>loop unswitching</strong> (moves the loop-invariant test out of the
            j-loop) followed by <strong>loop splitting / index-set splitting</strong> (removes the now-monotone test on{' '}
            <Code>i</Code>). No conditional remains inside either loop nest.
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q4 */}
    <QuestionCard
      n={4}
      diff="Medium"
      title="Strip mining — dependences and strip interchange (Ex 6.2) · 8 P"
      statement={
        <>
          <Pts split="3 + 3 + 2" total={8} />
          <p className="mb-2">The loop nest (i) can be transformed to loop nest (ii) by strip mining (strip size 5):</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">(i)</p>
              <Pre>{`for (i = 0; i <= 15; i++)
  a[i+3] = a[i] + b[i];`}</Pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">(ii)</p>
              <Pre>{`for (is = 0; is <= 3; is++)
  for (ii = 0; ii <= min(15-5*is, 4); ii++)
  {
    i = 5*is + ii;
    a[i+3] = a[i] + b[i];
  }`}</Pre>
            </div>
          </div>
          <p className="mb-1 mt-2">
            (a) Determine all data dependences of both nests: type, distance and direction vectors, and the carrying
            loop.
          </p>
          <p className="mb-1">(b) Visualize the iteration space of both nests and draw the dependence arrows.</p>
          <p>
            (c) For nest (ii): is it possible to interchange the outer strip loop <Code>is</Code> with the inner element
            loop <Code>ii</Code>? Give reasons.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 3 P</p>
          <p className="text-sm mb-1">
            Nest (i): write <Code>a[i+3]</Code>, read <Code>a[i]</Code>. The value written at iteration{' '}
            <Code>i</Code> is read at iteration <Code>i+3</Code> ⇒ <Dep k="t">δᵗ flow</Dep>, distance <Code>(3)</Code>,
            direction <Code>(&lt;)</Code>, carried by the i-loop. (Each cell is written once ⇒ no output; the read of{' '}
            <Code>a[i]</Code> is of a value produced earlier ⇒ no anti.)
          </p>
          <p className="text-sm mb-1">
            Nest (ii): strip mining re-expresses the distance <Code>d = 3</Code> with strip size <Code>s = 5</Code> as{' '}
            <Code>(d div s, d mod s)</Code>, plus the boundary-crossing vector <Code>(d div s + 1, d mod s − s)</Code>:
          </p>
          <Table
            head={['Case', 'd = (is, ii)', 'θ', 'carried by']}
            rows={[
              ['stays in a strip (ii ≤ 1)', '(0, 3)', '(=, <)', 'inner ii-loop (level 2)'],
              ['crosses a strip (ii ≥ 2)', '(1, −2)', '(<, >)', 'outer is-loop (level 1)'],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Both are still <Dep k="t">δᵗ flow</Dep>. Check: <Code>3 div 5 = 0, 3 mod 5 = 3</Code> ⇒ <Code>(0,3)</Code>;
            since <Code>3 mod 5 ≠ 0</Code>, add <Code>(1, 3−5) = (1, −2)</Code>.
          </p>
          <p className="text-sm font-medium mb-1">(b) — 3 P</p>
          <p className="text-sm mb-1">Nest (i): a line of iterations 0…15, each with an arrow to <Code>i+3</Code>:</p>
          <FlowGraph nodes={lineNodes} edges={lineEdges} width={500} height={60} maxW={520} caption="1-D iteration space of nest (i): flow distance 3" />
          <p className="text-sm mb-1 mt-2">
            Nest (ii): the same 16 points laid out on the strip grid <Code>(is, ii)</Code>. Short blue arrows stay in a
            column (distance (0,3)); red arrows jump to the next strip and two rows up (distance (1,−2)):
          </p>
          <StripGrid />
          <p className="text-sm font-medium mt-3 mb-1">(c) — 2 P</p>
          <Panel className="text-sm leading-relaxed">
            <Bad>No.</Bad> The boundary-crossing dependence has direction <Code>(&lt;, &gt;)</Code>. Interchanging the
            two loops would turn it into <Code>(&gt;, &lt;)</Code> — the sink iteration would run <em>before</em> its
            source, violating the dependence. Interchange is illegal exactly for a <Code>(&lt;, &gt;)</Code> direction
            vector, which strip mining introduced here.
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q5 */}
    <QuestionCard
      n={5}
      diff="Medium"
      title="Loop interchange — legality and triangular bounds (§4.4) · 6 P"
      statement={
        <>
          <Pts split="2 + 2 + 2" total={6} />
          <p className="text-xs font-semibold text-muted-foreground mb-1">Decide for each nest whether the i- and j-loops may be interchanged; justify with the direction vector.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">(a)</p>
              <Pre>{`for (i=1; i<=n; i++)
  for (j=1; j<=n; j++)
    a[i][j] = a[i-1][j]
            + a[i][j-1];`}</Pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">(b)</p>
              <Pre>{`for (i=1; i<=n; i++)
  for (j=1; j<=n; j++)
    a[i][j] = a[i-1][j+1]
            + 1;`}</Pre>
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground mb-1 mt-2">(c) Interchange this triangular nest and give the adjusted bounds:</p>
          <Pre>{`for (i = 1; i <= n; i++)
  for (j = 1; j <= i; j++)
    a[i][j] = a[i][j] + b[i][j];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 2 P</p>
          <Table
            head={['Read', 'd', 'θ']}
            rows={[
              [<Code>a[i-1][j]</Code>, '(1, 0)', '(<, =)'],
              [<Code>a[i][j-1]</Code>, '(0, 1)', '(=, <)'],
            ]}
          />
          <p className="text-sm mt-1 mb-3">
            No <Code>(&lt;, &gt;)</Code> vector ⇒ <Good>interchange legal</Good>. (Both vectors are non-negative, so the
            nest is fully permutable.)
          </p>
          <p className="text-sm font-medium mb-1">(b) — 2 P</p>
          <p className="text-sm mb-3">
            Read <Code>a[i-1][j+1]</Code>: source <Code>(i−1, j+1)</Code>, sink <Code>(i, j)</Code> ⇒ distance{' '}
            <Code>(1, −1)</Code>, direction <Code>(&lt;, &gt;)</Code>. <Bad>Interchange illegal</Bad>: swapping gives{' '}
            <Code>(&gt;, &lt;)</Code>, so the sink would precede its source.
          </p>
          <p className="text-sm font-medium mb-1">(c) — 2 P</p>
          <p className="text-sm mb-1">
            The body is dependence-free (each <Code>a[i][j]</Code> independent), so interchange is legal; the{' '}
            <strong>bounds must be recomputed</strong> so the same triangular index set is covered. Original:{' '}
            <Code>1 ≤ i ≤ n, 1 ≤ j ≤ i</Code>, i.e. <Code>j ≤ i</Code>. Making <Code>j</Code> outer:{' '}
            <Code>1 ≤ j ≤ n</Code> and <Code>j ≤ i ≤ n</Code>:
          </p>
          <Pre>{`for (j = 1; j <= n; j++)
  for (i = j; i <= n; i++)
    a[i][j] = a[i][j] + b[i][j];`}</Pre>
          <p className="text-xs text-muted-foreground mt-1">
            The inner lower bound became <Code>max(1, j) = j</Code> — the triangle is preserved, just traversed
            column-by-column instead of row-by-row.
          </p>
        </>
      }
    />
  </div>
)

/* ================================================================== *
 *  Questions 6–10                                                     *
 * ================================================================== */

/* Q6 distribution DDG */
const fissNodes: GNode[] = [
  { id: 'S1', x: 50, y: 45, label: 'S₁' },
  { id: 'S2', x: 50, y: 130, label: 'S₂' },
  { id: 'S3', x: 190, y: 88, label: 'S₃' },
]
const fissEdges: GEdge[] = [
  { from: 'S1', to: 'S2', label: 'δᵗ∞ a[i]', bend: -30 },
  { from: 'S2', to: 'S1', label: 'δᵗ₁ b[i]', bend: -30 },
  { from: 'S1', to: 'S3', label: 'δᵗ∞ a[i]' },
  { from: 'S3', to: 'S3', label: 'δᵗ₁ c[i]' },
]

const QuestionsB: React.FC = () => (
  <div className="space-y-3">
    {/* ---------------------------------------------------------- Q6 */}
    <QuestionCard
      n={6}
      diff="Medium"
      title="Loop distribution via strongly connected components (§4.3) · 6 P"
      statement={
        <>
          <Pts split="3 + 3" total={6} />
          <Pre>{`for (i = 1; i < n; i++) {
  S1: a[i] = b[i-1] + 1;
  S2: b[i] = a[i] * 2;
  S3: c[i] = c[i-1] + a[i];
}`}</Pre>
          <p className="mb-1">(a) Build the data dependence graph, find its strongly connected components (SCCs), and give a topological order of the condensation.</p>
          <p>(b) Apply loop distribution (fission) and give the resulting loops. Which statements had to stay together, and why?</p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 3 P</p>
          <Table
            head={['Edge', 'Var', 'Reason', 'Level']}
            rows={[
              [<>S1 δᵗ S2</>, 'a[i]', 'S1 writes a[i], S2 reads it (same iteration)', '∞'],
              [<>S2 δᵗ S1</>, 'b[i]', 'S2 writes b[i], S1 reads b[i-1] next iteration', '1'],
              [<>S1 δᵗ S3</>, 'a[i]', 'S3 reads a[i] (same iteration)', '∞'],
              [<>S3 δᵗ S3</>, 'c[i]', 'S3 reads c[i-1] written last iteration', '1'],
            ]}
          />
          <FlowGraph nodes={fissNodes} edges={fissEdges} width={260} height={180} maxW={300} caption="S1↔S2 form a cycle; S3 has a self-cycle" />
          <p className="text-sm mt-2">
            <Code>S1 → S2 → S1</Code> is a cycle ⇒ <Code>{'{S1, S2}'}</Code> is one SCC. <Code>S3</Code> forms its own
            (self-looping) SCC. Condensation edge <Code>{'{S1,S2} → {S3}'}</Code> (from S1 δᵗ S3) ⇒ topological order{' '}
            <Code>{'{S1, S2}'}, {'{S3}'}</Code>.
          </p>
          <p className="text-sm font-medium mt-3 mb-1">(b) — 3 P</p>
          <Pre>{`for (i = 1; i < n; i++) {   // SCC1 — real recurrence, stays a loop
  S1: a[i] = b[i-1] + 1;
  S2: b[i] = a[i] * 2;
}
for (i = 1; i < n; i++) {   // SCC2
  S3: c[i] = c[i-1] + a[i];
}`}</Pre>
          <Panel className="text-sm leading-relaxed">
            <Code>S1</Code> and <Code>S2</Code> lie on a dependence cycle, so they <strong>cannot be separated</strong>
            — an SCC must be emitted as a single loop. <Code>S3</Code> is a different SCC and is emitted after them (the
            condensation edge fixes the order). Splitting the loop this way improves instruction-cache locality and
            exposes each SCC for independent treatment (e.g. <Code>S3</Code>'s loop could be scheduled separately).
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q7 */}
    <QuestionCard
      n={7}
      diff="Hard"
      title="Loop fusion with enabling transformations (Ex 7.2) · 10 P"
      statement={
        <>
          <Pts split="5 + 5" total={10} />
          <p className="mb-2">
            Determine for each fragment whether the loops can be fused, using additional transformations if needed.
            Explain and perform the necessary transformations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">(a)</p>
              <Pre>{`for (i = 0; i < 101; i++) {
  d = a[i];
  b[i] = d;
}
for (j = 1; j < 100; j++) {
  if (e[j] > 0) {
    d = -e[j];
    c[j] = c[j] + d;
  }
}`}</Pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">(b)</p>
              <Pre>{`for (i = 1; i < 100; i++) {
  d = a[i];
  b[i] = d;
}
for (j = 99; j > 0; j--) {
  if (e[j] > 0) {
    d = -e[j];
  }
  c[j] = c[j] + d;
}`}</Pre>
            </div>
          </div>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 5 P · fusable after peeling</p>
          <p className="text-sm mb-1">
            The bodies touch <strong>disjoint arrays</strong> (b, a vs. c, e) — the only shared name is the scalar{' '}
            <Code>d</Code>, which is defined before use in each body ⇒ no fusion-preventing dependence. The obstacle is
            the <strong>bound mismatch</strong>: loop 1 runs <Code>0…100</Code>, loop 2 runs <Code>1…99</Code>. Peel
            the two extra iterations <Code>i = 0</Code> and <Code>i = 100</Code> off loop 1, then fuse the common range:
          </p>
          <Pre>{`b[0] = a[0];                     // peeled i = 0
for (i = 1; i < 100; i++) {      // fused 1…99
  d = a[i]; b[i] = d;
  if (e[i] > 0) { d = -e[i]; c[i] = c[i] + d; }
}
b[100] = a[100];                 // peeled i = 100`}</Pre>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            (Renaming the scalar to <Code>d1</Code>/<Code>d2</Code> per body also removes the harmless anti/output
            dependence on <Code>d</Code>.)
          </p>
          <p className="text-sm font-medium mb-1">(b) — 5 P · fusable only after reversing loop 1</p>
          <p className="text-sm mb-1">
            Same index set <Code>{'{1…99}'}</Code>, but <strong>opposite directions</strong> (loop 1 ascends, loop 2
            descends), so direct fusion is impossible. Note also that in loop 2 the use <Code>c[j] = c[j] + d</Code> is{' '}
            <em>outside</em> the <Code>if</Code>: when <Code>e[j] ≤ 0</Code>, <Code>d</Code> keeps its value from a
            previous iteration ⇒ loop 2 carries a <strong>loop-carried dependence on d</strong> and therefore{' '}
            <Bad>cannot be reversed</Bad>.
          </p>
          <p className="text-sm mb-1">
            Loop 1 carries no dependence, so <strong>reverse loop 1</strong> instead (legal), rename its scalar to{' '}
            <Code>d1</Code> so it does not clobber loop 2's carried <Code>d</Code>, then fuse:
          </p>
          <Pre>{`for (i = 99; i > 0; i--) {       // loop 1 reversed (legal)
  d1 = a[i]; b[i] = d1;
  if (e[i] > 0) d = -e[i];
  c[i] = c[i] + d;               // loop 2's carried d preserved
}`}</Pre>
          <Panel className="text-sm leading-relaxed">
            The teaching point: reversing loop 2 would be the "obvious" fix but is <em>illegal</em> because of its
            carried <Code>d</Code>. Reversing the dependence-free loop 1 achieves the same alignment and keeps the
            program correct — the loops are then fusable.
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q8 */}
    <QuestionCard
      n={8}
      diff="Hard"
      title="Loop skewing to enable interchange (Ex 7.3) · 6 P"
      statement={
        <>
          <Pts split="6" total={6} />
          <Pre>{`for (i = 2; i < n; i++) {
  for (j = 1; j < m; j++) {
    a[i][j-1] = a[i-2][j+2] + a[i-1][j] + a[i-1][j-1];
  }
}`}</Pre>
          <p>
            Apply loop skewing to enable the inner and outer loops to be interchanged. Determine the{' '}
            <strong>smallest skewing factor</strong> that suffices, specify the resulting loop nest, and explain the
            required steps. <em>Hint: you need not normalize before skewing.</em>
          </p>
        </>
      }
      solution={<Stepper steps={skewSteps} showProgress />}
    />

    {/* ---------------------------------------------------------- Q9 */}
    <QuestionCard
      n={9}
      diff="Hard"
      title="Optimizing matrix multiply for locality (§4.9) · 8 P"
      statement={
        <>
          <Pts split="3 + 3 + 2" total={8} />
          <Pre>{`// row-major storage
for (i = 0; i < n; i++)
  for (j = 0; j < n; j++)
    for (k = 0; k < n; k++)
      c[i][j] += a[i][k] * b[k][j];`}</Pre>
          <p className="mb-1">
            (a) For the given <Code>i, j, k</Code> order, classify the locality of each reference in the{' '}
            <strong>innermost</strong> loop (self-temporal / spatial / none).
          </p>
          <p className="mb-1">(b) Which loop order gives the best locality? Justify.</p>
          <p>
            (c) With the affine model <Code>x[A·i + c]</Code>, state the condition for <strong>temporal reuse</strong>{' '}
            in the innermost loop and apply it to <Code>a[i][k]</Code> in your chosen order.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 3 P · innermost loop is k</p>
          <Table
            head={['Reference', 'depends on k?', 'stride (row-major)', 'locality']}
            rows={[
              [<Code>a[i][k]</Code>, 'yes (2nd index)', '1', <Good>spatial (unit stride)</Good>],
              [<Code>b[k][j]</Code>, 'yes (1st index)', 'n', <Bad>none — jumps a whole row</Bad>],
              [<Code>c[i][j]</Code>, 'no', '—', <Good>self-temporal (loop-invariant → register)</Good>],
            ]}
          />
          <p className="text-sm font-medium mt-3 mb-1">(b) — 3 P</p>
          <p className="text-sm mb-1">
            Reorder to <Code>i, k, j</Code> (make <Code>j</Code> innermost). Then in the innermost <Code>j</Code>-loop:
          </p>
          <Table
            head={['Reference', 'depends on j?', 'stride', 'locality']}
            rows={[
              [<Code>a[i][k]</Code>, 'no', '—', <Good>invariant (register)</Good>],
              [<Code>b[k][j]</Code>, 'yes (2nd index)', '1', <Good>spatial</Good>],
              [<Code>c[i][j]</Code>, 'yes (2nd index)', '1', <Good>spatial</Good>],
            ]}
          />
          <p className="text-sm mt-1 mb-3">
            All three references now have unit stride or are invariant ⇒ <Code>ikj</Code> is the{' '}
            <strong>best order</strong>. (The dependence is a reduction on <Code>c[i][j]</Code> — commutative/
            associative — so every loop order is legal.)
          </p>
          <p className="text-sm font-medium mb-1">(c) — 2 P</p>
          <p className="text-sm mb-1">
            For a reference <Code>x[A·i + c]</Code> with iteration vector <Code>i</Code>, there is{' '}
            <strong>temporal reuse</strong> along the innermost loop (direction <Code>d</Code>, a unit vector) iff
          </p>
          <Formula>{`A · d = 0     (the reference does not move as the innermost index advances)`}</Formula>
          <p className="text-sm">
            For <Code>a[i][k]</Code> in the <Code>ikj</Code> order the innermost direction is <Code>d = (0,0,1)ᵀ</Code>{' '}
            over <Code>(i,k,j)</Code>. Its access matrix picks out <Code>i</Code> and <Code>k</Code>, so
          </p>
          <Formula>{`A = [1 0 0]      A · d = [0]     ⇒  temporal reuse ✓
    [0 1 0]          [0]`}</Formula>
          <Panel className="text-sm leading-relaxed">
            <Code>A·d = 0</Code> confirms <Code>a[i][k]</Code> stays at the same address across the whole j-loop — it
            is loaded once and kept in a register, matching the qualitative "invariant" verdict in (b).
          </Panel>
        </>
      }
    />

    {/* --------------------------------------------------------- Q10 */}
    <QuestionCard
      n={10}
      diff="Hardest"
      title="Loop tiling with interchange (Ex 8.1) · 12 P"
      statement={
        <>
          <Pts split="4 + 2 + 4 + 2" total={12} />
          <Pre>{`for (i = 1; i < 10000; i++)
  for (j = i; j < 10000; j++)
    a[i][j] = a[i+1][j] + a[i][j+1];`}</Pre>
          <p className="mb-1">(a) Apply loop tiling with tile size <Code>ts = 128</Code> and tile offset <Code>to = 16</Code>. Give the tiled loop nest.</p>
          <p className="mb-1">(b) Which dependences exist?</p>
          <p className="mb-1">(c) Interchange the <Code>i</Code>-loop and the <Code>jt</Code>-loop and give the resulting nest.</p>
          <p>(d) Do the dependences allow this interchange?</p>
        </>
      }
      solution={<Stepper steps={tileSteps} showProgress />}
    />
  </div>
)

/* ------------------------------------------------------------------ *
 *  Root
 * ------------------------------------------------------------------ */

const tabs: TabDef[] = [
  { id: 'qa', label: 'Q1–Q5 · Reorder → interchange', render: () => <QuestionsA /> },
  { id: 'qb', label: 'Q6–Q10 · Fission → tiling', render: () => <QuestionsB /> },
]

export default function Chapter4ExamStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 4 · Exam Practice"
      title="Chapter 4 Exam Practice"
      subtitle="Ten written-exam problems (68 points) covering all of Chapter 4 — statement reordering, loop unswitching/splitting, fusion, distribution (fission), interchange, reversal, skewing, strip mining, tiling, and optimizing for locality. Includes the original sheet exercises 6.2, 7.1, 7.2, 7.3 and 8.1 with full solutions."
      tabs={tabs}
    />
  )
}
