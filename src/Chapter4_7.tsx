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
  Tag,
  Stepper,
  QuestionCard,
  StudyShell,
  type StepPanel,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 4 · §4.7 — Strip Mining   (PDF 206–208)
 *  Split one loop into two nested loops (blocks / strips of size s):
 *  the min() bound, the vectorization motivation, and how a distance
 *  d becomes (d div s, d mod s) plus a possible (d div s+1, d mod s−s).
 * ------------------------------------------------------------------ */

const divS = (d: number, s: number) => Math.floor(d / s)
const modS = (d: number, s: number) => ((d % s) + s) % s

/* ================================================================== *
 *  Tab 1 · What & why  (strip-decomposition visual)
 * ================================================================== */

const stripPalette = [
  'bg-primary/20 border-primary/50',
  'bg-emerald-500/20 border-emerald-500/50',
  'bg-amber-500/20 border-amber-500/50',
  'bg-violet-500/20 border-violet-500/50',
]

const StripDecomp: React.FC = () => {
  const n = 14
  const [s, setS] = useState(4)
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">strip size s =</span>
        {[3, 4, 5, 7].map((v) => (
          <button
            key={v}
            onClick={() => setS(v)}
            className={cn(
              'w-8 h-8 rounded-md border font-mono text-sm transition-colors',
              s === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            )}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {Array.from({ length: n }, (_, k) => {
          const i = k + 1
          const strip = Math.floor((i - 1) / s)
          const isLastPartial = strip === Math.floor((n - 1) / s) && n % s !== 0
          return (
            <div
              key={i}
              className={cn(
                'w-9 h-9 rounded-md border flex flex-col items-center justify-center text-[11px] font-mono',
                stripPalette[strip % stripPalette.length],
                isLastPartial && 'ring-1 ring-red-500/60'
              )}
            >
              <span>{i}</span>
              <span className="text-[8px] text-muted-foreground">s{strip}</span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Iterations <Code>i = 1 … {n}</Code> grouped into strips of size <Code>{s}</Code>: outer loop{' '}
        <Code>is = 1, {1 + s}, {1 + 2 * s}, …</Code>; inner loop runs each strip. The last strip is often{' '}
        <span className="text-red-600 dark:text-red-400">partial</span> — that is what{' '}
        <Code>min(n, is+s−1)</Code> guards ({n} mod {s} = {n % s}).
      </p>
    </div>
  )
}

const IntroSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">One loop → two nested loops</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>Strip mining</strong> decomposes a single loop into <strong>two nested loops</strong>: the{' '}
          <strong>inner</strong> loop processes a <strong>strip</strong> (block) of a fixed size <Code>s</Code>, and the{' '}
          <strong>outer</strong> loop steps from block to block until the whole range is covered.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">before</div>
            <Pre>{`for (i = 1; i <= n; i++)
  a[i] = b[i] + c[i];`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after (strip size s)</div>
            <Pre>{`for (is = 1; is <= n; is += s)
  for (i = is; i <= min(n, is+s-1); i++)
    a[i] = b[i] + c[i];`}</Pre>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          The outer loop steps by <Code>s</Code>; the inner <Code>min(n, is+s−1)</Code> stops the final (possibly
          partial) strip from running past <Code>n</Code>.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why — and what it changes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          <Panel className="my-0">
            <Tag tone="good">Application</Tag>
            <p className="text-sm mt-1.5">
              Preparation for a <strong>vector processor</strong>: each strip of length <Code>s</Code> maps onto a{' '}
              <strong>vector register</strong> of length <Code>s</Code>, so the inner loop becomes one vector operation.
            </p>
          </Panel>
          <Panel className="my-0">
            <Tag>Effect</Tag>
            <p className="text-sm mt-1.5">
              Strip mining <strong>increases the nesting depth</strong> by one. On its own it changes no results — but the
              extra loop level means <strong>dependence distances must be re-expressed</strong> (next tab).
            </p>
          </Panel>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">See the strips</CardTitle>
      </CardHeader>
      <CardContent>
        <StripDecomp />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · Distance-vector adaptation
 * ================================================================== */

const DistanceCalc: React.FC = () => {
  const [d, setD] = useState(3)
  const [s, setS] = useState(5)
  const q = divS(d, s)
  const r = modS(d, s)
  const extra = r !== 0

  const btn = (v: number, cur: number, set: (n: number) => void) => (
    <button
      key={v}
      onClick={() => set(v)}
      className={cn(
        'w-8 h-8 rounded-md border font-mono text-sm transition-colors',
        cur === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
      )}
    >
      {v}
    </button>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">distance d =</span>
          {[2, 3, 4, 6, 8].map((v) => btn(v, d, setD))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">strip s =</span>
          {[3, 4, 5, 8].map((v) => btn(v, s, setS))}
        </div>
      </div>

      <Formula>{`d div s = ${d} div ${s} = ${q}      d mod s = ${d} mod ${s} = ${r}`}</Formula>

      <Table
        head={['Dependence', 'Distance vector', 'When']}
        rows={[
          [
            <>primary</>,
            <Code>{`(${q}, ${r})`}</Code>,
            <>source iterations that stay within one strip</>,
          ],
          [
            <>additional</>,
            extra ? <Code>{`(${q + 1}, ${r - s})`}</Code> : <span className="text-muted-foreground">none</span>,
            extra ? <>source iterations whose target crosses a strip boundary</> : <>d mod s = 0 ⇒ no boundary crossing</>,
          ],
        ]}
      />

      <Panel className={cn('my-2 text-sm leading-relaxed border-2', extra ? 'border-amber-500/60' : 'border-emerald-500/60')}>
        {extra ? (
          <>
            <Tag tone="warn">two distance vectors</Tag>{' '}
            <span className="ml-1">
              Because <Code>d mod s = {r} ≠ 0</Code>, some dependences cross a strip boundary. They split into{' '}
              <Code>({q}, {r})</Code> (within a strip) and <Code>({q + 1}, {r - s})</Code> (across a strip). Note the{' '}
              <strong>negative</strong> inner component — a hallmark of the boundary-crossing dependence.
            </span>
          </>
        ) : (
          <>
            <Good>One distance vector.</Good> Since <Code>d mod s = 0</Code>, every dependence lands exactly on a strip
            boundary at offset 0 — no wrap, no extra dependence. Only <Code>({q}, 0)</Code> remains.
          </>
        )}
      </Panel>
    </div>
  )
}

const DistanceSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Re-expressing the distance vectors</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          After strip mining, a 1-D iteration <Code>i</Code> becomes a 2-D coordinate <Code>(block, offset)</Code>. A
          dependence of distance <Code>d</Code> must be split accordingly:
        </p>
        <Formula>{`1.  distance d  →  (d div s ,  d mod s)

2.  if d mod s ≠ 0, an ADDITIONAL dependence appears:
        (d div s + 1 ,  (d mod s) − s)`}</Formula>
        <p className="text-sm">
          Intuition: a dependence spans <Code>d</Code> iterations. That is <Code>d div s</Code> whole strips plus{' '}
          <Code>d mod s</Code> left over. If the leftover pushes the target past the end of the current strip, the
          dependence instead lands one block further on, at a <em>negative</em> offset — the second vector.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distance calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">Pick a distance and a strip size and read off the resulting distance vector(s).</p>
        <DistanceCalc />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · Worked example  (number-line dependence arcs)
 * ================================================================== */

const StripArcs: React.FC<{ d: number; s: number; n: number }> = ({ d, s, n }) => {
  const step = 26
  const mx = 18
  const y0 = 92
  const W = mx * 2 + (n - 1) * step
  const H = 112
  const x = (i: number) => mx + (i - 1) * step
  const dmod = modS(d, s)

  const arcs: { i: number; wrap: boolean }[] = []
  for (let i = 1; i + d <= n; i++) {
    const o = (i - 1) % s
    arcs.push({ i, wrap: o + dmod >= s })
  }
  // strip separators
  const seps: number[] = []
  for (let start = 1 + s; start <= n; start += s) seps.push(start)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mx-auto block select-none" style={{ height: 'auto', maxWidth: 480 }}>
      <defs>
        <marker id="sm-good" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#10b981" />
        </marker>
        <marker id="sm-bad" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
        </marker>
      </defs>

      {seps.map((start) => (
        <line
          key={start}
          x1={x(start) - step / 2}
          y1={y0 - 58}
          x2={x(start) - step / 2}
          y2={y0 + 10}
          stroke="var(--color-border)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      ))}

      {arcs.map(({ i, wrap }) => {
        const x1 = x(i)
        const x2 = x(i + d)
        const cy = y0 - 48
        return (
          <path
            key={i}
            d={`M ${x1} ${y0 - 6} Q ${(x1 + x2) / 2} ${cy} ${x2} ${y0 - 6}`}
            fill="none"
            stroke={wrap ? '#ef4444' : '#10b981'}
            strokeWidth={1.6}
            markerEnd={`url(#sm-${wrap ? 'bad' : 'good'})`}
          />
        )
      })}

      {Array.from({ length: n }, (_, k) => {
        const i = k + 1
        return (
          <g key={i}>
            <circle cx={x(i)} cy={y0} r={3.5} fill="var(--color-foreground)" />
            <text x={x(i)} y={y0 + 16} textAnchor="middle" fontSize="9.5" fill="var(--color-muted-foreground)">
              {i}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const stripSteps: StepPanel[] = [
  {
    title: '0 · The loop and its dependence',
    body: (
      <>
        <Pre>{`for (i = 1; i <= 16; i++)
  a[i+3] = a[i] + b[i];`}</Pre>
        <p className="text-sm">
          <Code>a[i+3]</Code> is written and <Code>a[i]</Code> read three iterations later ⇒ a flow dependence of{' '}
          <strong>distance (3)</strong>.
        </p>
      </>
    ),
  },
  {
    title: '1 · Strip-mine with block size 5',
    body: (
      <>
        <Pre>{`for (is = 1; is <= 16; is += 5)
  for (i = is; i <= min(16, is+4); i++)
    a[i+3] = a[i] + b[i];`}</Pre>
        <p className="text-sm">
          Strips: <Code>{'{1..5}'}</Code>, <Code>{'{6..10}'}</Code>, <Code>{'{11..15}'}</Code>, <Code>{'{16}'}</Code>{' '}
          (the last is a single-element partial strip, clipped by <Code>min</Code>).
        </p>
      </>
    ),
  },
  {
    title: '2 · Split the distance (3)',
    body: (
      <>
        <Formula>{`(d div s, d mod s) = (3 div 5, 3 mod 5) = (0, 3)

d mod s = 3 ≠ 0  ⇒  additional dependence
(3 div 5 + 1, (3 mod 5) − 5) = (1, −2)`}</Formula>
        <p className="text-sm">So the strip-mined loop carries two distance vectors: <Code>(0,3)</Code> and <Code>(1,−2)</Code>.</p>
      </>
    ),
  },
  {
    title: '3 · Which dependence is which?',
    body: (
      <>
        <p className="text-sm mb-2">
          Green arcs stay <strong>inside</strong> one strip ⇒ distance <Code>(0,3)</Code>. Red arcs{' '}
          <strong>cross</strong> a strip boundary ⇒ distance <Code>(1,−2)</Code> (one block on, offset back by 2):
        </p>
        <StripArcs d={3} s={5} n={16} />
        <div className="flex gap-4 justify-center text-[11px] text-muted-foreground mt-1">
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: '#10b981' }} /> within strip (0,3)</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: '#ef4444' }} /> across strip (1,−2)</span>
        </div>
        <Panel className="text-sm leading-relaxed mt-2">
          A source at strip-offset <Code>0</Code> or <Code>1</Code> lands within the strip (green); at offset{' '}
          <Code>2, 3, 4</Code> it spills into the next strip (red). That split is exactly the two-vector rule.
        </Panel>
      </>
    ),
  },
]

const WorkedSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — block size 5, distance 3</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          The PDF's example, walked end to end: strip-mine, then re-express the single distance <Code>(3)</Code> as the
          two 2-D distance vectors and see them on the iteration line.
        </p>
        <Stepper steps={stripSteps} showProgress />
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
      Five exam-style problems on §4.7, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Strip-mine a loop"
      statement={
        <>
          <p className="mb-2">Strip-mine this loop with block size <Code>s = 4</Code>, and state its application.</p>
          <Pre>{`for (i = 1; i <= 10; i++)
  a[i] = b[i] * 2;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Split into an outer block loop (step <Code>s = 4</Code>) and an inner strip loop, clipped by <Code>min</Code>:
          </p>
          <Pre>{`for (is = 1; is <= 10; is += 4)
  for (i = is; i <= min(10, is+3); i++)
    a[i] = b[i] * 2;`}</Pre>
          <p className="text-sm mb-1">
            Strips: <Code>{'{1..4}'}</Code>, <Code>{'{5..8}'}</Code>, <Code>{'{9..10}'}</Code> — the last is partial, so{' '}
            <Code>min(10, 9+3) = 10</Code> keeps it in range.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Application:</Good> each strip of length 4 fits a <strong>vector register of length 4</strong>, so the
            inner loop is executed as a single vector instruction. Strip mining alone changes no results; it just adds a
            loop level to expose the vector-sized blocks.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="What is the min() for?"
      statement={
        <>
          <p className="mb-2">
            In the strip-mined form <Code>for (i = is; i {'<='} min(n, is+s−1); i++)</Code>, explain the role of{' '}
            <Code>min</Code>, and what happens to the loop nesting depth.
          </p>
        </>
      }
      solution={
        <>
          <Panel className="text-sm leading-relaxed">
            <strong>The min guards the last strip.</strong> If <Code>n</Code> is not a multiple of <Code>s</Code>, the
            final block is <em>partial</em> — <Code>is+s−1</Code> would run past <Code>n</Code>. Taking{' '}
            <Code>min(n, is+s−1)</Code> stops the inner loop exactly at <Code>n</Code>, so no out-of-range iterations
            execute.
            <div className="mt-1">
              <strong>Nesting depth:</strong> strip mining <em>increases</em> the depth by one — a single loop becomes a
              two-deep nest (outer blocks, inner strip).
            </div>
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Split a distance vector"
      statement={
        <>
          <p className="mb-2">
            A loop carries a dependence of distance <Code>d = 6</Code> and is strip-mined with <Code>s = 4</Code>. Give
            all resulting distance vectors.
          </p>
        </>
      }
      solution={
        <>
          <Formula>{`d div s = 6 div 4 = 1        d mod s = 6 mod 4 = 2
primary:     (1, 2)
d mod s = 2 ≠ 0  ⇒  additional: (1+1, 2−4) = (2, −2)`}</Formula>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Two vectors:</Good> <Code>(1, 2)</Code> for dependences that stay within a strip, and{' '}
            <Code>(2, −2)</Code> for those that cross a strip boundary (one extra block, offset back by <Code>s = 4</Code>).
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="The full block-size-5 example"
      statement={
        <>
          <p className="mb-2">
            Strip-mine with <Code>s = 5</Code>, then give the distance vectors and explain which source iterations produce
            each.
          </p>
          <Pre>{`for (i = 1; i <= 16; i++)
  a[i+3] = a[i] + b[i];`}</Pre>
        </>
      }
      solution={
        <>
          <Pre>{`for (is = 1; is <= 16; is += 5)
  for (i = is; i <= min(16, is+4); i++)
    a[i+3] = a[i] + b[i];`}</Pre>
          <p className="text-sm mb-1">
            Original distance <Code>(3)</Code>. Split: <Code>(3 div 5, 3 mod 5) = (0, 3)</Code>; since <Code>3 mod 5 ≠ 0</Code>,
            additional <Code>(1, 3−5) = (1, −2)</Code>.
          </p>
          <StripArcs d={3} s={5} n={16} />
          <Panel className="text-sm leading-relaxed mt-1">
            A source at strip offset <Code>0</Code> or <Code>1</Code> (e.g. <Code>i = 1, 2, 6, 7, 11, 12</Code>) has its
            target <Code>i+3</Code> in the <strong>same</strong> strip ⇒ <Code>(0, 3)</Code>. A source at offset{' '}
            <Code>2, 3, 4</Code> (e.g. <Code>i = 3, 4, 5, 8, 9, 10, 13</Code>) crosses into the next strip ⇒{' '}
            <Code>(1, −2)</Code>.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="When is there no extra dependence?"
      statement={
        <>
          <p className="mb-2">
            (a) Strip-mine a loop with distance <Code>d = 6</Code> using <Code>s = 3</Code>; give the distance vector(s).
            (b) Compare with <Code>s = 4</Code>. (c) State the general condition under which strip mining creates{' '}
            <em>no</em> additional dependence, and explain geometrically.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a) s = 3:</strong> <Code>6 div 3 = 2</Code>, <Code>6 mod 3 = 0</Code>. Since <Code>d mod s = 0</Code>,{' '}
            <Bad>no</Bad> additional dependence — only <Code>(2, 0)</Code>.
          </p>
          <p className="text-sm mb-1">
            <strong>(b) s = 4:</strong> <Code>6 div 4 = 1</Code>, <Code>6 mod 4 = 2 ≠ 0</Code> ⇒ two vectors{' '}
            <Code>(1, 2)</Code> and <Code>(2, −2)</Code>.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(c) Condition:</strong> the additional dependence appears <strong>iff</strong>{' '}
            <Code>d mod s ≠ 0</Code>. When <Code>s</Code> divides <Code>d</Code> exactly, every dependence spans a whole
            number of strips and lands at the <em>same</em> offset (offset delta 0) — it never crosses a strip boundary
            mid-strip, so a single vector <Code>(d/s, 0)</Code> suffices. Otherwise the leftover <Code>d mod s</Code>
            makes some dependences spill into the next block at a negative offset.
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
  { id: 'distance', label: 'Distance vectors', render: () => <DistanceSection /> },
  { id: 'worked', label: 'Worked example', render: () => <WorkedSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function StripMiningStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 4 · §4.7 · Strip Mining"
      title="Strip Mining"
      subtitle="Decompose one loop into two nested loops — an outer loop over blocks and an inner loop over a strip of size s — to prepare iterations for a vector processor with registers of length s. It adds a loop level, so a dependence distance d must be re-expressed as (d div s, d mod s), plus a second vector (d div s+1, d mod s−s) whenever d mod s ≠ 0."
      tabs={tabs}
    />
  )
}
