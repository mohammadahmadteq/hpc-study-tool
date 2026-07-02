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
  Stepper,
  QuestionCard,
  StudyShell,
  type StepPanel,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 4 · §4.8 — Loop Tiling   (PDF 209–213)
 *  Strip mining generalised to nested loops: rectangular tiles of the
 *  iteration space defined by tile size ts and offset to, the exact
 *  covering (first/last-tile floor formulas), and the tile→interchange
 *  worked example.
 * ------------------------------------------------------------------ */

const fdiv = (a: number, b: number) => Math.floor(a / b)
const tilePalette = [
  'bg-primary/20 border-primary/50',
  'bg-emerald-500/20 border-emerald-500/50',
  'bg-amber-500/20 border-amber-500/50',
  'bg-violet-500/20 border-violet-500/50',
  'bg-sky-500/20 border-sky-500/50',
]

/* ================================================================== *
 *  Tab 1 · What & why
 * ================================================================== */

const IntroSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Strip mining, generalised</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>Loop tiling</strong> is <strong>strip mining for several nested loops at once</strong>. It carves the
          iteration space into rectangular <strong>tiles</strong>, each processed by its own inner sub-loops — so a whole
          block of the array is worked on before moving to the next, dramatically improving cache reuse.
        </p>
        <p className="text-sm">
          A tiling is fixed by two numbers: the <strong>tile size</strong> <Code>ts</Code> and the{' '}
          <strong>tile offset</strong> <Code>to</Code> (with <Code>0 ≤ to ≤ ts</Code>). The offset fixes the possible{' '}
          <strong>corner points</strong> of the tiles: <Code>…, to−ts, to, to+ts, to+2ts, …</Code>.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tiling a single loop</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          For one loop, tiling produces the same two-deep nest as strip mining — an outer loop over tiles and an inner
          loop over one tile:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">before</div>
            <Pre>{`for (i = lo; i <= hi; i++)
  statements;`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after (tile size ts, offset to)</div>
            <Pre>{`for (it = ⌊(lo-to)/ts⌋·ts+to;
     it <= ⌊(hi-to)/ts⌋·ts+to; it += ts)
  for (i = max(lo, it); i <= min(hi, it+ts-1); i++)
    statements;`}</Pre>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Each tile <Code>it</Code> runs from <Code>tn·ts+to</Code> to <Code>(tn+1)·ts+to−1</Code>; the{' '}
          <Code>max/min</Code> clip it to the real bounds <Code>[lo, hi]</Code>. A tile starts at the iteration with{' '}
          <Code>i mod ts = to</Code>.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What carries over from strip mining</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-1.5 list-disc pl-5">
          <li><strong>Dependence distances</strong> are adapted <strong>exactly as for strip mining</strong> (§4.7): distance <Code>d → (d div ts, d mod ts)</Code>, plus the boundary-crossing vector when <Code>d mod ts ≠ 0</Code>.</li>
          <li><strong>Interchanging</strong> the resulting loops is allowed under the §4.4 conditions — and is the usual next step, to push the single-tile loops innermost.</li>
          <li>With multiple dimensions, tiling tries to move the <strong>within-tile loops to the innermost positions</strong> so the inner loops process exactly one tile.</li>
        </ul>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · Covering the space exactly  (interactive tiling line)
 * ================================================================== */

const TilingLine: React.FC = () => {
  const lo = 3
  const hi = 14
  const [ts, setTs] = useState(4)
  const [to, setTo] = useState(2)
  const toC = Math.min(to, ts)

  const firstTile = fdiv(lo - toC, ts) * ts + toC
  const lastTile = fdiv(hi - toC, ts) * ts + toC
  const dLo = Math.min(firstTile, lo)
  const dHi = Math.max(lastTile + ts - 1, hi)
  const cells: number[] = []
  for (let p = dLo; p <= dHi; p++) cells.push(p)

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
          <span className="text-xs text-muted-foreground mr-1">tile size ts =</span>
          {[3, 4, 5].map((v) => btn(v, ts, setTs))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">offset to =</span>
          {Array.from({ length: ts + 1 }, (_, v) => btn(v, toC, setTo))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {cells.map((p) => {
          const tileIdx = fdiv(p - toC, ts)
          const inSpace = p >= lo && p <= hi
          const isCorner = (p - toC) % ts === 0
          return (
            <div
              key={p}
              className={cn(
                'w-8 h-9 rounded-md border flex flex-col items-center justify-center text-[10px] font-mono',
                inSpace ? tilePalette[((tileIdx % tilePalette.length) + tilePalette.length) % tilePalette.length] : 'bg-transparent border-dashed border-border text-muted-foreground/50',
                isCorner && 'ring-1 ring-foreground/30'
              )}
            >
              <span>{p}</span>
              {inSpace && <span className="text-[8px] text-muted-foreground">t{tileIdx}</span>}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Iteration space <Code>[{lo}, {hi}]</Code> (solid) covered by tiles anchored at corner points{' '}
        <Code>to + k·ts</Code> (ringed). Dashed cells lie outside <Code>[lo, hi]</Code> and are clipped away by{' '}
        <Code>max/min</Code>.
      </p>

      <Formula>{`first tile:  ⌊(lo−to)/ts⌋·ts+to = ⌊(${lo}−${toC})/${ts}⌋·${ts}+${toC} = ${firstTile}
last  tile:  ⌊(hi−to)/ts⌋·ts+to = ⌊(${hi}−${toC})/${ts}⌋·${ts}+${toC} = ${lastTile}`}</Formula>
      <Pre>{`for (it = ${firstTile}; it <= ${lastTile}; it += ${ts})
  for (i = max(${lo}, it); i <= min(${hi}, it+${ts - 1}); i++)
    statements;`}</Pre>
    </div>
  )
}

const CoverSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The hard part — cover the space exactly</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The tiles are anchored at fixed corner points <Code>to + k·ts</Code>, but the loop only runs over{' '}
          <Code>[lo, hi]</Code>. We must find the <strong>first</strong> and <strong>last</strong> tile that touch the
          iteration space, without running any iteration twice or missing one.
        </p>
        <Formula>{`first tile of the dimension:   ⌊(lo − to)/ts⌋ · ts + to
last  tile of the dimension:   ⌊(hi − to)/ts⌋ · ts + to`}</Formula>
        <p className="text-sm">
          The <Code>⌊(lo−to)/ts⌋</Code> counts how many whole tiles sit between the offset <Code>to</Code> and the lower
          bound <Code>lo</Code> — that is where the first covering tile begins (its start may lie <em>before</em>{' '}
          <Code>lo</Code>, which the inner <Code>max(lo, it)</Code> then clips).
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — place the tiles</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Vary the tile size and offset and watch the first/last-tile formulas and the generated loop update. Notice the
          first tile can start before <Code>lo</Code> (even at a negative index).
        </p>
        <TilingLine />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · 2-D worked example  (tile then interchange)
 * ================================================================== */

const TileGrid2D: React.FC = () => {
  const scale = 2.6
  const MX = 22
  const MY = 18
  const W = 55 * scale + MX + 12
  const H = 66 * scale + MY + 8
  const sx = (i: number) => MX + i * scale
  const sy = (j: number) => H - MY - j * scale
  const lines = [5, 25, 45]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mx-auto block select-none" style={{ height: 'auto', maxWidth: 300 }}>
      {/* tile grid lines */}
      {lines.map((v) => (
        <line key={`v${v}`} x1={sx(v)} y1={sy(0)} x2={sx(v)} y2={sy(62)} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3 3" />
      ))}
      {lines.map((v) => (
        <line key={`h${v}`} x1={sx(0)} y1={sy(v)} x2={sx(54)} y2={sy(v)} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3 3" />
      ))}
      {/* iteration space: i=1..50, j=i..60 */}
      <polygon
        points={`${sx(1)},${sy(1)} ${sx(1)},${sy(60)} ${sx(50)},${sy(60)} ${sx(50)},${sy(50)}`}
        fill="var(--color-primary)"
        fillOpacity={0.14}
        stroke="var(--color-primary)"
        strokeWidth={1.4}
      />
      {/* axes */}
      <line x1={sx(0)} y1={sy(0)} x2={sx(54)} y2={sy(0)} stroke="var(--color-muted-foreground)" strokeWidth={1} />
      <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(64)} stroke="var(--color-muted-foreground)" strokeWidth={1} />
      <text x={sx(54)} y={sy(0) + 12} fontSize="9" fill="var(--color-muted-foreground)">i</text>
      <text x={sx(0) - 12} y={sy(64) + 4} fontSize="9" fill="var(--color-muted-foreground)">j</text>
      {[5, 25, 45].map((v) => (
        <text key={`xl${v}`} x={sx(v)} y={sy(0) + 12} fontSize="8" textAnchor="middle" fill="var(--color-muted-foreground)">{v}</text>
      ))}
      {[5, 25, 45, 60].map((v) => (
        <text key={`yl${v}`} x={sx(0) - 10} y={sy(v) + 3} fontSize="8" textAnchor="middle" fill="var(--color-muted-foreground)">{v}</text>
      ))}
      <text x={sx(50)} y={sy(0) + 12} fontSize="8" textAnchor="middle" fill="var(--color-muted-foreground)">50</text>
    </svg>
  )
}

const tileSteps: StepPanel[] = [
  {
    title: '0 · A triangular 2-D nest',
    body: (
      <>
        <Pre>{`for (i = 1; i <= 50; i++)
  for (j = i; j <= 60; j++)
    a[i][j] = a[i][j] + 1;`}</Pre>
        <p className="text-sm">Tile with <Code>ts = 20</Code>, <Code>to = 5</Code>. Corner points fall at <Code>5, 25, 45</Code>.</p>
      </>
    ),
  },
  {
    title: '1 · Tile the outer i-loop',
    body: (
      <>
        <p className="text-sm mb-1">
          <Code>lo = 1</Code>, <Code>hi = 50</Code>: first tile <Code>⌊(1−5)/20⌋·20+5 = −15</Code>, last tile{' '}
          <Code>⌊(50−5)/20⌋·20+5 = 45</Code>.
        </p>
        <Pre>{`for (it = -15; it <= 45; it += 20)
  for (i = max(1, it); i <= min(50, it+19); i++)
    for (j = i; j <= 60; j++)
      a[i][j] = a[i][j] + 1;`}</Pre>
      </>
    ),
  },
  {
    title: '2 · Tile the j-loop too',
    body: (
      <>
        <p className="text-sm mb-1">
          Now <Code>lo = i</Code>, <Code>hi = 60</Code>: first tile <Code>⌊(i−5)/20⌋·20+5</Code>, last tile{' '}
          <Code>⌊(60−5)/20⌋·20+5 = 45</Code>. This gives a four-deep nest:
        </p>
        <Pre>{`for (it = -15; it <= 45; it += 20)
  for (i = max(1, it); i <= min(50, it+19); i++)
    for (jt = ⌊(i-5)/20⌋·20+5; jt <= 45; jt += 20)
      for (j = max(i, jt); j <= min(60, jt+19); j++)
        a[i][j] = a[i][j] + 1;`}</Pre>
      </>
    ),
  },
  {
    title: '3 · Interchange to make inner loops process one tile',
    body: (
      <>
        <p className="text-sm mb-1">
          We want the two <em>within-tile</em> loops (<Code>i</Code>, <Code>j</Code>) innermost, so interchange the{' '}
          <Code>i</Code>-loop with the <Code>jt</Code>-loop. The new <Code>jt</Code> lower bound becomes{' '}
          <Code>max(−15, it)</Code>:
        </p>
        <Pre>{`for (it = -15; it <= 45; it += 20)
  for (jt = max(-15, it); jt <= 45; jt += 20)
    for (i = max(1, it); i <= min(50, it+19); i++)
      for (j = max(i, jt); j <= min(60, jt+19); j++)
        a[i][j] = a[i][j] + 1;`}</Pre>
        <Panel className="text-sm leading-relaxed">
          <Good>Result:</Good> the outer <Code>it, jt</Code> loops walk tile by tile; the inner <Code>i, j</Code> loops
          sweep a <strong>single tile</strong> — the cache-blocked form.
        </Panel>
      </>
    ),
  },
  {
    title: '4 · Where does max(−15, it) come from?',
    body: (
      <>
        <p className="text-sm mb-1">
          Insert each lower bound of <Code>i</Code> into the lower bound of <Code>jt = ⌊(i−5)/20⌋·20+5</Code> and take the
          maximum:
        </p>
        <Formula>{`i = 1   ⇒  jt = ⌊(1−5)/20⌋·20+5 = −15
i = it  ⇒  jt = ⌊(it−5)/20⌋·20+5 = (it−5)+5 = it
             (it is a multiple of ts=20 plus to=5, so ⌊(it−5)/20⌋·20 = it−5)`}</Formula>
        <p className="text-sm">⇒ the combined lower bound is <Code>jt = max(−15, it)</Code>, exactly as used in step 3.</p>
      </>
    ),
  },
]

const WorkedSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — tile a 2-D triangular nest</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="shrink-0">
            <TileGrid2D />
            <div className="text-[11px] text-muted-foreground text-center mt-1">
              iteration space <Code>i=1..50, j=i..60</Code><br />tiled at corner points 5, 25, 45
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <Stepper steps={tileSteps} showProgress />
          </div>
        </div>
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
      Five exam-style problems on §4.8, easy → hardest — all on <em>fresh</em> numbers, not the lecture's{' '}
      <Code>ts=20, to=5, i=1..50, j=i..60</Code> example. Q1 is fully worked to set the pattern; do the rest on paper,
      then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Tile a single loop — and check the covering"
      statement={
        <>
          <p className="mb-2">
            Tile this loop with tile size <Code>ts = 5</Code> and offset <Code>to = 3</Code>. Give the first and last
            tile, the resulting nest, and verify explicitly that every original iteration is covered exactly once.
          </p>
          <Pre>{`for (i = 4; i <= 19; i++)
  a[i] = a[i] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <Formula>{`first tile: ⌊(4−3)/5⌋·5+3 = ⌊0.2⌋·5+3 = 0·5+3 = 3
last  tile: ⌊(19−3)/5⌋·5+3 = ⌊3.2⌋·5+3 = 3·5+3 = 18`}</Formula>
          <Pre>{`for (it = 3; it <= 18; it += 5)
  for (i = max(4, it); i <= min(19, it+4); i++)
    a[i] = a[i] + 1;`}</Pre>
          <p className="text-sm mb-1">
            Tiles anchor at <Code>3, 8, 13, 18</Code> (step 5). <strong>Check the covering</strong> tile by tile:
          </p>
          <Table
            head={['Tile it', 'Raw range [it, it+4]', 'Clipped by max(4,·)/min(19,·)']}
            rows={[
              ['3', '[3, 7]', '[4, 7]'],
              ['8', '[8, 12]', '[8, 12]'],
              ['13', '[13, 17]', '[13, 17]'],
              ['18', '[18, 22]', '[18, 19]'],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Covers [4, 19] exactly:</Good> <Code>4–7, 8–12, 13–17, 18–19</Code> — every iteration exactly once, no
            gap, no overlap. <strong>Pattern for Q2–Q5:</strong> compute first/last with the floor formula, then
            sanity-check coverage tile by tile before trusting the result — exactly what an exam grader will look for.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Strip mining as tiling with a forced offset"
      statement={
        <>
          <p className="mb-2">
            §4.7's strip mining never used an offset <Code>to</Code> and its first strip always started exactly at{' '}
            <Code>lo</Code> — no negative start, no <Code>max()</Code> ever needed on the lower end. Explain strip
            mining as a <em>special case</em> of tiling: what value of <Code>to</Code> makes the tiling formulas
            reproduce that behaviour, and why?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Set <Code>to = lo mod ts</Code>. Then <Code>lo − to</Code> is an exact multiple of <Code>ts</Code>, so{' '}
            <Code>⌊(lo−to)/ts⌋·ts + to = (lo−to) + to = lo</Code> — the first tile lands <em>exactly</em> on{' '}
            <Code>lo</Code>, with nothing before it to clip.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Strip mining = tiling with <Code>to</Code> chosen so <Code>lo</Code> itself is a corner.</Good> That is
            exactly why §4.7's strip-mined form <Code>for (is = lo; is {'<='} hi; is += s)</Code> could start the outer
            loop directly at <Code>lo</Code> with no <Code>max()</Code> guard — general tiling exposes the offset as a
            free parameter, and strip mining is the case where that freedom is pinned down to avoid a partial first
            tile.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="A tiling where the first tile starts well before lo"
      statement={
        <>
          <p className="mb-2">
            For <Code>for (i = 7; i {'<='} 42; i++)</Code> tiled with <Code>ts = 12</Code>, <Code>to = 9</Code>, compute
            the first and last tile, and list all four tiles with their clipped ranges.
          </p>
        </>
      }
      solution={
        <>
          <Formula>{`first: ⌊(7−9)/12⌋·12+9 = ⌊−0.167⌋·12+9 = (−1)·12+9 = −3
last:  ⌊(42−9)/12⌋·12+9 = ⌊2.75⌋·12+9 = 2·12+9 = 33`}</Formula>
          <Pre>{`for (it = -3; it <= 33; it += 12)
  for (i = max(7, it); i <= min(42, it+11); i++)
    ...`}</Pre>
          <Table
            head={['Tile it', 'Raw range', 'Clipped']}
            rows={[
              ['−3', '[−3, 8]', '[7, 8]'],
              ['9', '[9, 20]', '[9, 20]'],
              ['21', '[21, 32]', '[21, 32]'],
              ['33', '[33, 44]', '[33, 42]'],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Covers [7, 42] exactly.</Good> The first tile's raw range starts at <Code>−3</Code>, well before{' '}
            <Code>lo = 7</Code> — harmless, since <Code>max(7, it)</Code> clips it. This is precisely the phenomenon Q2
            explained: <Code>to = 9 ≠ 7 mod 12 = 7</Code>, so <Code>lo</Code> is <em>not</em> itself a corner, and the
            first tile inevitably starts early.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Tile a 2-D nest with the variable bound on top"
      statement={
        <>
          <p className="mb-2">
            Tile both loops with <Code>ts = 15</Code>, <Code>to = 5</Code>. Give the resulting four-deep loop nest.
            (Note: here it's the <em>upper</em> bound of <Code>j</Code> that depends on <Code>i</Code>, the mirror image
            of a lower-bound dependency.)
          </p>
          <Pre>{`for (i = 1; i <= 40; i++)
  for (j = 1; j <= i; j++)
    b[i][j] = b[i][j] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>i-loop</strong> (<Code>lo=1, hi=40</Code>): first <Code>⌊(1−5)/15⌋·15+5 = −10</Code>, last{' '}
            <Code>⌊(40−5)/15⌋·15+5 = 35</Code>.
          </p>
          <p className="text-sm mb-1">
            <strong>j-loop</strong> (<Code>lo=1</Code> constant, <Code>hi=i</Code> variable): first tile is{' '}
            <Code>⌊(1−5)/15⌋·15+5 = −10</Code> — <strong>constant</strong>, since <Code>lo=1</Code> never changes. The{' '}
            <em>last</em> tile is the one that now depends on <Code>i</Code>: <Code>⌊(i−5)/15⌋·15+5</Code>.
          </p>
          <Pre>{`for (it = -10; it <= 35; it += 15)
  for (i = max(1, it); i <= min(40, it+14); i++)
    for (jt = -10; jt <= ⌊(i-5)/15⌋·15+5; jt += 15)
      for (j = max(1, jt); j <= min(i, jt+14); j++)
        b[i][j] = b[i][j] + 1;`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Correct.</Good> Contrast with the lecture's own example: there the <em>lower</em> bound of the inner
            loop depended on the outer index, so tiling made the <em>first</em>-tile formula i-dependent. Here the{' '}
            <em>upper</em> bound depends on <Code>i</Code>, so it's the <em>last</em>-tile formula that carries the{' '}
            <Code>i</Code> — same mechanism, mirrored.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Interchange the mirrored case — derive, don't guess"
      statement={
        <>
          <p className="mb-2">
            Continue Q4: interchange the <Code>i</Code>-loop with the <Code>jt</Code>-loop so the two within-tile loops
            are innermost. (a) Derive the new bound that <Code>jt</Code> needs. (b) Explain why, unlike Q4's lecture
            counterpart, it is <Code>jt</Code>'s <em>upper</em> bound — not lower — that must change.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a) Derive the bound.</strong> Before interchange, for a fixed <Code>i</Code>, <Code>jt</Code> climbs
            up to <Code>U(i) = ⌊(i−5)/15⌋·15+5</Code> (i's own tile corner). After hoisting <Code>jt</Code> above{' '}
            <Code>i</Code>, its new upper bound must be the <strong>largest</strong> <Code>U(i)</Code> reachable over{' '}
            <em>all</em> <Code>i</Code> in the current <Code>it</Code>-tile — and since <Code>U</Code> is non-decreasing
            in <Code>i</Code>, that maximum occurs at the tile's own largest <Code>i</Code>, namely{' '}
            <Code>min(40, it+14)</Code>:
          </p>
          <Formula>{`jt upper bound = U(min(40, it+14)) = ⌊(min(40,it+14) − 5)/15⌋·15 + 5`}</Formula>
          <p className="text-sm mb-1">
            Now simplify: <Code>min(40, it+14)</Code> always lies <em>inside</em> <Code>it</Code>'s own tile{' '}
            <Code>[it, it+14]</Code> (it can't reach the next corner <Code>it+15</Code>). So its tile-corner is simply{' '}
            <Code>it</Code> itself:
          </p>
          <Formula>{`⇒  jt upper bound = it`}</Formula>
          <Pre>{`for (it = -10; it <= 35; it += 15)
  for (jt = -10; jt <= it; jt += 15)
    for (i = max(1, it); i <= min(40, it+14); i++)
      for (j = max(1, jt); j <= min(i, jt+14); j++)
        b[i][j] = b[i][j] + 1;`}</Pre>
          <p className="text-sm mb-1">
            (The <Code>i</Code>-loop's own bounds are untouched by the interchange — only the loop being <em>hoisted</em>{' '}
            needs a bound rederived, exactly as in the lecture's case.)
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <strong>(b)</strong> In the lecture's Q4-analogue, the inner loop's <em>lower</em> bound depended on{' '}
            <Code>i</Code> (because <Code>j</Code>'s lower bound there was <Code>i</Code> itself), so hoisting required
            fixing a lower bound — solved with a <Code>max</Code>. Here <Code>j</Code>'s <em>upper</em> bound is{' '}
            <Code>i</Code>, so the dependency sits on <Code>jt</Code>'s upper bound instead, and hoisting resolves it
            with the symmetric idea (take the extremal value over the tile) — it simply comes out as an upper limit,
            needing no explicit <Code>min</Code> here only because it collapsed to the clean closed form <Code>it</Code>.
            <strong> General rule:</strong> whichever original bound (lower or upper) carries the outer index, hoisting
            that loop past it requires re-deriving <em>that same side</em> of the hoisted loop's range.
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
  { id: 'cover', label: 'Covering the space', render: () => <CoverSection /> },
  { id: 'worked', label: '2-D worked example', render: () => <WorkedSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function LoopTilingStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 4 · §4.8 · Loop Tiling"
      title="Loop Tiling"
      subtitle="Strip mining generalised to nested loops: partition the iteration space into rectangular tiles (size ts, offset to) so inner loops sweep one cache-friendly block at a time. The floor formulas ⌊(lo−to)/ts⌋·ts+to and ⌊(hi−to)/ts⌋·ts+to cover the space exactly; distances adapt as in strip mining, and a follow-up interchange pushes the within-tile loops innermost."
      tabs={tabs}
    />
  )
}
