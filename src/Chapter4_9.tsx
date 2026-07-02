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
 *  Chapter 4 · §4.9 — Optimizing for Locality in Memory Hierarchies
 *  (PDF 214–236). Memory hierarchy + temporal/spatial/sequential
 *  locality; making the right loop innermost; the affine access model
 *  x[A·i+c] with reuse factors & footprints; group reuse for multiple
 *  references; and the matrix-multiplication loop-order case study.
 * ------------------------------------------------------------------ */

/* small bracketed matrix */
const Mat: React.FC<{ rows: (string | number)[][]; label?: React.ReactNode }> = ({ rows, label }) => (
  <span className="inline-flex items-center gap-1 font-mono text-[12px] align-middle">
    {label && <span className="italic mr-0.5">{label} =</span>}
    <span className="inline-flex items-stretch">
      <span className="w-1 border-l border-y border-foreground/70" />
      <span className="inline-grid gap-x-2 px-1" style={{ gridTemplateColumns: `repeat(${rows[0].length}, auto)` }}>
        {rows.map((r, ri) => r.map((c, ci) => <span key={`${ri}-${ci}`} className="text-center">{c}</span>))}
      </span>
      <span className="w-1 border-r border-y border-foreground/70" />
    </span>
  </span>
)

/* ================================================================== *
 *  Tab 1 · Locality & the hierarchy
 * ================================================================== */

const IntroSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The memory hierarchy</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A processor sees several levels of memory, from fast/small/expensive to slow/large/cheap:
        </p>
        <Table
          head={['Level', 'Managed by', 'Relative speed']}
          rows={[
            [<strong>Registers</strong>, <>the compiler (explicitly)</>, <>fastest</>],
            [<strong>Cache L1 / L2 / L3</strong>, <>hardware</>, <>fast</>],
            [<strong>Main memory</strong>, <>OS / hardware</>, <>slow</>],
            [<strong>Disk</strong>, <>OS</>, <>slowest</>],
          ]}
        />
        <p className="text-sm mt-1">
          Going down: <strong>decreasing cost per byte, increasing access time</strong>. By the{' '}
          <strong>inclusion principle</strong>, the addresses at one level are a subset of those at the level below. An
          access is served by the <strong>highest</strong> level that holds the address, and it brings that address (plus
          its neighbours) up to the top level.
        </p>
        <Panel className="text-sm leading-relaxed mt-1">
          <strong>Goal:</strong> make a program's <strong>average memory access time</strong> as close as possible to the
          access time of the <em>fastest</em> memory — by keeping the data the program needs in the fast levels.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Two kinds of locality</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          <Panel className="my-0">
            <Tag tone="good">Temporal locality</Tag>
            <p className="text-sm mt-1.5">
              The <strong>same</strong> memory cell is accessed <strong>multiple times</strong>, as close together in time
              as possible — so it stays in cache/register between uses.
            </p>
          </Panel>
          <Panel className="my-0">
            <Tag tone="good">Spatial locality</Tag>
            <p className="text-sm mt-1.5">
              At consecutive times, <strong>adjacent</strong> memory cells are accessed — so one loaded cache line serves
              many accesses.
            </p>
          </Panel>
        </div>
        <p className="text-sm mt-3">
          <strong>Reuse distance</strong> = the distance between the addresses of two consecutive accesses. When it is{' '}
          <Code>±1</Code>, consecutive accesses hit consecutive addresses — <strong>sequential locality</strong>, the
          best case for a cache line.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">How loop transformations help</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-1">
          The whole point of the §4.4–4.8 transformations is to reorganise nested loops so the hierarchy is used well ⇒{' '}
          lower average access time. Two recurring levers:
        </p>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li>Accessing a <strong>loop-invariant</strong> address in the <strong>inner</strong> loop gives that address high <strong>temporal locality</strong>.</li>
          <li><strong>Tiling</strong> improves temporal locality when a tile's data fits in the cache.</li>
        </ul>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · Single array access  (the x/y/z example)
 * ================================================================== */

type Order = 'ij' | 'ji'

const LoopOrderLocality: React.FC = () => {
  const [order, setOrder] = useState<Order>('ij')
  const jInner = order === 'ij'

  // per-reference classification depending on which loop is innermost
  const rows: [React.ReactNode, React.ReactNode, React.ReactNode][] = jInner
    ? [
        [<Code>x[i][j]</Code>, <Good>sequential</Good>, <>inner <Code>j</Code> is the last (contiguous) index → stride 1</>],
        [<Code>y[i]</Code>, <Good>temporal</Good>, <>independent of inner <Code>j</Code> → reused every iteration (register)</>],
        [<Code>z[j]</Code>, <Good>sequential</Good>, <>inner <Code>j</Code> steps <Code>z</Code> by 1</>],
      ]
    : [
        [<Code>x[i][j]</Code>, <Bad>none</Bad>, <>inner <Code>i</Code> is the first index → stride m (new cache line each time)</>],
        [<Code>y[i]</Code>, <Good>sequential</Good>, <>inner <Code>i</Code> steps <Code>y</Code> by 1</>],
        [<Code>z[j]</Code>, <Good>temporal</Good>, <>independent of inner <Code>i</Code> → reused every iteration</>],
      ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setOrder('ij')}
          className={cn('text-[12px] px-2.5 py-1 rounded-full border transition-colors', jInner ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}
        >
          original: i outer, j inner
        </button>
        <button
          onClick={() => setOrder('ji')}
          className={cn('text-[12px] px-2.5 py-1 rounded-full border transition-colors', !jInner ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}
        >
          interchanged: j outer, i inner
        </button>
      </div>

      <Pre>{jInner
        ? `for (i = 1; i <= n; i++)
  for (j = 1; j <= m; j++)
    x[i][j] = y[i] + z[j];`
        : `for (j = 1; j <= m; j++)
  for (i = 1; i <= n; i++)
    x[i][j] = y[i] + z[j];`}</Pre>

      <Table head={['Reference', 'Locality', 'Why']} rows={rows} />

      <Panel className={cn('text-sm leading-relaxed mt-1 border-2', jInner ? 'border-emerald-500/60' : 'border-amber-500/60')}>
        {jInner ? (
          <>
            <Good>Keep this order.</Good> The big 2-D array <Code>x</Code> (n·m elements) gets <strong>sequential</strong>{' '}
            access along its contiguous dimension, and <Code>y[i]</Code> is reused from a register. Overall the{' '}
            <strong>highest locality</strong>.
          </>
        ) : (
          <>
            <Bad>Worse.</Bad> Interchanging gains temporal locality on the small vector <Code>z</Code> but{' '}
            <strong>destroys</strong> the sequential access to the large array <Code>x</Code> (now strided). Net loss.
          </>
        )}
      </Panel>
    </div>
  )
}

const bigMSteps: StepPanel[] = [
  {
    title: '0 · Locality depends on the size of z',
    body: (
      <>
        <p className="text-sm mb-1">
          With <Code>j</Code> innermost, each outer iteration <Code>i</Code> sweeps the whole vector <Code>z[1..m]</Code>.
        </p>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li><strong>Small m:</strong> all of <Code>z</Code> fits in cache ⇒ extra temporal locality across outer iterations (z stays hot).</li>
          <li><strong>Big m:</strong> <Code>z</Code> does not fit ⇒ it is <Bad>reloaded every outer iteration</Bad> ⇒ reduced locality.</li>
        </ul>
      </>
    ),
  },
  {
    title: '1 · Fix big m and n with tiling',
    body: (
      <>
        <p className="text-sm mb-1">
          Tile both loops (tile size <Code>B</Code>, offset = lower bound 1):
        </p>
        <Pre>{`for (it = 1; it <= n; it += B)
  for (i = it; i <= min(n, it+B-1); i++)
    for (jt = 1; jt <= m; jt += B)
      for (j = jt; j <= min(m, jt+B-1); j++)
        x[i][j] = y[i] + z[j];`}</Pre>
      </>
    ),
  },
  {
    title: '2 · Interchange to reuse the cached z-block',
    body: (
      <>
        <p className="text-sm mb-1">
          After interchanging the <Code>i</Code>-loop with the <Code>jt</Code>-loop, a block of <Code>B</Code> elements of{' '}
          <Code>z</Code> stays in cache and is reused <Code>B</Code> times (once per <Code>i</Code> in the block) before
          the next tile:
        </p>
        <Pre>{`for (it = 1; it <= n; it += B)
  for (jt = 1; jt <= m; jt += B)
    for (i = it; i <= min(n, it+B-1); i++)
      for (j = jt; j <= min(m, jt+B-1); j++)
        x[i][j] = y[i] + z[j];`}</Pre>
        <Panel className="text-sm leading-relaxed">
          <Good>Result:</Good> the working set of the two inner loops (one tile of <Code>x</Code>, a block of{' '}
          <Code>z</Code>, a slice of <Code>y</Code>) fits in cache, so <Code>z</Code> is no longer reloaded across the
          whole row.
        </Panel>
      </>
    ),
  },
]

const SingleSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Make the right loop innermost</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-1.5 list-disc pl-5">
          <li>If a loop accesses an array with <strong>step size 1</strong>, making it the <strong>innermost</strong> loop gives <strong>sequential locality</strong>: the first access loads a whole cache line of consecutive elements, which are then used without reloading.</li>
          <li>If an array access is <strong>independent of a loop</strong> (its index doesn't mention that loop), making that loop innermost gives <strong>temporal locality</strong> — and the access can be replaced by a <strong>scalar in a register</strong>.</li>
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Example — which order wins?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          <Code>x[i][j] = y[i] + z[j]</Code> with <Code>x</Code> stored <strong>row-major</strong>. Toggle the loop order
          and see the per-reference locality — the conclusion is <em>not</em> symmetric.
        </p>
        <LoopOrderLocality />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">…and when z is too big for cache</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={bigMSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · Quantifying reuse
 * ================================================================== */

const TemporalColumns: React.FC = () => {
  const [inner, setInner] = useState<'i' | 'j'>('j')
  // temporal locality iff that loop's column is all-zero
  const temporal = {
    'x[i][j]': { i: false, j: false },
    'y[i]': { i: false, j: true },
    'z[j]': { i: true, j: false },
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">innermost loop:</span>
        {(['i', 'j'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setInner(l)}
            className={cn('w-9 h-8 rounded-md border font-mono text-sm transition-colors', inner === l ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-center mb-3">
        <Mat label={<>A<sub>x</sub></>} rows={[[1, 0], [0, 1]]} />
        <Mat label={<>A<sub>y</sub></>} rows={[[1, 0]]} />
        <Mat label={<>A<sub>z</sub></>} rows={[[0, 1]]} />
      </div>

      <Table
        head={['Reference', 'column for the inner loop', 'temporal locality?']}
        rows={(['x[i][j]', 'y[i]', 'z[j]'] as const).map((ref) => {
          const has = temporal[ref][inner]
          const col = inner === 'i' ? '1st column' : '2nd column'
          return [
            <Code>{ref}</Code>,
            <>{col} {has ? 'is all-zero' : 'has a non-zero'}</>,
            has ? <Good>yes — reused every {inner}-iteration</Good> : <Bad>no</Bad>,
          ]
        })}
      />
      <Panel className="text-sm leading-relaxed mt-1">
        A reference has <strong>temporal locality</strong> w.r.t. a loop exactly when that loop's <strong>column of the
        coefficient matrix is all zeros</strong> (the loop variable doesn't appear in the subscript). Making that loop{' '}
        innermost realises the reuse. With <Code>{inner}</Code> innermost:{' '}
        {inner === 'j' ? <><Code>y[i]</Code> reuses (its <Code>j</Code>-column is 0).</> : <><Code>z[j]</Code> reuses (its <Code>i</Code>-column is 0).</>}{' '}
        <Code>x</Code> never reuses temporally — no non-zero <Code>d⃗</Code> solves <Code>A_x·d⃗ = 0</Code>.
      </Panel>
    </div>
  )
}

const ReuseFactorTable: React.FC = () => {
  const [tiled, setTiled] = useState(false)
  const rows = tiled
    ? [
        ['x[i][j]', '1', '1', '1', '4', 'B²/4', 'B/4'],
        ['y[i]', '1', 'B', '4', '1', 'B/4', '1'],
        ['z[j]', 'B', '1', '1', '4', 'B/4', 'B/4'],
      ]
    : [
        ['x[i][j]', '1', '1', '1', '4', 'n·m/4', 'm/4'],
        ['y[i]', '1', 'm', '4', '1', 'n/4', '1'],
        ['z[j]', 'n', '1', '1', '4', 'm/4', 'm/4'],
      ]
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setTiled(false)}
          className={cn('text-[12px] px-2.5 py-1 rounded-full border transition-colors', !tiled ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}
        >
          original nest
        </button>
        <button
          onClick={() => setTiled(true)}
          className={cn('text-[12px] px-2.5 py-1 rounded-full border transition-colors', tiled ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}
        >
          after tiling (block B)
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[420px]">
          <thead>
            <tr>
              <th className="bg-muted px-2 py-1 text-left border-b" rowSpan={2}>ref</th>
              <th className="bg-muted px-2 py-1 text-center border-b" colSpan={2}>temporal Rᶻ</th>
              <th className="bg-muted px-2 py-1 text-center border-b" colSpan={2}>spatial Rʳ</th>
              <th className="bg-muted px-2 py-1 text-center border-b" colSpan={2}>footprint F</th>
            </tr>
            <tr>
              {['i', 'j', 'i', 'j', 'Fᵢ', 'Fⱼ'].map((h, k) => (
                <th key={k} className="bg-muted px-2 py-1 text-center border-b font-mono">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-b last:border-b-0">
                {r.map((c, ci) => (
                  <td key={ci} className={cn('px-2 py-1 font-mono', ci === 0 ? 'text-left' : 'text-center')}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Panel className="text-sm leading-relaxed mt-2">
        {tiled ? (
          <>Cache blocks loaded for the two innermost loops ≈ <Code>B²/4 + B/2</Code>. Pick <Code>B</Code> so this fits in
          cache — then the whole working set of the inner loops stays cached.</>
        ) : (
          <>Total cache blocks loaded (sum of <Code>Fᵢ</Code>) ≈ <Code>n·m/4 + n/4 + m/4</Code>. The <Code>x</Code> term{' '}
          <Code>n·m/4</Code> dominates — that is what tiling attacks.</>
        )}
      </Panel>
    </div>
  )
}

const QuantSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The affine access model</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Each array access with affine subscripts is written <Code>x[A·i⃗ + c⃗]</Code>, where <Code>A ∈ ℕ^(d×n)</Code> is
          the <strong>coefficient matrix</strong> (d = array dimension, n = number of surrounding loops), <Code>c⃗</Code>{' '}
          the offset, and <Code>i⃗</Code> the iteration vector.
        </p>
        <p className="text-sm mb-1">Example — <Code>x[i, j+1]</Code> in a doubly-nested loop:</p>
        <div className="flex flex-wrap gap-3 items-center">
          <Mat label="A" rows={[[1, 0], [0, 1]]} />
          <Mat label={<>i⃗</>} rows={[['i'], ['j']]} />
          <Mat label={<>c⃗</>} rows={[[0], [1]]} />
        </div>
        <Formula>{`Temporal locality with distance d⃗ ≠ 0  ⟺  A·d⃗ = 0⃗
(equivalently: some column of A is all zeros ⇒ that loop's variable is absent)`}</Formula>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Zero column ⇒ temporal locality</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          For <Code>x[i][j] = y[i] + z[j]</Code>, look at each reference's coefficient matrix and choose the innermost
          loop:
        </p>
        <TemporalColumns />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reuse factors & footprint</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-1.5 mb-3">
          <div><strong>Temporal reuse factor</strong> <Code>Rᶻ_k = n_k</Code> if the k-th column of A is all zeros, else <Code>1</Code> — the number of reuses of an element over one full run of loop <Code>L_k</Code>.</div>
          <div><strong>Spatial reuse factor</strong> <Code>Rʳ_k = max(1, l/a_sk)</Code> if the k-th column has a non-zero only in the most-significant (contiguous) row s (coefficient <Code>a_sk</Code>), else <Code>1</Code>. Here <Code>l</Code> = cache-block size in words.</div>
          <div><strong>Overall</strong> <Code>R_k = Rᶻ_k</Code> if <Code>Rᶻ_k &gt; 1</Code>, else <Code>Rʳ_k</Code>.</div>
          <div><strong>Data footprint</strong> <Code>F_k = ∏(i=k..n) n_i / R_i</Code> — a rough count of cache blocks loaded (worst case when every <Code>R = 1</Code>).</div>
        </div>
        <p className="text-sm mb-3">With <Code>l = 4</Code> for the example (compare original vs tiled):</p>
        <ReuseFactorTable />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 4 · Group reuse  (multiple accesses to the same array)
 * ================================================================== */

const GroupSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reuse between different references</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          When the <strong>same array</strong> is read through several references with the <strong>same coefficient
          matrix</strong> <Code>A</Code> (a <strong>group</strong>), one reference can reuse data another already
          brought in. Two references <Code>x[A·i⃗ + c⃗₁]</Code> and <Code>x[A·i⃗ + c⃗₂]</Code> touch the same element when:
        </p>
        <Formula>{`A·i⃗₁ + c⃗₁ = A·i⃗₂ + c⃗₂   ⟺   A·d⃗ = c⃗₁ − c⃗₂,   d⃗ = i⃗₂ − i⃗₁`}</Formula>
        <p className="text-sm">
          If such iterations exist and one reference writes, this is a genuine <strong>dependence</strong>. References are
          sorted by <strong>descending memory address</strong> so distance vectors come out positive.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Temporal group-reuse factor Wᶻ·ᵍ</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['case', 'meaning', 'factor']}
          rows={[
            [<Code>d⃗ = 0⃗</Code>, <>both references hit the same element in the same iteration (loop-independent)</>, <Code>Wᶻ·ᵍ = ∞</Code>],
            [<Code>d⃗ ≠ 0⃗</Code>, <>loop-carried: reused after <Code>d_k</Code> iterations of the outermost non-zero loop <Code>L_k</Code></>, <Code>Wᶻ·ᵍ_k = n_k / d_k</Code>],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">For every other loop the factor is 1.</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Spatial group-reuse factor Wʳ·ᵍ</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Extra spatial reuse appears only in the contiguous dimension when two references land in the <strong>same cache
          block</strong>. Conditions for it to be worth counting:
        </p>
        <ul className="text-sm space-y-1 list-disc pl-5 mb-2">
          <li>The <strong>gcd</strong> of the coefficients in that dimension must be <Code>≠ 1</Code>. <br /><Code>x[4i]</Code> &amp; <Code>x[3i+1]</Code> (gcd 1) → <Bad>no</Bad> extra reuse; <Code>x[4i]</Code> &amp; <Code>x[2i+1]</Code> (gcd 2) → <Good>yes</Good>.</li>
          <li>The <strong>offset must not be a multiple of the gcd</strong>, otherwise the reuse is already covered by temporal reuse. E.g. <Code>x[2i]</Code> &amp; <Code>x[2i+2]</Code> give <Code>x[2],x[4],x[4],x[6],…</Code> — pure temporal.</li>
        </ul>
        <Formula>{`If single-ref spatial reuse exists     → Wʳ·ᵍ = 1
If gcd divides the offset               → Wʳ·ᵍ = 1
else, d⃗ = 0  → Wʳ·ᵍ_k = n_k (innermost)
      d⃗ ≠ 0  → Wʳ·ᵍ_k = n_k / d_k (outermost non-zero d_k)`}</Formula>
        <p className="text-sm">
          Classic win: <Code>x[4i]</Code> and <Code>x[4i+1]</Code> — <em>neither</em> has spatial reuse alone, but
          together (<Code>d = 1</Code>) they reuse the block ⇒ <Code>Wʳ·ᵍ</Code> = the surrounding loop's trip count.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cumulative group-reuse — worked table</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`for (i = 1; i <= n; i++)
  for (j = 1; j <= m; j++) {
    ... x[i][j]   ...
    ... x[i+1][j] ...
    ... x[i][j]   ...
    ... x[i][j-1] ...
  }`}</Pre>
        <p className="text-sm mb-2">
          All four references share the access matrix ⇒ one group. No single access has temporal reuse; each has spatial
          reuse (<Code>j</Code> is contiguous). Sorted by descending address, with{' '}
          <Code>Wᵍ_k = ∏(i=k..n) Wᶻ·ᵍ_i · (self-spatial)_i</Code> and <Code>l = 4</Code>:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse min-w-[440px]">
            <thead>
              <tr>
                <th className="bg-muted px-2 py-1 text-left border-b" rowSpan={2}>reference</th>
                <th className="bg-muted px-2 py-1 text-center border-b" colSpan={2}>spatial (self)</th>
                <th className="bg-muted px-2 py-1 text-center border-b" colSpan={2}>temporal (group)</th>
                <th className="bg-muted px-2 py-1 text-center border-b" colSpan={2}>cumulative</th>
              </tr>
              <tr>{['i', 'j', 'i', 'j', 'i', 'j'].map((h, k) => <th key={k} className="bg-muted px-2 py-1 text-center border-b font-mono">{h}</th>)}</tr>
            </thead>
            <tbody>
              {[
                ['x[i+1][j]', '1', '4', '1', '1', '4', '4'],
                ['x[i][j]', '1', '4', 'n', '1', '4n', '4'],
                ['x[i][j]', '1', '4', '1', '∞', '∞', '∞'],
                ['x[i][j-1]', '1', '4', '1', 'm', '4m', '4m'],
              ].map((r, ri) => (
                <tr key={ri} className="border-b last:border-b-0">
                  {r.map((c, ci) => <td key={ci} className={cn('px-2 py-1 font-mono', ci === 0 ? 'text-left' : 'text-center')}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Panel className="text-sm leading-relaxed mt-2">
          Reading the cumulative <Code>i</Code>-column as blocks loaded ≈ total accesses / factor: <Code>x[i+1][j]</Code>{' '}
          loads <Code>n·m/4</Code>; <Code>x[i][j]</Code> adds <Code>m/4</Code> (factor <Code>4n</Code>); the repeated{' '}
          <Code>x[i][j]</Code> adds <Bad>nothing</Bad> (<Code>∞</Code>); <Code>x[i][j-1]</Code> adds <Code>n/4</Code>. The{' '}
          <Code>d⃗=0</Code> repeat and the neighbour <Code>x[i][j-1]</Code> are what group reuse buys you.
        </Panel>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 5 · Choosing the loop order  (matrix multiplication)
 * ================================================================== */

const MatMulPicker: React.FC = () => {
  const [inner, setInner] = useState<'i' | 'j' | 'k'>('j')
  const data = {
    i: { order: 'j-k-i', c: 'n³', a: 'n³', b: 'n²', total: '2n³ + n²' },
    j: { order: 'i-k-j', c: 'n³/l', a: 'n²/l', b: 'n³/l', total: '2n³/l + n²/l' },
    k: { order: 'i-j-k', c: 'n²/l', a: 'n³/l', b: 'n³', total: 'n³(1 + 1/l) + n²/l' },
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">innermost loop:</span>
        {(['i', 'j', 'k'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setInner(l)}
            className={cn('w-9 h-8 rounded-md border font-mono text-sm transition-colors', inner === l ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse min-w-[420px]">
          <thead>
            <tr>{['innermost', 'order', 'c[i][j]', 'a[i][k]', 'b[k][j]', 'total'].map((h, k) => (
              <th key={k} className="bg-muted px-2.5 py-1.5 text-left border-b font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(['i', 'j', 'k'] as const).map((l) => {
              const d = data[l]
              const on = l === inner
              return (
                <tr key={l} className={cn('border-b last:border-b-0', on && 'bg-primary/10')}>
                  <td className="px-2.5 py-1.5 font-mono">{l}-loop</td>
                  <td className="px-2.5 py-1.5 font-mono">{d.order}</td>
                  <td className="px-2.5 py-1.5 font-mono">{d.c}</td>
                  <td className="px-2.5 py-1.5 font-mono">{d.a}</td>
                  <td className="px-2.5 py-1.5 font-mono">{d.b}</td>
                  <td className="px-2.5 py-1.5 font-mono font-semibold">{d.total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Panel className={cn('text-sm leading-relaxed mt-2 border-2', inner === 'j' ? 'border-emerald-500/60' : 'border-amber-500/60')}>
        {inner === 'j' ? (
          <>
            <Good>Best choice.</Good> With <Code>j</Code> innermost, <Code>c[i][j]</Code> and <Code>b[k][j]</Code> get
            sequential access (contiguous <Code>j</Code>) and <Code>a[i][k]</Code> is loop-invariant → total{' '}
            <Code>≈ 2n³/l</Code>, a factor <Code>l</Code> fewer loads than the <Code>i</Code>-loop order. For{' '}
            <Code>l ≥ 2</Code> this is the winner.
          </>
        ) : inner === 'i' ? (
          <>
            <Bad>Worst.</Bad> With <Code>i</Code> innermost, <Code>c</Code> and <Code>a</Code> are accessed along their
            first (strided) dimension → <Code>2n³ + n²</Code> loads, a factor <Code>l</Code> worse than <Code>j</Code>{' '}
            innermost.
          </>
        ) : (
          <>
            <Tag tone="warn">Middling.</Tag> <span className="ml-1">With <Code>k</Code> innermost, <Code>b[k][j]</Code> is
            strided (<Code>k</Code> is its first index) → <Code>n³</Code> loads dominate. Better than <Code>i</Code>, worse
            than <Code>j</Code>.</span>
          </>
        )}
      </Panel>
    </div>
  )
}

const OrderSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interchange to place the best loop innermost</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Loop interchange can raise temporal locality — but <strong>all references</strong> matter: an interchange that
          helps one can hurt another. The compiler computes the <strong>innermost reuse factor</strong> of every loop and
          makes the loop with the <strong>largest</strong> one the innermost.
        </p>
        <p className="text-sm mb-1">Stencil example — the three <Code>b</Code> reads reuse across the middle loop:</p>
        <Pre>{`for (i = 1; i <= n; i++)
  for (j = 2; j < m; j++)
    for (k = 1; k <= l; k++)
      a[i][j][k] = (b[i][j-1][k] + b[i][j][k] + b[i][j+1][k]) / 3;`}</Pre>
        <p className="text-sm">Interchanging the <Code>j</Code>- and <Code>k</Code>-loops makes successive inner iterations hit the same <Code>b</Code> element.</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Case study — matrix multiplication</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">First distribute the initialization out (§4.3), leaving the pure multiply nest:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">original</div>
            <Pre>{`for (i=0; i<n; i++)
  for (j=0; j<n; j++) {
    c[i][j] = 0.0;
    for (k=0; k<n; k++)
      c[i][j] += a[i][k]*b[k][j];
  }`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after distribution</div>
            <Pre>{`for (i=0; i<n; i++)
  for (j=0; j<n; j++)
    c[i][j] = 0.0;
for (i=0; i<n; i++)
  for (j=0; j<n; j++)
    for (k=0; k<n; k++)
      c[i][j] += a[i][k]*b[k][j];`}</Pre>
          </div>
        </div>
        <p className="text-sm mt-2 mb-3">
          Now pick the innermost loop of the multiply nest and count loaded cache blocks (block size <Code>l</Code>):
        </p>
        <MatMulPicker />
        <Panel className="text-sm leading-relaxed mt-2">
          <Good>Conclusion:</Good> for <Code>l ≥ 2</Code> make the <Code>j</Code>-loop innermost (order <Code>i-k-j</Code>).
          Measured on 1990s hardware (Sparc2, i860, RS/6000) at <Code>n = 512</Code>, the permuted loop ran in{' '}
          <strong>half</strong> the time of the original.
        </Panel>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 6 · Questions
 * ================================================================== */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on §4.9, easy → hardest — all on <em>fresh</em> code, not the lecture's{' '}
      <Code>x[i][j]=y[i]+z[j]</Code> or matrix-multiplication running examples. Q1 is fully worked to set the pattern;
      do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Here interchange actually helps — classify to find out"
      statement={
        <>
          <p className="mb-2">
            <Code>w</Code> is row-major, size <Code>m × n</Code>. Classify the locality of each reference in the current
            order, then check whether interchanging the loops improves things — don't assume the answer is "keep the
            original order" just because that was true elsewhere.
          </p>
          <Pre>{`for (i = 1; i <= n; i++)
  for (j = 1; j <= m; j++)
    w[j][i] = w[j][i] * 2 + v[j];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1"><strong>Current order (j innermost):</strong></p>
          <Table
            head={['Reference', 'Locality', 'Reason']}
            rows={[
              [<Code>w[j][i]</Code>, <Bad>none (strided)</Bad>, <>inner <Code>j</Code> is <Code>w</Code>'s <em>first</em> (row) index — each step jumps a whole row (stride <Code>n</Code>)</>],
              [<Code>v[j]</Code>, <Good>sequential</Good>, <>inner <Code>j</Code> steps <Code>v</Code> by 1</>],
            ]}
          />
          <p className="text-sm mb-1"><strong>Interchanged (i innermost, j outer):</strong></p>
          <Table
            head={['Reference', 'Locality', 'Reason']}
            rows={[
              [<Code>w[j][i]</Code>, <Good>sequential</Good>, <>inner <Code>i</Code> is <Code>w</Code>'s <em>last</em> (contiguous) index now</>],
              [<Code>v[j]</Code>, <Good>temporal</Good>, <>independent of the now-inner <Code>i</Code> ⇒ held in a register</>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Interchange — both references improve.</Good> The large array <Code>w</Code> (the dominant traffic)
            flips from fully strided to sequential, and the small vector <Code>v</Code> upgrades from sequential to
            temporal (even cheaper — no memory traffic at all once cached in a register). <strong>Pattern for
            Q2–Q5:</strong> classify every reference by whether the varying loop hits its contiguous dimension, is
            entirely absent from its subscript, or neither — the conclusion (keep vs. swap) follows from comparing{' '}
            <em>all</em> references, not assuming a fixed answer.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="A zero column isn't unique — what breaks the tie?"
      statement={
        <>
          <p className="mb-2">
            In a triple nest <Code>for i / for j / for k</Code>, reference <Code>u[k]</Code> has coefficient columns{' '}
            <Code>(0, 0, 1)</Code> for <Code>(i, j, k)</Code>. Which of the three loops, if made innermost, gives{' '}
            <Code>u</Code> temporal locality? Is there a single best choice from <Code>u</Code>'s perspective alone, and
            if not, what else would you need to know to pick?
          </p>
        </>
      }
      solution={
        <>
          <Panel className="text-sm leading-relaxed">
            Both the <Code>i</Code>- and <Code>j</Code>-columns of <Code>u</Code>'s coefficient vector are zero —{' '}
            <Code>u[k]</Code> doesn't depend on either. So making <strong>either</strong> <Code>i</Code>{' '}
            <strong>or</strong> <Code>j</Code> innermost gives <Code>u</Code> temporal locality; <Code>u</Code>'s own
            access pattern gives <strong>no reason to prefer one over the other</strong> — from its perspective alone
            the choice is a tie.
            <div className="mt-1">
              <strong>What breaks the tie:</strong> every <em>other</em> reference in the loop body. Whichever of{' '}
              <Code>i</Code> or <Code>j</Code> gives the biggest combined benefit across <em>all</em> references (e.g.
              matches another array's contiguous dimension) should be the one placed innermost — exactly the
              multi-reference comparison Q1 and Q5 require. A single reference's zero columns only narrow the
              candidates; they rarely settle the question alone.
            </div>
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Reuse factor when the coefficient isn't 1"
      statement={
        <>
          <p className="mb-2">
            For <Code>s[p][2·r]</Code> (row-major <Code>s</Code>) in <Code>for p (n=30) / for r (k=50)</Code> with
            cache-block size <Code>l = 8</Code>, give <Code>Rᶻ_p, Rᶻ_r, Rʳ_p, Rʳ_r</Code>, the overall <Code>R_p, R_r</Code>,
            and the footprint <Code>F_p</Code>. (Every worked example so far used coefficient 1 in the contiguous
            dimension — this one doesn't.)
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <Code>A_s</Code> has row 1 (dim <Code>p</Code>) = <Code>(1, 0)</Code> and row 2 (dim <Code>2r</Code>) ={' '}
            <Code>(0, 2)</Code> — the contiguous (last) dimension's coefficient on <Code>r</Code> is{' '}
            <strong>2, not 1</strong>. Neither column is all-zero ⇒ <Code>Rᶻ_p = Rᶻ_r = 1</Code> (no temporal reuse
            either way).
          </p>
          <p className="text-sm mb-1">
            Spatial: the <Code>r</Code>-column's non-zero sits in the contiguous row with coefficient <Code>a_sk = 2</Code>,
            so <Code>Rʳ_r = max(1, l/a_sk) = max(1, 8/2) = 4</Code> — half of what coefficient 1 would have given (
            <Code>max(1,8/1)=8</Code>). The <Code>p</Code>-column's non-zero sits in the non-contiguous row ⇒{' '}
            <Code>Rʳ_p = 1</Code>.
          </p>
          <Formula>{`R_p = Rʳ_p = 1        R_r = Rʳ_r = 4     (since Rᶻ = 1 for both)
F_r = k / R_r = 50/4 = 12.5
F_p = (n / R_p)·F_r = (30/1)·12.5 = 375`}</Formula>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Key transfer point:</Good> a stride-2 access in the contiguous dimension still gets <em>some</em>{' '}
            spatial reuse (each 8-word block holds 4 of the touched elements, since every other word is skipped), just
            half as much as stride 1 would. <Code>Rʳ_k = max(1, l/a_sk)</Code> already handles this — Q1–Q3 in the
            lecture's own examples just never showed <Code>a_sk ≠ 1</Code> in action.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Group reuse with a non-unit offset"
      statement={
        <>
          <p className="mb-2">
            In <Code>for r (n) / for c (m)</Code> the same array is read as <Code>g[r][c]</Code>, <Code>g[r][c+2]</Code>,
            and <Code>g[r-1][c]</Code>. Sort by descending address, find <Code>d⃗</Code> for each consecutive pair, and
            give the temporal group-reuse factor. (Note one offset is <Code>2</Code>, not <Code>1</Code> — the reuse
            distance changes accordingly.)
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <Code>A = ((1 0)(0 1))</Code>. Offsets: <Code>g[r][c]</Code>: <Code>c⃗=(0,0)</Code>; <Code>g[r][c+2]</Code>:{' '}
            <Code>c⃗=(0,2)</Code>; <Code>g[r-1][c]</Code>: <Code>c⃗=(−1,0)</Code>. Descending address order (larger{' '}
            <Code>c</Code>-offset ⇒ higher address at equal <Code>r</Code>; larger <Code>r</Code> ⇒ higher address at
            equal <Code>c</Code>): <Code>g[r][c+2]</Code>, then <Code>g[r][c]</Code>, then <Code>g[r-1][c]</Code>.
          </p>
          <Table
            head={['pair (c₁ → c₂)', 'A·d⃗ = c₁−c₂', 'd⃗', 'factor']}
            rows={[
              [<><Code>g[r][c+2] → g[r][c]</Code></>, <Code>(0,2)</Code>, <Code>(0,2)</Code>, <><Code>Wᶻ·ᵍ_c = m/2</Code></>],
              [<><Code>g[r][c] → g[r-1][c]</Code></>, <Code>(1,0)</Code>, <Code>(1,0)</Code>, <><Code>Wᶻ·ᵍ_r = n/1 = n</Code></>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            <Code>g[r][c+2]</Code> and <Code>g[r][c]</Code> hit the same element, but only after <strong>2</strong>{' '}
            iterations of the <Code>c</Code>-loop (not 1) — the reuse distance directly inherits the subscript's offset,
            giving factor <Code>m/2</Code> rather than the <Code>m/1</Code> you'd get from a unit offset. <Code>g[r][c]</Code>{' '}
            and <Code>g[r-1][c]</Code> still reuse 1 iteration apart on <Code>r</Code>, factor <Code>n</Code> — the
            general rule <Code>Wᶻ·ᵍ_k = n_k / d_k</Code> already covers this; the lecture's own group-reuse example just
            happened to only ever show <Code>d_k = 1</Code>.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="A four-reference case study — matmul's method, a new kernel"
      statement={
        <>
          <p className="mb-2">
            <Code>out</Code>, <Code>in1</Code>, <Code>in2</Code> are <Code>n×n</Code> row-major; <Code>scale</Code> is a
            length-<Code>n</Code> vector; cache block <Code>l</Code> words, <Code>l | n</Code>. Determine which of{' '}
            <Code>i, j, k</Code> should be innermost to minimise total cache-block loads, justifying{' '}
            <strong>every</strong> reference including the vector.
          </p>
          <Pre>{`for (i = 0; i < n; i++)
  for (j = 0; j < n; j++)
    for (k = 0; k < n; k++)
      out[i][k] += in1[i][j] * in2[j][k] * scale[k];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            This is a matrix product (<Code>out = in1·in2</Code>) with each output row additionally scaled element-wise
            by <Code>scale[k]</Code>. Compare the three candidates, in each case using the best order of the other two
            loops (exactly as the matrix-multiplication case study does):
          </p>
          <Table
            head={['innermost', 'order', 'out[i][k]', 'in1[i][j]', 'in2[j][k]', 'scale[k]', 'total']}
            rows={[
              [<Code>k</Code>, 'i-j-k', <>seq.</>, <>invariant</>, <>seq.</>, <>seq.</>, <Good>3n³/l + n²/l</Good>],
              [<Code>j</Code>, 'i-k-j', <>invariant</>, <>seq.</>, <Bad>strided</Bad>, <>invariant</>, <Code>n³ + n³/l + 2n²/l</Code>],
              [<Code>i</Code>, 'j-k-i', <Bad>strided</Bad>, <Bad>strided</Bad>, <>invariant</>, <>invariant</>, <Code>2n³ + 2n²/l</Code>],
            ]}
          />
          <p className="text-sm mb-1">
            <strong>Why <Code>k</Code> wins:</strong> <Code>k</Code> is the contiguous (last) index of <em>both</em>{' '}
            <Code>out[i][k]</Code> and <Code>in2[j][k]</Code> — innermost <Code>k</Code> gives both sequential access.{' '}
            <Code>in1[i][j]</Code> doesn't mention <Code>k</Code> at all, so it's invariant under the innermost loop
            regardless of the choice — a wash for <Code>in1</Code> either way. <Code>scale[k]</Code>, being{' '}
            <em>only</em> a function of <Code>k</Code>, gets sequential access precisely when <Code>k</Code> is
            innermost, and is otherwise re-scanned wastefully on every outer iteration.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Make k innermost (order i-j-k):</Good> total <Code>3n³/l + n²/l</Code>, roughly a factor{' '}
            <Code>l</Code> below either alternative — the same order-of-magnitude win the lecture's matrix
            multiplication gets, but derived here from a genuinely different reference set: notice the extra{' '}
            <Code>scale[k]</Code> vector didn't change the answer, it only <em>reinforced</em> it (its own preferred
            loop already agreed with the two big arrays). That won't always happen — Q2 is exactly the case where a
            reference's own preference is a tie and other references must decide; here a third factor happened to
            agree unanimously instead.
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
  { id: 'intro', label: 'Locality & hierarchy', render: () => <IntroSection /> },
  { id: 'single', label: 'Single array access', render: () => <SingleSection /> },
  { id: 'quant', label: 'Quantifying reuse', render: () => <QuantSection /> },
  { id: 'group', label: 'Group reuse', render: () => <GroupSection /> },
  { id: 'order', label: 'Choosing loop order', render: () => <OrderSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function LocalityStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 4 · §4.9 · Optimizing for Locality"
      title="Optimizing for Locality in Memory Hierarchies"
      subtitle="Reorganising nested loops so the memory hierarchy is used well: temporal, spatial and sequential locality; making the step-1 or loop-invariant loop innermost; the affine access model x[A·i+c] with temporal (A·d=0) and spatial reuse factors and data footprints; group reuse across multiple references to one array; and choosing the innermost loop — capped by the matrix-multiplication case study."
      tabs={tabs}
    />
  )
}
