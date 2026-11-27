/**
 * Data dictionary (CLAUDE.md section 4): every field has a type, a description, a PII class and a retention period.
 * Mirrors supabase/migrations/0001_core.sql and src/domain/schemas.ts. docs/DATA_DICTIONARY.md is generated from this content.
 */
export type PiiClass = "none" | "low" | "moderate" | "high" | "student-sensitive";

export interface DictField {
  name: string;
  type: string;
  description: string;
  pii: PiiClass;
  retention: string;
}
export interface DictTable {
  table: string;
  purpose: string;
  owner: string;
  retention: string;
  fields: DictField[];
}

type Row = [name: string, type: string, description: string, pii: PiiClass, retention?: string];

const ID: Row = ["id", "text", "Primary key (synthetic, deterministic)", "none"];
const DID: Row = ["district_id", "text", "Tenant key used by every RLS policy", "none"];

function t(table: string, purpose: string, owner: string, retention: string, rows: Row[]): DictTable {
  return {
    table,
    purpose,
    owner,
    retention,
    fields: rows.map(([name, type, description, pii, r]) => ({ name, type, description, pii, retention: r ?? retention })),
  };
}

export const DATA_DICTIONARY: DictTable[] = [
  t("district", "Tenant: one school district and its policy settings", "District admin", "Life of contract + 90 days", [
    ["id", "text", "District id, also its district_id", "none"],
    ["name", "text", "District name", "none"],
    ["region", "text", "State or region", "none"],
    ["timezone", "text", "IANA timezone for bell schedules", "none"],
    ["data_residency", "text", "Hosting region for all tenant data (default US)", "none"],
    ["rule_pack_id", "text", "Active credential rule pack", "none"],
    ["approval_required", "boolean", "Absences need admin approval before matching", "none"],
    ["t4_annual_day_limit", "int", "Retiree annual day cap (R5)", "none"],
  ]),
  t("school", "School profile, bell schedule and arrival notes", "School admin", "Life of contract + 90 days", [
    ID, DID,
    ["name", "text", "School name", "none"],
    ["level", "text", "Elementary / Middle / High", "none"],
    ["address", "text", "Public school address", "none"],
    ["bell_start / bell_end", "time", "Bell window used by pay and overlap checks", "none"],
    ["periods", "jsonb", "Period schedule (n, label, start, end)", "none"],
    ["hard_to_fill", "boolean", "Adds hard-to-fill pay bonus", "none"],
    ["arrival_notes / duty_notes", "text", "Parking, sign-in, duties for substitutes", "low"],
    ["budget_code", "text", "Payroll cost center", "none"],
    ["excluded_sub_ids", "text[]", "Exclusion list (R6)", "moderate"],
  ]),
  t("role", "The four application roles", "Platform", "Permanent", [ID, DID, ["description", "text", "What the role can do", "none"]]),
  t("app_user", "Login identity mapped to a role", "District admin", "Account life + 30 days", [
    ID, DID,
    ["auth_uid", "uuid", "Supabase auth subject", "moderate"],
    ["name", "text", "Display name", "moderate"],
    ["email", "text", "Work email", "moderate"],
    ["role", "text", "Role id", "none"],
    ["school_id / teacher_id / substitute_id", "text", "Scope links used by RLS claims", "low"],
    ["language", "text", "UI language en/bn/es", "low"],
  ]),
  t("teacher", "Teacher profile, classes and continuity notes", "Teacher", "Employment + 1 year", [
    ID, DID,
    ["school_id", "text", "Home school", "none"],
    ["name", "text", "Teacher name", "moderate"],
    ["subject / grade_band", "text", "Teaching assignment", "none"],
    ["classes", "jsonb", "Class sections with room, period and student count (no student names)", "low"],
    ["preferred_sub_ids / excluded_sub_ids", "text[]", "Matching preferences", "moderate"],
    ["routines", "text", "Class routines for substitutes", "low"],
    ["behavior_plan / seating_notes", "text", "Classroom-level notes; never individual diagnoses", "student-sensitive", "School year + 30 days"],
  ]),
  t("substitute", "Substitute profile used by matching (no protected attributes)", "Substitute", "Last assignment + 3 years (employment records)", [
    ID, DID,
    ["name", "text", "Substitute name", "moderate"],
    ["email / phone", "text", "Contact for offers", "high"],
    ["tier", "text", "T1-T4 credential tier", "low"],
    ["stage", "text", "Onboarding pipeline stage", "low"],
    ["subjects / grade_bands", "text[]", "Qualifications for matching", "low"],
    ["available_days / max_distance / preferred_school_ids", "mixed", "Availability and preferences", "low"],
    ["x / y", "numeric", "Synthetic home grid coordinate for distance (no street address stored)", "moderate"],
    ["reliability / rating", "numeric", "Performance signals used in ranking", "moderate"],
    ["days_this_year / offers_last_30", "int", "Workload and fairness counters", "low"],
    ["pause_reason", "text", "Why matching is paused", "moderate"],
  ]),
  t("credential_rule", "Versioned rule pack text (R1-R8)", "District admin", "Permanent (versioned)", [
    ID, DID,
    ["rule_pack_id / version / effective_date", "text/date", "Rule provenance", "none"],
    ["title / body", "text", "Plain-language rule", "none"],
  ]),
  t("credential", "Permits, licenses and clearances", "Substitute / HR", "Expiry + 3 years", [
    ID, DID,
    ["substitute_id", "text", "Holder", "low"],
    ["type", "text", "Credential type", "low"],
    ["number", "text", "Credential number", "high"],
    ["issuer", "text", "Issuing body", "low"],
    ["issue_date / expiry_date", "date", "Validity (check: expiry > issue)", "low"],
    ["status / confidence", "text/numeric", "Verification state and AI extraction confidence", "low"],
    ["document_name", "text", "Uploaded file name (document bytes are not retained in the demo)", "high", "Verification + 30 days"],
    ["verified_by / verified_at / review_note", "text", "Human reviewer trail", "low"],
  ]),
  t("availability", "Weekly availability and blocked dates", "Substitute", "Rolling 12 months", [
    ID, DID, ["substitute_id", "text", "Owner", "low"], ["weekday / day_part / blocked_date", "mixed", "Availability window", "low"],
  ]),
  t("preference", "Preferred and excluded pairings", "Teacher / School admin", "Until removed", [
    ID, DID, ["owner_kind / owner_id", "text", "Who set it", "low"], ["target_id", "text", "Substitute concerned", "moderate"], ["kind", "text", "preferred / excluded", "moderate"],
  ]),
  t("absence", "Teacher absence and its lifecycle state", "Teacher / School admin", "School year + 3 years", [
    ID, DID,
    ["school_id / teacher_id", "text", "Where and who", "low"],
    ["start_date / end_date / day_part / periods", "mixed", "When (check: end >= start)", "none"],
    ["reason", "text", "Coarse reason category (never medical detail)", "moderate"],
    ["notice_type / reported_via", "text", "Planned, short notice, same day; channel", "none"],
    ["status / current_wave", "text/int", "State machine position and dispatch wave", "none"],
    ["notes", "text", "Free-text notes for the substitute", "moderate"],
    ["sped", "boolean", "Special-education class (R3)", "low"],
    ["created_at / filled_at / cancel_reason", "mixed", "Timing for fill-rate KPIs", "none"],
  ]),
  t("offer", "Job offer sent to a substitute in a wave", "System", "School year + 1 year", [
    ID, DID,
    ["absence_id / substitute_id", "text", "Pairing (unique accepted offer per absence)", "low"],
    ["wave / status", "int/text", "Dispatch wave and response", "none"],
    ["score / reasons", "numeric/text[]", "Explainable ranking", "low"],
    ["pay / distance", "numeric", "Quoted pay and distance", "low"],
    ["sent_at / responded_at", "timestamptz", "Response timing", "none"],
  ]),
  t("assignment", "Confirmed job (no overlap per substitute via exclusion constraint)", "System", "School year + 3 years", [
    ID, DID,
    ["absence_id / substitute_id / school_id", "text", "Links", "low"],
    ["date / day_part / slot", "date/tstzrange", "Bell window", "none"],
    ["status / day_number", "text/int", "Lifecycle and long-term day count", "none"],
    ["compliance_check_id", "text", "Eligibility evidence at acceptance", "none"],
    ["accepted_at / check_in_at / check_out_at", "timestamptz", "Attendance timestamps", "low"],
  ]),
  t("compliance_check", "Snapshot of R1-R8 evaluation", "System", "School year + 5 years", [
    ID, DID, ["substitute_id / absence_id / date", "mixed", "Subject of the check", "low"], ["passed / violations / warnings", "mixed", "Rule findings with rule ids", "low"], ["checked_at", "timestamptz", "When", "none"],
  ]),
  t("lesson_plan", "Teacher plan, uploaded or emergency", "Teacher", "School year + 30 days", [
    ID, DID, ["teacher_id", "text", "Author", "low"], ["title / date / emergency / source", "mixed", "Plan metadata", "none"], ["periods", "jsonb", "Objectives, activities, materials, differentiation", "low"],
  ]),
  t("sub_brief", "AI-generated substitute brief", "System (Prep Coach)", "Assignment date + 30 days", [
    ID, DID, ["assignment_id / language", "text", "Target", "none"], ["content", "jsonb", "Periods, routines, approved need-to-know supports", "student-sensitive", "Assignment date + 30 days"], ["meta", "jsonb", "AI mode, confidence, reasons, sources", "none"],
  ]),
  t("day_report", "Substitute end-of-day report", "Substitute", "School year + 1 year", [
    ID, DID, ["assignment_id", "text", "Assignment", "none"], ["covered", "jsonb", "Per-period coverage", "none"], ["attendance_notes / behavior_notes", "text", "Class-level notes, no diagnoses", "student-sensitive", "School year + 30 days"], ["materials / message", "text", "Notes to the teacher", "low"],
  ]),
  t("handoff", "AI handoff back to the teacher", "System (Lesson Continuity)", "School year + 1 year", [
    ID, DID, ["assignment_id / teacher_id", "text", "Target", "low"], ["taught / gaps / next_steps / follow_ups", "text[]", "Continuity summary", "low"], ["continuity_score", "numeric", "0..1 continuity KPI", "none"], ["meta / read_at", "mixed", "AI provenance; read receipt", "none"],
  ]),
  t("pay_rule", "Versioned pay parameters", "District admin", "Permanent (versioned)", [
    ID, DID, ["key / value", "text/numeric", "e.g. daily.T2 = 160", "none"], ["version / effective_date", "text/date", "Provenance", "none"],
  ]),
  t("timesheet", "Per-assignment pay record", "Substitute / Payroll", "7 years (payroll records)", [
    ID, DID, ["assignment_id / substitute_id / school_id", "text", "Links", "low"], ["date / day_part / hours / rate", "mixed", "Worked time", "low"], ["lines / amount", "jsonb/numeric", "Pay breakdown", "moderate"], ["status / anomalies / approved_by", "mixed", "Approval trail and anomaly codes", "low"], ["budget_code / pay_run_id", "text", "Cost center and batch", "none"],
  ]),
  t("pay_run", "Batch of approved timesheets for export", "Payroll", "7 years (payroll records)", [
    ID, DID, ["period_start / period_end", "date", "Pay period", "none"], ["status / timesheet_ids / total / approved_by", "mixed", "Approval and totals", "moderate"],
  ]),
  t("agent_run", "One AI agent invocation (CLAUDE.md section 5)", "System", "1 year", [
    ID, DID, ["agent / model / mode", "text", "Which agent, routed model, live or sample", "none"], ["input_summary", "text", "Redacted input summary (Guardian)", "low"], ["sources / tool_calls / output", "jsonb/text", "Citations, tools used, output", "low"], ["confidence / latency_ms / cost_usd / status", "mixed", "Quality, latency, spend, review state", "none"], ["guardian_notes", "text[]", "Redactions and blocks applied", "none"],
  ]),
  t("memory", "Agent memory with consent basis", "District admin", "Until expires_at (max 1 year)", [
    ID, DID, ["type / scope", "text", "Working/episodic/semantic/procedural; who it is about", "low"], ["content", "text", "Remembered fact", "moderate"], ["source / confidence / consent_basis / approved", "mixed", "Provenance and approval", "none"], ["created_at / expires_at", "timestamptz", "Retention window", "none"],
  ]),
  t("kb_chunk", "Knowledge-base chunk for cited retrieval", "District admin", "Until superseded + 1 year", [
    ID, DID, ["source / section / text", "text", "Policy text (public or district policy)", "none"], ["version / effective_date / review_by", "text/date", "Freshness control", "none"], ["embedding", "vector(1024)", "pgvector embedding", "none"],
  ]),
  t("kg_node", "Knowledge-graph entity", "System", "Rebuilt nightly", [ID, DID, ["kind / label", "text", "Entity type and label", "low"]]),
  t("kg_edge", "Knowledge-graph relation", "System", "Rebuilt nightly", [["id", "bigserial", "Edge id", "none"], DID, ["from_id / to_id / rel", "text", "HOLDS, QUALIFIES_FOR, PREFERS, EXCLUDED_FROM, ...", "low"]]),
  t("consent", "Consent and lawful basis records", "Data subject", "Revocation + 3 years", [
    ID, DID, ["subject_id", "text", "Person the consent is about", "moderate"], ["purpose / basis", "text", "Why the data is processed", "none"], ["granted_at / revoked_at", "timestamptz", "Consent window", "none"],
  ]),
  t("audit_event", "Append-only, hash-chained ledger", "Platform", "7 years, immutable", [
    ["seq", "bigserial", "Order in the chain", "none"], ["id", "text", "Event id", "none"], DID,
    ["at / actor / action / entity", "mixed", "Who did what to which record", "low"],
    ["payload", "jsonb", "Event detail (ids, never free-text PII)", "low"],
    ["prev_hash / hash", "text", "sha256(prev_hash || payload), set by trigger", "none"],
  ]),
  t("demo_snapshot", "Per-visitor sandbox state for the hosted demo", "Platform", "30 days of inactivity", [
    ["visitor_id", "uuid", "Anonymous visitor (auth.uid())", "low"], DID, ["state", "jsonb", "Synthetic tenant snapshot", "none"], ["updated_at", "timestamptz", "Last write", "none"],
  ]),
];

export const PII_CLASSES: { cls: PiiClass; meaning: string; handling: string }[] = [
  { cls: "none", meaning: "Not about a person", handling: "No restriction beyond tenant isolation" },
  { cls: "low", meaning: "Indirect or work-context data", handling: "Role-scoped by RLS" },
  { cls: "moderate", meaning: "Identifies an adult (name, email, preferences)", handling: "RLS + redacted before AI calls" },
  { cls: "high", meaning: "Contact numbers, credential numbers, documents", handling: "Owner and district admin only; Guardian redacts" },
  { cls: "student-sensitive", meaning: "Classroom notes that could relate to students (FERPA)", handling: "Need-to-know window (12 h), admin approval, every view logged" },
];

export function dictionaryMarkdown(): string {
  const out = ["# Data dictionary", "", "Generated from src/governance/dictionary.ts. Synthetic data only.", ""];
  out.push("| PII class | Meaning | Handling |", "|---|---|---|", ...PII_CLASSES.map((p) => `| ${p.cls} | ${p.meaning} | ${p.handling} |`), "");
  for (const tb of DATA_DICTIONARY) {
    out.push(`## ${tb.table}`, "", `${tb.purpose}. Owner: ${tb.owner}. Default retention: ${tb.retention}.`, "", "| Field | Type | Description | PII | Retention |", "|---|---|---|---|---|");
    for (const f of tb.fields) out.push(`| ${f.name} | ${f.type} | ${f.description} | ${f.pii} | ${f.retention} |`);
    out.push("");
  }
  return out.join("\n");
}
