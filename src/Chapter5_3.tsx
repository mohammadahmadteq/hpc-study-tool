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
  type Fill,
  type GNode,
  type GEdge,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  Chapter 5 · §5.3 — Parallel Tasks   (PDF 264–279)
 *  Task pools with OpenMP 2.5, the Intel taskq/task workqueueing
 *  extensions, and the OpenMP 3.0 task / taskwait directives.
 * ------------------------------------------------------------------ */

const THREAD_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

/* ================================================================== *
 *  Tab 1 · Task-Pools with OpenMP 2.5
 * ================================================================== */

const poolCosts = [3, 1, 4, 1, 5, 9, 2, 6, 3, 5]

function scheduleTasks(p: number, costs: number[]) {
  const free = new Array(p).fill(0)
  const rows: { task: number; thread: number; start: number; end: number }[] = []
  for (let t = 0; t < costs.length; t++) {
    let th = 0
    for (let k = 1; k < p; k++) if (free[k] < free[th]) th = k
    const start = free[th]
    const end = start + costs[t]
    free[th] = end
    rows.push({ task: t, thread: th, start, end })
  }
  return { rows, free }
}

const TaskPoolDemo: React.FC = () => {
  const [p, setP] = useState(4)
  const { rows, free } = scheduleTasks(p, poolCosts)
  const span = Math.max(...free)
  const totalWork = poolCosts.reduce((a, b) => a + b, 0)
  const ideal = totalWork / p

  const pill = (active: boolean) =>
    cn(
      'text-[12px] px-2.5 py-1 rounded-full border transition-colors',
      active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
    )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">threads</span>
        {[2, 3, 4].map((k) => (
          <button key={k} onClick={() => setP(k)} className={pill(p === k)}>
            {k}
          </button>
        ))}
      </div>
      <div className="text-[12px] font-mono text-muted-foreground mb-2">
        task costs = [{poolCosts.join(', ')}] &nbsp; (10 tasks — think of these as how long each <Code>runTask()</Code>{' '}
        call takes)
      </div>

      <div className="space-y-1.5">
        {Array.from({ length: p }, (_, t) => (
          <div key={t} className="flex items-center gap-2">
            <div className="w-6 text-[11px] font-mono shrink-0" style={{ color: THREAD_COLORS[t % 6] }}>
              T{t}
            </div>
            <div className="relative h-7 flex-1 rounded bg-muted/30 overflow-hidden">
              {rows
                .filter((r) => r.thread === t)
                .map((r) => (
                  <div
                    key={r.task}
                    className="absolute top-0 h-full flex items-center justify-center text-[10px] font-mono font-semibold text-white"
                    style={{
                      left: `${(r.start / span) * 100}%`,
                      width: `${((r.end - r.start) / span) * 100}%`,
                      background: THREAD_COLORS[t % 6],
                      opacity: 0.85,
                      borderLeft: '1px solid var(--color-background)',
                    }}
                  >
                    {r.task}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground mt-2">
        <span>
          makespan = <span className="font-mono text-foreground">{span}</span>
        </span>
        <span>
          ideal (work / p) = <span className="font-mono text-foreground">{ideal.toFixed(1)}</span>
        </span>
        <span>
          total work = <span className="font-mono text-foreground">{totalWork}</span>
        </span>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        The numbers on the bars are task ids, in the order <Code>nextTask()</Code> handed them out. A thread that
        finishes early (short bars) immediately calls <Code>nextTask()</Code> again and grabs the next unclaimed task
        — the pool self-balances even though the tasks have very different costs. Fewer threads mean each does more
        work; more threads add parallelism but eventually one straggler task sets the makespan.
      </p>
    </div>
  )
}

const TaskPoolSection: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4 bg-muted/30">
      <p className="text-sm leading-relaxed mb-2">
        So far: <strong>incremental parallelization</strong> of regular parallelism, mostly parallel loops. That model
        breaks down for <strong>complex data structures</strong> (lists, trees), <strong>irregular</strong>{' '}
        computations, and work that is only discovered <strong>dynamically</strong> at runtime — reworking such code
        into loop form costs a lot of rewriting and adds runtime overhead.
      </p>
      <p className="text-sm leading-relaxed">
        The fix is <strong>tasks</strong>: independent units of work that get executed dynamically at runtime, instead
        of being fixed to loop iterations at compile time. Before OpenMP 2.5 there was no task construct at all — this
        section walks three generations: a hand-rolled <strong>task pool</strong> (2.5), the Intel{' '}
        <Code>taskq</Code>/<Code>task</Code> extensions, and the OpenMP 3.0 <Code>task</Code> directive.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">The task-pool pattern</h3>
      <p className="text-sm mb-2">
        A task pool is built from an ordinary <Code>parallel</Code> region: every thread runs the <em>same</em> loop —
        take a task, execute it — until no tasks are left.
      </p>
      <Formula>{`while (a task is available) {
  task ← take next task
  execute task
}`}</Formula>
      <p className="text-sm">
        The parallel region ends once every thread's loop has exited, i.e. once no task remains. With 4 threads and 10
        tasks of varying cost, this alone gives dynamic load balancing — nobody sits idle while unclaimed tasks
        remain.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">nextTask() — handing out one index at a time</h3>
      <p className="text-sm mb-2">
        Tasks here are just indices <Code>0..max_task_index-1</Code>. Handing out the next index must be{' '}
        <strong>mutually exclusive</strong>, or two threads could receive the same index:
      </p>
      <Pre>{`const int max_task_index = 10;
int task_index = 0;

int nextTask()
{
  int t = -1;
  #pragma omp critical (nextTask)
  {
    if (task_index < max_task_index)
      t = task_index++;
  }
  return t;
}`}</Pre>
      <Panel className="text-sm leading-relaxed">
        <Tag tone="warn">why the local t?</Tag>{' '}
        <span className="ml-1">
          Every thread's <Code>t</Code> is <strong>private</strong>. It has to be returned instead of{' '}
          <Code>task_index</Code> — by the time the function returns, another thread may already have entered the{' '}
          <Code>critical</Code> region and advanced the shared <Code>task_index</Code> further. Returning{' '}
          <Code>task_index</Code> would (racily) hand back <em>someone else's</em> task number, or a value past the
          end.
        </span>
      </Panel>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">runTask() and the parallel region</h3>
      <Pre>{`void runTask(int task)
{
  printf("Thread %d executes task %d\\n", omp_get_thread_num(), task);
}

int main()
{
  #pragma omp parallel num_threads(4)
  {
    int task = nextTask();
    while (task != -1) {
      runTask(task);
      task = nextTask();
    }
  }
  return 0;
}`}</Pre>
      <p className="text-xs text-muted-foreground">
        Each thread keeps pulling and running tasks until <Code>nextTask()</Code> returns <Code>-1</Code>. Which
        thread gets which task — and how many — depends purely on runtime timing, so the printed order differs from
        run to run.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">See the pool balance itself</h3>
      <p className="text-sm mb-3">
        10 tasks of unequal cost, handed out to whichever thread asks for <Code>nextTask()</Code> next. Change the team
        size and watch who ends up with the long tasks:
      </p>
      <TaskPoolDemo />
    </div>
  </div>
)

/* ================================================================== *
 *  Tab 2 · Intel taskq / task
 * ================================================================== */

const listNodes = ['A', 'B', 'C', 'D', 'E']

const ListCaptureDemo: React.FC = () => {
  const [capture, setCapture] = useState(true)
  const [i, setI] = useState(0)
  const done = i === listNodes.length
  const currentPtr = done ? null : listNodes[i]

  const pill = (active: boolean) =>
    cn(
      'text-[12px] px-2.5 py-1 rounded-full border transition-colors',
      active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
    )

  const setMode = (c: boolean) => {
    setCapture(c)
    setI(0)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => setMode(true)} className={pill(capture)}>
          task captureprivate(list)
        </button>
        <button onClick={() => setMode(false)} className={pill(!capture)}>
          list is (implicitly) shared
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3 font-mono text-sm">
        <span className="text-xs text-muted-foreground">shared pointer list =</span>
        <span className="px-2 py-0.5 rounded border bg-muted/40">{currentPtr ?? 'NULL'}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {listNodes.map((n, k) => (
          <div
            key={n}
            className={cn(
              'w-10 h-10 rounded-lg border flex items-center justify-center font-mono text-sm',
              k < i ? 'border-primary bg-primary/10' : 'border-border text-muted-foreground opacity-50'
            )}
          >
            {n}
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
          {done
            ? 'sequential loop finished — list = NULL, all 5 tasks are queued'
            : `spawning the task for node "${listNodes[i]}"  (step ${i + 1} of ${listNodes.length})`}
        </span>
        <button
          onClick={() => setI((p) => Math.min(listNodes.length, p + 1))}
          disabled={done}
          className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          next →
        </button>
      </div>

      {done && (
        <Panel className="text-sm leading-relaxed">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            later, the team executes the 5 queued tasks (in some arbitrary order) — what does each one process?
          </div>
          <div className="grid grid-cols-5 gap-2 font-mono text-[12px] mb-2">
            {listNodes.map((n, k) => (
              <div key={k} className="rounded border px-1.5 py-1 text-center">
                <div className="text-[10px] text-muted-foreground">task {k}</div>
                <div className={capture ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                  {capture ? n : 'NULL'}
                </div>
              </div>
            ))}
          </div>
          {capture ? (
            <>
              <Good>Correct.</Good> <Code>captureprivate(list)</Code> copy-constructs a <strong>private</strong>{' '}
              <Code>list</Code> for each task at the moment the task is <em>created</em>, so task <Code>k</Code> keeps
              pointing at node "{listNodes[0]}"…"{listNodes[listNodes.length - 1]}" forever, no matter when it
              actually runs.
            </>
          ) : (
            <>
              <Bad>Broken.</Bad> Without <Code>captureprivate</Code>, every task reads the one <strong>shared</strong>{' '}
              <Code>list</Code> variable only when it actually executes — and by then the sequential insertion loop
              has already finished and set <Code>list = NULL</Code>. All five tasks see the same stale{' '}
              <Code>NULL</Code>.
            </>
          )}
        </Panel>
      )}
    </div>
  )
}

const IntelSection: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">5.3.1 Workqueueing (Intel C++ Compiler)</h3>
      <p className="text-sm mb-2">
        Intel's <strong>workqueueing</strong> model separates <em>partitioning work</em> from <em>specifying work</em>{' '}
        with two directives (prefixed <Code>intel</Code> since they are compiler-specific, not standard OpenMP):
      </p>
      <Pre>{`#pragma intel omp taskq
  [clauses ...]
  // structured block — generates the work items

#pragma intel omp task
  [clauses ...]
  // structured block — one work item (task)`}</Pre>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">taskq — the task pool as a block</h3>
      <Table
        head={['Property', '']}
        rows={[
          [<>who runs the block</>, <>only <strong>one</strong> thread, sequentially</>],
          [<>other threads</>, <>wait, then pull <Code>task</Code> items out of the pool as they appear</>],
          [<>pool lifetime</>, <>destroyed once every task is executed <strong>and</strong> the end of <Code>taskq</Code> is reached</>],
          [<>at the closing brace</>, <><strong>implicit barrier</strong> — nobody leaves until the pool is empty</>],
          [<>clauses</>, <><Code>private</Code>, <Code>firstprivate</Code>, <Code>lastprivate</Code>, <Code>reduction</Code>, <Code>ordered</Code>, <Code>nowait</Code></>],
        ]}
      />
      <p className="text-sm mb-1">Abbreviated form when the enclosing parallel region isn't needed elsewhere:</p>
      <Pre>{`#pragma intel omp parallel taskq
  [clauses ...]
  // structured block`}</Pre>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">task — one work item</h3>
      <p className="text-sm mb-2">
        Every <Code>task</Code> block found inside a <Code>taskq</Code> block is one work item, inserted into the pool
        and later run by <strong>one</strong> thread of the team.
      </p>
      <Table
        head={['clause', 'meaning']}
        rows={[
          [<Code>private</Code>, <>ordinary private copy, uninitialized</>],
          [
            <Code>captureprivate(list)</Code>,
            <>
              <strong>only valid on task</strong> — each variable in <Code>list</Code> gets a private copy
              copy-constructed with the value the <em>original</em> variable had at task-creation time
            </>,
          ],
        ]}
      />
      <Panel className="text-sm leading-relaxed">
        <Tag tone="warn">no implicit sync between tasks</Tag>{' '}
        <span className="ml-1">
          Two <Code>task</Code> items inside the same pool are not ordered with respect to each other — if one
          depends on another's result, the programmer must add explicit synchronization.
        </span>
      </Panel>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Example — a chained list, sequential vs. parallel</h3>
      <Pre>{`void processList(List* list)                  // sequential
{
  while (list != NULL) {
    process(list);
    list = list->next;
  }
}`}</Pre>
      <p className="text-sm mb-2">
        Turning this into tasks: the pointer walk stays <strong>sequential</strong> (only the pool-owning thread does
        it, so no race on <Code>list-&gt;next</Code>), but each <Code>process(list)</Code> call becomes an
        independent task. The walk keeps advancing <Code>list</Code> immediately, so each task must{' '}
        <strong>capture its own node</strong>:
      </p>
      <Pre>{`void processList(List* list)
{
  #pragma intel omp parallel taskq
  {
    while (list != NULL) {
      #pragma intel omp task captureprivate(list)
      process(list);

      list = list->next;
    }
  }
}`}</Pre>
      <p className="text-sm mb-2">Step through the insertion, then reveal what happens without <Code>captureprivate</Code>:</p>
      <ListCaptureDemo />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Example — recursive tree traversal</h3>
      <p className="text-sm mb-2">
        A <Code>taskq</Code> block can contain arbitrary code, including further nested <Code>taskq</Code> blocks —
        here, the recursive calls themselves. The number of threads is fixed once; they drain tasks from every nested
        pool as the recursion generates them.
      </p>
      <Pre>{`void traverse(struct node* p) {
  #pragma intel omp taskq
  {
    if (p->left)  traverse(p->left);
    if (p->right) traverse(p->right);

    #pragma intel omp task
    process(p->data);
  }
}`}</Pre>
      <p className="text-xs text-muted-foreground">
        <Code>traverse(p-&gt;left)</Code> and <Code>traverse(p-&gt;right)</Code> are <em>plain</em> recursive calls,
        not tasks — each one opens its own <Code>taskq</Code> and, because of that block's implicit closing-brace
        barrier, does not return until <em>its whole subtree</em> (including its own <Code>process</Code> task) is
        finished. Only <Code>process(p-&gt;data)</Code> itself is deferred into the pool. Question 3 asks you to use
        this to argue the traversal is correctly postorder.
      </p>
    </div>
  </div>
)

/* ================================================================== *
 *  Tab 3 · OpenMP 3.0 — the task directive
 * ================================================================== */

const TaskDirectiveSection: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">5.3.2 The task directive</h3>
      <p className="text-sm mb-2">
        OpenMP 3.0 standardizes tasks directly in the language. A <Code>task</Code> is a structured block that will be
        executed (sequentially, as one unit) by <strong>some</strong> thread of the enclosing parallel region:
      </p>
      <Pre>{`#pragma omp task [clauses ...]
  // structured block`}</Pre>
      <p className="text-sm">
        Unlike the Intel model, there is no separate pool-generating directive — <Code>task</Code> can appear anywhere
        inside a <Code>parallel</Code> region, and tasks are <strong>not</strong> collected into an explicit queue
        object in the source.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Execution model</h3>
      <div className="text-sm">
        <Step n="①">
          A thread that hits <Code>task</Code> may run it immediately, or defer it — <strong>mark it for later
          execution</strong> by any thread of the team.
        </Step>
        <Step n="②">
          A task is <strong>not bound</strong> to the thread that created it, or (by default) even to the thread that
          starts running it.
        </Step>
        <Step n="③">
          Every task gets its own <strong>private data zone</strong>; whichever thread executes it uses that zone —
          this is what makes moving a task between threads safe.
        </Step>
        <Step n="④">
          At defined <strong>scheduling points</strong> a task's execution can be interrupted and handed to a
          different thread — but only if the task is <Code>untied</Code> (the default is <em>tied</em>: once a thread
          starts a task, that same thread must finish it).
        </Step>
        <Step n="⑤">
          <Code>task</Code> directives <strong>nest</strong>: a task created inside another task is that task's{' '}
          <strong>child task</strong>.
        </Step>
      </div>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Clauses</h3>
      <Table
        head={['clause', 'meaning']}
        rows={[
          [<Code>default</Code>, <>default data-sharing attribute, as on <Code>parallel</Code></>],
          [<><Code>private</Code> / <Code>firstprivate</Code> / <Code>shared</Code></>, <>per-variable data sharing for the task's private zone</>],
          [
            <Code>if(condition)</Code>,
            <>
              if <Code>condition</Code> is false the task is still created but executed{' '}
              <strong>immediately, undeferred</strong>, by the encountering thread — no handoff to the pool. Used to
              suppress task overhead for trivially small work.
            </>,
          ],
          [
            <Code>untied</Code>,
            <>
              by default a task is <strong>tied</strong> to whichever thread starts it; <Code>untied</Code> allows a
              suspended task to resume on a <em>different</em> thread at a scheduling point.
            </>,
          ],
        ]}
      />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Example — traversing a binary tree</h3>
      <Pre>{`void traverse(struct node* p) {
  if (p->left)
    #pragma omp task            // p is firstprivate
    traverse(p->left);
  if (p->right)
    #pragma omp task            // p is firstprivate
    traverse(p->right);
  process(p->data);
}

int main(int argc, char **argv) {
  struct node* root;
  ...
  #pragma omp parallel
  {
    #pragma omp master
    traverse(root);
  }
}`}</Pre>
      <p className="text-sm">
        <Code>p</Code> is (implicitly) <strong>firstprivate</strong> for each spawned task — exactly the role{' '}
        <Code>captureprivate</Code> played for the Intel model: each task keeps the node pointer it was created for,
        even as the enclosing call keeps recursing. <Code>master</Code> ensures only thread 0 starts the walk (so the
        tree isn't traversed once per thread).
      </p>
      <Panel className="text-sm leading-relaxed">
        <Tag tone="warn">watch out</Tag>{' '}
        <span className="ml-1">
          As written, <Code>process(p-&gt;data)</Code> runs right after the two <Code>task</Code> pragmas are
          encountered — with <strong>no guarantee</strong> that the spawned child tasks for <Code>p-&gt;left</Code>{' '}
          and <Code>p-&gt;right</Code> have finished yet. Fine for a preorder-style visit where nodes are independent;
          wrong if <Code>process</Code> must run <em>after</em> the children (e.g. accumulating results upward). The
          next tab fixes this with <Code>taskwait</Code>.
        </span>
      </Panel>
    </div>
  </div>
)

/* ================================================================== *
 *  Tab 4 · taskwait & scheduling points
 * ================================================================== */

const treeNodes: GNode[] = [
  { id: 'A', x: 180, y: 26, label: 'A' },
  { id: 'B', x: 90, y: 96, label: 'B' },
  { id: 'C', x: 270, y: 96, label: 'C' },
  { id: 'D', x: 45, y: 166, label: 'D' },
  { id: 'E', x: 135, y: 166, label: 'E' },
  { id: 'F', x: 225, y: 166, label: 'F' },
  { id: 'G', x: 315, y: 166, label: 'G' },
]
const treeEdges: GEdge[] = [
  { from: 'A', to: 'B' },
  { from: 'A', to: 'C' },
  { from: 'B', to: 'D' },
  { from: 'B', to: 'E' },
  { from: 'C', to: 'F' },
  { from: 'C', to: 'G' },
]

interface TreeStep {
  text: string
  spawned: string[]
  done: string[]
}
const treeSteps: TreeStep[] = [
  { text: 'traverse(A) hits the first task pragma (A→left = B): spawns a task for B and moves on without waiting for it.', spawned: ['B'], done: [] },
  { text: 'traverse(A) hits the second task pragma (A→right = C): spawns a task for C.', spawned: ['B', 'C'], done: [] },
  { text: 'traverse(A) reaches #pragma omp taskwait: A blocks here until its direct child tasks B and C — and everything they in turn spawn — are completely finished.', spawned: ['B', 'C'], done: [] },
  { text: 'Some thread picks up task B and runs traverse(B): it spawns tasks for D and E, then hits its own taskwait.', spawned: ['B', 'C', 'D', 'E'], done: [] },
  { text: 'A thread picks up task D. D has no children, so traverse(D) falls straight through to process(D).', spawned: ['B', 'C', 'D', 'E'], done: ['D'] },
  { text: 'Task E is picked up the same way: process(E) runs directly (leaf).', spawned: ['B', 'C', 'D', 'E'], done: ['D', 'E'] },
  { text: "B's taskwait is now satisfied (D and E finished) — B proceeds to process(B).", spawned: ['B', 'C', 'D', 'E'], done: ['D', 'E', 'B'] },
  { text: 'A thread picks up task C and runs traverse(C): spawns tasks for F and G, then hits its own taskwait.', spawned: ['B', 'C', 'D', 'E', 'F', 'G'], done: ['D', 'E', 'B'] },
  { text: 'Task F is picked up: process(F) runs directly (leaf).', spawned: ['B', 'C', 'D', 'E', 'F', 'G'], done: ['D', 'E', 'B', 'F'] },
  { text: 'Task G is picked up: process(G) runs directly (leaf).', spawned: ['B', 'C', 'D', 'E', 'F', 'G'], done: ['D', 'E', 'B', 'F', 'G'] },
  { text: "C's taskwait is satisfied (F and G finished) — C proceeds to process(C).", spawned: ['B', 'C', 'D', 'E', 'F', 'G'], done: ['D', 'E', 'B', 'F', 'G', 'C'] },
  {
    text: "A's taskwait is finally satisfied — B and C, and everything beneath them, are done. A proceeds to process(A). Every node was processed only after both its children were — a correct postorder, guaranteed purely by the two taskwaits at each level.",
    spawned: ['B', 'C', 'D', 'E', 'F', 'G'],
    done: ['D', 'E', 'B', 'F', 'G', 'C', 'A'],
  },
]

const TreeTaskDemo: React.FC = () => {
  const [i, setI] = useState(0)
  const step = treeSteps[i]
  const fillOf = (id: string): Fill => {
    if (step.done.includes(id)) return 'active'
    if (id === 'A' || step.spawned.includes(id)) return 'succ'
    return 'dim'
  }

  return (
    <div>
      <FlowGraph nodes={treeNodes} edges={treeEdges} width={360} height={200} fillOf={fillOf} maxW={340} />
      <Panel className="text-sm leading-relaxed mb-2">{step.text}</Panel>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setI((p) => Math.max(0, p - 1))}
          disabled={i === 0}
          className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          ← back
        </button>
        <span className="flex-1 text-center text-xs text-muted-foreground">
          step {i + 1} of {treeSteps.length}
        </span>
        <button
          onClick={() => setI((p) => Math.min(treeSteps.length - 1, p + 1))}
          disabled={i === treeSteps.length - 1}
          className="text-[12px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          next →
        </button>
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground mt-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border" style={{ background: 'var(--color-card)', opacity: 0.6 }} /> not yet spawned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} /> queued / running
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--color-primary)' }} /> process() done
        </span>
      </div>
    </div>
  )
}

const TaskwaitSection: React.FC = () => (
  <div className="space-y-3">
    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">taskwait — wait for my direct children</h3>
      <p className="text-sm mb-2">
        <Code>#pragma omp taskwait</Code> blocks the executing thread until all <strong>child tasks</strong> created by
        the current task (not grandchildren spawned by those children — but see below) have completed. That's exactly
        what a postorder traversal needs: process a node only after both its children are done.
      </p>
      <Pre>{`void traverse(struct node* p) {
  if (p->left)
    #pragma omp task            // p is firstprivate
    traverse(p->left);
  if (p->right)
    #pragma omp task            // p is firstprivate
    traverse(p->right);

  #pragma omp taskwait
  process(p->data);
}`}</Pre>
      <p className="text-xs text-muted-foreground">
        <Code>taskwait</Code> only waits for <em>direct</em> children — but each child's own <Code>traverse</Code>{' '}
        call contains the very same pattern, so it doesn't return (and isn't marked "done") until <em>its</em>{' '}
        children have finished either. The guarantee propagates all the way down by induction.
      </p>
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Watch the postorder guarantee play out</h3>
      <p className="text-sm mb-3">
        Same tree as before, now with <Code>taskwait</Code> added at every level. Step through and check: is any node
        ever processed before both its children are?
      </p>
      <TreeTaskDemo />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Scheduling points — where a task switch may happen</h3>
      <Table
        head={['Scheduling point', '']}
        rows={[
          [<>directly after task generation</>, <>the generating thread may switch to run the new task, or leave it for another thread</>],
          [<>after a task completes</>, <>the thread executing it may pick up a different queued task</>],
          [<>every location inside an <Code>untied</Code> task</>, <>only untied tasks may be suspended and later resumed by a <em>different</em> thread</>],
          [<><Code>taskwait</Code>, implicit and explicit barriers</>, <>threads may execute pending tasks while they wait</>],
        ]}
      />
    </div>

    <div className="rounded-lg border p-4">
      <h3 className="text-base font-semibold mb-2">Three task models, side by side</h3>
      <Table
        head={['', 'Task-pool (2.5)', 'Intel taskq / task', 'OpenMP 3.0 task']}
        rows={[
          [
            <>who marks the work</>,
            <>ordinary user code (<Code>nextTask</Code>/<Code>runTask</Code>) — no task language construct at all</>,
            <><Code>taskq</Code> generates, <Code>task</Code> marks one item</>,
            <><Code>task</Code> directly on any block</>,
          ],
          [<>bound to a thread?</>, <>n/a — a loop iteration runs to completion on whichever thread grabbed it</>, <>no</>, <>no (unless <Code>untied</Code> is <em>absent</em>, which ties it — terminology is the reverse of what it sounds like)</>],
          [
            <>sync at "pool end"</>,
            <>parallel region's implicit barrier once no task remains</>,
            <>implicit barrier at the closing <Code>{'}'}</Code> of <Code>taskq</Code></>,
            <>none automatic between siblings — use <Code>taskwait</Code> or rely on the enclosing region's barrier</>,
          ],
          [
            <>granularity control</>,
            <>none built in — programmer sizes the loop chunks</>,
            <>none built in</>,
            <><Code>if(condition)</Code> — false ⇒ run immediately, undeferred, no pool overhead</>,
          ],
          [<>best fit</>, <>simple index-based dynamic work queues</>, <>lists/trees generated while walking, nested pools</>, <>general recursive / irregular algorithms with fine control</>],
        ]}
      />
    </div>
  </div>
)

/* ================================================================== *
 *  Tab 5 · Questions  (exactly 5, easy → hardest, Q1 fully worked)
 * ================================================================== */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems on §5.3, easy → hardest. Q1 is fully worked to set the pattern — sequential code in,
      correct task-based code out, with every added pragma justified. Try the rest on paper first, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Turn a sequential list traversal into OpenMP 3.0 tasks"
      statement={
        <>
          <p className="mb-2">
            Parallelize this sequential traversal using the OpenMP 3.0 <Code>task</Code> construct. Explain{' '}
            <strong>every</strong> pragma you add, including any needed for correctness that don't obviously "do
            work".
          </p>
          <Pre>{`void processList(List* list)
{
  while (list != NULL) {
    process(list);
    list = list->next;
  }
}`}</Pre>
        </>
      }
      solution={
        <>
          <Pre>{`void processList(List* list)
{
  #pragma omp parallel
  {
    #pragma omp single
    {
      while (list != NULL) {
        #pragma omp task firstprivate(list)
        process(list);

        list = list->next;
      }
    }             // implicit barrier: all remaining tasks finish here
  }
}`}</Pre>
          <div className="text-sm">
            <Step n="①">
              <Code>#pragma omp parallel</Code> — creates the thread team that will execute the tasks.
            </Step>
            <Step n="②">
              <Code>#pragma omp single</Code> — without it, <strong>every</strong> thread in the team would run the
              whole <Code>while</Code> loop, each walking the list and spawning its own full set of tasks. One thread
              must own the (sequential, pointer-chasing) walk; the others simply wait to pick up tasks once some
              exist.
            </Step>
            <Step n="③">
              <Code>#pragma omp task</Code> on <Code>process(list)</Code> — turns each node's processing into an
              independent unit of work any team member can execute.
            </Step>
            <Step n="④">
              <Code>firstprivate(list)</Code> — the single thread keeps advancing the shared <Code>list</Code>{' '}
              pointer immediately after spawning each task. Without capturing its value <em>at task-creation time</em>
              , every task would (eventually) see whatever <Code>list</Code> holds when it happens to run — likely{' '}
              <Code>NULL</Code>, since the walk finishes long before all tasks are drained. This is the same bug{' '}
              <Code>captureprivate</Code> prevents in the Intel model.
            </Step>
            <Step n="⑤">
              No <Code>taskwait</Code> is needed inside the loop — there's no dependency <em>between</em> processing
              different nodes. The <strong>implicit barrier</strong> at the end of the <Code>single</Code> block (and
              again at the end of <Code>parallel</Code>) is exactly what guarantees every spawned task has completed
              before <Code>processList</Code> returns.
            </Step>
          </div>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Why the critical region and the private t?"
      statement={
        <>
          <p className="mb-2">
            In the OpenMP 2.5 task pool, <Code>nextTask()</Code> looks like this. (a) What goes wrong if you delete
            the <Code>critical</Code> region? (b) What goes wrong if you <Code>return task_index;</Code> instead of{' '}
            <Code>return t;</Code> (keeping the critical region)?
          </p>
          <Pre>{`int nextTask()
{
  int t = -1;
  #pragma omp critical (nextTask)
  {
    if (task_index < max_task_index)
      t = task_index++;
  }
  return t;
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a) Without critical:</strong> <Code>task_index++</Code> is a read-modify-write, exactly like the{' '}
            <Code>sum += 1</Code> race from §5.2. Two threads can both read the same <Code>task_index</Code> before
            either writes it back — one increment is lost, so the same task index gets handed to <em>two</em> threads
            (duplicate work / double <Code>free()</Code>, etc.) while another index is <em>never</em> handed out
            (skipped node).
          </p>
          <p className="text-sm mb-1">
            <strong>(b) Returning task_index:</strong> even with the critical region protecting the increment, by the
            time the function reaches <Code>return</Code>, another thread may already have entered its own critical
            region and advanced <Code>task_index</Code> further. Reading the shared variable again outside the
            critical section is itself unsynchronized and can return a value some other thread already claimed (or a
            value past <Code>max_task_index</Code>). <Code>t</Code> is <strong>private</strong>, so it safely
            remembers exactly the value <em>this</em> thread was granted.
          </p>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Why no explicit synchronization is needed here"
      statement={
        <>
          <p className="mb-2">
            The Intel workqueueing tree traversal below has no <Code>taskwait</Code>-like construct anywhere, yet it
            correctly processes every node <em>after</em> both its children. Explain precisely why, using the stated
            semantics of <Code>taskq</Code>.
          </p>
          <Pre>{`void traverse(struct node* p) {
  #pragma intel omp taskq
  {
    if (p->left)  traverse(p->left);
    if (p->right) traverse(p->right);

    #pragma intel omp task
    process(p->data);
  }
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            The key rule: a <Code>taskq</Code> block has an <strong>implicit barrier at its closing brace</strong> —
            control cannot leave the block until every task queued inside it (including tasks queued by{' '}
            <em>nested</em> <Code>taskq</Code> blocks) has finished.
          </p>
          <p className="text-sm mb-1">
            <Code>traverse(p-&gt;left)</Code> is an <strong>ordinary function call</strong>, not a <Code>task</Code>{' '}
            — the calling thread executes it right now, synchronously. That call opens its own{' '}
            <Code>taskq</Code>, and per the rule above, does not <em>return</em> until that entire block's implicit
            barrier is satisfied — meaning <Code>p-&gt;left</Code>'s own <Code>process</Code> task, and everything its
            own recursive calls generated, are already done.
          </p>
          <Panel className="text-sm leading-relaxed">
            <Good>So by induction:</Good> when <Code>traverse(p)</Code> reaches its own{' '}
            <Code>#pragma intel omp task process(p-&gt;data)</Code>, both <Code>traverse(p-&gt;left)</Code> and{' '}
            <Code>traverse(p-&gt;right)</Code> have already fully returned — their whole subtrees are processed. The
            postorder guarantee comes entirely from the closing-brace barrier of <Code>taskq</Code> combined with the
            fact that the recursive calls are plain (blocking) calls rather than deferred tasks — no separate wait
            construct is needed.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Missing taskwait: what breaks, and does the fix fully propagate?"
      statement={
        <>
          <p className="mb-2">
            This OpenMP 3.0 version accumulates a subtree sum into <Code>p-&gt;total</Code> from its children's
            already-computed totals. (a) Show a concrete way it can produce a wrong answer. (b) Fix it. (c){' '}
            <Code>taskwait</Code> only waits for <em>direct</em> children — explain why that is nonetheless enough to
            guarantee <Code>p-&gt;total</Code> is correct for the <em>whole</em> subtree rooted at <Code>p</Code>, not
            just its immediate children.
          </p>
          <Pre>{`void sumTree(struct node* p) {
  if (p->left)
    #pragma omp task
    sumTree(p->left);
  if (p->right)
    #pragma omp task
    sumTree(p->right);

  p->total = p->val
            + (p->left  ? p->left->total  : 0)
            + (p->right ? p->right->total : 0);
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a) The bug.</strong> The two <Code>task</Code> pragmas only <em>spawn</em> work for the children
            — they don't block. Execution falls straight through to the sum, which reads{' '}
            <Code>p-&gt;left-&gt;total</Code> and <Code>p-&gt;right-&gt;total</Code> immediately. If the child tasks
            haven't run yet (very likely — they may still be sitting in the pool), those fields hold stale or
            uninitialized values, and <Code>p-&gt;total</Code> is wrong.
          </p>
          <p className="text-sm mb-1">
            <strong>(b) Fix</strong> — block until the children are done before reading their totals:
          </p>
          <Pre>{`void sumTree(struct node* p) {
  if (p->left)
    #pragma omp task
    sumTree(p->left);
  if (p->right)
    #pragma omp task
    sumTree(p->right);

  #pragma omp taskwait
  p->total = p->val
            + (p->left  ? p->left->total  : 0)
            + (p->right ? p->right->total : 0);
}`}</Pre>
          <p className="text-sm mb-1">
            <strong>(c) Why direct-child waiting is enough.</strong> <Code>taskwait</Code> in <Code>sumTree(p)</Code>{' '}
            waits until the <em>tasks</em> for <Code>p-&gt;left</Code> and <Code>p-&gt;right</Code> have{' '}
            <em>returned</em> — and each of those tasks is itself a call to <Code>sumTree</Code>, which does not
            return until <em>its own</em> <Code>taskwait</Code> is satisfied. So "child task finished" recursively
            means "child task finished, and so did its taskwait, and so did its children's tasks, …" all the way to
            the leaves.
          </p>
          <Panel className="text-sm leading-relaxed">
            <Good>General pattern:</Good> a single-level <Code>taskwait</Code>, placed at <em>every</em> level of a
            recursive task spawn, composes into a full-subtree wait by induction — exactly the same argument as
            Question 3's implicit <Code>taskq</Code> barrier, just made explicit here instead of automatic.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Task explosion and the if() clause"
      statement={
        <>
          <p className="mb-2">
            A student parallelizes a divide-and-conquer Fibonacci with <Code>task</Code> at{' '}
            <strong>every</strong> recursive call, down to the base case <Code>n &lt; 2</Code>.
          </p>
          <Pre>{`void fib_task(int n, int *result) {
  if (n < 2) { *result = n; return; }
  int x, y;
  #pragma omp task shared(x)
  fib_task(n - 1, &x);
  #pragma omp task shared(y)
  fib_task(n - 2, &y);
  #pragma omp taskwait
  *result = x + y;
}`}</Pre>
          <p className="mt-2">
            (a) For input <Code>n</Code> around 35–40 this runs <em>slower</em> than a sequential version, even on a
            machine with many cores. Why? (b) Add an <Code>if()</Code> clause that fixes it, using the semantics: "if{' '}
            <Code>condition</Code> is false, the task is executed immediately by the encountering thread instead of
            being deferred." (c) What does your fix reduce to as <Code>n</Code> shrinks below the cutoff?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>(a) Task explosion.</strong> The call tree has roughly <Code>2^n</Code> nodes, so this spawns a
            task for essentially <strong>every</strong> recursive call, almost all of them trivial (adding two small
            numbers). Creating, queueing, scheduling and synchronizing a task costs far more than computing{' '}
            <Code>fib(1)</Code> itself — the bookkeeping overhead swamps the actual work, and it swamps it{' '}
            <em>increasingly</em> as <Code>n</Code> grows, since the number of tasks grows exponentially while
            available cores stay fixed.
          </p>
          <p className="text-sm mb-1">
            <strong>(b) Cut off task creation below some grain size</strong> — e.g. below <Code>n = 20</Code>, run the
            call immediately instead of deferring it:
          </p>
          <Pre>{`void fib_task(int n, int *result) {
  if (n < 2) { *result = n; return; }
  int x, y;
  #pragma omp task shared(x) if(n > 20)
  fib_task(n - 1, &x);
  #pragma omp task shared(y) if(n > 20)
  fib_task(n - 2, &y);
  #pragma omp taskwait
  *result = x + y;
}`}</Pre>
          <p className="text-sm mb-1">
            <strong>(c) Below the cutoff</strong> (<Code>n ≤ 20</Code>), the <Code>if</Code> condition is false, so
            each <Code>task</Code> pragma is executed <strong>immediately</strong> by the current thread rather than
            queued — the whole subtree below the cutoff collapses back into <strong>ordinary sequential
            recursion</strong>, run inline by whichever thread reached it, with zero task-creation overhead.
          </p>
          <Panel className="text-sm leading-relaxed">
            <Good>Net effect:</Good> only the top ~<Code>n − 20</Code> levels of the recursion — a polynomial, not
            exponential, number of nodes — actually create real (deferrable) tasks and expose parallelism; everything
            below the cutoff runs as cheap sequential work. This is the standard fix for fine-grained
            divide-and-conquer task parallelism: pick a grain size where task overhead becomes negligible relative to
            the work, and stop dividing there.
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
  { id: 'pool', label: 'Task-pools (2.5)', render: () => <TaskPoolSection /> },
  { id: 'intel', label: 'Intel taskq / task', render: () => <IntelSection /> },
  { id: 'task30', label: 'task directive (3.0)', render: () => <TaskDirectiveSection /> },
  { id: 'taskwait', label: 'taskwait & scheduling', render: () => <TaskwaitSection /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function ParallelTasksStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 5 · §5.3 · Parallel Tasks"
      title="Parallel Tasks"
      subtitle="Regular parallel loops break down for lists, trees, and other irregular, dynamically-discovered work. This section covers hand-rolled task pools (OpenMP 2.5), the Intel taskq/task workqueueing extensions, and the standardized OpenMP 3.0 task and taskwait directives."
      tabs={tabs}
    />
  )
}
