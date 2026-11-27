/** Data lineage: source -> transform -> table -> consumer. Each transform cites the file that implements it. */
export interface LineageEntry {
  source: string;
  transform: string;
  evidence: string;
  table: string;
  consumer: string;
}

export const LINEAGE: LineageEntry[] = [
  { source: "Teacher voice/text/form", transform: "Intake agent extraction, zod AbsenceInputSchema", evidence: "src/domain/schemas.ts", table: "absence", consumer: "Matchmaker, school admin coverage board" },
  { source: "absence + substitute + credential", transform: "checkEligibility (R1-R8), rankCandidates", evidence: "src/domain/rules.ts, src/domain/matching.ts", table: "compliance_check, offer", consumer: "Dispatcher waves, substitute inbox" },
  { source: "offer accepted", transform: "respondOffer command, state machine", evidence: "src/data/commands.ts, src/domain/absenceMachine.ts", table: "assignment", consumer: "Sub brief, check-in, timesheet" },
  { source: "lesson_plan + teacher + approved supports", transform: "Prep Coach agent + Guardian redaction", evidence: "src/ai", table: "sub_brief", consumer: "Substitute day view" },
  { source: "day_report", transform: "Lesson Continuity agent", evidence: "src/ai", table: "handoff", consumer: "Teacher return view, continuity KPI" },
  { source: "assignment check-out", transform: "computePay, detectAnomalies", evidence: "src/domain/pay.ts", table: "timesheet", consumer: "School admin approval, pay run" },
  { source: "approved timesheets", transform: "createPayRun, timesheetsToCsv", evidence: "src/data/commands.ts, src/domain/pay.ts", table: "pay_run", consumer: "Payroll CSV export (HRIS adapter planned)" },
  { source: "Credential upload", transform: "Credential Verifier (vision) + human review", evidence: "src/data/commands.ts (uploadCredential, reviewCredential)", table: "credential", consumer: "Eligibility rules, expiry alerts" },
  { source: "Public policy docs / rule pack", transform: "Chunking + BM25 (pgvector when Supabase)", evidence: "src/domain/rulePack.ts", table: "kb_chunk", consumer: "Knowledge answers with citations" },
  { source: "Every command", transform: "appendEvent (sha256 chain)", evidence: "src/domain/audit.ts", table: "audit_event", consumer: "Audit explorer, global audit" },
  { source: "Every agent call", transform: "recordAgentRun", evidence: "src/data/commands.ts", table: "agent_run", consumer: "Agent console, spend cap, audit" },
];
