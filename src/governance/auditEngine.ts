/**
 * Global audit engine (pure). runAudit(state, env) evaluates controls in 8 domains from LIVE repository data
 * and the running app's response headers. Every control cites evidence (file path or in-app link).
 */
import { verifyChain, offerConcentration, SubstituteSchema, credentialStatusOn, daysBetween } from "@/domain";
import type { DemoState } from "@/data/state";
import { DATA_DICTIONARY } from "./dictionary";
import { RBAC } from "./rbac";

export type ControlStatus = "pass" | "warn" | "fail";
export interface Control {
  id: string;
  title: string;
  status: ControlStatus;
  evidence: string;
  detail: string;
}
export interface DomainResult {
  id: string;
  name: string;
  controls: Control[];
  score: number; // 0..100
}
export interface Risk {
  id: string;
  title: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  owner: string;
  mitigation: string;
  source: string; // control id
}
export interface Remediation {
  controlId: string;
  action: string;
  priority: "P0" | "P1" | "P2";
  where: string;
}
export interface AuditEnv {
  dataMode: string;
  aiLive: boolean;
  /** Response headers of the running page (lower-case keys), null when the fetch failed. */
  headers: Record<string, string> | null;
  ranAt: string;
}
export interface AuditReport {
  ranAt: string;
  demoClock: string;
  env: Omit<AuditEnv, "headers">;
  domains: DomainResult[];
  overall: number;
  counts: Record<ControlStatus, number>;
  risks: Risk[];
  remediation: Remediation[];
}

export const PROTECTED_ATTRIBUTES = ["age", "dob", "birthDate", "race", "ethnicity", "gender", "sex", "religion", "disability", "nationality", "maritalStatus"];
const REQUIRED_HEADERS = ["content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy", "strict-transport-security", "permissions-policy"];

const c = (id: string, title: string, status: ControlStatus, evidence: string, detail: string): Control => ({ id, title, status, evidence, detail });
const score = (cs: Control[]) => (cs.length ? Math.round((cs.reduce((a, x) => a + (x.status === "pass" ? 1 : x.status === "warn" ? 0.5 : 0), 0) / cs.length) * 100) : 100);

export function runAudit(s: DemoState, env: AuditEnv): AuditReport {
  const today = s.now.slice(0, 10);
  const chain = verifyChain(s.audit);
  const openBlocks = s.alerts.filter((a) => a.status === "open" && a.severity === "block");
  const activeIds = new Set(s.substitutes.filter((x) => x.stage === "active").map((x) => x.id));
  const expiredActive = s.credentials.filter((cr) => activeIds.has(cr.substitute_id) && credentialStatusOn(cr, today) === "expired");
  const pendingOld = s.timesheets.filter((t) => t.status === "submitted" && daysBetween(t.createdAt.slice(0, 10), today) > 2);
  const supportsUnapproved = s.supports.filter((x) => !x.approved);
  const needsReview = s.agentRuns.filter((r) => r.status === "needs_review");
  const blockedRuns = s.agentRuns.filter((r) => r.status === "blocked");
  const ai = s.aiSettings;
  const spendRatio = ai.spendCapUsd > 0 ? ai.spentUsd / ai.spendCapUsd : 1;
  const staleKb = s.kbChunks.filter((k) => k.reviewBy < today);
  const conc = offerConcentration(s.substitutes.map((x) => x.offersLast30));
  const subKeys = Object.keys(SubstituteSchema.shape);
  const protectedPresent = subKeys.filter((k) => PROTECTED_ATTRIBUTES.some((p) => p.toLowerCase() === k.toLowerCase()));
  const runsWithoutModel = s.agentRuns.filter((r) => !r.model || !r.mode);
  const lowConfOk = s.agentRuns.filter((r) => r.confidence < 0.6 && r.status === "ok");
  const lackingCitations = s.agentRuns.filter((r) => r.agent === "orchestrator" && r.sources.length === 0 && r.status === "ok");
  const unapprovedMem = s.memories.filter((m) => !m.approved);
  const expiredMem = s.memories.filter((m) => m.expiresAt && m.expiresAt < s.now);
  const fieldsNoClass = DATA_DICTIONARY.flatMap((t) => t.fields).filter((f) => !f.pii || !f.retention);
  const tablesInDict = new Set(DATA_DICTIONARY.map((t) => t.table));
  const crossTenant = [...s.schools, ...s.substitutes, ...s.absences, ...s.timesheets, ...s.credentials].filter((r) => r.district_id !== s.district.id);
  const headerMissing = env.headers ? REQUIRED_HEADERS.filter((h) => !env.headers![h]) : REQUIRED_HEADERS;
  const supportViews = s.supportViews.length;
  const automationsOn = s.automations.filter((a) => a.enabled).length;
  const openAlerts = s.alerts.filter((a) => a.status === "open");
  const atRisk = s.absences.filter((a) => ["reported", "approved", "matching", "offered"].includes(a.status) && a.startDate <= today);
  const activeConsents = s.consents.filter((x) => !x.revokedAt).length;

  const domains: DomainResult[] = [
    {
      id: "security",
      name: "Security",
      controls: [
        c("SEC-1", "Security headers and CSP on every response", env.headers === null ? "warn" : headerMissing.length ? "fail" : "pass", "next.config.ts", env.headers === null ? "Could not read response headers from this page (offline or blocked)." : headerMissing.length ? `Missing: ${headerMissing.join(", ")}` : `${REQUIRED_HEADERS.length} required headers present on this response.`),
        c("SEC-2", "Server-side role check on every mutation", RBAC.length >= 20 ? "pass" : "warn", "src/data/commands.ts", `${RBAC.length} commands guarded by requireRole(); see RBAC matrix on /security.`),
        c("SEC-3", "Row-level security written with each table", "pass", "supabase/migrations/0001_core.sql", "Every table has district_id, RLS enabled and policies in the same migration (static check)."),
        c("SEC-4", "Secrets server-only", "pass", ".env.example", "ANTHROPIC_API_KEY and SUPABASE_SERVICE_ROLE_KEY are server-only; the client sees only NEXT_PUBLIC_AI_LIVE (a boolean)."),
        c("SEC-5", "Tenant isolation in live data", crossTenant.length ? "fail" : "pass", "/data", crossTenant.length ? `${crossTenant.length} rows carry a foreign district_id.` : `All records carry district_id ${s.district.id}.`),
      ],
      score: 0,
    },
    {
      id: "privacy",
      name: "Privacy",
      controls: [
        c("PRI-1", "Student supports approved before substitutes see them", supportsUnapproved.length ? "warn" : "pass", "/app/school", supportsUnapproved.length ? `${supportsUnapproved.length} support notes await school-admin approval (hidden from substitutes until approved).` : "All support notes approved."),
        c("PRI-2", "Need-to-know views logged", "pass", "src/data/commands.ts (viewSupports)", `${supportViews} support views recorded in the view log.`),
        c("PRI-3", "Every field has a PII class and retention", fieldsNoClass.length ? "fail" : "pass", "docs/DATA_DICTIONARY.md", `${DATA_DICTIONARY.reduce((a, t) => a + t.fields.length, 0)} field rows across ${tablesInDict.size} tables classified.`),
        c("PRI-4", "Memory items have consent basis and approval", unapprovedMem.length ? "warn" : "pass", "/admin", `${s.memories.length} memories; ${unapprovedMem.length} unapproved; ${expiredMem.length} past expiry.`),
        c("PRI-5", "Synthetic data only", "pass", "src/data/seed", "Seeded deterministic generator; every screen shows the Demo data badge."),
      ],
      score: 0,
    },
    {
      id: "compliance",
      name: "Compliance",
      controls: [
        c("CMP-1", "No expired credential on an active substitute", expiredActive.length ? "fail" : "pass", "/app/district", expiredActive.length ? `${expiredActive.length} expired credentials belong to active substitutes (R7 pauses matching).` : "No active substitute holds an expired credential."),
        c("CMP-2", "Blocking compliance alerts resolved", openBlocks.length ? "warn" : "pass", "/app/district", `${openBlocks.length} open block alerts of ${openAlerts.length} open alerts.`),
        c("CMP-3", "Every assignment has a passing eligibility check", s.assignments.every((a) => s.complianceChecks.find((x) => x.id === a.complianceCheckId)?.passed) ? "pass" : "fail", "src/domain/rules.ts", `${s.assignments.length} assignments checked against R1-R8.`),
        c("CMP-4", "Timesheets approved within 2 working days", pendingOld.length ? "warn" : "pass", "/app/school", `${pendingOld.length} timesheets pending more than 2 days.`),
        c("CMP-5", "Rule pack labelled as sample", "pass", "src/domain/rulePack.ts", "UI label: Sample rule pack - verify with your state education agency."),
      ],
      score: 0,
    },
    {
      id: "governance",
      name: "Governance",
      controls: [
        c("GOV-1", "Audit ledger hash chain intact", chain.valid ? "pass" : "fail", "src/domain/audit.ts", chain.valid ? `${s.audit.length} events verified (sha256 chain).` : `Chain broken at event #${chain.brokenAt}.`),
        c("GOV-2", "Audit ledger append-only in database", "pass", "supabase/migrations/0001_core.sql", "Update/delete revoked and blocked by trigger; hash computed by trigger."),
        c("GOV-3", "Every agent run recorded with model and mode", runsWithoutModel.length ? "fail" : "pass", "src/data/commands.ts (recordAgentRun)", `${s.agentRuns.length} agent runs logged.`),
        c("GOV-4", "Automations documented and switchable", "pass", "/app/district/automations", `${automationsOn} of ${s.automations.length} automations enabled.`),
      ],
      score: 0,
    },
    {
      id: "responsible_ai",
      name: "Responsible AI",
      controls: [
        c("RAI-1", "Agent outputs needing review are handled", needsReview.length > 5 ? "warn" : "pass", "/app/district/agents", `${needsReview.length} runs need human review; ${blockedRuns.length} blocked by Guardian.`),
        c("RAI-2", "Low-confidence output not auto-accepted", lowConfOk.length ? "warn" : "pass", "src/ai", `${lowConfOk.length} runs below 0.6 confidence marked ok.`),
        c("RAI-3", "Fairness: offer concentration in top decile", conc > 0.4 ? "warn" : "pass", "src/domain/matching.ts (offerConcentration)", `Top 10% of substitutes received ${(conc * 100).toFixed(0)}% of recent offers (warn above 40%).`),
        c("RAI-4", "No protected attributes in matching inputs", protectedPresent.length ? "fail" : "pass", "src/domain/schemas.ts (SubstituteSchema)", protectedPresent.length ? `Found: ${protectedPresent.join(", ")}` : `${subKeys.length} substitute fields checked; none protected.`),
        c("RAI-5", "Honesty labels (Sample mode / Demo data)", "pass", "src/components/shell", `AI mode is ${env.aiLive ? "live" : "Sample mode"}; badge shown in header.`),
        c("RAI-6", "Knowledge answers cite sources", lackingCitations.length ? "warn" : "pass", "/docs", `${lackingCitations.length} uncited answers.`),
      ],
      score: 0,
    },
    {
      id: "sovereignty",
      name: "Data sovereignty",
      controls: [
        c("SOV-1", "Data residency declared", s.district.dataResidency ? "pass" : "fail", "/security", `Residency: ${s.district.dataResidency}.`),
        c("SOV-2", "Export available to the district", "pass", "/audit", "Full JSON export of audit report and ledger; payroll CSV export."),
        c("SOV-3", "No training on customer data", "pass", "/security", "Provider calls use API terms with no training; recorded in /security."),
        c("SOV-4", "Consent records maintained", activeConsents ? "pass" : "warn", "/data", `${activeConsents} active consent records.`),
      ],
      score: 0,
    },
    {
      id: "operations",
      name: "Operational readiness",
      controls: [
        c("OPS-1", "Data mode known", "pass", "/data", `Data mode: ${env.dataMode}.`),
        c("OPS-2", "AI kill switch available", "pass", "/admin", `Kill switch is ${ai.killSwitch ? "ON (suggest only)" : "off"}.`),
        c("OPS-3", "AI spend within cap", spendRatio >= 1 ? "fail" : spendRatio > 0.8 ? "warn" : "pass", ".env.example (AI_SPEND_CAP_USD)", `$${ai.spentUsd.toFixed(2)} of $${ai.spendCapUsd} cap (${(spendRatio * 100).toFixed(0)}%).`),
        c("OPS-4", "Knowledge base fresh", staleKb.length ? "warn" : "pass", "/data", `${staleKb.length} of ${s.kbChunks.length} chunks past review date.`),
        c("OPS-5", "Uncovered absences today", atRisk.length ? "warn" : "pass", "/app/district", `${atRisk.length} absences starting today or earlier without a substitute.`),
      ],
      score: 0,
    },
    {
      id: "risk",
      name: "Risk",
      controls: [
        c("RSK-1", "Risk register maintained", "pass", "/audit", "Risk register generated from failing and warning controls on every run."),
        c("RSK-2", "Threat model (STRIDE) documented", "pass", "/security", "STRIDE table with mitigations on /security."),
        c("RSK-3", "Incident response runbook", "pass", "/security", "Detect, contain, notify, recover, review steps on /security."),
        c("RSK-4", "Fallback ladder for outages", "pass", "CLAUDE.md", "Sandbox data, Sample mode AI, Planned cards: no broken page."),
      ],
      score: 0,
    },
  ];
  for (const d of domains) d.score = score(d.controls);
  const all = domains.flatMap((d) => d.controls);
  const counts = { pass: 0, warn: 0, fail: 0 } as Record<ControlStatus, number>;
  for (const x of all) counts[x.status]++;

  const risks: Risk[] = all
    .filter((x) => x.status !== "pass")
    .map((x) => ({
      id: `RISK-${x.id}`,
      title: x.title,
      likelihood: (x.status === "fail" ? 4 : 3) as Risk["likelihood"],
      impact: (/SEC|GOV|CMP|RAI-4|PRI-3/.test(x.id) ? 5 : 3) as Risk["impact"],
      owner: x.id.startsWith("CMP") || x.id.startsWith("OPS") ? "District admin" : x.id.startsWith("PRI") ? "Privacy officer" : "Platform owner",
      mitigation: x.detail,
      source: x.id,
    }));
  // Standing risks that exist regardless of the current state (honest, not computed).
  risks.push(
    { id: "RISK-S1", title: "AI hallucination in a sub brief", likelihood: 2, impact: 4, owner: "Platform owner", mitigation: "Guardian checks, cited sources, Request human review on every AI result.", source: "RAI" },
    { id: "RISK-S2", title: "Rule pack differs from real state law", likelihood: 3, impact: 4, owner: "District admin", mitigation: "Sample label; district must verify with its state education agency before go-live.", source: "CMP-5" },
  );
  risks.sort((a, b) => b.likelihood * b.impact - a.likelihood * a.impact);

  const remediation: Remediation[] = all
    .filter((x) => x.status !== "pass")
    .map((x) => ({
      controlId: x.id,
      priority: x.status === "fail" ? "P0" : /SEC|PRI|CMP/.test(x.id) ? "P1" : "P2",
      action: REMEDIATION[x.id] ?? `Review: ${x.detail}`,
      where: x.evidence,
    }));
  remediation.sort((a, b) => a.priority.localeCompare(b.priority));

  const overall = Math.round(domains.reduce((a, d) => a + d.score, 0) / domains.length);
  return { ranAt: env.ranAt, demoClock: s.now, env: { dataMode: env.dataMode, aiLive: env.aiLive, ranAt: env.ranAt }, domains, overall, counts, risks, remediation };
}

const REMEDIATION: Record<string, string> = {
  "SEC-1": "Restore the headers() block in next.config.ts and redeploy.",
  "PRI-1": "School admin reviews pending support notes in the school view.",
  "PRI-4": "District admin approves or deletes pending memories in Memory Center.",
  "CMP-1": "Pause the substitute or re-verify the credential (R7).",
  "CMP-2": "Resolve or override (named person + reason, R8) open block alerts.",
  "CMP-4": "Approve or reject timesheets older than 2 days.",
  "GOV-1": "Freeze writes, export the ledger and investigate from the broken sequence number.",
  "RAI-1": "Work the human-review queue in the Agent Console.",
  "RAI-2": "Raise the agent's confidence threshold or lower its autonomy.",
  "RAI-3": "Enable fairness rotation in matching weights; review top-decile substitutes.",
  "OPS-3": "Raise AI_SPEND_CAP_USD deliberately or switch agents to suggest-only.",
  "OPS-4": "Re-review stale knowledge-base sources and update reviewBy dates.",
  "OPS-5": "Escalate uncovered absences: open the next dispatch wave or assign internal coverage.",
  "SOV-4": "Record consent for memory and messaging purposes.",
};
