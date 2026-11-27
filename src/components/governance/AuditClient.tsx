"use client";
import { useMemo, useState } from "react";
import { Download, Play, Printer, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Progress, Select, Table, Td, Th } from "@/components/ui";
import { Hydrated, EmptyState } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { isLiveAiConfigured } from "@/components/shell/aiMode";
import { verifyChain } from "@/domain";
import { downloadFile } from "@/lib/utils";
import { runAudit, type AuditReport } from "@/governance/auditEngine";
import { Evidence, Section, StatusBadge } from "./common";

async function readHeaders(): Promise<Record<string, string> | null> {
  try {
    const r = await fetch(window.location.href, { method: "HEAD", cache: "no-store" });
    const h: Record<string, string> = {};
    r.headers.forEach((v, k) => (h[k.toLowerCase()] = v));
    return h;
  } catch {
    return null;
  }
}

const STEPS = ["Reading response headers", "Verifying audit chain", "Checking compliance data", "Scoring 8 domains", "Building risk register"];

/** Self-assessment: honest, fixed scores with the reason; not computed. */
const SELF = [
  { area: "Prompt quality", score: 4, of: 5, why: "Each agent has a charter, zod schema and threshold; live-model evals only run with an API key." },
  { area: "Usability", score: 4, of: 5, why: "Mobile-first, guided tours and help panels; no formal user testing with real staff yet." },
  { area: "Documentation", score: 4, of: 5, why: "Data dictionary, lineage, RLS migration, runbook; API docs are a catalog, not a full OpenAPI file." },
  { area: "Governance", score: 3, of: 5, why: "Controls are live checks on the demo; SSO, MFA and third-party pen test are not done." },
];

export function AuditClient() {
  return (
    <Hydrated rows={6}>
      <AuditInner />
    </Hydrated>
  );
}

function AuditInner() {
  const { state, mode } = useRepo();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setReport(null);
    try {
      setStep(0);
      const headers = await readHeaders();
      for (let i = 1; i < STEPS.length; i++) {
        setStep(i);
        await new Promise((r) => setTimeout(r, 150));
      }
      setReport(runAudit(state, { dataMode: mode, aiLive: isLiveAiConfigured(), headers, ranAt: new Date().toISOString() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setStep(-1);
    }
  }

  const running = step >= 0;
  const runs = state.agentRuns;
  const runCounts = runs.reduce<Record<string, number>>((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {});

  return (
    <div className="space-y-10">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">One-click audit over your live sandbox</p>
            <p className="text-sm text-slate-700">
              Checks run in your browser against the data you see in the app (Data mode: {mode}), plus this page&apos;s real response headers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button onClick={run} disabled={running}>
              <Play aria-hidden /> {running ? "Running..." : "Run global audit"}
            </Button>
            <Button variant="outline" disabled={!report} onClick={() => report && downloadFile(`classrelay-audit-${report.ranAt.slice(0, 10)}.json`, JSON.stringify({ report, ledgerVerified: verifyChain(state.audit) }, null, 2), "application/json")}>
              <Download aria-hidden /> Export JSON
            </Button>
            <Button variant="outline" disabled={!report} onClick={() => window.print()}>
              <Printer aria-hidden /> Export PDF
            </Button>
          </div>
        </CardContent>
        {running && (
          <CardContent>
            <Progress value={((step + 1) / STEPS.length) * 100} label={`Audit progress: ${STEPS[step]}`} />
            <p className="mt-2 text-sm text-slate-700" aria-live="polite">
              {STEPS[step]}...
            </p>
          </CardContent>
        )}
        {error && (
          <CardContent>
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          </CardContent>
        )}
      </Card>

      {!report && !running && <EmptyState title="No audit run yet" body="Press Run global audit to evaluate controls in 8 domains from live data." />}

      {report && <Report report={report} />}

      <Section id="evals" title="AI eval results" purpose="Agent evals run in CI against recorded cases; the live counts below come from agent runs in your sandbox.">
        <Card>
          <CardContent className="space-y-3 pt-5 text-sm text-slate-800">
            <p>
              Evals run in CI: <code className="rounded bg-slate-100 px-1">npm run evals</code> (source <Evidence path="src/ai/evals/run.ts" />). No eval score is shown here
              that was not produced by that command.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">{runs.length} agent runs</Badge>
              {Object.entries(runCounts).map(([k, v]) => (
                <Badge key={k} tone={k === "ok" ? "green" : k === "needs_review" ? "amber" : "red"}>
                  {k}: {v}
                </Badge>
              ))}
              <Badge tone="outline">sample: {runs.filter((r) => r.mode === "sample").length}</Badge>
              <Badge tone="outline">live: {runs.filter((r) => r.mode === "live").length}</Badge>
            </div>
          </CardContent>
        </Card>
      </Section>

      <AuditLog />

      <Section id="self" title="Self-assessment" purpose="Our own honest scores, not computed. They say where the product falls short.">
        <Table>
          <thead>
            <tr>
              <Th>Area</Th>
              <Th>Score</Th>
              <Th>Why</Th>
            </tr>
          </thead>
          <tbody>
            {SELF.map((x) => (
              <tr key={x.area}>
                <Td className="font-medium">{x.area}</Td>
                <Td>
                  {x.score}/{x.of}
                </Td>
                <Td>{x.why}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>
    </div>
  );
}

function Report({ report }: { report: AuditReport }) {
  return (
    <div className="space-y-10">
      <Section id="summary" title="Result" purpose={`Run at ${new Date(report.ranAt).toLocaleString()} · demo clock ${report.demoClock.slice(0, 16).replace("T", " ")} · data ${report.env.dataMode} · AI ${report.env.aiLive ? "live" : "Sample mode"}`}>
        <div className="grid gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-slate-700">Overall score</p>
              <p className="text-3xl font-bold text-slate-950">{report.overall}/100</p>
            </CardContent>
          </Card>
          {(["pass", "warn", "fail"] as const).map((k) => (
            <Card key={k}>
              <CardContent className="pt-5">
                <p className="text-sm text-slate-700">
                  <StatusBadge status={k} /> controls
                </p>
                <p className="text-3xl font-bold text-slate-950">{report.counts[k]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {report.domains.map((d) => (
            <a key={d.id} href={`#dom-${d.id}`} className="rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
              <p className="text-sm font-semibold text-slate-900">{d.name}</p>
              <Progress value={d.score} label={`${d.name} score ${d.score}`} className="mt-2" />
              <p className="mt-1 text-xs text-slate-700">{d.score}/100</p>
            </a>
          ))}
        </div>
      </Section>

      <Section id="domains" title="Controls by domain">
        {report.domains.map((d) => (
          <Card key={d.id} id={`dom-${d.id}`} className="scroll-mt-24">
            <CardHeader>
              <CardTitle>
                {d.name} <span className="text-sm font-normal text-slate-700">· {d.score}/100</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Control</Th>
                    <Th>Status</Th>
                    <Th>Detail</Th>
                    <Th>Evidence</Th>
                  </tr>
                </thead>
                <tbody>
                  {d.controls.map((x) => (
                    <tr key={x.id}>
                      <Td className="font-mono text-xs">{x.id}</Td>
                      <Td>{x.title}</Td>
                      <Td>
                        <StatusBadge status={x.status} />
                      </Td>
                      <Td className="text-sm">{x.detail}</Td>
                      <Td>
                        <Evidence path={x.evidence} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </Section>

      <Section id="risks" title="Risk register" purpose="Generated from warning and failing controls, plus two standing risks. Score = likelihood x impact (1-25).">
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Risk</Th>
                <Th>L</Th>
                <Th>I</Th>
                <Th>Score</Th>
                <Th>Owner</Th>
                <Th>Mitigation</Th>
              </tr>
            </thead>
            <tbody>
              {report.risks.map((r) => {
                const sc = r.likelihood * r.impact;
                return (
                  <tr key={r.id}>
                    <Td>
                      <span className="font-mono text-xs">{r.id}</span> {r.title}
                    </Td>
                    <Td>{r.likelihood}</Td>
                    <Td>{r.impact}</Td>
                    <Td>
                      <Badge tone={sc >= 15 ? "red" : sc >= 9 ? "amber" : "green"}>{sc}</Badge>
                    </Td>
                    <Td>{r.owner}</Td>
                    <Td className="text-sm">{r.mitigation}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Section>

      <Section id="remediation" title="Remediation plan" purpose="P0 = failing control, fix before go-live. P1 = privacy, security or compliance warning. P2 = improvement.">
        {report.remediation.length === 0 ? (
          <EmptyState title="Nothing to remediate" body="Every control passed on this run." />
        ) : (
          <ol className="space-y-2">
            {report.remediation.map((r) => (
              <li key={r.controlId} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3">
                <Badge tone={r.priority === "P0" ? "red" : r.priority === "P1" ? "amber" : "neutral"}>{r.priority}</Badge>
                <span className="font-mono text-xs">{r.controlId}</span>
                <span className="flex-1 text-sm text-slate-900">{r.action}</span>
                <Evidence path={r.where} />
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function AuditLog() {
  const { state } = useRepo();
  const [q, setQ] = useState("");
  const [actor, setActor] = useState("");
  const chain = useMemo(() => verifyChain(state.audit), [state.audit]);
  const actors = useMemo(() => [...new Set(state.audit.map((e) => e.actor))].sort(), [state.audit]);
  const rows = state.audit
    .filter((e) => (!actor || e.actor === actor) && (!q || `${e.action} ${e.entity}`.toLowerCase().includes(q.toLowerCase())))
    .slice(-200)
    .reverse();
  return (
    <Section id="ledger" title="Audit log explorer" purpose="Append-only ledger: each event's hash = sha256(previous hash + payload). Verified now in your browser.">
      <div className="flex flex-wrap items-end gap-3">
        <Badge tone={chain.valid ? "green" : "red"}>
          {chain.valid ? <ShieldCheck aria-hidden className="size-3.5" /> : <ShieldAlert aria-hidden className="size-3.5" />}
          {chain.valid ? `Chain verified (${state.audit.length} events)` : `Chain broken at #${chain.brokenAt}`}
        </Badge>
        <div className="w-56">
          <Field label="Filter action or entity" htmlFor="aud-q">
            <Input id="aud-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. offer" />
          </Field>
        </div>
        <div className="w-56">
          <Field label="Actor" htmlFor="aud-actor">
            <Select id="aud-actor" value={actor} onChange={(e) => setActor(e.target.value)}>
              <option value="">All actors</option>
              {actors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadFile("classrelay-audit-ledger.json", JSON.stringify(state.audit, null, 2), "application/json")}>
          <Download aria-hidden /> Export ledger
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No matching events" body="Clear the filters to see the whole ledger." />
      ) : (
        <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200">
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>At</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Hash</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <Td>{e.seq}</Td>
                  <Td className="whitespace-nowrap text-xs">{e.at.slice(0, 16).replace("T", " ")}</Td>
                  <Td>{e.actor}</Td>
                  <Td className="font-mono text-xs">{e.action}</Td>
                  <Td className="font-mono text-xs">{e.entity}</Td>
                  <Td className="font-mono text-xs" title={`prev ${e.prevHash}`}>
                    {e.hash.slice(0, 12)}...
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Section>
  );
}
