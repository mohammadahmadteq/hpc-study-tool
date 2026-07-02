import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { cn } from './lib/utils'
import {
  Code,
  Pre,
  Formula,
  Step,
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
 *  Chapter 5 · §5.1 — Introduction to OpenMP   (PDF 237–252)
 *  The fork–join model, parallel regions, data-sharing clauses,
 *  parallel loops + scheduling, and the work-sharing constructs.
 * ------------------------------------------------------------------ */

const THREAD_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

/* ================================================================== *
 *  Tab 1 · The fork–join model  (the §5 intro)
 * ================================================================== */

const ForkJoin: React.FC = () => {
  const [n, setN] = useState(4)
  const W = 340
  const H = 252
  const cx = W / 2
  const topY = 24
  const forkY = 66
  const pTop = 96
  const pBot = 170
  const barY = 180
  const joinY = 202
  const botY = 236
  const left = 46
  const right = W - 46
  const xs = Array.from({ length: n }, (_, i) => (n === 1 ? cx : left + (right - left) * (i / (n - 1))))

  return (
    <div>
      <label className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        team size (num_threads) = <span className="font-mono text-foreground">{n}</span>
        <input type="range" min={2} max={5} value={n} onChange={(e) => setN(+e.target.value)} />
      </label>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mx-auto block select-none" style={{ height: 'auto', maxWidth: 360 }}>
        {/* sequential master (before fork) */}
        <line x1={cx} y1={topY} x2={cx} y2={forkY} stroke="var(--color-primary)" strokeWidth={3} />
        {/* fork lines */}
        {xs.map((x, i) => (
          <line key={`f${i}`} x1={cx} y1={forkY} x2={x} y2={pTop} stroke="var(--color-muted-foreground)" strokeWidth={1.4} />
        ))}
        {/* team thread lines */}
        {xs.map((x, i) => (
          <line
            key={`t${i}`}
            x1={x}
            y1={pTop}
            x2={x}
            y2={pBot}
            stroke={i === 0 ? 'var(--color-primary)' : 'var(--color-foreground)'}
            strokeWidth={i === 0 ? 3 : 2}
          />
        ))}
        {/* join lines */}
        {xs.map((x, i) => (
          <line key={`j${i}`} x1={x} y1={pBot} x2={cx} y2={joinY} stroke="var(--color-muted-foreground)" strokeWidth={1.4} />
        ))}
        {/* barrier */}
        <line x1={left - 10} y1={barY} x2={right + 10} y2={barY} stroke="var(--color-muted-foreground)" strokeWidth={1.6} strokeDasharray="5 3" />
        {/* master continues */}
        <line x1={cx} y1={joinY} x2={cx} y2={botY} stroke="var(--color-primary)" strokeWidth={3} />

        {/* thread id badges */}
        {xs.map((x, i) => (
          <g key={`b${i}`}>
            <circle cx={x} cy={pTop} r={11} fill={i === 0 ? 'var(--color-primary)' : 'var(--color-card)'} stroke={i === 0 ? 'var(--color-primary)' : 'var(--color-foreground)'} strokeWidth={1.6} />
            <text x={x} y={pTop} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight={700} fill={i === 0 ? 'var(--color-primary-foreground)' : 'var(--color-foreground)'}>
              {i}
            </text>
          </g>
        ))}

        {/* phase labels */}
        <text x={cx + 10} y={(topY + forkY) / 2} fontSize="10.5" fill="var(--color-muted-foreground)">master (sequential)</text>
        <text x={right + 6} y={barY - 4} fontSize="10" fill="var(--color-muted-foreground)" textAnchor="end">implicit barrier</text>
        <text x={cx + 10} y={(joinY + botY) / 2 + 3} fontSize="10.5" fill="var(--color-muted-foreground)">master continues</text>
      </svg>
      <div className="text-center text-xs text-muted-foreground mt-1">
        thread <span className="font-mono">0</span> is the <strong>master</strong>; the fork creates threads{' '}
        <span className="font-mono">1…{n - 1}</span>, all running the same block (SPMD)
      </div>
    </div>
  )
}

const lifecycleSteps: StepPanel[] = [
  {
    title: '① The program starts sequentially',
    body: (
      <p className="text-sm">
        Execution begins with a single <strong>master thread</strong>. It runs the code sequentially, exactly like an
        ordinary program, until it reaches a <Code>#pragma omp parallel</Code> construct.
      </p>
    ),
  },
  {
    title: '② Fork — a team of threads is created',
    body: (
      <p className="text-sm">
        At the parallel construct the master <strong>forks</strong> a <strong>team of threads</strong> and becomes the
        master of that team. The master keeps thread number <Code>0</Code>; the new threads get consecutive numbers{' '}
        <Code>1, 2, …</Code>
      </p>
    ),
  },
  {
    title: '③ SPMD — all threads run the same block',
    body: (
      <p className="text-sm">
        Every thread (including the master) executes the <em>same</em> program text — the block after the directive.
        This is the <strong>SPMD</strong> model (Single-Program Multiple-Data): same code, but each thread can take a
        different path using its own thread id.
      </p>
    ),
  },
  {
    title: '④ Implicit barrier at the end',
    body: (
      <p className="text-sm">
        At the end of the parallel construct all threads meet at an <strong>implicit barrier</strong>: no thread leaves
        the region until every thread has arrived. The shared address space is now consistent.
      </p>
    ),
  },
  {
    title: '⑤ Join — back to the master',
    body: (
      <p className="text-sm">
        After the barrier the extra threads are <strong>destroyed</strong> and only the master survives, continuing
        sequentially until the next parallel region. This <strong>fork–join</strong> pattern repeats for each region.
      </p>
    ),
  },
]

const IntroSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What OpenMP is</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>OpenMP</strong> is a portable <strong>standard</strong> for programming <strong>shared-memory</strong>{' '}
          systems — the shared-memory counterpart to what MPI is for distributed memory. It provides an API for{' '}
          <strong>C, C++ and Fortran</strong> and extends these sequential languages with three ingredients:
        </p>
        <Table
          head={['Ingredient', 'Purpose']}
          rows={[
            [<><strong>Compiler directives</strong> <Code>#pragma omp …</Code></>, <>mark parallel regions, distribute loops, synchronize</>],
            [<><strong>Library functions</strong> <Code>omp_…()</Code></>, <>query/set thread counts, thread ids, nesting</>],
            [<><strong>Environment variables</strong></>, <>control scheduling and thread count at runtime</>],
          ]}
        />
        <Panel className="text-sm leading-relaxed mt-1">
          <Tag tone="warn">important</Tag>{' '}
          <span className="ml-1">
            The <strong>programmer</strong> is responsible for a correct specification — the{' '}
            <strong>compiler does not check for correctness</strong>. A wrong <Code>shared</Code>/<Code>private</Code>{' '}
            choice compiles fine and silently produces a data race.
          </span>
        </Panel>
        <div className="text-xs text-muted-foreground mt-2">
          Include <Code>&lt;omp.h&gt;</Code> in every OpenMP program. Compile with e.g.{' '}
          <Code>gcc -fopenmp</Code> (gcc ≥ 4.2). Versions: 2.5 (2005), 3.0 (2008), 4.0 (2013), 5.0 (2018).
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The fork–join execution model</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          OpenMP is built on a set of <strong>cooperating threads</strong> created and destroyed by a{' '}
          <strong>fork–join pattern</strong>. Drag the team size and watch the master fork a team and join back:
        </p>
        <ForkJoin />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Walk the lifecycle</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={lifecycleSteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">One shared address space</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          All threads of a team can access the <strong>same shared address space</strong>. That is the whole point of a
          shared-memory model — but it means <strong>concurrent accesses must be synchronized</strong>. Two threads
          writing the same location without coordination is a <Bad>data race</Bad>, and the result is undefined. Deciding
          what is shared and what is private (next tab) is how you avoid this.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · Parallel regions + data-sharing clauses
 * ================================================================== */

const ThreadIdDemo: React.FC = () => {
  const [n, setN] = useState(4)
  return (
    <div>
      <label className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        num_threads = <span className="font-mono text-foreground">{n}</span>
        <input type="range" min={1} max={6} value={n} onChange={(e) => setN(+e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: n }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border px-3 py-2 text-[12px] font-mono"
            style={{ borderColor: THREAD_COLORS[i % 6], background: `${THREAD_COLORS[i % 6]}18` }}
          >
            <div className="font-semibold" style={{ color: THREAD_COLORS[i % 6] }}>
              thread {i}
              {i === 0 && <span className="ml-1 text-[10px]">(master)</span>}
            </div>
            <div className="text-muted-foreground">omp_get_thread_num() → {i}</div>
            <div className="text-muted-foreground">omp_get_num_threads() → {n}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Same code, different <Code>iam</Code>: <Code>omp_get_thread_num()</Code> returns a unique id{' '}
        <Code>0 … np−1</Code>; <Code>omp_get_num_threads()</Code> returns the team size <Code>np = {n}</Code>. The master
        is always <Code>0</Code>.
      </p>
    </div>
  )
}

const SharedPrivateDemo: React.FC = () => {
  const [n, setN] = useState(3)
  const [iamShared, setIamShared] = useState(false)
  const npoints = 1200
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          threads = <span className="font-mono text-foreground">{n}</span>
          <input type="range" min={2} max={4} value={n} onChange={(e) => setN(+e.target.value)} />
        </label>
        <button
          onClick={() => setIamShared((s) => !s)}
          className={cn(
            'text-[12px] px-2.5 py-1 rounded-full border transition-colors font-mono',
            iamShared ? 'bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400' : 'border-border text-muted-foreground hover:bg-muted'
          )}
        >
          iam: {iamShared ? 'shared ⚠' : 'private'}
        </button>
      </div>

      {/* shared memory */}
      <div className="rounded-lg border p-3 mb-3 bg-muted/40">
        <div className="text-xs font-semibold text-muted-foreground mb-1.5">shared memory — one copy for the whole team</div>
        <div className="flex flex-wrap gap-2 font-mono text-[12px]">
          <span className="rounded border px-2 py-1 bg-card">double x[{npoints}]</span>
          <span className="rounded border px-2 py-1 bg-card">int npoints = {npoints}</span>
          {iamShared && (
            <span className="rounded border px-2 py-1 border-red-500/60 bg-red-500/10 text-red-600 dark:text-red-400">
              int iam ← all threads write this!
            </span>
          )}
        </div>
      </div>

      {/* private stacks */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {Array.from({ length: n }, (_, i) => {
          const np = n
          const mypoints = Math.floor(npoints / np)
          return (
            <div key={i} className="rounded-lg border p-2 font-mono text-[11px]" style={{ borderColor: THREAD_COLORS[i % 6] }}>
              <div className="font-semibold mb-1" style={{ color: THREAD_COLORS[i % 6] }}>
                thread {i} · stack
              </div>
              <div className="text-muted-foreground">np = {np}</div>
              {!iamShared && <div className="text-muted-foreground">iam = {i}</div>}
              <div className="text-muted-foreground">mypoints = {mypoints}</div>
            </div>
          )
        })}
      </div>

      <Panel className="text-sm leading-relaxed mt-3">
        {iamShared ? (
          <>
            <Bad>Bug.</Bad> With <Code>iam</Code> <strong>shared</strong>, all threads write to the <em>same</em>{' '}
            <Code>iam</Code>. Each <Code>iam = omp_get_thread_num()</Code> overwrites the others — a data race — so{' '}
            <Code>compute_subdomain(x, iam, …)</Code> uses a garbled id and threads process the wrong (or the same)
            sub-domain. <Code>iam</Code> must be <strong>private</strong>.
          </>
        ) : (
          <>
            <Good>Correct.</Good> <Code>iam</Code>, <Code>np</Code>, <Code>mypoints</Code> are <strong>private</strong> —
            each thread has its own copy on its stack, so its id and slice are its own. The array <Code>x</Code> and{' '}
            <Code>npoints</Code> are <strong>shared</strong>, because every thread works on the one common array.
          </>
        )}
      </Panel>
    </div>
  )
}

const ParallelSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The parallel directive</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">A parallel region is opened with a directive placed before a block of statements:</p>
        <Pre>{`#pragma omp parallel [clause [clause] ...]
{
  block of statements;   // run by every thread
}`}</Pre>
        <Table
          head={['What happens', 'Detail']}
          rows={[
            [<>team created</>, <>the executing thread becomes the <strong>master</strong></>],
            [<>numbering</>, <>master = <Code>0</Code>, others get consecutive ids <Code>1, 2, …</Code></>],
            [<>execution</>, <>every thread (incl. master) runs the block</>],
            [<>after the block</>, <>all threads except the master are <strong>destroyed</strong></>],
            [<><Code>num_threads(expr)</Code></>, <>set the team size; <Code>expr</Code> must be a positive integer</>],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Who am I? — thread identity</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          The two most-used runtime functions let a thread find itself inside the team. Every thread runs the same line{' '}
          <Code>iam = omp_get_thread_num()</Code> but gets a different answer:
        </p>
        <ThreadIdDemo />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Data-sharing clauses: shared vs. private</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Clause', 'Effect']}
          rows={[
            [<Code>private(list)</Code>, <><strong>Uninitialized</strong> copies on each thread's <strong>runtime stack</strong>; each thread accesses its <strong>own</strong> copy.</>],
            [<Code>shared(list)</Code>, <>Every thread accesses the <strong>same variable</strong> (same memory region) in shared memory.</>],
            [<Code>default(shared)</Code>, <>every variable is shared unless said otherwise</>],
            [<Code>default(none)</Code>, <>every variable <strong>must</strong> be declared explicitly shared or private</>],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          <Code>default(none)</Code> is the safe habit for exams and real code: it forces you to think about every
          variable, so you cannot forget a race-prone one.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Worked example — partition an array across threads</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`#pragma omp parallel shared(x,npoints) private(iam,np,mypoints)
{
  np       = omp_get_num_threads();
  iam      = omp_get_thread_num();
  mypoints = npoints / np;
  compute_subdomain(x, iam, mypoints);
}`}</Pre>
        <p className="text-sm mb-3">
          Each thread computes its own id <Code>iam</Code> and slice size <Code>mypoints</Code>, then works on its part of
          the shared array <Code>x</Code>. Flip <Code>iam</Code> to <em>shared</em> below to see exactly why these three
          variables must be private:
        </p>
        <SharedPrivateDemo />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · Parallel loops + scheduling
 * ================================================================== */

interface Chunk {
  start: number
  end: number
  thread: number
}

function computeChunks(kind: 'static' | 'dynamic' | 'guided', N: number, P: number, B: number): Chunk[] {
  const chunks: Chunk[] = []
  // static without chunk size → P near-equal contiguous blocks
  if (kind === 'static' && B === 0) {
    const base = Math.floor(N / P)
    const rem = N % P
    let s = 0
    for (let t = 0; t < P; t++) {
      const size = base + (t < rem ? 1 : 0)
      if (size === 0) continue
      chunks.push({ start: s, end: s + size - 1, thread: t })
      s += size
    }
    return chunks
  }
  if (kind === 'static' || kind === 'dynamic') {
    const b = B === 0 ? 1 : B // dynamic default block size is 1
    let s = 0
    let ci = 0
    while (s < N) {
      const size = Math.min(b, N - s)
      chunks.push({ start: s, end: s + size - 1, thread: ci % P })
      s += size
      ci++
    }
    return chunks
  }
  // guided: block = ceil(remaining / P), at least the (min) block size
  const minB = B === 0 ? 1 : B
  let s = 0
  let ci = 0
  while (s < N) {
    const remaining = N - s
    let size = Math.max(Math.ceil(remaining / P), minB)
    size = Math.min(size, remaining)
    chunks.push({ start: s, end: s + size - 1, thread: ci % P })
    s += size
    ci++
  }
  return chunks
}

const ScheduleViz: React.FC = () => {
  const [kind, setKind] = useState<'static' | 'dynamic' | 'guided'>('static')
  const [N, setN] = useState(16)
  const [P, setP] = useState(4)
  const [B, setB] = useState(0)

  const chunks = computeChunks(kind, N, P, B)
  const threadOf: number[] = new Array(N).fill(-1)
  chunks.forEach((c) => {
    for (let i = c.start; i <= c.end; i++) threadOf[i] = c.thread
  })
  const counts = Array.from({ length: P }, (_, t) => threadOf.filter((x) => x === t).length)

  const blockOpts: { label: string; v: number }[] =
    kind === 'static'
      ? [{ label: 'default (even)', v: 0 }, { label: '1', v: 1 }, { label: '2', v: 2 }, { label: '3', v: 3 }, { label: '4', v: 4 }]
      : kind === 'dynamic'
      ? [{ label: 'default (1)', v: 0 }, { label: '2', v: 2 }, { label: '3', v: 3 }, { label: '4', v: 4 }]
      : [{ label: 'default (min 1)', v: 0 }, { label: '2', v: 2 }, { label: '3', v: 3 }]

  const switchKind = (k: 'static' | 'dynamic' | 'guided') => {
    setKind(k)
    setB(0)
  }

  const pill = (active: boolean) =>
    cn('text-[12px] px-2.5 py-1 rounded-full border transition-colors', active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')

  return (
    <div>
      <div className="space-y-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground w-16">schedule</span>
          {(['static', 'dynamic', 'guided'] as const).map((k) => (
            <button key={k} onClick={() => switchKind(k)} className={pill(kind === k)}>
              {k}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground w-16">block_size</span>
          {blockOpts.map((o) => (
            <button key={o.v} onClick={() => setB(o.v)} className={pill(B === o.v)}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            iterations N = <span className="font-mono text-foreground">{N}</span>
            <input type="range" min={8} max={20} value={N} onChange={(e) => setN(+e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            threads P = <span className="font-mono text-foreground">{P}</span>
            <input type="range" min={2} max={4} value={P} onChange={(e) => setP(+e.target.value)} />
          </label>
        </div>
      </div>

      {/* iteration cells */}
      <div className="flex flex-wrap gap-1 mb-3">
        {threadOf.map((t, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-mono font-semibold text-white"
            style={{ background: THREAD_COLORS[t % 6] }}
            title={`iteration ${i} → thread ${t}`}
          >
            {i}
          </div>
        ))}
      </div>

      {/* per-thread legend + counts */}
      <div className="flex flex-wrap gap-3 text-[11px] mb-3">
        {counts.map((c, t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ background: THREAD_COLORS[t % 6] }} />
            thread {t}: <span className="font-mono">{c}</span> iters
          </span>
        ))}
      </div>

      {/* chunks in creation order (matters for dynamic/guided) */}
      {kind !== 'static' && (
        <div className="text-[11px] text-muted-foreground mb-2">
          chunk sizes handed out, in order:{' '}
          <span className="font-mono text-foreground">{chunks.map((c) => c.end - c.start + 1).join(', ')}</span>
        </div>
      )}

      <Panel className="text-sm leading-relaxed">
        {kind === 'static' && B === 0 && (
          <>
            <Tag>static (no size)</Tag>{' '}
            <span className="ml-1">
              Blocks of <strong>almost equal size</strong> (<Code>≈ N/P</Code>) are formed and distributed{' '}
              <strong>blockwise</strong> — one contiguous chunk per thread. Decided <strong>at compile time</strong>: no
              runtime overhead, best when every iteration costs the same.
            </span>
          </>
        )}
        {kind === 'static' && B !== 0 && (
          <>
            <Tag>static, {B}</Tag>{' '}
            <span className="ml-1">
              Fixed blocks of <Code>{B}</Code> iterations dealt out <strong>round-robin</strong> (thread 0, 1, …, P−1, 0,
              …). Still fixed at compile time; smaller blocks interleave the threads for better load balance.
            </span>
          </>
        )}
        {kind === 'dynamic' && (
          <>
            <Tag tone="warn">dynamic</Tag>{' '}
            <span className="ml-1">
              Blocks of <Code>{B === 0 ? 1 : B}</Code> are handed out <strong>on demand</strong>: a thread grabs the next
              block as soon as it finishes its current one. Great for <strong>uneven</strong> iteration costs; the exact
              mapping depends on runtime timing (the picture shows one possible run).
            </span>
          </>
        )}
        {kind === 'guided' && (
          <>
            <Tag tone="warn">guided</Tag>{' '}
            <span className="ml-1">
              Dynamic, but with <strong>shrinking</strong> blocks: each new block is{' '}
              <Code>⌈remaining / P⌉</Code> (never below the min size). Big chunks first amortize scheduling cost, tiny
              chunks last balance the tail.
            </span>
          </>
        )}
      </Panel>

      {kind === 'guided' && (
        <Formula>{`block_size = ⌈ (number of remaining iterates) / (number of threads) ⌉`}</Formula>
      )}
    </div>
  )
}

const LoopSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The for directive</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Inside a parallel region, <Code>#pragma omp for</Code> splits the iterations of a loop among the team — this is{' '}
          <strong>work-sharing</strong>: each iteration runs on exactly one thread (unlike a bare parallel region, where
          every thread runs the whole block).
        </p>
        <Pre>{`#pragma omp parallel
{
  #pragma omp for [clause ...]
  for (i = lower; i op upper; incr_expr) {
    // loop body — iterations split across threads
  }
}`}</Pre>
        <div className="text-xs font-semibold text-muted-foreground mt-1 mb-1">the loop must be a "countable" loop:</div>
        <Table
          head={['Rule', 'Why']}
          rows={[
            [<>iterations are <strong>independent</strong></>, <>they may run in any order / simultaneously</>],
            [<>iteration count known <strong>in advance</strong></>, <>the runtime must divide it up before starting</>],
            [<>do not modify <Code>i</Code> in the body</>, <><Code>i</Code> is treated as <strong>private</strong> per thread</>],
            [<><Code>op</Code> ∈ {'{'} &lt;, &lt;=, &gt;, &gt;= {'}'}</>, <>a simple bound comparison</>],
            [<><Code>incr_expr</Code> is a fixed step</>, <><Code>++i, i++, --i, i--, i+=k, i-=k, i=i±k</Code></>],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Scheduling — who runs which iterations</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          The <Code>schedule(kind, block_size)</Code> clause controls how iterations map to threads. Switch the kind and
          block size and watch the assignment change:
        </p>
        <ScheduleViz />
        <Table
          head={['kind', 'behaviour', 'default block_size']}
          rows={[
            [<Code>static</Code>, <>fixed at compile time; round-robin blocks (even split if size omitted)</>, <>≈ N/P (blockwise)</>],
            [<Code>dynamic</Code>, <>blocks handed out on demand as threads finish</>, <>1</>],
            [<Code>guided</Code>, <>dynamic with shrinking block sizes <Code>⌈rem/P⌉</Code></>, <>1 (as minimum)</>],
            [<Code>runtime</Code>, <>read from env var <Code>OMP_SCHEDULE</Code> at runtime</>, <>—</>],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">nowait &amp; nesting rules</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          <Panel className="my-0">
            <Tag tone="good">nowait</Tag>
            <p className="text-sm mt-1.5">
              A parallel loop ends with an <strong>implicit barrier</strong>. Add <Code>nowait</Code> to <em>skip</em> it,
              so threads that finish early rush ahead to the next work instead of waiting.
            </p>
          </Panel>
          <Panel className="my-0">
            <Tag tone="warn">nesting</Tag>
            <p className="text-sm mt-1.5">
              Nesting <Code>for</Code> directives inside one another is <strong>forbidden</strong>. You <em>may</em>,
              however, nest <strong>parallel regions</strong> — and put a fresh <Code>for</Code> inside the inner region.
            </p>
          </Panel>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Example — matrix multiplication in two phases</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Static scheduling gives each thread a <strong>block of rows</strong>. Two <Code>for</Code> loops share the{' '}
          <em>one</em> parallel region — initialize <Code>MC</Code>, then compute it:
        </p>
        <Pre>{`#pragma omp parallel shared(MA,MB,MC,size) private(row,col,i)
{
  #pragma omp for schedule(static)
  for (row = 0; row < size; row++)
    for (col = 0; col < size; col++)
      MC[row][col] = 0.0;
                                 // <-- implicit barrier here
  #pragma omp for schedule(static)
  for (row = 0; row < size; row++)
    for (col = 0; col < size; col++)
      for (i = 0; i < size; i++)
        MC[row][col] += MA[row][i] * MB[i][col];
}`}</Pre>
        <p className="text-xs text-muted-foreground mt-1">
          The barrier after the first loop guarantees all of <Code>MC</Code> is zeroed before <em>any</em> thread starts
          accumulating into it. Opening the region once (not once per loop) avoids paying fork/join twice.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 4 · Work-sharing constructs + thread control
 * ================================================================== */

const SectionsDemo: React.FC = () => {
  const [p, setP] = useState(3)
  const work = ['section A', 'section B', 'section C']
  // illustrative round-robin assignment of the 3 sections to p threads
  const owner = work.map((_, k) => k % p)
  return (
    <div>
      <label className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        team size = <span className="font-mono text-foreground">{p}</span>
        <input type="range" min={1} max={4} value={p} onChange={(e) => setP(+e.target.value)} />
      </label>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${p}, minmax(0, 1fr))` }}>
        {Array.from({ length: p }, (_, t) => {
          const mine = work.filter((_, k) => owner[k] === t)
          return (
            <div key={t} className="rounded-lg border p-2" style={{ borderColor: THREAD_COLORS[t % 6] }}>
              <div className="font-semibold text-[12px] mb-1" style={{ color: THREAD_COLORS[t % 6] }}>
                thread {t}
              </div>
              {mine.length ? (
                mine.map((m) => (
                  <div key={m} className="text-[11px] font-mono rounded px-1.5 py-0.5 mb-1" style={{ background: `${THREAD_COLORS[t % 6]}22` }}>
                    {m}
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-muted-foreground italic">idle — waits at barrier</div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Three <Code>section</Code> blocks, one team. Each section runs on <strong>one</strong> thread. With more threads
        than sections, the extra threads are <strong>idle</strong>; with fewer, a thread runs several sections. The exact
        mapping is implementation-defined; all threads meet at the closing <strong>barrier</strong>.
      </p>
    </div>
  )
}

const WorkSharingSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">sections — non-iterative work sharing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Where <Code>for</Code> splits <em>iterations</em> of one loop, <Code>sections</Code> splits a fixed set of{' '}
          <strong>distinct code blocks</strong> — different work items — among the threads.
        </p>
        <Pre>{`#pragma omp sections
{
  #pragma omp section
    { block A }
  #pragma omp section
    { block B }
  #pragma omp section
    { block C }
}   // implicit barrier`}</Pre>
        <SectionsDemo />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">single — exactly one thread runs it</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <Code>#pragma omp single</Code> marks a block that <strong>only one thread</strong> of the team executes (which
          one is unspecified, and may differ between activations). Useful for a one-off inside a parallel region — reading
          input, printing, initializing a shared value.
        </p>
        <Pre>{`#pragma omp parallel
{
  #pragma omp single
    read_next_chunk();   // just one thread does this

  #pragma omp for
  for (i = 0; i < n; i++) process(i);   // all threads share the work
}`}</Pre>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Syntactic abbreviations</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A parallel region containing <strong>a single</strong> work-sharing construct can be written in one line:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">long form</div>
            <Pre>{`#pragma omp parallel
{
  #pragma omp for
  for (...) { ... }
}`}</Pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">abbreviation</div>
            <Pre>{`#pragma omp parallel for
for (...) { ... }`}</Pre>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Likewise <Code>#pragma omp parallel sections</Code> fuses a parallel region with a single{' '}
          <Code>sections</Code> construct.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Controlling the number of threads</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Function', 'Effect']}
          rows={[
            [<Code>omp_set_num_threads(k)</Code>, <>set the team size for <strong>subsequent</strong> parallel regions</>],
            [<Code>omp_set_dynamic(d)</Code>, <><Code>d ≠ 0</Code>: runtime may adjust the count; <Code>d = 0</Code>: use exactly the requested number. Call it <strong>outside</strong> a parallel region.</>],
            [<Code>omp_get_dynamic()</Code>, <>returns <Code>0</Code> if dynamic adjustment is off</>],
          ]}
        />
        <Panel className="text-sm leading-relaxed mt-1">
          With dynamic adjustment <strong>enabled</strong>, <Code>omp_set_num_threads(k)</Code> sets the{' '}
          <strong>maximum</strong> <Code>k</Code>; with it <strong>disabled</strong>, <Code>k</Code> is the{' '}
          <strong>exact</strong> team size.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Nested parallelism</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A parallel region may contain another parallel region. But by <strong>default the inner region runs with just
          one thread</strong> (the nesting is effectively serialized):
        </p>
        <Table
          head={['Function', 'Effect']}
          rows={[
            [<Code>omp_set_nested(0)</Code>, <>inner region executed by <strong>one</strong> thread (default)</>],
            [<Code>omp_set_nested(n≠0)</Code>, <>runtime <em>may</em> use <strong>more than one</strong> thread for the inner region</>],
            [<Code>omp_get_nested()</Code>, <>query the current nesting mode</>],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          So a naïve doubly-parallel matrix multiply gains nothing on the inner loop unless nesting is switched on — and
          even then it can oversubscribe the cores.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 5 · Questions  (exactly 5, easy → hardest, Q1 fully worked)
 * ================================================================== */

const WorkedStatic: React.FC = () => {
  const N = 13
  const P = 4
  const even = computeChunks('static', N, P, 0)
  const chunked = computeChunks('static', N, P, 2)
  const evenOf = new Array(N).fill(-1)
  even.forEach((c) => { for (let i = c.start; i <= c.end; i++) evenOf[i] = c.thread })
  const chunkOf = new Array(N).fill(-1)
  chunked.forEach((c) => { for (let i = c.start; i <= c.end; i++) chunkOf[i] = c.thread })
  const row = (of: number[]) => (
    <div className="flex flex-wrap gap-1 mb-2">
      {of.map((t, i) => (
        <div key={i} className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-mono font-semibold text-white" style={{ background: THREAD_COLORS[t % 6] }}>
          {i}
        </div>
      ))}
    </div>
  )
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-1">(a) schedule(static) — even blocks of ⌈13/4⌉ = 4, 3, 3, 3</div>
      {row(evenOf)}
      <div className="text-xs font-semibold text-muted-foreground mb-1 mt-2">(b) schedule(static, 2) — blocks of 2, round-robin</div>
      {row(chunkOf)}
      <div className="flex flex-wrap gap-3 text-[11px] mt-1">
        {Array.from({ length: P }, (_, t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ background: THREAD_COLORS[t % 6] }} />
            thread {t}
          </span>
        ))}
      </div>
    </div>
  )
}

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on §5.1, easy → hardest. Q1 is fully worked to set the pattern; do the rest on paper, then
      reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Static scheduling: map iterations to threads"
      statement={
        <>
          <p className="mb-2">
            A parallel loop has <strong>13 iterations</strong> (<Code>i = 0 … 12</Code>) run by a team of{' '}
            <strong>4 threads</strong>. Give the iteration → thread assignment for
          </p>
          <p className="mb-1">(a) <Code>schedule(static)</Code> (no block size), and</p>
          <p className="mb-0">(b) <Code>schedule(static, 2)</Code>.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a) No block size → almost-equal contiguous blocks.</strong> With <Code>N = 13</Code>,{' '}
            <Code>P = 4</Code>: sizes are <Code>⌈13/4⌉ = 4</Code> for the first <Code>13 mod 4 = 1</Code> thread and{' '}
            <Code>3</Code> for the rest → <Code>4, 3, 3, 3</Code>. Each thread gets one contiguous chunk:
          </p>
          <Formula>{`thread 0 : 0,1,2,3
thread 1 : 4,5,6
thread 2 : 7,8,9
thread 3 : 10,11,12`}</Formula>
          <p className="text-sm mb-1">
            <strong>(b) Block size 2 → fixed blocks dealt round-robin</strong> (t0, t1, t2, t3, t0, …). Blocks{' '}
            <Code>[0,1] [2,3] [4,5] [6,7] [8,9] [10,11] [12]</Code>:
          </p>
          <Formula>{`thread 0 : 0,1  then 8,9
thread 1 : 2,3  then 10,11
thread 2 : 4,5  then 12
thread 3 : 6,7`}</Formula>
          <div className="mt-2">
            <WorkedStatic />
          </div>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Key idea:</Good> <Code>static</Code> is fixed <em>before</em> the loop runs — no runtime bookkeeping.
            No block size ⇒ one big contiguous slice per thread (good locality); a small block size ⇒ finer round-robin
            interleaving (better balance if iteration costs vary).
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Classify shared vs. private"
      statement={
        <>
          <p className="mb-2">
            For the array-partition region below, state which variables must be <Code>shared</Code> and which must be{' '}
            <Code>private</Code>, and explain what breaks if <Code>iam</Code> were shared.
          </p>
          <Pre>{`#pragma omp parallel /* clauses? */
{
  np       = omp_get_num_threads();
  iam      = omp_get_thread_num();
  mypoints = npoints / np;
  compute_subdomain(x, iam, mypoints);
}`}</Pre>
        </>
      }
      solution={
        <>
          <Table
            head={['Variable', 'Class', 'Why']}
            rows={[
              [<Code>x</Code>, <Tag tone="good">shared</Tag>, <>the one common array every thread works on</>],
              [<Code>npoints</Code>, <Tag tone="good">shared</Tag>, <>a read-only total the threads all read</>],
              [<Code>iam</Code>, <Tag tone="warn">private</Tag>, <>each thread's own id</>],
              [<Code>np</Code>, <Tag tone="warn">private</Tag>, <>local copy of the team size</>],
              [<Code>mypoints</Code>, <Tag tone="warn">private</Tag>, <>each thread's own slice size</>],
            ]}
          />
          <p className="text-sm">
            So: <Code>shared(x, npoints) private(iam, np, mypoints)</Code>.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Bad>If <Code>iam</Code> were shared</Bad>, all threads write the same location in{' '}
            <Code>iam = omp_get_thread_num()</Code> — a <strong>data race</strong>. Whatever value survives is used by
            every thread's <Code>compute_subdomain(x, iam, …)</Code>, so threads process the wrong or identical
            sub-domains. The result is undefined.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="The barrier between two loops"
      statement={
        <>
          <p className="mb-2">
            In the two-phase matrix multiply, one parallel region holds two <Code>omp for</Code> loops: the first zeroes{' '}
            <Code>MC</Code>, the second accumulates into it.
          </p>
          <Pre>{`#pragma omp for schedule(static)
for (row...) for (col...) MC[row][col] = 0.0;

#pragma omp for schedule(static)
for (row...) for (col...) for (i...)
  MC[row][col] += MA[row][i]*MB[i][col];`}</Pre>
          <p className="mb-0">
            What role does the implicit barrier between them play, and what could break if you added <Code>nowait</Code>{' '}
            to the first loop?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            An <Code>omp for</Code> ends with an <strong>implicit barrier</strong>. It guarantees that <em>every</em>{' '}
            element of <Code>MC</Code> has been zeroed before <em>any</em> thread starts the accumulation phase.
          </p>
          <p className="text-sm mb-1">
            Under <Code>static</Code> scheduling each thread owns the <em>same</em> block of rows in both loops, so it
            zeroes and then accumulates its own rows. But <Code>+=</Code> reads the current value of{' '}
            <Code>MC[row][col]</Code> — which must already be <Code>0.0</Code>.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Bad>With <Code>nowait</Code> on the first loop</Bad>, a fast thread could reach the accumulation phase and do{' '}
            <Code>MC += …</Code> on a cell a slower thread has not yet zeroed. That reads uninitialized/garbage and
            corrupts the result. (Here every thread happens to touch only its own rows, so it is <em>fragile</em>: it
            works by coincidence of the static split — change the schedule and it breaks. Keep the barrier.)
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Compute the guided block sizes"
      statement={
        <>
          <p className="mb-2">
            A loop of <strong>20 iterations</strong> is run by <strong>4 threads</strong> with{' '}
            <Code>schedule(guided)</Code> (default minimum block size 1). List the successive block sizes handed out and
            the iteration ranges, using
          </p>
          <Formula>{`block_size = ⌈ remaining / number_of_threads ⌉`}</Formula>
        </>
      }
      solution={
        <>
          <Table
            head={['step', 'remaining', '⌈rem/4⌉', 'range']}
            rows={[
              ['1', '20', '5', <Code>0–4</Code>],
              ['2', '15', '4', <Code>5–8</Code>],
              ['3', '11', '3', <Code>9–11</Code>],
              ['4', '8', '2', <Code>12–13</Code>],
              ['5', '6', '2', <Code>14–15</Code>],
              ['6', '4', '1', <Code>16</Code>],
              ['7', '3', '1', <Code>17</Code>],
              ['8', '2', '1', <Code>18</Code>],
              ['9', '1', '1', <Code>19</Code>],
            ]}
          />
          <p className="text-sm">
            Block sizes: <Code>5, 4, 3, 2, 2, 1, 1, 1, 1</Code>. They <strong>shrink</strong> as work runs out — big
            blocks early cut scheduling overhead; single-iteration blocks at the tail let a free thread mop up the
            remainder and keep the load balanced.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Check:</Good> the sizes sum to <Code>5+4+3+2+2+1+1+1+1 = 20</Code> ✓. Blocks are handed out on demand,
            so which thread gets which block depends on runtime timing — only the <em>sizes</em> are determined by the
            formula.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Reason about a doubly-parallel matrix multiply"
      statement={
        <>
          <p className="mb-2">Analyse this nested version. Answer (a)–(d).</p>
          <Pre>{`#pragma omp parallel private(row,col,i)
{
  #pragma omp for schedule(static)
  for (row = 0; row < size; row++) {
    #pragma omp parallel shared(MA,MB,MC,size)
    {
      #pragma omp for schedule(static)
      for (col = 0; col < size; col++) {
        MC[row][col] = 0.0;
        for (i = 0; i < size; i++)
          MC[row][col] += MA[row][i]*MB[i][col];
      }
    }
  }
}`}</Pre>
          <p className="mb-0 text-[13px]">
            (a) How many threads run the inner <Code>col</Code> loop by default? (b) What does{' '}
            <Code>omp_set_nested(1)</Code> change? (c) Why must <Code>row, col, i</Code> be private? (d) Is there a data
            race on <Code>MC</Code>?
          </p>
        </>
      }
      solution={
        <>
          <Step n="a">
            By default nesting is <strong>off</strong>, so the inner parallel region is executed by{' '}
            <strong>one thread</strong>. Each outer thread runs its assigned <Code>row</Code>s and does the whole{' '}
            <Code>col</Code> loop itself — the inner <Code>for</Code> gains nothing.
          </Step>
          <Step n="b">
            <Code>omp_set_nested(1)</Code> lets the runtime spawn a <strong>real team</strong> for each inner region, so
            the <Code>col</Code> loop is split too. Beware: with <Code>P</Code> outer × <Code>P</Code> inner threads you
            can <strong>oversubscribe</strong> the cores.
          </Step>
          <Step n="c">
            <Code>row, col, i</Code> are loop/iteration variables. If shared, threads would clobber each other's loop
            indices — a race that scrambles the iteration space. Loop variables of an <Code>omp for</Code> are private
            anyway, but the enclosing region must declare <Code>private(row,col,i)</Code> so each outer thread has its own{' '}
            <Code>row</Code>.
          </Step>
          <Step n="d">
            <strong>No race on <Code>MC</Code>.</strong> Each <Code>(row, col)</Code> pair is written by exactly one
            thread and never read by another during the loop, so the distinct-cell writes don't conflict — the shared{' '}
            <Code>MC</Code> is safe here.
          </Step>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Takeaway:</Good> nested parallelism is legal but inert by default (<Code>omp_set_nested</Code> gates
            it), correctness rests on the right <Code>private</Code>/<Code>shared</Code> split, and disjoint writes to a
            shared array are race-free.
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
  { id: 'intro', label: 'Fork–join model', render: () => <IntroSection /> },
  { id: 'parallel', label: 'Parallel regions', render: () => <ParallelSection /> },
  { id: 'loops', label: 'Loops & scheduling', render: () => <LoopSection /> },
  { id: 'worksharing', label: 'Sections, single & control', render: () => <WorkSharingSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function OpenMPStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 5 · §5.1 · Introduction to OpenMP"
      title="Introduction to OpenMP"
      subtitle="OpenMP is a portable standard for shared-memory parallel programming, built on a fork–join model of cooperating threads. This section covers parallel regions, shared/private data, work-sharing loops with their scheduling, and the sections/single constructs."
      tabs={tabs}
    />
  )
}
