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
import LoopFusionStudyTool from './Chapter4_2'
import LoopDistributionStudyTool from './Chapter4_3'
import LoopInterchangeStudyTool from './Chapter4_4'
import LoopReversalStudyTool from './Chapter4_5'
import LoopSkewingStudyTool from './Chapter4_6'
import StripMiningStudyTool from './Chapter4_7'
import LoopTilingStudyTool from './Chapter4_8'
import LocalityStudyTool from './Chapter4_9'
import OpenMPStudyTool from './Chapter5'
import SynchronizationStudyTool from './Chapter5_2'
import ParallelTasksStudyTool from './Chapter5_3'

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
  if (view === '4.2') return wrap(<LoopFusionStudyTool />)
  if (view === '4.3') return wrap(<LoopDistributionStudyTool />)
  if (view === '4.4') return wrap(<LoopInterchangeStudyTool />)
  if (view === '4.5') return wrap(<LoopReversalStudyTool />)
  if (view === '4.6') return wrap(<LoopSkewingStudyTool />)
  if (view === '4.7') return wrap(<StripMiningStudyTool />)
  if (view === '4.8') return wrap(<LoopTilingStudyTool />)
  if (view === '4.9') return wrap(<LocalityStudyTool />)
  if (view === '5.1') return wrap(<OpenMPStudyTool />)
  if (view === '5.2') return wrap(<SynchronizationStudyTool />)
  if (view === '5.3') return wrap(<ParallelTasksStudyTool />)

  return <ChapterSelect onSelect={setView} />
}
