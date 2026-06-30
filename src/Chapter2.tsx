import React, { useEffect, useState } from 'react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Progress } from './components/ui/progress'
import { cn } from './lib/utils'

/* ------------------------------------------------------------------ *
 *  Small presentational helpers (kept local — chapter is self-contained)
 * ------------------------------------------------------------------ */

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono text-foreground">{children}</code>
)

const Pre: React.FC<{ children: string }> = ({ children }) => (
  <pre className="bg-muted border rounded-lg p-3 text-[12.5px] font-mono overflow-x-auto whitespace-pre my-2 leading-[1.5]">
    {children}
  </pre>
)

const Formula: React.FC<{ children: string }> = ({ children }) => (
  <div className="bg-muted border-l-[3px] border-primary pl-3 pr-3 py-2 rounded-r-md text-[13px] font-mono whitespace-pre-wrap my-2 leading-[1.5]">
    {children}
  </div>
)

const Step: React.FC<{ n: React.ReactNode; children: React.ReactNode }> = ({ n, children }) => (
  <div className="flex items-start gap-2.5 my-2 text-sm">
    <div className="shrink-0 w-[22px] h-[22px] rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center mt-0.5">
      {n}
    </div>
    <div className="leading-relaxed">{children}</div>
  </div>
)

const Table: React.FC<{ head: React.ReactNode[]; rows: React.ReactNode[][] }> = ({ head, rows }) => (
  <div className="overflow-x-auto my-2">
    <table className="w-full text-[13px] border-collapse min-w-[320px]">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={i} className="bg-muted px-2.5 py-1.5 text-left font-medium border-b whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b last:border-b-0">
            {r.map((c, j) => (
              <td key={j} className="px-2.5 py-1.5 align-top">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('border rounded-lg p-3.5 bg-muted/50 my-1.5', className)}>{children}</div>
)

const Good: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{children}</span>
)
const Bad: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-red-600 dark:text-red-400 font-medium">{children}</span>
)

/* ------------------------------------------------------------------ *
 *  Generic stepper
 * ------------------------------------------------------------------ */

interface StepPanel {
  title: string
  body: React.ReactNode
}

const Stepper: React.FC<{ steps: StepPanel[]; showProgress?: boolean }> = ({ steps, showProgress }) => {
  const [i, setI] = useState(0)
  const go = (d: number) => setI((p) => Math.max(0, Math.min(steps.length - 1, p + d)))
  const s = steps[i]
  return (
    <div>
      <Panel>
        <div className="font-semibold text-sm mb-2">{s.title}</div>
        <div>{s.body}</div>
      </Panel>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={i === 0}>
          ← back
        </Button>
        <span className="flex-1 text-center text-xs text-muted-foreground">
          step {i + 1} of {steps.length}
        </span>
        <Button variant="outline" size="sm" onClick={() => go(1)} disabled={i === steps.length - 1}>
          next →
        </Button>
      </div>
      {showProgress && <Progress value={Math.round(((i + 1) / steps.length) * 100)} className="mt-3" />}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  SVG flow-graph renderer (interactive)
 * ------------------------------------------------------------------ */

type Fill = 'none' | 'active' | 'pred' | 'succ' | 'dim' | 'loop'

interface GNode {
  id: string
  x: number
  y: number
  label: string
  sub?: string
  r?: number
  point?: boolean // render as plain text (entry/exit), no circle
}

interface GEdge {
  from: string
  to: string
  label?: string
  bend?: number
  dashed?: boolean
}

const FILL: Record<Fill, { fill: string; stroke: string; text: string; op?: number }> = {
  none: { fill: 'var(--color-card)', stroke: 'var(--color-foreground)', text: 'var(--color-foreground)' },
  active: { fill: 'var(--color-primary)', stroke: 'var(--color-primary)', text: 'var(--color-primary-foreground)' },
  loop: { fill: 'var(--color-primary)', stroke: 'var(--color-primary)', text: 'var(--color-primary-foreground)' },
  pred: { fill: '#10b981', stroke: '#059669', text: '#ffffff' },
  succ: { fill: '#f59e0b', stroke: '#d97706', text: '#ffffff' },
  dim: { fill: 'var(--color-card)', stroke: 'var(--color-muted-foreground)', text: 'var(--color-muted-foreground)', op: 0.4 },
}

const edgeKey = (e: GEdge) => `${e.from}->${e.to}`

function nodeR(n: GNode) {
  return n.r ?? (n.point ? 14 : n.sub ? 22 : 19)
}

function edgeGeom(a: GNode, b: GNode, e: GEdge) {
  const ra = nodeR(a)
  const rb = nodeR(b)
  if (a.id === b.id) {
    // self loop on the right side of the node
    const { x, y } = a
    const d = `M ${x + ra * 0.5} ${y - ra * 0.85} C ${x + ra * 2.6} ${y - ra * 1.9} ${x + ra * 2.6} ${y + ra * 1.9} ${x + ra * 0.5} ${y + ra * 0.85}`
    return { d, lx: x + ra * 2.7, ly: y }
  }
  const bend = e.bend ?? 0
  const dx = b.x - a.x
  const dy = b.y - a.y
  const L = Math.hypot(dx, dy) || 1
  const px = -dy / L
  const py = dx / L
  const mx = (a.x + b.x) / 2 + px * bend
  const my = (a.y + b.y) / 2 + py * bend
  const da = Math.hypot(mx - a.x, my - a.y) || 1
  const sx = a.x + ((mx - a.x) / da) * ra
  const sy = a.y + ((my - a.y) / da) * ra
  const db = Math.hypot(mx - b.x, my - b.y) || 1
  const ex = b.x + ((mx - b.x) / db) * rb
  const ey = b.y + ((my - b.y) / db) * rb
  const d = `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`
  const lox = bend === 0 ? px * 11 : 0
  const loy = bend === 0 ? py * 11 : 0
  return { d, lx: mx + lox, ly: my + loy }
}

const FlowGraph: React.FC<{
  nodes: GNode[]
  edges: GEdge[]
  width: number
  height: number
  fillOf?: (id: string) => Fill
  activeEdges?: string[] // edgeKey list, drawn in primary
  onPick?: (id: string) => void
  caption?: string
}> = ({ nodes, edges, width, height, fillOf = () => 'none', activeEdges = [], onPick, caption }) => {
  const map: Record<string, GNode> = Object.fromEntries(nodes.map((n) => [n.id, n]))
  return (
    <div className="my-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[420px] mx-auto block select-none"
        style={{ height: 'auto' }}
      >
        <defs>
          <marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="var(--color-muted-foreground)" />
          </marker>
          <marker id="arA" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="var(--color-primary)" />
          </marker>
        </defs>

        {edges.map((e) => {
          const a = map[e.from]
          const b = map[e.to]
          if (!a || !b) return null
          const { d, lx, ly } = edgeGeom(a, b, e)
          const on = activeEdges.includes(edgeKey(e))
          return (
            <g key={edgeKey(e)}>
              <path
                d={d}
                fill="none"
                stroke={on ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
                strokeWidth={on ? 2.2 : 1.4}
                strokeDasharray={e.dashed ? '4 3' : undefined}
                markerEnd={`url(#${on ? 'arA' : 'ar'})`}
              />
              {e.label && (
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11"
                  fontWeight={600}
                  fill={on ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
                  style={{ paintOrder: 'stroke', stroke: 'var(--color-background)', strokeWidth: 3 }}
                >
                  {e.label}
                </text>
              )}
            </g>
          )
        })}

        {nodes.map((n) => {
          const f = FILL[fillOf(n.id)]
          const r = nodeR(n)
          if (n.point) {
            return (
              <text
                key={n.id}
                x={n.x}
                y={n.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fontStyle="italic"
                fill="var(--color-muted-foreground)"
              >
                {n.label}
              </text>
            )
          }
          return (
            <g
              key={n.id}
              onClick={onPick ? () => onPick(n.id) : undefined}
              style={{ cursor: onPick ? 'pointer' : 'default', opacity: f.op ?? 1 }}
            >
              <circle cx={n.x} cy={n.y} r={r} fill={f.fill} stroke={f.stroke} strokeWidth={1.8} />
              <text
                x={n.x}
                y={n.sub ? n.y - 4 : n.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12.5"
                fontWeight={600}
                fill={f.text}
              >
                {n.label}
              </text>
              {n.sub && (
                <text x={n.x} y={n.y + 9} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fill={f.text}>
                  {n.sub}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {caption && <div className="text-center text-xs text-muted-foreground mt-1">{caption}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  Graph datasets
 * ------------------------------------------------------------------ */

// Fibonacci flow graph (PDF p.50)
const fibNodes: GNode[] = [
  { id: 'entry', x: 210, y: 24, label: 'entry', point: true },
  { id: 'B1', x: 210, y: 78, label: 'B1', sub: '1–4' },
  { id: 'B2', x: 95, y: 150, label: 'B2', sub: '13' },
  { id: 'B3', x: 320, y: 150, label: 'B3', sub: '5' },
  { id: 'B4', x: 320, y: 222, label: 'B4', sub: '6' },
  { id: 'B5', x: 210, y: 300, label: 'B5', sub: '7' },
  { id: 'B6', x: 360, y: 300, label: 'B6', sub: '8–12' },
  { id: 'exit', x: 150, y: 372, label: 'exit', point: true },
]
const fibEdges: GEdge[] = [
  { from: 'entry', to: 'B1' },
  { from: 'B1', to: 'B2', label: 'y' },
  { from: 'B1', to: 'B3', label: 'n' },
  { from: 'B3', to: 'B4' },
  { from: 'B4', to: 'B5', label: 'n' },
  { from: 'B4', to: 'B6', label: 'y' },
  { from: 'B6', to: 'B4', bend: -46 },
  { from: 'B2', to: 'exit' },
  { from: 'B5', to: 'exit' },
]

// Dominator example (PDF p.52), 10 nodes
const domNodes: GNode[] = [
  { id: '1', x: 150, y: 28, label: '1' },
  { id: '2', x: 64, y: 92, label: '2' },
  { id: '3', x: 172, y: 108, label: '3' },
  { id: '4', x: 172, y: 168, label: '4' },
  { id: '5', x: 110, y: 230, label: '5' },
  { id: '6', x: 234, y: 230, label: '6' },
  { id: '7', x: 172, y: 292, label: '7' },
  { id: '8', x: 172, y: 352, label: '8' },
  { id: '9', x: 110, y: 412, label: '9' },
  { id: '10', x: 234, y: 412, label: '10' },
]
const domEdges: GEdge[] = [
  { from: '1', to: '2' },
  { from: '1', to: '3' },
  { from: '2', to: '3' },
  { from: '3', to: '4' },
  { from: '4', to: '5' },
  { from: '4', to: '6' },
  { from: '5', to: '7' },
  { from: '6', to: '7' },
  { from: '7', to: '8' },
  { from: '8', to: '9' },
  { from: '8', to: '10' },
  { from: '10', to: '7', bend: -60 },
  { from: '9', to: '1', bend: 150 },
]

// SCC example (PDF p.57)
const sccNodes: GNode[] = [
  { id: 'entry', x: 120, y: 24, label: 'entry', point: true },
  { id: 'B1', x: 120, y: 80, label: 'B1' },
  { id: 'B2', x: 120, y: 150, label: 'B2' },
  { id: 'B3', x: 120, y: 220, label: 'B3' },
  { id: 'exit', x: 120, y: 276, label: 'exit', point: true },
]
const sccEdges: GEdge[] = [
  { from: 'entry', to: 'B1' },
  { from: 'B1', to: 'B2' },
  { from: 'B2', to: 'B2' },
  { from: 'B2', to: 'B3' },
  { from: 'B3', to: 'B1', bend: -70 },
  { from: 'B3', to: 'exit' },
]

// Non-reducible example (PDF p.59)
const nrNodes: GNode[] = [
  { id: '1', x: 150, y: 30, label: '1' },
  { id: '2', x: 80, y: 120, label: '2' },
  { id: '3', x: 220, y: 120, label: '3' },
]
const nrEdges: GEdge[] = [
  { from: '1', to: '2' },
  { from: '1', to: '3' },
  { from: '2', to: '3', bend: 22 },
  { from: '3', to: '2', bend: 22 },
]

/* ------------------------------------------------------------------ *
 *  Interactive: predecessor / successor explorer
 * ------------------------------------------------------------------ */

const PredSuccExplorer: React.FC = () => {
  const [sel, setSel] = useState('B4')
  const preds = fibEdges.filter((e) => e.to === sel).map((e) => e.from)
  const succs = fibEdges.filter((e) => e.from === sel).map((e) => e.to)
  const fillOf = (id: string): Fill => {
    if (id === sel) return 'active'
    if (preds.includes(id)) return 'pred'
    if (succs.includes(id)) return 'succ'
    return 'none'
  }
  const active = [
    ...fibEdges.filter((e) => e.to === sel).map(edgeKey),
    ...fibEdges.filter((e) => e.from === sel).map(edgeKey),
  ]
  return (
    <div>
      <p className="text-sm mb-2">
        Click a basic block. Its <span className="text-emerald-600 dark:text-emerald-400 font-medium">predecessors</span>{' '}
        (can run immediately before it) and{' '}
        <span className="text-amber-600 dark:text-amber-400 font-medium">successors</span>{' '}
        (can run immediately after) are highlighted.
      </p>
      <FlowGraph nodes={fibNodes} edges={fibEdges} width={420} height={400} fillOf={fillOf} activeEdges={active} onPick={setSel} />
      <Panel className="text-sm">
        <div>
          Selected: <Code>{sel}</Code>
        </div>
        <div className="mt-1">
          Pred({sel}) ={' '}
          <span className="text-emerald-600 dark:text-emerald-400 font-medium font-mono">
            {preds.length ? `{${preds.join(', ')}}` : '∅'}
          </span>
        </div>
        <div>
          Succ({sel}) ={' '}
          <span className="text-amber-600 dark:text-amber-400 font-medium font-mono">
            {succs.length ? `{${succs.join(', ')}}` : '∅'}
          </span>
        </div>
      </Panel>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  Interactive: dominator-tree explorer
 * ------------------------------------------------------------------ */

// dom(node) for the 10-node example
const DOM: Record<string, string[]> = {
  '1': ['1'],
  '2': ['1', '2'],
  '3': ['1', '3'],
  '4': ['1', '3', '4'],
  '5': ['1', '3', '4', '5'],
  '6': ['1', '3', '4', '6'],
  '7': ['1', '3', '4', '7'],
  '8': ['1', '3', '4', '7', '8'],
  '9': ['1', '3', '4', '7', '8', '9'],
  '10': ['1', '3', '4', '7', '8', '10'],
}

const DomExplorer: React.FC = () => {
  const [sel, setSel] = useState('8')
  const doms = DOM[sel]
  const fillOf = (id: string): Fill => {
    if (id === sel) return 'active'
    if (doms.includes(id)) return 'pred'
    return 'dim'
  }
  return (
    <div>
      <p className="text-sm mb-2">
        Click a node to highlight <span className="text-emerald-600 dark:text-emerald-400 font-medium">all its dominators</span>{' '}
        — every node that lies on <em>every</em> path from the root (1) to it.
      </p>
      <FlowGraph nodes={domNodes} edges={domEdges} width={300} height={460} fillOf={fillOf} onPick={setSel} />
      <Panel className="text-sm">
        <div className="font-mono">
          dom({sel}) = {`{${doms.join(', ')}}`}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          idom({sel}) = {doms.length > 1 ? doms[doms.length - 2] : '—'} (the closest strict dominator)
        </div>
      </Panel>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  Step data
 * ------------------------------------------------------------------ */

const propSteps: StepPanel[] = [
  {
    title: 'Start: a copy assignment',
    body: (
      <>
        <Pre>{`x := t3
a[t1] := x`}</Pre>
        <p className="text-sm">
          <Code>x</Code> is just a copy of <Code>t3</Code>. If nothing changes <Code>t3</Code> in between, every later
          use of <Code>x</Code> can read <Code>t3</Code> directly.
        </p>
      </>
    ),
  },
  {
    title: 'Copy propagation',
    body: (
      <>
        <Pre>{`x := t3
a[t1] := t3   // x replaced by t3`}</Pre>
        <p className="text-sm">
          We propagated the copy: the use of <Code>x</Code> became a use of <Code>t3</Code>.
        </p>
      </>
    ),
  },
  {
    title: 'Dead-code elimination',
    body: (
      <>
        <Pre>{`a[t1] := t3   // assignment to x removed`}</Pre>
        <p className="text-sm">
          Now <Code>x</Code> is never read anywhere → the assignment <Code>x := t3</Code> is <Good>dead</Good> and can
          be deleted. Two transformations cooperate to shrink the code.
        </p>
      </>
    ),
  },
]

const bbSteps: StepPanel[] = [
  {
    title: '1 · The source function (Fibonacci)',
    body: (
      <>
        <Pre>{`unsigned int fib(unsigned int m) {
  unsigned int f0=0, f1=1, f2, i;
  if (m <= 1) { return m; }
  else {
    for (i=2; i<=m; i++) {
      f2 = f0 + f1;
      f0 = f1;
      f1 = f2;
    }
    return f2;
  }
}`}</Pre>
        <p className="text-sm">
          Analysis never works on C directly — first the front end lowers it to a simple{' '}
          <strong>intermediate representation</strong>. We use three-address code.
        </p>
      </>
    ),
  },
  {
    title: '2 · Three-address code',
    body: (
      <>
        <Pre>{` 1   receive m
 2   f0 <- 0
 3   f1 <- 1
 4   if m <= 1 goto L3
 5   i <- 2
 6 L1: if i <= m goto L2
 7   return f2
 8 L2: f2 <- f0 + f1
 9   f0 <- f1
10   f1 <- f2
11   i <- i + 1
12   goto L1
13 L3: return m`}</Pre>
        <p className="text-sm">
          Each line is at most one operation (≤ 3 addresses). Jumps and labels make the control flow explicit.
        </p>
      </>
    ),
  },
  {
    title: '3 · Find the leaders (entry points)',
    body: (
      <>
        <p className="text-sm mb-2">A statement is a leader (block entry) if it is one of:</p>
        <Table
          head={['Rule', 'Leaders found']}
          rows={[
            ['First instruction of the function', '1'],
            ['Target of a (conditional/unconditional) jump', '6 (L1), 8 (L2), 13 (L3)'],
            ['Instruction right after a jump or return', '5 (after if @4), 7 (after return... no jump @4 is a jump → 5), 8 (after return @7), 13 (after goto @12)'],
          ]}
        />
        <Formula>{`Leaders = { 1, 5, 6, 7, 8, 13 }`}</Formula>
        <p className="text-xs text-muted-foreground">
          @4 is a conditional jump → 5 is a leader. @6 jumps → 7 is a leader. @7 returns → 8 is a leader. @12 jumps
          → 13 is a leader. Targets 6, 8, 13 are leaders too.
        </p>
      </>
    ),
  },
  {
    title: '4 · Build basic blocks',
    body: (
      <>
        <p className="text-sm mb-2">
          Each block runs from a leader up to (but not including) the next leader. Maximal straight-line runs:
        </p>
        <Table
          head={['Block', 'Instructions', 'Ends with']}
          rows={[
            ['B1', '1 – 4', 'if m<=1 goto L3'],
            ['B2', '13', 'return m'],
            ['B3', '5', '(fall through)'],
            ['B4', '6', 'if i<=m goto L2'],
            ['B5', '7', 'return f2'],
            ['B6', '8 – 12', 'goto L1'],
          ]}
        />
        <p className="text-xs text-muted-foreground">
          A block has a single entry (first instr) and single exit (last instr): control can only enter at the top
          and leave at the bottom.
        </p>
      </>
    ),
  },
  {
    title: '5 · Add control-flow edges',
    body: (
      <>
        <p className="text-sm mb-2">
          Draw an edge B → B′ whenever B′ can execute immediately after B (fall-through or jump target). Add{' '}
          <em>entry</em> and <em>exit</em> nodes.
        </p>
        <FlowGraph nodes={fibNodes} edges={fibEdges} width={420} height={400} />
        <p className="text-xs text-muted-foreground">
          B1 branches to B2 (m≤1, “y”) or B3 (“n”). B4 branches to B6 (loop body, “y”) or B5 (exit loop, “n”). B6
          loops back to B4 — that back edge is the for-loop.
        </p>
      </>
    ),
  },
  {
    title: '6 · The finished flow graph',
    body: (
      <>
        <p className="text-sm mb-2">
          That directed graph <Code>G = (N, E)</Code> is the <strong>control-flow graph</strong>. Every later
          analysis (dominators, loops, data flow) runs on it.
        </p>
        <Table
          head={['Concept', 'For this graph']}
          rows={[
            ['Nodes N', 'entry, B1…B6, exit'],
            ['Back edge', 'B6 → B4 (the loop)'],
            ['Loop body', '{B4, B6}'],
            ['Branch blocks', 'B1, B4 (two successors each)'],
          ]}
        />
      </>
    ),
  },
]

const loopSteps: StepPanel[] = [
  {
    title: 'Goal — natural loop of back edge 10 → 7',
    body: (
      <>
        <p className="text-sm mb-2">
          A back edge is <Code>n → d</Code> with <Code>d dom n</Code>. Here 7 dom 10, so <Code>10 → 7</Code> is a
          back edge. Its natural loop = the header <Code>d=7</Code> plus every node that can reach{' '}
          <Code>n=10</Code> without passing through <Code>7</Code>.
        </p>
        <FlowGraph
          nodes={domNodes}
          edges={domEdges}
          width={300}
          height={460}
          fillOf={(id) => (id === '7' ? 'active' : id === '10' ? 'succ' : 'dim')}
          activeEdges={['10->7']}
        />
      </>
    ),
  },
  {
    title: 'Algorithm (worklist over predecessors)',
    body: (
      <>
        <Pre>{`loop  = { d }
stack = empty
insert(n)
while stack not empty:
    m = pop(stack)
    for each predecessor p of m:
        insert(p)

insert(x):
    if x not in loop:
        loop = loop ∪ { x }
        push x`}</Pre>
        <p className="text-sm">
          We seed with the header <Code>d</Code>, then walk <em>backwards</em> from <Code>n</Code> along
          predecessors. Stopping the search at <Code>d</Code> (already in the set) keeps us inside the loop.
        </p>
      </>
    ),
  },
  {
    title: 'Trace it: d=7, n=10',
    body: (
      <>
        <Table
          head={['Action', 'loop', 'stack']}
          rows={[
            ['init', '{7}', '[]'],
            ['insert(10)', '{7,10}', '[10]'],
            ['pop 10 → preds {8}; insert(8)', '{7,8,10}', '[8]'],
            ['pop 8 → preds {7}; 7 already in loop', '{7,8,10}', '[]'],
            ['stack empty → done', '{7,8,10}', '[]'],
          ]}
        />
        <Formula>{`natural loop(10 → 7) = { 7, 8, 10 }`}</Formula>
      </>
    ),
  },
  {
    title: 'Result',
    body: (
      <>
        <FlowGraph
          nodes={domNodes}
          edges={domEdges}
          width={300}
          height={460}
          fillOf={(id) => (['7', '8', '10'].includes(id) ? 'loop' : 'dim')}
          activeEdges={['10->7', '7->8', '8->10']}
        />
        <p className="text-sm">
          Header <Code>7</Code> dominates <Code>8</Code> and <Code>10</Code>; the only entry is the header. Compare
          with back edge <Code>9 → 1</Code>: its natural loop pulls in <em>every</em> node — the whole function is one
          big outer loop, and <Code>{'{7,8,10}'}</Code> is an <strong>inner loop</strong> nested inside it.
        </p>
      </>
    ),
  },
]

/* ------------------------------------------------------------------ *
 *  Reveal + Question card
 * ------------------------------------------------------------------ */

const Reveal: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label = 'solution' }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3">
      <Button variant={open ? 'secondary' : 'default'} size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? `Hide ${label}` : `Reveal ${label}`}
      </Button>
      {open && <div className="mt-3 border-l-2 border-primary/40 pl-3.5">{children}</div>}
    </div>
  )
}

type Diff = 'Worked example' | 'Easy' | 'Medium' | 'Hard' | 'Hardest'
const diffClass: Record<Diff, string> = {
  'Worked example': 'bg-primary/10 text-primary',
  Easy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Hard: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Hardest: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const QuestionCard: React.FC<{
  n: number
  title: string
  diff: Diff
  defaultOpen?: boolean
  statement: React.ReactNode
  solution: React.ReactNode
}> = ({ n, title, diff, defaultOpen = false, statement, solution }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors rounded-t-xl"
      >
        <span className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
          {n}
        </span>
        <span className="flex-1 font-medium text-sm">{title}</span>
        <span className={cn('shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full', diffClass[diff])}>
          {diff}
        </span>
        <span className="shrink-0 text-muted-foreground text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <CardContent className="pt-0">
          <div className="text-sm leading-relaxed">{statement}</div>
          <Reveal>{solution}</Reveal>
        </CardContent>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ *
 *  Section bodies
 * ------------------------------------------------------------------ */

const OverviewSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why analyze programs?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">
          Modern processors only reach good performance if the machine program is adapted to the architecture. A
          single standard core hides a lot in hardware (pipelining, multiple functional units, caches) — but recent
          architectures need explicit help from the programmer or compiler:
        </p>
        <Table
          head={['Architecture', 'What it needs']}
          rows={[
            ['Multicore / hyperthreading', 'multiple threads'],
            ['Vector units (e.g. AVX)', 'vectorization and/or threads'],
            ['VLIW (e.g. Itanium)', 'instruction scheduling'],
          ]}
        />
        <p className="text-sm mt-3">
          To restructure code <em>without changing its result for any input</em>, the compiler first analyzes it.
          Three techniques feed everything else:
        </p>
        <Table
          head={['Technique', 'Computes']}
          rows={[
            [<strong>Control-flow analysis</strong>, 'possible orders of execution of statements'],
            [<strong>Data-flow analysis</strong>, 'how data elements are created and used'],
            [<strong>Data-dependency analysis</strong>, 'dependencies caused by possible control flows'],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-2">
          This section (2.1) is control-flow analysis — the foundation the other two build on. Loops are the main
          target, since they dominate run time.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Where it sits in the compiler</CardTitle>
      </CardHeader>
      <CardContent>
        <Formula>{`source ─▶ [front end] ─▶ IR ─▶ [code optimization] ─▶ IR ─▶ [code generation] ─▶ assembly`}</Formula>
        <p className="text-sm mt-2 mb-1">
          The classical optimizer runs three phases — and control-flow analysis is phase&nbsp;(a):
        </p>
        <Step n="a">
          <strong>Control-flow analysis:</strong> find basic blocks, build the flow graph, identify loops.
        </Step>
        <Step n="b">
          <strong>Data-flow analysis:</strong> find dependencies between variables, across blocks.
        </Step>
        <Step n="c">
          <strong>Optimizing transformations:</strong> apply correctness-preserving rewrites.
        </Step>
        <p className="text-xs text-muted-foreground mt-1">
          “Machine independent”: no target-specific info is used here; the goal is simply to cut execution time
          without changing behavior.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">When is a transformation safe?</CardTitle>
      </CardHeader>
      <CardContent>
        <Panel className="text-sm leading-relaxed">
          A transformation may be applied <strong>only if no input exists for which the program output changes</strong>{' '}
          afterwards → a <em>conservative</em> / <em>correctness-preserving</em> transformation.
        </Panel>
        <Panel className="text-sm leading-relaxed mt-2">
          A statement <strong>reordering</strong> is safe iff it does not change the relative execution order of any
          two statements that have a <strong>data dependency</strong> between them.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Typical optimizing transformations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['#', 'Transformation', 'Idea']}
          rows={[
            ['1', 'Common subexpression elimination', 'compute a repeated expression once'],
            ['2', 'Copy & constant propagation', 'replace a variable by what it was assigned'],
            ['3', 'Dead / unreachable code elimination', 'drop e.g. if(DEBUG)… and never-read assignments'],
            ['4', 'Loop-invariant code motion', 'while(i<=n-2) → t=n-2; while(i<=t)'],
          ]}
        />
        <p className="text-sm mt-3 mb-1">Step through #2 + #3 working together:</p>
        <Stepper steps={propSteps} />
      </CardContent>
    </Card>
  </div>
)

const BlocksSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Intermediate representation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Program analysis runs on an IR, not on source code. Common forms are <strong>syntax trees</strong> and{' '}
          <strong>three-address statements</strong> (each step has at most three operands, e.g.{' '}
          <Code>f2 ← f0 + f1</Code>). Three-address code makes jumps and labels explicit, which is exactly what
          control-flow analysis needs.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Basic block — definition</CardTitle>
      </CardHeader>
      <CardContent>
        <Panel className="text-sm leading-relaxed">
          A <strong>basic block</strong> is a sequence of statements of <strong>maximum length</strong> that can{' '}
          <em>only be entered via its first statement</em> and <em>only be left via its last statement</em>.
        </Panel>
        <p className="text-sm mt-3 mb-1">
          Its first statement is called a <strong>leader</strong>. A statement is a leader if it is:
        </p>
        <Step n="1">the first instruction of a procedure / function;</Step>
        <Step n="2">the target of a conditional or unconditional jump;</Step>
        <Step n="3">the instruction immediately following a jump or return.</Step>
        <p className="text-sm mt-2">
          <strong>Method:</strong> (1) find all leaders, (2) each block spans a leader up to — but not including — the
          next leader.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive worked example — C → 3-addr → blocks → flow graph</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={bbSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

const FlowGraphSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Flow graph — definition</CardTitle>
      </CardHeader>
      <CardContent>
        <Panel className="text-sm leading-relaxed">
          A <strong>flow graph</strong> of a function is a directed graph <Code>G = (N, E)</Code> with a single root
          node <em>entry</em>. The nodes are <Code>N = basic blocks ∪ {'{entry}'} ∪ {'{exit}'}</Code>. There is an edge{' '}
          <Code>B₁ → B₂</Code> iff <Code>B₂</Code> can execute immediately after <Code>B₁</Code>. <em>exit</em> is the
          single exit point.
        </Panel>
        <Formula>{`Pred(b) = { n ∈ N | n → b ∈ E }   (predecessors)
Succ(b) = { n ∈ N | b → n ∈ E }   (successors)`}</Formula>
        <p className="text-sm">
          Enhancing the basic blocks with these edges is exactly what turns a list of blocks into a flow graph.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — predecessors &amp; successors</CardTitle>
      </CardHeader>
      <CardContent>
        <PredSuccExplorer />
      </CardContent>
    </Card>
  </div>
)

const DominatorsSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Dominators</CardTitle>
      </CardHeader>
      <CardContent>
        <Panel className="text-sm leading-relaxed">
          Node <Code>d</Code> is a <strong>dominator</strong> of node <Code>n</Code> (<Code>d dom n</Code>) if{' '}
          <em>every</em> path from the root to <Code>n</Code> goes through <Code>d</Code>.
        </Panel>
        <p className="text-sm mt-3">
          <Code>dom</Code> is a reflexive partial order: reflexive (<Code>a dom a</Code>), antisymmetric, and
          transitive. Two refinements:
        </p>
        <Table
          head={['Relation', 'Meaning']}
          rows={[
            [<Code>d sdom n</Code>, <span><strong>strict</strong> dominance: <Code>d dom n</Code> and <Code>d ≠ n</Code></span>],
            [<Code>d idom n</Code>, <span><strong>immediate</strong> dominance: <Code>d sdom n</Code> with no <Code>c</Code> strictly between them</span>],
            [<Code>p pdom n</Code>, <span><strong>post</strong>-dominance: every path from <Code>n</Code> to <em>exit</em> contains <Code>p</Code></span>],
          ]}
        />
        <p className="text-sm mt-2">
          Each node has a unique immediate dominator, so the <Code>idom</Code> relation forms the{' '}
          <strong>dominator tree</strong> (root = flow-graph root). Paths in that tree are exactly the dominator
          relations. Post-dominance is just dominance on the graph with all edges reversed.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — explore dominators</CardTitle>
      </CardHeader>
      <CardContent>
        <DomExplorer />
        <p className="text-xs text-muted-foreground mt-2">
          Note: node 2 dominates only itself (3 is reachable directly via 1→3), and 3 dominates everything except 1
          and 2.
        </p>
      </CardContent>
    </Card>
  </div>
)

const LoopsSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Finding loops with dominators</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">A loop in a flow graph must satisfy two conditions:</p>
        <Step n="a">
          a unique entry node (the <strong>header</strong>) <Code>d</Code> that dominates all other loop nodes;
        </Step>
        <Step n="b">
          at least one <strong>back edge</strong> <Code>n → d</Code> with <Code>d dom n</Code>.
        </Step>
        <Panel className="text-sm leading-relaxed mt-2">
          <strong>Natural loop</strong> of a back edge <Code>n → d</Code>: the subgraph on nodes{' '}
          <Code>{'{d, n} ∪ { p | n is reachable from p without going through d }'}</Code>, with all edges of{' '}
          <Code>E</Code> between those nodes.
        </Panel>
        <p className="text-xs text-muted-foreground mt-2">
          An <strong>inner loop</strong> is one contained in a surrounding loop. For data-flow analysis, a (initially
          empty) <strong>pre-header</strong> is inserted before each header to give loop-invariant code a unique
          landing spot — all edges that entered the header now enter the pre-header instead.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — construct a natural loop</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={loopSteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pre-header insertion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Panel>
            <div className="text-xs font-semibold text-muted-foreground mb-1">before</div>
            <FlowGraph
              nodes={[
                { id: 'p1', x: 60, y: 30, label: '·', point: true },
                { id: 'p2', x: 150, y: 30, label: '·', point: true },
                { id: 'H', x: 120, y: 95, label: 'Header' },
                { id: 'L', x: 120, y: 165, label: 'Loop' },
              ]}
              edges={[
                { from: 'p1', to: 'H' },
                { from: 'p2', to: 'H' },
                { from: 'H', to: 'L' },
                { from: 'L', to: 'H', bend: -55 },
              ]}
              width={220}
              height={210}
            />
          </Panel>
          <Panel>
            <div className="text-xs font-semibold text-muted-foreground mb-1">after</div>
            <FlowGraph
              nodes={[
                { id: 'p1', x: 60, y: 24, label: '·', point: true },
                { id: 'p2', x: 150, y: 24, label: '·', point: true },
                { id: 'PH', x: 120, y: 78, label: 'Pre', sub: 'header' },
                { id: 'H', x: 120, y: 145, label: 'Header' },
                { id: 'L', x: 120, y: 205, label: 'Loop' },
              ]}
              edges={[
                { from: 'p1', to: 'PH' },
                { from: 'p2', to: 'PH' },
                { from: 'PH', to: 'H' },
                { from: 'H', to: 'L' },
                { from: 'L', to: 'H', bend: -50 },
              ]}
              width={220}
              height={250}
            />
          </Panel>
        </div>
      </CardContent>
    </Card>
  </div>
)

const ReducibilitySection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Strongly connected components</CardTitle>
      </CardHeader>
      <CardContent>
        <Panel className="text-sm leading-relaxed">
          An <strong>SCC</strong> is a subgraph <Code>Gs = (Ns, Es)</Code> in which every node is reachable from every
          other node (using only edges in <Code>Es</Code>). It has <strong>maximum size</strong> if no larger SCC
          contains it.
        </Panel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 items-center">
          <FlowGraph nodes={sccNodes} edges={sccEdges} width={240} height={300} fillOf={(id) => (['B1', 'B2', 'B3'].includes(id) ? 'loop' : 'none')} />
          <div className="text-sm leading-relaxed">
            <Code>{'{B1, B2, B3}'}</Code> is a maximal SCC. <Code>{'{B2}'}</Code> alone (its self-loop) is an SCC too,
            but <strong>not</strong> maximal.
            <br />
            <br />
            Every natural loop is an SCC — but an SCC is more general: it may have <strong>several entry points</strong>.
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reducible flow graphs</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Data-flow analysis techniques only apply to <strong>reducible</strong> flow graphs.
        </p>
        <Panel className="text-sm leading-relaxed">
          <strong>Intuitively:</strong> reducible = there are no jumps <em>into</em> the middle of a loop; each loop’s
          only entry is its header.
        </Panel>
        <p className="text-sm mt-2 mb-1">
          <strong>Exactly:</strong> <Code>G</Code> is reducible if its edges split into two disjoint sets:
        </p>
        <Step n="1">
          <strong>forward edges</strong> forming a DAG in which every node is reachable from entry;
        </Step>
        <Step n="2">
          <strong>back edges</strong> <Code>n → d</Code> with <Code>d dom n</Code>.
        </Step>
        <Formula>{`Test:  remove all back edges (n → d, d dom n)
       → reducible  ⟺  the remainder is a DAG`}</Formula>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">A non-reducible flow graph</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <FlowGraph nodes={nrNodes} edges={nrEdges} width={300} height={180} />
          <div className="text-sm leading-relaxed">
            The 2↔3 cycle has <strong>two entries</strong> (1→2 and 1→3). Neither 2 dom 3 nor 3 dom 2, so neither edge
            is a back edge → nothing to remove → the remainder still has a cycle → <Bad>not a DAG → non-reducible</Bad>.
            <br />
            <br />
            In standard languages, non-reducible graphs arise only from <Code>goto</Code> statements.
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Questions
 * ------------------------------------------------------------------ */

// Q1 worked example graph
const q1Nodes: GNode[] = [
  { id: 'entry', x: 150, y: 22, label: 'entry', point: true },
  { id: 'B1', x: 150, y: 76, label: 'B1', sub: '1–3' },
  { id: 'B2', x: 150, y: 150, label: 'B2', sub: '4' },
  { id: 'B3', x: 270, y: 150, label: 'B3', sub: '5–7' },
  { id: 'B4', x: 150, y: 230, label: 'B4', sub: '8' },
  { id: 'exit', x: 150, y: 290, label: 'exit', point: true },
]
const q1Edges: GEdge[] = [
  { from: 'entry', to: 'B1' },
  { from: 'B1', to: 'B2' },
  { from: 'B2', to: 'B3', label: 'n' },
  { from: 'B2', to: 'B4', label: 'y' },
  { from: 'B3', to: 'B2', bend: 58 },
  { from: 'B4', to: 'exit' },
]

// Q3 graph
const q3Nodes: GNode[] = [
  { id: '1', x: 150, y: 28, label: '1' },
  { id: '2', x: 80, y: 100, label: '2' },
  { id: '3', x: 220, y: 100, label: '3' },
  { id: '4', x: 150, y: 172, label: '4' },
  { id: '5', x: 150, y: 244, label: '5' },
  { id: '6', x: 150, y: 316, label: '6' },
]
const q3Edges: GEdge[] = [
  { from: '1', to: '2' },
  { from: '1', to: '3' },
  { from: '2', to: '4' },
  { from: '3', to: '4' },
  { from: '4', to: '5' },
  { from: '5', to: '6' },
  { from: '6', to: '4', bend: -75 },
]

// Q5 graph
const q5Nodes: GNode[] = [
  { id: '1', x: 150, y: 28, label: '1' },
  { id: '2', x: 80, y: 120, label: '2' },
  { id: '3', x: 220, y: 120, label: '3' },
  { id: '4', x: 150, y: 210, label: '4' },
]
const q5Edges: GEdge[] = [
  { from: '1', to: '2' },
  { from: '1', to: '3' },
  { from: '2', to: '3', bend: 20 },
  { from: '3', to: '2', bend: 20 },
  { from: '3', to: '4' },
]

const QuestionsSection: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five written-exam-style problems, easy → hardest. Question 1 is a fully worked example that sets the pattern;
      for the rest, try it on paper first, then reveal the solution.
    </p>

    {/* Q1 — worked example */}
    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Leaders, basic blocks and flow graph from 3-address code"
      statement={
        <>
          <p className="mb-2">Given the three-address code below, (a) list all leaders, (b) form the basic blocks, (c) draw the flow graph.</p>
          <Pre>{` 1   read n
 2   sum <- 0
 3   i <- 1
 4 L1: if i > n goto L2
 5   sum <- sum + i
 6   i <- i + 1
 7   goto L1
 8 L2: print sum`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Leaders</p>
          <Table
            head={['Reason', 'Leader']}
            rows={[
              ['first instruction', '1'],
              ['jump targets: L1, L2', '4, 8'],
              ['after a jump: after @4 (cond), after @7 (goto)', '5, 8'],
            ]}
          />
          <Formula>{`Leaders = { 1, 4, 5, 8 }`}</Formula>
          <p className="text-sm font-medium mt-3 mb-1">(b) Basic blocks</p>
          <Table
            head={['Block', 'Instructions']}
            rows={[
              ['B1', '1–3'],
              ['B2', '4 (if i>n goto L2)'],
              ['B3', '5–7 (loop body, ends goto L1)'],
              ['B4', '8 (print)'],
            ]}
          />
          <p className="text-sm font-medium mt-3 mb-1">(c) Flow graph</p>
          <FlowGraph nodes={q1Nodes} edges={q1Edges} width={300} height={320} />
          <Panel className="text-sm mt-1">
            B2 branches: <Code>i &gt; n</Code> true (“y”) → B4 exit; false (“n”) → B3. B3 ends with{' '}
            <Code>goto L1</Code> → back edge B3 → B2. So <Code>{'{B2, B3}'}</Code> is the natural loop with header B2.
          </Panel>
        </>
      }
    />

    {/* Q2 */}
    <QuestionCard
      n={2}
      diff="Easy"
      title="Translate a C loop with a conditional, then find the blocks"
      statement={
        <>
          <p className="mb-2">
            Translate the C fragment to three-address code, list the leaders, and give the basic blocks with their
            control-flow edges.
          </p>
          <Pre>{`s = 0;
for (i = 0; i < n; i++) {
  if (a[i] > 0)
    s = s + a[i];
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">Three-address code</p>
          <Pre>{` 1   s <- 0
 2   i <- 0
 3 L1: if i >= n goto L2
 4   t1 <- a[i]
 5   if t1 <= 0 goto L3
 6   s <- s + t1
 7 L3: i <- i + 1
 8   goto L1
 9 L2: ...`}</Pre>
          <p className="text-xs text-muted-foreground mb-2">
            The loop test is negated (<Code>i &lt; n</Code> → exit when <Code>i &gt;= n</Code>); the{' '}
            <Code>if</Code> is negated too (skip the body when <Code>a[i] &lt;= 0</Code>).
          </p>
          <p className="text-sm font-medium mb-1">Leaders</p>
          <Formula>{`first: 1 · targets L1,L2,L3: 3,9,7 · after jumps @3,@5,@8: 4,6,9
Leaders = { 1, 3, 4, 6, 7, 9 }`}</Formula>
          <p className="text-sm font-medium mt-2 mb-1">Basic blocks &amp; edges</p>
          <Table
            head={['Block', 'Instr', 'Successors']}
            rows={[
              ['B1', '1–2', 'B2'],
              ['B2', '3', 'B6 (i≥n), B3'],
              ['B3', '4–5', 'B5 (a[i]≤0), B4'],
              ['B4', '6', 'B5'],
              ['B5', '7–8', 'B2 (back edge)'],
              ['B6', '9', 'exit'],
            ]}
          />
          <Panel className="text-sm mt-1">
            Header B2, back edge B5 → B2, natural loop <Code>{'{B2, B3, B4, B5}'}</Code>. The inner{' '}
            <Code>if</Code> creates the diamond B3 → {'{B4, B5}'} inside the loop body.
          </Panel>
        </>
      }
    />

    {/* Q3 */}
    <QuestionCard
      n={3}
      diff="Medium"
      title="Dominators, dominator tree and the loop of a flow graph"
      statement={
        <>
          <p className="mb-2">For the flow graph below (root = 1):</p>
          <FlowGraph nodes={q3Nodes} edges={q3Edges} width={300} height={360} />
          <p>(a) Give <Code>dom(x)</Code> for every node. (b) Draw the dominator tree (give <Code>idom</Code>). (c) Identify the back edge and its natural loop.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Dominator sets</p>
          <Table
            head={['x', 'dom(x)']}
            rows={[
              ['1', '{1}'],
              ['2', '{1, 2}'],
              ['3', '{1, 3}'],
              ['4', '{1, 4}'],
              ['5', '{1, 4, 5}'],
              ['6', '{1, 4, 5, 6}'],
            ]}
          />
          <p className="text-xs text-muted-foreground mb-2">
            4 is reachable via 2 <em>and</em> 3, so neither 2 nor 3 dominates 4 — only 1 does (besides 4 itself).
          </p>
          <p className="text-sm font-medium mb-1">(b) Dominator tree</p>
          <Pre>{`        1
      / | \\
     2  3  4
            |
            5
            |
            6

idom: 2→1, 3→1, 4→1, 5→4, 6→5`}</Pre>
          <p className="text-sm font-medium mt-2 mb-1">(c) Loop</p>
          <Panel className="text-sm">
            Back edge: <Code>6 → 4</Code> (since 4 dom 6). Natural loop: header 4 plus nodes reaching 6 without passing
            4 → <Code>{'{4, 5, 6}'}</Code>.
          </Panel>
        </>
      }
    />

    {/* Q4 */}
    <QuestionCard
      n={4}
      diff="Hard"
      title="All back edges, nested natural loops and pre-headers"
      statement={
        <>
          <p className="mb-2">For this flow graph (root = 1):</p>
          <FlowGraph nodes={domNodes} edges={domEdges} width={300} height={460} />
          <p>
            (a) Find <em>all</em> back edges. (b) Construct the natural loop of each (show the worklist for one of
            them). (c) Which loop is inner / outer? (d) Where are pre-headers inserted?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Back edges</p>
          <Panel className="text-sm">
            An edge <Code>n → d</Code> is a back edge iff <Code>d dom n</Code>.
            <br />• <Code>10 → 7</Code>: 7 dom 10 ✓ &nbsp;&nbsp;• <Code>9 → 1</Code>: 1 dom 9 ✓
            <br />
            (All other edges are forward edges.)
          </Panel>
          <p className="text-sm font-medium mt-3 mb-1">(b) Natural loops — worklist for 10 → 7</p>
          <Table
            head={['Action', 'loop']}
            rows={[
              ['init {d=7}; insert(10)', '{7, 10}'],
              ['pop 10 → pred 8; insert(8)', '{7, 8, 10}'],
              ['pop 8 → pred 7 (already in)', '{7, 8, 10}'],
            ]}
          />
          <Formula>{`loop(10 → 7) = { 7, 8, 10 }
loop(9 → 1)  = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 }   (all nodes)`}</Formula>
          <p className="text-sm font-medium mt-2 mb-1">(c) Nesting</p>
          <Panel className="text-sm">
            <Code>{'{7, 8, 10}'}</Code> ⊂ <Code>{'{1…10}'}</Code> → it is the <strong>inner loop</strong>; the whole
            graph is the <strong>outer loop</strong>.
          </Panel>
          <p className="text-sm font-medium mt-2 mb-1">(d) Pre-headers</p>
          <Panel className="text-sm">
            One before each header: a pre-header before <Code>7</Code> (for the inner loop) and one before{' '}
            <Code>1</Code> (for the outer loop). All edges that entered a header are redirected into its pre-header;
            the back edge still targets the original header.
          </Panel>
        </>
      }
    />

    {/* Q5 */}
    <QuestionCard
      n={5}
      diff="Hardest"
      title="Reducibility vs. SCCs — prove a graph is non-reducible"
      statement={
        <>
          <p className="mb-2">Consider the flow graph (root = 1):</p>
          <FlowGraph nodes={q5Nodes} edges={q5Edges} width={300} height={260} />
          <p>
            (a) Compute dominators for 2 and 3. (b) Decide whether the graph is reducible using the back-edge removal
            test — justify. (c) Give the maximal SCCs. (d) Explain why the cyclic SCC is <em>not</em> a natural loop.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Dominators</p>
          <Panel className="text-sm">
            2 is reachable by <Code>1→2</Code> and by <Code>1→3→2</Code>; 3 is reachable by <Code>1→3</Code> and by{' '}
            <Code>1→2→3</Code>. Hence <Code>dom(2) = {'{1, 2}'}</Code> and <Code>dom(3) = {'{1, 3}'}</Code> — neither
            dominates the other.
          </Panel>
          <p className="text-sm font-medium mt-3 mb-1">(b) Reducibility test</p>
          <Panel className="text-sm">
            A back edge needs <Code>n → d</Code> with <Code>d dom n</Code>. For <Code>2 → 3</Code> we’d need 3 dom 2
            (false); for <Code>3 → 2</Code> we’d need 2 dom 3 (false). So there are <strong>no back edges to remove</strong>.
            The graph still contains the cycle <Code>2 ⇄ 3</Code> → it is <Bad>not a DAG → non-reducible</Bad>.
          </Panel>
          <p className="text-sm font-medium mt-2 mb-1">(c) Maximal SCCs</p>
          <Formula>{`SCCs = { {1}, {2, 3}, {4} }     ( {2,3} is the only non-trivial one )`}</Formula>
          <p className="text-sm font-medium mt-2 mb-1">(d) Why {'{2,3}'} is not a natural loop</p>
          <Panel className="text-sm">
            A natural loop has a <strong>single</strong> entry (the header) that dominates all its nodes. The cycle{' '}
            <Code>{'{2, 3}'}</Code> has <strong>two</strong> entry points (1→2 and 1→3) and no node dominates the
            other — so it is an SCC but not a natural loop. This kind of multi-entry cycle is exactly what makes a
            flow graph irreducible, and in real code only arises from <Code>goto</Code>.
          </Panel>
        </>
      }
    />
  </div>
)

/* ------------------------------------------------------------------ *
 *  Root component
 * ------------------------------------------------------------------ */

type TabId = 'overview' | 'blocks' | 'flowgraph' | 'dominators' | 'loops' | 'reducibility' | 'questions'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'blocks', label: 'Basic blocks' },
  { id: 'flowgraph', label: 'Flow graph' },
  { id: 'dominators', label: 'Dominators' },
  { id: 'loops', label: 'Loops' },
  { id: 'reducibility', label: 'SCC & reducibility' },
  { id: 'questions', label: 'Questions' },
]

export default function ControlFlowStudyTool(): React.JSX.Element {
  const [dark, setDark] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-8 pb-16">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-0.5">Chapter 2 · §2.1</div>
            <h1 className="text-2xl font-semibold tracking-tight">Control-flow analysis</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Basic blocks, flow graphs, dominators, loops and reducibility — step through each idea, then test
              yourself.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
            {dark ? '◑ Light' : '◐ Dark'}
          </Button>
        </div>

        <nav className="flex flex-wrap gap-1.5 py-4" role="tablist" aria-label="Study sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'text-[12.5px] px-3 py-1.5 rounded-full border transition-colors',
                tab === t.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div role="tabpanel">
          {tab === 'overview' && <OverviewSection />}
          {tab === 'blocks' && <BlocksSection />}
          {tab === 'flowgraph' && <FlowGraphSection />}
          {tab === 'dominators' && <DominatorsSection />}
          {tab === 'loops' && <LoopsSection />}
          {tab === 'reducibility' && <ReducibilitySection />}
          {tab === 'questions' && <QuestionsSection />}
        </div>
      </div>
    </div>
  )
}
