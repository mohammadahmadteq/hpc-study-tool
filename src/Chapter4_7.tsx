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
      Five exam-style problems on §4.7, easy → hardest — all on <em>fresh</em> numbers, not the lecture's{' '}
      <Code>d=3, s=5</Code> example. Q1 is fully worked to set the pattern; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Strip-mine, split the distance, and classify every source iteration"
      statement={
        <>
          <p className="mb-2">
            Strip-mine with <Code>s = 6</Code>, split the dependence's distance into its vector(s), and state{' '}
            <em>exactly</em> which source iterations (by residue) produce which vector.
          </p>
          <Pre>{`for (i = 1; i <= 20; i++)
  x[i+8] = x[i] + y[i];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1"><strong>Step 1 — strip-mine</strong> (block size <Code>s = 6</Code>):</p>
          <Pre>{`for (is = 1; is <= 20; is += 6)
  for (i = is; i <= min(20, is+5); i++)
    x[i+8] = x[i] + y[i];`}</Pre>
          <p className="text-sm mb-1">
            Strips: <Code>{'{1..6}'}</Code>, <Code>{'{7..12}'}</Code>, <Code>{'{13..18}'}</Code>, <Code>{'{19..20}'}</Code>{' '}
            (last one partial — only 2 elements).
          </p>
          <p className="text-sm mb-1"><strong>Step 2 — split the distance</strong> <Code>d = 8</Code>:</p>
          <Formula>{`d div s = 8 div 6 = 1        d mod s = 8 mod 6 = 2
primary:     (1, 2)
d mod s = 2 ≠ 0  ⇒  additional: (1+1, 2−6) = (2, −4)`}</Formula>
          <p className="text-sm mb-1">
            Notice the primary vector's block-component is already <Code>1</Code>, not <Code>0</Code> — unlike a case
            where <Code>d &lt; s</Code>, here <Code>d = 8 &gt; s = 6</Code> means <em>even the "normal" case</em> always
            crosses at least one strip boundary.
          </p>
          <p className="text-sm mb-1">
            <strong>Step 3 — which iteration gets which?</strong> Write <Code>i</Code>'s in-strip offset as{' '}
            <Code>o = (i−1) mod 6</Code>. The target is <Code>o</Code> positions into its strip plus <Code>8</Code>{' '}
            more; it stays one block ahead exactly while <Code>o + 8 &lt; 12</Code>, i.e. <Code>o ≤ 3</Code>:
          </p>
          <Table
            head={['Offset o', 'Example i', 'Vector']}
            rows={[
              ['0, 1, 2, 3', 'i = 1,2,3,4  (and 7,8,9,10 …)', <Code>(1, 2)</Code>],
              ['4, 5', 'i = 5,6  (and 11,12 …)', <Code>(2, −4)</Code>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Pattern for Q2–Q5:</Good> (i) strip-mine with the <Code>min</Code>-clipped inner bound, (ii) compute{' '}
            <Code>(d div s, d mod s)</Code> and the extra vector when <Code>d mod s ≠ 0</Code>, (iii) don't assume the
            primary block-component is 0 — check whether <Code>d</Code> is smaller or larger than <Code>s</Code>.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Count the strips, not just the vectors"
      statement={
        <>
          <p className="mb-2">
            Strip-mine <Code>for (i = 1; i {'<='} 23; i++) p[i] = q[i] - r[i];</Code> with <Code>s = 8</Code>. How many{' '}
            <strong>full</strong> strips result, how many elements are in the <strong>partial</strong> strip, and how
            many total passes through the inner loop (vector operations) does the outer loop issue?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <Code>23 = 2·8 + 7</Code>: two full strips of 8 (<Code>{'{1..8}'}</Code>, <Code>{'{9..16}'}</Code>) and one
            partial strip of the remaining <Code>7</Code> elements (<Code>{'{17..23}'}</Code>).
          </p>
          <Pre>{`for (is = 1; is <= 23; is += 8)
  for (i = is; i <= min(23, is+7); i++)
    p[i] = q[i] - r[i];`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Total outer-loop passes:</Good> <Code>⌈23/8⌉ = 3</Code> — two full-width vector operations (length 8)
            and one narrower one (length 7, or length 8 with the last position masked off, depending on the target
            hardware). No dependence here (only reads of <Code>q,r</Code> and a write to a fresh <Code>p</Code>), so all
            three passes are independent — no correctness issue is even at stake in this particular loop.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Split, then verify with two concrete iterations"
      statement={
        <>
          <p className="mb-2">
            A loop carries a dependence of distance <Code>d = 10</Code>, strip-mined with <Code>s = 4</Code>. (a) Derive
            both distance vectors. (b) Exhibit one concrete source iteration for each vector and verify by computing
            blocks and offsets directly — don't just trust the formula.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1"><strong>(a)</strong></p>
          <Formula>{`d div s = 10 div 4 = 2        d mod s = 10 mod 4 = 2
primary:     (2, 2)
additional:  (2+1, 2−4) = (3, −2)`}</Formula>
          <p className="text-sm mb-1"><strong>(b) Verify directly</strong> (strips are <Code>{'{1-4},{5-8},{9-12},…'}</Code>):</p>
          <Table
            head={['Source i', 'Target i+10', 'Block(src) → Block(tgt)', 'Offset(src), Offset(tgt)', 'Vector']}
            rows={[
              ['1', '11', '0 → 2', '0, 2', <Code>(2, 2)</Code>],
              ['3', '13', '0 → 3', '2, 0', <Code>(3, −2)</Code>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Both check out.</Good> Iteration 1 sits at offset 0, two blocks before its target — matches the
            primary <Code>(2, 2)</Code> directly. Iteration 3 sits at offset 2: adding <Code>d mod s = 2</Code> would
            push it to offset 4, which doesn't exist (offsets only run 0–3) — so it spills one <em>extra</em> block
            (block distance <Code>2+1=3</Code>) and wraps to offset <Code>4−4=0</Code>, giving offset difference{' '}
            <Code>0 − 2 = −2</Code>: exactly the additional vector <Code>(3, −2)</Code>. Direct computation is the way
            to double-check the formula on an exam when time allows.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Two dependences, one strip size — do they split the same way?"
      statement={
        <>
          <p className="mb-2">
            Strip-mine with <Code>s = 7</Code>. The loop carries <em>two independent</em> flow dependences. Derive the
            distance vector(s) for <strong>each</strong> and say whether they need the same number of vectors.
          </p>
          <Pre>{`for (i = 1; i <= 24; i++) {
  u[i+5] = u[i] + 1;
  v[i+9] = v[i] * 2;
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1"><strong>Strip-mine</strong> (strips <Code>{'{1-7},{8-14},{15-21},{22-24}'}</Code>, last partial):</p>
          <Pre>{`for (is = 1; is <= 24; is += 7)
  for (i = is; i <= min(24, is+6); i++) {
    u[i+5] = u[i] + 1;
    v[i+9] = v[i] * 2;
  }`}</Pre>
          <p className="text-sm mb-1"><strong>u-dependence, d = 5</strong> (note <Code>d &lt; s</Code>):</p>
          <Formula>{`5 div 7 = 0     5 mod 7 = 5
primary:    (0, 5)
additional: (0+1, 5−7) = (1, −2)`}</Formula>
          <p className="text-sm mb-1"><strong>v-dependence, d = 9</strong> (note <Code>d &gt; s</Code>):</p>
          <Formula>{`9 div 7 = 1     9 mod 7 = 2
primary:    (1, 2)
additional: (1+1, 2−7) = (2, −5)`}</Formula>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Both need two vectors</Good> (neither distance is a multiple of 7), but they are <strong>not
            interchangeable</strong>: the <Code>u</Code>-dependence's primary case (block 0) means <em>some</em>{' '}
            same-strip pairs exist (e.g. <Code>i=1</Code>: target <Code>6</Code>, same strip) — a real recurrence living
            inside one vector register. The <Code>v</Code>-dependence's primary block is already <Code>1</Code>, so it
            never has a same-strip pair (e.g. <Code>i=1</Code>: target <Code>10</Code>, one strip over). Two dependences
            strip-mined with the same <Code>s</Code> can land in structurally different situations — always redo the
            split per dependence, never assume they match.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="When is the inner (vector) loop actually safe to vectorize?"
      statement={
        <>
          <p className="mb-2">
            (a) For a single dependence of distance <Code>d &gt; 0</Code> strip-mined with size <Code>s</Code>, state a
            condition on <Code>d</Code> and <Code>s</Code> that guarantees the inner loop — for any <em>fixed</em> block
            — carries <strong>no</strong> dependence at all (so it is a genuine, unconditionally-parallel SIMD op). (b)
            Check this condition against Q1 (<Code>d=8, s=6</Code>) and against the lecture's own <Code>d=3, s=5</Code>{' '}
            example. (c) Explain in one sentence why real vectorizing compilers pick the vector length this way.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> The primary vector's block-component is <Code>d div s</Code>. A source/target pair
            lands in the <em>same</em> block exactly when that component is <Code>0</Code>, i.e. when <Code>d &lt; s</Code>.
            So: the inner loop is <strong>guaranteed dependence-free</strong> (no same-strip pair ever occurs, for{' '}
            <em>any</em> block) <strong>iff <Code>s ≤ d</Code></strong> — the vector length must not exceed the
            dependence distance.
          </p>
          <p className="text-sm mb-1">
            <strong>(b) Check Q1</strong> (<Code>d=8,s=6</Code>): <Code>s=6 ≤ d=8</Code> ✓ — and indeed every classified
            iteration in Q1 landed on block <Code>1</Code> or <Code>2</Code>, never block <Code>0</Code>; the inner loop
            is genuinely dependence-free there. <strong>Check the lecture's example</strong> (<Code>d=3,s=5</Code>):{' '}
            <Code>s=5 &gt; d=3</Code> — <Bad>condition fails</Bad>. Indeed its primary vector <Code>(0,3)</Code> has
            block <Code>0</Code>: sources at offset 0 or 1 (e.g. <Code>i=1,2</Code>) have their target{' '}
            <em>in the same strip</em> — a real 3-apart recurrence hiding inside one length-5 vector register.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(c)</strong> If the vector length exceeds the smallest dependence distance in the loop, a single SIMD
            instruction would need to both read an old element and use a value another lane in the <em>same</em>{' '}
            instruction is simultaneously producing — impossible for genuine hardware vector ops. So compilers cap the
            vector length at (or split further to stay under) the minimum carried dependence distance, exactly the{' '}
            <Code>s ≤ d</Code> bound derived in (a); the lecture's <Code>d=3,s=5</Code> nest would need{' '}
            <Code>s ≤ 3</Code> to be safely vectorized as pure SIMD.
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
