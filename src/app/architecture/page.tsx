import type { Metadata } from "next";
import Link from "next/link";
import { Mermaid } from "@/components/story/Mermaid";
import { Section, Toc } from "@/components/story/Layout";

export const metadata: Metadata = { title: "Architecture" };

const SYSTEM = `
flowchart LR
  B["Browser: React UI + useRepo hook"] --> N["Next.js App Router pages"]
  N --> R{{"Repository interface"}}
  R -->|no Supabase env| SB[("Sandbox driver: seeded state in localStorage")]
  R -->|Supabase env set| SP[("Supabase driver: Postgres + RLS + pgvector")]
  B --> API["Server routes: api/health, api/mcp, api/agents"]
  API --> G["A11 Guardian: PII redaction, injection checks, HITL gates"]
  G --> AG["Agents A1 to A10"]
  AG --> P{{"AI provider interface: complete, vision, embed"}}
  P -->|ANTHROPIC_API_KEY set| C["Claude API, models from AI_MODEL_* env"]
  P -->|no key| F["Recorded sample fixtures: Sample mode"]
  R --> CMD["Domain commands: reportAbsence, respondOffer, submitDayReport"]
  CMD --> RE["Rules engine R1 to R8: pure functions"]
  CMD --> EB["Event bus + automations W1 to W8"]
  CMD --> AU["Audit log: append-only SHA-256 hash chain"]
`;

const INFRA = `
flowchart TB
  GH["GitHub repository"] --> CI["GitHub Actions CI: typecheck, lint, tests, evals, build"]
  CI --> V["Vercel: stateless serverless Next.js"]
  V --> E["CDN: static story pages and assets"]
  V --> FN["Serverless functions: API routes"]
  FN -.->|optional| S[("Supabase: Postgres, RLS, pgvector, Storage")]
  FN -.->|optional| A["Anthropic Claude API"]
  U["Judge browser"] --> E
  U --> FN
`;

const AGENTS = `
flowchart TB
  EV["Domain events"] --> A1["A1 Relay Orchestrator: supervisor + absence state machine"]
  A1 --> A2["A2 Intake and Onboarding"]
  A1 --> A3["A3 Credential Verifier: Extractor, Validator"]
  A1 --> A4["A4 Matchmaker: Constraint Checker, Scorer, Explainer"]
  A1 --> A5["A5 Dispatcher"]
  A1 --> A6["A6 Lesson Continuity: Plan Parser, Brief Writer, Translator"]
  A1 --> A7["A7 Prep Coach: retrieval with citations"]
  A1 --> A8["A8 Compliance Sentinel"]
  A1 --> A9["A9 Payroll"]
  A1 --> A10["A10 Insights"]
  A11["A11 Guardian"] -.->|wraps before and after| A1
  A1 --> TR[("agent_run trace: input, sources, tools, output, confidence, cost, mode")]
  A1 --> HR["Human review queue"]
`;

const INTEGRATIONS = `
flowchart LR
  CR["ClassRelay adapter layer"] --- SSO["SSO: SAML or OIDC"]
  CR --- SIS["SIS: OneRoster CSV or API"]
  CR --- HRIS["HRIS staff records"]
  CR --- PAY["Payroll export: CSV"]
  CR --- MSG["SMS, email, WhatsApp outbox"]
  CR --- MCP["MCP clients via api/mcp"]
  classDef sbx stroke-dasharray: 5 5
  class SSO,SIS,HRIS,PAY,MSG sbx
`;

const DATAFLOW = `
flowchart LR
  T["Teacher voice or text"] --> I["Intake: zod AbsenceInputSchema"]
  I --> AB[("absence")]
  AB --> M["Matching: hard filters R1 to R8, weighted score"]
  M --> O[("offer waves")]
  O --> AS[("assignment + compliance_check")]
  AS --> SB[("sub_brief")]
  AS --> DR[("day_report")]
  DR --> TS[("timesheet")]
  TS --> PR[("pay_run")]
  PR --> CSV["Payroll CSV"]
  DR --> H[("handoff to teacher")]
  AB --> AE[("audit_event hash chain")]
  AS --> AE
  TS --> AE
`;

const SEQUENCE = `
sequenceDiagram
  autonumber
  actor T as Teacher Daniel
  participant C as Commands
  participant W as Automations
  participant RE as Rules engine
  actor S as Substitute Maya
  actor SA as School admin Grace
  T->>C: reportAbsence (zod validate, duplicate check)
  C->>W: emit absence.reported, W1
  W->>C: approve by policy, then startMatching
  C->>RE: rankCandidates: hard filters then weighted score
  C->>S: sendNextWave: preferred, proven, qualified
  Note over W,S: W2 - unanswered 10 min gives next wave, T-60 min escalates
  S->>C: respondOffer accept
  C->>RE: checkEligibility per day, saves compliance_check
  C->>C: create assignments, status filled, other offers superseded
  C->>W: emit assignment.accepted, W3
  W->>C: generateBrief by Lesson Continuity agent, Guardian-filtered
  C-->>S: Sub Brief ready, outbox notification
  S->>C: checkIn, status in_progress
  S->>C: submitDayReport
  C->>W: emit assignment.completed, W5
  W->>C: timesheet from pay rules + Return Handoff
  C-->>T: Return Handoff
  SA->>C: approveTimesheet
`;

const STATES = `
stateDiagram-v2
  [*] --> reported
  reported --> approved
  approved --> matching
  matching --> offered
  matching --> filled
  offered --> filled
  offered --> matching
  filled --> in_progress
  filled --> offered: no-show or sub cancels
  filled --> matching
  in_progress --> completed
  in_progress --> matching: re-dispatch
  completed --> paid
  paid --> [*]
  reported --> cancelled
  approved --> cancelled
  matching --> cancelled
  offered --> cancelled
  filled --> cancelled
  cancelled --> [*]
`;

const ADRS = [
  { id: "ADR-001", title: "Sandbox driver fallback", decision: "One Repository interface with two drivers. Without Supabase env vars the app runs on a seeded in-browser sandbox (localStorage, one per visitor).", why: "Every judge gets an isolated, resettable world with no login wall, and a missing key never blocks the demo. The Supabase driver and its migrations ship alongside it." },
  { id: "ADR-002", title: "Sample mode for AI", decision: "The provider interface returns recorded sample outputs, labelled as such, when ANTHROPIC_API_KEY is absent.", why: "No made-up live results. Every output is labelled Sample mode or Live AI, and the agent_run records which mode produced it." },
  { id: "ADR-003", title: "Deterministic seed", decision: "A mulberry32 generator with seed 42 builds the fictional Riverbend Unified world, anchored to a demo clock (Tue 2026-12-01 05:40).", why: "Server and client render the same data (no hydration drift), and tests and evals are reproducible." },
  { id: "ADR-004", title: "Rules engine as pure functions", decision: "Eligibility rules R1-R8, pay rules and the absence state machine live in src/domain as pure functions with unit tests.", why: "Compliance logic has to be testable and explainable. AI explains decisions but never overrides a hard rule." },
  { id: "ADR-005", title: "Hash-chained audit log", decision: "Each audit_event stores SHA-256(previous hash + payload), and the log is append-only.", why: "Changing any past event breaks the chain, and /audit can check this." },
  { id: "ADR-006", title: "Client-only Mermaid", decision: "Diagrams are drawn by a client component that imports mermaid inside useEffect, with securityLevel strict.", why: "Mermaid needs the DOM, so server rendering breaks builds. The diagram source stays readable as a fallback." },
];

const SCALE: [string, string][] = [
  ["Stateless app tier", "Pages and API routes hold no session state, so Vercel scales them horizontally."],
  ["Tenant isolation", "Every table carries district_id with RLS policies. Role checks run on the server first; RLS is the second wall."],
  ["Queued automations", "W1-W8 run on an event bus. In production a durable job queue with cron replaces the in-app demo clock."],
  ["Read scaling", "Dashboards and analytics can read from Postgres read replicas. Story pages are static."],
  ["Cost control", "Per-tenant AI spend caps and per-visitor rate limits (AI_SPEND_CAP_USD, AI_RATE_LIMIT_PER_MIN)."],
  ["Region packs", "Rule packs and pay rules are data, so UK supply and Australian relief-teacher rules are new packs, not new code."],
];

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Architecture</h1>
      <p className="mt-2 max-w-3xl text-slate-700">
        How ClassRelay is built: a Next.js app over one repository interface, pure domain rules, event-driven automations and a supervised team of AI agents behind a Guardian. Every diagram here follows the real code.
      </p>
      <Toc
        items={[
          { id: "system", label: "System" },
          { id: "infra", label: "Infrastructure" },
          { id: "agents", label: "AI and agents" },
          { id: "integrations", label: "Integrations" },
          { id: "dataflow", label: "Data flow" },
          { id: "sequence", label: "Absence to filled" },
          { id: "states", label: "State machine" },
          { id: "scale", label: "Scalability" },
          { id: "adr", label: "Decision records" },
        ]}
      />
      <Section id="system" title="System view" lead="UI code never touches storage directly. The repository chooses the driver, and every AI call goes through one provider and the Guardian.">
        <Mermaid title="ClassRelay system diagram" chart={SYSTEM} />
      </Section>
      <Section id="infra" title="Infrastructure view" lead="A stateless serverless app on Vercel with CI on GitHub Actions. Supabase and Claude are optional and turned on by env vars.">
        <Mermaid title="Infrastructure" chart={INFRA} />
      </Section>
      <Section id="agents" title="AI and agent view" lead="An event-driven supervisor: A1 plans and delegates, A11 Guardian checks every input and output, and every call writes an agent_run.">
        <Mermaid title="Agents A1 to A11" chart={AGENTS} />
      </Section>
      <Section id="integrations" title="Integration view" lead="The dashed adapters are sandboxed and labelled in the demo. Nothing is sent to a real SIS, HRIS, payroll or messaging system.">
        <Mermaid title="Integration adapters" chart={INTEGRATIONS} />
      </Section>
      <Section id="dataflow" title="Data-flow view" lead="From a teacher's message to a payroll CSV, each step is a typed record with a district_id and an audit event.">
        <Mermaid title="Data flow" chart={DATAFLOW} />
      </Section>
      <Section id="sequence" title="Absence to filled (sequence)" lead="The Relay Loop as implemented in src/data/commands.ts, including the W1, W2, W3 and W5 automations.">
        <Mermaid title="Absence to filled sequence" chart={SEQUENCE} />
      </Section>
      <Section id="states" title="Absence state machine" lead="src/domain/absenceMachine.ts rejects any transition not shown here.">
        <Mermaid title="Absence state machine" chart={STATES} />
      </Section>
      <Section id="scale" title="Scalability notes">
        <ul className="grid gap-3 sm:grid-cols-2">
          {SCALE.map(([t, b]) => (
            <li key={t} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{t}</p>
              <p className="mt-1 text-sm text-slate-700">{b}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="adr" title="Decision records">
        <div className="grid gap-3 md:grid-cols-2">
          {ADRS.map((a) => (
            <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-900">
                {a.id}: {a.title}
              </h3>
              <p className="mt-2 text-sm text-slate-800">
                <span className="font-semibold">Decision.</span> {a.decision}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-semibold">Why.</span> {a.why}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-700">
          Every assumption behind these choices is listed in the{" "}
          <Link className="text-brand-800 underline" href="/docs#assumptions">
            documentation
          </Link>
          .
        </p>
      </Section>
    </main>
  );
}
