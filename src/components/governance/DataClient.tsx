"use client";
import { useState } from "react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Field, Select, Table, Td, Th } from "@/components/ui";
import { Hydrated } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { DATA_DICTIONARY, PII_CLASSES, type PiiClass } from "@/governance/dictionary";
import { LINEAGE } from "@/governance/lineage";
import { Mermaid } from "./Mermaid";
import { Evidence, Section } from "./common";

const ER = `erDiagram
  district ||--o{ school : has
  district ||--o{ substitute : employs
  school ||--o{ teacher : staffs
  teacher ||--o{ absence : reports
  teacher ||--o{ lesson_plan : writes
  absence ||--o{ offer : sends
  substitute ||--o{ offer : receives
  substitute ||--o{ credential : holds
  substitute ||--o{ availability : sets
  absence ||--o{ assignment : fills
  assignment ||--|| compliance_check : "checked by"
  assignment ||--o| sub_brief : briefs
  assignment ||--o| day_report : reports
  assignment ||--o| handoff : "hands off"
  assignment ||--o| timesheet : pays
  pay_run ||--o{ timesheet : batches
  district ||--o{ agent_run : logs
  district ||--o{ audit_event : chains
  district ||--o{ kb_chunk : knows
  kg_node ||--o{ kg_edge : links`;

const API = [
  { method: "GET", path: "/api/health", desc: "Liveness, data mode and AI mode booleans (no secrets)", auth: "Public" },
  { method: "POST", path: "/api/mcp  tool: check_eligibility", desc: "Run R1-R8 for a substitute and absence; returns violations and warnings with rule ids", auth: "Role token" },
  { method: "POST", path: "/api/mcp  tool: rank_candidates", desc: "Ranked, explainable candidate list with weights and blocked reasons", auth: "Role token" },
  { method: "POST", path: "/api/mcp  tool: compute_pay", desc: "Pay lines for tier, day part, day number and hard-to-fill school", auth: "Role token" },
  { method: "POST", path: "/api/mcp  tool: search_knowledge", desc: "Cited knowledge-base chunks; empty result says so", auth: "Role token" },
  { method: "POST", path: "/api/mcp  tool: get_rule", desc: "Text, version and effective date of a rule (R1-R8)", auth: "Role token" },
  { method: "POST", path: "/api/agents/prep-coach", desc: "Generate a sub brief (live model or recorded Sample mode); rate-limited and spend-capped", auth: "Role token" },
];

const PIPELINES = [
  { name: "File parser (lesson plans, credentials)", how: "PDF, DOCX, image or pasted text; type and size validated; text inside documents is treated as data, never instructions (Guardian).", status: "Live in sandbox" },
  { name: "OneRoster / CSV roster import", how: "CSV with schools, teachers and classes parsed with zod; rejected rows reported line by line; no student-level rows accepted.", status: "Sandboxed adapter" },
  { name: "Public requirements fetcher", how: "Fetches public state substitute-credential pages only; respects robots.txt; stores URL and retrieval date with each chunk; no personal data collected.", status: "Planned (seeded chunks today)" },
];

const RETENTION = [
  ["Payroll (timesheet, pay_run)", "7 years"],
  ["Audit ledger", "7 years, immutable"],
  ["Credentials", "Expiry + 3 years; uploaded documents verification + 30 days"],
  ["Student-sensitive notes (supports, behavior notes)", "School year + 30 days; visible to the substitute only in the 12 h need-to-know window"],
  ["Agent runs", "1 year"],
  ["Memory", "Until expires_at, max 1 year; deletable by district admin"],
  ["Demo snapshots", "30 days of inactivity; Reset demo clears instantly"],
];

const piiTone = (p: PiiClass) => (p === "none" ? "neutral" : p === "low" ? "teal" : p === "moderate" ? "amber" : "red");

export function DataClient() {
  return (
    <Hydrated rows={6}>
      <DataInner />
    </Hydrated>
  );
}

function DataInner() {
  const { state, mode } = useRepo();
  const [table, setTable] = useState("all");
  const today = state.now.slice(0, 10);
  const stale = state.kbChunks.filter((k) => k.reviewBy < today);
  const sources = [...new Set(state.kbChunks.map((k) => k.source))];
  const tables = table === "all" ? DATA_DICTIONARY : DATA_DICTIONARY.filter((t) => t.table === table);

  return (
    <div className="space-y-10">
      <Section id="sources" title="Data sources" purpose="Where the data on every screen comes from right now.">
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Active driver <Badge tone={mode === "sandbox" ? "amber" : "green"}>Data mode: {mode === "sandbox" ? "Sandbox" : "Supabase"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-800">
              {mode === "sandbox"
                ? "Your browser holds an isolated copy of the seeded synthetic Riverbend district (localStorage). Nothing you do reaches other visitors."
                : "Your snapshot is stored in Supabase table demo_snapshot, isolated per visitor by RLS."}{" "}
              Drivers: <Evidence path="src/data/sandbox.ts" /> <Evidence path="src/data/supabase.ts" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Live counts in your tenant</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-sm">
              {(
                [
                  ["Schools", state.schools.length],
                  ["Teachers", state.teachers.length],
                  ["Substitutes", state.substitutes.length],
                  ["Absences", state.absences.length],
                  ["Timesheets", state.timesheets.length],
                  ["Audit events", state.audit.length],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <p className="text-slate-700">{k}</p>
                  <p className="text-lg font-bold text-slate-950">{v}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="api" title="API catalog" purpose="OpenAPI-style summary. Every request body is parsed with zod; mutations re-check the role on the server.">
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Method</Th>
                <Th>Path</Th>
                <Th>Description</Th>
                <Th>Auth</Th>
              </tr>
            </thead>
            <tbody>
              {API.map((a) => (
                <tr key={a.path}>
                  <Td>
                    <Badge tone="outline">{a.method}</Badge>
                  </Td>
                  <Td className="font-mono text-xs">{a.path}</Td>
                  <Td>{a.desc}</Td>
                  <Td>{a.auth}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Section>

      <Section id="pipelines" title="Ingestion pipelines">
        <div className="grid gap-3 md:grid-cols-3">
          {PIPELINES.map((p) => (
            <Card key={p.name}>
              <CardHeader>
                <CardTitle className="text-base">{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-800">
                <p>{p.how}</p>
                <Badge tone={p.status.startsWith("Planned") ? "neutral" : "teal"}>{p.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="er" title="Entity-relationship diagram" purpose="Core tables from the migration. Every table also carries district_id.">
        <Mermaid chart={ER} label="Entity-relationship diagram of ClassRelay core tables" />
        <p className="text-sm text-slate-700">
          Source of truth: <Evidence path="supabase/migrations/0001_core.sql" />
        </p>
      </Section>

      <Section id="dictionary" title="Data dictionary" purpose="Every field with its PII class and retention period. Also in docs/DATA_DICTIONARY.md.">
        <div className="flex flex-wrap gap-2">
          {PII_CLASSES.map((p) => (
            <Badge key={p.cls} tone={piiTone(p.cls)} title={p.handling}>
              {p.cls}: {p.meaning}
            </Badge>
          ))}
        </div>
        <div className="w-64">
          <Field label="Table" htmlFor="dict-table">
            <Select id="dict-table" value={table} onChange={(e) => setTable(e.target.value)}>
              <option value="all">All {DATA_DICTIONARY.length} tables</option>
              {DATA_DICTIONARY.map((t) => (
                <option key={t.table} value={t.table}>
                  {t.table}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="max-h-[36rem] overflow-auto rounded-xl border border-slate-200">
          <Table>
            <thead>
              <tr>
                <Th>Table</Th>
                <Th>Field</Th>
                <Th>Type</Th>
                <Th>Description</Th>
                <Th>PII</Th>
                <Th>Retention</Th>
              </tr>
            </thead>
            <tbody>
              {tables.flatMap((t) =>
                t.fields.map((f) => (
                  <tr key={`${t.table}.${f.name}`}>
                    <Td className="font-mono text-xs">{t.table}</Td>
                    <Td className="font-mono text-xs">{f.name}</Td>
                    <Td className="text-xs">{f.type}</Td>
                    <Td className="text-sm">{f.description}</Td>
                    <Td>
                      <Badge tone={piiTone(f.pii)}>{f.pii}</Badge>
                    </Td>
                    <Td className="text-xs">{f.retention}</Td>
                  </tr>
                )),
              )}
            </tbody>
          </Table>
        </div>
      </Section>

      <Section id="lineage" title="Lineage" purpose="Source, transform (with the file that implements it), table, consumer.">
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Source</Th>
                <Th>Transform</Th>
                <Th>Table</Th>
                <Th>Consumer</Th>
              </tr>
            </thead>
            <tbody>
              {LINEAGE.map((l) => (
                <tr key={l.table + l.source}>
                  <Td>{l.source}</Td>
                  <Td>
                    {l.transform}
                    <div className="mt-1">
                      <Evidence path={l.evidence} />
                    </div>
                  </Td>
                  <Td className="font-mono text-xs">{l.table}</Td>
                  <Td>{l.consumer}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Section>

      <Section id="kb" title="Knowledge base" purpose="Chunks used for cited answers, with freshness checks against the demo clock.">
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">{state.kbChunks.length} chunks</Badge>
          <Badge tone="neutral">{sources.length} sources</Badge>
          <Badge tone={stale.length ? "amber" : "green"}>{stale.length} past review date</Badge>
        </div>
        {stale.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-slate-800">
            {stale.slice(0, 8).map((k) => (
              <li key={k.id}>
                {k.source} · {k.section} (review by {k.reviewBy})
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="retention" title="Retention policy">
        <Table>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Kept for</Th>
            </tr>
          </thead>
          <tbody>
            {RETENTION.map(([k, v]) => (
              <tr key={k}>
                <Td>{k}</Td>
                <Td>{v}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>
    </div>
  );
}
