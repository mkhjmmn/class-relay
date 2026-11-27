"use client";
import { useEffect, useState } from "react";
import { Check, Minus } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Table, Td, Th } from "@/components/ui";
import { Hydrated } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { isLiveAiConfigured } from "@/components/shell/aiMode";
import { verifyChain } from "@/domain";
import { RBAC, RBAC_SOURCE, ROLES } from "@/governance/rbac";
import { Evidence, Section, StatusBadge } from "./common";

const HEADERS = ["content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy", "strict-transport-security", "permissions-policy", "cross-origin-opener-policy"];

const AUTH = [
  { name: "Demo role picker", status: "Live", note: "Anonymous visitors pick a synthetic identity at /demo-user or /demo-admin. No passwords exist in the demo." },
  { name: "SSO (SAML 2.0 / OIDC: Google Workspace, Microsoft Entra, Clever, ClassLink)", status: "Planned adapter", note: "Maps IdP groups to the four roles and puts district_id in the JWT used by RLS." },
  { name: "MFA", status: "Planned adapter", note: "Required for district admins (TOTP or WebAuthn) via the IdP or Supabase Auth." },
  { name: "Passwordless (magic link / SMS code) for substitutes", status: "Planned adapter", note: "Substitutes often lack district accounts; one-time codes tied to verified phone." },
];

const COMPLIANCE = [
  { control: "Tenant isolation (district_id + RLS)", status: "Implemented", evidence: "supabase/migrations/0001_core.sql" },
  { control: "Server-side role checks on mutations", status: "Implemented", evidence: "src/data/commands.ts" },
  { control: "Security headers and CSP", status: "Implemented", evidence: "next.config.ts" },
  { control: "Append-only hash-chained audit", status: "Implemented", evidence: "src/domain/audit.ts" },
  { control: "Data dictionary with PII class and retention", status: "Implemented", evidence: "docs/DATA_DICTIONARY.md" },
  { control: "Need-to-know window and view logging for student supports", status: "Implemented", evidence: "src/data/commands.ts" },
  { control: "FERPA school-official agreement (DPA template)", status: "Planned", evidence: "/docs" },
  { control: "COPPA: no data collected from children under 13", status: "Implemented by design", evidence: "src/domain/schemas.ts" },
  { control: "SOC 2 Type II", status: "Not started", evidence: "/audit" },
  { control: "Third-party penetration test", status: "Not started", evidence: "/audit" },
];

const STRIDE = [
  ["Spoofing", "Someone acts as another substitute or admin", "SSO/MFA (planned); JWT claims drive RLS; demo identities are synthetic"],
  ["Tampering", "Editing pay, credentials or the audit trail", "Role checks per command; RLS write policies; audit_event update/delete revoked + trigger"],
  ["Repudiation", "Denying an approval or override", "Every command appends a hash-chained event with actor; R8 overrides need name and reason"],
  ["Information disclosure", "Student notes or contact data leak", "PII classes; need-to-know window; Guardian redaction before AI; substitutes see own rows only"],
  ["Denial of service", "AI endpoint flooding or runaway cost", "AI_RATE_LIMIT_PER_MIN per visitor; AI_SPEND_CAP_USD per tenant; kill switch"],
  ["Elevation of privilege", "Prompt injection in an uploaded plan triggers actions", "Document text treated as data; tool allow-list per agent; human-in-the-loop gates on mutations"],
];

const RUNBOOK = [
  ["Detect", "Global audit fails, chain verification breaks, Guardian blocks spike or a user reports an issue."],
  ["Contain", "District admin turns on the AI kill switch (suggest-only); revoke sessions; freeze pay-run export."],
  ["Assess", "Export the audit ledger (JSON) and agent runs; find the first broken or suspicious sequence number."],
  ["Notify", "Notify the district privacy officer within 24 h; affected individuals and authorities per state breach law timelines."],
  ["Recover", "Restore from snapshot; re-verify the chain; re-enable agents one at a time at lower autonomy."],
  ["Review", "Post-incident review within 5 working days; add a control to the global audit."],
];

const RAI = [
  "Every agent has a charter, a zod output schema, a tool list, an autonomy level and a confidence threshold; schema failures retry once, then go to human review.",
  "The Guardian runs before and after every agent: redacts PII, treats document text as data, blocks unsafe output.",
  "Every AI result shows reasons, sources, confidence and a Request human review action.",
  "Matching never uses protected attributes; the substitute schema has none. Offer concentration is monitored.",
  "Without an API key, agents show recorded outputs labelled Sample mode. No invented metrics.",
];

export function SecurityClient() {
  return (
    <Hydrated rows={6}>
      <SecurityInner />
    </Hydrated>
  );
}

function SecurityInner() {
  const { state, mode } = useRepo();
  const [headers, setHeaders] = useState<Record<string, string> | null | undefined>(undefined);
  useEffect(() => {
    let off = false;
    fetch(window.location.href, { method: "HEAD", cache: "no-store" })
      .then((r) => {
        const h: Record<string, string> = {};
        r.headers.forEach((v, k) => (h[k.toLowerCase()] = v));
        if (!off) setHeaders(h);
      })
      .catch(() => !off && setHeaders(null));
    return () => {
      off = true;
    };
  }, []);
  const chain = verifyChain(state.audit);
  const ai = state.aiSettings;
  const live = isLiveAiConfigured();

  return (
    <div className="space-y-10">
      <Section id="live" title="Live control status" purpose="Computed now from the running app: this page's response headers, your sandbox ledger and AI settings.">
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response headers on this page</CardTitle>
            </CardHeader>
            <CardContent>
              {headers === undefined ? (
                <p className="text-sm text-slate-700">Reading headers...</p>
              ) : headers === null ? (
                <p className="text-sm text-amber-900">Could not read headers (offline?).</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {HEADERS.map((h) => (
                    <li key={h} className="flex items-center gap-2">
                      <StatusBadge status={headers[h] ? "pass" : "fail"} /> <code className="text-xs">{h}</code>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-slate-700">
                Configured in <Evidence path="next.config.ts" />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Runtime controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <StatusBadge status={chain.valid ? "pass" : "fail"} /> Audit chain {chain.valid ? `verified (${state.audit.length} events)` : `broken at #${chain.brokenAt}`}
              </p>
              <p className="flex items-center gap-2">
                <Badge tone={ai.killSwitch ? "red" : "green"}>{ai.killSwitch ? "ON" : "Off"}</Badge> AI kill switch
              </p>
              <p className="flex items-center gap-2">
                <Badge tone={live ? "green" : "amber"}>{live ? "Live" : "Sample mode"}</Badge> AI mode
              </p>
              <p className="flex items-center gap-2">
                <Badge tone="neutral">
                  ${ai.spentUsd.toFixed(2)} / ${ai.spendCapUsd}
                </Badge>
                AI spend vs cap
              </p>
              <p className="flex items-center gap-2">
                <Badge tone={mode === "sandbox" ? "amber" : "green"}>{mode}</Badge> Data mode
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="authn" title="Authentication" purpose="What exists today and what is a planned adapter, stated plainly.">
        <Table>
          <thead>
            <tr>
              <Th>Method</Th>
              <Th>Status</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {AUTH.map((a) => (
              <tr key={a.name}>
                <Td>{a.name}</Td>
                <Td>
                  <Badge tone={a.status === "Live" ? "green" : "neutral"}>{a.status}</Badge>
                </Td>
                <Td className="text-sm">{a.note}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section id="authz" title="Authorization (RBAC)" purpose="Who can run each command. Derived from requireRole() calls; RLS in Postgres is the second wall.">
        <p className="text-sm text-slate-700">
          Source: <Evidence path={RBAC_SOURCE} /> · RLS: <Evidence path="supabase/migrations/0001_core.sql" />
        </p>
        <RbacMatrix />
      </Section>

      <Section id="rls" title="Row-level security">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
          <li>Every table has district_id and RLS enabled with policies in the same migration; isolation key is auth.jwt() -&gt; district_id.</li>
          <li>Substitutes read only their own profile, credentials, offers, assignments and timesheets.</li>
          <li>Teachers read their own absences, plans, handoffs and the assignments covering their classes.</li>
          <li>School admins are scoped to their school; district admins to the district.</li>
          <li>Constraints: no overlapping live assignments per substitute (exclusion constraint), credential expiry after issue, one accepted offer per absence.</li>
        </ul>
      </Section>

      <Section id="encryption" title="Encryption">
        <p className="text-sm text-slate-800">
          TLS everywhere with HSTS (max-age 2 years, preload). At rest: Postgres storage encryption (AES-256) on Supabase. Secrets only in server env (<Evidence path=".env.example" />
          ); the browser receives a single boolean for AI mode. Customer-managed keys (BYO key) are planned for district tenants.
        </p>
      </Section>

      <Section id="privacy" title="Privacy">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["FERPA", "ClassRelay acts as a school official with legitimate educational interest; student data limited to class-level, action-phrased supports approved by a school admin."],
            ["COPPA", "No accounts or data collection from students; users are adult staff only."],
            ["State student-privacy laws", "Designed for SOPIPA-style rules: no advertising, no profiling, deletion on request. The rule pack is a sample to verify with your state."],
            ["Need-to-know window", "A substitute sees approved supports only from 12 hours before the assignment until it ends."],
            ["View logging", `Each support view is logged. ${state.supportViews.length} views recorded in your sandbox.`],
            ["Minimization", "Substitute profile stores a grid coordinate, not a home address, and no protected attributes."],
          ].map(([k, v]) => (
            <Card key={k}>
              <CardHeader>
                <CardTitle className="text-base">{k}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-800">{v}</CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="compliance" title="Compliance matrix">
        <Table>
          <thead>
            <tr>
              <Th>Control</Th>
              <Th>Status</Th>
              <Th>Evidence</Th>
            </tr>
          </thead>
          <tbody>
            {COMPLIANCE.map((c) => (
              <tr key={c.control}>
                <Td>{c.control}</Td>
                <Td>
                  <Badge tone={c.status.startsWith("Implemented") ? "green" : c.status === "Planned" ? "amber" : "neutral"}>{c.status}</Badge>
                </Td>
                <Td>
                  <Evidence path={c.evidence} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section id="sovereignty" title="Data sovereignty">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
          <li>
            Residency for this district: <Badge tone="teal">{state.district.dataResidency}</Badge> (US by default; set per district).
          </li>
          <li>Bring-your-own key for the AI provider and storage encryption: planned for district tenants.</li>
          <li>No training on customer data: provider calls go through API terms that exclude training.</li>
          <li>Export: JSON export of the audit report and ledger on /audit; payroll CSV export. Deletion: Reset demo wipes the sandbox; tenant deletion within 30 days of contract end.</li>
        </ul>
      </Section>

      <Section id="rai" title="Responsible-AI controls">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
          {RAI.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Section>

      <Section id="threats" title="Threat model (STRIDE)">
        <Table>
          <thead>
            <tr>
              <Th>Threat</Th>
              <Th>Example</Th>
              <Th>Mitigation</Th>
            </tr>
          </thead>
          <tbody>
            {STRIDE.map(([a, b, c]) => (
              <tr key={a}>
                <Td className="font-medium">{a}</Td>
                <Td className="text-sm">{b}</Td>
                <Td className="text-sm">{c}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section id="incident" title="Incident response runbook">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-800">
          {RUNBOOK.map(([k, v]) => (
            <li key={k}>
              <strong>{k}.</strong> {v}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

export function RbacMatrix() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr>
            <Th>Action (command)</Th>
            {ROLES.map((r) => (
              <Th key={r}>{r.replace("_", " ")}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RBAC.map((row) => (
            <tr key={row.command}>
              <Td>
                {row.action} <span className="font-mono text-xs text-slate-600">{row.command}</span>
              </Td>
              {ROLES.map((r) => (
                <Td key={r}>
                  {row.roles.includes(r) ? <Check aria-label="Allowed" className="size-4 text-emerald-700" /> : <Minus aria-label="Not allowed" className="size-4 text-slate-400" />}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
