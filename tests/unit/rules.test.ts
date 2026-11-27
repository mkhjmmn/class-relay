import { describe, expect, it } from "vitest";
import { buildSeed } from "@/data/seed";
import * as C from "@/data/commands";
import { appendEvent, canTransition, checkEligibility, computePay, payPeriodFor, sha256, transition, verifyChain } from "@/domain";

const maya = { userId: "usr-maya", role: "substitute" as const, name: "Maya Rahman" };
const grace = { userId: "usr-grace", role: "school_admin" as const, name: "Grace Kim" };
const daniel = { userId: "usr-daniel", role: "teacher" as const, name: "Daniel Ortiz" };
const jordan = { userId: "usr-jordan", role: "district_admin" as const, name: "Jordan Lee" };

describe("absence state machine", () => {
  it("follows the relay flow", () => {
    expect(canTransition("reported", "approved")).toBe(true);
    expect(canTransition("reported", "paid")).toBe(false);
    expect(() => transition("completed", "matching")).toThrow();
  });
});

describe("pay rules", () => {
  it("computes daily, half-day, long-term and hard-to-fill", () => {
    expect(computePay({ tier: "T1", dayPart: "full", dayNumber: 1, hardToFill: false }).amount).toBe(140);
    expect(computePay({ tier: "T2", dayPart: "am", dayNumber: 1, hardToFill: false }).amount).toBe(88);
    expect(computePay({ tier: "T3", dayPart: "full", dayNumber: 11, hardToFill: true }).amount).toBe(255);
    expect(computePay({ tier: "T4", dayPart: "full", dayNumber: 1, hardToFill: false, lateCancelBySchool: true }).amount).toBe(110);
  });
  it("splits pay periods", () => {
    expect(payPeriodFor("2026-12-03")).toEqual({ start: "2026-12-01", end: "2026-12-15" });
    expect(payPeriodFor("2026-02-20")).toEqual({ start: "2026-02-16", end: "2026-02-28" });
  });
});

describe("hash-chained audit", () => {
  it("detects tampering", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    const chain: ReturnType<typeof appendEvent>[] = [];
    for (let i = 0; i < 3; i++) chain.push(appendEvent(chain, { district_id: "d", at: "t", actor: "a", action: "x", entity: "e", payload: { i } }));
    expect(verifyChain(chain).valid).toBe(true);
    chain[1] = { ...chain[1], payload: { i: 99 } };
    expect(verifyChain(chain)).toEqual({ valid: false, brokenAt: 2 });
  });
  it("seed chain verifies", () => {
    expect(verifyChain(buildSeed().audit).valid).toBe(true);
  });
  it("seed is deterministic", () => {
    expect(JSON.stringify(buildSeed())).toBe(JSON.stringify(buildSeed()));
  });
});

describe("rules engine R1-R8", () => {
  const s = buildSeed();
  const absence = s.absences.find((a) => a.teacher_id === "tch-022")!;
  const ctx = (subId: string, extra: Record<string, unknown> = {}) => ({
    substitute: s.substitutes.find((x) => x.id === subId)!,
    credentials: s.credentials.filter((c) => c.substitute_id === subId),
    absence,
    school: s.schools.find((x) => x.id === absence.school_id)!,
    teacher: s.teachers.find((t) => t.id === absence.teacher_id)!,
    date: absence.startDate,
    assignments: s.assignments.filter((a) => a.substitute_id === subId),
    t4AnnualDayLimit: 100,
    ...extra,
  });
  it("Maya is eligible with an R7 expiry warning", () => {
    const r = checkEligibility(ctx("sub-001"));
    expect(r.eligible).toBe(true);
    expect(r.warnings.some((w) => w.ruleId === "R7")).toBe(true);
  });
  it("R1 blocks an applicant without credentials", () => {
    const r = checkEligibility(ctx("sub-111"));
    expect(r.eligible).toBe(false);
    expect(r.violations[0].ruleId).toBe("R1");
  });
  it("R6 blocks an excluded substitute", () => {
    const school = { ...ctx("sub-001").school, excludedSubIds: ["sub-001"] };
    const r = checkEligibility(ctx("sub-001", { school }));
    expect(r.violations.some((v) => v.ruleId === "R6")).toBe(true);
  });
  it("R4 blocks above 29 weekly hours unless overridden (R8)", () => {
    const base = ctx("sub-001");
    const fake = ["2026-11-30", "2026-12-02", "2026-12-03", "2026-12-04"].map((d, i) => ({
      ...s.assignments[0],
      id: `x${i}`,
      absence_id: `other${i}`,
      substitute_id: "sub-001",
      date: d,
      dayPart: "full" as const,
      status: "accepted" as const,
    }));
    expect(checkEligibility({ ...base, assignments: fake }).violations.some((v) => v.ruleId === "R4")).toBe(true);
    expect(checkEligibility({ ...base, assignments: fake, hourOverride: { by: "HR", reason: "coverage emergency" } }).eligible).toBe(true);
  });
  it("R7 expired credential blocks", () => {
    const creds = ctx("sub-001").credentials.map((c) => (c.type === "health_clearance" ? { ...c, expiryDate: "2026-11-01" } : c));
    expect(checkEligibility(ctx("sub-001", { credentials: creds })).violations.some((v) => v.message.includes("Health"))).toBe(true);
  });
});

describe("relay loop and edge cases", () => {
  it("J2: accept -> brief -> check-in -> day report -> timesheet -> handoff", () => {
    const s = buildSeed();
    const offer = s.offers.find((o) => o.substitute_id === "sub-001" && o.status === "pending")!;
    const acc = C.respondOffer(s, maya, offer.id, true);
    expect(acc.ok).toBe(true);
    const asgId = acc.ok ? acc.value.assignmentIds[0] : "";
    expect(s.subBriefs.some((b) => b.assignment_id === asgId)).toBe(true);
    expect(C.checkIn(s, maya, asgId).ok).toBe(true);
    const r = C.submitDayReport(s, maya, asgId, { covered: [{ period: 1, status: "covered", note: "" }], attendanceNotes: "", behaviorNotes: "", materials: "", message: "ok" });
    expect(r.ok).toBe(true);
    expect(s.timesheets.find((t) => t.assignment_id === asgId)?.amount).toBe(160);
    expect(s.handoffs.some((h) => h.assignment_id === asgId)).toBe(true);
  });
  it("two substitutes accept at once: first wins", () => {
    const s = buildSeed();
    const abs = s.absences.find((a) => a.teacher_id === "tch-022")!;
    const pending = s.offers.filter((o) => o.absence_id === abs.id && o.status === "pending");
    expect(pending.length).toBeGreaterThan(1);
    const other = pending.find((o) => o.substitute_id !== "sub-001")!;
    expect(C.respondOffer(s, C.SYSTEM, other.id, true).ok).toBe(true);
    const mine = pending.find((o) => o.substitute_id === "sub-001")!;
    expect(C.respondOffer(s, maya, mine.id, true).ok).toBe(false);
  });
  it("duplicate absence report is rejected", () => {
    const s = buildSeed();
    const input = { teacher_id: "tch-021", startDate: "2026-12-02", endDate: "2026-12-02", dayPart: "full" as const, periods: [], reason: "illness" as const, notes: "", reportedVia: "voice" as const };
    expect(C.reportAbsence(s, daniel, input).ok).toBe(true);
    expect(C.reportAbsence(s, daniel, input).ok).toBe(false);
  });
  it("no-show re-dispatches", () => {
    const s = buildSeed();
    const asg = s.assignments.find((a) => a.school_id === "sch-3" && a.date === "2026-12-01" && a.status === "accepted")!;
    expect(C.markNoShow(s, grace, asg.id).ok).toBe(true);
    expect(s.offers.some((o) => o.absence_id === asg.absence_id && o.status === "pending")).toBe(true);
  });
  it("role separation: teacher cannot approve a timesheet", () => {
    const s = buildSeed();
    const ts = s.timesheets.find((t) => t.status === "submitted")!;
    expect(() => C.approveTimesheet(s, daniel, ts.id)).toThrow();
  });
  it("payroll never exports without human approval", () => {
    const s = buildSeed();
    const run = C.createPayRun(s, jordan, "2026-11-16", "2026-11-30");
    expect(run.ok).toBe(true);
    if (run.ok) {
      expect(C.exportPayRun(s, jordan, run.value).ok).toBe(false);
      expect(C.approvePayRun(s, jordan, run.value).ok).toBe(true);
      expect(C.exportPayRun(s, jordan, run.value).ok).toBe(true);
    }
  });
  it("name mismatch goes to review, never auto-rejected", () => {
    const s = buildSeed();
    const r = C.uploadCredential(s, maya, "sub-001", { type: "health_clearance", number: "H-1", issuer: "Clinic", issueDate: "2026-11-20", expiryDate: "2028-11-20", documentName: "h.jpg", nameOnDocument: "M. Rahman", extractionConfidence: 0.95 });
    expect(r.ok && r.value.status).toBe("needs_review");
  });
  it("preferred and excluded conflict is rejected", () => {
    const s = buildSeed();
    expect(C.updateTeacher(s, daniel, "tch-021", { excludedSubIds: ["sub-001"] }).ok).toBe(false);
  });
});
