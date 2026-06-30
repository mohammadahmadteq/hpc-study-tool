/* ------------------------------------------------------------------ *
 *  Shared study-kit primitives for the §2.3 optimizing-transformation
 *  pages. These mirror the local helpers used in Chapter2 / Chapter2_2 /
 *  Chapter3, lifted into one module because the five §2.3 section pages
 *  all reuse the same presentational set + the SVG FlowGraph.
 * ------------------------------------------------------------------ */

import React, { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Progress } from '../ui/progress'
import { cn } from '../../lib/utils'

/* ---- inline text / block primitives ------------------------------- */

export const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono text-foreground">{children}</code>
)

export const Pre: React.FC<{ children: string }> = ({ children }) => (
  <pre className="bg-muted border rounded-lg p-3 text-[12.5px] font-mono overflow-x-auto whitespace-pre my-2 leading-[1.5]">
    {children}
  </pre>
)

export const Formula: React.FC<{ children: string }> = ({ children }) => (
  <div className="bg-muted border-l-[3px] border-primary pl-3 pr-3 py-2 rounded-r-md text-[13px] font-mono whitespace-pre-wrap my-2 leading-[1.5]">
    {children}
  </div>
)

export const Step: React.FC<{ n: React.ReactNode; children: React.ReactNode }> = ({ n, children }) => (
  <div className="flex items-start gap-2.5 my-2 text-sm">
    <div className="shrink-0 w-[22px] h-[22px] rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center mt-0.5">
      {n}
    </div>
    <div className="leading-relaxed">{children}</div>
  </div>
)

export const Table: React.FC<{ head: React.ReactNode[]; rows: React.ReactNode[][] }> = ({ head, rows }) => (
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

export const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('border rounded-lg p-3.5 bg-muted/50 my-1.5', className)}>{children}</div>
)

export const Good: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{children}</span>
)
export const Bad: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-red-600 dark:text-red-400 font-medium">{children}</span>
)

export const Tag: React.FC<{ children: React.ReactNode; tone?: 'default' | 'good' | 'bad' | 'warn' }> = ({
  children,
  tone = 'default',
}) => {
  const tones: Record<string, string> = {
    default: 'bg-muted text-foreground',
    good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    bad: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    warn: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  }
  return <span className={cn('inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full', tones[tone])}>{children}</span>
}

/* ---- set helpers: subscript digits + pretty-print a set ----------- */

const SUBS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']
export const sub = (s: string) => s.replace(/[0-9]/g, (d) => SUBS[+d])
export const S = (xs: string[]) => (xs.length ? `{${xs.map(sub).join(', ')}}` : '∅')
export const SetT: React.FC<{ xs: string[]; className?: string }> = ({ xs, className }) => (
  <span className={cn('font-mono', className)}>{S(xs)}</span>
)

/* ---- generic stepper ---------------------------------------------- */

export interface StepPanel {
  title: string
  body: React.ReactNode
}

export const Stepper: React.FC<{ steps: StepPanel[]; showProgress?: boolean }> = ({ steps, showProgress }) => {
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
 *  SVG flow-graph renderer (interactive, circular nodes)
 * ------------------------------------------------------------------ */

export type Fill = 'none' | 'active' | 'pred' | 'succ' | 'dim' | 'loop' | 'move'

export interface GNode {
  id: string
  x: number
  y: number
  label: string
  sub?: string
  r?: number
  point?: boolean
}

export interface GEdge {
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
  move: { fill: '#8b5cf6', stroke: '#7c3aed', text: '#ffffff' },
  dim: { fill: 'var(--color-card)', stroke: 'var(--color-muted-foreground)', text: 'var(--color-muted-foreground)', op: 0.4 },
}

export const edgeKey = (e: GEdge) => `${e.from}->${e.to}`

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

export const FlowGraph: React.FC<{
  nodes: GNode[]
  edges: GEdge[]
  width: number
  height: number
  fillOf?: (id: string) => Fill
  activeEdges?: string[]
  onPick?: (id: string) => void
  caption?: string
  maxW?: number
}> = ({ nodes, edges, width, height, fillOf = () => 'none', activeEdges = [], onPick, caption, maxW = 420 }) => {
  const map: Record<string, GNode> = Object.fromEntries(nodes.map((n) => [n.id, n]))
  return (
    <div className="my-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full mx-auto block select-none"
        style={{ height: 'auto', maxWidth: maxW }}
      >
        <defs>
          <marker id="ar23" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="var(--color-muted-foreground)" />
          </marker>
          <marker id="arA23" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
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
                markerEnd={`url(#${on ? 'arA23' : 'ar23'})`}
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
 *  Code-block flow graph — rectangular nodes holding multi-line TAC.
 *  Used for the CFG-heavy quicksort case study.
 * ------------------------------------------------------------------ */

export interface BNode {
  id: string
  x: number
  y: number
  w: number
  title?: string
  lines: string[]
}

export const BlockGraph: React.FC<{
  nodes: BNode[]
  edges: GEdge[]
  width: number
  height: number
  highlight?: (id: string) => boolean
  maxW?: number
  caption?: string
}> = ({ nodes, edges, width, height, highlight, maxW = 640, caption }) => {
  const LH = 13
  const PAD = 7
  const TITLE_H = 15
  const map: Record<string, { n: BNode; h: number }> = {}
  nodes.forEach((n) => {
    const h = PAD * 2 + (n.title ? TITLE_H : 0) + n.lines.length * LH
    map[n.id] = { n, h }
  })
  const center = (n: BNode) => ({ x: n.x + n.w / 2, y: n.y + map[n.id].h / 2 })

  return (
    <div className="my-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full mx-auto block select-none" style={{ height: 'auto', maxWidth: maxW }}>
        <defs>
          <marker id="bar23" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="var(--color-muted-foreground)" />
          </marker>
        </defs>
        {edges.map((e) => {
          const a = map[e.from]?.n
          const b = map[e.to]?.n
          if (!a || !b) return null
          const ca = center(a)
          const cb = center(b)
          const bend = e.bend ?? 0
          const dx = cb.x - ca.x
          const dy = cb.y - ca.y
          const L = Math.hypot(dx, dy) || 1
          const px = -dy / L
          const py = dx / L
          const mx = (ca.x + cb.x) / 2 + px * bend
          const my = (ca.y + cb.y) / 2 + py * bend
          const d = `M ${ca.x} ${ca.y} Q ${mx} ${my} ${cb.x} ${cb.y}`
          return (
            <path
              key={edgeKey(e)}
              d={d}
              fill="none"
              stroke="var(--color-muted-foreground)"
              strokeWidth={1.4}
              strokeDasharray={e.dashed ? '4 3' : undefined}
              markerEnd="url(#bar23)"
              opacity={0.85}
            />
          )
        })}
        {nodes.map((n) => {
          const { h } = map[n.id]
          const hot = highlight?.(n.id)
          return (
            <g key={n.id}>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={h}
                rx={5}
                fill={hot ? 'var(--color-primary)' : 'var(--color-card)'}
                stroke={hot ? 'var(--color-primary)' : 'var(--color-foreground)'}
                strokeWidth={1.6}
                opacity={hot ? 0.12 : 1}
              />
              <rect x={n.x} y={n.y} width={n.w} height={h} rx={5} fill="none" stroke={hot ? 'var(--color-primary)' : 'var(--color-foreground)'} strokeWidth={1.6} />
              {n.title && (
                <text x={n.x + n.w - 5} y={n.y + 11} textAnchor="end" fontSize="10.5" fontWeight={700} fill="var(--color-primary)">
                  {n.title}
                </text>
              )}
              {n.lines.map((ln, k) => (
                <text
                  key={k}
                  x={n.x + PAD}
                  y={n.y + PAD + (n.title ? TITLE_H : 0) + k * LH + 9}
                  fontSize="10.5"
                  fontFamily="ui-monospace, monospace"
                  fill="var(--color-foreground)"
                >
                  {ln}
                </text>
              ))}
            </g>
          )
        })}
      </svg>
      {caption && <div className="text-center text-xs text-muted-foreground mt-1">{caption}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  Reveal + Question card
 * ------------------------------------------------------------------ */

export const Reveal: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label = 'solution' }) => {
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

export type Diff = 'Worked example' | 'Easy' | 'Medium' | 'Hard' | 'Hardest'
const diffClass: Record<Diff, string> = {
  'Worked example': 'bg-primary/10 text-primary',
  Easy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Hard: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Hardest: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export const QuestionCard: React.FC<{
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
 *  StudyShell — shared page chrome: header + dark toggle + pill tabs.
 *  Each §2.3 section page passes its own tab definitions.
 * ------------------------------------------------------------------ */

export interface TabDef {
  id: string
  label: string
  render: () => React.ReactNode
}

export const StudyShell: React.FC<{
  sectionLabel: string
  title: string
  subtitle: React.ReactNode
  tabs: TabDef[]
}> = ({ sectionLabel, title, subtitle, tabs }) => {
  const [dark, setDark] = useState(false)
  const [tab, setTab] = useState<string>(tabs[0]?.id)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const active = tabs.find((t) => t.id === tab) ?? tabs[0]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-8 pb-16">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-0.5">{sectionLabel}</div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
            {dark ? '◑ Light' : '◐ Dark'}
          </Button>
        </div>

        <nav className="flex flex-wrap gap-1.5 py-4" role="tablist" aria-label="Study sections">
          {tabs.map((t) => (
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

        <div role="tabpanel">{active?.render()}</div>
      </div>
    </div>
  )
}
