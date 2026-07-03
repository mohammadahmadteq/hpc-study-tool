import React, { useState } from 'react'
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
  FlowGraph,
  Stepper,
  edgeKey,
  type Fill,
  type GNode,
  type GEdge,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 6 · §6.1 — Instruction Scheduling   (PDF 280–330)
 *  Static/dynamic scheduling, superscalar vs. VLIW, the machine model,
 *  list scheduling + HLF, trace scheduling + compensation code, and
 *  loop scheduling / software pipelining (kernel–prologue–epilogue).
 * ------------------------------------------------------------------ */

const pill = (active: boolean) =>
  cn(
    'text-[12px] px-2.5 py-1 rounded-full border transition-colors',
    active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
  )

/* ------------------------------------------------------------------ *
 *  Shared "run the algorithm" stepper: a compact left panel (title,
 *  optional code, tag rows for ready/issued/deferred-style sets, a
 *  short bullet list of state updates, an optional note) next to a
 *  right panel that renders whatever state the caller wants to track
 *  (a growing table, a value grid, a flow graph, ...). Used for every
 *  "watch the algorithm run, cycle by cycle" demo in this chapter.
 * ------------------------------------------------------------------ */

interface AlgoTagRow {
  label: string
  items: string[]
  tone?: 'default' | 'good' | 'bad' | 'warn'
}

interface AlgoStep {
  title: string
  pre?: string
  tags?: AlgoTagRow[]
  facts?: React.ReactNode[]
  note?: React.ReactNode
}

const AlgoStepper: React.FC<{
  steps: AlgoStep[]
  rightLabel: string
  right: (stepIndex: number) => React.ReactNode
}> = ({ steps, rightLabel, right }) => {
  const [i, setI] = useState(0)
  const s = steps[i]
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <Panel>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="font-semibold text-sm">{s.title}</div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {i + 1}/{steps.length}
            </span>
          </div>
          {s.pre && <Pre>{s.pre}</Pre>}
          {s.tags?.map((row) => (
            <div key={row.label} className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[11px] text-muted-foreground w-20 shrink-0">{row.label}</span>
              {row.items.length ? (
                row.items.map((id) => (
                  <Tag key={id} tone={row.tone ?? 'default'}>
                    {id}
                  </Tag>
                ))
              ) : (
                <span className="text-[11px] text-muted-foreground">—</span>
              )}
            </div>
          ))}
          {s.facts && s.facts.length > 0 && (
            <ul className="text-sm space-y-1 mt-1.5 list-none">
              {s.facts.map((f, k) => (
                <li key={k} className="flex gap-2 leading-relaxed">
                  <span className="text-primary shrink-0">›</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          {s.note && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.note}</p>}
        </Panel>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setI((p) => Math.max(0, p - 1))}
            disabled={i === 0}
            className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            ← back
          </button>
          <span className="flex-1 text-center text-xs text-muted-foreground">
            step {i + 1} of {steps.length}
          </span>
          <button
            onClick={() => setI((p) => Math.min(steps.length - 1, p + 1))}
            disabled={i === steps.length - 1}
            className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            next →
          </button>
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">{rightLabel}</div>
        {right(i)}
      </div>
    </div>
  )
}

/* ================================================================== *
 *  Tab 1 · Overview — static/dynamic, levels, superscalar vs VLIW,
 *  the delay problem, and the formal machine model
 * ================================================================== */

interface Instr {
  id: string
  text: string
  writes?: string
  reads: string[]
}

function simulateInOrder(seq: Instr[], delay: number) {
  const ready: Record<string, number> = {}
  let prevIssue = 0
  const rows: { id: string; text: string; issue: number }[] = []
  for (const ins of seq) {
    let earliest = prevIssue + 1
    for (const r of ins.reads) if (ready[r] !== undefined) earliest = Math.max(earliest, ready[r])
    rows.push({ id: ins.id, text: ins.text, issue: earliest })
    if (ins.writes) ready[ins.writes] = earliest + delay
    prevIssue = earliest
  }
  return rows
}

const leftSeq: Instr[] = [
  { id: '1', text: 'load R1, A', writes: 'R1', reads: [] },
  { id: '2', text: 'load R2, B', writes: 'R2', reads: [] },
  { id: '3', text: 'add R3, R1, R2', writes: 'R3', reads: ['R1', 'R2'] },
  { id: '4', text: 'store X, R3', reads: ['R3'] },
  { id: '5', text: 'load R4, C', writes: 'R4', reads: [] },
  { id: '6', text: 'add R5, R3, R4', writes: 'R5', reads: ['R3', 'R4'] },
  { id: '7', text: 'store Y, R5', reads: ['R5'] },
]
const rightSeq: Instr[] = [
  { id: '1', text: 'load R1, A', writes: 'R1', reads: [] },
  { id: '2', text: 'load R2, B', writes: 'R2', reads: [] },
  { id: '3', text: 'load R4, C', writes: 'R4', reads: [] },
  { id: '4', text: 'add R3, R1, R2', writes: 'R3', reads: ['R1', 'R2'] },
  { id: '5', text: 'add R5, R3, R4', writes: 'R5', reads: ['R3', 'R4'] },
  { id: '6', text: 'store X, R3', reads: ['R3'] },
  { id: '7', text: 'store Y, R5', reads: ['R5'] },
]

const DelayCompareDemo: React.FC = () => {
  const [which, setWhich] = useState<'left' | 'right'>('left')
  const seq = which === 'left' ? leftSeq : rightSeq
  const rows = simulateInOrder(seq, 2)
  const total = Math.max(...rows.map((r) => r.issue))
  const cols = Array.from({ length: total }, (_, i) => i + 1)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => setWhich('left')} className={pill(which === 'left')}>
          naive order
        </button>
        <button onClick={() => setWhich('right')} className={pill(which === 'right')}>
          reordered
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="text-[11px] font-mono border-collapse">
          <thead>
            <tr>
              <th className="text-left pr-3 pb-1 text-muted-foreground font-normal">instruction</th>
              {cols.map((c) => (
                <th key={c} className="w-7 text-center pb-1 text-muted-foreground font-normal">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="pr-3 py-0.5 whitespace-nowrap">{r.text}</td>
                {cols.map((c) => (
                  <td key={c} className="w-7 h-6 text-center align-middle">
                    {c === r.issue ? (
                      <span className="inline-block w-5 h-5 rounded bg-primary" title={`issued at cycle ${c}`} />
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Single-issue, in-order processor, one instruction slot per cycle; a <Code>load</Code>/<Code>add</Code> result
        is only readable <strong>2 cycles</strong> after it issues. Each cell marks the cycle an instruction actually
        issues — later than the previous instruction's cycle if it has to stall for an operand. Total:{' '}
        <span className="font-mono text-foreground font-semibold">{total} cycles</span>.
      </p>
    </div>
  )
}

const OverviewSection: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4 bg-muted/30">
      <p className="text-sm leading-relaxed mb-2">
        <strong>Scheduling</strong> means mapping the computations of a program onto the compute resources of a
        machine. Two things matter: the mapping should be <strong>good</strong> with respect to some target function
        (usually: minimize total execution time), and computing it should itself be <strong>cheap</strong>.
      </p>
      <p className="text-sm leading-relaxed">
        Chapter 6 looks at scheduling at several granularities — instructions, vector units, loop iterations, tasks.
        This section (§6.1) is about the finest grain: <strong>instruction scheduling</strong>, i.e. deciding the
        order in which machine instructions are handed to a processor's functional units.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Static vs. dynamic scheduling</h3>
      <Table
        head={['', 'When is the mapping computed?', 'Advantage', 'Disadvantage']}
        rows={[
          [
            <strong>static</strong>,
            <>before execution, using global (compile-time) program information</>,
            <Good>no runtime overhead</Good>,
            <>can't react to actual runtime timing</>,
          ],
          [
            <strong>dynamic</strong>,
            <>during execution, using runtime information</>,
            <Good>reacts to actual execution times</Good>,
            <Bad>management overhead at runtime</Bad>,
          ],
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Consequence: whichever method is used, it has to be <strong>simple and fast</strong> — a scheduler that is
        itself slow defeats its own purpose.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Levels of scheduling</h3>
      <Table
        head={['Level', 'What gets mapped', 'Goal']}
        rows={[
          [<strong>instruction</strong>, <>machine instructions → functional units</>, <>reduce time for a sequence of instructions</>],
          [<>vector units</>, <>computations → a processor's vector units</>, <>—</>],
          [<>loop</>, <>loop iterations → processors of a parallel system</>, <>—</>],
          [<>task</>, <>single-/multi-processor tasks → processors</>, <>—</>],
        ]}
      />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">6.1 Superscalar vs. VLIW</h3>
      <p className="text-sm mb-2">
        Modern processors issue several instructions per cycle by having several functional units. Two hardware
        philosophies for exploiting that:
      </p>
      <Table
        head={['', 'Superscalar', 'VLIW (very long instruction word)']}
        rows={[
          [<>who schedules</>, <>the <strong>hardware</strong> decode unit, every cycle</>, <>the <strong>compiler</strong>, ahead of time</>],
          [<>scheduling kind</>, <Tag tone="good">dynamic</Tag>, <Tag tone="warn">static</Tag>],
          [
            <>mechanism</>,
            <>decode unit reads several instructions/cycle, computes dependencies, assigns free functional units</>,
            <>compiler emits one wide instruction word per cycle, one field per functional unit</>,
          ],
          [<>compiler's role</>, <>can help by ordering instructions well, but isn't required to</>, <>fully responsible — must do the dependency analysis itself</>],
          [<>trade-off</>, <>simpler binaries, less exposed parallelism</>, <><Bad>breaks binary compatibility</Bad> but enables deeper reordering (Trace Scheduling, Software Pipelining)</>],
          [<>examples</>, <>Intel IA-32, AMD Athlon</>, <>Intel IA-64 (Itanium), Transmeta Crusoe/Efficeon</>],
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Everything below focuses on the VLIW case: a good VLIW schedule is also a good schedule for a superscalar
        machine with the same resources.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Why order matters: results aren't instant</h3>
      <p className="text-sm mb-2">
        A result computed by an instruction typically isn't available in the very next cycle. If a dependent
        instruction is issued too early it must be delayed (stalled) until the operand is ready. These two
        instruction sequences compute the <strong>same thing</strong>, but one is ordered to hide that latency and
        one isn't:
      </p>
      <Table
        head={['naive order', 'reordered']}
        rows={[
          [
            <Pre>{`load R1, A
load R2, B
add  R3, R1, R2
store X, R3
load R4, C
add  R5, R3, R4
store Y, R5`}</Pre>,
            <Pre>{`load R1, A
load R2, B
load R4, C
add  R3, R1, R2
add  R5, R3, R4
store X, R3
store Y, R5`}</Pre>,
          ],
        ]}
      />
      <p className="text-sm mb-2">
        Assume a single-issue processor and a <strong>delay of 2</strong>: a <Code>load</Code>/<Code>add</Code> result
        can only be read 2 cycles after that instruction issues. Toggle below and watch which cycle each instruction
        actually issues in:
      </p>
      <DelayCompareDemo />
      <p className="text-xs text-muted-foreground mt-2">
        The reordered version hides the load latency behind independent work (<Code>load R4,C</Code> while
        <Code>R1</Code>/<Code>R2</Code> are still in flight) — <strong>11 cycles</strong> shrink to{' '}
        <strong>8</strong>, with no change in what is computed.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">A VLIW example: 2 load units</h3>
      <p className="text-sm mb-2">
        With <strong>2 load units</strong> (delay 2) a VLIW compiler can issue two independent loads in the very same
        cycle. For the instruction sequence on the left it produces the schedule on the right (each row = one VLIW
        instruction word, one column per issue slot):
      </p>
      <Table
        head={['sequential source', 'slot 1', 'slot 2']}
        rows={[
          ['load R1, A', 'load R1, A', 'load R4, C'],
          ['load R2, B', 'load R2, B', 'load R5, D'],
          ['add R3, R1, R2', 'delay', 'delay'],
          ['store X, R3', 'add R3, R1, R2', 'delay'],
          ['load R4, C', 'store X, R3', 'add R6, R4, R5'],
          ['load R5, D', 'empty', 'store Y, R6'],
          ['add R6, R4, R5', '', ''],
          ['store Y, R6', '', ''],
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Both load pairs issue together (2 units), then both adds must wait out the 2-cycle load delay — but there is
        only <strong>one</strong> add unit and <strong>one</strong> store unit, so <Code>add R6,R4,R5</Code> can't
        join <Code>add R3,R1,R2</Code> in the same cycle even though its operands are ready; it waits one more cycle
        for the shared unit. Question 1 walks through exactly this mechanism by hand.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Reordering can cost registers</h3>
      <p className="text-sm mb-2">
        Reordering for parallelism isn't free — it can increase register pressure. <Code>a = b+c+d+e;</Code> compiles
        to either of these:
      </p>
      <Table
        head={['sequential (1 register)', 'parallel-ready (2 registers)']}
        rows={[
          [
            <Pre>{`add R1, b, c
add R1, R1, d
add R1, R1, e`}</Pre>,
            <Pre>{`add R1, b, c
add R2, d, e
add R1, R1, R2`}</Pre>,
          ],
        ]}
      />
      <p className="text-sm">
        Left: every instruction depends on the previous one — no parallelism, but only <Code>R1</Code> is needed.
        Right: the first two additions are independent and can issue together, but a second register <Code>R2</Code>{' '}
        is now live at the same time. A code generator that picks the left form to save a register has (unwittingly)
        introduced an <strong>artificial dependence</strong> that a scheduler can no longer remove.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Formal machine model</h3>
      <p className="text-sm mb-2">
        A processor has execution units of <Code>l</Code> different types; <Code>I</Code>
        <sub>j</sub>
        <sup>k</sup> is the <Code>j</Code>-th unit of type <Code>k</Code>, and <Code>m</Code>
        <sub>k</sub> is how many units of type <Code>k</Code> exist. Each unit accepts one instruction per cycle; its
        result appears after a fixed <strong>delay</strong>.
      </p>
      <Formula>{`M = Σᵢ₌₁..ˡ mᵢ        (total number of execution units;
                       at most M instructions may issue per cycle)`}</Formula>
      <p className="text-sm mb-2">
        A scheduling problem is a graph <Code>G = (N, E, type, delay)</Code>: <Code>N</Code> are the instructions,
        each with a <Code>type</Code> and <Code>delay</Code>; <Code>(n₁,n₂) ∈ E</Code> means <Code>n₂</Code> may only
        start once <Code>n₁</Code> has <em>finished</em> (a dependence).
      </p>
      <p className="text-sm mb-1">A correct scheduling is a mapping <Code>S : N → ℕ₀</Code> (start cycle) with:</p>
      <div className="text-sm">
        <Step n="1">
          <Code>S(n) ≥ 0</Code> for every instruction.
        </Step>
        <Step n="2">
          For every dependence <Code>(n₁,n₂) ∈ E</Code>: <Code>S(n₁) + delay(n₁) ≤ S(n₂)</Code> — the consumer
          doesn't start before the producer's result exists.
        </Step>
        <Step n="3">
          For every type <Code>t</Code>, no more than <Code>m</Code>
          <sub>t</sub> instructions of type <Code>t</Code> start at the same cycle.
        </Step>
      </div>
      <Formula>{`L(S) = max_{n ∈ N} ( S(n) + delay(n) )      — length of schedule S`}</Formula>
      <p className="text-sm">
        The goal of instruction scheduling: find a correct <Code>S</Code> with minimum <Code>L(S)</Code>.
      </p>
    </div>
  </div>
)

/* ================================================================== *
 *  Tab 2 · List Scheduling (6.1.1)
 * ================================================================== */

interface Bar {
  id: string
  label: string
  unit: 'mult' | 'add'
  start: number
  delay: number
}
const scheduleA: Bar[] = [
  { id: '2', label: 'mult f,d,e', unit: 'mult', start: 1, delay: 1 },
  { id: '1', label: 'mult c,a,b', unit: 'mult', start: 2, delay: 1 },
  { id: '3', label: 'add f,f,g', unit: 'add', start: 2, delay: 1 },
  { id: '4', label: 'add f,f,h', unit: 'add', start: 3, delay: 1 },
  { id: '5', label: 'add f,f,c', unit: 'add', start: 4, delay: 1 },
]
const scheduleB: Bar[] = [
  { id: '1', label: 'mult c,a,b', unit: 'mult', start: 1, delay: 1 },
  { id: '2', label: 'mult f,d,e', unit: 'mult', start: 2, delay: 1 },
  { id: '3', label: 'add f,f,g', unit: 'add', start: 3, delay: 1 },
  { id: '4', label: 'add f,f,h', unit: 'add', start: 4, delay: 1 },
  { id: '5', label: 'add f,f,c', unit: 'add', start: 5, delay: 1 },
]

/* ---- step-by-step trace of find_remaining()'s backward traversal -- */

const REM_IDS = ['1', '2', '3', '4', '5'] as const

const remStepsMeta: AlgoStep[] = [
  {
    title: 'Setup — count[] counts successors',
    facts: [
      <>n1 and n4 each have exactly one outgoing edge (→ n5)</>,
      <>n2 → n3 and n3 → n4 each contribute one</>,
      <>n5 has none — it's a sink</>,
    ],
    tags: [{ label: 'W', items: ['n5'] }],
    note: <>Every remaining[n] starts at delay(n) = 1.</>,
  },
  {
    title: 'Process n5  (r = 1)',
    tags: [
      { label: 'predecessors', items: ['n4', 'n1'] },
      { label: 'W now', items: ['n4', 'n1'], tone: 'good' },
    ],
    facts: [<>remaining[4] = max(1, 1+1) = 2, count[4] → 0</>, <>remaining[1] = max(1, 1+1) = 2, count[1] → 0</>],
  },
  {
    title: 'Process n4  (r = 2)',
    tags: [
      { label: 'predecessors', items: ['n3'] },
      { label: 'W now', items: ['n1', 'n3'], tone: 'good' },
    ],
    facts: [<>remaining[3] = max(1, 2+1) = 3, count[3] → 0</>],
  },
  {
    title: 'Process n1  (r = 2)',
    tags: [
      { label: 'predecessors', items: [] },
      { label: 'W now', items: ['n3'] },
    ],
    note: <>n1 is a source — nothing to update.</>,
  },
  {
    title: 'Process n3  (r = 3)',
    tags: [
      { label: 'predecessors', items: ['n2'] },
      { label: 'W now', items: ['n2'], tone: 'good' },
    ],
    facts: [<>remaining[2] = max(1, 3+1) = 4, count[2] → 0</>],
  },
  {
    title: 'Process n2  (r = 4)',
    tags: [
      { label: 'predecessors', items: [] },
      { label: 'W now', items: [] },
    ],
    note: <>n2 is a source too — W is now empty, the traversal terminates.</>,
  },
  {
    title: 'Result',
    facts: [<>remaining = [n1:2, n2:4, n3:3, n4:2, n5:1]</>],
    note: (
      <>
        n2 carries the largest value — the longest remaining chain (n2→n3→n4→n5) — so HLF schedules it before n1
        whenever both are ready.
      </>
    ),
  },
]

const remRightData: { remaining: number[]; finalized: boolean[] }[] = [
  { remaining: [1, 1, 1, 1, 1], finalized: [false, false, false, false, true] },
  { remaining: [2, 1, 1, 2, 1], finalized: [true, false, false, true, true] },
  { remaining: [2, 1, 3, 2, 1], finalized: [true, false, true, true, true] },
  { remaining: [2, 1, 3, 2, 1], finalized: [true, false, true, true, true] },
  { remaining: [2, 4, 3, 2, 1], finalized: [true, true, true, true, true] },
  { remaining: [2, 4, 3, 2, 1], finalized: [true, true, true, true, true] },
  { remaining: [2, 4, 3, 2, 1], finalized: [true, true, true, true, true] },
]

const FindRemainingWalkthrough: React.FC = () => (
  <AlgoStepper
    steps={remStepsMeta}
    rightLabel="remaining[ ] (bold = finalized)"
    right={(i) => {
      const d = remRightData[i]
      return (
        <div className="grid grid-cols-5 gap-2 font-mono text-[12px]">
          {REM_IDS.map((id, k) => (
            <div
              key={id}
              className={cn('rounded border px-1.5 py-1 text-center', d.finalized[k] ? 'border-primary bg-primary/10' : 'border-border')}
            >
              <div className="text-[10px] text-muted-foreground">n{id}</div>
              <div className={d.finalized[k] ? 'font-semibold text-primary' : 'text-muted-foreground'}>{d.remaining[k]}</div>
            </div>
          ))}
        </div>
      )
    }}
  />
)

const MultAddOrderDemo: React.FC = () => {
  const [order, setOrder] = useState<'hlf' | 'naive'>('hlf')
  const bars = order === 'hlf' ? scheduleA : scheduleB
  const total = Math.max(...bars.map((b) => b.start + b.delay - 1))
  const cols = Array.from({ length: total }, (_, i) => i + 1)
  const remaining: Record<string, number> = { '1': 2, '2': 4, '3': 3, '4': 2, '5': 1 }
  const order5 = ['1', '2', '3', '4', '5']

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => setOrder('hlf')} className={pill(order === 'hlf')}>
          HLF: schedule (2) before (1)
        </button>
        <button onClick={() => setOrder('naive')} className={pill(order === 'naive')}>
          schedule (1) before (2)
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-3 text-[11px] font-mono">
        {order5.map((id) => (
          <span key={id} className="px-1.5 py-0.5 rounded border bg-muted/40">
            remaining[{id}] = {remaining[id]}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="text-[11px] font-mono border-collapse">
          <thead>
            <tr>
              <th className="text-left pr-3 pb-1 text-muted-foreground font-normal">instruction</th>
              {cols.map((c) => (
                <th key={c} className="w-7 text-center pb-1 text-muted-foreground font-normal">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {['1', '2', '3', '4', '5'].map((id) => {
              const b = bars.find((x) => x.id === id)!
              return (
                <tr key={id}>
                  <td className="pr-3 py-0.5 whitespace-nowrap">
                    ({id}) {b.label}
                  </td>
                  {cols.map((c) => (
                    <td key={c} className="w-7 h-6 text-center align-middle">
                      {c === b.start ? (
                        <span
                          className="inline-block w-5 h-5 rounded"
                          style={{ background: b.unit === 'mult' ? '#8b5cf6' : '#3b82f6' }}
                        />
                      ) : null}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        One multiplication unit, unlimited add capacity, all delays = 1. Total length ={' '}
        <span className="font-mono text-foreground font-semibold">{total} cycles</span>. Purple = mult unit, blue =
        add unit.
      </p>
    </div>
  )
}

/* ---- step-by-step trace of list_schedule() on a concrete DAG ------ */

interface TraceRow {
  cycle: number
  slot1: string
  slot2: string
}

const traceSchedule: TraceRow[] = [
  { cycle: 1, slot1: 'load R1, A', slot2: 'load R4, C' },
  { cycle: 2, slot1: 'load R2, B', slot2: 'load R5, D' },
  { cycle: 3, slot1: 'delay', slot2: 'delay' },
  { cycle: 4, slot1: 'add R3, R1, R2', slot2: 'delay' },
  { cycle: 5, slot1: 'store X, R3', slot2: 'add R6, R4, R5' },
  { cycle: 6, slot1: '(empty)', slot2: 'store Y, R6' },
]

const listStepsMeta: AlgoStep[] = [
  {
    title: 'Setup — instructions & initial worklist',
    pre: `n1  load R1, A          n5  load R4, C
n2  load R2, B          n6  load R5, D
n3  add  R3, R1, R2     n7  add  R6, R4, R5
n4  store X, R3         n8  store Y, R6`,
    tags: [{ label: 'W[0]', items: ['n1', 'n2', 'n5', 'n6'] }],
    note: (
      <>
        All four loads have count=0 (no predecessors); everything else waits. Machine: 2 load units (delay 2), 1 add
        unit (delay 1), 1 store unit (delay 1).
      </>
    ),
  },
  {
    title: 'Cycle 1 — 2 units, 4 contenders',
    tags: [
      { label: 'ready', items: ['n1', 'n2', 'n5', 'n6'] },
      { label: 'issued', items: ['n1', 'n5'], tone: 'good' },
      { label: 'deferred', items: ['n2', 'n6'], tone: 'warn' },
    ],
    facts: [<>count[n3]: 2→1, earliest[n3] = max(0, 1+2) = 3</>, <>count[n7]: 2→1, earliest[n7] = max(0, 1+2) = 3</>],
    note: <>n2 and n6 find no free load unit this cycle, so they're pushed into next cycle's list instead.</>,
  },
  {
    title: 'Cycle 2 — the deferred pair catches up',
    tags: [
      { label: 'ready', items: ['n2', 'n6'] },
      { label: 'issued', items: ['n2', 'n6'], tone: 'good' },
    ],
    facts: [
      <>count[n3]: 1→0 → ready! earliest[n3] = max(3, 2+2) = 4 → joins W[4]</>,
      <>count[n7]: 1→0 → ready! earliest[n7] = max(3, 2+2) = 4 → joins W[4]</>,
    ],
  },
  {
    title: 'Cycle 3 — a bubble',
    tags: [{ label: 'ready', items: [] }],
    note: <>W[2] is empty — n3 and n7 aren't due until cycle 4. Nothing issues: the "delay" row in the final table.</>,
  },
  {
    title: 'Cycle 4 — one add unit, two contenders',
    tags: [
      { label: 'ready', items: ['n3', 'n7'] },
      { label: 'issued', items: ['n3'], tone: 'good' },
      { label: 'deferred', items: ['n7'], tone: 'warn' },
    ],
    facts: [<>count[n4]: 1→0 → ready! earliest[n4] = max(0, 4+1) = 5 → joins W[5]</>],
  },
  {
    title: 'Cycle 5 — different types, no conflict',
    tags: [
      { label: 'ready', items: ['n7', 'n4'] },
      { label: 'issued', items: ['n7', 'n4'], tone: 'good' },
    ],
    facts: [<>count[n8]: 1→0 → ready! earliest[n8] = max(0, 5+1) = 6 → joins W[6]</>],
    note: <>n7 (add) and n4 (store) need different unit types, so both issue in the same cycle.</>,
  },
  {
    title: 'Cycle 6 — done',
    tags: [
      { label: 'ready', items: ['n8'] },
      { label: 'issued', items: ['n8'], tone: 'good' },
    ],
    note: <>Wcount reaches 0 — the algorithm terminates. Final length: 6 cycles.</>,
  },
]

const ListScheduleWalkthrough: React.FC = () => (
  <AlgoStepper
    steps={listStepsMeta}
    rightLabel="schedule built so far"
    right={(i) => {
      const rowsShown = traceSchedule.slice(0, i)
      return (
        <Table
          head={['cycle', 'load/store slot 1', 'load/store slot 2']}
          rows={rowsShown.length ? rowsShown.map((r) => [String(r.cycle), r.slot1, r.slot2]) : [['—', '(nothing issued yet)', '']]}
        />
      )
    }}
  />
)

const ListSchedulingSection: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">6.1.1 List Scheduling</h3>
      <p className="text-sm mb-2">
        List scheduling schedules one <strong>basic block</strong> at a time (its scheduling graph is a DAG). The
        idea: walk the DAG from the leaves toward the root, always keeping a <strong>worklist</strong> of
        instructions that are <em>ready</em> — all their predecessors have already finished — and start ready
        instructions as early as possible.
      </p>
      <div className="text-sm">
        <Step n="①">
          For each instruction <Code>n</Code>, track <Code>count[n]</Code> (number of unfinished predecessors) and{' '}
          <Code>earliest[n]</Code> (earliest cycle it could start, given its dependences so far).
        </Step>
        <Step n="②">
          <Code>n</Code> becomes ready the moment <Code>count[n]</Code> hits 0; it's added to a worklist{' '}
          <Code>W[c]</Code> indexed by the cycle <Code>c = earliest[n]</Code>.
        </Step>
        <Step n="③">
          Since delays are bounded, only <Code>MaxC = maxₙ delay(n) + 1</Code> worklists are ever needed at once —
          they're reused cyclically as <Code>W[c mod MaxC]</Code>.
        </Step>
        <Step n="④">
          At each cycle, instructions are pulled off the current worklist and assigned to a free functional unit of
          the matching type; if none is free, the instruction is pushed to <em>next</em> cycle's list instead.
        </Step>
      </div>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">The algorithm</h3>
      <Pre>{`procedure list_schedule (Graph G, output_table instr) {
  for each (n ∈ N) { count[n] = 0; earliest[n] = 0; }
  for each ((n1,n2) ∈ E) {
      count[n2] = count[n2] + 1;
      successor[n1] = successor[n1] ∪ {n2};
  }
  for (i = 0; i < MaxC; i++) W[i] = ∅;
  Wcount = 0;
  for each (n ∈ N) if (count[n] == 0) { W[0] = W[0] ∪ {n}; Wcount++; }

  c = 0; instr[c] = ∅; cW = 0;
  while (Wcount > 0) {
    while (W[cW] == ∅) { c++; instr[c] = ∅; cW = (cW+1) % MaxC; }
    nextc = (c+1) % MaxC;
    while (W[cW] != ∅) {
      remove an arbitrary instruction x from W[cW];
      if (a free functional unit of type(x) exists in cycle c) {
        instr[c] = instr[c] ∪ {x}; Wcount--;
        for each (y ∈ successor[x]) {
          count[y]--;
          earliest[y] = max(earliest[y], c + delay(x));
          if (count[y] == 0) { loc = earliest[y] % MaxC; W[loc] = W[loc] ∪ {y}; Wcount++; }
        }
      } else W[nextc] = W[nextc] ∪ {x};   // no free unit — try again next cycle
    }
  }
}`}</Pre>
      <p className="text-xs text-muted-foreground">
        When several instructions are ready at once, the algorithm as stated picks one <strong>arbitrarily</strong> —
        which can matter a lot, as the next example shows.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Watch list_schedule() run, cycle by cycle</h3>
      <p className="text-sm mb-3">
        Same machine as the VLIW-2-load-units example from the overview tab (2 load units, 1 add unit, 1 store unit).
        Step through the worklist <Code>W[]</Code>, <Code>count[]</Code> and <Code>earliest[]</Code> exactly as the
        algorithm updates them, cycle by cycle, and watch the schedule on the right fill in.
      </p>
      <ListScheduleWalkthrough />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">The problem with "arbitrary"</h3>
      <p className="text-sm mb-2">
        One multiplication unit; the sequence <Code>mult c,a,b</Code> (1), <Code>mult f,d,e</Code> (2),{' '}
        <Code>add f,f,g</Code> (3), <Code>add f,f,h</Code> (4), <Code>add f,f,c</Code> (5) forms a dependency chain{' '}
        <Code>2→3→4→5</Code> plus <Code>1→5</Code>. Both mults are ready in cycle 1, but the single mult unit can only
        take one — and whichever is picked second delays everything that depends on it.
      </p>
      <p className="text-sm mb-2">
        <strong>Remedy — Highest Level First (HLF):</strong> precompute, for every instruction, the length of the{' '}
        <em>longest remaining path</em> to the end of the graph (<Code>remaining[n]</Code>) by a backward traversal,
        and always schedule the <strong>ready instruction with the largest <Code>remaining</Code></strong> first.
      </p>
      <Pre>{`procedure find_remaining (Graph G, array remaining) {
  for each (n ∈ N) { count[n] = 0; remaining[n] = delay(n); }
  for each ((n1,n2) ∈ E) {
      count[n1] = count[n1] + 1;                 // number of successors
      predecessor[n2] = predecessor[n2] ∪ {n1};
  }
  W = ∅;
  for each (n ∈ N) if (count[n] == 0) W = W ∪ {n};   // sinks first
  while (W != ∅) {
    remove an arbitrary instruction x from W;
    r = remaining[x];
    for each (y ∈ predecessor[x]) {
      count[y]--;
      remaining[y] = max(remaining[y], r + delay(y));
      if (count[y] == 0) W = W ∪ {y};
    }
  }
}`}</Pre>
      <p className="text-sm mb-3">
        With delay = 1 everywhere, this gives <Code>remaining[5]=1, remaining[4]=2, remaining[3]=3, remaining[2]=4,
        remaining[1]=2</Code> — instruction (2) sits on the longer chain, so HLF schedules it <strong>first</strong>.
        Step through the backward traversal itself below to see exactly how those numbers arise:
      </p>
      <FindRemainingWalkthrough />
      <p className="text-sm font-medium mt-4 mb-2">Now apply that ordering to the actual schedule:</p>
      <MultAddOrderDemo />
      <p className="text-xs text-muted-foreground mt-2">
        Picking the higher-<Code>remaining</Code> instruction (2) first finishes in <strong>5</strong> cycles;
        picking (1) first — a perfectly legal "arbitrary" choice — costs an extra cycle: <strong>6</strong>. (2) was
        on the critical path and any delay to it propagates all the way to the end.
      </p>
    </div>
  </div>
)

/* ================================================================== *
 *  Tab 3 · Trace Scheduling (6.1.2)
 * ================================================================== */

const traceNodes: GNode[] = [
  { id: 'A', x: 90, y: 30, label: 'A', sub: '100' },
  { id: 'B', x: 290, y: 30, label: 'B', sub: '10' },
  { id: 'C', x: 20, y: 150, label: 'C' },
  { id: 'D', x: 190, y: 150, label: 'D' },
  { id: 'E', x: 340, y: 150, label: 'E' },
]
const traceEdges: GEdge[] = [
  { from: 'A', to: 'C', label: '0.1' },
  { from: 'A', to: 'D', label: '0.9' },
  { from: 'B', to: 'D', label: '0.9', bend: 40 },
  { from: 'B', to: 'E', label: '0.1' },
]

const TraceProbabilityDemo: React.FC = () => {
  const [pick, setPick] = useState<'AD' | 'BD' | null>(null)
  const activeEdges = pick === 'AD' ? [edgeKey({ from: 'A', to: 'D' })] : pick === 'BD' ? [edgeKey({ from: 'B', to: 'D' })] : []

  return (
    <div>
      <p className="text-sm mb-2">
        The current trace ends at <Code>B</Code>. <Code>A</Code> executes 100 times, <Code>B</Code> only 10 times (it
        is reached some other way too). Both <Code>A→D</Code> and <Code>B→D</Code> reach <Code>D</Code> — which
        continuation should the trace prefer?
      </p>
      <FlowGraph nodes={traceNodes} edges={traceEdges} width={380} height={200} activeEdges={activeEdges} maxW={360} />
      <div className="flex flex-wrap gap-2 mb-2">
        <button onClick={() => setPick('BD')} className={pill(pick === 'BD')}>
          extend via B → D (est. 10×0.9=9)
        </button>
        <button onClick={() => setPick('AD')} className={pill(pick === 'AD')}>
          extend via A → D (est. 100×0.9=90)
        </button>
      </div>
      {pick && (
        <Panel className="text-sm leading-relaxed">
          {pick === 'AD' ? (
            <>
              <Good>Correct.</Good> <Code>A→D</Code> carries an estimated <strong>90</strong> executions vs.{' '}
              <Code>B→D</Code>'s <strong>9</strong>. The trace-selection heuristic always follows the edge with the{' '}
              <em>largest</em> estimate, so it should have grown from <Code>A</Code> straight to <Code>D</Code> —
              never taking the <Code>B→D</Code> detour at all.
            </>
          ) : (
            <>
              <Bad>Not preferred.</Bad> <Code>B→D</Code> only carries an estimated <strong>9</strong> executions,
              dwarfed by <Code>A→D</Code>'s <strong>90</strong>. Following it would build a trace that is rarely
              actually taken at runtime — exactly the case the estimation values are meant to avoid. The algorithm
              stops the current trace at <Code>B</Code> instead.
            </>
          )}
        </Panel>
      )}
    </div>
  )
}

const CodeExplosionDemo: React.FC = () => {
  const [n, setN] = useState(3)
  const copies = 2 * n * n - 2 * n
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-muted-foreground">chain length n =</span>
        <input type="range" min={1} max={8} value={n} onChange={(e) => setN(+e.target.value)} className="w-40" />
        <span className="font-mono text-sm">{n}</span>
      </div>
      <p className="text-sm">
        total compensation copies = <Code>4 · Σᵢ₌₁..ₙ₋₁ i = 2n² − 2n</Code> ={' '}
        <span className="font-mono font-semibold">{copies}</span>
      </p>
    </div>
  )
}

/* ---- step-by-step trace of the trace-selection algorithm ---------- */

const traceSelNodes: GNode[] = [
  { id: 'A', x: 150, y: 20, label: 'A', sub: '100' },
  { id: 'G', x: 300, y: 20, label: 'G', sub: '10' },
  { id: 'B', x: 150, y: 95, label: 'B', sub: '90' },
  { id: 'C', x: 150, y: 170, label: 'C', sub: '90' },
  { id: 'E', x: 300, y: 170, label: 'E', sub: '9' },
  { id: 'D', x: 150, y: 245, label: 'D', sub: '81' },
]
const traceSelEdges: GEdge[] = [
  { from: 'A', to: 'B', label: '0.9' },
  { from: 'A', to: 'G', label: '0.1' },
  { from: 'B', to: 'C', label: '1.0' },
  { from: 'C', to: 'D', label: '0.9' },
  { from: 'C', to: 'E', label: '0.1' },
  { from: 'D', to: 'C', label: 'back', dashed: true, bend: 60 },
]

const traceSelStepsMeta: AlgoStep[] = [
  {
    title: 'Seed selection',
    facts: [<>Estimated executions: A=100, B=90, C=90, D=81, E=9, G=10</>],
    tags: [{ label: 'seed', items: ['A'], tone: 'good' }],
    note: <>The seed is always the statement with the globally highest remaining estimate — here, A.</>,
  },
  {
    title: 'Forward growth: A → ?',
    facts: [<>A→B: 0.9 × 100 = 90</>, <>A→G: 0.1 × 100 = 10</>],
    tags: [{ label: 'trace so far', items: ['A', 'B'], tone: 'good' }],
    note: <>B wins — extend the trace to B.</>,
  },
  {
    title: 'Forward growth: B → ?',
    facts: [<>B has only one successor, C, taken with probability 1.0 (≈90 executions) — no real choice to make.</>],
    tags: [{ label: 'trace so far', items: ['A', 'B', 'C'], tone: 'good' }],
  },
  {
    title: 'Forward growth: C → ?',
    facts: [<>C→D: 0.9 × 90 = 81</>, <>C→E: 0.1 × 90 = 9</>],
    tags: [{ label: 'trace so far', items: ['A', 'B', 'C', 'D'], tone: 'good' }],
    note: <>D wins — an ordinary forward edge, not yet visited — extend the trace to D.</>,
  },
  {
    title: 'Forward growth stops at D',
    facts: [<>D's only successor is C — but that edge closes the loop, and C is already earlier in this very trace.</>],
    tags: [{ label: 'stop', items: ['backward edge'], tone: 'bad' }],
    note: <>Stopping condition met — forward growth halts at D.</>,
  },
  {
    title: 'Backward growth from the seed',
    facts: [<>A has no predecessor — it's the flow graph's entry node.</>],
    tags: [{ label: 'stop', items: ['no predecessor'], tone: 'bad' }],
    note: <>Stopping condition met immediately — there is nothing to prepend to the trace.</>,
  },
  {
    title: 'Final trace',
    tags: [{ label: 'trace', items: ['A', 'B', 'C', 'D'], tone: 'good' }],
    note: (
      <>
        This trace is scheduled as one block. G (off A) and E (off C) become off-trace edges that may need
        compensation code (rule 1); D→C, the edge that closes the loop, is handled the next time the algorithm
        selects a trace continuing from C.
      </>
    ),
  },
]

const traceSelGraphState: { nodes: string[]; edges: string[] }[] = [
  { nodes: ['A'], edges: [] },
  { nodes: ['A', 'B'], edges: [edgeKey({ from: 'A', to: 'B' })] },
  { nodes: ['A', 'B', 'C'], edges: [edgeKey({ from: 'B', to: 'C' })] },
  { nodes: ['A', 'B', 'C', 'D'], edges: [edgeKey({ from: 'C', to: 'D' })] },
  { nodes: ['A', 'B', 'C', 'D'], edges: [edgeKey({ from: 'D', to: 'C' })] },
  { nodes: ['A', 'B', 'C', 'D'], edges: [] },
  { nodes: ['A', 'B', 'C', 'D'], edges: [] },
]

const TraceSelectionWalkthrough: React.FC = () => (
  <AlgoStepper
    steps={traceSelStepsMeta}
    rightLabel="the trace as it grows"
    right={(i) => {
      const g = traceSelGraphState[i]
      const fillOf = (id: string): Fill => (g.nodes.includes(id) ? 'active' : 'dim')
      return <FlowGraph nodes={traceSelNodes} edges={traceSelEdges} width={380} height={300} fillOf={fillOf} activeEdges={g.edges} maxW={300} />
    }}
  />
)

const TraceSchedulingSection: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">6.1.2 Trace Scheduling — motivation</h3>
      <p className="text-sm mb-2">
        List scheduling optimizes one basic block at a time — but blocks are often tiny, and stitching them back
        together needs extra "wait for everything" instructions at every block boundary. Trace scheduling instead
        schedules a <strong>trace</strong>: a path through the flow graph spanning several basic blocks (branches
        allowed, loops not), treated as if it were one giant basic block.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">The general algorithm</h3>
      <div className="text-sm">
        <Step n="①">Pick the unscheduled trace with the highest estimated execution probability.</Step>
        <Step n="②">
          Schedule it as one basic block (list scheduling), inserting <strong>compensation code</strong> wherever the
          reordering would otherwise break correctness on a path that leaves or enters the trace.
        </Step>
        <Step n="③">Replace the trace in the flow graph by the generated schedule.</Step>
        <Step n="④">Repeat until the whole flow graph is scheduled.</Step>
      </div>
      <p className="text-sm">
        Traces scheduled <em>first</em> get the best schedules; every later trace risks extra compensation code, so{' '}
        <strong>trace order matters</strong>.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Choosing traces: execution estimates</h3>
      <p className="text-sm mb-2">
        Every statement gets an estimated execution count: branch probabilities split a node's count between its
        successors, and loops get an estimated trip count. A new trace starts at the statement with the{' '}
        <strong>highest</strong> remaining estimate (its <em>seed</em>), then grows forward and backward, always
        following the successor/predecessor with the highest estimate — stopping at a dead end, an already-scheduled
        statement, or a backward (loop) edge.
      </p>
      <TraceProbabilityDemo />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Watch a whole trace get built, step by step</h3>
      <p className="text-sm mb-3">
        A slightly bigger flow graph: A branches to B (0.9) or G (0.1); B always continues to C; C is a loop header
        branching to D (0.9, stays in the loop) or E (0.1, exits it); D always loops back to C. Step through the
        seed selection and the forward/backward growth exactly as the algorithm performs it.
      </p>
      <TraceSelectionWalkthrough />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Vocabulary for compensation code</h3>
      <p className="text-sm mb-2">
        For a trace <Code>T = ⟨v₁,…,vₖ⟩</Code>:
      </p>
      <Table
        head={['Term', 'Meaning']}
        rows={[
          [<strong>split node</strong>, <>a trace node with more than one successor in the flow graph</>],
          [<strong>on-trace edge</strong>, <>the edge leaving a split node that stays on the trace</>],
          [<strong>off-trace edge</strong>, <>any other edge leaving a split node (leads off the trace)</>],
          [<strong>join node</strong>, <>a node with a predecessor that isn't its trace-predecessor</>],
          [<strong>join edge</strong>, <>the edge into a join node coming from outside the trace</>],
        ]}
      />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Compensation rule 1 — off-trace edges</h3>
      <p className="text-sm mb-2">
        Source trace order: <Code>j:=i−2</Code>, <Code>n:=3·j</Code>, <Code>i:=m+1</Code>, then split on{' '}
        <Code>if m&gt;1</Code> — on-trace to <Code>k:=i+4</Code>, off-trace to <Code>k:=i+5</Code>. The scheduler is
        free to reorder aggressively and moves the branch itself all the way to cycle 1:
      </p>
      <Table
        head={['cycle', 'slot 1', 'slot 2']}
        rows={[
          ['1', 'if m > 1', ''],
          ['2', 'j := i−2', 'i := m+1'],
          ['3', 'n := 3·j', 'k := i+4  (on-trace)'],
        ]}
      />
      <p className="text-sm mb-2">
        Taking the off-trace jump now lands right after cycle 1, heading straight to <Code>k:=i+5</Code> — but{' '}
        <Code>j:=i−2</Code>, <Code>i:=m+1</Code> and <Code>n:=3·j</Code> haven't run yet on that path, even though the
        source program always executes them unconditionally before the branch:
      </p>
      <Table
        head={['Trace order', 'Instruction', 'Scheduled at', 'Runs on the off-trace jump?']}
        rows={[
          ['1', <Code>j := i−2</Code>, 'cycle 2 (after the branch)', <Bad>no — missing</Bad>],
          ['2', <Code>n := 3·j</Code>, 'cycle 3 (after the branch)', <Bad>no — missing</Bad>],
          ['3', <Code>i := m+1</Code>, 'cycle 2 (after the branch)', <Bad>no — missing</Bad>],
          ['4', <>split: <Code>if m &gt; 1</Code></>, 'cycle 1', '—'],
        ]}
      />
      <Panel className="text-sm leading-relaxed">
        <Tag tone="warn">Compensation rule 1</Tag>{' '}
        <span className="ml-1">
          Any instruction that was <strong>before</strong> a split in the trace but ends up scheduled{' '}
          <strong>after</strong> the split must be copied onto the off-trace edge, in its original trace order — here:{' '}
          <Code>j:=i−2</Code>, <Code>n:=3·j</Code>, <Code>i:=m+1</Code>, then the original <Code>k:=i+5</Code>.
        </span>
      </Panel>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Compensation rule 2 — join edges</h3>
      <p className="text-sm mb-2">
        Trace order <Code>c:=a·b</Code>, (join point), <Code>i:=i+1</Code>, <Code>d:=c−2</Code>, <Code>j:=2·i</Code>.
        The scheduler pairs <Code>i:=i+1</Code> with <Code>c:=a·b</Code> in cycle 1 — i.e. <em>before</em> the join
        point in the generated code:
      </p>
      <Table
        head={['cycle', 'slot 1', 'slot 2']}
        rows={[
          ['1', 'c := a·b', 'i := i+1'],
          ['2', 'd := c−2', 'j := 2·i'],
        ]}
      />
      <p className="text-sm mb-2">
        A different path joins in from a node computing <Code>c := a/2</Code>, arriving right where <Code>i:=i+1</Code>{' '}
        used to be — but that instruction has now moved <em>before</em> the join point, so the joining path would
        skip it entirely.
      </p>
      <Panel className="text-sm leading-relaxed">
        <Tag tone="warn">Compensation rule 2</Tag>{' '}
        <span className="ml-1">
          An instruction that was <strong>below</strong> the join point in the trace but ends up scheduled{' '}
          <strong>above</strong> it must be copied onto the join edge, right after the last instruction that already
          runs there — here, <Code>c:=a/2</Code> is followed by a copy of <Code>i:=i+1</Code> before joining into
          cycle 2's <Code>d:=c−2 | j:=2·i</Code>.
        </span>
      </Panel>
      <p className="text-xs text-muted-foreground">
        The join edge is positioned as early in the schedule as possible, subject to never separating a
        trace-instruction from something originally scheduled above it that must still precede it.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">A restriction rule: some moves can't be undone</h3>
      <p className="text-sm mb-2">
        Not every reordering can be repaired with a copy. If <Code>i:=i+2</Code> — which the source only executes
        when <Code>m&gt;1</Code> — gets scheduled <em>before</em> the branch that guards it, then the on-trace path
        (<Code>m≤1</Code>) would incorrectly execute it too, and there is no way to "un-execute" an assignment after
        the fact:
      </p>
      <Table
        head={['cycle', 'slot 1', 'slot 2']}
        rows={[
          ['1', 'i := m+1', ''],
          ['2', 'i := i+2', 'if m > 1'],
          ['3', 'k := i−5', ''],
        ]}
      />
      <Panel className="text-sm leading-relaxed">
        <Bad>Restriction rule:</Bad> a statement positioned <strong>after</strong> a split in the trace may{' '}
        <strong>never</strong> be moved to <strong>before</strong> the split in the schedule — except when it assigns
        a variable that is provably dead on the off-trace edge (so the wrong write can never be observed).
      </Panel>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Compensating conditional statements</h3>
      <p className="text-sm mb-2">
        Rule 1 also applies when the moved instruction is itself a branch. If <Code>if k&lt;0</Code> (originally{' '}
        <em>after</em> the split <Code>if m&lt;0</Code> in the trace) gets scheduled into the same cycle as{' '}
        <Code>m:=k+1</Code> — i.e. <em>before</em> its own guarding split — then the off-trace edge must receive a{' '}
        <strong>copy of the whole conditional</strong>, re-testing <Code>k&lt;0</Code> and branching to whichever of{' '}
        <Code>s:=−1</Code> / <Code>s:=0</Code> applies.
      </p>
      <Panel className="text-sm leading-relaxed">
        <Tag tone="warn">Remark</Tag>{' '}
        <span className="ml-1">
          After this copy, the test <Code>k&lt;0</Code> is performed <strong>unconditionally</strong> on every path —
          harmless for correctness (it's a pure comparison) but a reminder that compensation code can duplicate
          control flow, not just straight-line instructions.
        </span>
      </Panel>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Rules can cascade — code explosion</h3>
      <p className="text-sm mb-2">
        If a conditional must be copied onto a <em>join</em> edge (extended rule 2), every trace statement between
        the join point and that conditional that hasn't already been copied must be duplicated too, on the
        conditional's own off-trace edge — and if that duplicated block contains another such conditional, the
        process repeats. For a chain of <Code>n</Code> split/join pairs this can blow up quadratically:
      </p>
      <CodeExplosionDemo />
      <p className="text-xs text-muted-foreground mt-2">
        In practice this worst case is rare for real programs, and schedulers can be tuned (bounding how far
        instructions are allowed to move) to keep compensation code under control.
      </p>
    </div>
  </div>
)

/* ================================================================== *
 *  Tab 4 · Loop Scheduling / Software Pipelining (6.1.3)
 * ================================================================== */

const loopSteps = [
  {
    title: '① The loop and the machine',
    body: (
      <>
        <p className="mb-2">
          A VLIW processor with <strong>load/store</strong> (delay 2), <strong>integer</strong> (delay 1) and{' '}
          <strong>floating-point</strong> (delay 3) units, each present once. The loop body:
        </p>
        <Pre>{`10  lf   FR2, a(R1)
11  addf FR2, FR2, FR1
12  sf   FR2, b(R1)
13  addi R1, R1, 8
14  comp R1, R2
15  ble  10`}</Pre>
      </>
    ),
  },
  {
    title: '② A schedule that satisfies the timing rule — on paper',
    body: (
      <>
        <p className="mb-2">
          A schedule is a pair of tables: <Code>S[n]</Code> (cycle within the kernel) and <Code>I[n]</Code>{' '}
          (<em>iteration offset</em> — how many kernel repetitions later this copy of the instruction actually
          belongs to). One valid-looking assignment with kernel length 3:
        </p>
        <Table
          head={['instr', '10', '11', '12', '13', '14', '15']}
          rows={[
            ['S[n]', '0', '2', '2', '0', '1', '2'],
            ['I[n]', '0', '0', '1', '0', '0', '0'],
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Note <Code>I[12]=1</Code>: the store is pushed one whole kernel iteration later than the load/add that
          produced its value — that's how the model accounts for a delay (3) longer than the kernel itself (3, so
          exactly one iteration).
        </p>
      </>
    ),
  },
  {
    title: '③ Turning it into real code exposes a register conflict',
    body: (
      <>
        <p className="mb-2">Read naively as one VLIW instruction word per kernel cycle:</p>
        <Table
          head={['cycle', 'load/store unit', 'integer unit', 'floating-point unit']}
          rows={[
            ['1', 'lf FR2, a(R1)', 'addi R1, R1, 8', ''],
            ['2', '', 'comp R1, R2', ''],
            ['3', 'sf FR2, b(R1)', 'ble', 'addf FR2, FR2, FR1'],
          ]}
        />
        <p>
          <Bad>Bug:</Bad> <Code>sf FR2,b(R1)</Code> is meant to store the addf result from{' '}
          <strong>one iteration ago</strong> (<Code>I=1</Code>) — but by the time cycle 3 comes around again, this
          same physical register <Code>FR2</Code> has already been overwritten by the <em>current</em> iteration's{' '}
          <Code>lf</Code>/<Code>addf</Code>. The delay-3 pipeline needs its own storage, not a reused register.
        </p>
      </>
    ),
  },
  {
    title: '④ Fix: a fresh register carries the value across the boundary',
    body: (
      <>
        <p className="mb-2">
          Introduce <Code>FR3</Code> to hold the addf result while it's "in flight" for a whole extra iteration, and
          move the store into the following kernel iteration. Since <Code>R1</Code> keeps advancing by 8 every
          iteration, the store address must be adjusted back by <Code>2 × 8 = 16</Code>:
        </p>
        <Pre>{`k1  lf   FR2, a(R1)       addi R1, R1, 8
k2                        comp R1, R2
k3  sf   FR3, b(R1-16)    ble k1        addf FR3, FR2, FR1`}</Pre>
      </>
    ),
  },
  {
    title: '⑤ Prologue — priming the pipeline',
    body: (
      <>
        <p className="mb-2">
          The kernel now spans <Code>range(S) = max I[n] + 1 = 2</Code> iterations of the original loop, so{' '}
          <Code>range(S) − 1 = 1</Code> prologue iteration is needed before the kernel can safely start (there is no
          "previous" store to issue yet):
        </p>
        <Pre>{`    lw R1, 0
    lw R2, 400
    lf FR1, c
p1  lf FR2, a(R1)         addi R1, R1, 8
p2                        comp R1, R2
p3                        beq e1        addf FR3, FR2, FR1`}</Pre>
        <p className="text-xs text-muted-foreground">
          <Code>beq e1</Code> guards against a loop that has too few iterations to ever reach a full kernel pass — it
          skips straight to the epilogue.
        </p>
      </>
    ),
  },
  {
    title: '⑥ Epilogue — draining the pipeline',
    body: (
      <>
        <p className="mb-2">
          After the kernel loop exits, the last iteration's addf result is still waiting to be stored — the epilogue
          finishes that one delayed write:
        </p>
        <Pre>{`e1  nop
e2  nop
e3  sf FR3, b-8(R1)`}</Pre>
      </>
    ),
  },
  {
    title: '⑦ The full pipelined program',
    body: (
      <>
        <Pre>{`    lw R1, 0
    lw R2, 400
    lf FR1, c
p1  lf FR2, a(R1)         addi R1, R1, 8
p2                        comp R1, R2
p3                        beq e1        addf FR3, FR2, FR1
k1  lf FR2, a(R1)         addi R1, R1, 8
k2                        comp R1, R2
k3  sf FR3, b-16(R1)      ble k1        addf FR3, FR2, FR1
e1  nop
e2  nop
e3  sf FR3, b-8(R1)`}</Pre>
        <p className="text-sm">
          This is optimal for this machine: the integer unit issues an instruction in <strong>every</strong> kernel
          cycle, so the kernel can't be shortened below 3 cycles without adding another integer unit.
        </p>
      </>
    ),
  },
]

/* ---- step-by-step trace of loop_schedule() on the 3-int/2-ls loop - */

const loopSchedIds = ['10', '11', '12', '13', '14']

const loopSchedStepsMeta: AlgoStep[] = [
  {
    title: 'Setup — topological order & target length',
    facts: [
      <>Topological order: 10 → 11 → 12 → 13 → 14 (a simple chain)</>,
      <>Target kernel length L = 1 (the resource bound computed above)</>,
      <>All delays = 1</>,
    ],
  },
  {
    title: '10 — lw a, x(i)',
    facts: [<>No predecessors → earlyS=0, earlyI=0</>, <>First free load/store unit is at cycle 0 → S[10]=0</>, <>co(0) is not &lt; earlyS(0) → I[10]=0</>],
  },
  {
    title: '11 — addi a,a,1',
    facts: [
      <>predecessor 10: thisS = S[10]+delay = 0+1 = 1, thisI=0</>,
      <>thisS(1) ≥ L(1) → wraps: thisI += 1÷1 = 1, thisS %= 1 = 0</>,
      <>earlyS=0, earlyI=1 → free integer unit at cycle 0 → S[11]=0, I[11]=1</>,
    ],
  },
  {
    title: '12 — addi a,a,1',
    facts: [<>predecessor 11: thisS=0+1=1 ≥ L(1) → thisI = I[11]+1 = 2, thisS=0</>, <>free integer unit at cycle 0 (2nd of 3) → S[12]=0, I[12]=2</>],
  },
  {
    title: '13 — addi a,a,1',
    facts: [<>predecessor 12: thisS=0+1=1 ≥ L(1) → thisI = I[12]+1 = 3, thisS=0</>, <>free integer unit at cycle 0 (3rd of 3) → S[13]=0, I[13]=3</>],
  },
  {
    title: '14 — sw a, x(i)',
    facts: [<>predecessor 13: thisS=0+1=1 ≥ L(1) → thisI = I[13]+1 = 4, thisS=0</>, <>free load/store unit at cycle 0 (2nd of 2) → S[14]=0, I[14]=4</>],
  },
  {
    title: 'Result',
    facts: [<>S = [0,0,0,0,0], I = [0,1,2,3,4] for instructions 10..14</>],
    note: <>Every unit is busy at cycle 0 with a different loop iteration — that's why each needs its own register.</>,
  },
]

const loopSchedSI: { S: (number | null)[]; I: (number | null)[] }[] = [
  { S: [null, null, null, null, null], I: [null, null, null, null, null] },
  { S: [0, null, null, null, null], I: [0, null, null, null, null] },
  { S: [0, 0, null, null, null], I: [0, 1, null, null, null] },
  { S: [0, 0, 0, null, null], I: [0, 1, 2, null, null] },
  { S: [0, 0, 0, 0, null], I: [0, 1, 2, 3, null] },
  { S: [0, 0, 0, 0, 0], I: [0, 1, 2, 3, 4] },
  { S: [0, 0, 0, 0, 0], I: [0, 1, 2, 3, 4] },
]

const LoopScheduleWalkthrough: React.FC = () => (
  <AlgoStepper
    steps={loopSchedStepsMeta}
    rightLabel="S[ ] / I[ ] so far"
    right={(i) => {
      const d = loopSchedSI[i]
      return (
        <Table
          head={['', ...loopSchedIds]}
          rows={[
            ['S[n]', ...d.S.map((v) => (v === null ? '—' : String(v)))],
            ['I[n]', ...d.I.map((v) => (v === null ? '—' : String(v)))],
          ]}
        />
      )
    }}
  />
)

/* ---- step-by-step trace of kernel_schedule()'s reject-and-retry ---- */

const kernelStepsMeta: AlgoStep[] = [
  {
    title: 'Setup — a loop-carried recurrence',
    facts: [
      <>n1: add S,S,X — n2: add S,S,Y, forming the cycle n1→n2 (cross=0, same iteration) and n2→n1 (cross=1, loop-carried)</>,
      <>Resource bound: 2 add-type instructions ÷ 2 add units = 1</>,
    ],
    tags: [{ label: 'try', items: ['L = 1'], tone: 'warn' }],
    note: <>Starting naively from just the resource bound, ignoring the cycle for now.</>,
  },
  {
    title: 'Attempt L=1 — run loop_schedule(G0, 1)',
    facts: [
      <>G0 removes the closing edge n2→n1, leaving just n1→n2</>,
      <>n1: no predecessors → S[n1]=0, I[n1]=0</>,
      <>n2: thisS=S[n1]+1=1 ≥ L(1) → thisI += 1 = 1, thisS=0 → S[n2]=0, I[n2]=1</>,
    ],
  },
  {
    title: 'Check the closed cycle',
    facts: [<>n2 lies on the cycle n1→n2→n1, and I[n2]=1 &gt; 0</>],
    tags: [{ label: 'verdict', items: ['REJECT'], tone: 'bad' }],
    note: <>kernel_schedule() requires every instruction on a dependence cycle to stay at iteration offset 0 — retry with a larger L.</>,
  },
  {
    title: 'Retry at L=2',
    facts: [
      <>n1: same as before → S[n1]=0, I[n1]=0</>,
      <>n2: thisS=1, and now 1 &lt; L(2) → no wraparound, earlyS=1</>,
      <>free add unit at cycle 1 → S[n2]=1, I[n2]=0</>,
    ],
  },
  {
    title: 'Check the closed cycle again',
    facts: [<>Both n1 and n2 now have I=0</>, <>n2 finishes at S[n2]+delay=1+1=2=L — exactly in time for n1's next iteration</>],
    tags: [{ label: 'verdict', items: ['ACCEPT'], tone: 'good' }],
  },
  {
    title: 'Result',
    facts: [<>Final kernel length Lk=2; S=[n1:0, n2:1]; I=[n1:0, n2:0]</>],
    note: (
      <>
        The resource bound (1) alone was too optimistic. The loop-carried recurrence forces Z(cycle) =
        (delay(n1)+delay(n2)) ÷ cross(n2,n1) = 2 ÷ 1 = 2 — exactly the length kernel_schedule() converges to by
        trial.
      </>
    ),
  },
]

const kernelRight: { L: number; rows: { instr: string; S: number | null; I: number | null }[]; verdict?: 'REJECT' | 'ACCEPT' }[] = [
  {
    L: 1,
    rows: [
      { instr: 'n1', S: null, I: null },
      { instr: 'n2', S: null, I: null },
    ],
  },
  {
    L: 1,
    rows: [
      { instr: 'n1', S: 0, I: 0 },
      { instr: 'n2', S: 0, I: 1 },
    ],
  },
  {
    L: 1,
    rows: [
      { instr: 'n1', S: 0, I: 0 },
      { instr: 'n2', S: 0, I: 1 },
    ],
    verdict: 'REJECT',
  },
  {
    L: 2,
    rows: [
      { instr: 'n1', S: 0, I: 0 },
      { instr: 'n2', S: 1, I: 0 },
    ],
  },
  {
    L: 2,
    rows: [
      { instr: 'n1', S: 0, I: 0 },
      { instr: 'n2', S: 1, I: 0 },
    ],
    verdict: 'ACCEPT',
  },
  {
    L: 2,
    rows: [
      { instr: 'n1', S: 0, I: 0 },
      { instr: 'n2', S: 1, I: 0 },
    ],
    verdict: 'ACCEPT',
  },
]

const KernelScheduleWalkthrough: React.FC = () => (
  <AlgoStepper
    steps={kernelStepsMeta}
    rightLabel="current attempt"
    right={(i) => {
      const d = kernelRight[i]
      return (
        <div>
          <div className="text-xs font-mono mb-2">L = {d.L}</div>
          <Table head={['instr', 'S', 'I']} rows={d.rows.map((r) => [r.instr, r.S === null ? '—' : String(r.S), r.I === null ? '—' : String(r.I)])} />
          {d.verdict && (
            <div className="mt-2">
              <Tag tone={d.verdict === 'ACCEPT' ? 'good' : 'bad'}>{d.verdict}</Tag>
            </div>
          )}
        </div>
      )
    }}
  />
)

const LoopSchedulingSection: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">6.1.3 Instruction scheduling for loops</h3>
      <p className="text-sm mb-2">
        Naively, one could unroll a loop and list-schedule the result — but that hides parallelism{' '}
        <em>between</em> iterations. The alternative, <strong>kernel scheduling</strong>, splits a loop into three
        parts and optimizes the one that matters most:
      </p>
      <Table
        head={['Part', 'Runs...', 'Optimization target']}
        rows={[
          [<strong>kernel</strong>, <>every iteration, once a steady state is reached</>, <Good>minimize — executed the most</Good>],
          [<strong>prologue</strong>, <>before the steady state is reached</>, <>keep reasonably short</>],
          [<strong>epilogue</strong>, <>after the kernel finishes</>, <>keep reasonably short</>],
        ]}
      />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Dependence graph with iteration crossing</h3>
      <p className="text-sm mb-2">
        The dependence graph gains one more label: <Code>cross(n₁,n₂)</Code> — how many loop iterations a dependence{' '}
        <Code>n₁→n₂</Code> spans (0 for a dependence within the same iteration).
      </p>
      <p className="text-sm mb-1">A schedule is the pair <Code>(S, I)</Code> — cycle and iteration offset — satisfying:</p>
      <Formula>{`S[n1] + delay(n1)  ≤  S[n2] + (I[n2] − I[n1] + cross(n1,n2)) · Lk(S)`}</Formula>
      <Formula>{`Lk(S) = maxₙ S[n]                              (kernel length)
L(S)  = N · Lk(S) + maxₙ( S[n] + delay(n) + (I[n]−1)·Lk(S) )   (N iterations)`}</Formula>
      <p className="text-sm">
        For large <Code>N</Code>, <Code>L(S)</Code> is dominated by <Code>Lk(S)</Code> — so kernel scheduling
        minimizes the <strong>kernel length</strong> above everything else.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Lower bounds on the kernel length</h3>
      <p className="text-sm mb-2">
        Resources alone give a lower bound: if <Code>#t</Code> instructions of type <Code>t</Code> run per iteration
        and there are <Code>m</Code>
        <sub>t</sub> units of that type,
      </p>
      <Formula>{`Lk(S)  ≥  maxₜ ⌈ #t / mt ⌉`}</Formula>
      <p className="text-sm mb-2">
        A <strong>cyclic</strong> dependence <Code>c = (n₁,…,nₖ)</Code> can force the bound even higher — one full
        traversal of the cycle costs <Code>Σ delay(nᵢ)</Code> cycles but only advances{' '}
        <Code>Σ cross(nᵢ,nᵢ₊₁)</Code> iterations, giving a minimum cycles-per-iteration <strong>slope</strong>:
      </p>
      <Formula>{`Z(c) = Σᵢ₌₁..ₖ delay(nᵢ)  /  Σᵢ₌₁..ₖ₋₁ cross(nᵢ,nᵢ₊₁)

Lk(S)  ≥  max( maxₜ ⌈#t/mt⌉ ,  max over all cycles c of Z(c) )`}</Formula>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Worked example — building a pipelined loop step by step</h3>
      <Stepper steps={loopSteps.map((s) => ({ title: s.title, body: s.body }))} showProgress />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">The loop_schedule() algorithm</h3>
      <p className="text-sm mb-2">
        A greedy, topological-order pass builds <Code>(S,I)</Code> directly for a target kernel length <Code>L</Code>{' '}
        (a resource lower bound to start with): each instruction is placed as early as its predecessors allow,
        wrapping around into the next iteration (incrementing <Code>I</Code>) whenever it would otherwise exceed{' '}
        <Code>L</Code>.
      </p>
      <Pre>{`procedure loop_schedule (Graph G, int L, Schedule S, It_Offset I) {
  topologically sort G;
  for each (x in topological order) {
    earlyS = 0; earlyI = 0;
    for each (predecessor y of x) {
      thisS = S[y] + delay(y); thisI = I[y];
      if (thisS >= L) { thisI += thisS / L; thisS %= L; }
      if (thisI > earlyI || thisS > earlyS) { earlyI = thisI; earlyS = thisS; }
    }
    find the first cycle co ≥ earlyS (wrapping if necessary) with a free unit for x;
    S[x] = co;
    I[x] = (co < earlyS) ? earlyI + 1 : earlyI;
  }
}`}</Pre>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Watch loop_schedule() run, instruction by instruction</h3>
      <p className="text-sm mb-2">
        A resource bound of <Code>Lk = 1</Code> looks achievable for this loop body (3 <Code>addi</Code>s exactly fill
        3 integer units, 1 load + 1 store fit 2 load/store units):
      </p>
      <Pre>{`10  lw   a, x(i)
11  addi a, a, 1
12  addi a, a, 1
13  addi a, a, 1
14  sw   a, x(i)`}</Pre>
      <p className="text-sm mb-3">
        Step through <Code>loop_schedule()</Code> at <Code>L = 1</Code> and watch every <Code>S[n]</Code>/
        <Code>I[n]</Code> pair get computed from <Code>earlyS</Code>/<Code>earlyI</Code>:
      </p>
      <LoopScheduleWalkthrough />
      <p className="text-sm mt-4 mb-2">
        Every unit ends up busy every cycle with a <strong>different</strong> loop iteration at once — meaning each
        unit needs its own private register for <Code>a</Code>, or the parallel iterations would clobber each other:
      </p>
      <Pre>{`10  lw   a, x(i)
11  addi b, a, 1
12  addi c, b, 1
13  addi d, c, 1
14  sw   d, x(i)`}</Pre>
      <p className="text-xs text-muted-foreground">
        This is the same lesson as the register-pressure example in the overview tab, now at the scale of an entire
        pipelined loop: exploiting the resource-optimal kernel length can require as many extra registers as there
        are pipeline stages.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">kernel_schedule() — searching for a valid length</h3>
      <p className="text-sm mb-2">
        <Code>loop_schedule()</Code> alone doesn't guarantee a schedule that respects cyclic dependences.{' '}
        <Code>kernel_schedule()</Code> wraps it: start at the lower bound <Code>LB</Code>, try{' '}
        <Code>loop_schedule()</Code>, and reject the result if it pushed any instruction on a dependence cycle into a
        later iteration (<Code>I[v] &gt; 0</Code>) or made the cycle's last instruction finish too late for the
        cycle's first instruction next time around — in either case, retry with a larger <Code>L</Code>.
      </p>
      <Pre>{`procedure kernel_schedule (Graph G, Schedule S, It_Offset I) {
  let c = cycle with maximum slope Z(c);
  LB = max( Z(c), maxt⌈#t/mt⌉ );
  G0 = G with the "last instruction → first instruction" edge removed from every cycle;
  for (L = LB; L <= N; L++) {
    loop_schedule(G0, L, S, I);
    if (every dependence cycle still closes correctly within length L) return;   // accept
    // else try the next L
  }
}`}</Pre>
      <p className="text-xs text-muted-foreground mb-3">
        Termination is guaranteed: a schedule of length <Code>N</Code> (the original instruction count) is always
        valid in the worst case.
      </p>
      <p className="text-sm mb-3">
        A small loop-carried recurrence shows exactly why the reject-and-retry loop exists — the resource bound alone
        can be too optimistic once a dependence cycle is involved:
      </p>
      <KernelScheduleWalkthrough />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Drawback: register pressure</h3>
      <p className="text-sm">
        Pipelining loop iterations keeps several iterations "in flight" simultaneously — as the last two examples
        showed, that can require far more live registers than the unpipelined loop. If the target machine doesn't
        have enough registers, values must be spilled to memory, adding cycles that eat into the gains software
        pipelining was supposed to deliver.
      </p>
    </div>
  </div>
)

/* ================================================================== *
 *  Tab 5 · Questions  (exactly 5, easy → hardest, Q1 fully worked)
 * ================================================================== */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on §6.1, easy → hardest. Q1 is fully worked to set the pattern. Try each on paper
      first, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Hand-execute list_schedule() on a VLIW with 2 load units"
      statement={
        <>
          <p className="mb-2">
            Machine: 2 load units (delay 2), 1 add unit (delay 1), 1 store unit (delay 1). Instructions:
          </p>
          <Pre>{`n1  load R1, A
n2  load R2, B
n3  add  R3, R1, R2
n4  store X, R3
n5  load R4, C
n6  load R5, D
n7  add  R6, R4, R5
n8  store Y, R6`}</Pre>
          <p className="mt-2">
            Dependences: <Code>n1,n2 → n3 → n4</Code> and <Code>n5,n6 → n7 → n8</Code>. Run{' '}
            <Code>list_schedule()</Code> by hand, cycle by cycle, and give the final schedule.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>Cycle 1:</strong> ready = {'{n1, n2, n5, n6}'} — four independent loads, but only 2 load units.
            Pick any two, say <Code>n1</Code> and <Code>n5</Code>; <Code>n2</Code>, <Code>n6</Code> are pushed to the
            next cycle (no free unit this cycle).
          </p>
          <p className="text-sm mb-1">
            <strong>Cycle 2:</strong> both load units are free again, so <Code>n2</Code> and <Code>n6</Code> both
            issue now.
          </p>
          <p className="text-sm mb-1">
            <strong>Cycle 3:</strong> nothing is ready yet — <Code>n3</Code> needs <Code>R2</Code>, ready only at
            cycle 2+2=4 (an <Code>n1</Code>/<Code>n5</Code> issued cycle 1, ready at cycle 3, but their partner
            register isn't). A bubble cycle.
          </p>
          <p className="text-sm mb-1">
            <strong>Cycle 4:</strong> both <Code>n3</Code> and <Code>n7</Code> become ready (their operands are ready
            at cycle 4) — but there is only <strong>one</strong> add unit. Schedule <Code>n3</Code>;{' '}
            <Code>n7</Code> is deferred.
          </p>
          <p className="text-sm mb-1">
            <strong>Cycle 5:</strong> <Code>n4</Code> becomes ready (R3 ready at cycle 4+1=5) — a <em>store</em>, so
            it doesn't conflict with the deferred <Code>n7</Code> — an <em>add</em>. Both issue together.
          </p>
          <p className="text-sm mb-1">
            <strong>Cycle 6:</strong> <Code>n8</Code> becomes ready (R6 ready at cycle 5+1=6) and issues alone.
          </p>
          <Table
            head={['cycle', 'load/store slot 1', 'load/store slot 2']}
            rows={[
              ['1', 'load R1, A', 'load R4, C'],
              ['2', 'load R2, B', 'load R5, D'],
              ['3', 'delay', 'delay'],
              ['4', 'add R3, R1, R2', 'delay'],
              ['5', 'store X, R3', 'add R6, R4, R5'],
              ['6', '(empty)', 'store Y, R6'],
            ]}
          />
          <Good>Total: 6 cycles</Good> — exactly the table from the overview tab. The two "delay" bubbles and the
          extra wait for <Code>n7</Code> both come directly from resource limits (2 load units, 1 add unit), not from
          any data dependence that isn't already shown.
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Cycle-by-cycle issue times under a fixed delay"
      statement={
        <>
          <p className="mb-2">
            Single-issue, in-order processor; <Code>load</Code>/<Code>add</Code> results are readable 2 cycles after
            they issue (delay 2, no functional-unit limits beyond one issue slot per cycle). For the naive-order
            sequence
          </p>
          <Pre>{`load R1, A
load R2, B
add  R3, R1, R2
store X, R3
load R4, C
add  R5, R3, R4
store Y, R5`}</Pre>
          <p className="mt-2">give the issue cycle of every instruction and the total number of cycles.</p>
        </>
      }
      solution={
        <>
          <Table
            head={['instr', 'earliest operand ready', 'issue cycle']}
            rows={[
              ['load R1,A', '—', '1'],
              ['load R2,B', '—', '2'],
              ['add R3,R1,R2', 'R1@3, R2@4 → 4', '4'],
              ['store X,R3', 'R3@6', '6'],
              ['load R4,C', '—', '7'],
              ['add R5,R3,R4', 'R3@6, R4@9 → 9', '9'],
              ['store Y,R5', 'R5@11', '11'],
            ]}
          />
          <p className="text-sm">
            <Good>Total: 11 cycles.</Good> Each instruction issues at{' '}
            <Code>max(previous issue + 1, latest operand-ready time)</Code> — three stalls appear (before the first{' '}
            <Code>add</Code>, before the first <Code>store</Code>, and before the second <Code>add</Code>) because
            every instruction is waiting directly on the one right before it.
          </p>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Apply HLF to a one-multiplier chain"
      statement={
        <>
          <p className="mb-2">
            One multiplication unit, unlimited add units, delay = 1 for every instruction:
          </p>
          <Pre>{`(1) mult c, a, b
(2) mult f, d, e
(3) add  f, f, g
(4) add  f, f, h
(5) add  f, f, c`}</Pre>
          <p className="mt-2">
            Dependences: <Code>(2)→(3)→(4)→(5)</Code> and <Code>(1)→(5)</Code>. (a) Compute{' '}
            <Code>remaining[n]</Code> for all five instructions via backward traversal. (b) Which instruction should
            HLF schedule first, and what total length results? (c) What total length results from scheduling the
            other one first instead?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> Backward from the sinks: <Code>remaining[5] = delay(5) = 1</Code>.{' '}
            <Code>remaining[4] = max(delay(4), remaining[5]+delay(4)) = max(1, 1+1) = 2</Code>.{' '}
            <Code>remaining[3] = max(1, remaining[4]+1) = 3</Code>.{' '}
            <Code>remaining[2] = max(1, remaining[3]+1) = 4</Code>.{' '}
            <Code>remaining[1] = max(1, remaining[5]+1) = 2</Code> (via the edge <Code>(1)→(5)</Code>).
          </p>
          <p className="text-sm mb-1">
            <strong>(b)</strong> <Code>remaining[2]=4 &gt; remaining[1]=2</Code>, so HLF schedules (2) first: cycle 1{' '}
            <Code>(2)</Code>, cycle 2 <Code>(1)</Code> and <Code>(3)</Code> (parallel — different units, (3)'s
            operand ready at 1+1=2), cycle 3 <Code>(4)</Code>, cycle 4 <Code>(5)</Code> (needs (4) ready at 3+1=4 and
            (1) ready at 2+1=3 → issues at 4). <Good>Total length = 5</Good> (instruction (5) finishes at 4+1=5).
          </p>
          <p className="text-sm mb-1">
            <strong>(c)</strong> Scheduling (1) first: cycle 1 <Code>(1)</Code>, cycle 2 <Code>(2)</Code> (mult unit
            was busy in cycle 1), cycle 3 <Code>(3)</Code> (needs (2) ready at 2+1=3), cycle 4 <Code>(4)</Code>,
            cycle 5 <Code>(5)</Code> (needs (4) ready at 4+1=5). <Bad>Total length = 6</Bad> — one cycle worse, purely
            because (2) sits on the longer critical chain and got delayed for no benefit.
          </p>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Apply compensation rule 1 to a hoisted branch"
      statement={
        <>
          <p className="mb-2">
            Trace order: <Code>x := p+1</Code>, <Code>y := 2·x</Code>, <Code>z := p−1</Code>, then split on{' '}
            <Code>if q &gt; 0</Code> — on-trace to <Code>w := z+3</Code>, off-trace to <Code>w := z+4</Code>. The
            scheduler produces:
          </p>
          <Table
            head={['cycle', 'slot 1', 'slot 2']}
            rows={[
              ['1', 'if q > 0', 'z := p−1'],
              ['2', 'x := p+1', 'w := z+3  (on-trace)'],
              ['3', 'y := 2·x', ''],
            ]}
          />
          <p className="mt-2">
            (a) Identify the split node, the on-trace edge, and the off-trace edge. (b) Which instructions must be
            copied onto the off-trace edge, and in what order? (c) Give the corrected off-trace instruction sequence
            (ending in the original off-trace instruction).
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> The split node is <Code>if q &gt; 0</Code>. The on-trace edge leads to{' '}
            <Code>w := z+3</Code>; the off-trace edge leads to <Code>w := z+4</Code>.
          </p>
          <p className="text-sm mb-1">
            <strong>(b)</strong> In the original trace, <Code>x:=p+1</Code> and <Code>y:=2·x</Code> both come{' '}
            <strong>before</strong> the split — but the schedule places them at cycles 2 and 3, <strong>after</strong>{' '}
            the branch (cycle 1). <Code>z:=p−1</Code> is also before the split in the trace but stays scheduled at
            cycle 1, alongside the branch, so it does <em>not</em> need a compensation copy — it already executes on
            every path (it's paired with the branch itself, at the same cycle). Only <Code>x:=p+1</Code> and{' '}
            <Code>y:=2·x</Code> must be copied, in their original trace order.
          </p>
          <p className="text-sm mb-1">
            <strong>(c)</strong> Off-trace edge, corrected:
          </p>
          <Pre>{`x := p+1
y := 2·x
w := z+4`}</Pre>
          <Panel className="text-sm leading-relaxed">
            <Good>Why order matters:</Good> compensation rule 1 requires the copies to preserve their{' '}
            <strong>original trace order</strong> — copying <Code>y:=2·x</Code> before <Code>x:=p+1</Code> would read{' '}
            <Code>x</Code> before it's redefined on this path and silently use a stale/undefined value.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Diagnose and fix a software-pipelined kernel"
      statement={
        <>
          <p className="mb-2">
            Machine: 1 load/store unit (delay 2), 1 floating-point unit (delay 3), 1 integer unit (delay 1). Loop
            body:
          </p>
          <Pre>{`10  lf   FR2, a(R1)
11  mulf FR2, FR2, FR1
12  sf   FR2, b(R1)
13  addi R1, R1, 4
14  ble  10`}</Pre>
          <p className="mt-2">
            A student proposes the schedule <Code>S = (0,0,0,0,0)</Code>, <Code>I = (0,0,0,0,0)</Code> for
            instructions 10–14 (i.e., everything crammed into cycle 0 of a length-1 kernel, no iteration offset). (a)
            Using the correctness condition <Code>S[n1]+delay(n1) ≤ S[n2]+(I[n2]−I[n1]+cross(n1,n2))·Lk(S)</Code>,
            show this schedule is illegal for the <Code>10→11</Code> and <Code>11→12</Code> dependences (both{' '}
            <Code>cross = 0</Code>, same-iteration dependences). (b) Compute the resource-based lower bound{' '}
            <Code>maxₜ⌈#t/mt⌉</Code> for this loop and machine. (c) Propose valid <Code>(S,I)</Code> values (kernel
            length, per-instruction cycle and iteration offset) that respect every dependence, and state which
            register(s) must be renamed and why.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a)</strong> For <Code>10→11</Code> with <Code>S[10]=S[11]=0</Code>, <Code>I[10]=I[11]=0</Code>,{' '}
            <Code>cross=0</Code>, <Code>delay(10)=2</Code>: the condition needs{' '}
            <Code>0+2 ≤ 0+(0−0+0)·Lk = 0</Code> — false. Same for <Code>11→12</Code> with <Code>delay(11)=3</Code>:{' '}
            <Code>0+3 ≤ 0</Code> — also false. Cramming dependent instructions into the same cycle ignores their
            delays entirely; this "schedule" is not correct at any kernel length ≥ 1 unless the offending
            instructions are pushed later (in cycle or in iteration).
          </p>
          <p className="text-sm mb-1">
            <strong>(b)</strong> Per iteration: 1 load/store-type instruction of each of <Code>lf</Code>/<Code>sf</Code>{' '}
            (2 total, sharing 1 load/store unit) → <Code>⌈2/1⌉=2</Code>; 1 floating-point instruction, 1 unit →{' '}
            <Code>⌈1/1⌉=1</Code>; 1 integer instruction (<Code>addi</Code>; <Code>ble</Code> is control flow, assume
            it doesn't occupy the integer unit), 1 unit → <Code>⌈1/1⌉=1</Code>. Lower bound ={' '}
            <Code>max(2,1,1) = 2</Code>.
          </p>
          <p className="text-sm mb-1">
            <strong>(c)</strong> A length-2 kernel that respects every delay, e.g.: <Code>S[10]=0, I[10]=0</Code>{' '}
            (<Code>lf</Code>); <Code>S[11]=0, I[11]=1</Code> (<Code>mulf</Code> on the <em>previous</em> iteration's
            load — delay 2 satisfied since <Code>0+2 ≤ 0+(1−0+0)·2=2</Code>); <Code>S[12]=1, I[12]=2</Code> (
            <Code>sf</Code>, two iterations behind the <Code>mulf</Code> that fed it — delay 3 satisfied since{' '}
            <Code>0+3 ≤ 1+(2−1+0)·2=3</Code>); <Code>S[13]=1, I[13]=0</Code> (<Code>addi</Code>, same iteration);{' '}
            <Code>S[14]=1, I[14]=0</Code> (<Code>ble</Code>). Because the <Code>lf</Code> result must stay alive for
            2 kernel iterations before <Code>mulf</Code> consumes it, and the <Code>mulf</Code> result for 2 more
            before <Code>sf</Code> stores it, <strong>each in-flight value needs its own register</strong> — a
            single reused <Code>FR2</Code> would be overwritten by newer iterations' loads long before the older
            value is actually stored, exactly as in the worked lf/addf/sf example. A prologue of{' '}
            <Code>range(S)−1 = 2</Code> iterations is needed before the kernel, and a matching 2-iteration epilogue
            after it.
          </p>
        </>
      }
    />
  </div>
)

/* ================================================================== *
 *  Root
 * ================================================================== */

const tabs: TabDef[] = [
  { id: 'overview', label: 'Overview & machine model', render: () => <OverviewSection /> },
  { id: 'list', label: 'List scheduling (6.1.1)', render: () => <ListSchedulingSection /> },
  { id: 'trace', label: 'Trace scheduling (6.1.2)', render: () => <TraceSchedulingSection /> },
  { id: 'loops', label: 'Loops & pipelining (6.1.3)', render: () => <LoopSchedulingSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function InstructionSchedulingStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 6 · §6.1 · Instruction Scheduling"
      title="Instruction Scheduling"
      subtitle="Mapping machine instructions onto functional units: static (VLIW) vs. dynamic (superscalar) scheduling, the formal machine model, list scheduling with the highest-level-first heuristic, trace scheduling with its compensation-code rules, and loop scheduling via software pipelining (kernel / prologue / epilogue)."
      tabs={tabs}
    />
  )
}
