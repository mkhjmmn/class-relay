import type { Metadata } from "next";
import Link from "next/link";
import { readDoc } from "@/components/story/readDoc";
import { Section, Toc } from "@/components/story/Layout";

export const metadata: Metadata = { title: "Documentation" };
export const dynamic = "force-static";

type Guide = { role: string; who: string; start: string; journey: string; steps: string[] };

const GUIDES: Guide[] = [
  {
    role: "Classroom teacher",
    who: "Daniel Ortiz, Cedar Hollow Middle School",
    start: "/app",
    journey: "J1 - report an absence at 05:40",
    steps: [
      "Open /app and choose Classroom teacher.",
      "Go to Report absence (/app/teacher/report). Speak or type, for example: \"I'm sick today and tomorrow, plans are in the library.\"",
      "The Intake agent fills in dates, periods, reason and plan. Check the fields and confirm.",
      "W1 runs: the absence is validated, approved by policy and matching starts. Follow it in Absences (/app/teacher/absences).",
      "After the day, read the Return Handoff in Handoffs (/app/teacher/handoffs).",
    ],
  },
  {
    role: "Substitute teacher",
    who: "Maya Rahman",
    start: "/demo-user",
    journey: "J2 - from offer to earnings",
    steps: [
      "Open /demo-user. You arrive as Maya with the guided tour and the 5-task checklist.",
      "Jobs (/app/sub/jobs): open a pending offer to see pay, distance and why you were matched. Accept it.",
      "Briefs (/app/sub/briefs): read the Sub Brief. Ask the Prep Coach (/app/sub/coach) a question and check the cited sources.",
      "Schedule (/app/sub/schedule): check in, then submit the end-of-day report.",
      "Earnings (/app/sub/earnings): the timesheet appears, waiting for school approval.",
    ],
  },
  {
    role: "School admin",
    who: "Grace Kim",
    start: "/app",
    journey: "J3 - coverage, no-show, approvals",
    steps: [
      "Open /app and choose School admin.",
      "Coverage board (/app/school): find today's filled absence that has no check-in.",
      "Mark the no-show. W4 contacts the substitute, records it and sends a new offer wave.",
      "Timesheets (/app/school/timesheets): approve submitted timesheets and look at any anomaly flags.",
      "Rate the substitute from the completed assignment.",
    ],
  },
  {
    role: "District admin",
    who: "Jordan Lee, HR and payroll",
    start: "/demo-admin",
    journey: "J4 - compliance to audit",
    steps: [
      "Open /demo-admin. You arrive as Jordan in the Command center.",
      "Compliance (/app/district/compliance): open a flagged credential (Ethan Brooks' background clearance needs review) and decide it.",
      "Payroll (/app/district/payroll): draft a pay run, check the duplicate and rate-mismatch flags, approve, then export CSV.",
      "Automations (/app/district/automations): edit or dry-run a rule. AI agents (/app/district/agents): open an agent trace.",
      "Open /audit, run the global audit and look at the hash-chained audit log.",
    ],
  },
  {
    role: "New substitute",
    who: "Any applicant",
    start: "/app/apply",
    journey: "J5 - apply to active",
    steps: [
      "Open /app/apply and submit the application form.",
      "Upload a credential. The Credential Verifier reads it and sets verified or needs review, with a confidence score.",
      "Anything other than verified goes to the HR queue. Nothing is auto-rejected.",
      "As district admin, move the applicant through Onboarding (/app/district/onboarding): documents, verification, orientation.",
      "Once orientation is complete, the substitute is active and can be matched.",
    ],
  },
];

const AGENTS: { id: string; name: string; charter: string; tools: string; autonomy: string; threshold: string; gate: string }[] = [
  { id: "A1", name: "Relay Orchestrator", charter: "Supervisor. Owns the absence state machine from reported to paid; routes, retries and escalates.", tools: "All specialist agents, event bus, state machine", autonomy: "Act", threshold: "n/a (deterministic routing)", gate: "Escalates unfilled absences to the school admin at T-60 min" },
  { id: "A2", name: "Intake and Onboarding", charter: "Turns voice, text and CSV into structured records and guides onboarding.", tools: "Absence schema, CSV column mapper, validation report", autonomy: "Act with review", threshold: "0.75", gate: "The teacher or admin confirms every structured record" },
  { id: "A3", name: "Credential Verifier", charter: "Reads documents (Extractor), checks the rule pack (Validator) and flags tampering.", tools: "Vision, rule pack, name match", autonomy: "Act with review", threshold: "0.85 to auto-verify", gate: "Every negative or low-confidence result goes to HR review" },
  { id: "A4", name: "Matchmaker", charter: "Eligibility first (Constraint Checker), then scoring (Scorer) and plain-language reasons (Explainer), plus a fairness check.", tools: "Rules engine R1-R8, knowledge graph, scorer", autonomy: "Act", threshold: "Hard rules always win", gate: "Overrides need a named person and reason (R8)" },
  { id: "A5", name: "Dispatcher", charter: "Offer waves, reminders, no-show re-dispatch and internal coverage fallback.", tools: "Offers, notification outbox", autonomy: "Act", threshold: "n/a", gate: "Internal coverage plans need school-admin approval" },
  { id: "A6", name: "Lesson Continuity", charter: "Sub Briefs, backup activities and Return Handoffs, citing the source plan (Plan Parser, Brief Writer, Translator).", tools: "Lesson plans, routines, approved supports", autonomy: "Act with review", threshold: "0.70", gate: "Student supports appear only when the school admin has approved them" },
  { id: "A7", name: "Prep Coach", charter: "Retrieval chat grounded in the handbook and plan, with citations.", tools: "Knowledge base retrieval", autonomy: "Suggest", threshold: "Says when nothing relevant is found", gate: "Refuses student data beyond need-to-know" },
  { id: "A8", name: "Compliance Sentinel", charter: "Scheduled and event checks, blocks, tasks and reports, citing rule id and source.", tools: "Rules engine, credentials, alerts", autonomy: "Act", threshold: "n/a (rule-based)", gate: "Pausing a substitute is reversible; removal needs HR" },
  { id: "A9", name: "Payroll", charter: "Pay lines, anomaly flags and draft pay runs.", tools: "Pay rules, anomaly scan, CSV export", autonomy: "Act with review", threshold: "0.90", gate: "Never finalizes a pay run without human approval" },
  { id: "A10", name: "Insights", charter: "Forecasts absences and fill risk.", tools: "History, calendar", autonomy: "Suggest", threshold: "Shown with confidence", gate: "Advisory only" },
  { id: "A11", name: "Guardian", charter: "Wraps every agent: PII redaction, prompt-injection and unsafe-content checks, policy enforcement, confidence gating, bias monitoring, audit logging.", tools: "Redactor, injection filter, policy engine", autonomy: "Act (blocks)", threshold: "Below an agent's threshold goes to human review", gate: "Enforces every human-in-the-loop gate above" },
];

const MCP_LIST = `curl -s -X POST https://class-relay-henna.vercel.app/api/mcp \\
  -H "content-type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

const MCP_CALL = `curl -s -X POST https://class-relay-henna.vercel.app/api/mcp \\
  -H "content-type: application/json" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
       "params":{"name":"compute_pay","arguments":{"tier":"T2","dayPart":"full","dayNumber":11,"hardToFill":true}}}'`;

const HEALTH = `curl -s https://class-relay-henna.vercel.app/api/health
# returns JSON with app status, data mode (sandbox or supabase) and AI mode (sample or live)`;

function Pre({ children, label }: { children: string; label: string }) {
  return (
    <pre tabIndex={0} aria-label={label} className="mt-2 overflow-x-auto whitespace-pre rounded-xl bg-slate-900 p-3 text-xs text-slate-50 sm:text-sm">
      {children}
    </pre>
  );
}

export default function Page() {
  const assumptions = readDoc("ASSUMPTIONS.md");
  const buildLog = readDoc("BUILD_LOG.md");
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Documentation</h1>
      <p className="mt-2 max-w-3xl text-slate-700">Everything you need to use, run and judge ClassRelay: step-by-step role guides, the API, the agents, the runbook, and the assumptions and build log as written during the build.</p>
      <Toc
        items={[
          { id: "roles", label: "Role guides (J1-J5)" },
          { id: "admin", label: "Admin guide" },
          { id: "api", label: "API reference" },
          { id: "agents", label: "Agent cards" },
          { id: "runbook", label: "Runbook" },
          { id: "decisions", label: "Decision records" },
          { id: "assumptions", label: "Assumptions" },
          { id: "buildlog", label: "Build log" },
        ]}
      />

      <Section id="roles" title="Role guides and golden paths" lead="Every path runs on synthetic data in your own browser sandbox. Use Reset demo in the header to start again.">
        <div className="grid gap-4 lg:grid-cols-2">
          {GUIDES.map((g) => (
            <article key={g.journey} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-semibold text-slate-900">{g.role}</h3>
              <p className="text-sm text-slate-600">
                {g.who}. {g.journey}.
              </p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-800">
                {g.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <Link href={g.start} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand-800 px-4 text-sm font-semibold text-white hover:bg-brand-900">
                Start at {g.start}
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section id="admin" title="Admin guide" lead="/admin is the control room for a district.">
        <ul className="grid gap-2 text-sm text-slate-800 sm:grid-cols-2">
          <li className="rounded-xl border border-slate-200 bg-white p-3"><strong>Users and roles:</strong> the RBAC matrix shows what each of the four roles can see and change.</li>
          <li className="rounded-xl border border-slate-200 bg-white p-3"><strong>Rule packs and pay rules:</strong> R1-R8 eligibility rules and daily, half-day, long-term and hard-to-fill rates.</li>
          <li className="rounded-xl border border-slate-200 bg-white p-3"><strong>Automation Studio:</strong> W1-W8 as trigger, conditions and actions, with a toggle, dry run and run history.</li>
          <li className="rounded-xl border border-slate-200 bg-white p-3"><strong>Agent Console:</strong> traces, autonomy levels, kill switch and model routing read from env.</li>
          <li className="rounded-xl border border-slate-200 bg-white p-3"><strong>Memory Center and knowledge base:</strong> view, edit, delete and export memories; cited knowledge chunks.</li>
          <li className="rounded-xl border border-slate-200 bg-white p-3"><strong>Integrations and health:</strong> sandboxed SSO, SIS, HRIS and payroll adapters, plus system status.</li>
        </ul>
      </Section>

      <Section id="api" title="API reference" lead="Server routes. Secrets stay on the server, and AI endpoints are rate limited and spend capped.">
        <h3 className="font-semibold text-slate-900">GET /api/health</h3>
        <Pre label="Health check example">{HEALTH}</Pre>
        <h3 className="mt-4 font-semibold text-slate-900">POST /api/mcp (JSON-RPC 2.0, Model Context Protocol)</h3>
        <p className="text-sm text-slate-700">The typed tool registry the agents use, also exposed to any MCP client. List the tools first, then call one by name.</p>
        <Pre label="MCP tools/list example">{MCP_LIST}</Pre>
        <Pre label="MCP tools/call example">{MCP_CALL}</Pre>
        <h3 className="mt-4 font-semibold text-slate-900">POST /api/agents/*</h3>
        <p className="text-sm text-slate-700">Agent endpoints such as /api/agents/prep-coach. Each one passes through the Guardian, validates its output with zod and writes an agent_run. Without an API key the response is labelled Sample mode.</p>
      </Section>

      <Section id="agents" title="Agent cards" lead="From Master Prompt section 5. Output that fails its schema is retried once, then sent to human review.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {AGENTS.map((a) => (
            <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <h3 className="text-base font-semibold text-slate-900">
                {a.id} {a.name}
              </h3>
              <p className="mt-1 text-slate-800">{a.charter}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-slate-700">
                <dt className="font-semibold">Tools</dt>
                <dd>{a.tools}</dd>
                <dt className="font-semibold">Autonomy</dt>
                <dd>{a.autonomy}</dd>
                <dt className="font-semibold">Threshold</dt>
                <dd>{a.threshold}</dd>
                <dt className="font-semibold">HITL gate</dt>
                <dd>{a.gate}</dd>
              </dl>
            </article>
          ))}
        </div>
      </Section>

      <Section id="runbook" title="Runbook">
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
            <h3 className="font-semibold text-slate-900">Reset the demo</h3>
            <p className="mt-1">Click Reset demo in the header. Your browser sandbox goes back to the seeded Riverbend world (same seed, same data).</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
            <h3 className="font-semibold text-slate-900">Turn on Supabase or live AI</h3>
            <p className="mt-1">Copy .env.example to .env.local. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for the Supabase driver. Set ANTHROPIC_API_KEY and NEXT_PUBLIC_AI_LIVE=true for live AI. Models come from AI_MODEL_*.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
            <h3 className="font-semibold text-slate-900">Deploy</h3>
            <Pre label="Deploy commands">{`npm ci --legacy-peer-deps
npm run gates        # typecheck, lint, tests, evals, build
vercel --prod`}</Pre>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
            <h3 className="font-semibold text-slate-900">Incident steps</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Check /api/health and the System health panel in /admin.</li>
              <li>If an agent misbehaves, use its kill switch in the Agent Console. The app falls back to Sample mode.</li>
              <li>Check the audit-log hash chain on /audit.</li>
              <li>Roll back to the previous Vercel deployment if needed, then record the incident in docs/BUILD_LOG.md.</li>
            </ol>
          </article>
        </div>
      </Section>

      <Section id="decisions" title="Decision records" lead="ADR-001 to ADR-006 (sandbox fallback, Sample mode, deterministic seed, pure rules engine, hash-chained audit, client-only Mermaid).">
        <Link href="/architecture#adr" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-800 hover:border-brand-700">
          Read the decision records on /architecture
        </Link>
      </Section>

      <Section id="assumptions" title="Assumptions" lead="docs/ASSUMPTIONS.md, read at build time: each decision, why it was made and how to change it.">
        <pre tabIndex={0} aria-label="Assumptions" className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-slate-900">
          {assumptions}
        </pre>
      </Section>

      <Section id="buildlog" title="Build log" lead="docs/BUILD_LOG.md, read at build time.">
        <pre tabIndex={0} aria-label="Build log" className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-slate-900">
          {buildLog}
        </pre>
      </Section>
    </main>
  );
}
