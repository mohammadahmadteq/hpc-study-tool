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

/* set helpers: subscript digits + pretty-print a set of items */
const SUBS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']
const sub = (s: string) => s.replace(/[0-9]/g, (d) => SUBS[+d])
const S = (xs: string[]) => (xs.length ? `{${xs.map(sub).join(', ')}}` : '∅')
const SetT: React.FC<{ xs: string[]; className?: string }> = ({ xs, className }) => (
  <span className={cn('font-mono', className)}>{S(xs)}</span>
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
  point?: boolean
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
  activeEdges?: string[]
  onPick?: (id: string) => void
  caption?: string
}> = ({ nodes, edges, width, height, fillOf = () => 'none', activeEdges = [], onPick, caption }) => {
  const map: Record<string, GNode> = Object.fromEntries(nodes.map((n) => [n.id, n]))
  return (
    <div className="my-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[420px] mx-auto block select-none" style={{ height: 'auto' }}>
        <defs>
          <marker id="ar22" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="var(--color-muted-foreground)" />
          </marker>
          <marker id="arA22" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
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
                markerEnd={`url(#${on ? 'arA22' : 'ar22'})`}
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
              <text key={n.id} x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontStyle="italic" fill="var(--color-muted-foreground)">
                {n.label}
              </text>
            )
          }
          return (
            <g key={n.id} onClick={onPick ? () => onPick(n.id) : undefined} style={{ cursor: onPick ? 'pointer' : 'default', opacity: f.op ?? 1 }}>
              <circle cx={n.x} cy={n.y} r={r} fill={f.fill} stroke={f.stroke} strokeWidth={1.8} />
              <text x={n.x} y={n.sub ? n.y - 4 : n.y} textAnchor="middle" dominantBaseline="middle" fontSize="12.5" fontWeight={600} fill={f.text}>
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
 *  Reaching-definitions example (PDF p.67–68)
 * ------------------------------------------------------------------ */

const rdNodes: GNode[] = [
  { id: 'entry', x: 210, y: 26, label: 'entry', point: true },
  { id: 'B1', x: 210, y: 84, label: 'B1' },
  { id: 'B2', x: 210, y: 162, label: 'B2' },
  { id: 'B3', x: 110, y: 252, label: 'B3' },
  { id: 'B4', x: 310, y: 252, label: 'B4' },
  { id: 'exit', x: 310, y: 322, label: 'exit', point: true },
]
const rdEdges: GEdge[] = [
  { from: 'entry', to: 'B1' },
  { from: 'B1', to: 'B2' },
  { from: 'B2', to: 'B3' },
  { from: 'B2', to: 'B4' },
  { from: 'B3', to: 'B2', bend: -52 },
  { from: 'B4', to: 'B2', bend: 52 },
  { from: 'B4', to: 'exit' },
]

const rdLocal: Record<string, { defs: string[]; gen: string[]; kill: string[] }> = {
  B1: { defs: ['d1: i := m−1', 'd2: j := n', 'd3: a := u1'], gen: ['d1', 'd2', 'd3'], kill: ['d4', 'd5', 'd6', 'd7'] },
  B2: { defs: ['d4: i := i+1', 'd5: j := j−1'], gen: ['d4', 'd5'], kill: ['d1', 'd2', 'd7'] },
  B3: { defs: ['d6: a := u2'], gen: ['d6'], kill: ['d3'] },
  B4: { defs: ['d7: i := u3'], gen: ['d7'], kill: ['d1', 'd4'] },
}

type Maps = Record<string, string[]>
interface RdSnap {
  active: string | null
  iter: string
  /** value of the algorithm's change flag after this step */
  change: boolean
  /** pseudocode lines to highlight (1-based, see rdAlgoLines) */
  hl: number[]
  ins: Maps
  outs: Maps
  note: React.ReactNode
}

const D = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7']

const rdAlgoLines = [
  'for each block B: out[B] := gen[B]; in[B] := ∅',
  'change := true',
  'while change:',
  '    change := false',
  '    for B in B1, B2, B3, B4:',
  '        in[B]  := ∪ out[P] over preds P of B',
  '        out[B] := gen[B] ∪ (in[B] − kill[B])',
  '        if out[B] changed: change := true',
  'done — in/out are the solution',
]

const rdSnaps: RdSnap[] = [
  {
    active: null,
    iter: 'Init',
    change: true,
    hl: [1, 2],
    ins: { B1: [], B2: [], B3: [], B4: [] },
    outs: { B1: ['d1', 'd2', 'd3'], B2: ['d4', 'd5'], B3: ['d6'], B4: ['d7'] },
    note: (
      <>
        <strong>Initialisation.</strong> Every <Code>out[B] := gen[B]</Code> and every <Code>in[B] := ∅</Code> — we start
        from the <em>smallest</em> sets that could possibly be right, because the iteration only ever <em>adds</em>{' '}
        definitions (never removes). <Code>change := true</Code> just gets us into the while-loop. We will now sweep the
        blocks in the fixed order <Code>B1, B2, B3, B4</Code>, over and over, until one full sweep changes no{' '}
        <Code>out</Code> set.
      </>
    ),
  },
  {
    active: 'B1',
    iter: 'Pass 1',
    change: false,
    hl: [4, 6, 7],
    ins: { B1: [], B2: [], B3: [], B4: [] },
    outs: { B1: ['d1', 'd2', 'd3'], B2: ['d4', 'd5'], B3: ['d6'], B4: ['d7'] },
    note: (
      <>
        Pass 1 starts by resetting <Code>change := false</Code>. <Code>B1</Code> has <strong>no predecessors</strong>{' '}
        (only the entry point), so:
        <Formula>{`in[B1]  = ∅   (empty union)
out[B1] = gen[B1] ∪ (∅ − kill[B1]) = {d1,d2,d3}`}</Formula>
        <Code>out[B1]</Code> already had this value from the initialisation → <strong>no change</strong>, the flag stays{' '}
        <Code>false</Code>.
      </>
    ),
  },
  {
    active: 'B2',
    iter: 'Pass 1',
    change: true,
    hl: [6, 7, 8],
    ins: { B1: [], B2: ['d1', 'd2', 'd3', 'd6', 'd7'], B3: [], B4: [] },
    outs: { B1: ['d1', 'd2', 'd3'], B2: ['d3', 'd4', 'd5', 'd6'], B3: ['d6'], B4: ['d7'] },
    note: (
      <>
        Predecessors of <Code>B2</Code> are <Code>B1, B3, B4</Code> — the two <strong>back edges</strong> count too! The
        current (initial) values <Code>out[B3] = {'{d6}'}</Code> and <Code>out[B4] = {'{d7}'}</Code> flow in even though
        those blocks haven't been visited yet this pass:
        <Formula>{`in[B2]  = out[B1] ∪ out[B3] ∪ out[B4]
        = {d1,d2,d3} ∪ {d6} ∪ {d7} = {d1,d2,d3,d6,d7}
out[B2] = gen[B2] ∪ (in[B2] − kill[B2])
        = {d4,d5} ∪ ({d1,d2,d3,d6,d7} − {d1,d2,d7})
        = {d3,d4,d5,d6}`}</Formula>
        <Code>out[B2]</Code> grew from <Code>{'{d4,d5}'}</Code> → <Code>change := true</Code>.
      </>
    ),
  },
  {
    active: 'B3',
    iter: 'Pass 1',
    change: true,
    hl: [6, 7, 8],
    ins: { B1: [], B2: ['d1', 'd2', 'd3', 'd6', 'd7'], B3: ['d3', 'd4', 'd5', 'd6'], B4: [] },
    outs: { B1: ['d1', 'd2', 'd3'], B2: ['d3', 'd4', 'd5', 'd6'], B3: ['d4', 'd5', 'd6'], B4: ['d7'] },
    note: (
      <>
        <Code>B3</Code>'s only predecessor is <Code>B2</Code> — and we use <Code>B2</Code>'s <em>fresh</em> value from a
        moment ago (that's what makes this visit order converge fast):
        <Formula>{`in[B3]  = out[B2] = {d3,d4,d5,d6}
out[B3] = {d6} ∪ ({d3,d4,d5,d6} − {d3}) = {d4,d5,d6}`}</Formula>
        <Code>d3</Code> arrives in <Code>in[B3]</Code> but is <strong>killed</strong> by <Code>d6</Code> (both define{' '}
        <Code>a</Code>). <Code>out[B3]</Code> grew → the flag is (still) <Code>true</Code>.
      </>
    ),
  },
  {
    active: 'B4',
    iter: 'Pass 1',
    change: true,
    hl: [6, 7, 8],
    ins: { B1: [], B2: ['d1', 'd2', 'd3', 'd6', 'd7'], B3: ['d3', 'd4', 'd5', 'd6'], B4: ['d3', 'd4', 'd5', 'd6'] },
    outs: { B1: ['d1', 'd2', 'd3'], B2: ['d3', 'd4', 'd5', 'd6'], B3: ['d4', 'd5', 'd6'], B4: ['d3', 'd5', 'd6', 'd7'] },
    note: (
      <>
        <Code>B4</Code>'s only predecessor is <Code>B2</Code>:
        <Formula>{`in[B4]  = out[B2] = {d3,d4,d5,d6}
out[B4] = {d7} ∪ ({d3,d4,d5,d6} − {d1,d4}) = {d3,d5,d6,d7}`}</Formula>
        <Code>d4</Code> is killed (<Code>d7</Code> also defines <Code>i</Code>). <strong>End of pass 1</strong>: three out
        sets changed, so <Code>change = true</Code> → the while-loop runs a second pass.
      </>
    ),
  },
  {
    active: 'B1',
    iter: 'Pass 2',
    change: false,
    hl: [4, 6, 7],
    ins: { B1: [], B2: ['d1', 'd2', 'd3', 'd6', 'd7'], B3: ['d3', 'd4', 'd5', 'd6'], B4: ['d3', 'd4', 'd5', 'd6'] },
    outs: { B1: ['d1', 'd2', 'd3'], B2: ['d3', 'd4', 'd5', 'd6'], B3: ['d4', 'd5', 'd6'], B4: ['d3', 'd5', 'd6', 'd7'] },
    note: (
      <>
        Pass 2: reset <Code>change := false</Code> and sweep again. <Code>B1</Code> still has no predecessors —{' '}
        <Code>in[B1] = ∅</Code>, <Code>out[B1] = {'{d1,d2,d3}'}</Code>, nothing to do. (Blocks whose inputs didn't change
        can never produce a new output: <Code>out[B]</Code> is a <em>function</em> of <Code>in[B]</Code>.)
      </>
    ),
  },
  {
    active: 'B2',
    iter: 'Pass 2',
    change: false,
    hl: [6, 7, 8],
    ins: { B1: [], B2: D, B3: ['d3', 'd4', 'd5', 'd6'], B4: ['d3', 'd4', 'd5', 'd6'] },
    outs: { B1: ['d1', 'd2', 'd3'], B2: ['d3', 'd4', 'd5', 'd6'], B3: ['d4', 'd5', 'd6'], B4: ['d3', 'd5', 'd6', 'd7'] },
    note: (
      <>
        The interesting step. <Code>out[B3]</Code> and <Code>out[B4]</Code> grew during pass 1, so <Code>in[B2]</Code> now
        absorbs them and becomes the <strong>full universe</strong> <Code>D = {'{d1…d7}'}</Code>:
        <Formula>{`in[B2]  = {d1,d2,d3} ∪ {d4,d5,d6} ∪ {d3,d5,d6,d7} = D
out[B2] = {d4,d5} ∪ (D − {d1,d2,d7}) = {d3,d4,d5,d6}`}</Formula>
        <Code>in[B2]</Code> changed, but <Code>out[B2]</Code> recomputes to the <strong>same</strong> value — the kill set
        absorbs the newcomers. The flag watches <em>out</em> sets only (each <Code>in</Code> is recomputed from the outs
        anyway), so <Code>change</Code> stays <Code>false</Code>.
      </>
    ),
  },
  {
    active: 'B3',
    iter: 'Pass 2',
    change: false,
    hl: [6, 7, 8],
    ins: { B1: [], B2: D, B3: ['d3', 'd4', 'd5', 'd6'], B4: ['d3', 'd4', 'd5', 'd6'] },
    outs: { B1: ['d1', 'd2', 'd3'], B2: ['d3', 'd4', 'd5', 'd6'], B3: ['d4', 'd5', 'd6'], B4: ['d3', 'd5', 'd6', 'd7'] },
    note: (
      <>
        <Code>in[B3] = out[B2] = {'{d3,d4,d5,d6}'}</Code> — exactly what it was in pass 1, because <Code>out[B2]</Code>{' '}
        didn't change. So <Code>out[B3]</Code> recomputes to <Code>{'{d4,d5,d6}'}</Code>, also unchanged.{' '}
        <Code>change</Code> stays <Code>false</Code>.
      </>
    ),
  },
  {
    active: 'B4',
    iter: 'Pass 2',
    change: false,
    hl: [6, 7, 8],
    ins: { B1: [], B2: D, B3: ['d3', 'd4', 'd5', 'd6'], B4: ['d3', 'd4', 'd5', 'd6'] },
    outs: { B1: ['d1', 'd2', 'd3'], B2: ['d3', 'd4', 'd5', 'd6'], B3: ['d4', 'd5', 'd6'], B4: ['d3', 'd5', 'd6', 'd7'] },
    note: (
      <>
        Same story for <Code>B4</Code>: <Code>in[B4] = out[B2]</Code> is unchanged, so <Code>out[B4]</Code> is unchanged.{' '}
        <strong>End of pass 2</strong> with <Code>change = false</Code> — a complete sweep in which no out set moved.
      </>
    ),
  },
  {
    active: null,
    iter: 'Done',
    change: false,
    hl: [3, 9],
    ins: { B1: [], B2: D, B3: ['d3', 'd4', 'd5', 'd6'], B4: ['d3', 'd4', 'd5', 'd6'] },
    outs: { B1: ['d1', 'd2', 'd3'], B2: ['d3', 'd4', 'd5', 'd6'], B3: ['d4', 'd5', 'd6'], B4: ['d3', 'd5', 'd6', 'd7'] },
    note: (
      <>
        The while-condition fails → <Good>fixpoint reached</Good>; the table is the final reaching-definitions solution.{' '}
        <strong>Why it terminates:</strong> every <Code>out[B]</Code> only ever grows (the equations are monotone) and is
        bounded by the finite universe <Code>D</Code>, so at most <Code>|D| · #blocks</Code> growth steps can happen.{' '}
        <strong>Why it's right:</strong> when nothing changes, every equation holds simultaneously — and starting from ∅
        makes this the <em>smallest</em> such solution (no spurious definitions).
      </>
    ),
  },
]

/** set with elements that are new vs. the previous snapshot highlighted */
const SetDiff: React.FC<{ xs: string[]; prev?: string[] }> = ({ xs, prev }) => {
  if (!xs.length) return <span className="font-mono">∅</span>
  return (
    <span className="font-mono">
      {'{'}
      {xs.map((x, k) => (
        <React.Fragment key={x}>
          {k > 0 && ', '}
          <span className={cn(prev && !prev.includes(x) && 'text-emerald-600 dark:text-emerald-400 font-bold')}>
            {sub(x)}
          </span>
        </React.Fragment>
      ))}
      {'}'}
    </span>
  )
}

const ReachingIteration: React.FC = () => {
  const [i, setI] = useState(0)
  const snap = rdSnaps[i]
  const prev = i > 0 ? rdSnaps[i - 1] : undefined
  const go = (d: number) => setI((p) => Math.max(0, Math.min(rdSnaps.length - 1, p + d)))
  const fillOf = (id: string): Fill => (id === snap.active ? 'active' : 'none')
  const activeEdges =
    snap.active && snap.active !== null ? rdEdges.filter((e) => e.to === snap.active).map(edgeKey) : []
  const outChanged = (b: string) => prev !== undefined && b === snap.active && prev.outs[b].length !== snap.outs[b].length

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{snap.iter}</span>
        {snap.active && (
          <span className="px-2 py-0.5 rounded-full bg-muted font-mono">
            updating {snap.active}
          </span>
        )}
        <span
          className={cn(
            'px-2 py-0.5 rounded-full font-mono font-semibold',
            snap.change
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          )}
        >
          change = {String(snap.change)}
        </span>
        <span className="text-muted-foreground">
          new elements this step are shown in <span className="text-emerald-600 dark:text-emerald-400 font-bold">green</span>
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <div>
          <FlowGraph nodes={rdNodes} edges={rdEdges} width={420} height={360} fillOf={fillOf} activeEdges={activeEdges} />
          <div className="bg-muted border rounded-lg p-2.5 text-[11.5px] font-mono leading-[1.6] mt-2 overflow-x-auto">
            {rdAlgoLines.map((l, k) => (
              <div
                key={k}
                className={cn(
                  'whitespace-pre rounded px-1 -mx-1',
                  snap.hl.includes(k + 1)
                    ? 'bg-primary/15 text-foreground font-semibold'
                    : 'text-muted-foreground',
                )}
              >
                {l}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className="bg-muted px-2 py-1 text-left font-medium border-b">B</th>
                  <th className="bg-muted px-2 py-1 text-left font-medium border-b">in[B]</th>
                  <th className="bg-muted px-2 py-1 text-left font-medium border-b">out[B]</th>
                </tr>
              </thead>
              <tbody>
                {['B1', 'B2', 'B3', 'B4'].map((b) => (
                  <tr key={b} className={cn('border-b last:border-b-0', b === snap.active && 'bg-primary/10')}>
                    <td className="px-2 py-1 font-mono font-semibold">
                      {b}
                      {outChanged(b) && (
                        <span className="ml-1.5 text-[10px] font-sans font-semibold text-amber-600 dark:text-amber-400">
                          out grew!
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      <SetDiff xs={snap.ins[b]} prev={prev?.ins[b]} />
                    </td>
                    <td className="px-2 py-1">
                      <SetDiff xs={snap.outs[b]} prev={prev?.outs[b]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Panel className="text-sm mt-2">{snap.note}</Panel>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={i === 0}>
          ← back
        </Button>
        <span className="flex-1 text-center text-xs text-muted-foreground">
          step {i + 1} of {rdSnaps.length}
        </span>
        <Button variant="outline" size="sm" onClick={() => go(1)} disabled={i === rdSnaps.length - 1}>
          next →
        </Button>
      </div>
      <Progress value={Math.round(((i + 1) / rdSnaps.length) * 100)} className="mt-3" />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  gen / kill explorer for the reaching-definitions blocks
 * ------------------------------------------------------------------ */

const GenKillExplorer: React.FC = () => {
  const [sel, setSel] = useState('B2')
  const L = rdLocal[sel]
  return (
    <div>
      <p className="text-sm mb-2">Click a block to see its statements and local sets.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <FlowGraph nodes={rdNodes} edges={rdEdges} width={420} height={360} fillOf={(id) => (id === sel ? 'active' : 'none')} onPick={(id) => rdLocal[id] && setSel(id)} />
        <div>
          <Panel className="text-sm">
            <div className="font-mono text-[12px] whitespace-pre">{L.defs.join('\n')}</div>
            <div className="mt-2">
              <span className="text-muted-foreground">gen[{sel}] = </span>
              <SetT xs={L.gen} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <span className="text-muted-foreground">kill[{sel}] = </span>
              <SetT xs={L.kill} className="text-red-600 dark:text-red-400" />
            </div>
          </Panel>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>gen</strong> = definitions made here that survive to the block's end. <strong>kill</strong> = every{' '}
            <em>other</em> definition (anywhere in the program) of a variable this block re-defines.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  Structural equations (the four S-cases)
 * ------------------------------------------------------------------ */

const caseSteps: StepPanel[] = [
  {
    title: '1 · Single assignment   S : a := b + c',
    body: (
      <>
        <Formula>{`gen[S]  = {d}
kill[S] = Da \\ {d}        (Da = all defs of a in the program)
out[S]  = gen[S] ∪ (in[S] \\ kill[S])`}</Formula>
        <p className="text-sm">
          The one definition <Code>d</Code> is generated; every other definition of <Code>a</Code> is killed.
        </p>
      </>
    ),
  },
  {
    title: '2 · Sequence   S : S₁ ; S₂',
    body: (
      <>
        <Formula>{`gen[S]  = gen[S2] ∪ (gen[S1] \\ kill[S2])
kill[S] = kill[S2] ∪ (kill[S1] \\ gen[S2])
in[S1]  = in[S]      in[S2] = out[S1]      out[S] = out[S2]`}</Formula>
        <p className="text-sm">
          A definition from <Code>S₁</Code> only survives if <Code>S₂</Code> does not kill it; info flows{' '}
          <em>through</em> the sequence.
        </p>
      </>
    ),
  },
  {
    title: '3 · Branch   S : if E then S₁ else S₂',
    body: (
      <>
        <Formula>{`gen[S]  = gen[S1] ∪ gen[S2]     (either branch may run)
kill[S] = kill[S1] ∩ kill[S2]   (killed only if BOTH kill)
in[S1] = in[S]   in[S2] = in[S]   out[S] = out[S1] ∪ out[S2]`}</Formula>
        <p className="text-sm">
          gen is a <strong>union</strong> (a def from either arm reaches the merge); kill is an{' '}
          <strong>intersection</strong> (a def is only guaranteed dead if every arm kills it).
        </p>
      </>
    ),
  },
  {
    title: '4 · Loop   S : do S₁ while E',
    body: (
      <>
        <Formula>{`gen[S]  = gen[S1]      kill[S] = kill[S1]
in[S1]  = in[S] ∪ gen[S1]      (back edge feeds gen[S1] back in)
out[S]  = out[S1] = gen[S1] ∪ (in[S1] \\ kill[S1])`}</Formula>
        <p className="text-sm">
          The back edge means definitions generated in the body also reach the body's <em>entry</em> — that's the extra{' '}
          <Code>∪ gen[S1]</Code> term.
        </p>
      </>
    ),
  },
]

/* ------------------------------------------------------------------ *
 *  Available expressions — block trace (PDF p.73)
 * ------------------------------------------------------------------ */

const availSteps: StepPanel[] = [
  {
    title: 'p₀  —  A = ∅',
    body: <p className="text-sm">Start of the block: no expression has been computed yet.</p>,
  },
  {
    title: 'a := b + c   →   p₁  A = {b+c}',
    body: (
      <p className="text-sm">
        Step 1: add the right-hand side <Code>b+c</Code>. Step 2: remove anything containing <Code>a</Code> — none. So{' '}
        <Code>A = {'{b+c}'}</Code>.
      </p>
    ),
  },
  {
    title: 'b := a − d   →   p₂  A = {a−d}',
    body: (
      <p className="text-sm">
        Add <Code>a−d</Code>; then remove every expression containing <Code>b</Code> — that kills <Code>b+c</Code>. Left
        with <Code>{'{a−d}'}</Code>.
      </p>
    ),
  },
  {
    title: 'c := b + c   →   p₃  A = {a−d}',
    body: (
      <p className="text-sm">
        Add <Code>b+c</Code>, then remove expressions containing <Code>c</Code> — that immediately removes the{' '}
        <Code>b+c</Code> we just added. <Code>a−d</Code> survives, so <Code>A = {'{a−d}'}</Code>.
      </p>
    ),
  },
  {
    title: 'd := a − d   →   p₄  A = ∅',
    body: (
      <p className="text-sm">
        Add <Code>a−d</Code>, then remove expressions containing <Code>d</Code> — that kills <Code>a−d</Code> itself. The
        order (add then kill) matters because <Code>E</Code> may contain the assigned variable. Result <Code>A = ∅</Code>.
      </p>
    ),
  },
]

/* available-expressions diamonds (justification, PDF p.76) */
const diaAllowNodes: GNode[] = [
  { id: 't', x: 110, y: 24, label: '·', point: true },
  { id: 'L', x: 56, y: 92, label: 'L', sub: 'i:=1' },
  { id: 'R', x: 164, y: 92, label: 'R' },
  { id: 'M', x: 110, y: 168, label: 'M' },
]
const diaEdges: GEdge[] = [
  { from: 't', to: 'L' },
  { from: 't', to: 'R' },
  { from: 'L', to: 'M' },
  { from: 'R', to: 'M' },
]

/* ------------------------------------------------------------------ *
 *  Live variables — backward worked example (PDF p.82)
 * ------------------------------------------------------------------ */

const lvNodes: GNode[] = [
  { id: 'entry', x: 150, y: 24, label: 'entry', point: true },
  { id: 'B1', x: 150, y: 80, label: 'B1' },
  { id: 'B2', x: 150, y: 158, label: 'B2' },
  { id: 'B3', x: 150, y: 236, label: 'B3' },
  { id: 'exit', x: 150, y: 292, label: 'exit', point: true },
]
const lvEdges: GEdge[] = [
  { from: 'entry', to: 'B1' },
  { from: 'B1', to: 'B2' },
  { from: 'B2', to: 'B2', bend: 0 },
  { from: 'B2', to: 'B3' },
  { from: 'B3', to: 'exit' },
]

const lvSteps: StepPanel[] = [
  {
    title: 'Local sets def / use, and direction',
    body: (
      <>
        <p className="text-sm mb-2">
          Live variables is a <strong>backward</strong> problem: we push information from successors back to predecessors.
        </p>
        <Formula>{`in[B]  = use[B] ∪ (out[B] \\ def[B])
out[B] = ∪  in[S]   over successors S of B`}</Formula>
        <Table
          head={['Block', 'code', 'def', 'use']}
          rows={[
            ['B1', 'a:=2; b:=3', '{a,b}', '{ }'],
            ['B2', 'c:=a+b; c>100', '{c}', '{a,b}'],
            ['B3', 'print(a,c)', '{ }', '{a,c}'],
          ]}
        />
        <p className="text-xs text-muted-foreground">
          B2 loops to itself (the <Code>while</Code>) and also exits to B3. Initialise every <Code>in[B] = ∅</Code>.
        </p>
      </>
    ),
  },
  {
    title: 'B3 (process last block first)',
    body: (
      <>
        <Formula>{`out[B3] = ∅            (only successor is exit)
in[B3]  = use ∪ (out \\ def) = {a,c} ∪ (∅ \\ ∅) = {a,c}`}</Formula>
        <p className="text-sm">
          <Code>a</Code> and <Code>c</Code> are read by <Code>print</Code> with no prior definition → both live entering B3.
        </p>
      </>
    ),
  },
  {
    title: 'B2 (has a self-loop → needs the fixpoint)',
    body: (
      <>
        <Formula>{`out[B2] = in[B3] ∪ in[B2]
in[B2]  = {a,b} ∪ (out[B2] \\ {c})`}</Formula>
        <p className="text-sm mb-1">Iterate from <Code>in[B2]=∅</Code>:</p>
        <Table
          head={['', 'out[B2]', 'in[B2]']}
          rows={[
            ['pass 1', '{a,c}', '{a,b}'],
            ['pass 2', '{a,b,c}', '{a,b}  (stable)'],
          ]}
        />
        <p className="text-xs text-muted-foreground">
          <Code>c</Code> is in out[B2] (used next iteration) but not in[B2], because B2 re-defines <Code>c</Code> before using it.
        </p>
      </>
    ),
  },
  {
    title: 'B1 and the result',
    body: (
      <>
        <Formula>{`out[B1] = in[B2] = {a,b}
in[B1]  = {} ∪ ({a,b} \\ {a,b}) = ∅`}</Formula>
        <FlowGraph
          nodes={lvNodes}
          edges={lvEdges}
          width={300}
          height={320}
          fillOf={() => 'none'}
        />
        <Table
          head={['B', 'in[B]', 'out[B]']}
          rows={[
            ['B1', '∅', '{a, b}'],
            ['B2', '{a, b}', '{a, b, c}'],
            ['B3', '{a, c}', '∅'],
          ]}
        />
        <p className="text-sm">
          Use: at the end of B1 only <Good>a, b</Good> are live, so only those must be kept in registers / written back.
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
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors rounded-t-xl">
        <span className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">{n}</span>
        <span className="flex-1 font-medium text-sm">{title}</span>
        <span className={cn('shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full', diffClass[diff])}>{diff}</span>
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
        <CardTitle className="text-base">What is data flow analysis?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Control-flow analysis (§2.1) gave us the flow graph. <strong>Data flow analysis</strong> now computes{' '}
          <em>global</em> information about how statements create and use data — the basis for safe,
          correctness-preserving transformations.
        </p>
        <Panel className="text-sm leading-relaxed">
          <strong>Approach:</strong> build <em>sets of program objects</em> (definitions, expressions, variables) that
          hold a given property at specific program points. Which sets and which property depends on the problem.
        </Panel>
        <p className="text-sm mt-2">
          The unknowns are sets attached to each basic block; they satisfy <strong>recursive data flow equations</strong>{' '}
          that we solve by iteration.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leading example: reaching definitions</CardTitle>
      </CardHeader>
      <CardContent>
        <Panel className="text-sm leading-relaxed">
          A <strong>definition</strong> <Code>d</Code> (an assignment <Code>x := v</Code>) <strong>reaches</strong> a
          program point <Code>p</Code> if there is a path from <Code>d</Code> to <Code>p</Code> on which <Code>d</Code> is
          not <em>destroyed</em> (no other assignment to <Code>x</Code>).
        </Panel>
        <p className="text-sm mt-2">
          <strong>Use:</strong> if every definition of <Code>x</Code> reaching <Code>p</Code> assigns the value <Code>1</Code>,
          then <Code>x</Code> can be replaced by the constant <Code>1</Code> at <Code>p</Code> (constant propagation).
        </p>
        <p className="text-sm mt-2">
          The statements considered build flow graphs from this grammar:
        </p>
        <Formula>{`S → id := E  |  S ; S  |  if E then S else S  |  do S while E`}</Formula>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conservative ("safe") computation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          All paths are assumed traversable at compile time, even though runtime inputs may make some impossible. So the
          computed sets are <strong>over-approximations</strong>.
        </p>
        <Table
          head={['', 'Consequence']}
          rows={[
            ['May happen', 'a possible optimization is missed (extra reaching definitions computed)'],
            ['Never happens', 'an unsafe transformation that changes program behaviour'],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-2">
          → the analysis is <strong>conservative</strong>; the resulting transformations are <Good>safe</Good>.
        </p>
      </CardContent>
    </Card>
  </div>
)

const ReachingSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Local sets: gen and kill</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Set', 'Meaning']}
          rows={[
            [<Code>gen[B]</Code>, 'definitions made inside B that reach the end of B'],
            [<Code>kill[B]</Code>, 'definitions (anywhere) that never survive to the end of B because B re-defines their variable on every path'],
            [<Code>in[B]</Code>, 'definitions reaching the start of B (global)'],
            [<Code>out[B]</Code>, 'definitions reaching the end of B (global)'],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          gen / kill are <em>local</em> (derived attributes of the block); in / out are <em>global</em> (depend on the
          whole flow graph).
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — gen &amp; kill per block</CardTitle>
      </CardHeader>
      <CardContent>
        <GenKillExplorer />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Structural equations — the four S-cases</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          gen / kill (and in / out) can be built recursively over the syntax of <Code>S</Code>. Step through each form:
        </p>
        <Stepper steps={caseSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

const IterationSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The iterative algorithm</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-1">
          For a general reducible flow graph (gen / kill already known) iterate two equations to a fixpoint:
        </p>
        <Formula>{`in[B]  := ∪  out[P]    over predecessors P of B
out[B] := gen[B] ∪ (in[B] − kill[B])`}</Formula>
        <Pre>{`for each block B:  out[B] := gen[B]
change := true
while change:
    change := false
    for each block B:
        in[B]  := ∪ over preds P of B  out[P]
        oldout := out[B]
        out[B] := gen[B] ∪ (in[B] − kill[B])
        if out[B] ≠ oldout: change := true`}</Pre>
        <p className="text-xs text-muted-foreground">
          <strong>Terminates</strong> because every out[B] only grows, and the set of definitions is finite. When no out
          set changes, no in set can change either.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">How to run it by hand (exam recipe)</CardTitle>
      </CardHeader>
      <CardContent>
        <Step n={1}>
          <strong>Local sets first.</strong> For every block compute <Code>gen[B]</Code> (definitions in B that survive
          to its end) and <Code>kill[B]</Code> (all <em>other</em> definitions of the variables B re-defines). These
          never change again.
        </Step>
        <Step n={2}>
          <strong>Initialise.</strong> Draw a table with one row per block and columns <Code>in</Code> / <Code>out</Code>.
          Set <Code>out[B] := gen[B]</Code>, <Code>in[B] := ∅</Code>.
        </Step>
        <Step n={3}>
          <strong>Sweep.</strong> Visit the blocks in a fixed order. For each block first form{' '}
          <Code>in[B] = ∪ out[P]</Code> over <em>all</em> predecessors (back edges included — use whatever value their
          out set has <em>right now</em>), then <Code>out[B] = gen[B] ∪ (in[B] − kill[B])</Code>. Mark whether{' '}
          <Code>out[B]</Code> changed.
        </Step>
        <Step n={4}>
          <strong>Repeat until stable.</strong> If any out set changed during the sweep, do another full sweep. Stop
          after the first sweep in which <em>no</em> out set changes — the table is the solution.
        </Step>
        <Panel className="text-xs text-muted-foreground leading-relaxed">
          Practical tips: only blocks whose predecessors' out sets changed can change themselves — everything else can be
          copied down. Sets only ever <em>grow</em>, so if an element ever appears it never disappears; if one of your
          sets shrinks between passes, you made an arithmetic slip.
        </Panel>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — step through the whole iteration</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The lecture's four-block loop, executed by the algorithm above. The left panel shows which pseudocode lines are
          running; the table shows every in/out set with this step's additions in green; the <Code>change</Code> badge
          tracks the flag that decides whether another pass is needed.
        </p>
        <ReachingIteration />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Inside a block + bitvectors</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-1">
          in / out are computed only at block boundaries. To get the information at a point <Code>pᵢ</Code> inside a
          block, propagate forward statement by statement:
        </p>
        <Formula>{`IN(p0) = IN(B)
IN(pi) = (IN(pi−1) \\ kill(Si)) ∪ gen(Si)`}</Formula>
        <p className="text-sm mt-3 mb-1">
          <strong>Bitvectors.</strong> Number the definition points <Code>0…n−1</Code>; a set is a length-<Code>n</Code>{' '}
          bitvector with bit <Code>i</Code> = 1 iff definition <Code>i</Code> is in the set.
        </p>
        <Table
          head={['Set op', 'Bit op']}
          rows={[
            ['union  A ∪ B', 'A or B'],
            ['intersection  A ∩ B', 'A and B'],
            ['difference  A \\ B', 'A and (not B)'],
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">→ data flow sets are manipulated by fast machine-word bit operations.</p>
      </CardContent>
    </Card>
  </div>
)

const AvailableSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Available expressions (forward · intersection)</CardTitle>
      </CardHeader>
      <CardContent>
        <Panel className="text-sm leading-relaxed">
          An expression <Code>E</Code> is <strong>available</strong> at point <Code>p</Code> if <em>every</em> path from
          the start to <Code>p</Code> evaluates <Code>E</Code>, and after the last evaluation no variable of <Code>E</Code>{' '}
          is reassigned.
        </Panel>
        <p className="text-sm mt-2">
          <strong>Use:</strong> finding common subexpressions — if <Code>E</Code> is available, a recomputation can be
          replaced by the earlier result.
        </p>
        <Formula>{`out[B] = e-gen[B] ∪ (in[B] \\ e-kill[B])
in[B]  = ∩  out[P]   over preds P  (∅ for the start node)`}</Formula>
        <p className="text-sm">
          <strong>Difference to reaching definitions:</strong> at a merge we use <strong>intersection</strong>, not union —
          an expression counts only if it survives along <em>all</em> incoming paths. Initialise{' '}
          <Code>out[B] := U \\ e-kill[B]</Code> for non-start blocks (<Code>U</Code> = all right-hand-side expressions).
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — trace a block, add-then-kill</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={availSteps} showProgress />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Why intersection is the safe choice</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Panel>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">replacement allowed</div>
            <FlowGraph nodes={diaAllowNodes} edges={diaEdges} width={220} height={210} caption="t₁:=4·i on both paths" />
            <p className="text-xs text-muted-foreground">
              Both predecessors compute <Code>4·i</Code> with no later change to <Code>i</Code> → available at the merge →
              reuse is safe.
            </p>
          </Panel>
          <Panel>
            <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">replacement NOT allowed</div>
            <FlowGraph
              nodes={[
                { id: 't', x: 110, y: 24, label: '·', point: true },
                { id: 'L', x: 56, y: 92, label: 'L', sub: 'i:=1' },
                { id: 'R', x: 164, y: 92, label: 'R' },
                { id: 'M', x: 110, y: 168, label: 'M' },
              ]}
              edges={diaEdges}
              width={220}
              height={210}
              caption="left path redefines i"
            />
            <p className="text-xs text-muted-foreground">
              The left path sets <Code>i:=1</Code> after computing <Code>4·i</Code>, so the value differs on that path →
              intersection excludes it → no reuse.
            </p>
          </Panel>
        </div>
      </CardContent>
    </Card>
  </div>
)

const LiveSection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Live variables (backward · union)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          The first <strong>backward</strong> problem: information flows opposite to control flow.
        </p>
        <Panel className="text-sm leading-relaxed">
          A variable <Code>x</Code> is <strong>live</strong> at <Code>p</Code> if some path from <Code>p</Code> reaches a
          <em> use</em> of <Code>x</Code> with no intervening (re)definition. Otherwise <Code>x</Code> is <strong>dead</strong>.
        </Panel>
        <p className="text-sm mt-2">
          <strong>Use:</strong> register allocation / code generation — at a block's end only live variables need to be
          written back to memory.
        </p>
        <Table
          head={['Local set', 'Meaning']}
          rows={[
            [<Code>use[B]</Code>, 'variables used in B before any (re)definition in B'],
            [<Code>def[B]</Code>, 'variables assigned in B before any use in B'],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — backward worked example</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={lvSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

const SummarySection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Very busy expressions (backward · intersection)</CardTitle>
      </CardHeader>
      <CardContent>
        <Panel className="text-sm leading-relaxed">
          An expression <Code>E</Code> is <strong>very busy</strong> at <Code>p</Code> if on <em>every</em> path from{' '}
          <Code>p</Code>, <Code>E</Code> is used before any of its variables is redefined.
        </Panel>
        <p className="text-sm mt-2">
          → its value will definitely be needed, so it is worth computing early and keeping in a register (code hoisting).
        </p>
        <Formula>{`out[B] = ∩  in[S]   over successors S of B
in[B]  = used[B] ∪ (out[B] \\ killed[B])`}</Formula>
        <Table
          head={['Local set', 'Meaning']}
          rows={[
            [<Code>used[B]</Code>, 'expressions used in B before a variable in them is reassigned'],
            [<Code>killed[B]</Code>, 'expressions destroyed in B before they are used'],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The big picture — four classic problems</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto my-1">
          <table className="w-full text-[13px] border-collapse min-w-[340px]">
            <thead>
              <tr>
                <th className="bg-muted px-2.5 py-1.5 text-left font-medium border-b"></th>
                <th className="bg-muted px-2.5 py-1.5 text-center font-medium border-b">forward flow</th>
                <th className="bg-muted px-2.5 py-1.5 text-center font-medium border-b">backward flow</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-2.5 py-2 align-middle font-medium">
                  union<br />
                  <span className="text-xs text-muted-foreground">(over any path)</span>
                </td>
                <td className="px-2.5 py-2 text-center text-emerald-600 dark:text-emerald-400 font-medium">reaching definitions</td>
                <td className="px-2.5 py-2 text-center text-emerald-600 dark:text-emerald-400 font-medium">live variables</td>
              </tr>
              <tr>
                <td className="px-2.5 py-2 align-middle font-medium">
                  intersection<br />
                  <span className="text-xs text-muted-foreground">(over all paths)</span>
                </td>
                <td className="px-2.5 py-2 text-center text-amber-600 dark:text-amber-400 font-medium">available expressions</td>
                <td className="px-2.5 py-2 text-center text-amber-600 dark:text-amber-400 font-medium">very busy expressions</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm mt-3 mb-1">Two knobs fully classify each analysis:</p>
        <Step n="↕">
          <strong>Direction</strong> — forward (combine over <em>predecessors</em>, propagate to the end) vs. backward
          (combine over <em>successors</em>, propagate to the start).
        </Step>
        <Step n="∪∩">
          <strong>Merge</strong> — union (a property that holds on <em>some</em> path) vs. intersection (must hold on{' '}
          <em>all</em> paths). Intersection problems initialise to the full set <Code>U</Code>; union problems to <Code>∅</Code>.
        </Step>
        <Formula>{`forward :  combine over preds,  then  out = f(in)
backward:  combine over succs,  then  in  = f(out)`}</Formula>
      </CardContent>
    </Card>
  </div>
)

/* ------------------------------------------------------------------ *
 *  Questions
 * ------------------------------------------------------------------ */

// Q1 worked-example flow graph
const q1Nodes: GNode[] = [
  { id: 'entry', x: 150, y: 24, label: 'entry', point: true },
  { id: 'B1', x: 150, y: 80, label: 'B1' },
  { id: 'B2', x: 150, y: 158, label: 'B2' },
  { id: 'B3', x: 260, y: 158, label: 'B3' },
  { id: 'exit', x: 150, y: 236, label: 'exit', point: true },
]
const q1Edges: GEdge[] = [
  { from: 'entry', to: 'B1' },
  { from: 'B1', to: 'B2' },
  { from: 'B2', to: 'B3' },
  { from: 'B3', to: 'B2', bend: 56 },
  { from: 'B2', to: 'exit' },
]

// Q3 available-expressions diamond
const q3Nodes: GNode[] = [
  { id: 'B1', x: 150, y: 28, label: 'B1' },
  { id: 'B2', x: 80, y: 116, label: 'B2' },
  { id: 'B3', x: 220, y: 116, label: 'B3' },
  { id: 'B4', x: 150, y: 204, label: 'B4' },
]
const q3Edges: GEdge[] = [
  { from: 'B1', to: 'B2' },
  { from: 'B1', to: 'B3' },
  { from: 'B2', to: 'B4' },
  { from: 'B3', to: 'B4' },
]

// Q4 live-variables flow graph
const q4Nodes: GNode[] = [
  { id: 'entry', x: 150, y: 22, label: 'entry', point: true },
  { id: 'B1', x: 150, y: 74, label: 'B1' },
  { id: 'B2', x: 150, y: 148, label: 'B2' },
  { id: 'B3', x: 60, y: 224, label: 'B3' },
  { id: 'B4', x: 240, y: 224, label: 'B4' },
  { id: 'exit', x: 240, y: 294, label: 'exit', point: true },
]
const q4Edges: GEdge[] = [
  { from: 'entry', to: 'B1' },
  { from: 'B1', to: 'B2' },
  { from: 'B2', to: 'B3' },
  { from: 'B2', to: 'B4' },
  { from: 'B3', to: 'B2', bend: -56 },
  { from: 'B4', to: 'exit' },
]

// Q5 very-busy flow graph
const q5Nodes: GNode[] = [
  { id: 'B1', x: 150, y: 28, label: 'B1' },
  { id: 'B2', x: 80, y: 116, label: 'B2' },
  { id: 'B3', x: 220, y: 116, label: 'B3' },
  { id: 'B4', x: 150, y: 204, label: 'B4' },
]
const q5Edges: GEdge[] = [
  { from: 'B1', to: 'B2' },
  { from: 'B1', to: 'B3' },
  { from: 'B2', to: 'B4' },
  { from: 'B3', to: 'B4' },
]

const QuestionsSection: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five written-exam-style problems, easy → hardest. Question 1 is fully worked to set the pattern; for the rest, do it
      on paper first, then reveal.
    </p>

    {/* Q1 — worked */}
    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Reaching definitions: full iteration to a fixpoint"
      statement={
        <>
          <p className="mb-2">For the flow graph below, with definitions</p>
          <Pre>{`B1:  d1: a := 1     d2: b := 2
B2:  d3: a := a + b
B3:  d4: b := b + 1`}</Pre>
          <FlowGraph nodes={q1Nodes} edges={q1Edges} width={300} height={264} />
          <p>(a) Give gen/kill for each block. (b) Run the iterative algorithm and give the final in/out sets.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Local sets</p>
          <p className="text-xs text-muted-foreground mb-1">
            Defs of <Code>a</Code>: {'{d1, d3}'}; defs of <Code>b</Code>: {'{d2, d4}'}.
          </p>
          <Table
            head={['B', 'gen', 'kill']}
            rows={[
              ['B1', '{d1, d2}', '{d3, d4}'],
              ['B2', '{d3}', '{d1}'],
              ['B3', '{d4}', '{d2}'],
            ]}
          />
          <p className="text-sm font-medium mt-3 mb-1">(b) Iteration (preds: B1←entry, B2←{'{B1,B3}'}, B3←B2)</p>
          <Table
            head={['', 'in[B1]', 'out[B1]', 'in[B2]', 'out[B2]', 'in[B3]', 'out[B3]']}
            rows={[
              ['init', '∅', '{d1,d2}', '∅', '{d3}', '∅', '{d4}'],
              ['iter 1', '∅', '{d1,d2}', '{d1,d2,d4}', '{d2,d3,d4}', '{d2,d3,d4}', '{d3,d4}'],
              ['iter 2', '∅', '{d1,d2}', '{d1,d2,d3,d4}', '{d2,d3,d4}', '{d2,d3,d4}', '{d3,d4}'],
            ]}
          />
          <p className="text-xs text-muted-foreground mb-2">
            iter 1, B2: <Code>in = {'{d1,d2}∪{d4}'}</Code>, <Code>out = {'{d3}∪({d1,d2,d4}−{d1})'} = {'{d2,d3,d4}'}</Code>.
            iter 2 grows only <Code>in[B2]</Code> to <Code>{'{d1,d2,d3,d4}'}</Code>; all out sets stay the same → fixpoint.
          </p>
          <Formula>{`in[B1]=∅            out[B1]={d1,d2}
in[B2]={d1,d2,d3,d4} out[B2]={d2,d3,d4}
in[B3]={d2,d3,d4}    out[B3]={d3,d4}`}</Formula>
        </>
      }
    />

    {/* Q2 */}
    <QuestionCard
      n={2}
      diff="Easy"
      title="gen / kill of a straight-line block, and out given in"
      statement={
        <>
          <p className="mb-2">
            In the whole program the definitions of <Code>x</Code> are <Code>{'{d1, d3, d6}'}</Code> and of <Code>y</Code>{' '}
            are <Code>{'{d2, d7}'}</Code>. A block B is:
          </p>
          <Pre>{`d1: x := a + b
d2: y := x * 2
d3: x := y − 1`}</Pre>
          <p>(a) Give gen[B] and kill[B]. (b) If <Code>in[B] = {'{d6, d7}'}</Code>, compute <Code>out[B]</Code>.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Local sets</p>
          <Panel className="text-sm">
            <Code>d1</Code> is overwritten by <Code>d3</Code>, so it does not reach the end. <Code>d3</Code> (last def of{' '}
            <Code>x</Code>) and <Code>d2</Code> (only def of <Code>y</Code>) do.
            <Formula>{`gen[B]  = {d2, d3}
kill[B] = (defs of x and y, except those in gen)
        = {d1, d6}  ∪  {d7}  =  {d1, d6, d7}`}</Formula>
          </Panel>
          <p className="text-sm font-medium mt-2 mb-1">(b) out</p>
          <Formula>{`out[B] = gen[B] ∪ (in[B] \\ kill[B])
       = {d2,d3} ∪ ({d6,d7} \\ {d1,d6,d7})
       = {d2,d3} ∪ ∅  =  {d2, d3}`}</Formula>
          <p className="text-xs text-muted-foreground">Both incoming definitions are killed by this block.</p>
        </>
      }
    />

    {/* Q3 */}
    <QuestionCard
      n={3}
      diff="Medium"
      title="Available expressions across a merge (intersection)"
      statement={
        <>
          <p className="mb-2">For the flow graph (start = B1):</p>
          <Pre>{`B1:  x := a + b
B2:  y := a + b
B3:  a := 5
B4:  z := a + b`}</Pre>
          <FlowGraph nodes={q3Nodes} edges={q3Edges} width={300} height={252} />
          <p>
            (a) Give e-gen / e-kill for each block (<Code>U = {'{a+b}'}</Code>). (b) Compute in/out. (c) Can the{' '}
            <Code>a+b</Code> in B4 reuse an earlier value?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Local sets</p>
          <Table
            head={['B', 'e-gen', 'e-kill']}
            rows={[
              ['B1', '{a+b}', '{ }'],
              ['B2', '{a+b}', '{ }'],
              ['B3', '{ }', '{a+b}   (redefines a)'],
              ['B4', '{a+b}', '{ }'],
            ]}
          />
          <p className="text-sm font-medium mt-2 mb-1">(b) in/out (in[B1]=∅, others init to U)</p>
          <Formula>{`out[B1] = {a+b}
in[B2]  = out[B1] = {a+b}     out[B2] = {a+b}
in[B3]  = out[B1] = {a+b}     out[B3] = {} ∪ ({a+b} \\ {a+b}) = ∅
in[B4]  = out[B2] ∩ out[B3] = {a+b} ∩ ∅ = ∅
out[B4] = {a+b} ∪ (∅ \\ {}) = {a+b}`}</Formula>
          <p className="text-sm font-medium mt-2 mb-1">(c) Conclusion</p>
          <Panel className="text-sm">
            <Code>in[B4] = ∅</Code> → <Code>a+b</Code> is <Bad>not available</Bad> entering B4 (the path through B3
            redefines <Code>a</Code>). The expression must be <strong>recomputed</strong>; no common-subexpression reuse.
            Intersection at the merge is what makes this safe.
          </Panel>
        </>
      }
    />

    {/* Q4 */}
    <QuestionCard
      n={4}
      diff="Hard"
      title="Live variables with a loop (backward iteration)"
      statement={
        <>
          <p className="mb-2">For the flow graph (entry → B1), with</p>
          <Pre>{`B1:  a := 1;  b := 2
B2:  c := a + b;  if c < 10
B3:  a := c + 1            (loop body, back-edge B3→B2)
B4:  print(c)`}</Pre>
          <FlowGraph nodes={q4Nodes} edges={q4Edges} width={300} height={320} />
          <p>(a) Give def/use per block. (b) Compute in[B]/out[B] for live variables.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Local sets</p>
          <Table
            head={['B', 'def', 'use']}
            rows={[
              ['B1', '{a, b}', '{ }'],
              ['B2', '{c}', '{a, b}'],
              ['B3', '{a}', '{c}'],
              ['B4', '{ }', '{c}'],
            ]}
          />
          <p className="text-sm font-medium mt-2 mb-1">(b) Backward iteration (succs: B2→{'{B3,B4}'}, B3→B2)</p>
          <Table
            head={['B', 'out[B]', 'in[B]']}
            rows={[
              ['B4', '∅', '{c}'],
              ['B3', '{a, b}', '{b, c}'],
              ['B2', '{b, c}', '{a, b}'],
              ['B1', '{a, b}', '∅'],
            ]}
          />
          <p className="text-xs text-muted-foreground mb-1">
            <Code>out[B2] = in[B3] ∪ in[B4] = {'{b,c}∪{c}'} = {'{b,c}'}</Code>; <Code>in[B2] = {'{a,b}∪({b,c}−{c})'} = {'{a,b}'}</Code>.
            A second pass reproduces the same sets → fixpoint.
          </p>
          <Panel className="text-sm">
            Note <Code>c ∉ out[B3]</Code>: after B3 control returns to B2, which re-defines <Code>c</Code> (via{' '}
            <Code>c:=a+b</Code>) before using it, so the old <Code>c</Code> is dead. But <Code>a, b</Code> are live out of B3
            because B2 reads them.
          </Panel>
        </>
      }
    />

    {/* Q5 */}
    <QuestionCard
      n={5}
      diff="Hardest"
      title="Very busy expressions and the dual of availability"
      statement={
        <>
          <p className="mb-2">For the flow graph (start = B1), all blocks exit to B4 then to exit:</p>
          <Pre>{`B1:  (branch only)
B2:  x := a − b
B3:  a := 0
B4:  z := a − b`}</Pre>
          <FlowGraph nodes={q5Nodes} edges={q5Edges} width={300} height={252} />
          <p>
            (a) Give used / killed per block. (b) Compute very-busy in/out. (c) At which block entries is <Code>a−b</Code>{' '}
            very busy, and why not at B1?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Local sets</p>
          <Table
            head={['B', 'used', 'killed']}
            rows={[
              ['B1', '{ }', '{ }'],
              ['B2', '{a−b}', '{ }'],
              ['B3', '{ }', '{a−b}   (redefines a)'],
              ['B4', '{a−b}', '{ }'],
            ]}
          />
          <p className="text-sm font-medium mt-2 mb-1">(b) Backward · intersection (out[B4]=∅ at exit)</p>
          <Formula>{`in[B4]  = {a−b} ∪ (∅ \\ {}) = {a−b}
out[B2] = in[B4] = {a−b}   in[B2] = {a−b} ∪ ({a−b}\\{}) = {a−b}
out[B3] = in[B4] = {a−b}   in[B3] = {} ∪ ({a−b} \\ {a−b}) = ∅
out[B1] = in[B2] ∩ in[B3] = {a−b} ∩ ∅ = ∅
in[B1]  = {} ∪ (∅ \\ {}) = ∅`}</Formula>
          <p className="text-sm font-medium mt-2 mb-1">(c) Where is a−b very busy?</p>
          <Panel className="text-sm">
            Very busy entering <Good>B2, B4</Good> (and leaving B2, B3). <Bad>Not</Bad> very busy at B1: on the path
            <Code> B1→B3→B4</Code>, block B3 redefines <Code>a</Code> <em>before</em> <Code>a−b</Code> is next used, so it is
            not used on <em>every</em> path. Intersection at the branch drops it — exactly the backward / intersection dual
            of the available-expressions argument in Q3.
          </Panel>
        </>
      }
    />
  </div>
)

/* ------------------------------------------------------------------ *
 *  Root component
 * ------------------------------------------------------------------ */

type TabId = 'overview' | 'reaching' | 'iteration' | 'available' | 'live' | 'summary' | 'questions'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'reaching', label: 'Reaching defs' },
  { id: 'iteration', label: 'Iterative solver' },
  { id: 'available', label: 'Available expr' },
  { id: 'live', label: 'Live variables' },
  { id: 'summary', label: 'Very busy & big picture' },
  { id: 'questions', label: 'Questions' },
]

export default function DataFlowStudyTool(): React.JSX.Element {
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
            <div className="text-xs text-muted-foreground font-medium mb-0.5">Chapter 2 · §2.2</div>
            <h1 className="text-2xl font-semibold tracking-tight">Global data flow analysis</h1>
            <p className="text-sm text-muted-foreground mt-1">
              gen/kill, the iterative solver, and the four classic problems — reaching definitions, available
              expressions, live variables and very busy expressions.
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
                tab === t.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div role="tabpanel">
          {tab === 'overview' && <OverviewSection />}
          {tab === 'reaching' && <ReachingSection />}
          {tab === 'iteration' && <IterationSection />}
          {tab === 'available' && <AvailableSection />}
          {tab === 'live' && <LiveSection />}
          {tab === 'summary' && <SummarySection />}
          {tab === 'questions' && <QuestionsSection />}
        </div>
      </div>
    </div>
  )
}
