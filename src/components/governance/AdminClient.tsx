"use client";
import { useState } from "react";
import type React from "react";
import { AgentConsole, AutomationStudio, KnowledgeExplorer, MemoryCenter } from "@/components/ai";
import Link from "next/link";
import { Badge, Card, CardContent, CardHeader, CardTitle, Field, Input, Select, Table, Tabs, TabsContent, TabsList, TabsTrigger, Td, Th } from "@/components/ui";
import { Hydrated, EmptyState } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { isLiveAiConfigured } from "@/components/shell/aiMode";
import { PAY_RULES, RULES, RULE_PACK, verifyChain, type Role } from "@/domain";
import { RbacMatrix } from "./SecurityClient";
import { Evidence } from "./common";

/** Names and defaults from .env.example. Edits stay in this browser session only (not saved, not sent anywhere). */
const MODEL_ROUTES = [
  { env: "AI_MODEL_FAST", use: "Extraction, intake", def: "claude-haiku-5-5" },
  { env: "AI_MODEL_REASONING", use: "Matching explanations, briefs, handoffs", def: "claude-opus-5-5" },
  { env: "AI_MODEL_VISION", use: "Credential documents, handwritten plans", def: "claude-sonnet-5-5" },
  { env: "AI_MODEL_EMBED", use: "Retrieval", def: "local-bm25" },
  { env: "AI_MODEL_FALLBACK", use: "Fallback when the primary fails", def: "claude-sonnet-5-5" },
];

const INTEGRATIONS = [
  ["SSO (SAML / OIDC)", "Google Workspace, Microsoft Entra, Clever, ClassLink sign-in mapped to roles"],
  ["SIS / OneRoster 1.2", "Schools, teachers and class sections (no student rows)"],
  ["HRIS", "Substitute employee records, tiers and onboarding status"],
  ["Payroll", "Approved pay runs exported as CSV today; direct push planned"],
  ["Messaging (SMS, email, WhatsApp)", "Offers and reminders; in the demo, messages land in the in-app outbox"],
];

const LINKED = [
  { id: "automation", label: "Automation Studio", body: "W1-W8 time rules (wave escalation, no-show detection, expiry reminders, timesheet nudges) with dry-run and on/off switches.", href: "/app/district/automations" },
  { id: "agents", label: "Agent Console", body: "Every agent run with inputs, sources, tool calls, confidence, cost and model; autonomy levels, kill switch and the human-review queue.", href: "/app/district/agents" },
  { id: "memory", label: "Memory Center", body: "Working, episodic, semantic and procedural memories with consent basis, approval and expiry; delete on request.", href: "/app/district/agents" },
  { id: "kb", label: "Knowledge base", body: "Policy chunks with version, effective date and review-by date used for cited answers.", href: "/data#kb" },
];

const EMBED: Record<string, React.ReactNode> = {
  automation: <AutomationStudio />,
  agents: <AgentConsole />,
  memory: <MemoryCenter />,
  kb: <KnowledgeExplorer />,
};

export function AdminClient() {
  return (
    <Hydrated rows={6}>
      <AdminInner />
    </Hydrated>
  );
}

function AdminInner() {
  const { state, mode } = useRepo();
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [q, setQ] = useState("");
  const [routes, setRoutes] = useState<Record<string, string>>(() => Object.fromEntries(MODEL_ROUTES.map((m) => [m.env, m.def])));
  const users = state.users.filter((u) => (roleFilter === "all" || u.role === roleFilter) && (!q || u.name.toLowerCase().includes(q.toLowerCase())));
  const chain = verifyChain(state.audit);
  const schoolName = (id?: string) => state.schools.find((s) => s.id === id)?.short ?? "-";

  return (
    <Tabs defaultValue="users">
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
        <TabsTrigger value="schools">Schools</TabsTrigger>
        <TabsTrigger value="pay">Pay rules</TabsTrigger>
        <TabsTrigger value="rules">Rule packs</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="models">Model routing</TabsTrigger>
        <TabsTrigger value="health">System health</TabsTrigger>
        {LINKED.map((l) => (
          <TabsTrigger key={l.id} value={l.id}>
            {l.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="users" className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="w-56">
            <Field label="Search users" htmlFor="adm-q">
              <Input id="adm-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" />
            </Field>
          </div>
          <div className="w-56">
            <Field label="Role" htmlFor="adm-role">
              <Select id="adm-role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "all")}>
                <option value="all">All roles</option>
                <option value="substitute">Substitute</option>
                <option value="teacher">Teacher</option>
                <option value="school_admin">School admin</option>
                <option value="district_admin">District admin</option>
              </Select>
            </Field>
          </div>
        </div>
        {users.length === 0 ? (
          <EmptyState title="No users match" body="Clear the search or role filter." />
        ) : (
          <div className="max-h-96 overflow-auto rounded-xl border border-slate-200">
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>School</Th>
                  <Th>Language</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <Td>{u.name}</Td>
                    <Td>
                      <Badge tone="outline">{u.role.replace("_", " ")}</Badge>
                    </Td>
                    <Td>{schoolName(u.school_id)}</Td>
                    <Td>{u.language}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        <h2 className="text-lg font-semibold text-slate-950">RBAC matrix</h2>
        <RbacMatrix />
      </TabsContent>

      <TabsContent value="schools" className="grid gap-3 md:grid-cols-2">
        {state.schools.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {s.name} {s.hardToFill && <Badge tone="amber">Hard to fill</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-800">
              <p>
                {s.level} · bell {s.bellStart}-{s.bellEnd} · budget {s.budgetCode}
              </p>
              <ul className="grid grid-cols-2 gap-x-3 text-xs">
                {s.periods.map((p) => (
                  <li key={p.n}>
                    {p.label}: {p.start}-{p.end}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="pay" className="space-y-3">
        <p className="text-sm text-slate-700">
          Source: <Evidence path="src/domain/rulePack.ts" /> (PAY_RULES), applied by <Evidence path="src/domain/pay.ts" />.
        </p>
        <Table>
          <tbody>
            {Object.entries(PAY_RULES.daily).map(([tier, v]) => (
              <tr key={tier}>
                <Td>Daily rate {tier}</Td>
                <Td>${v}</Td>
              </tr>
            ))}
            {(
              [
                ["Half-day ratio", PAY_RULES.halfDayRatio],
                ["Long-term from day", PAY_RULES.longTermFromDay],
                ["Long-term bonus", `$${PAY_RULES.longTermBonus}/day`],
                ["Hard-to-fill bonus", `$${PAY_RULES.hardToFillBonus}/day`],
                ["Late-cancel window", `${PAY_RULES.lateCancelHours} h`],
                ["Full / half day hours", `${PAY_RULES.fullDayHours} / ${PAY_RULES.halfDayHours}`],
                ["Approval deadline", `${PAY_RULES.approvalWorkingDays} working days`],
              ] as const
            ).map(([k, v]) => (
              <tr key={k}>
                <Td>{k}</Td>
                <Td>{v}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TabsContent>

      <TabsContent value="rules" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">{RULE_PACK.label}</Badge>
          <Badge tone="outline">
            {RULE_PACK.id} v{RULE_PACK.version} · effective {RULE_PACK.effectiveDate}
          </Badge>
        </div>
        <Table>
          <tbody>
            {RULES.map((r) => (
              <tr key={r.id}>
                <Td className="font-mono text-xs">{r.id}</Td>
                <Td className="font-medium">{r.title}</Td>
                <Td className="text-sm">{r.text}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TabsContent>

      <TabsContent value="integrations" className="grid gap-3 md:grid-cols-2">
        {INTEGRATIONS.map(([k, v]) => (
          <Card key={k}>
            <CardHeader>
              <CardTitle className="text-base">
                {k} <Badge tone="neutral">Sandboxed</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-800">{v}</CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="models" className="space-y-3">
        <p className="text-sm text-slate-700">
          Model routing from env (<Evidence path=".env.example" />
          ). Feature code never names a model. <Badge tone="amber">Edits are kept in this session only and change nothing on the server.</Badge>
        </p>
        <Table>
          <thead>
            <tr>
              <Th>Env variable</Th>
              <Th>Used for</Th>
              <Th>Model (session override)</Th>
            </tr>
          </thead>
          <tbody>
            {MODEL_ROUTES.map((m) => (
              <tr key={m.env}>
                <Td className="font-mono text-xs">{m.env}</Td>
                <Td>{m.use}</Td>
                <Td>
                  <label htmlFor={`route-${m.env}`} className="sr-only">
                    {m.env}
                  </label>
                  <Input id={`route-${m.env}`} value={routes[m.env]} onChange={(e) => setRoutes({ ...routes, [m.env]: e.target.value })} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TabsContent>

      <TabsContent value="health">
        <Table>
          <tbody>
            {(
              [
                ["Data mode", mode],
                ["AI mode", isLiveAiConfigured() ? "Live" : "Sample mode"],
                ["AI kill switch", state.aiSettings.killSwitch ? "ON" : "Off"],
                ["Audit chain", chain.valid ? `Valid (${state.audit.length} events)` : `Broken at #${chain.brokenAt}`],
                ["Demo clock", state.now.slice(0, 16).replace("T", " ")],
                ["Users / schools / substitutes", `${state.users.length} / ${state.schools.length} / ${state.substitutes.length}`],
                ["Absences / assignments / timesheets", `${state.absences.length} / ${state.assignments.length} / ${state.timesheets.length}`],
                ["Agent runs / open alerts", `${state.agentRuns.length} / ${state.alerts.filter((a) => a.status === "open").length}`],
              ] as const
            ).map(([k, v]) => (
              <tr key={k}>
                <Td className="font-medium">{k}</Td>
                <Td>{v}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="mt-3 text-sm text-slate-700">
          Full check: <Link href="/audit" className="text-brand-800 underline">Run global audit</Link>
        </p>
      </TabsContent>

      {LINKED.map((l) => (
        <TabsContent key={l.id} value={l.id}>
          <Card>
            <CardContent className="space-y-3 pt-5 text-sm text-slate-800">
              <p>{l.body}</p>
              <Link href={l.href} className="font-semibold text-brand-800 underline">
                Open {l.label} in the district app
              </Link>
            </CardContent>
          </Card>
          <div className="mt-4">{EMBED[l.id]}</div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
