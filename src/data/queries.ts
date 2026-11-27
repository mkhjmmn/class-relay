/** Read-side selectors over the snapshot (pure). Shared by every role view and the audit engine. */
import { daysBetween, minutesBetween, type Absence } from "@/domain";
import type { DemoState } from "./state";

export const byId = <T extends { id: string }>(xs: T[], id: string | undefined) => (id ? xs.find((x) => x.id === id) : undefined);

export function absenceView(s: DemoState, a: Absence) {
  const teacher = byId(s.teachers, a.teacher_id)!;
  const school = byId(s.schools, a.school_id)!;
  const assignments = s.assignments.filter((x) => x.absence_id === a.id);
  const live = assignments.filter((x) => x.status !== "cancelled" && x.status !== "no_show");
  const sub = live[0] ? byId(s.substitutes, live[0].substitute_id) : undefined;
  const offers = s.offers.filter((o) => o.absence_id === a.id);
  const today = s.now.slice(0, 10);
  const atRisk = ["matching", "offered", "reported", "approved"].includes(a.status) && daysBetween(today, a.startDate) <= 0;
  return { absence: a, teacher, school, assignments, liveAssignments: live, substitute: sub, offers, atRisk };
}

export function coverage(s: DemoState, schoolId?: string, from?: string, to?: string) {
  const list = s.absences.filter((a) => (!schoolId || a.school_id === schoolId) && (!from || a.endDate >= from) && (!to || a.startDate <= to));
  return list.map((a) => absenceView(s, a));
}

/** KPIs computed from repository data (targets shown separately and labelled as targets). */
export function kpis(s: DemoState) {
  const needed = s.absences.filter((a) => a.status !== "cancelled" || a.cancelReason?.startsWith("Unfilled"));
  const filled = needed.filter((a) => a.filledAt);
  const fillRate = needed.length ? filled.length / needed.length : 0;
  const ttf = filled.map((a) => minutesBetween(a.createdAt, a.filledAt!)).filter((m) => m >= 0).sort((x, y) => x - y);
  const medianTtf = ttf.length ? ttf[Math.floor(ttf.length / 2)] : 0;
  const checks = s.assignments.map((a) => s.complianceChecks.find((c) => c.id === a.complianceCheckId));
  const compliance = checks.length ? checks.filter((c) => c?.passed).length / checks.length : 1;
  const exported = s.timesheets.filter((t) => t.status === "exported" || t.status === "paid");
  const handoffs = s.handoffs;
  const continuity = handoffs.length ? handoffs.reduce((a, h) => a + h.continuityScore, 0) / handoffs.length : null;
  return {
    fillRate,
    medianTtf,
    compliance,
    exportedTimesheets: exported.length,
    pendingTimesheets: s.timesheets.filter((t) => t.status === "submitted").length,
    continuity,
    openAlerts: s.alerts.filter((a) => a.status === "open").length,
    activeSubs: s.substitutes.filter((x) => x.stage === "active").length,
  };
}

export const KPI_TARGETS = {
  fillRate: 0.95,
  medianTtf: 10,
  compliance: 1,
  timesheetHours: 24,
};

export function offersForSub(s: DemoState, subId: string) {
  return s.offers
    .filter((o) => o.substitute_id === subId && o.status === "pending")
    .map((o) => ({ offer: o, ...absenceView(s, byId(s.absences, o.absence_id)!) }));
}

export function assignmentsForSub(s: DemoState, subId: string) {
  return s.assignments
    .filter((a) => a.substitute_id === subId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({ assignment: a, ...absenceView(s, byId(s.absences, a.absence_id)!), brief: s.subBriefs.find((b) => b.assignment_id === a.id), timesheet: s.timesheets.find((t) => t.assignment_id === a.id) }));
}
