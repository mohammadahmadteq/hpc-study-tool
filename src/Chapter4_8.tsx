import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { cn } from './lib/utils'
import {
  Code,
  Pre,
  Formula,
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
      Five exam-style problems on §4.8, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Tile a single loop"
      statement={
        <>
          <p className="mb-2">
            Tile this loop with tile size <Code>ts = 4</Code> and offset <Code>to = 2</Code>. Give the first and last tile
            and the resulting nest.
          </p>
          <Pre>{`for (i = 3; i <= 14; i++)
  a[i] = a[i] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <Formula>{`first tile: ⌊(3−2)/4⌋·4+2 = ⌊0.25⌋·4+2 = 2
last  tile: ⌊(14−2)/4⌋·4+2 = ⌊3⌋·4+2 = 14`}</Formula>
          <Pre>{`for (it = 2; it <= 14; it += 4)
  for (i = max(3, it); i <= min(14, it+3); i++)
    a[i] = a[i] + 1;`}</Pre>
          <p className="text-sm mb-1">
            Tiles start at <Code>2, 6, 10, 14</Code>. The first tile begins at <Code>2</Code> (before <Code>lo = 3</Code>),
            so <Code>max(3, 2) = 3</Code> clips it; the last tile <Code>[14, 17]</Code> is clipped to <Code>14</Code>.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Covers [3, 14] exactly:</Good> tiles give <Code>3–5, 6–9, 10–13, 14</Code> — every iteration once. Tiling
            of one loop is exactly strip mining with a chosen corner offset.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Tiling vs strip mining"
      statement={
        <>
          <p className="mb-2">
            How does loop tiling relate to strip mining? What do the tile size <Code>ts</Code> and offset <Code>to</Code>{' '}
            control, and how are dependence distances handled?
          </p>
        </>
      }
      solution={
        <>
          <Panel className="text-sm leading-relaxed">
            <strong>Tiling generalises strip mining to several nested loops:</strong> instead of 1-D strips it uses{' '}
            <em>rectangular tiles</em> of the multi-dimensional iteration space, each handled by inner sub-loops.
            <div className="mt-1">
              <Code>ts</Code> sets the tile edge length; <Code>to</Code> (with <Code>0 ≤ to ≤ ts</Code>) fixes the tile{' '}
              <strong>corner points</strong> at <Code>to + k·ts</Code>. A tile of a dimension starts at the iteration with{' '}
              <Code>i mod ts = to</Code>.
            </div>
            <div className="mt-1">
              <strong>Dependence distances</strong> are adapted <strong>the same way as for strip mining</strong>:{' '}
              <Code>d → (d div ts, d mod ts)</Code>, with a second vector when <Code>d mod ts ≠ 0</Code>.
            </div>
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="First and last tile with a negative start"
      statement={
        <>
          <p className="mb-2">
            For a loop <Code>for (i = 1; i {'<='} 50; i++)</Code> tiled with <Code>ts = 20</Code>, <Code>to = 5</Code>,
            compute the first and last tile starts and write the outer tile-loop header.
          </p>
        </>
      }
      solution={
        <>
          <Formula>{`first: ⌊(1−5)/20⌋·20+5 = ⌊−0.2⌋·20+5 = (−1)·20+5 = −15
last:  ⌊(50−5)/20⌋·20+5 = ⌊2.25⌋·20+5 = 2·20+5 = 45`}</Formula>
          <Pre>{`for (it = -15; it <= 45; it += 20)
  for (i = max(1, it); i <= min(50, it+19); i++)
    ...`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            The first tile starts at <Code>−15</Code> — well before <Code>lo = 1</Code>. That is fine: the tile corner is
            anchored to the offset grid, and <Code>max(1, it)</Code> discards the part outside the iteration space.
            Tiles: <Code>[−15,4], [5,24], [25,44], [45,64]</Code>, clipped to <Code>[1,4],[5,24],[25,44],[45,50]</Code>.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Tile a 2-D nest"
      statement={
        <>
          <p className="mb-2">
            Tile both loops of this nest with <Code>ts = 20</Code>, <Code>to = 5</Code>. Give the resulting four-deep loop
            nest.
          </p>
          <Pre>{`for (i = 1; i <= 50; i++)
  for (j = i; j <= 60; j++)
    a[i][j] = a[i][j] + 1;`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>i-loop</strong> (<Code>lo=1, hi=50</Code>): tiles from <Code>−15</Code> to <Code>45</Code>.{' '}
            <strong>j-loop</strong> (<Code>lo=i, hi=60</Code>): first tile <Code>⌊(i−5)/20⌋·20+5</Code>, last{' '}
            <Code>⌊(60−5)/20⌋·20+5 = 45</Code>.
          </p>
          <Pre>{`for (it = -15; it <= 45; it += 20)
  for (i = max(1, it); i <= min(50, it+19); i++)
    for (jt = ⌊(i-5)/20⌋·20+5; jt <= 45; jt += 20)
      for (j = max(i, jt); j <= min(60, jt+19); j++)
        a[i][j] = a[i][j] + 1;`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Correct.</Good> Each pair (<Code>it</Code>, <Code>i</Code>) tiles the first dimension; (<Code>jt</Code>,{' '}
            <Code>j</Code>) tiles the second. The <Code>jt</Code> start depends on <Code>i</Code> because the original{' '}
            <Code>j</Code>-bound <Code>j = i</Code> is non-rectangular.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Interchange so the inner loops process one tile"
      statement={
        <>
          <p className="mb-2">
            Continue Q4: interchange the <Code>i</Code>-loop with the <Code>jt</Code>-loop so the two within-tile loops are
            innermost. Give the final nest and derive the new <Code>jt</Code> lower bound.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            Insert the lower bounds of <Code>i</Code> into <Code>jt = ⌊(i−5)/20⌋·20+5</Code> and take the max:
          </p>
          <Formula>{`i = 1   ⇒  jt = ⌊(1−5)/20⌋·20+5 = −15
i = it  ⇒  jt = ⌊(it−5)/20⌋·20+5 = it   (it ≡ 5 mod 20 ⇒ ⌊(it−5)/20⌋·20 = it−5)
⇒  jt lower bound = max(−15, it)`}</Formula>
          <Pre>{`for (it = -15; it <= 45; it += 20)
  for (jt = max(-15, it); jt <= 45; jt += 20)
    for (i = max(1, it); i <= min(50, it+19); i++)
      for (j = max(i, jt); j <= min(60, jt+19); j++)
        a[i][j] = a[i][j] + 1;`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Cache-blocked form.</Good> The two outer loops <Code>it, jt</Code> select a tile; the two inner loops{' '}
            <Code>i, j</Code> sweep exactly that tile. The interchange is legal by the §4.4 direction-vector condition, and
            the <Code>max(−15, it)</Code> keeps the <Code>jt</Code> range consistent with the outer <Code>it</Code>.
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
