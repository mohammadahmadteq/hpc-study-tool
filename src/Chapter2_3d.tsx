import React, { useState } from 'react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import {
  Code,
  Pre,
  Formula,
  Step,
  Table,
  Panel,
  Good,
  Stepper,
  QuestionCard,
  StudyShell,
  FlowGraph,
  type StepPanel,
  type GNode,
  type GEdge,
  type TabDef,
} from './components/study/kit'

/* ------------------------------------------------------------------ *
 *  §2.3 Application 4 — induction variables & strength reduction
 *  (PDF pp. 99–104, example pp. 102 / 117–119)
 * ------------------------------------------------------------------ */

/* single-block loop B2 with a self edge */
const ivNodes: GNode[] = [
  { id: 'B1', x: 150, y: 40, label: 'B1', sub: 'pre' },
  { id: 'B2', x: 150, y: 150, label: 'B2' },
  { id: 'out', x: 150, y: 236, label: 'exit', point: true },
]
const ivEdges: GEdge[] = [
  { from: 'B1', to: 'B2' },
  { from: 'B2', to: 'B2', bend: 0 },
  { from: 'B2', to: 'out' },
]

/* interactive triple builder: derive (i,c,d) from a simple IV j */
type Form = 'j·b' | 'b·j' | 'j/b' | 'j+b' | 'j−b' | 'b−j'
const forms: { f: Form; triple: (b: number) => [string, string, string]; desc: string }[] = [
  { f: 'j·b', triple: (b) => ['j', `${b}`, '0'], desc: 'k := j · b' },
  { f: 'b·j', triple: (b) => ['j', `${b}`, '0'], desc: 'k := b · j' },
  { f: 'j/b', triple: (b) => ['j', `1/${b}`, '0'], desc: 'k := j / b' },
  { f: 'j+b', triple: (b) => ['j', '1', `${b}`], desc: 'k := j + b' },
  { f: 'j−b', triple: (b) => ['j', '1', `−${b}`], desc: 'k := j − b' },
  { f: 'b−j', triple: (b) => ['j', '−1', `${b}`], desc: 'k := b − j' },
]

const TripleBuilder: React.FC = () => {
  const [sel, setSel] = useState<Form>('j·b')
  const b = 4
  const entry = forms.find((x) => x.f === sel)!
  const [i, c, d] = entry.triple(b)
  return (
    <div>
      <p className="text-sm mb-2">
        Let <Code>j</Code> be a <strong>simple</strong> induction variable (triple <Code>(j,1,0)</Code>) and{' '}
        <Code>b = {b}</Code> a constant. Pick the assignment to <Code>k</Code>:
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {forms.map((x) => (
          <Button key={x.f} size="sm" variant={sel === x.f ? 'default' : 'outline'} onClick={() => setSel(x.f)}>
            {x.desc}
          </Button>
        ))}
      </div>
      <Panel className="text-sm">
        <div className="font-mono">{entry.desc.replace('b', String(b))}</div>
        <div className="mt-2">
          ⇒ <Code>k</Code> joins the family of <Code>j</Code> with triple{' '}
          <span className="font-mono text-primary font-semibold">
            ({i}, {c}, {d})
          </span>
          , i.e. <span className="font-mono">k = {c}·j {d.startsWith('−') ? '− ' + d.slice(1) : d === '0' ? '' : '+ ' + d}</span>.
        </div>
      </Panel>
      <p className="text-xs text-muted-foreground mt-2">
        The triple <Code>(i,c,d)</Code> records that after its single definition, <Code>k = c·i + d</Code>. For a constant
        offset (<Code>+b</Code>/<Code>−b</Code>) the multiplier stays 1; for a scale (<Code>·b</Code>/<Code>/b</Code>) the
        offset stays 0.
      </p>
    </div>
  )
}

/* strength-reduction transformation, stepwise */
const srSteps: StepPanel[] = [
  {
    title: '0 · The costly loop',
    body: (
      <>
        <p className="text-sm mb-2">
          <Code>i</Code> is a simple IV; <Code>t2 = 4·i</Code> is in its family with triple <Code>(i,4,0)</Code>. A{' '}
          <strong>multiply</strong> runs every iteration.
        </p>
        <Pre>{`B1:  i := m−1; … ; v := a[t1]      (pre-header)
B2:  i := i+1
     t2 := 4·i          ← multiply each iteration
     t3 := a[t2]
     if t3 < v goto B2`}</Pre>
      </>
    ),
  },
  {
    title: '1 · New variable s for the triple (i,4,0)',
    body: (
      <p className="text-sm">
        Generate one fresh accumulator <Code>s</Code> for the triple <Code>(i,4,0)</Code>. (One variable per distinct
        triple — induction variables sharing a triple share <Code>s</Code>.)
      </p>
    ),
  },
  {
    title: '2 · Replace the assignment to t2 by t2 := s',
    body: <Pre>{`B2:  i := i+1
     t2 := s            (was t2 := 4·i)
     t3 := a[t2]
     if t3 < v goto B2`}</Pre>,
  },
  {
    title: '3 · After i := i±n, increment s by c·n',
    body: (
      <>
        <p className="text-sm mb-2">
          Insert <Code>s := s + c·n</Code> right after the IV update. Here <Code>c=4</Code>, <Code>n=1</Code>, so{' '}
          <Code>s := s + 4</Code> — an <Good>addition</Good>, not a multiply:
        </p>
        <Pre>{`B2:  i := i+1
     s  := s + 4        (c·n = 4·1)
     t2 := s
     t3 := a[t2]
     if t3 < v goto B2`}</Pre>
      </>
    ),
  },
  {
    title: '4 · Initialize s in the pre-header',
    body: (
      <>
        <p className="text-sm mb-2">
          <Code>s := c·i</Code> (and <Code>s := s + d</Code>, omitted since <Code>d=0</Code>). After copy propagation
          folds <Code>t2 := s</Code> away, <Code>t2</Code> itself becomes the accumulator:
        </p>
        <Pre>{`B1:  …
     t2 := 4·i          (s := c·i, computed once)
B2:  i := i+1
     t2 := t2 + 4       ← addition replaces multiply
     t3 := a[t2]
     if t3 < v goto B2`}</Pre>
        <p className="text-sm">
          One multiplication per iteration became one addition. Using <Code>t2</Code>/<Code>t4</Code> in the loop test
          then lets <Code>i</Code>/<Code>j</Code> be eliminated entirely (Quicksort case study).
        </p>
      </>
    ),
  },
]

/* ---- section bodies ---- */

const IndVars: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Induction variables</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['Kind', 'Definition']}
          rows={[
            [
              <Good>induction variable</Good>,
              <>variable <Code>x</Code> of loop <Code>L</Code> where every assignment to <Code>x</Code> in <Code>L</Code> changes it by a constant</>,
            ],
            [
              <Good>simple IV</Good>,
              <>a single assignment <Code>x := x ± c</Code> (constant <Code>c</Code>) in <Code>L</Code> — found by one pass</>,
            ],
            [
              <Good>general IV</Good>,
              <>defined once in <Code>L</Code>, depends <em>linearly</em> on a simple IV</>,
            ],
          ]}
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The triple (i, c, d)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          For a general IV <Code>j</Code> we record a triple <Code>(i, c, d)</Code> where <Code>i</Code> is a simple IV and{' '}
          <Code>c, d</Code> constants, such that after the single definition of <Code>j</Code>:
        </p>
        <Formula>{`j = c · i + d`}</Formula>
        <p className="text-sm">
          We say <Code>j</Code> is a member of the <strong>family</strong> of <Code>i</Code>. A simple IV <Code>i</Code>{' '}
          itself has triple <Code>(i, 1, 0)</Code>.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — build a triple</CardTitle>
      </CardHeader>
      <CardContent>
        <TripleBuilder />
      </CardContent>
    </Card>
  </div>
)

const Detection: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Finding the induction variables of L</CardTitle>
      </CardHeader>
      <CardContent>
        <Step n="1">
          <strong>Simple IVs.</strong> Find every simple induction variable <Code>i</Code>; assign it the triple{' '}
          <Code>(i, 1, 0)</Code>.
        </Step>
        <Step n="2">
          <strong>Derived IVs.</strong> Find variables <Code>k</Code> with a single definition of the form{' '}
          <Code>k := j·b, b·j, j/b, j±b, b±j</Code> (constant <Code>b</Code>, <Code>j</Code> an IV).
        </Step>
        <Panel className="text-sm mt-2">
          <div className="font-medium mb-1">Case 1 — j is a simple IV</div>
          <Code>k</Code> joins the family of <Code>j</Code>; the triple follows from the assignment, e.g.{' '}
          <Code>k := j·b ⇒ (j, b, 0)</Code>.
        </Panel>
        <Panel className="text-sm">
          <div className="font-medium mb-1">Case 2 — j is not simple (triple (i,c,d))</div>
          <Code>k</Code> joins the family of the <em>same</em> simple IV <Code>i</Code> provided:
          <Step n="a">no assignment to <Code>i</Code> between the (single) assignment to <Code>j</Code> and that to <Code>k</Code>;</Step>
          <Step n="b">no definition of <Code>j</Code> outside <Code>L</Code> reaches the assignment to <Code>k</Code>.</Step>
          Then the triple for <Code>k</Code> is derived from <Code>j</Code>’s, e.g. <Code>k := j·b ⇒ (i, b·c, b·d)</Code>.
        </Panel>
        <p className="text-xs text-muted-foreground mt-1">
          <Code>b·c</Code> and <Code>b·d</Code> are constants → precomputed at compile time.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Form → triple cheat-sheet (j a simple IV)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table
          head={['assignment', 'triple (i,c,d)', 'meaning']}
          rows={[
            [<Code>k := j·b</Code>, '(j, b, 0)', 'k = b·j'],
            [<Code>k := j/b</Code>, '(j, 1/b, 0)', 'k = j/b'],
            [<Code>k := j + b</Code>, '(j, 1, b)', 'k = j + b'],
            [<Code>k := j − b</Code>, '(j, 1, −b)', 'k = j − b'],
            [<Code>k := b − j</Code>, '(j, −1, b)', 'k = b − j'],
          ]}
        />
      </CardContent>
    </Card>
  </div>
)

const StrengthRed: React.FC = () => (
  <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Strength reduction</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <strong>Strength reduction</strong> replaces expensive operations by cheaper ones: a multiplication that scales
          a simple IV becomes a running <strong>addition</strong>. Given a simple IV <Code>i</Code> and an IV{' '}
          <Code>j</Code> in its family with triple <Code>(i, c, d)</Code>:
        </p>
        <Step n="1">generate a new variable <Code>s</Code> per triple (shared if triples coincide);</Step>
        <Step n="2">replace the assignment to <Code>j</Code> by <Code>j := s</Code>;</Step>
        <Step n="3">
          right after <Code>i := i ± n</Code>, insert <Code>s := s + c·n</Code> (a constant step), and add <Code>s</Code> to{' '}
          the family of <Code>i</Code> with triple <Code>(i, c, d)</Code>;
        </Step>
        <Step n="4">
          initialize in the pre-header: <Code>s := c·i</Code> (just <Code>s := i</Code> if <Code>c=1</Code>) and{' '}
          <Code>s := s + d</Code> (omit if <Code>d=0</Code>).
        </Step>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start mt-2">
          <FlowGraph nodes={ivNodes} edges={ivEdges} width={300} height={258} maxW={210} caption="loop B2 with self edge" />
          <Panel className="text-sm">
            <strong>Advantage:</strong> the loop runs an <Good>addition</Good> instead of a multiplication every
            iteration. <Code>B1</Code> serves as the pre-header for the initialization.
          </Panel>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Interactive — reduce 4·i to a running sum</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper steps={srSteps} showProgress />
      </CardContent>
    </Card>
  </div>
)

/* ---- questions ---- */

const Questions: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Five exam-style problems, easy → hardest. Q1 is fully worked; do the rest on paper, then reveal.
    </p>

    <QuestionCard
      n={1}
      diff="Worked example"
      defaultOpen
      title="Classify induction variables and reduce one"
      statement={
        <>
          <p className="mb-2">Loop body (i defined only by the line shown):</p>
          <Pre>{`L:  i := i + 1
    t := 4 · i
    a[t] := 0
    goto L`}</Pre>
          <p>
            (a) Give the triples for <Code>i</Code> and <Code>t</Code>. (b) Apply strength reduction to remove the
            multiply, including the pre-header initialization.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm font-medium mb-1">(a) Triples</p>
          <p className="text-sm mb-2">
            <Code>i := i+1</Code> ⇒ <Code>i</Code> is a simple IV, triple <Code>(i, 1, 0)</Code>. <Code>t := 4·i</Code> ⇒{' '}
            <Code>t</Code> is in the family of <Code>i</Code> with triple <Code>(i, 4, 0)</Code> (so <Code>t = 4i</Code>).
          </p>
          <p className="text-sm font-medium mb-1">(b) Strength reduction (s for triple (i,4,0); c=4, n=1, d=0)</p>
          <Pre>{`pre-header:  s := 4 · i        (s := c·i, d=0 omitted)
L:  i := i + 1
    s := s + 4         (s := s + c·n)
    t := s             (j := s)
    a[t] := 0
    goto L`}</Pre>
          <p className="text-sm">
            After copy propagation of <Code>t := s</Code> the multiply is gone; the loop does one addition. Renaming{' '}
            <Code>s</Code>→<Code>t</Code> gives the compact <Code>t := t + 4</Code> form.
          </p>
        </>
      }
    />

    <QuestionCard
      n={2}
      diff="Easy"
      title="Simple vs general induction variable"
      statement={
        <p>
          Define a <em>simple</em> induction variable and a <em>general</em> induction variable, and give the triple of a
          simple IV. What does the triple <Code>(i, c, d)</Code> mean?
        </p>
      }
      solution={
        <>
          <Panel className="text-sm">
            <strong>Simple IV:</strong> exactly one assignment <Code>x := x ± c</Code> (constant <Code>c</Code>) in the
            loop. <strong>General IV:</strong> defined once in the loop and a linear function of a simple IV. A simple IV{' '}
            <Code>i</Code> has triple <Code>(i, 1, 0)</Code>.
          </Panel>
          <p className="text-sm mt-2">
            <Code>(i, c, d)</Code> means: after its single definition the variable equals <Code>c·i + d</Code>, and it
            belongs to the <strong>family</strong> of the simple IV <Code>i</Code>.
          </p>
        </>
      }
    />

    <QuestionCard
      n={3}
      diff="Medium"
      title="Derive triples through a chain"
      statement={
        <>
          <p className="mb-2">In a loop where <Code>i</Code> is a simple IV:</p>
          <Pre>{`j := 4 · i
k := j + 6`}</Pre>
          <p>
            Find the triples of <Code>j</Code> and <Code>k</Code>, naming which case of the detection method applies to
            each. Express each as <Code>c·i + d</Code>.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-1">
            <strong>j</strong> — case 1 (operand <Code>i</Code> is simple): <Code>j := 4·i ⇒ (i, 4, 0)</Code>, i.e.{' '}
            <Code>j = 4i</Code>.
          </p>
          <p className="text-sm mb-2">
            <strong>k</strong> — case 2 (operand <Code>j</Code> is <em>not</em> simple, triple <Code>(i, 4, 0)</Code>):{' '}
            adding a constant keeps the multiplier and shifts the offset, <Code>k := j + 6 ⇒ (i, 4, 6)</Code>, i.e.{' '}
            <Code>k = 4i + 6</Code>.
          </p>
          <Panel className="text-sm">
            Case 2 is valid only if (a) <Code>i</Code> isn’t reassigned between the defs of <Code>j</Code> and{' '}
            <Code>k</Code>, and (b) no outside definition of <Code>j</Code> reaches <Code>k</Code> — both hold here.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={4}
      diff="Hard"
      title="Strength reduction with a step ≠ 1"
      statement={
        <>
          <p className="mb-2">Loop with stride 2:</p>
          <Pre>{`L:  i := i + 2
    t := 6 · i
    s := a[t]
    goto L`}</Pre>
          <p>
            Give the triple for <Code>t</Code>, then strength-reduce it. What is the per-iteration increment, and the
            pre-header init?
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">
            <Code>t := 6·i ⇒ (i, 6, 0)</Code> so <Code>c=6</Code>, <Code>d=0</Code>; the IV update is <Code>i := i+2</Code>{' '}
            so <Code>n=2</Code>. Increment <Code>c·n = 6·2 = 12</Code>.
          </p>
          <Pre>{`pre-header:  s2 := 6 · i        (s := c·i)
L:  i  := i + 2
    s2 := s2 + 12        (s := s + c·n)
    t  := s2
    s  := a[t]
    goto L`}</Pre>
          <Panel className="text-sm">
            One multiply (<Code>6·i</Code>) per iteration → one addition of the compile-time constant <Code>12</Code>. The
            init runs once in the pre-header.
          </Panel>
        </>
      }
    />

    <QuestionCard
      n={5}
      diff="Hardest"
      title="Why case-2 condition (a) is necessary"
      statement={
        <>
          <p className="mb-2">Consider a loop where the order of statements matters:</p>
          <Pre>{`L:  i := i + 1
    j := 2 · i          (j in family of i, triple (i,2,0))
    i := i + 1          (a SECOND update of i)
    k := j + 1
    goto L`}</Pre>
          <p>
            May <Code>k</Code> be assigned the triple <Code>(i, 2, 1)</Code> by case 2? Explain using condition (a), and
            what goes wrong otherwise.
          </p>
        </>
      }
      solution={
        <>
          <p className="text-sm mb-2">
            <strong>No.</strong> Case-2 condition (a) requires <em>no assignment to <Code>i</Code></em> between the
            definition of <Code>j</Code> and that of <Code>k</Code>. Here a second <Code>i := i + 1</Code> sits between
            them.
          </p>
          <Panel className="text-sm">
            The triple <Code>(i, 2, 1)</Code> would claim <Code>k = 2i + 1</Code> using the <em>current</em> <Code>i</Code>.
            But <Code>j = 2·i_old</Code> was captured before <Code>i</Code> was bumped, so really{' '}
            <Code>k = j + 1 = 2·i_old + 1 = 2·(i − 1) + 1 = 2i − 1</Code> — not <Code>2i + 1</Code>. Condition (a) blocks
            the bogus triple. (Also note <Code>i</Code> here has two updates, so it isn’t even a <em>simple</em> IV in the
            strict sense — a further reason the naive derivation is unsafe.)
          </Panel>
        </>
      }
    />
  </div>
)

const tabs: TabDef[] = [
  { id: 'indvars', label: 'Induction variables', render: () => <IndVars /> },
  { id: 'detection', label: 'Detection method', render: () => <Detection /> },
  { id: 'strength', label: 'Strength reduction', render: () => <StrengthRed /> },
  { id: 'questions', label: 'Questions', render: () => <Questions /> },
]

export default function InductionStudyTool(): React.JSX.Element {
  return (
    <StudyShell
      sectionLabel="Chapter 2 · §2.3 · Application 4"
      title="Induction variables & strength reduction"
      subtitle="Simple and general induction variables, the family triple (i, c, d) with j = c·i + d, the detection method, and turning a loop multiply into a running addition."
      tabs={tabs}
    />
  )
}
