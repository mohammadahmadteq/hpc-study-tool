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
  Tag,
  QuestionCard,
  StudyShell,
  FlowGraph,
  type Fill,
  type GNode,
  type GEdge,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 8 · Register allocation and corresponding transformations
 *  (PDF 392–407)
 *  8.1 local allocation in a basic block — Sethi–Ullman labeling +
 *      gencode() with a register stack and memory spilling;
 *  8.2 global allocation — live variables, the interference graph,
 *      k-coloring via simplify/spill, and scalar replacement.
 * ------------------------------------------------------------------ */

const pill = (active: boolean) =>
  cn(
    'text-[12px] px-2.5 py-1 rounded-full border transition-colors',
    active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
  )

/* ================================================================== *
 *  Shared expression tree for §8.1
 *    x = ((a·b) + (c·d)) − ((e−f) · (g + (h·k)))
 *  Chosen so the root needs FOUR registers (one more than the PDF
 *  example) and so a machine with r = 3 registers is forced to spill.
 * ================================================================== */

interface TNode {
  id: string
  x: number
  y: number
  label: string // operator symbol, or the variable name for a leaf
  need: number // Sethi–Ullman register need (the label value)
}

const TREE: TNode[] = [
  { id: 'root', x: 272, y: 30, label: '−', need: 4 },
  { id: 'L', x: 132, y: 104, label: '+', need: 3 },
  { id: 'Rs', x: 412, y: 104, label: '×', need: 3 },
  { id: 'P1', x: 74, y: 184, label: '×', need: 2 },
  { id: 'P2', x: 192, y: 184, label: '×', need: 2 },
  { id: 'P3', x: 330, y: 184, label: '−', need: 2 },
  { id: 'R2', x: 486, y: 184, label: '+', need: 2 },
  { id: 'a', x: 44, y: 262, label: 'a', need: 1 },
  { id: 'b', x: 104, y: 262, label: 'b', need: 1 },
  { id: 'c', x: 162, y: 262, label: 'c', need: 1 },
  { id: 'd', x: 222, y: 262, label: 'd', need: 1 },
  { id: 'e', x: 300, y: 262, label: 'e', need: 1 },
  { id: 'f', x: 360, y: 262, label: 'f', need: 1 },
  { id: 'g', x: 432, y: 262, label: 'g', need: 1 },
  { id: 'Q', x: 538, y: 262, label: '×', need: 2 },
  { id: 'h', x: 510, y: 336, label: 'h', need: 1 },
  { id: 'k', x: 566, y: 336, label: 'k', need: 1 },
]

const TREE_EDGES: GEdge[] = [
  { from: 'root', to: 'L' },
  { from: 'root', to: 'Rs' },
  { from: 'L', to: 'P1' },
  { from: 'L', to: 'P2' },
  { from: 'P1', to: 'a' },
  { from: 'P1', to: 'b' },
  { from: 'P2', to: 'c' },
  { from: 'P2', to: 'd' },
  { from: 'Rs', to: 'P3' },
  { from: 'Rs', to: 'R2' },
  { from: 'P3', to: 'e' },
  { from: 'P3', to: 'f' },
  { from: 'R2', to: 'g' },
  { from: 'R2', to: 'Q' },
  { from: 'Q', to: 'h' },
  { from: 'Q', to: 'k' },
]

const ALL_IDS = TREE.map((n) => n.id)

/** Render the expression tree. `labeled` nodes show their register need
 *  as a subscript; `active` nodes are highlighted. */
function renderTree(labeled: Set<string>, active: Set<string>) {
  const nodes: GNode[] = TREE.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    label: n.label,
    sub: labeled.has(n.id) ? `r${n.need}` : undefined,
  }))
  const fillOf = (id: string): Fill => (active.has(id) ? 'active' : labeled.has(id) ? 'none' : 'dim')
  return <FlowGraph nodes={nodes} edges={TREE_EDGES} width={610} height={378} fillOf={fillOf} maxW={560} />
}

/* ---- Tab 2 · the labeling walk ------------------------------------ */

interface LabelStep {
  title: string
  rule: React.ReactNode
  active: string[]
  labeledAfter: string[]
}

const LEAVES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'k']

const labelSteps: LabelStep[] = [
  {
    title: 'Phase 1 — every leaf gets label 1',
    rule: (
      <>
        A leaf is a variable that must be <strong>loaded into a register</strong>, so it needs exactly one register:{' '}
        <Code>label(leaf) = 1</Code>.
      </>
    ),
    active: LEAVES,
    labeledAfter: LEAVES,
  },
  {
    title: 'a · b  →  label 2',
    rule: (
      <>
        Both children carry <Code>1</Code>. When the two child labels are <strong>equal</strong>, the parent needs one{' '}
        <em>extra</em> register to hold the first result while the second is computed:{' '}
        <Code>label = label(n₁) + 1 = 2</Code>.
      </>
    ),
    active: ['P1'],
    labeledAfter: [...LEAVES, 'P1'],
  },
  {
    title: 'c · d  →  label 2',
    rule: (
      <>
        Same shape as <Code>a·b</Code>: two equal labels of 1 → <Code>1 + 1 = 2</Code>.
      </>
    ),
    active: ['P2'],
    labeledAfter: [...LEAVES, 'P1', 'P2'],
  },
  {
    title: 'e − f  →  label 2',
    rule: <>Two equal leaf labels again → <Code>2</Code>. The operator (− vs ·) is irrelevant to the register need.</>,
    active: ['P3'],
    labeledAfter: [...LEAVES, 'P1', 'P2', 'P3'],
  },
  {
    title: 'h · k  →  label 2',
    rule: <>Equal children → <Code>2</Code>.</>,
    active: ['Q'],
    labeledAfter: [...LEAVES, 'P1', 'P2', 'P3', 'Q'],
  },
  {
    title: 'g + (h·k)  →  label 2   (the max rule)',
    rule: (
      <>
        Now the children <strong>differ</strong>: <Code>label(g) = 1</Code>, <Code>label(h·k) = 2</Code>. Evaluate the
        heavier child first and reuse its registers — no extra register is needed, so{' '}
        <Code>label = max(1, 2) = 2</Code>.
      </>
    ),
    active: ['R2'],
    labeledAfter: [...LEAVES, 'P1', 'P2', 'P3', 'Q', 'R2'],
  },
  {
    title: '(a·b) + (c·d)  →  label 3',
    rule: (
      <>
        Two equal labels of <Code>2</Code> → <Code>2 + 1 = 3</Code>. This whole left subtree needs three registers.
      </>
    ),
    active: ['L'],
    labeledAfter: [...LEAVES, 'P1', 'P2', 'P3', 'Q', 'R2', 'L'],
  },
  {
    title: '(e−f) · (g+(h·k))  →  label 3',
    rule: <>Two equal labels of <Code>2</Code> → <Code>3</Code>. The right subtree also needs three registers.</>,
    active: ['Rs'],
    labeledAfter: [...LEAVES, 'P1', 'P2', 'P3', 'Q', 'R2', 'L', 'Rs'],
  },
  {
    title: 'root  −  →  label 4',
    rule: (
      <>
        The root's children are <strong>both 3</strong> → <Code>3 + 1 = 4</Code>. So evaluating the entire expression
        without touching memory needs <strong>4 registers</strong> — this is a tight lower bound.
      </>
    ),
    active: ['root'],
    labeledAfter: ALL_IDS,
  },
]

const LabelingWalk: React.FC = () => {
  const [i, setI] = useState(0)
  const s = labelSteps[i]
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <Panel>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="font-semibold text-sm">{s.title}</div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {i + 1}/{labelSteps.length}
            </span>
          </div>
          <p className="text-sm leading-relaxed">{s.rule}</p>
          <Formula>{`label(n) = ⎧ max(label(n₁), label(n₂))   if labels differ
           ⎨
           ⎩ label(n₁) + 1              if labels equal`}</Formula>
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
            step {i + 1} of {labelSteps.length}
          </span>
          <button
            onClick={() => setI((p) => Math.min(labelSteps.length - 1, p + 1))}
            disabled={i === labelSteps.length - 1}
            className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            next →
          </button>
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">bottom-up traversal — rᵢ = register need</div>
        {renderTree(new Set(s.labeledAfter), new Set(s.active))}
      </div>
    </div>
  )
}

/* ================================================================== *
 *  Tab 3 · code generation — the four cases + a spilling walk
 * ================================================================== */

/** which gencode case fires for a node with child labels l1,l2 and r regs */
function whichCase(l1: number, l2: number, r: number): 1 | 2 | 3 | 4 {
  if (1 <= l1 && l1 < l2 && l1 < r) return 2
  if (1 <= l2 && l2 <= l1 && l2 < r) return 3
  return 4
}

const CasePicker: React.FC = () => {
  const [l1, setL1] = useState(3)
  const [l2, setL2] = useState(3)
  const [r, setR] = useState(3)
  const c = whichCase(l1, l2, r)
  const desc: Record<number, React.ReactNode> = {
    2: (
      <>
        <Tag tone="good">Case ②</Tag> the <em>left</em> child is the lighter one (<Code>label(n₁) &lt; label(n₂)</Code>)
        and fits in a register. <strong>swap</strong> the register stack, evaluate the heavier{' '}
        <Code>n₂</Code> first, then <Code>n₁</Code>.
      </>
    ),
    3: (
      <>
        <Tag tone="good">Case ③</Tag> the <em>right</em> child is the lighter one (
        <Code>label(n₂) ≤ label(n₁)</Code>) and fits. Evaluate the heavier <Code>n₁</Code> first, then{' '}
        <Code>n₂</Code> — no swap needed.
      </>
    ),
    4: (
      <>
        <Tag tone="bad">Case ④</Tag> <strong>both</strong> children need <Code>≥ r</Code> registers — there aren't
        enough. Evaluate <Code>n₂</Code>, <strong>spill</strong> it to a temporary <Code>Tᵢ</Code> in memory, evaluate{' '}
        <Code>n₁</Code>, reload <Code>Tᵢ</Code>, then combine.
      </>
    ),
  }
  const slider = (label: string, val: number, set: (n: number) => void) => (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-16 text-muted-foreground">{label}</span>
      <input type="range" min={1} max={5} value={val} onChange={(e) => set(+e.target.value)} className="w-32" />
      <span className="font-mono w-4">{val}</span>
    </label>
  )
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        {slider('label(n₁)', l1, setL1)}
        {slider('label(n₂)', l2, setL2)}
        {slider('r (registers)', r, setR)}
        <p className="text-[11px] text-muted-foreground">
          Rule of thumb: <strong>always evaluate the heavier child first</strong>; you only spill when neither child
          fits in the registers you have.
        </p>
      </div>
      <Panel className="text-sm leading-relaxed">{desc[c]}</Panel>
    </div>
  )
}

/* ---- the verified instruction sequences (machine-generated) ------- */

const SEQ_R4: string[] = [
  'load R0, a',
  'load R1, b',
  '×    R0, R0, R1',
  'load R1, c',
  'load R2, d',
  '×    R1, R1, R2',
  '+    R0, R0, R1',
  'load R1, e',
  'load R2, f',
  '−    R1, R1, R2',
  'load R3, h',
  'load R2, k',
  '×    R3, R3, R2',
  'load R2, g',
  '+    R2, R2, R3',
  '×    R1, R1, R2',
  '−    R0, R0, R1',
]

const SEQ_R3: string[] = [
  'load R0, e',
  'load R1, f',
  '−    R0, R0, R1',
  'load R2, h',
  'load R1, k',
  '×    R2, R2, R1',
  'load R1, g',
  '+    R1, R1, R2',
  '×    R0, R0, R1',
  'store T0, R0',
  'load R0, a',
  'load R1, b',
  '×    R0, R0, R1',
  'load R1, c',
  'load R2, d',
  '×    R1, R1, R2',
  '+    R0, R0, R1',
  'load R1, T0',
  '−    R0, R0, R1',
]
const R3_SPILL_LINES = new Set([9, 17]) // 0-based: store T0 / load T0

const SequenceCompare: React.FC = () => {
  const [r, setR] = useState<4 | 3>(3)
  const seq = r === 4 ? SEQ_R4 : SEQ_R3
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => setR(4)} className={pill(r === 4)}>
          r = 4 registers — no spill
        </button>
        <button onClick={() => setR(3)} className={pill(r === 3)}>
          r = 3 registers — one spill
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="text-[12px] font-mono border-collapse">
          <tbody>
            {seq.map((ins, k) => {
              const spill = r === 3 && R3_SPILL_LINES.has(k)
              return (
                <tr key={k} className={spill ? 'bg-amber-100/60 dark:bg-amber-900/25' : ''}>
                  <td className="pr-3 text-right text-muted-foreground select-none">{k + 1}</td>
                  <td className="pr-4 whitespace-pre">{ins}</td>
                  {spill && (
                    <td className="text-[10px]">
                      <Tag tone="warn">spill</Tag>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {r === 4 ? (
          <>
            With four registers every subtree fits. The generator evaluates the <strong>left</strong> subtree first
            (Case ③ at the root, since 3 ≤ 3) and never touches memory — <strong>17 instructions</strong>.
          </>
        ) : (
          <>
            The tree needs 4 registers but the machine has only 3 → the root hits <strong>Case ④</strong>. The{' '}
            <strong>right</strong> subtree is computed first and its result <Code>store</Code>d into <Code>T0</Code>,
            then reloaded before the final <Code>−</Code>. Two extra memory instructions — <strong>19 total</strong>.
          </>
        )}
      </p>
    </div>
  )
}

/* ---- step-by-step gencode walk for r = 3 (spilling) --------------- */

interface CodeStep {
  title: string
  caseTag: React.ReactNode
  body: React.ReactNode
  active: string[]
  upto: number // reveal SEQ_R3[0..upto)
}

const codeSteps: CodeStep[] = [
  {
    title: 'root  −   (label 3, 3   ·   r = 3)',
    caseTag: <Tag tone="bad">Case ④ — spill</Tag>,
    body: (
      <>
        Both children need 3 registers but only 3 exist together, so they cannot both live at once →{' '}
        <strong>Case ④</strong>. Plan: evaluate the <strong>right</strong> child <Code>Rs</Code> first, park it in
        memory <Code>T0</Code>, then the left child <Code>L</Code>, reload and subtract. Nothing emitted yet.
      </>
    ),
    active: ['root'],
    upto: 0,
  },
  {
    title: 'e − f   inside the right subtree',
    caseTag: <Tag tone="good">Case ③ — leaves</Tag>,
    body: (
      <>
        Diving into <Code>Rs</Code>, its heavier-or-equal child <Code>P3 = e−f</Code> goes first. Two leaves: load{' '}
        <Code>e</Code>, load <Code>f</Code>, subtract into <Code>R0</Code>.
      </>
    ),
    active: ['Rs', 'P3', 'e', 'f'],
    upto: 3,
  },
  {
    title: 'g + (h·k)',
    caseTag: <Tag tone="good">Case ②</Tag>,
    body: (
      <>
        Now <Code>R2 = g + (h·k)</Code>. Here <Code>label(g)=1 &lt; label(h·k)=2</Code> → <strong>Case ②</strong>:{' '}
        <Code>swap</Code>, evaluate the heavier <Code>h·k</Code> first (into <Code>R2</Code>), then <Code>g</Code>, then
        add. Watch the register stack keep <Code>R0</Code> (holding <Code>e−f</Code>) untouched.
      </>
    ),
    active: ['R2', 'g', 'Q', 'h', 'k'],
    upto: 8,
  },
  {
    title: 'combine right subtree, then spill it',
    caseTag: <Tag tone="bad">Case ④ — store</Tag>,
    body: (
      <>
        <Code>Rs = (e−f) · (g+(h·k))</Code> is finished in <Code>R0</Code> (line 9). Because the root chose Case ④, its
        value is now <strong>spilled</strong>: <Code>store T0, R0</Code> (line 10) frees all registers for the left
        subtree.
      </>
    ),
    active: ['Rs'],
    upto: 10,
  },
  {
    title: 'the whole left subtree (a·b)+(c·d)',
    caseTag: <Tag tone="good">Case ③ ×3</Tag>,
    body: (
      <>
        With registers free again, evaluate <Code>L</Code>: <Code>a·b</Code> (lines 11–13), <Code>c·d</Code> (14–16),
        then add (17). Result sits in <Code>R0</Code>.
      </>
    ),
    active: ['L', 'P1', 'P2', 'a', 'b', 'c', 'd'],
    upto: 17,
  },
  {
    title: 'reload the spill and finish',
    caseTag: <Tag tone="bad">Case ④ — reload</Tag>,
    body: (
      <>
        Reload the parked right value: <Code>load R1, T0</Code> (18), then <Code>− R0, R0, R1</Code> (19) computes{' '}
        <Code>L − Rs</Code>. Note the operands are still in the correct order even though <Code>Rs</Code> was computed
        first. Result in <Code>R0</Code>. Done.
      </>
    ),
    active: ['root'],
    upto: 19,
  },
]

const CodegenWalk: React.FC = () => {
  const [i, setI] = useState(0)
  const s = codeSteps[i]
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <Panel>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="font-semibold text-sm">{s.title}</div>
            {s.caseTag}
          </div>
          <p className="text-sm leading-relaxed">{s.body}</p>
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
            step {i + 1} of {codeSteps.length}
          </span>
          <button
            onClick={() => setI((p) => Math.min(codeSteps.length - 1, p + 1))}
            disabled={i === codeSteps.length - 1}
            className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            next →
          </button>
        </div>
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-1">emitted so far</div>
          <div className="border rounded-lg bg-muted p-2 text-[11.5px] font-mono min-h-[60px]">
            {s.upto === 0 ? (
              <span className="text-muted-foreground">— nothing yet —</span>
            ) : (
              SEQ_R3.slice(0, s.upto).map((ins, k) => (
                <div key={k} className={R3_SPILL_LINES.has(k) ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                  {String(k + 1).padStart(2)} {ins}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">current subtree highlighted</div>
        {renderTree(new Set(ALL_IDS), new Set(s.active))}
      </div>
    </div>
  )
}

/* ================================================================== *
 *  Tiny undirected-graph renderer for interference graphs
 * ================================================================== */

interface INode {
  id: string
  x: number
  y: number
}
const IPAL = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6']

const IGraph: React.FC<{
  nodes: INode[]
  edges: [string, string][]
  width: number
  height: number
  activeEdges?: string[]
  colorOf?: (id: string) => number | undefined
  removed?: (id: string) => boolean
  maxW?: number
}> = ({ nodes, edges, width, height, activeEdges = [], colorOf, removed, maxW = 480 }) => {
  const map: Record<string, INode> = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const ekey = (a: string, b: string) => [a, b].sort().join('-')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full mx-auto block select-none my-2" style={{ height: 'auto', maxWidth: maxW }}>
      {edges.map(([a, b]) => {
        const na = map[a]
        const nb = map[b]
        if (!na || !nb) return null
        const on = activeEdges.includes(ekey(a, b))
        return (
          <line
            key={ekey(a, b)}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke={on ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
            strokeWidth={on ? 2.4 : 1.4}
            opacity={on ? 1 : 0.55}
          />
        )
      })}
      {nodes.map((n) => {
        const ci = colorOf?.(n.id)
        const gone = removed?.(n.id)
        const fill = ci !== undefined ? IPAL[ci] : 'var(--color-card)'
        return (
          <g key={n.id} style={{ opacity: gone ? 0.2 : 1 }}>
            <circle cx={n.x} cy={n.y} r={18} fill={fill} stroke="var(--color-foreground)" strokeWidth={1.8} />
            <text
              x={n.x}
              y={n.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="13"
              fontWeight={700}
              fill={ci !== undefined ? '#fff' : 'var(--color-foreground)'}
            >
              {n.id}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ---- Tab 5 · interference graph for the running example ----------- */

const IG_NODES: INode[] = [
  { id: 'a', x: 275, y: 160 },
  { id: 'f', x: 275, y: 48 },
  { id: 'b', x: 135, y: 92 },
  { id: 'c', x: 145, y: 252 },
  { id: 'd', x: 315, y: 288 },
  { id: 'e', x: 470, y: 220 },
  { id: 'g', x: 480, y: 70 },
]
const IG_EDGES: [string, string][] = [
  ['a', 'b'],
  ['a', 'c'],
  ['b', 'c'],
  ['a', 'd'],
  ['c', 'd'],
  ['a', 'e'],
  ['d', 'e'],
  ['a', 'f'],
]
const ekey = (a: string, b: string) => [a, b].sort().join('-')

interface IGStep {
  title: string
  out: string
  added: string[]
  note: React.ReactNode
}
const igSteps: IGStep[] = [
  { title: '1:  a = …', out: 'a', added: [], note: <>Only <Code>a</Code> is live afterwards — no other register defined yet.</> },
  { title: '2:  b = …', out: 'a, b', added: [ekey('a', 'b')], note: <><Code>a</Code> is live at the definition of <Code>b</Code> → edge <Code>a–b</Code>.</> },
  {
    title: '3:  c = a + b',
    out: 'a, b, c',
    added: [ekey('a', 'c'), ekey('b', 'c')],
    note: <>Defining <Code>c</Code> while <Code>a</Code> and <Code>b</Code> are live → edges <Code>a–c</Code>, <Code>b–c</Code>.</>,
  },
  {
    title: '4:  d = b + c',
    out: 'a, c, d',
    added: [ekey('a', 'd'), ekey('c', 'd')],
    note: (
      <>
        <Code>b</Code>'s last use was here, so it dies; <Code>a</Code> and <Code>c</Code> live on → edges{' '}
        <Code>a–d</Code>, <Code>c–d</Code>.
      </>
    ),
  },
  {
    title: '5:  e = c + d',
    out: 'a, d, e',
    added: [ekey('a', 'e'), ekey('d', 'e')],
    note: <>Edges <Code>a–e</Code>, <Code>d–e</Code>. Notice <Code>a</Code> keeps showing up — it is live the whole time.</>,
  },
  {
    title: '6:  f = d + e',
    out: 'a, f',
    added: [ekey('a', 'f')],
    note: <>Only <Code>a</Code> survives alongside the new <Code>f</Code> → edge <Code>a–f</Code>.</>,
  },
  {
    title: '7:  g = a + f',
    out: 'g',
    added: [],
    note: (
      <>
        <Code>a</Code> and <Code>f</Code> are both consumed here; only <Code>g</Code> stays live → no new edge.{' '}
        <Code>g</Code> ends up <strong>isolated</strong>.
      </>
    ),
  },
]

const InterferenceWalk: React.FC = () => {
  const [i, setI] = useState(0)
  const activeEdges = igSteps.slice(0, i + 1).flatMap((s) => s.added)
  const s = igSteps[i]
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <Panel>
          <div className="font-semibold text-sm mb-1">{s.title}</div>
          <div className="text-xs text-muted-foreground mb-2">
            live after: <span className="font-mono text-foreground">{`{${s.out}}`}</span>
          </div>
          <p className="text-sm leading-relaxed">{s.note}</p>
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
            line {i + 1} of {igSteps.length}
          </span>
          <button
            onClick={() => setI((p) => Math.min(igSteps.length - 1, p + 1))}
            disabled={i === igSteps.length - 1}
            className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            next →
          </button>
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">interference graph — edges appear as they are added</div>
        <IGraph nodes={IG_NODES} edges={IG_EDGES} width={560} height={320} activeEdges={activeEdges} maxW={520} />
      </div>
    </div>
  )
}

/* ---- Tab 6 · graph coloring (simplify + assign) ------------------- */

interface ColorStep {
  title: string
  removed: string[] // dimmed / on the stack
  colors: Record<string, number>
  note: React.ReactNode
}
const colorSteps: ColorStep[] = [
  {
    title: 'Setup — k = 3 registers',
    removed: [],
    colors: {},
    note: (
      <>
        Degrees: <Code>a:5, c:3, d:3, b:2, e:2, f:1, g:0</Code>. Repeatedly push any node with{' '}
        <strong>fewer than k = 3</strong> neighbours onto a stack.
      </>
    ),
  },
  {
    title: 'Simplify — remove low-degree nodes',
    removed: ['g', 'f', 'b', 'e'],
    colors: {},
    note: (
      <>
        <Code>g</Code>(0), <Code>f</Code>(1), <Code>b</Code>(2), <Code>e</Code>(2) all have &lt; 3 neighbours → push
        them (stack bottom→top: <Code>g, f, b, e</Code>).
      </>
    ),
  },
  {
    title: 'Simplify — the rest collapses',
    removed: ['g', 'f', 'b', 'e', 'c', 'd', 'a'],
    colors: {},
    note: (
      <>
        With those gone, <Code>a, c, d</Code> each have degree 2 &lt; 3, so they come off too. Whole stack (top first):{' '}
        <Code>a, d, c, e, b, f, g</Code>. Since we never got stuck, <strong>no spill is needed</strong>.
      </>
    ),
  },
  {
    title: 'Assign — pop a, then d',
    removed: ['c', 'e', 'b', 'f', 'g'],
    colors: { a: 0, d: 1 },
    note: (
      <>
        Pop in reverse. <Code>a</Code> → <Tag tone="default">R0</Tag> (no coloured neighbour). <Code>d</Code> sees{' '}
        <Code>a</Code>=R0 → <Tag tone="warn">R1</Tag>.
      </>
    ),
  },
  {
    title: 'Assign — c, e',
    removed: ['b', 'f', 'g'],
    colors: { a: 0, d: 1, c: 2, e: 2 },
    note: (
      <>
        <Code>c</Code> neighbours <Code>a</Code>(R0), <Code>d</Code>(R1) → <Tag tone="good">R2</Tag>. <Code>e</Code>{' '}
        neighbours <Code>a</Code>(R0), <Code>d</Code>(R1) → R2 as well (they don't interfere).
      </>
    ),
  },
  {
    title: 'Assign — b, f, g',
    removed: [],
    colors: { a: 0, d: 1, c: 2, e: 2, b: 1, f: 1, g: 0 },
    note: (
      <>
        <Code>b</Code>(nbrs a,c → R0,R2) → R1; <Code>f</Code>(nbr a → R0) → R1; <Code>g</Code>(isolated) → R0. A valid{' '}
        <strong>3-colouring</strong> — so the chromatic number is exactly 3.
      </>
    ),
  },
]

const ColoringWalk: React.FC = () => {
  const [i, setI] = useState(0)
  const s = colorSteps[i]
  const removedSet = new Set(s.removed)
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <Panel>
          <div className="font-semibold text-sm mb-2">{s.title}</div>
          <p className="text-sm leading-relaxed">{s.note}</p>
          <div className="flex flex-wrap gap-1.5 mt-2 text-[10px]">
            {IPAL.slice(0, 3).map((c, k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: c }} /> R{k}
              </span>
            ))}
          </div>
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
            step {i + 1} of {colorSteps.length}
          </span>
          <button
            onClick={() => setI((p) => Math.min(colorSteps.length - 1, p + 1))}
            disabled={i === colorSteps.length - 1}
            className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            next →
          </button>
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">dimmed = on the stack / not yet coloured</div>
        <IGraph
          nodes={IG_NODES}
          edges={IG_EDGES}
          width={560}
          height={320}
          maxW={520}
          colorOf={(id) => s.colors[id]}
          removed={(id) => removedSet.has(id) && s.colors[id] === undefined}
        />
      </div>
    </div>
  )
}

/* ================================================================== *
 *  Tab content
 * ================================================================== */

const OverviewTab: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4 bg-muted/30">
      <p className="text-sm leading-relaxed mb-2">
        A processor's functional units read <strong>registers</strong> with no delay, while loading from the memory
        hierarchy can stall for many cycles. So the compiler wants to keep as many values as possible in the few
        physical registers a machine has — <strong>register allocation</strong>. Doing it well can cut execution time
        dramatically.
      </p>
      <p className="text-sm leading-relaxed">Chapter 8 tackles the problem at two scales:</p>
      <Table
        head={['Scope', 'Question', 'Technique', 'Section']}
        rows={[
          [
            <strong>local</strong>,
            <>How few registers evaluate one expression / basic block?</>,
            <>Sethi–Ullman <em>labeling</em> + <Code>gencode()</Code></>,
            <>§8.1</>,
          ],
          [
            <strong>global</strong>,
            <>Which values stay in registers across a whole function?</>,
            <>interference graph + <em>graph coloring</em></>,
            <>§8.2</>,
          ],
        ]}
      />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Why the boundary between basic blocks hurts</h3>
      <p className="text-sm leading-relaxed">
        If each basic block is allocated in isolation, every <strong>live</strong> variable must be written back to
        memory at the block's end and reloaded at the start of the next — a large, repeated overhead. Global
        allocation instead keeps frequently-used variables resident across block boundaries for as long as they are in
        use. That is the motivation for §8.2.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">The local method in one picture</h3>
      <p className="text-sm mb-2">
        For a basic block whose dependence graph is a <strong>tree</strong>, the minimum register count is found in two
        phases:
      </p>
      <div className="text-sm">
        <Step n="1">
          <strong>Labeling</strong> — a bottom-up pass labels every node with the number of registers its subtree needs.
        </Step>
        <Step n="2">
          <strong>Generation</strong> — a recursive walk emits instructions, reordering children so the heavier one is
          evaluated first, and spilling to memory only when it must.
        </Step>
      </div>
      <p className="text-xs text-muted-foreground">
        The two remaining tabs of §8.1 build exactly these two phases on one running expression tree; §8.2's three tabs
        do the global story. Explore in order, then test yourself in <strong>Questions</strong>.
      </p>
    </div>
  </div>
)

const LabelingTab: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">8.1 · Phase 1 — labeling (Sethi–Ullman)</h3>
      <p className="text-sm mb-2">
        The <strong>label</strong> of a node is a lower bound on the registers needed to evaluate its subtree, assuming
        no spilling. It is computed purely from the two child labels:
      </p>
      <Formula>{`label(leaf)  = 1
label(n)     = ⎧ max(label(n₁), label(n₂))   if label(n₁) ≠ label(n₂)
               ⎨
               ⎩ label(n₁) + 1              if label(n₁) = label(n₂)`}</Formula>
      <p className="text-sm">
        Intuition for the <strong>+1</strong>: when both subtrees are equally "hungry", finishing one still leaves its
        result occupying a register while you start the other — so you need one register more than either alone. When
        the labels differ you evaluate the heavier child first and recycle its registers, so <Code>max</Code> suffices.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Walk the labeling on a complex tree</h3>
      <p className="text-sm mb-3">
        Expression{' '}
        <Code>x = ((a·b) + (c·d)) − ((e−f) · (g + (h·k)))</Code>. Step through the bottom-up traversal; each step
        applies exactly one rule (max, or +1) and fills in that node's register need.
      </p>
      <LabelingWalk />
      <p className="text-xs text-muted-foreground mt-2">
        Final answer: the root is labelled <strong>4</strong>, so evaluating this expression needs a minimum of four
        registers — provided you always evaluate the child with the larger label first.
      </p>
    </div>
  </div>
)

const CodegenTab: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">8.1 · Phase 2 — generation with a register stack</h3>
      <p className="text-sm mb-2">
        <Code>gencode()</Code> walks the labeled tree. It uses two stacks: <Code>rstack</Code> of free registers
        (result returns in the top register) and <Code>tstack</Code> of memory temporaries <Code>T₀,T₁,…</Code> for
        spills. <Code>swap(rstack)</Code> exchanges the top two registers.
      </p>
      <Pre>{`void gencode(node n) {
  if (n is a leaf)  emit("load top(rstack), var(n)");
  else {                                   // children n1 (left), n2 (right)
    if (1 ≤ label(n1) < label(n2)  &&  label(n1) < r) {        // ② left lighter
        swap(rstack); gencode(n2); R = pop(rstack); gencode(n1);
        emit("op top, top, R"); push(R,rstack); swap(rstack);
    } else if (1 ≤ label(n2) ≤ label(n1) && label(n2) < r) {   // ③ right lighter
        gencode(n1); R = pop(rstack); gencode(n2);
        emit("op R, R, top"); push(R,rstack);
    } else {                                                    // ④ both ≥ r: spill
        gencode(n2); T = pop(tstack); emit("store T, top");
        gencode(n1); R = pop(rstack); emit("load top, T"); push(T,tstack);
        emit("op R, R, top"); push(R,rstack);
    }
  }
}`}</Pre>
      <p className="text-xs text-muted-foreground">
        In every case the operands keep their original order (<Code>op left, right</Code>), so non-commutative
        operators like <Code>−</Code> stay correct even when the right child is evaluated first.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Which case fires? (the easy-to-remember flow)</h3>
      <p className="text-sm mb-3">
        Three questions, in order: <strong>leaf?</strong> → load. Otherwise <strong>does the lighter child fit
        (label &lt; r)?</strong> → Case ② or ③ (evaluate heavier first). <strong>Neither fits?</strong> → Case ④ spill.
        Slide the labels and register count and watch the branch light up:
      </p>
      <CasePicker />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Watch gencode() run — and spill (r = 3)</h3>
      <p className="text-sm mb-3">
        Same tree as the labeling tab (root needs 4). With only <strong>3 registers</strong> the root is forced into
        Case ④. Each step names the active case, highlights the subtree, and grows the instruction list:
      </p>
      <CodegenWalk />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Compare the two schedules</h3>
      <p className="text-sm mb-3">
        The <em>only</em> difference between having enough registers and one too few is two memory instructions and a
        flipped evaluation order at the root:
      </p>
      <SequenceCompare />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Beyond trees: DAGs</h3>
      <p className="text-sm mb-2">
        The labeling method is <strong>exact only for trees</strong>. A basic block whose dependence graph is a general
        DAG (a value used more than once) has no such clean bound; compilers fall back on a{' '}
        <strong>heuristic based on topological sorting</strong> — build a node list, then evaluate it in reverse:
      </p>
      <Pre>{`while (unlisted nodes remain) {
  select an unlisted node n whose parents are all listed;
  append n;
  while (leftmost child m of n has no unlisted parents) { append m; n = m; }
}`}</Pre>
      <p className="text-xs text-muted-foreground">
        The inner loop greedily follows a chain of single-use children, keeping a producer and its consumer adjacent so
        the value can stay in a register between them.
      </p>
    </div>
  </div>
)

const GlobalIntroTab: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">8.2 · Global register allocation</h3>
      <p className="text-sm mb-2">Graph-coloring allocation runs in two phases:</p>
      <div className="text-sm">
        <Step n="1">Generate code assuming an <strong>infinite</strong> supply of <em>symbolic</em> registers.</Step>
        <Step n="2">
          Map symbolic → physical registers by building and <strong>coloring</strong> a{' '}
          <em>register interference graph</em>.
        </Step>
      </div>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Live variables (recap)</h3>
      <Panel className="text-sm leading-relaxed">
        A variable <Code>x</Code> is <strong>live</strong> at a point <Code>L</Code> if some path reaches a definition
        of <Code>x</Code>, continues through <Code>L</Code> to a <em>use</em> of <Code>x</Code>, with{' '}
        <strong>no re-definition</strong> in between.
      </Panel>
      <p className="text-sm mt-2">
        The <strong>life time</strong> of <Code>x</Code> is the union of all definition→last-use paths — it may split
        into several non-contiguous intervals.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Two notions of "interference"</h3>
      <Table
        head={['Rule', 'Edge when…', 'Edges among l live vars']}
        rows={[
          [
            <>overlap-based</>,
            <>two life times overlap at all</>,
            <>
              all pairs → <Code>½·l·(l−1)</Code>
            </>,
          ],
          [
            <>
              <strong>definition-based</strong> (used here)
            </>,
            <>one variable is defined while the other is live</>,
            <>
              only <Code>l</Code> edges when defining one variable
            </>,
          ],
        ]}
      />
      <p className="text-sm">
        The definition-based rule produces <Good>fewer edges</Good>, hence an easier-to-color graph, without losing
        correctness — two values that are never simultaneously <em>defined-and-live</em> can safely share a register.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Build the graph, line by line</h3>
      <p className="text-sm mb-2">Running example — a straight-line block of symbolic registers:</p>
      <Pre>{`1:  a = …            5:  e = c + d
2:  b = …            6:  f = d + e
3:  c = a + b        7:  g = a + f
4:  d = b + c`}</Pre>
      <p className="text-sm mb-3">
        Step through it. Watch how <Code>a</Code> stays live from line 1 all the way to line 7 and so collects an edge
        to almost everything:
      </p>
      <InterferenceWalk />
      <p className="text-xs text-muted-foreground mt-2">
        Result: 8 edges. <Code>a</Code> has degree 5 (it is the long-lived value), <Code>g</Code> is isolated. This is
        the graph we color next.
      </p>
    </div>
  </div>
)

const ColoringTab: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">k-coloring = register assignment</h3>
      <p className="text-sm mb-2">
        Assigning <Code>k</Code> physical registers is a <strong>k-coloring</strong> of the interference graph: give
        each node one of <Code>k</Code> colors so no edge joins two equal colors. The minimum feasible <Code>k</Code> is
        the <strong>chromatic number</strong>. For <Code>k &gt; 2</Code> this is <strong>NP-complete</strong> → use a
        heuristic.
      </p>
      <Pre>{`while (V ≠ ∅) {
  if (∃ node N with < n neighbours)          // case 1: always colorable later
      remove N (push on stack), recurse on G\\{N};
  else                                        // case 2: must spill
      remove some node N, keep it in memory;
}
// then assign colors in REVERSE order of removal:
// give each popped node a color none of its (already-colored) neighbours use.`}</Pre>
      <p className="text-xs text-muted-foreground">
        Case 1 is safe: a node with fewer than <Code>n</Code> neighbours can always get a leftover color once the rest
        are colored. Case 2 (<strong>spill</strong>) keeps the value in memory — a store after each definition and a
        load before each use.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Color the running graph (k = 3)</h3>
      <p className="text-sm mb-3">
        Simplify (push low-degree nodes) then assign colors in reverse. This graph never gets stuck, so it needs{' '}
        <strong>no spill</strong>:
      </p>
      <ColoringWalk />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">When you must spill (k = 2)</h3>
      <p className="text-sm mb-2">
        Drop to 2 registers. After removing <Code>g</Code> and <Code>f</Code>, every remaining node has ≥ 2 neighbours →
        the simplify rule stalls → <strong>case 2</strong> triggers. The heuristic spills the highest-degree node,{' '}
        <Code>a</Code> (degree 5). What's left (<Code>b–c–d–e</Code>) is a path and 2-colors easily.
      </p>
      <Panel className="text-sm leading-relaxed">
        <strong>How to pick the spill victim:</strong>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>
            the node adding the <strong>fewest</strong> extra load/store instructions (often impossible to know at
            compile time — think unknown loop trip counts);
          </li>
          <li>the node that best <strong>unblocks</strong> coloring of the rest (e.g. highest degree).</li>
        </ul>
      </Panel>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Helping the allocator: scalar replacement</h3>
      <p className="text-sm mb-2">
        Coloring works on scalars, not array accesses — many compilers won't keep <Code>a[i]</Code> in a register
        across an inner loop because each <Code>a[i]</Code> looks like a fresh memory expression. Making the reuse
        explicit with a scalar temporary lets the allocator do its job:
      </p>
      <Table
        head={['before — a[i] reloaded every j', 'after — scalar replacement']}
        rows={[
          [
            <Pre>{`for (i…)
  for (j…)
    a[i] = a[i] + b[j];`}</Pre>,
            <Pre>{`for (i…) {
  t = a[i];
  for (j…)
    t = t + b[j];
  a[i] = t;
}`}</Pre>,
          ],
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Now <Code>t</Code> is a scalar the coloring pass can hold in a register for the whole inner loop → fewer memory
        cycles.
      </p>
    </div>
  </div>
)

/* ================================================================== *
 *  Tab · Questions (5, easy → hardest)
 * ================================================================== */

/* small tree for Q1: (a − (b·c)) + ((d+e)·(f−g)) */
const Q1_NODES: GNode[] = [
  { id: 'r', x: 200, y: 26, label: '+', sub: 'r3' },
  { id: 'L', x: 100, y: 96, label: '−', sub: 'r2' },
  { id: 'R', x: 300, y: 96, label: '×', sub: 'r3' },
  { id: 'a', x: 55, y: 168, label: 'a', sub: 'r1' },
  { id: 'bc', x: 145, y: 168, label: '×', sub: 'r2' },
  { id: 'de', x: 255, y: 168, label: '+', sub: 'r2' },
  { id: 'fg', x: 345, y: 168, label: '−', sub: 'r2' },
  { id: 'b', x: 118, y: 238, label: 'b', sub: 'r1' },
  { id: 'c', x: 172, y: 238, label: 'c', sub: 'r1' },
  { id: 'd', x: 228, y: 238, label: 'd', sub: 'r1' },
  { id: 'e', x: 282, y: 238, label: 'e', sub: 'r1' },
  { id: 'f', x: 318, y: 238, label: 'f', sub: 'r1' },
  { id: 'g', x: 372, y: 238, label: 'g', sub: 'r1' },
]
const Q1_EDGES: GEdge[] = [
  { from: 'r', to: 'L' },
  { from: 'r', to: 'R' },
  { from: 'L', to: 'a' },
  { from: 'L', to: 'bc' },
  { from: 'bc', to: 'b' },
  { from: 'bc', to: 'c' },
  { from: 'R', to: 'de' },
  { from: 'R', to: 'fg' },
  { from: 'de', to: 'd' },
  { from: 'de', to: 'e' },
  { from: 'fg', to: 'f' },
  { from: 'fg', to: 'g' },
]

/* Q4 interference graph */
const Q4_NODES: INode[] = [
  { id: 'w', x: 180, y: 90 },
  { id: 'x', x: 340, y: 90 },
  { id: 'u', x: 100, y: 210 },
  { id: 'v', x: 250, y: 210 },
  { id: 'y', x: 420, y: 210 },
  { id: 'z', x: 470, y: 90 },
]
const Q4_EDGES: [string, string][] = [
  ['u', 'v'],
  ['u', 'w'],
  ['u', 'x'],
  ['v', 'w'],
  ['w', 'x'],
  ['w', 'y'],
  ['x', 'y'],
  ['x', 'z'],
]
const Q4_COLOR: Record<string, number> = { u: 0, v: 1, w: 2, x: 1, y: 0, z: 0 }

/* Q5 interference graph — K4 clique {a,b,c,d} */
const Q5_NODES: INode[] = [
  { id: 'a', x: 150, y: 80 },
  { id: 'b', x: 320, y: 80 },
  { id: 'c', x: 150, y: 230 },
  { id: 'd', x: 320, y: 230 },
  { id: 'e', x: 460, y: 155 },
]
const Q5_EDGES: [string, string][] = [
  ['a', 'b'],
  ['a', 'c'],
  ['a', 'd'],
  ['b', 'c'],
  ['b', 'd'],
  ['c', 'd'],
  ['b', 'e'],
  ['c', 'e'],
]

const QuestionsTab: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five written-exam problems, easy → hardest. Q1 is fully worked to set the pattern; reveal the others only after
      you have tried them. All trees and graphs below are distinct from the lecture examples.
    </p>

    <QuestionCard
      n={1}
      title="Labeling & register need (worked example)"
      diff="Worked example"
      defaultOpen
      statement={
        <>
          <p>
            For <Code>x = (a − (b·c)) + ((d + e) · (f − g))</Code>, build the expression tree, run Sethi–Ullman
            labeling, and give the minimum number of registers to evaluate it without spilling.
          </p>
        </>
      }
      solution={
        <div className="space-y-2">
          <p className="text-sm">Label bottom-up, applying <em>+1 if children equal, else max</em>:</p>
          <Table
            head={['Node', 'Children labels', 'Rule', 'Label']}
            rows={[
              [<>leaves a…g</>, '—', 'leaf', '1'],
              [<Code>b·c</Code>, '1, 1', 'equal → +1', '2'],
              [<Code>a − (b·c)</Code>, '1, 2', 'differ → max', '2'],
              [<Code>d + e</Code>, '1, 1', 'equal → +1', '2'],
              [<Code>f − g</Code>, '1, 1', 'equal → +1', '2'],
              [<Code>(d+e)·(f−g)</Code>, '2, 2', 'equal → +1', '3'],
              [<strong>root +</strong>, '2, 3', 'differ → max', <strong>3</strong>],
            ]}
          />
          {<FlowGraph nodes={Q1_NODES} edges={Q1_EDGES} width={420} height={270} fillOf={() => 'none'} maxW={440} />}
          <p className="text-sm">
            <strong>Answer: 3 registers.</strong> The right subtree is heavier (label 3), so <Code>gencode()</Code>{' '}
            would evaluate it before the left subtree (label 2) at the root.
          </p>
        </div>
      }
    />

    <QuestionCard
      n={2}
      title="Evaluation order at the root"
      diff="Easy"
      statement={
        <>
          <p>
            Using the labeled tree from Q1 with <Code>r = 3</Code> registers: in which order does <Code>gencode()</Code>{' '}
            evaluate the root's two children, which case of the algorithm applies at the root, and why does the order
            matter?
          </p>
        </>
      }
      solution={
        <div className="space-y-2 text-sm">
          <p>
            At the root <Code>+</Code>: <Code>label(n₁ = a−(b·c)) = 2</Code>, <Code>label(n₂ = right) = 3</Code>. Since{' '}
            <Code>1 ≤ label(n₁)=2 &lt; label(n₂)=3</Code> and <Code>label(n₁)=2 &lt; r=3</Code>, this is{' '}
            <Tag tone="good">Case ②</Tag>.
          </p>
          <p>
            Case ② <Code>swap</Code>s the register stack and evaluates the <strong>heavier</strong> child{' '}
            <Code>n₂</Code> (the right subtree) <strong>first</strong>, then the lighter <Code>n₁</Code>.
          </p>
          <p>
            <strong>Why:</strong> evaluating the heavier side first lets it use all the registers it needs; its single
            result then occupies just one register while the lighter side is computed. Doing it the other way would need
            an extra register (or a spill) — the label count of 3 is only achievable in heavier-first order.
          </p>
        </div>
      }
    />

    <QuestionCard
      n={3}
      title="Forcing a spill (r = 2)"
      diff="Medium"
      statement={
        <>
          <p>
            Consider <Code>y = (a + b) · (c − (d·e))</Code>. (1) Label the tree. (2) With only <Code>r = 2</Code>{' '}
            registers, generate the full instruction sequence with <Code>gencode()</Code>, showing every store/load to
            a temporary <Code>Tᵢ</Code>. (3) Which case forces the spill, and at which node?
          </p>
        </>
      }
      solution={
        <div className="space-y-2 text-sm">
          <p>
            <strong>(1) Labels:</strong> <Code>a+b = 2</Code>; <Code>d·e = 2</Code>;{' '}
            <Code>c − (d·e) = max(1,2) = 2</Code>; root <Code>·</Code> has children <Code>2, 2</Code> → <Code>3</Code>.
            Needs 3, but only 2 are available.
          </p>
          <p>
            <strong>(3) The root</strong> <Code>·</Code> has both child labels <Code>2 ≥ r = 2</Code> →{' '}
            <Tag tone="bad">Case ④ (spill)</Tag>. The right child <Code>c−(d·e)</Code> is evaluated first and stored;
            the left <Code>a+b</Code> follows.
          </p>
          <p>
            <strong>(2) Sequence</strong> (result in <Code>R0</Code>):
          </p>
          <Pre>{` 1  load R1, d
 2  load R0, e
 3  ×    R1, R1, R0
 4  load R0, c
 5  −    R0, R0, R1
 6  store T0, R0      ← spill right subtree
 7  load R0, a
 8  load R1, b
 9  +    R0, R0, R1
10  load R1, T0       ← reload
11  ×    R0, R0, R1`}</Pre>
          <p>Two extra memory instructions (lines 6 and 10) are the price of being one register short.</p>
        </div>
      }
    />

    <QuestionCard
      n={4}
      title="Interference graph & 3-coloring"
      diff="Hard"
      statement={
        <>
          <p>For the straight-line block</p>
          <Pre>{`1: u = …          5: y = u + x
2: v = u + …      6: z = w + y
3: w = u + v      7: print(x, z)
4: x = v + w`}</Pre>
          <p>
            (a) Give the live-out set after each line. (b) Build the interference graph (definition-based rule). (c)
            State the chromatic number and give a valid assignment for <Code>k = 3</Code> physical registers.
          </p>
        </>
      }
      solution={
        <div className="space-y-2 text-sm">
          <p>
            <strong>(a) Live-out:</strong>{' '}
            <Code>1:{'{u}'} · 2:{'{u,v}'} · 3:{'{u,v,w}'} · 4:{'{u,w,x}'} · 5:{'{w,x,y}'} · 6:{'{x,z}'} · 7:{'{}'}</Code>.
          </p>
          <p>
            <strong>(b) Edges</strong> (def N interferes with everything live across it):{' '}
            <Code>u–v, u–w, u–x, v–w, w–x, w–y, x–y, x–z</Code> (8 edges). Degrees: <Code>w:4, x:4, u:3, v:2, y:2, z:1</Code>.
          </p>
          <IGraph nodes={Q4_NODES} edges={Q4_EDGES} width={540} height={300} colorOf={(id) => Q4_COLOR[id]} maxW={480} />
          <p>
            <strong>(c)</strong> The triangle <Code>u–v–w</Code> (and <Code>w–x–y</Code>) forces at least 3 colors, and
            there is no <Code>K₄</Code>, so the <strong>chromatic number is 3</strong>. One valid assignment:
          </p>
          <Pre>{`u→R0   v→R1   w→R2   x→R1   y→R0   z→R0`}</Pre>
          <p>
            Check: every edge joins different registers. <Code>w</Code> and <Code>x</Code> are the high-pressure
            nodes (degree 4) but 3 registers still suffice.
          </p>
        </div>
      }
    />

    <QuestionCard
      n={5}
      title="An unavoidable spill even with k = 3"
      diff="Hardest"
      statement={
        <>
          <p>For</p>
          <Pre>{`1: a = …          4: d = a + b + c
2: b = …          5: e = a + d
3: c = …          6: print(b, c, e)`}</Pre>
          <p>
            (a) Build the interference graph. (b) Show that a spill is unavoidable with <Code>k = 3</Code> registers,
            and identify exactly which set of variables forces it. (c) Run the simplify/spill heuristic: which node is
            spilled, and give the final assignment. (d) How would a loop around the definition of <Code>a</Code> change
            the spill choice?
          </p>
        </>
      }
      solution={
        <div className="space-y-2 text-sm">
          <p>
            <strong>(a) Live-out:</strong>{' '}
            <Code>1:{'{a}'} · 2:{'{a,b}'} · 3:{'{a,b,c}'} · 4:{'{a,b,c,d}'} · 5:{'{b,c,e}'} · 6:{'{}'}</Code>. Edges:{' '}
            <Code>a–b, a–c, a–d, b–c, b–d, c–d, b–e, c–e</Code> (8). Degrees <Code>b:4, c:4, a:3, d:3, e:2</Code>.
          </p>
          <IGraph nodes={Q5_NODES} edges={Q5_EDGES} width={540} height={300} maxW={480} />
          <p>
            <strong>(b)</strong> The four variables <Code>a, b, c, d</Code> are pairwise connected — a{' '}
            <strong>clique K₄</strong> (all live together right after line 4). A K₄ needs <strong>4</strong> colors, so
            with only 3 registers <em>at least one of a, b, c, d must be spilled</em>. No coloring can avoid it.
          </p>
          <p>
            <strong>(c) Simplify (k = 3):</strong> only <Code>e</Code> (degree 2) can be pushed. After removing it,{' '}
            <Code>a, b, c, d</Code> each still have degree 3 → the rule stalls → <Tag tone="bad">spill</Tag>. The
            heuristic spills a highest-degree clique node — say <Code>b</Code> (or any of the four). The rest{' '}
            <Code>a, c, d</Code> then form a triangle plus <Code>e</Code>, which 3-colors:
          </p>
          <Pre>{`spill b (kept in memory: store after def, load before each use)
a→R0   c→R1   d→R2   e→R2`}</Pre>
          <p>
            <strong>(d)</strong> If <Code>a</Code> were defined/used inside a loop, spilling it would insert loads and
            stores <em>inside</em> that loop — potentially thousands of extra memory ops. The "fewest added load/store"
            criterion would then prefer to spill a variable used <strong>outside</strong> the loop (e.g. <Code>d</Code>{' '}
            or <Code>b</Code>) even at equal degree. Degree alone is not the whole story — dynamic spill cost matters.
          </p>
        </div>
      }
    />
  </div>
)

/* ================================================================== *
 *  Assemble
 * ================================================================== */

const tabs: TabDef[] = [
  { id: 'overview', label: 'Overview', render: () => <OverviewTab /> },
  { id: 'labeling', label: '§8.1 Labeling', render: () => <LabelingTab /> },
  { id: 'codegen', label: '§8.1 Code gen', render: () => <CodegenTab /> },
  { id: 'global', label: '§8.2 Interference', render: () => <GlobalIntroTab /> },
  { id: 'coloring', label: '§8.2 Coloring', render: () => <ColoringTab /> },
  { id: 'questions', label: 'Questions', render: () => <QuestionsTab /> },
]

const RegisterAllocationStudyTool: React.FC = () => (
  <StudyShell
    sectionLabel="Chapter 8 · §8.1–§8.2"
    title="Register Allocation & Transformations"
    subtitle="Sethi–Ullman labeling and gencode() spilling for one basic block, then global allocation by interference-graph coloring."
    tabs={tabs}
  />
)

export default RegisterAllocationStudyTool
