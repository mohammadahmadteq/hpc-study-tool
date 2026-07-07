import React from 'react'
import { cn } from './lib/utils'
import {
  Code,
  Pre,
  Formula,
  Table,
  Panel,
  Good,
  Bad,
  Tag,
  Stepper,
  FlowGraph,
  QuestionCard,
  StudyShell,
  type StepPanel,
  type GNode,
  type GEdge,
  type TabDef,
} from './components/study/kit'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'

/* ------------------------------------------------------------------ *
 *  Chapter 3 · Exam Practice — 10 written-exam problems covering all
 *  of §3.1–§3.4. Q1, Q3, Q9, Q10 are real exercise-sheet questions
 *  (Ex 4.2, 4.3, 6.1, 5.2); the rest are new problems in the same
 *  style and difficulty. Every question carries its point split.
 * ------------------------------------------------------------------ */

/* ---- local helper: coloured δ-dependence tags (matches §3.1) ------ */

type DepKind = 't' | 'a' | 'o' | 'inf'
const depClass: Record<DepKind, string> = {
  t: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  a: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  o: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  inf: 'bg-muted text-foreground',
}
const Dep: React.FC<{ k: DepKind; children: React.ReactNode }> = ({ k, children }) => (
  <span className={cn('inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', depClass[k])}>
    {children}
  </span>
)

/* ---- points banner at the top of every statement ------------------ */

const Pts: React.FC<{ split: string; total: number }> = ({ split, total }) => (
  <div className="flex justify-end mb-2">
    <Tag>{split} = {total} points</Tag>
  </div>
)

/* ---- bracketed matrix / column vector (matches §3.3) -------------- */

const Bracketed: React.FC<{ rows: React.ReactNode[][]; className?: string }> = ({ rows, className }) => {
  const cols = rows[0]?.length ?? 0
  const fg = 'var(--color-foreground)'
  return (
    <span className={cn('inline-flex items-stretch align-middle my-1', className)}>
      <span className="w-[6px] shrink-0 rounded-l-[3px]" style={{ borderLeft: `2px solid ${fg}`, borderTop: `2px solid ${fg}`, borderBottom: `2px solid ${fg}` }} />
      <span
        className="grid gap-x-3 gap-y-1 px-2 py-1 text-[12.5px] font-mono leading-tight"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(16px, max-content))` }}
      >
        {rows.flat().map((c, i) => (
          <span key={i} className="text-center tabular-nums">
            {c}
          </span>
        ))}
      </span>
      <span className="w-[6px] shrink-0 rounded-r-[3px]" style={{ borderRight: `2px solid ${fg}`, borderTop: `2px solid ${fg}`, borderBottom: `2px solid ${fg}` }} />
    </span>
  )
}

const Row: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex items-center gap-2 flex-wrap my-2', className)}>{children}</div>
)

/* ================================================================== *
 *  Q9 (Ex 6.1) — data dependence graph                                *
 * ================================================================== */

const ddg61Nodes: GNode[] = [
  { id: 'S1', x: 170, y: 42, label: 'S₁' },
  { id: 'S2', x: 56, y: 118, label: 'S₂' },
  { id: 'S3', x: 284, y: 118, label: 'S₃' },
  { id: 'S4', x: 110, y: 208, label: 'S₄' },
  { id: 'S5', x: 236, y: 208, label: 'S₅' },
]
const ddg61Edges: GEdge[] = [
  { from: 'S1', to: 'S2', label: 'δᵗ₁', bend: -26 },
  { from: 'S2', to: 'S1', label: 'δᵗ₁', bend: -26 },
  { from: 'S1', to: 'S3', label: 'δᵃ∞ δᵃ₂', bend: -26 },
  { from: 'S3', to: 'S1', label: 'δᵗ₂', bend: -26 },
  { from: 'S1', to: 'S4', label: 'δᵗ₁' },
  { from: 'S1', to: 'S5', label: 'δᵗ∞ δᵃ₁', bend: -14 },
  { from: 'S3', to: 'S2', label: 'δᵃ₂', bend: 40 },
  { from: 'S3', to: 'S5', label: 'δᵒ₁' },
]

/* ================================================================== *
 *  Q9 (Ex 6.1) — codegen() run as a stepper                           *
 * ================================================================== */

const codegen61Steps: StepPanel[] = [
  {
    title: '1 · k = 1: strongly connected components of D',
    body: (
      <>
        <p className="text-sm mb-2">
          At level 1 the <em>whole</em> dependence graph counts (every level ≥ 1, including ∞). Two cycles exist:
        </p>
        <Table
          head={['Cycle', 'Edges', 'Consequence']}
          rows={[
            ['S1 ↔ S2', <>S1 δᵗ₁ S2 (a) and S2 δᵗ₁ S1 (b)</>, 'same SCC'],
            ['S1 ↔ S3', <>S1 δᵃ∞ S3 (c) and S3 δᵗ₂ S1 (c)</>, 'S3 joins the same SCC'],
          ]}
        />
        <Formula>{`π1 = {S1, S2, S3}     π2 = {S4}     π3 = {S5}`}</Formula>
      </>
    ),
  },
  {
    title: '2 · Condensation Dπ and topological order',
    body: (
      <>
        <Table
          head={['Edge in Dπ', 'From the dependences']}
          rows={[
            ['π1 → π2', <>S1 δᵗ₁ S4 (a)</>],
            ['π1 → π3', <>S1 δᵗ∞ S5, S1 δᵃ₁ S5, S3 δᵒ₁ S5 (a, c)</>],
          ]}
        />
        <p className="text-sm">
          Topological order: <Code>π1, π2, π3</Code> (π2 and π3 are unordered with respect to each other — either way
          is correct).
        </p>
      </>
    ),
  },
  {
    title: '3 · π1 is cyclic → sequential i-loop, recurse with k = 2',
    body: (
      <>
        <p className="text-sm mb-2">
          π1 lies on a cycle, so <Code>codegen</Code> emits a <strong>sequential</strong> <Code>for i</Code> loop and
          recurses on <Code>{'{S1, S2, S3}'}</Code> with <Code>D₂</Code> = all dependences of <strong>level ≥ 2</strong>{' '}
          (the level-1 edges S1 δᵗ₁ S2 and S2 δᵗ₁ S1 are now satisfied by the sequential i-loop and are removed):
        </p>
        <Formula>{`D2:  S3 δᵗ₂ S1,  S1 δᵃ∞ S3,  S1 δᵃ₂ S3,  S3 δᵃ₂ S2,  S3 δᵒ₂ S3`}</Formula>
      </>
    ),
  },
  {
    title: '4 · k = 2: SCCs are {S1,S3} and {S2}',
    body: (
      <>
        <p className="text-sm mb-2">
          <Code>S1 → S3</Code> (anti) and <Code>S3 → S1</Code> (flow) still form a cycle ⇒ <Code>{'{S1, S3}'}</Code>{' '}
          stays sequential at level 2 as well. <Code>S2</Code> is a singleton; the edge S3 δᵃ₂ S2 orders it{' '}
          <em>after</em> the cycle.
        </p>
        <p className="text-sm mb-2">
          <Code>{'{S1, S3}'}</Code>: sequential <Code>for j</Code> loop, recurse with k = 3. Only{' '}
          <Code>S1 δᵃ∞ S3</Code> remains — acyclic, no loop dimension left ⇒ emit <Code>S1; S3</Code> as scalar
          statements in that order.
        </p>
        <p className="text-sm">
          <Code>{'{S2}'}</Code>: not cyclic, single instruction ⇒ <strong>vector instruction over j</strong> inside the
          sequential i-loop.
        </p>
      </>
    ),
  },
  {
    title: '5 · Back at k = 1: π2 and π3 become vector instructions',
    body: (
      <>
        <p className="text-sm mb-2">
          π2 = {'{S4}'} and π3 = {'{S5}'} are acyclic singletons at level 1 ⇒ vectorize over <em>all</em> their
          dimensions. Final code:
        </p>
        <Pre>{`for (i = 1; i <= 10; i++) {          // π1: sequential (S1↔S2 cycle)
  for (j = 2; j < n; j++) {          //     sequential (S1↔S3 cycle)
    S1: a[i+1][j+1] = b[i-1][j+5] + c[i];
    S3: c[i]        = b[i][2*j] - 1;
  }
  S2: b[i][2:n-1] = a[i][0:n-3];     // vector in j (after the cycle:
}                                    //   S3 must read the old b[i][2j])
S4: x[1:10][2:n-1] = a[1:10][2:n-1]; // fully vector (i and j)
S5: c[0:9] = a[2:11][n];             // vector in i`}</Pre>
        <Panel className="text-sm leading-relaxed">
          Every constraint survives: S2 is emitted after the j-loop because of the <strong>anti</strong> dependence S3
          δᵃ₂ S2 (S3 must read the old <Code>b[i][2j]</Code>); S4 and S5 run after the whole i-loop because their
          inputs <Code>a</Code> and <Code>c</Code> are only final then.
        </Panel>
      </>
    ),
  },
]

/* ================================================================== *
 *  Q10 (Ex 5.2) — stepwise elimination as a stepper                   *
 * ================================================================== */

const elim52Steps: StepPanel[] = [
  {
    title: '1 · Eliminate iᵈ with equation (2)',
    body: (
      <>
        <p className="text-sm mb-1">Equation (2) has coefficient −1 for iᵈ — solve for it and substitute:</p>
        <Formula>{`(2)  −iᵈ + 3jᵈ + 2jᵘ = 6   ⇒   iᵈ = 3jᵈ + 2jᵘ − 6

into (1):  3(3jᵈ + 2jᵘ − 6) − 6jᵈ − iᵘ + 5jᵘ = −1
        ⇔  3jᵈ − iᵘ + 11jᵘ = 17                    (1')

into (3):  −4(3jᵈ + 2jᵘ − 6) − 5jᵈ + 11iᵘ − 5jᵘ = −3
        ⇔  −17jᵈ + 11iᵘ − 13jᵘ = −27              (3')`}</Formula>
      </>
    ),
  },
  {
    title: '2 · Eliminate iᵘ with equation (1′)',
    body: (
      <Formula>{`(1')  ⇒  iᵘ = 3jᵈ + 11jᵘ − 17

into (3'):  −17jᵈ + 11(3jᵈ + 11jᵘ − 17) − 13jᵘ = −27
         ⇔  16jᵈ + 108jᵘ = 160
         ⇔  4jᵈ + 27jᵘ = 40        (divide by 4)`}</Formula>
    ),
  },
  {
    title: '3 · Solve the last equation (GCD test + parametrization)',
    body: (
      <>
        <Formula>{`gcd(4, 27) = 1   and   1 | 40   ⇒  solvable

extended Euclid:  1 = 7·4 − 1·27
particular:       jᵈ = 7·40 = 280,   jᵘ = −40
general (t ∈ ℤ):  jᵈ = 280 − 27t,   jᵘ = −40 + 4t`}</Formula>
        <p className="text-sm">Back-substitute to get all four unknowns in the parameter t:</p>
        <Formula>{`iᵘ = 3jᵈ + 11jᵘ − 17 = 3(280−27t) + 11(−40+4t) − 17 = 383 − 37t
iᵈ = 3jᵈ + 2jᵘ − 6   = 3(280−27t) + 2(−40+4t) − 6   = 754 − 73t`}</Formula>
      </>
    ),
  },
  {
    title: '4 · Intersect with the loop-bound inequalities',
    body: (
      <>
        <Table
          head={['Unknown', 'Range', 'Condition on t', 'Result']}
          rows={[
            ['iᵈ = 754 − 73t', '[−50, 80]', '674/73 ≤ t ≤ 804/73', 't ∈ {10, 11}'],
            ['jᵈ = 280 − 27t', '[−40, 60]', '220/27 ≤ t ≤ 320/27', 't ∈ {9, 10, 11}'],
            ['iᵘ = 383 − 37t', '[−50, 80]', '303/37 ≤ t ≤ 433/37', 't ∈ {9, 10, 11}'],
            ['jᵘ = −40 + 4t', '[−40, 60]', '0 ≤ t ≤ 25', 't ∈ {0, …, 25}'],
          ]}
        />
        <Formula>{`intersection:  t ∈ {10, 11}

t = 10:  (iᵈ, jᵈ, iᵘ, jᵘ) = (24, 10, 13, 0)
t = 11:  (iᵈ, jᵈ, iᵘ, jᵘ) = (−49, −17, −24, 4)`}</Formula>
        <p className="text-sm">Exactly two instance pairs access the same element of a.</p>
      </>
    ),
  },
]

/* ================================================================== *
 *  Questions 1–5
 * ================================================================== */

const QuestionsA: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">How this section works</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          Ten written-exam problems covering <strong>all of Chapter 3</strong> (§3.1 classification · §3.2
          vectorization · §3.3 dependence systems · §3.4 solving them), ordered easy → hardest, <strong>79 points</strong>{' '}
          total. Q1, Q3, Q9 and Q10 are the original exercise-sheet questions (Ex 4.2, 4.3, 6.1, 5.2); the other six are
          new problems of the same style and difficulty. Q1 is fully worked — study its pattern first, then do each
          question on paper before revealing.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Tag>Q1–Q5 · graphs, vectors, tests</Tag>
          <Tag>Q6–Q10 · sinking, systems, vectorization</Tag>
        </div>
      </CardContent>
    </Card>

    {/* ---------------------------------------------------------- Q1 */}
    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Data dependence graphs (Ex 4.2) · 6 P"
      statement={
        <>
          <Pts split="2 + 3 + 1" total={6} />
          <p className="mb-2">
            Construct the data dependence graphs for the following C program fragments. Use{' '}
            <strong>address-based</strong> dependences. Annotate each edge with the specific kind of dependence (flow,
            anti, output).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">(a)</p>
              <Pre>{`1  a = 0;
2  b = a;
3  c = a + d;
4  d = 2;`}</Pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">(b)</p>
              <Pre>{`1  b = a * 2;
2  c = b + 1;
3  if (c > 1)
4    b = c + 1;
5  else
6    b = b - 1;
7  e = b - d;`}</Pre>
            </div>
          </div>
          <p className="mt-2">(c) Which dependences can be omitted if we use a value-based definition?</p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 2 P</p>
          <p className="text-sm mb-1">Every variable is written at most once, so there are no output dependences:</p>
          <Table
            head={['Edge', 'Var', 'Type', 'Reason']}
            rows={[
              ['S1 → S2', 'a', <Dep k="t">δᵗ flow</Dep>, 'S1 writes a, S2 reads a'],
              ['S1 → S3', 'a', <Dep k="t">δᵗ flow</Dep>, 'S1 writes a, S3 reads a'],
              ['S3 → S4', 'd', <Dep k="a">δᵃ anti</Dep>, 'S3 reads d, S4 overwrites d'],
            ]}
          />
          <p className="text-sm font-medium mt-3 mb-1">(b) — 3 P</p>
          <p className="text-sm mb-1">
            S4 and S6 sit on <strong>mutually exclusive branches</strong>: no execution path connects them, so there is{' '}
            <em>no</em> dependence between S4 and S6 (a dependence needs a possible path). All other pairs:
          </p>
          <Table
            head={['Edge', 'Var', 'Type', 'Reason']}
            rows={[
              ['S1 → S2', 'b', <Dep k="t">δᵗ flow</Dep>, 'S1 writes b, S2 reads b'],
              ['S2 → S3', 'c', <Dep k="t">δᵗ flow</Dep>, 'the if-condition reads c'],
              ['S2 → S4', 'c', <Dep k="t">δᵗ flow</Dep>, 'S4 reads c'],
              ['S1 → S6', 'b', <Dep k="t">δᵗ flow</Dep>, 'S6 reads b (value from S1 on the else path)'],
              ['S1 → S7', 'b', <Dep k="t">δᵗ flow</Dep>, 'same address; address-based only (see (c))'],
              ['S4 → S7', 'b', <Dep k="t">δᵗ flow</Dep>, 'S4 writes b, S7 reads b (then path)'],
              ['S6 → S7', 'b', <Dep k="t">δᵗ flow</Dep>, 'S6 writes b, S7 reads b (else path)'],
              ['S2 → S4', 'b', <Dep k="a">δᵃ anti</Dep>, 'S2 reads b, S4 overwrites b'],
              ['S2 → S6', 'b', <Dep k="a">δᵃ anti</Dep>, 'S2 reads b, S6 overwrites b'],
              ['S1 → S4', 'b', <Dep k="o">δᵒ output</Dep>, 'S1 and S4 both write b'],
              ['S1 → S6', 'b', <Dep k="o">δᵒ output</Dep>, 'S1 and S6 both write b'],
            ]}
          />
          <p className="text-sm font-medium mt-3 mb-1">(c) — 1 P</p>
          <Panel className="text-sm leading-relaxed">
            In (a) nothing changes — no value is ever killed. In (b), <Code>S1 δᵗ S7</Code> can be omitted: on{' '}
            <em>every</em> path from S1 to S7, <Code>b</Code> is overwritten first (by S4 on the then-branch, by S6 on
            the else-branch), so S1's value never reaches S7. All other dependences have no intervening kill and stay.
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q2 */}
    <QuestionCard
      n={2}
      diff="Easy"
      title="Normalisation, distance and direction of a 2-D nest · 6 P"
      statement={
        <>
          <Pts split="2 + 3 + 1" total={6} />
          <Pre>{`for (i = 0; i <= 12; i += 3)
  for (j = 10; j >= 1; j--)
    S: a[i][j] = a[i-3][j+2] + 7;`}</Pre>
          <p className="mb-1">
            (a) Normalise the loop nest: give the mapping to normalised iteration vectors and the normalised bounds.
          </p>
          <p className="mb-1">
            (b) Determine the dependence on <Code>a</Code> with its distance vector and direction vector in the{' '}
            <em>original</em> and in the <em>normalised</em> iteration space, and give its level.
          </p>
          <p>(c) Which loop can be executed in parallel?</p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 2 P</p>
          <Formula>{`iₖⁿ = (iₖ − uₖ) / sₖ

i:  u = 0,  s = +3   ⇒  iⁿ = i / 3        i ∈ {0,3,6,9,12} ↦ iⁿ ∈ {0,…,4}
j:  u = 10, s = −1   ⇒  jⁿ = 10 − j       j ∈ {10,…,1}     ↦ jⁿ ∈ {0,…,9}`}</Formula>
          <p className="text-sm font-medium mt-3 mb-1">(b) — 3 P</p>
          <p className="text-sm mb-1">
            Instance <Code>S[i,j]</Code> reads <Code>a[i−3][j+2]</Code>, written by <Code>S[i−3, j+2]</Code>. The source
            runs earlier (smaller i) ⇒ <Dep k="t">δᵗ flow</Dep>, and it is the only dependence (each cell is written
            once, read once).
          </p>
          <Table
            head={['Space', 'd = sink − source', 'θ', 'why']}
            rows={[
              ['original', '(3, −2)', '(<, >)', 'i grows by 3; source j is larger (j counts down)'],
              ['normalised', '(1, 2)', '(<, <)', 'dⁿ₁ = 3/3 = 1; jⁿ = 10−j flips the sign: dⁿ₂ = +2'],
            ]}
          />
          <p className="text-sm mt-1">
            First non-<Code>=</Code> entry of the normalised θ is at position 1 ⇒ <strong>level 1</strong>: the
            i-loop carries the dependence. This is exactly why levels are read off <em>normalised</em> vectors — in the
            original space the downward j-loop disguises the forward flow as a "&gt;".
          </p>
          <p className="text-sm font-medium mt-3 mb-1">(c) — 1 P</p>
          <Panel className="text-sm leading-relaxed">
            All dependences (there is one) are carried at level 1 ⇒ the <strong>j-loop carries nothing</strong> and can
            run in parallel; the i-loop must stay sequential.
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q3 */}
    <QuestionCard
      n={3}
      diff="Easy"
      title="Loop dependences with distance and direction (Ex 4.3) · 6 P"
      statement={
        <>
          <Pts split="2 + 4" total={6} />
          <p className="mb-2">
            Identify the data dependences (address-based) between the statements in the following loops. For each
            dependence, give the <strong>distance</strong> and <strong>direction</strong>.
          </p>
          <p className="text-xs font-semibold text-muted-foreground mb-1">(a)</p>
          <Pre>{`for (i = 3; i <= 10; i++) {
  S1: a[i] = (a[i-2] + a[i+2]) / 2;
}`}</Pre>
          <p className="text-xs font-semibold text-muted-foreground mb-1 mt-2">(b)</p>
          <Pre>{`for (i = 1; i <= 10; i++) {
  S1: a[i+1] = b[i-1] + c[i];
  S2: b[i]   = a[i] + a[i-1] + a[i+1];
  S3: c[i]   = b[i] - 1;
}`}</Pre>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 2 P</p>
          <Table
            head={['Dependence', 'Access pair', 'Distance', 'Direction']}
            rows={[
              [<>S1 <Dep k="t">δᵗ</Dep> S1</>, <>write <Code>a[i]</Code>, read <Code>a[i-2]</Code> two iterations later</>, '(2)', '(<)'],
              [<>S1 <Dep k="a">δᵃ</Dep> S1</>, <>read <Code>a[i+2]</Code>, overwritten by the write <Code>a[i]</Code> two iterations later</>, '(2)', '(<)'],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            No output dependence — each cell is written exactly once. Both dependences are loop-carried with distance
            2, so the iterations split into two independent chains (odd/even).
          </p>
          <p className="text-sm font-medium mb-1">(b) — 4 P</p>
          <Table
            head={['Dependence', 'Var / access pair', 'Distance', 'Direction']}
            rows={[
              [<>S1 <Dep k="t">δᵗ</Dep> S2</>, <><Code>a[i+1]</Code> → read <Code>a[i+1]</Code> (same iteration)</>, '(0)', '(=)'],
              [<>S1 <Dep k="t">δᵗ</Dep> S2</>, <><Code>a[i+1]</Code> → read <Code>a[i]</Code> next iteration</>, '(1)', '(<)'],
              [<>S1 <Dep k="t">δᵗ</Dep> S2</>, <><Code>a[i+1]</Code> → read <Code>a[i-1]</Code> two later</>, '(2)', '(<)'],
              [<>S2 <Dep k="t">δᵗ</Dep> S1</>, <><Code>b[i]</Code> → read <Code>b[i-1]</Code> next iteration</>, '(1)', '(<)'],
              [<>S2 <Dep k="t">δᵗ</Dep> S3</>, <><Code>b[i]</Code> → read <Code>b[i]</Code> (same iteration)</>, '(0)', '(=)'],
              [<>S1 <Dep k="a">δᵃ</Dep> S3</>, <>S1 reads <Code>c[i]</Code>, S3 overwrites <Code>c[i]</Code> (same iteration)</>, '(0)', '(=)'],
            ]}
          />
          <Panel className="text-sm leading-relaxed mt-1">
            Note the direction of the <Code>c</Code>-dependence: within one iteration S1 <em>reads</em>{' '}
            <Code>c[i]</Code> before S3 <em>writes</em> it — read before write is an <strong>anti</strong> dependence
            S1 δᵃ S3, loop-independent. There is <em>no</em> flow dependence on <Code>c</Code>: the value S1 reads was
            never produced inside the loop. The distance-(1) edge S2 δᵗ S1 together with S1 δᵗ S2 forms a cycle across
            iterations — this loop cannot be fully vectorized.
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q4 */}
    <QuestionCard
      n={4}
      diff="Medium"
      title="Levels, parallel loops, and interchange legality in a 3-D nest · 6 P"
      statement={
        <>
          <Pts split="3 + 2 + 1" total={6} />
          <Pre>{`for (i = 1; i <= n; i++)
  for (j = 1; j <= n; j++)
    for (k = 1; k <= n; k++)
      S: a[i][j+1][k-1] = a[i][j][k] + b[i][j][k];`}</Pre>
          <p className="mb-1">
            (a) Determine all data dependences (address-based) on <Code>a</Code> with distance vector, direction vector
            and level.
          </p>
          <p className="mb-1">(b) Which of the three loops may be executed in parallel? Justify.</p>
          <p>(c) Is interchanging the j-loop and the k-loop legal? Justify with the direction vector.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 3 P</p>
          <p className="text-sm mb-1">
            Same-cell equations for write <Code>a[i][j+1][k−1]</Code> at source <Code>(i,j,k)</Code> and read{' '}
            <Code>a[i'][j'][k']</Code> at sink:
          </p>
          <Formula>{`i' = i,   j' = j + 1,   k' = k − 1
d = (0, 1, −1)      θ = (=, <, >)      level 2`}</Formula>
          <Table
            head={['Dependence', 'd', 'θ', 'Level / carrier']}
            rows={[[<>S <Dep k="t">δᵗ</Dep> S</>, '(0, 1, −1)', '(=, <, >)', 'level 2 — carried by the j-loop']]}
          />
          <p className="text-xs text-muted-foreground mb-3">
            The write happens at the earlier iteration (leading non-= is &lt; at level 2) ⇒ flow. No anti dependence
            (each cell is written only before it is read) and no output dependence (all written cells are distinct).{' '}
            <Code>b</Code> is only read.
          </p>
          <p className="text-sm font-medium mb-1">(b) — 2 P</p>
          <Panel className="text-sm leading-relaxed mb-3">
            The only dependence is carried at level 2. θ₁ = <Code>=</Code> ⇒ the <strong>i-loop</strong> carries
            nothing → parallel. The <strong>k-loop</strong> (level 3) is never the first non-= position → parallel.
            Only the <strong>j-loop</strong> must stay sequential.
          </Panel>
          <p className="text-sm font-medium mb-1">(c) — 1 P</p>
          <Panel className="text-sm leading-relaxed">
            Interchanging j and k swaps the last two components: θ becomes <Code>(=, &gt;, &lt;)</Code>. The leading
            non-<Code>=</Code> entry would be <Code>&gt;</Code> — the sink would run <em>before</em> its source.{' '}
            <Bad>Illegal</Bad>: interchange is forbidden exactly for the <Code>(…, &lt;, &gt;, …)</Code> pattern on the
            two swapped levels.
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q5 */}
    <QuestionCard
      n={5}
      diff="Medium"
      title="GCD test and extreme value test · 6 P"
      statement={
        <>
          <Pts split="2 + 3 + 1" total={6} />
          <p className="text-xs font-semibold text-muted-foreground mb-1">(a) Apply the GCD test. Can a dependence be excluded?</p>
          <Pre>{`for (i = 0; i <= n; i++)
  S: a[4*i + 2] = a[8*i - 4] + 1;`}</Pre>
          <p className="text-xs font-semibold text-muted-foreground mb-1 mt-2">
            (b) Apply the extreme value test. Can a dependence be excluded?
          </p>
          <Pre>{`for (i = 0; i <= 8; i++)
  S: a[i + 12] = a[2*i] * b[i];`}</Pre>
          <p className="mt-2">
            (c) For (b): does a dependence actually exist? If yes, give the instance pairs and the dependence type.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 2 P</p>
          <Formula>{`write a[4·iᵈ + 2],  read a[8·iᵘ − 4]:
4·iᵈ + 2 = 8·iᵘ − 4   ⇔   4·iᵈ − 8·iᵘ = −6

gcd(4, 8) = 4     4 ∤ −6`}</Formula>
          <Panel className="text-sm leading-relaxed mb-3">
            <Good>No integer solution ⇒ no dependence</Good> — the loop is fully parallelizable. (Written indices are
            ≡ 2 (mod 4), read indices ≡ 0 (mod 4).)
          </Panel>
          <p className="text-sm font-medium mb-1">(b) — 3 P</p>
          <Formula>{`iᵈ + 12 = 2·iᵘ   ⇔   iᵈ − 2·iᵘ = −12,     iᵈ, iᵘ ∈ [0, 8]

min(iᵈ − 2·iᵘ) = 0 − 2·8 = −16
max(iᵈ − 2·iᵘ) = 8 − 2·0 =   8

−12 ∈ [−16, 8]`}</Formula>
          <Panel className="text-sm leading-relaxed mb-3">
            The required constant lies inside the reachable interval ⇒ the extreme value test{' '}
            <Bad>cannot exclude</Bad> a dependence. (The GCD test is powerless too: gcd(1, 2) = 1 divides everything.)
            When neither test decides, the <strong>direction-vector hierarchy</strong> would re-run the test per
            direction (&lt;, =, &gt;) to narrow down <em>which</em> dependences are possible.
          </Panel>
          <p className="text-sm font-medium mb-1">(c) — 1 P</p>
          <Panel className="text-sm leading-relaxed">
            <Code>iᵈ = 2·iᵘ − 12 ∈ [0, 8]</Code> forces <Code>iᵘ ∈ {'{6, 7, 8}'}</Code>: the pairs are (iᵈ, iᵘ) =
            (0, 6), (2, 7), (4, 8) — e.g. iteration 0 writes <Code>a[12]</Code>, iteration 6 reads it. The write always
            runs first ⇒ <Dep k="t">δᵗ flow</Dep>, distances 6, 5, 4 — no constant distance, so{' '}
            <Code>S δᵗ₍∗₎ S</Code> with direction <Code>(&lt;)</Code>.
          </Panel>
        </>
      }
    />
  </div>
)

/* ================================================================== *
 *  Questions 6–10
 * ================================================================== */

const QuestionsB: React.FC = () => (
  <div className="space-y-3">
    {/* ---------------------------------------------------------- Q6 */}
    <QuestionCard
      n={6}
      diff="Medium"
      title="Non-tightly nested loops and code sinking · 7 P"
      statement={
        <>
          <Pts split="3 + 1 + 3" total={7} />
          <Pre>{`for (i = 1; i <= n; i++) {
  S1: d[i] = a[i][1];
  for (j = 1; j <= n; j++)
    S2: a[i+1][j] = a[i][j] / d[i];
}`}</Pre>
          <p className="mb-1">(a) Determine all data dependences with their distance vectors where possible.</p>
          <p className="mb-1">(b) Why can the dependences not all be written with equal-length vectors?</p>
          <p>
            (c) Apply <strong>code sinking</strong>, give the transformed loop nest and the distance/direction vectors
            afterwards.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 3 P</p>
          <Table
            head={['Dependence', 'Reason', 'Notation']}
            rows={[
              [<>S1 <Dep k="t">δᵗ</Dep> S2</>, <>S1 writes <Code>d[i]</Code>, S2 reads it for every j of the same outer iteration</>, <>S1 δᵗ<sub>(0)</sub> S2</>],
              [<>S2 <Dep k="t">δᵗ</Dep> S2</>, <><Code>a[i+1][j]</Code> written in iteration (i, j), read as <Code>a[i][j]</Code> in (i+1, j)</>, <>S2 δᵗ<sub>(1,0)</sub> S2</>],
              [<>S2 <Dep k="t">δᵗ</Dep> S1</>, <><Code>a[i+1][1]</Code> written at (i, 1), read by S1 as <Code>a[i][1]</Code> in iteration i+1</>, <>S2 δᵗ<sub>(1)</sub> S1</>],
            ]}
          />
          <p className="text-sm font-medium mt-3 mb-1">(b) — 1 P</p>
          <p className="text-sm mb-3">
            S1 sits only in the outer loop: its iteration vector <Code>(i)</Code> has length 1, S2's{' '}
            <Code>(i, j)</Code> has length 2. Vectors of different lengths cannot be subtracted, so distance and level
            are undefined for S1 ↔ S2.
          </p>
          <p className="text-sm font-medium mb-1">(c) — 3 P</p>
          <p className="text-sm mb-1">
            Extend the inner loop by one iteration (<Code>j = 0</Code>) and guard S1 into it:
          </p>
          <Pre>{`for (i = 1; i <= n; i++)
  for (j = 0; j <= n; j++) {
    S1: if (j == 0) d[i] = a[i][1];
    S2: else        a[i+1][j] = a[i][j] / d[i];
  }`}</Pre>
          <Table
            head={['Dependence', 'Vector', 'Meaning']}
            rows={[
              [<>S1 δᵗ S2</>, <>d = (0, ∗), θ = (=, &lt;)</>, 'same i, every later j reads d[i] — no fixed inner distance'],
              [<>S2 δᵗ S2</>, 'd = (1, 0)', 'unchanged'],
              [<>S2 δᵗ S1</>, <>d = (1, −1), θ = (&lt;, &gt;)</>, 'source (i, 1) → sink (i+1, 0); legal: leading component is <'],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-1">
            All vectors now have length 2. Note the (&lt;, &gt;) direction: a negative inner component is fine as long
            as an earlier level is &lt;.
          </p>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q7 */}
    <QuestionCard
      n={7}
      diff="Hard"
      title="Dependence system in matrix-vector form for a triangular nest · 7 P"
      statement={
        <>
          <Pts split="4 + 3" total={7} />
          <Pre>{`for (i = 0; i <= 50; i++)
  for (j = 0; j <= i; j++)
    S: a[i+1][2*j] = a[i][2*j+2] * 0.5;`}</Pre>
          <p className="mb-1">
            (a) Build the dependence system for the pair of references to <Code>a</Code>: the dependence equations{' '}
            <Code>A·x = c</Code> and the inequalities <Code>B·x ≤ b</Code> derived from the loop bounds. Summarise both
            in matrix-vector form (unknowns <Code>x = (iᵈ, iᵘ, jᵈ, jᵘ)ᵀ</Code>).
          </p>
          <p>
            (b) Solve the system and classify the dependence (type, distance vector, direction vector, level). Show
            that the solution is feasible within the bounds.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 4 P</p>
          <p className="text-sm mb-1">
            The nest is already normalised (0-based, step 1). Equate the definition <Code>a[iᵈ+1][2jᵈ]</Code> and the
            use <Code>a[iᵘ][2jᵘ+2]</Code> dimension by dimension:
          </p>
          <Formula>{`dim 1:  iᵈ + 1 = iᵘ        ⇔   iᵈ − iᵘ = −1
dim 2:  2·jᵈ = 2·jᵘ + 2    ⇔   2·jᵈ − 2·jᵘ = 2`}</Formula>
          <Row>
            <Bracketed rows={[['1', '−1', '0', '0'], ['0', '0', '2', '−2']]} />
            <Bracketed rows={[['iᵈ'], ['iᵘ'], ['jᵈ'], ['jᵘ']]} />
            <span className="font-mono">=</span>
            <Bracketed rows={[['−1'], ['2']]} />
          </Row>
          <p className="text-sm mb-1">
            Bounds: <Code>0 ≤ iᵈ, iᵘ ≤ 50</Code>, and the <strong>triangular</strong> inner bounds{' '}
            <Code>0 ≤ jᵈ ≤ iᵈ</Code>, <Code>0 ≤ jᵘ ≤ iᵘ</Code> — the upper j-limit couples two unknowns:
          </p>
          <Row>
            <Bracketed
              rows={[
                ['−1', '0', '0', '0'],
                ['1', '0', '0', '0'],
                ['0', '−1', '0', '0'],
                ['0', '1', '0', '0'],
                ['0', '0', '−1', '0'],
                ['−1', '0', '1', '0'],
                ['0', '0', '0', '−1'],
                ['0', '−1', '0', '1'],
              ]}
            />
            <Bracketed rows={[['iᵈ'], ['iᵘ'], ['jᵈ'], ['jᵘ']]} />
            <span className="font-mono">≤</span>
            <Bracketed rows={[['0'], ['50'], ['0'], ['50'], ['0'], ['0'], ['0'], ['0']]} />
          </Row>
          <p className="text-xs text-muted-foreground mb-3">
            Rows 6 and 8 encode <Code>jᵈ − iᵈ ≤ 0</Code> and <Code>jᵘ − iᵘ ≤ 0</Code>.
          </p>
          <p className="text-sm font-medium mb-1">(b) — 3 P</p>
          <Formula>{`dim 1:  iᵘ = iᵈ + 1     ⇒  d₁ = iᵘ − iᵈ = 1
dim 2:  jᵈ = jᵘ + 1     ⇒  d₂ = jᵘ − jᵈ = −1

d = (1, −1)      θ = (<, >)      level 1`}</Formula>
          <Panel className="text-sm leading-relaxed">
            The write runs in the earlier iteration (leading &lt;) ⇒ <Dep k="t">δᵗ flow</Dep>:{' '}
            <Code>S δᵗ<sub>(1,−1)</sub> S</Code>, carried by the i-loop. Feasibility: e.g. write at (iᵈ, jᵈ) = (1, 1)
            hits <Code>a[2][2]</Code>, read at (iᵘ, jᵘ) = (2, 0) reads <Code>a[2][2]</Code> — and the triangular bounds
            hold (1 ≤ 1, 0 ≤ 2). No anti dependence (the read of a cell always happens after its write) and no output
            dependence (all written cells <Code>[i+1][2j]</Code> are distinct).
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q8 */}
    <QuestionCard
      n={8}
      diff="Hard"
      title="vectorize(): SCC condensation and topological order · 8 P"
      statement={
        <>
          <Pts split="3 + 3 + 2" total={8} />
          <Pre>{`for (i = 2; i <= n; i++) {
  S1: b[i] = c[i-1] + 5;
  S2: a[i] = a[i-1] + b[i];
  S3: c[i] = 2 * a[i];
  S4: d[i] = a[i+1] - 1;
}`}</Pre>
          <p className="mb-1">(a) Determine all data dependences (type, distance, level).</p>
          <p className="mb-1">
            (b) Build the dependence graph D, its strongly connected components, the condensation Dπ and a topological
            order.
          </p>
          <p>
            (c) Apply the basic <Code>vectorize()</Code> algorithm and give the resulting code. Explain why the emitted
            order differs from the textual order.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 3 P</p>
          <Table
            head={['Dependence', 'Var / access pair', 'Level']}
            rows={[
              [<>S1 δᵗ<sub>∞</sub> S2</>, <><Code>b[i]</Code> written and read in the same iteration</>, '∞ (loop-independent)'],
              [<>S2 δᵗ<sub>(1)</sub> S2</>, <><Code>a[i]</Code> → read <Code>a[i-1]</Code> next iteration</>, '1'],
              [<>S2 δᵗ<sub>∞</sub> S3</>, <><Code>a[i]</Code> read by S3 in the same iteration</>, '∞'],
              [<>S3 δᵗ<sub>(1)</sub> S1</>, <><Code>c[i]</Code> → read <Code>c[i-1]</Code> next iteration</>, '1'],
              [<>S4 δᵃ<sub>(1)</sub> S2</>, <>S4 reads <Code>a[i+1]</Code>, S2 overwrites it one iteration later</>, '1'],
            ]}
          />
          <p className="text-sm font-medium mt-3 mb-1">(b) — 3 P</p>
          <p className="text-sm mb-1">
            The cycle <Code>S1 → S2 → S3 → S1</Code> (closed by the loop-carried edge S3 δᵗ₍₁₎ S1) forms the only
            non-trivial SCC:
          </p>
          <Formula>{`π1 = {S1, S2, S3}   (cyclic — real recurrence)
π2 = {S4}

Dπ:  π2 → π1        (from S4 δᵃ(1) S2)

topological order:  π2, π1`}</Formula>
          <p className="text-xs text-muted-foreground mb-3">
            π2 has no incoming edge — although S4 is the <em>last</em> statement of the body, it comes <em>first</em>{' '}
            in every topological order.
          </p>
          <p className="text-sm font-medium mb-1">(c) — 2 P</p>
          <Pre>{`S4: d[2:n] = a[3:n+1] - 1;     // vector — emitted BEFORE the loop
for (i = 2; i <= n; i++) {     // π1: sequential recurrence
  S1: b[i] = c[i-1] + 5;
  S2: a[i] = a[i-1] + b[i];
  S3: c[i] = 2 * a[i];
}`}</Pre>
          <Panel className="text-sm leading-relaxed">
            π1 lies on a cycle ⇒ it stays a sequential loop with its body in original order; π2 is a single acyclic
            instruction ⇒ vector statement. The anti dependence <Code>S4 δᵃ S2</Code> forces S4 to read all old values{' '}
            <Code>a[i+1]</Code> <em>before</em> the recurrence overwrites them — running the sequential loop first
            would be wrong. <strong>Topological ≠ textual order.</strong>
          </Panel>
        </>
      }
    />

    {/* ---------------------------------------------------------- Q9 */}
    <QuestionCard
      n={9}
      diff="Hardest"
      title="Dependences, DDG and recursive codegen() (Ex 6.1) · 12 P"
      statement={
        <>
          <Pts split="5 + 2 + 5" total={12} />
          <p className="mb-2">Consider the following program fragment (assuming n ≫ 1):</p>
          <Pre>{`for (i = 1; i <= 10; i++) {
  for (j = 2; j < n; j++) {
    S1: a[i+1][j+1] = b[i-1][j+5] + c[i];
    S2: b[i][j]     = a[i][j-2];
    S3: c[i]        = b[i][2*j] - 1;
    S4: x[i][j]     = a[i][j];
  }
  S5: c[i-1] = a[i+1][n];
}`}</Pre>
          <p className="mb-1">
            (a) Determine all data dependences (address-based) between S1, …, S5. Use the conventional notation{' '}
            <Code>S1 δ<sup>type</sup><sub>level</sub> S2</Code> with type ∈ {'{f/t, a, o}'} and level ∈{' '}
            {'{1, 2, …, ∞}'} (level = ∞ for loop-independent dependences). <em>Hint: normalization and code sinking are
            not required.</em>
          </p>
          <p className="mb-1">(b) Draw the data dependence graph.</p>
          <p>
            (c) Use the recursive procedure <Code>codegen</Code> from the lecture to vectorize the fragment. Explain
            the intermediate steps and show the dependence graphs used in the recursion.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 5 P</p>
          <Table
            head={['Dependence', 'Var', 'Access pair (source → sink)', 'd']}
            rows={[
              [<>S1 δᵗ<sub>1</sub> S2</>, 'a', <><Code>a[i+1][j+1]</Code> @ (i,j) → <Code>a[i][j-2]</Code> @ (i+1, j+3)</>, '(1, 3)'],
              [<>S1 δᵗ<sub>1</sub> S4</>, 'a', <><Code>a[i+1][j+1]</Code> @ (i,j) → <Code>a[i][j]</Code> @ (i+1, j+1)</>, '(1, 1)'],
              [<>S1 δᵗ<sub>∞</sub> S5</>, 'a', <><Code>a[i+1][j+1]</Code> @ (i, n−1) → <Code>a[i+1][n]</Code> @ S5(i), same outer iteration</>, '—'],
              [<>S2 δᵗ<sub>1</sub> S1</>, 'b', <><Code>b[i][j]</Code> @ (i,j) → <Code>b[i-1][j+5]</Code> @ (i+1, j−5)</>, '(1, −5)'],
              [<>S3 δᵃ<sub>2</sub> S2</>, 'b', <>S3 reads <Code>b[i][2j]</Code> @ (i,j); S2 overwrites it @ (i, 2j)</>, '(0, ∗)'],
              [<>S3 δᵗ<sub>2</sub> S1</>, 'c', <><Code>c[i]</Code> written @ (i, j′) → read by S1 @ (i, j), j′ &lt; j</>, '(0, ∗)'],
              [<>S1 δᵃ<sub>∞</sub> S3</>, 'c', <>S1 reads <Code>c[i]</Code> before S3 writes it in the same iteration</>, '—'],
              [<>S1 δᵃ<sub>2</sub> S3</>, 'c', <>S1 reads <Code>c[i]</Code> @ (i, j); S3 rewrites it @ (i, j″), j″ &gt; j</>, '(0, ∗)'],
              [<>S3 δᵒ<sub>2</sub> S3</>, 'c', <><Code>c[i]</Code> written in every j-iteration of row i</>, '(0, ∗)'],
              [<>S1 δᵃ<sub>1</sub> S5</>, 'c', <>S1 reads <Code>c[i]</Code> in row i; S5 writes <Code>c[i]</Code> at outer iteration i+1</>, '(1)'],
              [<>S3 δᵒ<sub>1</sub> S5</>, 'c', <>S3 writes <Code>c[i]</Code> in row i; S5 rewrites it at outer iteration i+1</>, '(1)'],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            <Code>x</Code> is only written (distinct cells) and S4 reads only — no further dependences. S1 δᵗ∞ S5
            exists because S1 at (i, n−1) writes <Code>a[i+1][n]</Code>, read by S5 of the <em>same</em> outer
            iteration; S5's vector is shorter (depth 1), so only the level notation applies — exactly why the hint
            says no code sinking is needed.
          </p>
          <p className="text-sm font-medium mb-1">(b) — 2 P</p>
          <FlowGraph
            nodes={ddg61Nodes}
            edges={ddg61Edges}
            width={340}
            height={244}
            maxW={420}
            caption="data dependence graph (the output self-loop S3 δᵒ₂ S3 is not drawn)"
          />
          <p className="text-sm font-medium mt-3 mb-1">(c) — 5 P</p>
          <Stepper steps={codegen61Steps} showProgress />
        </>
      }
    />

    {/* --------------------------------------------------------- Q10 */}
    <QuestionCard
      n={10}
      diff="Hardest"
      title="Full dependence system + stepwise elimination (Ex 5.2) · 15 P"
      statement={
        <>
          <Pts split="4 + 8 + 2 + 1" total={15} />
          <p className="mb-2">Consider the following loop nest:</p>
          <Pre>{`for (i = -50; i <= 80; i++) {
  for (j = 60; j >= -40; j--) {
    a[3*i - 6*j + 9][-i + 3*j - 3][-4*i - 5*j] = b[i][j] * 5;
    c[i][j] = a[i - 5*j + 8][-2*j + 3][-11*i + 5*j - 3] + 1;
  }
}`}</Pre>
          <p className="mb-1">
            (a) Build the dependence system — dependence equations plus the inequalities from the loop bounds — for the
            pair of references to <Code>a</Code>. Summarise it in matrix-vector form.
          </p>
          <p className="mb-1">
            (b) Solve it in two steps: (1) find all solutions of the equations with <strong>approach C</strong>{' '}
            (stepwise elimination); (2) use the inequalities to find the solutions that lead to a dependence.
          </p>
          <p className="mb-1">(c) What types of dependences are present (flow, anti, output)?</p>
          <p className="mb-1">
            (d) Which array elements <Code>a[i][j][k]</Code> are accessed twice, causing the dependences?
          </p>
          <p className="text-xs text-muted-foreground italic">Remark: don't normalize the loop nest to keep the coefficients small.</p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) — 4 P</p>
          <p className="text-sm mb-1">
            Unknowns: <Code>(iᵈ, jᵈ)</Code> = iteration of the <strong>definition</strong> (line 3),{' '}
            <Code>(iᵘ, jᵘ)</Code> = iteration of the <strong>use</strong> (line 4). One equation per array dimension:
          </p>
          <Formula>{`dim 1:  3iᵈ − 6jᵈ + 9  = iᵘ − 5jᵘ + 8      ⇔  3iᵈ − 6jᵈ − iᵘ + 5jᵘ  = −1   (1)
dim 2:  −iᵈ + 3jᵈ − 3  = −2jᵘ + 3          ⇔  −iᵈ + 3jᵈ + 2jᵘ       =  6   (2)
dim 3:  −4iᵈ − 5jᵈ     = −11iᵘ + 5jᵘ − 3   ⇔  −4iᵈ − 5jᵈ + 11iᵘ − 5jᵘ = −3   (3)`}</Formula>
          <Row>
            <Bracketed rows={[['3', '−6', '−1', '5'], ['−1', '3', '0', '2'], ['−4', '−5', '11', '−5']]} />
            <Bracketed rows={[['iᵈ'], ['jᵈ'], ['iᵘ'], ['jᵘ']]} />
            <span className="font-mono">=</span>
            <Bracketed rows={[['−1'], ['6'], ['−3']]} />
          </Row>
          <p className="text-sm mb-1">Loop bounds (unnormalised, per the remark): each unknown stays in its range:</p>
          <Row>
            <Bracketed
              rows={[
                ['−1', '0', '0', '0'],
                ['1', '0', '0', '0'],
                ['0', '−1', '0', '0'],
                ['0', '1', '0', '0'],
                ['0', '0', '−1', '0'],
                ['0', '0', '1', '0'],
                ['0', '0', '0', '−1'],
                ['0', '0', '0', '1'],
              ]}
            />
            <Bracketed rows={[['iᵈ'], ['jᵈ'], ['iᵘ'], ['jᵘ']]} />
            <span className="font-mono">≤</span>
            <Bracketed rows={[['50'], ['80'], ['40'], ['60'], ['50'], ['80'], ['40'], ['60']]} />
          </Row>
          <p className="text-xs text-muted-foreground mb-3">
            i.e. −50 ≤ iᵈ, iᵘ ≤ 80 and −40 ≤ jᵈ, jᵘ ≤ 60.
          </p>
          <p className="text-sm font-medium mb-1">(b) — 8 P</p>
          <Stepper steps={elim52Steps} showProgress />
          <p className="text-sm font-medium mt-3 mb-1">(c) — 2 P</p>
          <p className="text-sm mb-1">
            The j-loop counts <strong>down</strong>: iteration (i, j) precedes (i′, j′) iff <Code>i &lt; i′</Code> or
            (<Code>i = i′</Code> and <Code>j &gt; j′</Code>).
          </p>
          <Table
            head={['t', 'write @ (iᵈ, jᵈ)', 'read @ (iᵘ, jᵘ)', 'who runs first', 'Type']}
            rows={[
              ['10', '(24, 10)', '(13, 0)', 'the read (13 < 24)', <Dep k="a">δᵃ anti — S4 δᵃ S3</Dep>],
              ['11', '(−49, −17)', '(−24, 4)', 'the write (−49 < −24)', <Dep k="t">δᵗ flow — S3 δᵗ S4</Dep>],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Both a flow and an anti dependence are present; no output dependence (only one write reference to a is
            involved).
          </p>
          <p className="text-sm font-medium mb-1">(d) — 1 P</p>
          <Formula>{`t = 10:  write(24, 10):  [3·24−6·10+9][−24+3·10−3][−4·24−5·10] = a[21][3][−146]
         read (13, 0):   [13−0+8][−0+3][−11·13+0−3]              = a[21][3][−146] ✓

t = 11:  write(−49, −17) = read(−24, 4) = a[−36][−5][281] ✓`}</Formula>
        </>
      }
    />
  </div>
)

/* ------------------------------------------------------------------ *
 *  Root
 * ------------------------------------------------------------------ */

const tabs: TabDef[] = [
  { id: 'qa', label: 'Q1–Q5 · Graphs, vectors & tests', render: () => <QuestionsA /> },
  { id: 'qb', label: 'Q6–Q10 · Sinking, systems & codegen', render: () => <QuestionsB /> },
]

export default function Chapter3ExamStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 3 · Exam Practice"
      title="Chapter 3 Exam Practice"
      subtitle="Ten written-exam problems (79 points) covering all of Chapter 3 — dependence classification, distance/direction/level, normalisation, code sinking, vectorize()/codegen(), dependence systems in matrix-vector form, and the GCD / extreme-value / elimination solvers. Includes the original sheet exercises 4.2, 4.3, 5.2 and 6.1 with full solutions."
      tabs={tabs}
    />
  )
}
