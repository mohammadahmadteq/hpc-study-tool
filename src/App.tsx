import { useState } from 'react'
import type { ReactNode } from 'react'
import ChapterSelect from './ChapterSelect'
import ControlFlowStudyTool from './Chapter2'
import DataFlowStudyTool from './Chapter2_2'
import CseStudyTool from './Chapter2_3a'
import CopyPropStudyTool from './Chapter2_3b'
import LoopInvariantStudyTool from './Chapter2_3c'
import InductionStudyTool from './Chapter2_3d'
import QuicksortStudyTool from './Chapter2_3e'
import DataDependenceStudyTool from './Chapter3'
import VectorizationStudyTool from './Chapter3_2'
import ArrayDependenceStudyTool from './Chapter3_3'
import DependenceSolverStudyTool from './Chapter3_4'
import StatementReorderingStudyTool from './Chapter4'

export default function App() {
  const [view, setView] = useState<string | null>(null)

  const wrap = (node: ReactNode) => (
    <div>
      <div className="max-w-3xl mx-auto px-5 pt-4">
        <button
          onClick={() => setView(null)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to chapters
        </button>
      </div>
      {node}
    </div>
  )

  if (view === '2.1') return wrap(<ControlFlowStudyTool />)
  if (view === '2.2') return wrap(<DataFlowStudyTool />)
  if (view === '2.3a') return wrap(<CseStudyTool />)
  if (view === '2.3b') return wrap(<CopyPropStudyTool />)
  if (view === '2.3c') return wrap(<LoopInvariantStudyTool />)
  if (view === '2.3d') return wrap(<InductionStudyTool />)
  if (view === '2.3e') return wrap(<QuicksortStudyTool />)
  if (view === '3') return wrap(<DataDependenceStudyTool />)
  if (view === '3.2') return wrap(<VectorizationStudyTool />)
  if (view === '3.3') return wrap(<ArrayDependenceStudyTool />)
  if (view === '3.4') return wrap(<DependenceSolverStudyTool />)
  if (view === '4.1') return wrap(<StatementReorderingStudyTool />)

  return <ChapterSelect onSelect={setView} />
}
