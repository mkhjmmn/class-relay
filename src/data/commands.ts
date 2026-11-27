/**
 * Domain commands: pure-ish reducers over a DemoState draft. Every driver (sandbox, supabase)
 * runs the same commands so business behaviour is identical in both data modes.
 * Each command validates input with zod, enforces the state machine and rules engine,
 * writes an audit event and emits a domain event for the automation engine.
 */
import {
  AbsenceInputSchema,
  appendEvent,
  candidatesForWave,
  checkEligibility,
  computePay,
  detectAnomalies,
  canTransition,
  addMinutes,
  daysBetween,
  expiryFindings,
  minutesBetween,
  rankCandidates,
  schoolDays,
  toMinutes,
  CREDENTIAL_LABELS,
  DISPATCH,
  PAY_RULES,
  type Absence,
  type AbsenceInput,
  type AbsenceStatus,
  type AgentRun,
  type Assignment,
  type Credential,
  type CredentialType,
  type DayReport,
  type Language,
  type LessonPlan,
  type Memory,
  type Notification,
  type PipelineStage,
  type Role,
  type Substitute,
  type Teacher,
  type Tier,
} from "@/domain";
import { buildSampleBrief, buildSampleHandoff } from "./derive";
import type { DemoState } from "./state";

export interface Actor {
  userId: string;
  role: Role | "system";
  name: string;
}
export const SYSTEM: Actor = { userId: "system", role: "system", name: "ClassRelay automation" };

export type Result<T = undefined> = { ok: true; value: T; message?: string } | { ok: false; error: string; details?: string[] };
const ok = <T,>(value: T, message?: string): Result<T> => ({ ok: true, value, message });
const fail = (error: string, details?: string[]): Result<never> => ({ ok: false, error, details });

export class ForbiddenError extends Error {}
/** Server-side style role gate, also applied by API routes. */
export function requireRole(actor: Actor, roles: (Role | "system")[]) {
  if (!roles.includes(actor.role)) throw new ForbiddenError(`Role ${actor.role} may not perform this action`);
}

// ---------- helpers ----------
export function nextId(s: DemoState, prefix: string): string {
  s.counters[prefix] = (s.counters[prefix] ?? 0) + 1;
  return `${prefix}-${String(s.counters[prefix]).padStart(4, "0")}`;
}
export function audit(s: DemoState, actor: Actor, action: string, entity: string, payload: Record<string, unknown> = {}) {
  s.audit.push(appendEvent(s.audit, { district_id: s.district.id, at: s.now, actor: `${actor.name} (${actor.role})`, action, entity, payload }));
}
export function emit(s: DemoState, type: string, entityId: string, summary: string, ruleId?: string) {
  s.events.push({ id: nextId(s, "evt"), type, at: s.now, entityId, summary, ruleId });
}
export function notify(s: DemoState, n: Omit<Notification, "id" | "district_id" | "at" | "read">) {
  s.notifications.push({ ...n, id: nextId(s, "ntf"), district_id: s.district.id, at: s.now, read: false });
}
function ruleOn(s: DemoState, id: string) {
  return s.automations.find((a) => a.id === id)?.enabled ?? false;
}
function logRun(s: DemoState, ruleId: string, eventType: string, steps: string[]) {
  const ev = s.events[s.events.length - 1];
  s.automationRuns.push({ id: nextId(s, "arun"), ruleId, eventId: ev?.id ?? eventType, at: s.now, dryRun: false, steps, status: "ok" });
}
function setStatus(s: DemoState, a: Absence, to: AbsenceStatus) {
  if (a.status === to) return;
  if (!canTransition(a.status, to)) throw new Error(`Illegal absence transition ${a.status} -> ${to}`);
  a.status = to;
}
export function credsOf(s: DemoState, subId: string) {
  return s.credentials.filter((c) => c.substitute_id === subId);
}
export function assignmentsOf(s: DemoState, subId: string) {
  return s.assignments.filter((a) => a.substitute_id === subId && a.status !== "cancelled" && a.status !== "no_show");
}
export function userForSub(s: DemoState, subId: string) {
  return s.users.find((u) => u.substitute_id === subId);
}
function subLang(s: DemoState, subId: string): Language {
  return userForSub(s, subId)?.language ?? "en";
}
export function today(s: DemoState) {
  return s.now.slice(0, 10);
}
function recordAgent(s: DemoState, run: Omit<AgentRun, "id" | "district_id" | "createdAt">) {
  const r: AgentRun = { ...run, id: nextId(s, "run"), district_id: s.district.id, createdAt: s.now };
  s.agentRuns.push(r);
  return r;
}

export function matchContext(s: DemoState, absence: Absence, date: string) {
  const school = s.schools.find((x) => x.id === absence.school_id)!;
  const teacher = s.teachers.find((t) => t.id === absence.teacher_id)!;
  const credentialsBySub: Record<string, Credential[]> = {};
  for (const c of s.credentials) (credentialsBySub[c.substitute_id] ??= []).push(c);
  const assignmentsBySub: Record<string, Assignment[]> = {};
  for (const a of s.assignments) if (a.status !== "cancelled" && a.status !== "no_show") (assignmentsBySub[a.substitute_id] ??= []).push(a);
  const historyAtSchool: Record<string, number> = {};
  for (const a of s.assignments) if (a.school_id === school.id && a.status === "completed") historyAtSchool[a.substitute_id] = (historyAtSchool[a.substitute_id] ?? 0) + 1;
  const sums: Record<string, [number, number]> = {};
  for (const r of s.ratings) if (r.toSubstituteId) {
    const asg = s.assignments.find((a) => a.id === r.assignment_id);
    if (asg?.school_id === school.id) {
      const v = (sums[r.toSubstituteId] ??= [0, 0]);
      v[0] += r.score;
      v[1] += 1;
    }
  }
  const schoolRating = Object.fromEntries(Object.entries(sums).map(([k, [t, n]]) => [k, t / n]));
  return {
    absence,
    school,
    teacher,
    date,
    substitutes: s.substitutes,
    credentialsBySub,
    assignmentsBySub,
    historyAtSchool,
    schoolRating,
    t4AnnualDayLimit: s.district.t4AnnualDayLimit,
  };
}

// ---------- absences ----------
export function reportAbsence(s: DemoState, actor: Actor, raw: AbsenceInput): Result<Absence> {
  requireRole(actor, ["teacher", "school_admin", "district_admin", "system"]);
  const parsed = AbsenceInputSchema.safeParse(raw);
  if (!parsed.success) return fail("Please check the absence details.", parsed.error.issues.map((i) => i.message));
  const input = parsed.data;
  const teacher = s.teachers.find((t) => t.id === input.teacher_id);
  if (!teacher) return fail("Unknown teacher.");
  if (actor.role === "teacher" && s.users.find((u) => u.id === actor.userId)?.teacher_id !== teacher.id) return fail("Teachers can only report their own absences.");
  const days = schoolDays(input.startDate, input.endDate);
  if (!days.length) return fail("The selected dates contain no school days.");
  const dup = s.absences.find(
    (a) => a.teacher_id === teacher.id && a.status !== "cancelled" && a.startDate <= input.endDate && a.endDate >= input.startDate,
  );
  if (dup) return fail(`Duplicate: an absence already covers these dates (${dup.id}, ${dup.startDate} to ${dup.endDate}).`);
  const lead = daysBetween(today(s), input.startDate);
  const absence: Absence = {
    id: nextId(s, "abs"),
    district_id: s.district.id,
    school_id: teacher.school_id,
    teacher_id: teacher.id,
    startDate: input.startDate,
    endDate: input.endDate,
    dayPart: input.dayPart,
    periods: input.periods,
    reason: input.reason,
    noticeType: lead >= 2 ? "planned" : lead >= 1 ? "short_notice" : "same_day",
    status: "reported",
    notes: input.notes,
    planId: input.planId,
    reportedVia: input.reportedVia,
    createdAt: s.now,
    currentWave: 0,
    sped: teacher.subject === "Special Education",
  };
  s.absences.push(absence);
  audit(s, actor, "absence.reported", absence.id, { teacher: teacher.name, startDate: absence.startDate, endDate: absence.endDate, via: absence.reportedVia });
  emit(s, "absence.reported", absence.id, `${teacher.name} reported ${days.length} day(s) from ${absence.startDate}`, "W1");
  if (ruleOn(s, "W1")) {
    const steps = ["Validated input with AbsenceInputSchema"];
    if (!s.district.approvalRequired || actor.role !== "teacher") {
      setStatus(s, absence, "approved");
      steps.push("Auto-approved (no approval required by district policy)");
      startMatching(s, absence.id);
      steps.push(`Matching started, wave ${absence.currentWave}`);
    } else steps.push("Waiting for school-admin approval");
    logRun(s, "W1", "absence.reported", steps);
  }
  return ok(absence, `Absence ${absence.id} reported. Matching has started.`);
}

export function approveAbsence(s: DemoState, actor: Actor, absenceId: string): Result {
  requireRole(actor, ["school_admin", "district_admin"]);
  const a = s.absences.find((x) => x.id === absenceId);
  if (!a) return fail("Absence not found.");
  if (a.status !== "reported") return fail("Absence is not waiting for approval.");
  setStatus(s, a, "approved");
  audit(s, actor, "absence.approved", a.id);
  startMatching(s, a.id);
  return ok(undefined, "Approved. Matching started.");
}

export function startMatching(s: DemoState, absenceId: string) {
  const a = s.absences.find((x) => x.id === absenceId)!;
  if (a.status === "approved") setStatus(s, a, "matching");
  a.currentWave = 0;
  sendNextWave(s, absenceId);
}

/** Sends the next offer wave (W2). Returns number of offers sent. */
export function sendNextWave(s: DemoState, absenceId: string, excludeSubIds: string[] = []): number {
  const a = s.absences.find((x) => x.id === absenceId)!;
  if (!["matching", "offered"].includes(a.status)) return 0;
  const ctx = matchContext(s, a, a.startDate);
  const { ranked, blocked } = rankCandidates(ctx);
  const already = new Set(s.offers.filter((o) => o.absence_id === a.id).map((o) => o.substitute_id));
  const fresh = ranked.filter((c) => !already.has(c.substitute.id) && !excludeSubIds.includes(c.substitute.id));
  const sameDay = a.noticeType === "same_day";
  let sent = 0;
  // Earlier waves stay open: a new wave widens the pool; the first acceptance wins and supersedes the rest.
  while (a.currentWave < 3 && sent === 0) {
    a.currentWave = sameDay && a.currentWave === 0 ? 2 : a.currentWave + 1;
    const batch = candidatesForWave(fresh, a.currentWave, sameDay && a.currentWave === 2);
    for (const c of batch) {
      s.offers.push({
        id: nextId(s, "ofr"),
        district_id: s.district.id,
        absence_id: a.id,
        substitute_id: c.substitute.id,
        wave: a.currentWave,
        status: "pending",
        score: c.score,
        reasons: c.reasons,
        pay: c.pay,
        distance: c.distance,
        sentAt: s.now,
      });
      const u = userForSub(s, c.substitute.id);
      notify(s, {
        channel: "sms",
        to: c.substitute.phone,
        toUserId: u?.id,
        subject: "New job offer",
        body: `ClassRelay: ${ctx.school.short}, ${ctx.teacher.subject} ${ctx.teacher.gradeBand}, ${a.startDate}${a.endDate !== a.startDate ? ` to ${a.endDate}` : ""}. $${c.pay}. Reply in app.`,
        language: subLang(s, c.substitute.id),
      });
      sent++;
    }
  }
  if (sent > 0 && a.status === "matching") setStatus(s, a, "offered");
  recordAgent(s, {
    agent: "matchmaker",
    inputSummary: `Absence ${a.id} (${ctx.teacher.subject} ${ctx.teacher.gradeBand}, ${ctx.school.short}, ${a.startDate})`,
    sources: [{ chunkId: "kb-dispatch-1", source: "docs/knowledge-base.md#scheduling-and-dispatch", quote: "Offer waves: wave 1 the teacher's preferred substitutes" }],
    toolCalls: [
      { tool: "constraint_checker.check_eligibility", input: `${ctx.substitutes.length} substitutes`, output: `${ranked.length} eligible, ${blocked.length} blocked` },
      { tool: "scorer.rank", input: "7 weighted features", output: ranked.slice(0, 3).map((c) => `${c.substitute.name} ${c.score}`).join("; ") },
      { tool: "dispatcher.send_wave", input: `wave ${a.currentWave}`, output: `${sent} offers` },
    ],
    output: sent ? `Wave ${a.currentWave}: ${sent} offers sent` : "No eligible substitutes left: escalated",
    confidence: ranked.length ? 0.9 : 0.4,
    latencyMs: 12 + Math.round(ctx.substitutes.length / 10),
    costUsd: 0,
    model: "rules-engine (deterministic)",
    mode: "sample",
    status: sent ? "ok" : "needs_review",
    guardianNotes: ["Protected attributes not present in feature set", "Exclusion lists enforced (R6)"],
  });
  if (sent === 0) escalate(s, a, "No eligible substitutes remain in any wave.");
  return sent;
}

function escalate(s: DemoState, a: Absence, why: string) {
  const school = s.schools.find((x) => x.id === a.school_id)!;
  const admin = s.users.find((u) => u.role === "school_admin" && u.school_id === school.id);
  if (s.events.some((e) => e.type === "absence.escalated" && e.entityId === a.id)) return;
  emit(s, "absence.escalated", a.id, `${why} Internal coverage plan proposed for ${school.short}.`, "W2");
  notify(s, {
    channel: "email",
    to: admin?.email ?? "office@riverbend.example",
    toUserId: admin?.id,
    subject: `At risk: ${a.id} unfilled`,
    body: `${why} Proposed internal coverage: split periods across teachers with a planning period, or assign the building substitute.`,
    language: "en",
  });
}

export function cancelAbsence(s: DemoState, actor: Actor, absenceId: string, reason: string): Result {
  requireRole(actor, ["teacher", "school_admin", "district_admin"]);
  const a = s.absences.find((x) => x.id === absenceId);
  if (!a) return fail("Absence not found.");
  if (!reason.trim()) return fail("A reason is required.");
  if (["completed", "paid", "cancelled", "in_progress"].includes(a.status)) return fail(`Cannot cancel an absence that is ${a.status}.`);
  const school = s.schools.find((x) => x.id === a.school_id)!;
  for (const o of s.offers) if (o.absence_id === a.id && o.status === "pending") o.status = "superseded";
  for (const asg of s.assignments.filter((x) => x.absence_id === a.id && x.status === "accepted")) {
    asg.status = "cancelled";
    asg.cancelReason = `Teacher/school cancelled: ${reason}`;
    const start = `${asg.date}T${school.bellStart}:00.000Z`;
    const late = minutesBetween(s.now, start) < PAY_RULES.lateCancelHours * 60;
    if (late) {
      const sub = s.substitutes.find((x) => x.id === asg.substitute_id)!;
      const pay = computePay({ tier: sub.tier, dayPart: asg.dayPart, dayNumber: asg.dayNumber, hardToFill: school.hardToFill, lateCancelBySchool: true });
      createTimesheet(s, asg, pay);
    }
    notify(s, { channel: "sms", to: s.substitutes.find((x) => x.id === asg.substitute_id)!.phone, toUserId: userForSub(s, asg.substitute_id)?.id, subject: "Assignment cancelled", body: `Your assignment on ${asg.date} at ${school.short} was cancelled: ${reason}${late ? " (late cancellation: half-day pay applies)" : ""}`, language: subLang(s, asg.substitute_id) });
  }
  a.status = "cancelled";
  a.cancelReason = reason;
  audit(s, actor, "absence.cancelled", a.id, { reason });
  emit(s, "absence.cancelled", a.id, `Cancelled: ${reason}`);
  return ok(undefined, "Absence cancelled; substitutes notified.");
}

export function extendAbsence(s: DemoState, actor: Actor, absenceId: string, newEnd: string): Result {
  requireRole(actor, ["teacher", "school_admin", "district_admin"]);
  const a = s.absences.find((x) => x.id === absenceId);
  if (!a) return fail("Absence not found.");
  if (newEnd <= a.endDate) return fail("New end date must be after the current end date.");
  const oldEnd = a.endDate;
  a.endDate = newEnd;
  const current = s.assignments.filter((x) => x.absence_id === a.id && x.status !== "cancelled" && x.status !== "no_show");
  const notes: string[] = [];
  if (current.length) {
    const subId = current[0].substitute_id;
    let n = current.length;
    for (const d of schoolDays(oldEnd, newEnd).filter((d) => d > oldEnd)) {
      const ctx = matchContext(s, a, d);
      const sub = s.substitutes.find((x) => x.id === subId)!;
      const el = checkEligibility({ substitute: sub, credentials: credsOf(s, subId), absence: a, school: ctx.school, teacher: ctx.teacher, date: d, assignments: assignmentsOf(s, subId), t4AnnualDayLimit: s.district.t4AnnualDayLimit });
      if (!el.eligible) {
        notes.push(`${d}: ${el.violations.map((v) => `${v.ruleId} ${v.message}`).join("; ")}`);
        continue;
      }
      n++;
      s.assignments.push({ ...current[0], id: nextId(s, "asg"), date: d, dayNumber: n, status: "accepted", checkInAt: undefined, checkOutAt: undefined, complianceCheckId: saveCheck(s, sub.id, a.id, d, el) });
    }
  }
  audit(s, actor, "absence.extended", a.id, { from: oldEnd, to: newEnd });
  emit(s, "absence.extended", a.id, `Extended to ${newEnd}`);
  return ok(undefined, notes.length ? `Extended. Some days need a new substitute: ${notes.join(" | ")}` : "Extended; the same substitute continues (multi-day continuity).");
}

function saveCheck(s: DemoState, subId: string, absenceId: string, date: string, el: ReturnType<typeof checkEligibility>): string {
  const id = nextId(s, "chk");
  s.complianceChecks.push({ id, district_id: s.district.id, substitute_id: subId, absence_id: absenceId, date, passed: el.eligible, violations: el.violations, warnings: el.warnings, checkedAt: s.now });
  return id;
}

// ---------- offers / assignments ----------
export function respondOffer(s: DemoState, actor: Actor, offerId: string, accept: boolean): Result<{ assignmentIds: string[] }> {
  requireRole(actor, ["substitute", "system"]);
  const o = s.offers.find((x) => x.id === offerId);
  if (!o) return fail("Offer not found.");
  if (actor.role === "substitute" && userForSub(s, o.substitute_id)?.id !== actor.userId) return fail("This offer belongs to another substitute.");
  const a = s.absences.find((x) => x.id === o.absence_id)!;
  if (o.status !== "pending") return fail(o.status === "superseded" ? "Another substitute accepted this job first." : `This offer is ${o.status}.`);
  o.respondedAt = s.now;
  if (!accept) {
    o.status = "declined";
    audit(s, actor, "offer.declined", o.id);
    emit(s, "offer.declined", o.id, "Offer declined");
    if (!s.offers.some((x) => x.absence_id === a.id && x.status === "pending")) sendNextWave(s, a.id);
    return ok({ assignmentIds: [] }, "Offer declined.");
  }
  // first accepted offer wins
  if (a.status === "filled" || a.status === "in_progress") {
    o.status = "superseded";
    return fail("Another substitute accepted this job first.");
  }
  const sub = s.substitutes.find((x) => x.id === o.substitute_id)!;
  const days = schoolDays(a.startDate, a.endDate).filter((d) => d >= today(s));
  const created: string[] = [];
  const blocked: string[] = [];
  let dayNumber = s.assignments.filter((x) => x.absence_id === a.id && x.status === "completed").length;
  for (const d of days) {
    const ctx = matchContext(s, a, d);
    const el = checkEligibility({ substitute: sub, credentials: credsOf(s, sub.id), absence: a, school: ctx.school, teacher: ctx.teacher, date: d, assignments: assignmentsOf(s, sub.id), t4AnnualDayLimit: s.district.t4AnnualDayLimit });
    const checkId = saveCheck(s, sub.id, a.id, d, el);
    if (!el.eligible) {
      blocked.push(`${d}: ${el.violations.map((v) => `${v.ruleId} ${v.message}`).join("; ")}`);
      continue;
    }
    dayNumber++;
    const asg: Assignment = { id: nextId(s, "asg"), district_id: s.district.id, absence_id: a.id, substitute_id: sub.id, school_id: a.school_id, date: d, dayPart: a.dayPart, status: "accepted", dayNumber, complianceCheckId: checkId, acceptedAt: s.now };
    s.assignments.push(asg);
    created.push(asg.id);
  }
  if (!created.length) {
    o.status = "declined";
    audit(s, actor, "offer.blocked", o.id, { violations: blocked });
    return fail("You are not eligible for this job right now.", blocked);
  }
  o.status = "accepted";
  for (const x of s.offers) if (x.absence_id === a.id && x.status === "pending") x.status = "superseded";
  setStatus(s, a, "filled");
  a.filledAt = s.now;
  sub.offersLast30 += 1;
  audit(s, actor, "offer.accepted", o.id, { substitute: sub.name, assignments: created });
  emit(s, "assignment.accepted", created[0], `${sub.name} accepted ${a.id} (${created.length} day(s))`, "W3");
  if (ruleOn(s, "W3")) {
    for (const id of created) generateBrief(s, id);
    const teacherUser = s.users.find((u) => u.teacher_id === a.teacher_id);
    notify(s, { channel: "email", to: teacherUser?.email ?? "", toUserId: teacherUser?.id, subject: "Your absence is covered", body: `${sub.name} will cover your classes on ${a.startDate}${a.endDate !== a.startDate ? ` to ${a.endDate}` : ""}.`, language: teacherUser?.language ?? "en" });
    notify(s, { channel: "whatsapp", to: sub.phone, toUserId: userForSub(s, sub.id)?.id, subject: "Sub Brief ready", body: `Your Sub Brief for ${a.startDate} is ready in ClassRelay.`, language: subLang(s, sub.id) });
    logRun(s, "W3", "assignment.accepted", ["Sub Brief generated (Lesson Continuity agent)", "Teacher, school and substitute notified", "Calendar entries created"]);
  }
  if (blocked.length) return ok({ assignmentIds: created }, `Accepted ${created.length} day(s). Some days were blocked: ${blocked.join(" | ")}`);
  return ok({ assignmentIds: created }, "Accepted! Your Sub Brief is ready.");
}

export function generateBrief(s: DemoState, assignmentId: string, language?: Language) {
  const asg = s.assignments.find((a) => a.id === assignmentId)!;
  const lang = language ?? subLang(s, asg.substitute_id);
  const existing = s.subBriefs.findIndex((b) => b.assignment_id === asg.id);
  const brief = buildSampleBrief(s, asg, lang, existing >= 0 ? s.subBriefs[existing].id : nextId(s, "brf"));
  const run = recordAgent(s, {
    agent: "lesson_continuity",
    inputSummary: `Sub Brief for ${asg.id} (${asg.date}, ${lang})`,
    sources: brief.meta.sources,
    toolCalls: [
      { tool: "plan_parser.get_plan", input: asg.absence_id, output: brief.meta.reasons[0] },
      { tool: "brief_writer.compose", input: "plan + routines + handbook", output: `${brief.periods.length} periods` },
      { tool: "guardian.filter_supports", input: "student supports", output: `${brief.supports.length} approved need-to-know notes` },
    ],
    output: brief.dayAtAGlance,
    confidence: brief.meta.confidence,
    latencyMs: 4,
    costUsd: 0,
    model: "sample-fixture",
    mode: "sample",
    status: brief.meta.confidence >= 0.7 ? "ok" : "needs_review",
    guardianNotes: ["Student data limited to admin-approved need-to-know notes", "No diagnoses or grades included"],
  });
  brief.meta.agentRunId = run.id;
  if (existing >= 0) s.subBriefs[existing] = brief;
  else s.subBriefs.push(brief);
  return brief;
}

export function checkIn(s: DemoState, actor: Actor, assignmentId: string): Result {
  requireRole(actor, ["substitute", "school_admin"]);
  const asg = s.assignments.find((a) => a.id === assignmentId);
  if (!asg) return fail("Assignment not found.");
  if (asg.status !== "accepted") return fail(`Cannot check in: assignment is ${asg.status}.`);
  if (asg.date !== today(s)) return fail(`Check-in opens on ${asg.date}.`);
  asg.status = "in_progress";
  asg.checkInAt = s.now;
  const a = s.absences.find((x) => x.id === asg.absence_id)!;
  if (a.status === "filled") setStatus(s, a, "in_progress");
  audit(s, actor, "assignment.checked_in", asg.id);
  emit(s, "assignment.checked_in", asg.id, "Checked in");
  return ok(undefined, "Checked in. Have a great day!");
}

export function markNoShow(s: DemoState, actor: Actor, assignmentId: string): Result {
  requireRole(actor, ["school_admin", "district_admin", "system"]);
  const asg = s.assignments.find((a) => a.id === assignmentId);
  if (!asg) return fail("Assignment not found.");
  if (asg.status !== "accepted") return fail(`Assignment is ${asg.status}; no-show applies only before check-in.`);
  asg.status = "no_show";
  const sub = s.substitutes.find((x) => x.id === asg.substitute_id)!;
  sub.reliability = Math.max(0, Math.round((sub.reliability - 0.05) * 100) / 100);
  const a = s.absences.find((x) => x.id === asg.absence_id)!;
  a.status = "matching";
  audit(s, actor, "assignment.no_show", asg.id, { substitute: sub.name });
  emit(s, "assignment.no_show", asg.id, `${sub.name} did not check in; re-dispatching`, "W4");
  a.currentWave = 1; // re-dispatch from wave 2 (proven at this school)
  const sent = sendNextWave(s, a.id, [sub.id]);
  logRun(s, "W4", "assignment.no_show", ["Contacted substitute (SMS outbox)", "Marked no-show, reliability history updated", `Re-dispatched: ${sent} offers`]);
  return ok(undefined, `No-show recorded. Re-dispatched to ${sent} substitutes.`);
}

export function cancelAssignmentBySub(s: DemoState, actor: Actor, assignmentId: string, reason: string): Result {
  requireRole(actor, ["substitute"]);
  const asg = s.assignments.find((a) => a.id === assignmentId);
  if (!asg) return fail("Assignment not found.");
  if (userForSub(s, asg.substitute_id)?.id !== actor.userId) return fail("Not your assignment.");
  if (asg.status !== "accepted") return fail(`Cannot cancel: assignment is ${asg.status}.`);
  if (!reason.trim()) return fail("Please give a reason.");
  const school = s.schools.find((x) => x.id === asg.school_id)!;
  const late = minutesBetween(s.now, `${asg.date}T${school.bellStart}:00.000Z`) < DISPATCH.freeCancelHours * 60;
  asg.status = "cancelled";
  asg.cancelReason = reason;
  const sub = s.substitutes.find((x) => x.id === asg.substitute_id)!;
  if (late) sub.reliability = Math.max(0, Math.round((sub.reliability - 0.02) * 100) / 100);
  const a = s.absences.find((x) => x.id === asg.absence_id)!;
  const remaining = s.assignments.some((x) => x.absence_id === a.id && x.status === "accepted");
  if (!remaining && (a.status === "filled" || a.status === "in_progress")) {
    a.status = "matching";
    a.currentWave = 0;
    sendNextWave(s, a.id, [sub.id]);
  }
  audit(s, actor, "assignment.cancelled_by_substitute", asg.id, { reason, late });
  emit(s, "assignment.cancelled", asg.id, `${sub.name} cancelled${late ? " (late)" : ""}: ${reason}`);
  return ok(undefined, late ? "Cancelled. This is inside 12 hours, so it is recorded in your reliability history." : "Cancelled without penalty.");
}

function createTimesheet(s: DemoState, asg: Assignment, pay: ReturnType<typeof computePay>) {
  const school = s.schools.find((x) => x.id === asg.school_id)!;
  const sub = s.substitutes.find((x) => x.id === asg.substitute_id)!;
  const ts = {
    id: nextId(s, "ts"),
    district_id: s.district.id,
    assignment_id: asg.id,
    substitute_id: asg.substitute_id,
    school_id: asg.school_id,
    date: asg.date,
    dayPart: asg.dayPart,
    hours: pay.hours,
    rate: pay.rate,
    lines: pay.lines,
    amount: pay.amount,
    status: "submitted" as const,
    anomalies: [],
    budgetCode: school.budgetCode,
    createdAt: s.now,
  };
  s.timesheets.push(ts);
  const t = s.timesheets[s.timesheets.length - 1];
  t.anomalies = detectAnomalies(t, s.timesheets, sub.tier as Tier, assignmentsOf(s, sub.id));
  return t;
}

export function submitDayReport(s: DemoState, actor: Actor, assignmentId: string, report: Omit<DayReport, "id" | "district_id" | "assignment_id" | "submittedAt">): Result<{ timesheetId: string; handoffId: string }> {
  requireRole(actor, ["substitute"]);
  const asg = s.assignments.find((a) => a.id === assignmentId);
  if (!asg) return fail("Assignment not found.");
  if (userForSub(s, asg.substitute_id)?.id !== actor.userId) return fail("Not your assignment.");
  if (asg.status !== "in_progress") return fail("Check in first; the end-of-day report closes the day.");
  const dr: DayReport = { ...report, id: nextId(s, "dr"), district_id: s.district.id, assignment_id: asg.id, submittedAt: s.now };
  s.dayReports.push(dr);
  asg.status = "completed";
  asg.checkOutAt = s.now;
  const sub = s.substitutes.find((x) => x.id === asg.substitute_id)!;
  sub.daysThisYear += 1;
  const school = s.schools.find((x) => x.id === asg.school_id)!;
  const pay = computePay({ tier: sub.tier, dayPart: asg.dayPart, dayNumber: asg.dayNumber, hardToFill: school.hardToFill });
  const ts = createTimesheet(s, asg, pay);
  const h = buildSampleHandoff(s, asg, dr, nextId(s, "hnd"));
  const run = recordAgent(s, {
    agent: "lesson_continuity",
    inputSummary: `Return Handoff for ${asg.id}`,
    sources: h.meta.sources,
    toolCalls: [{ tool: "handoff_writer.compose", input: dr.id, output: `${h.taught.length} taught, ${h.gaps.length} gaps` }],
    output: `Continuity ${Math.round(h.continuityScore * 100)}%`,
    confidence: h.meta.confidence,
    latencyMs: 3,
    costUsd: 0,
    model: "sample-fixture",
    mode: "sample",
    status: "ok",
    guardianNotes: ["Behavior notes kept factual; no student names stored in long-term memory"],
  });
  h.meta.agentRunId = run.id;
  s.handoffs.push(h);
  const a = s.absences.find((x) => x.id === asg.absence_id)!;
  const open = s.assignments.some((x) => x.absence_id === a.id && (x.status === "accepted" || x.status === "in_progress"));
  if (!open && a.status === "in_progress") setStatus(s, a, "completed");
  else if (a.status === "in_progress") a.status = "filled";
  audit(s, actor, "assignment.completed", asg.id, { timesheet: ts.id, amount: ts.amount });
  emit(s, "assignment.completed", asg.id, `Day report submitted; timesheet ${ts.id} ($${ts.amount}) created`, "W5");
  logRun(s, "W5", "assignment.completed", ["Day report stored", `Timesheet ${ts.id} created`, `Return Handoff ${h.id} sent to teacher`]);
  const teacherUser = s.users.find((u) => u.teacher_id === a.teacher_id);
  notify(s, { channel: "in_app", to: teacherUser?.name ?? "", toUserId: teacherUser?.id, subject: "Return Handoff ready", body: `${sub.name} covered your class on ${asg.date}. Continuity ${Math.round(h.continuityScore * 100)}%.`, language: teacherUser?.language ?? "en" });
  return ok({ timesheetId: ts.id, handoffId: h.id }, `Day complete. Timesheet for $${ts.amount.toFixed(2)} submitted for approval.`);
}

// ---------- timesheets & payroll ----------
export function approveTimesheet(s: DemoState, actor: Actor, id: string, approve = true, note = ""): Result {
  requireRole(actor, ["school_admin", "district_admin"]);
  const t = s.timesheets.find((x) => x.id === id);
  if (!t) return fail("Timesheet not found.");
  if (actor.role === "school_admin" && s.users.find((u) => u.id === actor.userId)?.school_id !== t.school_id) return fail("You can approve timesheets for your school only.");
  if (t.status !== "submitted") return fail(`Timesheet is ${t.status}.`);
  t.status = approve ? "approved" : "rejected";
  t.approvedBy = actor.name;
  audit(s, actor, approve ? "timesheet.approved" : "timesheet.rejected", t.id, { amount: t.amount, note });
  return ok(undefined, approve ? "Timesheet approved." : "Timesheet returned.");
}

export function rateSubstitute(s: DemoState, actor: Actor, assignmentId: string, score: number, comment: string): Result {
  requireRole(actor, ["school_admin", "teacher", "substitute"]);
  const asg = s.assignments.find((a) => a.id === assignmentId);
  if (!asg) return fail("Assignment not found.");
  if (score < 1 || score > 5) return fail("Score must be 1-5.");
  if (s.ratings.some((r) => r.assignment_id === asg.id && r.from === actor.userId)) return fail("You already rated this assignment.");
  const toSub = actor.role !== "substitute";
  s.ratings.push({ id: nextId(s, "rat"), district_id: s.district.id, assignment_id: asg.id, from: actor.userId, toSubstituteId: toSub ? asg.substitute_id : undefined, toSchoolId: toSub ? undefined : asg.school_id, score, comment: comment.slice(0, 500), at: s.now });
  if (toSub) {
    const sub = s.substitutes.find((x) => x.id === asg.substitute_id)!;
    const rs = s.ratings.filter((r) => r.toSubstituteId === sub.id);
    sub.rating = Math.round((rs.reduce((a, r) => a + r.score, 0) / rs.length) * 10) / 10;
  }
  audit(s, actor, "rating.created", asg.id, { score });
  return ok(undefined, "Thanks for the feedback.");
}

export function createPayRun(s: DemoState, actor: Actor, periodStart: string, periodEnd: string): Result<string> {
  requireRole(actor, ["district_admin"]);
  const ts = s.timesheets.filter((t) => t.status === "approved" && !t.payRunId && t.date >= periodStart && t.date <= periodEnd);
  if (!ts.length) return fail("No approved timesheets in this period.");
  const id = nextId(s, "run-pay");
  for (const t of ts) {
    const sub = s.substitutes.find((x) => x.id === t.substitute_id)!;
    t.anomalies = detectAnomalies(t, s.timesheets, sub.tier, assignmentsOf(s, sub.id));
    t.payRunId = id;
  }
  const total = Math.round(ts.reduce((a, t) => a + t.amount, 0) * 100) / 100;
  s.payRuns.push({ id, district_id: s.district.id, periodStart, periodEnd, status: "draft", timesheetIds: ts.map((t) => t.id), total, createdAt: s.now });
  const flagged = ts.filter((t) => t.anomalies.length).length;
  recordAgent(s, { agent: "payroll", inputSummary: `Pay period ${periodStart} to ${periodEnd}`, sources: [{ chunkId: "kb-pay-1", source: "docs/knowledge-base.md#pay-rules", quote: "Daily rates: T1 $140, T2 $160, T3 $190, T4 $200" }], toolCalls: [{ tool: "anomaly_scan", input: `${ts.length} timesheets`, output: `${flagged} flagged` }], output: `Draft pay run ${id}: $${total}`, confidence: 0.95, latencyMs: 2, costUsd: 0, model: "rules-engine (deterministic)", mode: "sample", status: "needs_review", guardianNotes: ["Financial action: human approval required before finalization"] });
  audit(s, actor, "payrun.drafted", id, { total, count: ts.length, flagged });
  emit(s, "payrun.drafted", id, `Draft pay run with ${ts.length} timesheets, ${flagged} flagged`, "W7");
  return ok(id, `Draft pay run created: ${ts.length} timesheets, ${flagged} flagged for review.`);
}

export function approvePayRun(s: DemoState, actor: Actor, id: string): Result {
  requireRole(actor, ["district_admin"]);
  const r = s.payRuns.find((x) => x.id === id);
  if (!r) return fail("Pay run not found.");
  if (r.status !== "draft") return fail(`Pay run is ${r.status}.`);
  r.status = "approved";
  r.approvedBy = actor.name;
  audit(s, actor, "payrun.approved", id, { total: r.total });
  return ok(undefined, "Pay run approved by a human. Ready to export.");
}

export function exportPayRun(s: DemoState, actor: Actor, id: string): Result {
  requireRole(actor, ["district_admin"]);
  const r = s.payRuns.find((x) => x.id === id);
  if (!r) return fail("Pay run not found.");
  if (r.status === "draft") return fail("Approve the pay run before export (human-in-the-loop).");
  r.status = "exported";
  for (const t of s.timesheets.filter((x) => x.payRunId === id)) {
    t.status = "exported";
    const asg = s.assignments.find((a) => a.id === t.assignment_id);
    const abs = asg && s.absences.find((a) => a.id === asg.absence_id);
    if (abs && abs.status === "completed" && s.assignments.filter((a) => a.absence_id === abs.id && a.status === "completed").every((a) => s.timesheets.find((x) => x.assignment_id === a.id)?.status === "exported")) abs.status = "paid";
  }
  audit(s, actor, "payrun.exported", id, { total: r.total });
  emit(s, "payrun.exported", id, `Pay run exported ($${r.total})`, "W7");
  return ok(undefined, "Exported. CSV downloaded.");
}

// ---------- credentials & onboarding ----------
export interface CredentialUpload {
  type: CredentialType;
  number: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  documentName: string;
  nameOnDocument: string;
  extractionConfidence: number;
}

/** F2: positive outcomes may auto-verify at high confidence; nothing is auto-rejected. */
export function uploadCredential(s: DemoState, actor: Actor, subId: string, up: CredentialUpload): Result<Credential> {
  requireRole(actor, ["substitute", "district_admin"]);
  const sub = s.substitutes.find((x) => x.id === subId);
  if (!sub) return fail("Substitute not found.");
  if (actor.role === "substitute" && userForSub(s, subId)?.id !== actor.userId) return fail("You can upload only your own credentials.");
  if (up.expiryDate && up.expiryDate <= up.issueDate) return fail("Expiry date must be after the issue date.");
  const nameMatch = up.nameOnDocument.trim().toLowerCase() === sub.name.toLowerCase();
  const expired = !!up.expiryDate && up.expiryDate < today(s);
  const conf = Math.min(up.extractionConfidence, nameMatch ? 1 : 0.6);
  const status: Credential["status"] = expired ? "expired" : conf >= 0.85 ? "verified" : "needs_review";
  const reviewNote = expired ? "Document is expired: routed to HR review queue." : !nameMatch ? `Name on document "${up.nameOnDocument}" does not match "${sub.name}".` : conf < 0.85 ? "Low extraction confidence." : undefined;
  // supersede older copy of same type
  for (const c of s.credentials) if (c.substitute_id === subId && c.type === up.type && c.status !== "verified") c.status = c.status === "pending" || c.status === "missing" ? "rejected" : c.status;
  const cred: Credential = { id: nextId(s, "cred"), district_id: s.district.id, substitute_id: subId, type: up.type, number: up.number, issuer: up.issuer, issueDate: up.issueDate, expiryDate: up.expiryDate, status, confidence: Math.round(conf * 100) / 100, documentName: up.documentName, verifiedBy: status === "verified" ? "Credential Verifier (AI, auto)" : undefined, verifiedAt: status === "verified" ? s.now : undefined, reviewNote };
  s.credentials.push(cred);
  recordAgent(s, {
    agent: "credential_verifier",
    inputSummary: `${CREDENTIAL_LABELS[up.type]} for ${sub.name} (${up.documentName})`,
    sources: [{ chunkId: "kb-rule-R1", source: "docs/knowledge-base.md#compliance-rules", quote: "R1 An assignment requires: active status, a permit or license valid on the assignment date" }],
    toolCalls: [
      { tool: "extractor.read_document", input: up.documentName, output: `type=${up.type} number=${up.number} issuer=${up.issuer} expiry=${up.expiryDate ?? "none"}` },
      { tool: "validator.name_match", input: up.nameOnDocument, output: nameMatch ? "match" : "mismatch" },
      { tool: "validator.rule_pack", input: "riverbend-permit-v1", output: status },
    ],
    output: `Status: ${status}${reviewNote ? ` (${reviewNote})` : ""}`,
    confidence: cred.confidence ?? 0,
    latencyMs: 6,
    costUsd: 0,
    model: "sample-fixture",
    mode: "sample",
    status: status === "verified" ? "ok" : "needs_review",
    guardianNotes: ["Negative outcome never auto-applied: routed to HR review queue"],
  });
  audit(s, actor, "credential.uploaded", cred.id, { type: up.type, status, confidence: cred.confidence });
  emit(s, "credential.uploaded", cred.id, `${sub.name}: ${CREDENTIAL_LABELS[up.type]} -> ${status}`);
  if (status !== "verified") s.alerts.push({ id: nextId(s, "alr"), district_id: s.district.id, substitute_id: subId, ruleId: "R1", severity: "warn", message: `${CREDENTIAL_LABELS[up.type]} needs HR review: ${reviewNote}`, status: "open", createdAt: s.now });
  refreshMatchingPause(s, subId, actor);
  return ok(cred, status === "verified" ? "Verified automatically (high confidence)." : "Sent to HR review. You will be notified.");
}

export function reviewCredential(s: DemoState, actor: Actor, credId: string, decision: "verified" | "rejected", note: string): Result {
  requireRole(actor, ["district_admin"]);
  const c = s.credentials.find((x) => x.id === credId);
  if (!c) return fail("Credential not found.");
  if (decision === "rejected" && !note.trim()) return fail("A reason is required to reject (R8).");
  if (decision === "verified" && c.expiryDate && c.expiryDate < today(s)) return fail("Cannot verify an expired document.");
  c.status = decision;
  c.verifiedBy = actor.name;
  c.verifiedAt = s.now;
  c.reviewNote = note || c.reviewNote;
  for (const al of s.alerts) if (al.substitute_id === c.substitute_id && al.status === "open" && al.message.includes(CREDENTIAL_LABELS[c.type])) {
    al.status = "resolved";
    al.resolvedBy = actor.name;
  }
  audit(s, actor, `credential.${decision}`, c.id, { note });
  emit(s, `credential.${decision}`, c.id, `${CREDENTIAL_LABELS[c.type]} ${decision} by ${actor.name}`, "W6");
  refreshMatchingPause(s, c.substitute_id, actor);
  return ok(undefined, decision === "verified" ? "Verified. Matching restored if all requirements are met." : "Rejected with reason; substitute notified.");
}

const REQUIRED: CredentialType[] = ["background_clearance", "health_clearance", "mandated_reporter", "district_orientation"];
export function missingRequirements(s: DemoState, subId: string): string[] {
  const creds = credsOf(s, subId);
  const d = today(s);
  const valid = (t: CredentialType) => creds.some((c) => c.type === t && c.status === "verified" && (!c.expiryDate || c.expiryDate >= d));
  const out: string[] = [];
  if (!valid("substitute_permit") && !valid("teaching_license")) out.push("Substitute permit or teaching license");
  for (const t of REQUIRED) if (!valid(t)) out.push(CREDENTIAL_LABELS[t]);
  return out;
}

/** W6: expired -> pause matching; re-verified -> restore. */
function refreshMatchingPause(s: DemoState, subId: string, actor: Actor) {
  const sub = s.substitutes.find((x) => x.id === subId)!;
  const expired = credsOf(s, subId).some((c) => c.status === "verified" && c.expiryDate && c.expiryDate < today(s));
  if (sub.stage === "active" && expired) {
    sub.stage = "paused";
    sub.pauseReason = "Expired credential (R7)";
    audit(s, actor, "substitute.matching_paused", sub.id, { reason: sub.pauseReason });
  } else if (sub.stage === "paused" && sub.pauseReason?.includes("R7") && missingRequirements(s, subId).length === 0) {
    sub.stage = "active";
    sub.pauseReason = undefined;
    audit(s, actor, "substitute.matching_restored", sub.id);
    emit(s, "substitute.restored", sub.id, `${sub.name} re-verified; matching restored`, "W6");
  }
}

export interface ApplicantInput {
  name: string;
  email: string;
  phone: string;
  tier: Tier;
  subjects: Substitute["subjects"];
  gradeBands: Substitute["gradeBands"];
  languages: Language[];
  maxDistance: number;
}
export function createApplicant(s: DemoState, actor: Actor, input: ApplicantInput): Result<{ substituteId: string; userId: string }> {
  if (!input.name.trim() || !input.email.includes("@")) return fail("Name and a valid email are required.");
  const n = s.substitutes.length + 1;
  const id = `sub-${String(n).padStart(3, "0")}`;
  s.substitutes.push({ id, district_id: s.district.id, name: input.name.trim(), email: input.email, phone: input.phone, tier: input.tier, stage: "applied", subjects: input.subjects, gradeBands: input.gradeBands, preferredSchoolIds: [], availableDays: [1, 2, 3, 4, 5], maxDistance: input.maxDistance, x: 6, y: 6, languages: input.languages, reliability: 0.9, rating: 0, daysThisYear: 0, offersLast30: 0, joinedAt: today(s) });
  const userId = `usr-${id}`;
  s.users.push({ id: userId, district_id: s.district.id, name: input.name.trim(), email: input.email, role: "substitute", substitute_id: id, language: input.languages[0] ?? "en" });
  s.consents.push({ id: nextId(s, "cns"), district_id: s.district.id, subjectId: id, purpose: "Background check and credential verification", basis: "Consent (applicant)", grantedAt: s.now });
  audit(s, actor, "substitute.applied", id, { name: input.name });
  emit(s, "substitute.applied", id, `${input.name} applied`);
  return ok({ substituteId: id, userId }, "Application received.");
}

export function advanceStage(s: DemoState, actor: Actor, subId: string, stage: PipelineStage): Result {
  requireRole(actor, ["district_admin", "substitute", "system"]);
  const sub = s.substitutes.find((x) => x.id === subId);
  if (!sub) return fail("Substitute not found.");
  if (stage === "active") {
    const missing = missingRequirements(s, subId);
    if (missing.length) return fail("Cannot activate yet. Missing:", missing);
  }
  if (stage === "paused" && actor.role === "substitute") return fail("Only HR can pause a substitute.");
  const from = sub.stage;
  sub.stage = stage;
  if (stage !== "paused") sub.pauseReason = undefined;
  audit(s, actor, "substitute.stage_changed", subId, { from, to: stage });
  emit(s, "substitute.stage_changed", subId, `${sub.name}: ${from} -> ${stage}`);
  return ok(undefined, `Moved to ${stage}.`);
}

export function completeOrientation(s: DemoState, actor: Actor, subId: string): Result {
  const sub = s.substitutes.find((x) => x.id === subId);
  if (!sub) return fail("Substitute not found.");
  const d = today(s);
  s.credentials.push({ id: nextId(s, "cred"), district_id: s.district.id, substitute_id: subId, type: "district_orientation", number: `ORI-${subId}`, issuer: "Riverbend USD", issueDate: d, status: "verified", confidence: 1, documentName: "Orientation module completion", verifiedBy: "Orientation system", verifiedAt: s.now });
  if (!credsOf(s, subId).some((c) => c.type === "mandated_reporter" && c.status === "verified"))
    s.credentials.push({ id: nextId(s, "cred"), district_id: s.district.id, substitute_id: subId, type: "mandated_reporter", number: `MR-${subId}`, issuer: "Riverbend USD", issueDate: d, expiryDate: `${Number(d.slice(0, 4)) + 1}${d.slice(4)}`, status: "verified", confidence: 1, documentName: "Mandated-reporter module", verifiedBy: "Orientation system", verifiedAt: s.now });
  audit(s, actor, "substitute.orientation_completed", subId);
  sub.stage = "orientation";
  const missing = missingRequirements(s, subId);
  if (!missing.length) {
    sub.stage = "active";
    emit(s, "substitute.activated", subId, `${sub.name} is active`);
    audit(s, actor, "substitute.activated", subId);
    return ok(undefined, "Orientation complete. You are active and can receive offers!");
  }
  return ok(undefined, `Orientation complete. Still needed: ${missing.join(", ")}`);
}

// ---------- preferences, plans, AI outputs ----------
export function updateTeacher(s: DemoState, actor: Actor, teacherId: string, patch: Partial<Pick<Teacher, "routines" | "behaviorPlan" | "seatingNotes" | "preferredSubIds" | "excludedSubIds">>): Result {
  requireRole(actor, ["teacher", "school_admin", "district_admin"]);
  const t = s.teachers.find((x) => x.id === teacherId);
  if (!t) return fail("Teacher not found.");
  const conflict = (patch.preferredSubIds ?? t.preferredSubIds).filter((id) => (patch.excludedSubIds ?? t.excludedSubIds).includes(id));
  if (conflict.length) return fail("A substitute cannot be both preferred and excluded.", conflict);
  Object.assign(t, patch);
  audit(s, actor, "teacher.preferences_updated", t.id, { fields: Object.keys(patch) });
  return ok(undefined, "Preferences saved. Matching and briefs will use them.");
}

export function updateSubstitute(s: DemoState, actor: Actor, subId: string, patch: Partial<Pick<Substitute, "subjects" | "gradeBands" | "preferredSchoolIds" | "availableDays" | "maxDistance" | "languages">>): Result {
  requireRole(actor, ["substitute", "district_admin"]);
  const sub = s.substitutes.find((x) => x.id === subId);
  if (!sub) return fail("Substitute not found.");
  Object.assign(sub, patch);
  if (patch.languages?.[0]) {
    const u = userForSub(s, subId);
    if (u) u.language = patch.languages[0];
  }
  audit(s, actor, "substitute.preferences_updated", subId, { fields: Object.keys(patch) });
  return ok(undefined, "Preferences saved.");
}

export function updateSchoolNotes(s: DemoState, actor: Actor, schoolId: string, patch: { arrivalNotes?: string; dutyNotes?: string; hardToFill?: boolean }): Result {
  requireRole(actor, ["school_admin", "district_admin"]);
  const sc = s.schools.find((x) => x.id === schoolId);
  if (!sc) return fail("School not found.");
  Object.assign(sc, patch);
  audit(s, actor, "school.updated", schoolId, patch);
  return ok(undefined, "School notes saved.");
}

export function saveLessonPlan(s: DemoState, actor: Actor, plan: Omit<LessonPlan, "id" | "district_id" | "updatedAt"> & { id?: string }): Result<LessonPlan> {
  requireRole(actor, ["teacher", "school_admin"]);
  if (!plan.title.trim() || !plan.periods.length) return fail("A title and at least one period are required.");
  const existing = plan.id ? s.lessonPlans.find((p) => p.id === plan.id) : undefined;
  const full: LessonPlan = { ...plan, id: existing?.id ?? nextId(s, "plan"), district_id: s.district.id, updatedAt: s.now };
  if (existing) Object.assign(existing, full);
  else s.lessonPlans.push(full);
  audit(s, actor, existing ? "lesson_plan.updated" : "lesson_plan.created", full.id, { title: full.title, emergency: full.emergency });
  return ok(full, "Plan saved.");
}

export function approveSupport(s: DemoState, actor: Actor, supportId: string, approve: boolean): Result {
  requireRole(actor, ["school_admin"]);
  const sp = s.supports.find((x) => x.id === supportId);
  if (!sp) return fail("Support note not found.");
  sp.approved = approve;
  sp.approvedBy = approve ? actor.name : undefined;
  audit(s, actor, approve ? "support.approved" : "support.revoked", sp.id);
  return ok(undefined, approve ? "Approved for need-to-know sharing." : "Removed from briefs.");
}

/** Need-to-know window: from 12 h before the bell until the assignment ends. Every view logged. */
export function viewSupports(s: DemoState, actor: Actor, assignmentId: string): Result<string[]> {
  const asg = s.assignments.find((a) => a.id === assignmentId);
  if (!asg) return fail("Assignment not found.");
  const school = s.schools.find((x) => x.id === asg.school_id)!;
  const start = `${asg.date}T${school.bellStart}:00.000Z`;
  const end = `${asg.date}T${school.bellEnd}:00.000Z`;
  const open = minutesBetween(s.now, start) <= 12 * 60 && s.now <= end && asg.status !== "completed" && asg.status !== "cancelled";
  if (!open) return fail("Student supports are visible from 12 hours before the assignment until it ends.");
  const brief = s.subBriefs.find((b) => b.assignment_id === asg.id);
  for (const sp of s.supports.filter((x) => x.approved && brief?.supports.includes(x.note))) s.supportViews.push({ id: nextId(s, "sv"), supportId: sp.id, assignmentId: asg.id, viewer: actor.name, at: s.now });
  audit(s, actor, "support.viewed", asg.id);
  return ok(brief?.supports ?? []);
}

export function saveSubBrief(s: DemoState, brief: DemoState["subBriefs"][number]) {
  const i = s.subBriefs.findIndex((b) => b.assignment_id === brief.assignment_id);
  if (i >= 0) s.subBriefs[i] = brief;
  else s.subBriefs.push(brief);
}

export function recordAgentRun(s: DemoState, run: Omit<AgentRun, "id" | "district_id" | "createdAt">): AgentRun {
  const r = recordAgent(s, run);
  s.aiSettings.spentUsd = Math.round((s.aiSettings.spentUsd + run.costUsd) * 10000) / 10000;
  return r;
}

export function requestHumanReview(s: DemoState, actor: Actor, entity: string, reason: string): Result {
  const id = nextId(s, "rev");
  audit(s, actor, "ai.human_review_requested", entity, { reason, ticket: id });
  emit(s, "review.requested", entity, `Human review requested: ${reason}`);
  const admin = s.users.find((u) => u.role === "district_admin");
  notify(s, { channel: "in_app", to: admin?.name ?? "HR", toUserId: admin?.id, subject: "Human review requested", body: `${actor.name} requested review of ${entity}: ${reason}`, language: "en" });
  for (const b of s.subBriefs) if (b.id === entity || b.assignment_id === entity) b.meta.humanReviewRequested = true;
  for (const h of s.handoffs) if (h.id === entity) h.meta.humanReviewRequested = true;
  for (const r of s.agentRuns) if (r.id === entity) r.status = "needs_review";
  return ok(undefined, "A person will review this. Ticket " + id);
}

export function resolveAlert(s: DemoState, actor: Actor, id: string): Result {
  requireRole(actor, ["district_admin", "school_admin"]);
  const al = s.alerts.find((x) => x.id === id);
  if (!al) return fail("Alert not found.");
  al.status = "resolved";
  al.resolvedBy = actor.name;
  audit(s, actor, "alert.resolved", id);
  return ok(undefined, "Alert resolved.");
}

// memory center
export function upsertMemory(s: DemoState, actor: Actor, m: Omit<Memory, "id" | "district_id" | "createdAt"> & { id?: string }): Result<Memory> {
  if (/\b(diagnos|iep|grade[s]? of|discipline)\b/i.test(m.content) && m.type !== "working") return fail("Student-sensitive data never enters long-term memory.");
  const ex = m.id ? s.memories.find((x) => x.id === m.id) : undefined;
  const full: Memory = { ...m, id: ex?.id ?? nextId(s, "mem"), district_id: s.district.id, createdAt: ex?.createdAt ?? s.now };
  if (ex) Object.assign(ex, full);
  else s.memories.push(full);
  audit(s, actor, ex ? "memory.updated" : "memory.created", full.id, { type: full.type, scope: full.scope });
  return ok(full, "Memory saved.");
}
export function deleteMemory(s: DemoState, actor: Actor, id: string): Result {
  const i = s.memories.findIndex((x) => x.id === id);
  if (i < 0) return fail("Memory not found.");
  s.memories.splice(i, 1);
  audit(s, actor, "memory.deleted", id);
  return ok(undefined, "Memory deleted.");
}

// automation controls
export function setAutomation(s: DemoState, actor: Actor, id: string, patch: { enabled?: boolean; params?: Record<string, number> }): Result {
  requireRole(actor, ["district_admin"]);
  const r = s.automations.find((x) => x.id === id);
  if (!r) return fail("Rule not found.");
  if (patch.enabled !== undefined) r.enabled = patch.enabled;
  if (patch.params) r.params = { ...r.params, ...patch.params };
  audit(s, actor, "automation.updated", id, patch as Record<string, unknown>);
  return ok(undefined, "Automation updated (policy change logged).");
}
export function setAiSettings(s: DemoState, actor: Actor, patch: Partial<DemoState["aiSettings"]>): Result {
  requireRole(actor, ["district_admin"]);
  Object.assign(s.aiSettings, patch);
  audit(s, actor, "ai.settings_updated", "ai", patch as Record<string, unknown>);
  return ok(undefined, patch.killSwitch ? "Kill switch ON: agents stop acting; suggestions only." : "AI settings saved.");
}

// ---------- scheduler (demo clock) ----------
/** Advances the demo clock and runs time-based rules W2, W4, W6, W8. Returns fired rule summaries. */
export function advanceClock(s: DemoState, actor: Actor, minutes: number): string[] {
  const before = s.now;
  s.now = addMinutes(s.now, minutes);
  const fired: string[] = [];
  const d = today(s);
  // W2: unanswered offers -> next wave; T-60 escalate
  if (ruleOn(s, "W2")) {
    const waveMin = s.automations.find((a) => a.id === "W2")?.params.waveMinutes ?? DISPATCH.waveMinutes;
    for (const a of s.absences.filter((x) => x.status === "offered")) {
      const pending = s.offers.filter((o) => o.absence_id === a.id && o.status === "pending");
      const last = pending.reduce((m, o) => (o.sentAt > m ? o.sentAt : m), "");
      if (pending.length && minutesBetween(last, s.now) >= waveMin && a.currentWave < 3) {
        emit(s, "offer.unanswered", a.id, `Wave ${a.currentWave} unanswered for ${waveMin} min`, "W2");
        const n = sendNextWave(s, a.id);
        logRun(s, "W2", "offer.unanswered", [`Expired wave ${a.currentWave - 1} offers`, `Sent wave ${a.currentWave}: ${n} offers`]);
        fired.push(`W2: ${a.id} moved to wave ${a.currentWave}`);
      }
      const school = s.schools.find((x) => x.id === a.school_id)!;
      if (a.startDate === d && minutesBetween(s.now, `${d}T${school.bellStart}:00.000Z`) <= DISPATCH.escalateMinutesBeforeBell) {
        if (!s.events.some((e) => e.type === "absence.escalated" && e.entityId === a.id)) {
          escalate(s, a, `Unfilled at T-60 min before the ${school.bellStart} bell.`);
          logRun(s, "W2", "absence.at_risk", ["Alerted school admin", "Proposed internal coverage plan"]);
          fired.push(`W2: ${a.id} escalated (T-60)`);
        }
      }
    }
  }
  // W4: no check-in at bell minus 20 min
  if (ruleOn(s, "W4")) {
    for (const asg of s.assignments.filter((x) => x.date === d && x.status === "accepted")) {
      const school = s.schools.find((x) => x.id === asg.school_id)!;
      const bell = `${d}T${school.bellStart}:00.000Z`;
      const threshold = addMinutes(bell, -DISPATCH.noShowMinutesBeforeBell);
      if (new Date(s.now) >= new Date(threshold) && new Date(before) < new Date(threshold)) {
        markNoShow(s, SYSTEM, asg.id);
        fired.push(`W4: no-show protocol for ${asg.id}`);
      }
    }
  }
  // W6 + W8 at day rollover (nightly)
  if (before.slice(0, 10) !== d) fired.push(...nightly(s));
  return fired;
}

export function nightly(s: DemoState): string[] {
  const fired: string[] = [];
  const d = today(s);
  if (ruleOn(s, "W6")) {
    for (const sub of s.substitutes) {
      for (const f of expiryFindings(credsOf(s, sub.id), d)) {
        const msg = f.level === "expired" ? `${CREDENTIAL_LABELS[f.type]} expired` : `${CREDENTIAL_LABELS[f.type]} expires in ${f.daysLeft} days`;
        if (!s.alerts.some((a) => a.substitute_id === sub.id && a.status === "open" && a.message.startsWith(CREDENTIAL_LABELS[f.type]))) {
          s.alerts.push({ id: nextId(s, "alr"), district_id: s.district.id, substitute_id: sub.id, ruleId: "R7", severity: f.level === "expired" ? "block" : "warn", message: msg, status: "open", createdAt: s.now });
          fired.push(`W6: ${sub.name} - ${msg}`);
        }
      }
      refreshMatchingPause(s, sub.id, SYSTEM);
    }
    logRun(s, "W6", "credential.expiry_sweep", [`${fired.length} reminders/tasks`]);
  }
  if (ruleOn(s, "W8")) {
    const stale = s.kbChunks.filter((c) => c.reviewBy < d).length;
    emit(s, "nightly.sweep", "district", `Compliance sweep, forecast refresh, ${stale} stale knowledge source(s)`, "W8");
    logRun(s, "W8", "nightly", ["Compliance sweep", "Absence forecast refreshed", `Knowledge freshness: ${stale} stale`, "Weekly digest queued"]);
    fired.push(`W8: nightly sweep (${stale} stale sources)`);
  }
  return fired;
}

export function setClock(s: DemoState, iso: string) {
  s.now = iso;
}

export function bellMinutes(s: DemoState, schoolId: string) {
  return toMinutes(s.schools.find((x) => x.id === schoolId)!.bellStart);
}
