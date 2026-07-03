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
  QuestionCard,
  StudyShell,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 5 · §5.2 — Coordination and Synchronization   (PDF 253–263)
 *  Mutual exclusion (critical / atomic), reductions, barriers & flush,
 *  the master directive, lock variables, and wall-clock timing.
 * ------------------------------------------------------------------ */

const THREAD_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

/* ================================================================== *
 *  Tab 1 · Mutual exclusion — the race, critical, atomic
 * ================================================================== */

type Micro = { t: 0 | 1; kind: 'load' | 'add' | 'store' | 'rmw'; label: string }

const badSeq: Micro[] = [
  { t: 0, kind: 'load', label: 'T0:  reg ← sum' },
  { t: 1, kind: 'load', label: 'T1:  reg ← sum' },
  { t: 0, kind: 'add', label: 'T0:  reg ← reg + 1' },
  { t: 1, kind: 'add', label: 'T1:  reg ← reg + 1' },
  { t: 0, kind: 'store', label: 'T0:  sum ← reg' },
  { t: 1, kind: 'store', label: 'T1:  sum ← reg' },
]
const goodSeq: Micro[] = [
  { t: 0, kind: 'rmw', label: 'T0:  sum ← sum + 1   (indivisible)' },
  { t: 1, kind: 'rmw', label: 'T1:  sum ← sum + 1   (indivisible)' },
]

interface RState {
  sum: number
  reg: [number | null, number | null]
}
function fold(seq: Micro[], upto: number): RState {
  let sum = 0
  const reg: [number | null, number | null] = [null, null]
  for (let k = 0; k < upto; k++) {
    const m = seq[k]
    if (m.kind === 'load') reg[m.t] = sum
    else if (m.kind === 'add') reg[m.t] = (reg[m.t] ?? 0) + 1
    else if (m.kind === 'store') sum = reg[m.t] ?? sum
    else if (m.kind === 'rmw') sum = sum + 1
  }
  return { sum, reg }
}

const RaceDemo: React.FC = () => {
  const [prot, setProt] = useState(false)
  const [i, setI] = useState(0)
  const seq = prot ? goodSeq : badSeq
  const st = fold(seq, i)
  const done = i === seq.length

  const setMode = (p: boolean) => {
    setProt(p)
    setI(0)
  }
  const pill = (active: boolean) =>
    cn('text-[12px] px-2.5 py-1 rounded-full border transition-colors', active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => setMode(false)} className={pill(!prot)}>
          unprotected <Code>sum += 1</Code>
        </button>
        <button onClick={() => setMode(true)} className={pill(prot)}>
          critical / atomic
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Two threads each run <Code>sum += 1</Code> once; <Code>sum</Code> starts at 0, so the correct answer is{' '}
        <strong>2</strong>. Step through the interleaving.
      </p>

      <div className="flex gap-3 mb-3">
        {/* shared sum */}
        <div className="rounded-lg border px-4 py-3 text-center bg-muted/40 shrink-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">shared</div>
          <div className="font-mono text-2xl font-semibold">{st.sum}</div>
          <div className="text-[10px] text-muted-foreground">sum</div>
        </div>
        {/* registers (only meaningful unprotected) */}
        <div className="grid grid-cols-2 gap-2 flex-1">
          {[0, 1].map((t) => (
            <div key={t} className="rounded-lg border px-2 py-2 text-center" style={{ borderColor: THREAD_COLORS[t] }}>
              <div className="text-[11px] font-semibold" style={{ color: THREAD_COLORS[t] }}>
                thread {t}
              </div>
              <div className="font-mono text-lg">{prot ? '—' : st.reg[t] ?? '·'}</div>
              <div className="text-[10px] text-muted-foreground">private reg</div>
            </div>
          ))}
        </div>
      </div>

      {/* micro-op trace */}
      <div className="space-y-1 mb-3">
        {seq.map((m, k) => (
          <div
            key={k}
            className={cn(
              'font-mono text-[12px] px-2 py-1 rounded border',
              k < i ? 'opacity-100' : 'opacity-35',
              k === i - 1 ? 'border-primary bg-primary/10' : 'border-transparent'
            )}
            style={k < i ? { color: THREAD_COLORS[m.t] } : undefined}
          >
            {m.label}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setI((p) => Math.max(0, p - 1))}
          disabled={i === 0}
          className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          ← back
        </button>
        <span className="flex-1 text-center text-xs text-muted-foreground">
          step {i} of {seq.length}
        </span>
        <button
          onClick={() => setI((p) => Math.min(seq.length, p + 1))}
          disabled={done}
          className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          next →
        </button>
      </div>

      {done && (
        <Panel className="text-sm leading-relaxed">
          {prot ? (
            <>
              <Good>Correct — sum = 2.</Good> Each <Code>sum += 1</Code> runs as one indivisible read-modify-write, so
              the threads cannot interleave inside it. No update is lost.
            </>
          ) : (
            <>
              <Bad>Wrong — sum = 1.</Bad> Both threads read <Code>sum = 0</Code> before either stored, so both write{' '}
              <Code>1</Code>. One increment is <strong>lost</strong> — a classic <strong>race condition</strong>. The fix
              is mutual exclusion: <Code>critical</Code> or <Code>atomic</Code>.
            </>
          )}
        </Panel>
      )}
    </div>
  )
}

const MutexSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why synchronization is needed</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          A parallel region has many threads touching the <strong>same shared data</strong>. Unsynchronized concurrent
          updates <strong>race</strong>: the result depends on timing and is undefined. Watch a lost update happen, then
          watch mutual exclusion fix it:
        </p>
        <RaceDemo />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">critical — one thread at a time</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          A <Code>critical</Code> region is executed by <strong>only one thread at a time</strong>. A thread reaching it
          waits until no other thread is inside, then enters.
        </p>
        <Pre>{`#pragma omp critical [(name)]
{
  structured block   // mutually exclusive
}`}</Pre>
        <p className="text-sm mb-1">
          <strong>Named</strong> critical regions (name in round brackets) only exclude each other: a thread must wait
          only for others in a critical region with the <em>same</em> name. This lets independent updates proceed in
          parallel.
        </p>
        <Panel className="text-sm leading-relaxed mt-1">
          <Tag tone="warn">note</Tag>{' '}
          <span className="ml-1">
            All <strong>unnamed</strong> critical regions share <em>one</em> unspecified name — so they all serialize
            against each other, even when they guard unrelated data.
          </span>
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">atomic — a single hardware-level update</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <Code>atomic</Code> protects <strong>one memory update</strong>, and is usually cheaper than a full{' '}
          <Code>critical</Code> because it maps to a hardware atomic instruction. The statement must have a restricted
          form:
        </p>
        <Formula>{`x binop= E        // += -= *= /= &= ^= |= <<= >>=
x++   ++x   x--   --x

binop ∈ { +, -, *, /, &, ^, |, <<, >> }
E is a scalar expression that must NOT contain x`}</Formula>
        <Pre>{`extern float a[], *p = a, b;  int index[];

#pragma omp atomic
a[index[i]] += b;      // only the update of a[index[i]] is atomic

#pragma omp atomic
p[i] -= 1.0;`}</Pre>
        <Panel className="text-sm leading-relaxed mt-1">
          <Bad>Careful:</Bad> only the <strong>update of <Code>x</Code></strong> is atomic — the <strong>evaluation of{' '}
          <Code>E</Code> is not</strong>. If <Code>E</Code> reads other shared values that another thread may be writing,
          those reads still need their own protection.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">critical vs. atomic — when to use which</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['', 'critical', 'atomic']}
          rows={[
            [<>protects</>, <>any structured block</>, <>a single scalar update only</>],
            [<>cost</>, <>higher (general mutex)</>, <>lower (hardware atomic)</>],
            [<>use when</>, <>multiple statements / complex update</>, <><Code>x binop= E</Code> or <Code>x++</Code> etc.</>],
          ]}
        />
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 2 · Global reduction
 * ================================================================== */

type Op = '+' | '*'
const OPS: Record<Op, { id: number; combine: (a: number, b: number) => number; name: string }> = {
  '+': { id: 0, combine: (a, b) => a + b, name: 'sum' },
  '*': { id: 1, combine: (a, b) => a * b, name: 'product' },
}

const bArr = [3, 1, 4, 1, 5, 9, 2, 6]

const ReductionDemo: React.FC = () => {
  const [op, setOp] = useState<Op>('+')
  const [p, setP] = useState(4)
  const { id, combine } = OPS[op]

  // static split of the 8 elements into p contiguous chunks
  const N = bArr.length
  const base = Math.floor(N / p)
  const rem = N % p
  const chunks: number[][] = []
  let s = 0
  for (let t = 0; t < p; t++) {
    const size = base + (t < rem ? 1 : 0)
    chunks.push(bArr.slice(s, s + size))
    s += size
  }
  const partials = chunks.map((c) => c.reduce((acc, v) => combine(acc, v), id))
  const total = partials.reduce((acc, v) => combine(acc, v), id)

  const pill = (active: boolean) =>
    cn('text-[12px] px-2.5 py-1 rounded-full border transition-colors', active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">op</span>
          {(['+', '*'] as const).map((o) => (
            <button key={o} onClick={() => setOp(o)} className={pill(op === o)}>
              {o}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          threads = <span className="font-mono text-foreground">{p}</span>
          <input type="range" min={2} max={4} value={p} onChange={(e) => setP(+e.target.value)} />
        </label>
      </div>

      <div className="text-[12px] font-mono text-muted-foreground mb-2">
        b[] = [{bArr.join(', ')}] &nbsp; identity of <span className="text-foreground">{op}</span> ={' '}
        <span className="text-foreground">{id}</span>
      </div>

      {/* per-thread private copies */}
      <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${p}, minmax(0, 1fr))` }}>
        {chunks.map((c, t) => (
          <div key={t} className="rounded-lg border p-2" style={{ borderColor: THREAD_COLORS[t % 6] }}>
            <div className="text-[11px] font-semibold mb-1" style={{ color: THREAD_COLORS[t % 6] }}>
              thread {t} · private
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {id} {c.map((v) => `${op} ${v}`).join(' ')}
            </div>
            <div className="font-mono text-sm mt-1">= {partials[t]}</div>
          </div>
        ))}
      </div>

      {/* combine */}
      <Panel className="text-sm">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
          at the end of the region — combine the private copies
        </div>
        <div className="font-mono text-[13px]">
          sum = {partials.join(` ${op} `)} = <strong>{total}</strong>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          matches the sequential {OPS[op].name} of <Code>b[]</Code> ={' '}
          <span className="font-mono">{bArr.reduce((a, v) => combine(a, v), id)}</span> <Good>✓</Good>
        </div>
      </Panel>
    </div>
  )
}

const ReductionSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The reduction clause</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Accumulating into one shared variable (<Code>sum += b[i]</Code>) is the archetypal race. A{' '}
          <Code>critical</Code> around it would serialize <em>every</em> iteration — slow. The <Code>reduction</Code>{' '}
          clause does it right and fast:
        </p>
        <Formula>{`reduction (op : list)

op   ∈ { +, -, *, &, ^, |, &&, || }
list   the shared reduction variables`}</Formula>
        <div className="text-sm">
          <Step n="①">
            Each thread gets a <strong>private copy</strong> of every reduction variable, initialized to the operator's{' '}
            <strong>identity</strong> (<Code>0</Code> for <Code>+</Code>, <Code>1</Code> for <Code>*</Code>, …).
          </Step>
          <Step n="②">Each thread accumulates into its <strong>own</strong> copy — no contention, no race.</Step>
          <Step n="③">
            At the <strong>end of the region</strong> the private copies are combined with <Code>op</Code> into the one
            shared variable.
          </Step>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">See the partial sums combine</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Each thread reduces its slice into a private copy; the copies merge once at the end. Change the operator and the
          team size:
        </p>
        <ReductionDemo />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Example — reducing several variables at once</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`#pragma omp parallel for reduction(+: sum) reduction(||: any)
for (i = 0; i < n; i++) {
  sum += b[i];              // + reduction into sum
  any = any || (b[i] == c[i]);   // || reduction into any
}`}</Pre>
        <p className="text-xs text-muted-foreground mt-1">
          One clause per operator; a variable may appear in only one reduction. After the loop, <Code>sum</Code> holds the
          global sum and <Code>any</Code> holds the global OR — each combined from the private copies.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 3 · Barriers & flush
 * ================================================================== */

const BarrierDemo: React.FC = () => {
  const [work, setWork] = useState([3, 5, 2, 4])
  const maxT = Math.max(...work)
  const phase2 = 3
  const span = maxT + phase2
  const barrierPct = (maxT / span) * 100
  const shuffle = () => setWork(work.map(() => 1 + Math.floor(Math.random() * 6)))

  return (
    <div>
      <button
        onClick={shuffle}
        className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted mb-3"
      >
        ↻ shuffle work times
      </button>

      <div className="flex gap-2">
        {/* left labels */}
        <div className="flex flex-col gap-1.5 w-6 shrink-0">
          {work.map((_, t) => (
            <div key={t} className="h-6 flex items-center text-[11px] font-mono" style={{ color: THREAD_COLORS[t % 6] }}>
              T{t}
            </div>
          ))}
        </div>
        {/* bar track (barrier overlay is relative to this column) */}
        <div className="relative flex-1">
          <div className="flex flex-col gap-1.5">
            {work.map((w, t) => {
              const workPct = (w / span) * 100
              const waitPct = ((maxT - w) / span) * 100
              const p2Pct = (phase2 / span) * 100
              return (
                <div key={t} className="relative h-6 rounded bg-muted/30 overflow-hidden">
                  <div className="absolute top-0 h-full rounded-l" style={{ left: 0, width: `${workPct}%`, background: THREAD_COLORS[t % 6] }} />
                  {waitPct > 0.5 && (
                    <div
                      className="absolute top-0 h-full"
                      style={{
                        left: `${workPct}%`,
                        width: `${waitPct}%`,
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, var(--color-muted-foreground) 3px, var(--color-muted-foreground) 4px)',
                        opacity: 0.4,
                      }}
                    />
                  )}
                  <div className="absolute top-0 h-full" style={{ left: `${barrierPct}%`, width: `${p2Pct}%`, background: THREAD_COLORS[t % 6], opacity: 0.35 }} />
                </div>
              )
            })}
          </div>
          {/* barrier line */}
          <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-foreground/60" style={{ left: `${barrierPct}%` }} />
        </div>
        {/* right labels */}
        <div className="flex flex-col gap-1.5 w-16 shrink-0">
          {work.map((w, t) => (
            <div key={t} className="h-6 flex items-center text-[10px] text-muted-foreground">
              {maxT - w > 0 ? `waited ${maxT - w}` : 'slowest'}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground mt-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ background: THREAD_COLORS[0] }} /> phase-1 work
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, var(--color-muted-foreground) 2px, var(--color-muted-foreground) 3px)' }} /> waiting
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-l-2 border-dashed border-foreground/60 h-3" /> barrier — all released together
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Every thread stops at <Code>#pragma omp barrier</Code> until the <strong>slowest</strong> arrives; only then does
        anyone continue. Faster threads simply wait.
      </p>
    </div>
  )
}

const BarrierFlushSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">barrier — wait for everyone</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <Code>#pragma omp barrier</Code> is an <strong>explicit</strong> synchronization point: all threads of the team
          wait until every thread has arrived, then all resume together.
        </p>
        <BarrierDemo />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">flush — a consistent view of shared memory</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Threads may keep shared values in registers or caches — a <em>temporary</em> view. A <Code>flush</Code> forces
          that view to agree with memory, so a write by one thread becomes visible to others.
        </p>
        <Pre>{`#pragma omp flush [(list)]`}</Pre>
        <p className="text-sm mb-1">
          With a <Code>list</Code>, only those variables are made consistent; with an empty list, <em>all</em> shared
          variables are. A flush happens <strong>implicitly</strong> at these points:
        </p>
        <Table
          head={['Implicit flush after…', '']}
          rows={[
            [<Code>barrier</Code>, <>on the barrier</>],
            [<Code>critical</Code>, <>on <strong>entry</strong> and on <strong>exit</strong></>],
            [<Code>parallel</Code>, <>on leaving the region</>],
            [<><Code>for</Code> / <Code>sections</Code> / <Code>single</Code></>, <>on leaving — <em>unless</em> <Code>nowait</Code> is given</>],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          So most of the time flushes come for free with the constructs you already use. Explicit <Code>flush</Code> is
          only needed when you hand-roll synchronization without those constructs.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Example — hand-rolled producer/consumer with flush</CardTitle>
      </CardHeader>
      <CardContent>
        <Pre>{`#pragma omp parallel private(iam,neighbor) shared(work,sync)
{
  iam = omp_get_thread_num();
  sync[iam] = 0;
  #pragma omp barrier

  work[iam] = do_work();
  #pragma omp flush(work)          // publish my work[]
  sync[iam] = 1;
  #pragma omp flush(sync)          // then announce "ready"

  neighbor = (iam != 0) ? iam - 1 : omp_get_num_threads() - 1;
  while (sync[neighbor] == 0) {
    #pragma omp flush(sync)        // re-read neighbor's flag
  }
  combine(work[iam], work[neighbor]);
}`}</Pre>
        <p className="text-xs text-muted-foreground mt-1">
          Each thread waits for its neighbor's flag. The <Code>flush(work)</Code> <em>before</em> setting{' '}
          <Code>sync[iam]=1</Code> guarantees the neighbor sees finished <Code>work</Code> once it sees the flag; the{' '}
          <Code>flush(sync)</Code> in the spin loop keeps re-reading the flag instead of a stale cached copy.
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 4 · master, locks, timing
 * ================================================================== */

const LockDemo: React.FC = () => {
  const [nestable, setNestable] = useState(false)
  const [owner, setOwner] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [queue, setQueue] = useState<number[]>([])
  const [log, setLog] = useState('lock is free')

  const reset = (nest: boolean) => {
    setNestable(nest)
    setOwner(null)
    setCount(0)
    setQueue([])
    setLog(`${nest ? 'nestable' : 'simple'} lock — free`)
  }

  const setLock = (t: number) => {
    if (owner === null) {
      setOwner(t)
      setCount(1)
      setLog(`omp_set_lock: T${t} acquires the lock`)
    } else if (owner === t) {
      if (nestable) {
        setCount((c) => c + 1)
        setLog(`T${t} re-locks (nestable) → count ${count + 1}`)
      } else {
        setLog(`⚠ T${t} calls set_lock on a SIMPLE lock it already owns → DEADLOCK`)
      }
    } else if (!queue.includes(t)) {
      setQueue((q) => [...q, t])
      setLog(`T${t} blocked — waits until the lock is free`)
    } else {
      setLog(`T${t} is already waiting`)
    }
  }

  const unsetLock = (t: number) => {
    if (owner !== t) {
      setLog(`✗ T${t} does not own the lock — cannot unset`)
      return
    }
    if (nestable && count > 1) {
      setCount((c) => c - 1)
      setLog(`T${t} unlocks once (nestable) → count ${count - 1}`)
      return
    }
    const q = [...queue]
    const next = q.length ? q.shift()! : null
    setQueue(q)
    setOwner(next)
    setCount(next === null ? 0 : 1)
    setLog(next === null ? `T${t} releases → lock free` : `T${t} releases → T${next} acquires (was waiting)`)
  }

  const testLock = (t: number) => {
    if (owner === null) {
      setOwner(t)
      setCount(1)
      setLog(`omp_test_lock: T${t} succeeds → returns 1`)
    } else if (nestable && owner === t) {
      setCount((c) => c + 1)
      setLog(`omp_test_nest_lock: T${t} succeeds → returns 1 (count ${count + 1})`)
    } else {
      setLog(`omp_test_lock: T${t} fails, not blocked → returns 0`)
    }
  }

  const pill = (active: boolean) =>
    cn('text-[12px] px-2.5 py-1 rounded-full border transition-colors', active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')
  const deadlock = log.includes('DEADLOCK')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => reset(false)} className={pill(!nestable)}>
          simple (omp_lock_t)
        </button>
        <button onClick={() => reset(true)} className={pill(nestable)}>
          nestable (omp_nest_lock_t)
        </button>
      </div>

      {/* state */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="rounded-lg border px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">owner</div>
          <div className="font-mono text-lg" style={{ color: owner === null ? undefined : THREAD_COLORS[owner % 6] }}>
            {owner === null ? 'free' : `T${owner}`}
            {nestable && owner !== null && <span className="text-xs text-muted-foreground"> ×{count}</span>}
          </div>
        </div>
        <div className="rounded-lg border px-3 py-2 flex-1 min-w-[120px]">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">waiting queue</div>
          <div className="font-mono text-sm">
            {queue.length ? queue.map((t) => `T${t}`).join(' , ') : '—'}
          </div>
        </div>
      </div>

      {/* per-thread controls */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[0, 1, 2].map((t) => (
          <div key={t} className="rounded-lg border p-2" style={{ borderColor: THREAD_COLORS[t] }}>
            <div className="text-[11px] font-semibold mb-1.5" style={{ color: THREAD_COLORS[t] }}>
              thread {t}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setLock(t)} className="text-[11px] px-1.5 py-1 rounded border border-border hover:bg-muted">
                set_lock
              </button>
              <button onClick={() => unsetLock(t)} className="text-[11px] px-1.5 py-1 rounded border border-border hover:bg-muted">
                unset_lock
              </button>
              <button onClick={() => testLock(t)} className="text-[11px] px-1.5 py-1 rounded border border-border hover:bg-muted">
                test_lock
              </button>
            </div>
          </div>
        ))}
      </div>

      <Panel className={cn('text-[13px] font-mono', deadlock && 'border-red-500/60')}>
        {deadlock ? <Bad>{log}</Bad> : log}
      </Panel>
      <p className="text-xs text-muted-foreground mt-2">
        A <strong>simple</strong> lock can be held once; if its owner tries to lock it again it{' '}
        <strong>deadlocks</strong>. A <strong>nestable</strong> lock counts re-locks by its owner and must be unset the
        same number of times. A lock can only be unset by its owner.
      </p>
    </div>
  )
}

const MasterLockSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">master — only the master thread</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <Code>#pragma omp master</Code> runs its block on the <strong>master thread only</strong> (thread 0); no other
          thread executes it, and there is <strong>no implicit barrier</strong>.
        </p>
        <Pre>{`#pragma omp master
{
  structured block   // thread 0 only; others skip past, no wait
}`}</Pre>
        <Table
          head={['', 'single', 'master']}
          rows={[
            [<>who runs it</>, <>exactly <strong>one</strong> thread (any)</>, <>the <strong>master</strong> (thread 0) only</>],
            [<>implicit barrier?</>, <><Good>yes</Good> (unless <Code>nowait</Code>)</>, <><Bad>no</Bad></>],
            [<>use for</>, <>one-off work all must wait on</>, <>master-only work, no sync needed</>],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lock variables — explicit mutual exclusion</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Locks give finer control than <Code>critical</Code>: you choose exactly when to acquire and release, and can
          hold several independent locks. Drive one below:
        </p>
        <LockDemo />
        <Table
          head={['Function', 'Effect']}
          rows={[
            [<Code>omp_init_lock(&L)</Code>, <>create a lock (<Code>omp_lock_t</Code> / <Code>omp_nest_lock_t</Code>)</>],
            [<Code>omp_set_lock(&L)</Code>, <>block until free, then acquire</>],
            [<Code>omp_unset_lock(&L)</Code>, <>release (only the owner may)</>],
            [<Code>omp_test_lock(&L)</Code>, <>try to acquire without blocking — returns <Code>1</Code> / <Code>0</Code></>],
            [<Code>omp_destroy_lock(&L)</Code>, <>dispose of the lock</>],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          <strong>Simple</strong> (<Code>omp_lock_t</Code>) locks once; <strong>nestable</strong> (
          <Code>omp_nest_lock_t</Code>) may be locked several times by its owner and must be released as many times. Each
          call has an <Code>_nest_</Code> variant.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Timing — omp_get_wtime</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Portable wall-clock time (in seconds) for measuring parallel regions:
        </p>
        <Pre>{`double start = omp_get_wtime();
// ... region to measure ...
double elapsed = omp_get_wtime() - start;`}</Pre>
        <p className="text-xs text-muted-foreground mt-1">
          It is a <strong>per-thread</strong> wall clock and may not be globally consistent across threads — measure a
          span on <em>one</em> thread (e.g. the master).
        </p>
      </CardContent>
    </Card>
  </div>
)

/* ================================================================== *
 *  Tab 5 · Questions  (exactly 5, easy → hardest, Q1 fully worked)
 * ================================================================== */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on §5.2, easy → hardest — Q4 is on <em>fresh</em> code, not the lecture's neighbor-flush
      sketch. Q1 is fully worked to set the pattern; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Fix a summation race three ways"
      statement={
        <>
          <p className="mb-2">
            This parallel loop has a data race. First explain the race, then fix it with (a) <Code>critical</Code>, (b){' '}
            <Code>atomic</Code>, and (c) <Code>reduction</Code>. Which is best?
          </p>
          <Pre>{`sum = 0;
#pragma omp parallel for
for (i = 0; i < n; i++)
  sum += a[i];`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>The race.</strong> <Code>sum += a[i]</Code> is really <em>read sum → add → write sum</em>. Two threads
            can both read the same <Code>sum</Code> before either writes back, so one update is lost (e.g. both read 0,
            both write their own value; one increment vanishes). <Code>sum</Code> is shared and updated concurrently.
          </p>
          <p className="text-sm mb-1"><strong>(a) critical</strong> — serialize the update:</p>
          <Pre>{`#pragma omp parallel for
for (i = 0; i < n; i++)
  #pragma omp critical
  sum += a[i];`}</Pre>
          <p className="text-sm mb-1"><strong>(b) atomic</strong> — cheaper, single-update form:</p>
          <Pre>{`#pragma omp parallel for
for (i = 0; i < n; i++)
  #pragma omp atomic
  sum += a[i];`}</Pre>
          <p className="text-sm mb-1"><strong>(c) reduction</strong> — private copies, combined once:</p>
          <Pre>{`#pragma omp parallel for reduction(+: sum)
for (i = 0; i < n; i++)
  sum += a[i];`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Best: reduction.</Good> Both <Code>critical</Code> and <Code>atomic</Code> serialize <em>every</em>{' '}
            iteration, so the threads contend on <Code>sum</Code> n times and scaling suffers (atomic is the cheaper of
            the two). <Code>reduction(+:sum)</Code> lets each thread accumulate a private partial with no contention, and
            merges them just once at the end — correct <em>and</em> scalable.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Which statements can be atomic?"
      statement={
        <>
          <p className="mb-2">
            <Code>#pragma omp atomic</Code> requires the form <Code>x binop= E</Code> or <Code>x++/--</Code>, where{' '}
            <Code>E</Code> does not contain <Code>x</Code>. For each line, say whether it is a valid atomic update.
          </p>
          <Pre>{`(1) x += a[i];
(2) x = x * x;
(3) c[i]++;
(4) y = y - f(y);
(5) x = a[i] + b[i];`}</Pre>
        </>
      }
      solution={
        <>
          <Table
            head={['#', 'valid?', 'why']}
            rows={[
              [<>(1)</>, <Good>✓</Good>, <><Code>x += E</Code> with <Code>E = a[i]</Code> free of <Code>x</Code></>],
              [<>(2)</>, <Bad>✗</Bad>, <>right side <Code>x*x</Code> contains <Code>x</Code>, and it is a plain assignment, not <Code>binop=</Code></>],
              [<>(3)</>, <Good>✓</Good>, <><Code>c[i]++</Code> is an allowed increment form (here <Code>x = c[i]</Code>)</>],
              [<>(4)</>, <Bad>✗</Bad>, <>not <Code>binop=</Code> form, and <Code>E = y - f(y)</Code> contains <Code>y</Code></>],
              [<>(5)</>, <Bad>✗</Bad>, <>a plain write, no <Code>binop=</Code> update of <Code>x</Code></>],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            For the invalid ones, guard the statement with <Code>#pragma omp critical</Code> instead. Remember: even for
            valid atomics, only the <strong>update</strong> is atomic — the evaluation of <Code>E</Code> is not.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Use named critical regions"
      statement={
        <>
          <p className="mb-2">
            A loop updates two independent shared accumulators, <Code>sumA</Code> and <Code>sumB</Code>, each under a{' '}
            <Code>critical</Code> region. Why does using two <em>unnamed</em> criticals hurt, and how do you fix it?
          </p>
          <Pre>{`#pragma omp critical
sumA += fa(i);
#pragma omp critical
sumB += fb(i);`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            All <strong>unnamed</strong> critical regions share one unspecified name, so they mutually exclude each
            other. A thread updating <Code>sumA</Code> blocks a thread that only wants <Code>sumB</Code>, even though the
            two updates are independent — needless serialization.
          </p>
          <p className="text-sm mb-1"><strong>Fix:</strong> give them distinct names so only like-named regions exclude:</p>
          <Pre>{`#pragma omp critical (A)
sumA += fa(i);
#pragma omp critical (B)
sumB += fb(i);`}</Pre>
          <Panel className="text-sm leading-relaxed mt-1">
            Now a thread in <Code>critical(A)</Code> and a thread in <Code>critical(B)</Code> run <strong>concurrently</strong>;
            only two threads both wanting <Code>A</Code> (or both <Code>B</Code>) serialize. Even better here: both are
            single-variable updates, so <Code>#pragma omp atomic</Code> would remove the mutex entirely.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="A three-stage handoff — spot the missing flush"
      statement={
        <>
          <p className="mb-2">
            Three threads form a pipeline: thread 0 produces <Code>a_val</Code>, thread 1 consumes it and produces{' '}
            <Code>b_val</Code>, thread 2 consumes <Code>b_val</Code>. (a) Explain the purpose of each existing flush. (b)
            This sketch is missing exactly <strong>one</strong> flush that a correct hand-rolled handshake needs — find
            it and explain what can go wrong without it.
          </p>
          <Pre>{`a_ready = 0;  b_ready = 0;
#pragma omp barrier
id = omp_get_thread_num();

if (id == 0) {
  a_val = produce_a();
  #pragma omp flush(a_val)
  a_ready = 1;
  #pragma omp flush(a_ready)
} else if (id == 1) {
  while (a_ready == 0)
    #pragma omp flush(a_ready);
  b_val = transform(a_val);      // uses a_val here
  #pragma omp flush(b_val)
  b_ready = 1;
  #pragma omp flush(b_ready)
} else if (id == 2) {
  while (b_ready == 0)
    #pragma omp flush(b_ready);
  #pragma omp flush(b_val)
  consume(b_val);
}`}</Pre>
        </>
      }
      solution={
        <>
          <div className="text-sm">
            <Step n="①">
              <strong>barrier</strong> — every thread sees both flags cleared to 0 before anyone starts, so no thread
              mistakes a stale "ready" for the real one.
            </Step>
            <Step n="②">
              <strong>flush(a_val)</strong> in thread 0, before <Code>a_ready=1</Code> — publishes the produced value{' '}
              <em>before</em> announcing it.
            </Step>
            <Step n="③">
              <strong>flush(a_ready)</strong> after setting it (thread 0) and inside the spin loop (thread 1) — makes the
              flag write visible and forces thread 1 to keep re-reading memory instead of a cached value.
            </Step>
            <Step n="④">
              <strong>flush(b_val)</strong> / <strong>flush(b_ready)</strong> in thread 1 and the spin + flush in thread
              2 — the identical pattern, one stage later.
            </Step>
          </div>
          <p className="text-sm mb-1">
            <strong>(b) The missing flush:</strong> thread 1 exits its <Code>a_ready</Code> spin loop and immediately
            reads <Code>a_val</Code> in <Code>transform(a_val)</Code> — but there is <strong>no{' '}
            <Code>#pragma omp flush(a_val)</Code></strong> between seeing the flag and reading the value.
          </p>
          <Panel className="text-sm leading-relaxed mt-1">
            <Bad>Without it,</Bad> thread 1 may still see a stale/cached <Code>a_val</Code> even though it correctly saw
            the up-to-date <Code>a_ready</Code> flag — the flag and the data are flushed independently, so observing one
            fresh value says nothing about the other. Thread 1 must <Code>flush(a_val)</Code> right after the spin
            loop, mirroring exactly what thread 2 already does for <Code>b_val</Code>.{' '}
            <Good>General lesson:</Good> in a chained handoff, <em>every</em> consumer role needs its own "flush the
            data after seeing the flag" step — being in the middle of the pipeline (both consumer and producer) doesn't
            exempt thread 1 from either side's obligations.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="A lock that deadlocks in recursion"
      statement={
        <>
          <p className="mb-2">
            A parallel recursive tree walk locks a shared accumulator on every level with a <em>simple</em> lock. It hangs.
            Diagnose it, fix it with the right lock, and say how many unlocks are needed. Suggest a better design.
          </p>
          <Pre>{`omp_lock_t L;   // simple
void visit(node *v) {
  omp_set_lock(&L);
  total += v->val;
  for (c in v->children)
    visit(c);              // recursion WHILE holding L
  omp_unset_lock(&L);
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Diagnosis.</strong> A <strong>simple</strong> lock can be held only once. Inside the recursion the
            thread calls <Code>omp_set_lock(&amp;L)</Code> while it <em>already owns</em> <Code>L</Code> → it blocks
            waiting for itself: <Bad>self-deadlock</Bad>.
          </p>
          <p className="text-sm mb-1">
            <strong>Fix — nestable lock.</strong> Use <Code>omp_nest_lock_t</Code> with{' '}
            <Code>omp_set_nest_lock</Code>/<Code>omp_unset_nest_lock</Code>. A nestable lock is "available" to its own
            owner, so re-locking just increments a counter.
          </p>
          <Formula>{`recursion depth d  ⇒  the lock is set d times
⇒  it must be unset d times before it is free again`}</Formula>
          <Panel className="text-sm leading-relaxed mt-1">
            <Good>Better design:</Good> don't hold the lock across the recursive calls at all — it serializes the whole
            traversal. Lock only around the update:
            <Pre>{`void visit(node *v) {
  #pragma omp atomic
  total += v->val;         // or a critical / lock, just here
  for (c in v->children)
    visit(c);
}`}</Pre>
            Now the tree is walked in parallel and only the tiny <Code>total</Code> update is synchronized.
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
  { id: 'mutex', label: 'critical & atomic', render: () => <MutexSection /> },
  { id: 'reduction', label: 'Reduction', render: () => <ReductionSection /> },
  { id: 'barrier', label: 'Barriers & flush', render: () => <BarrierFlushSection /> },
  { id: 'locks', label: 'master, locks & timing', render: () => <MasterLockSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function SynchronizationStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 5 · §5.2 · Coordination and Synchronization"
      title="Coordination and Synchronization"
      subtitle="Threads sharing data must be synchronized to avoid race conditions. This section covers mutual exclusion (critical, atomic), global reductions, event synchronization with barriers and flush, the master directive, lock variables, and wall-clock timing."
      tabs={tabs}
    />
  )
}
