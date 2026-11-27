/** Golden paths J1-J5 at the command layer (the same commands the UI runs through act()). */
import { describe, expect, it } from "vitest";
import { buildSeed } from "@/data/seed";
import * as C from "@/data/commands";
import { intakeAbsence, extractCredential } from "@/ai/client";
import { verifyChain } from "@/domain";

const daniel = { userId: "usr-daniel", role: "teacher" as const, name: "Daniel Ortiz" };
const grace = { userId: "usr-grace", role: "school_admin" as const, name: "Grace Kim" };
const jordan = { userId: "usr-jordan", role: "district_admin" as const, name: "Jordan Lee" };

describe("golden paths", () => {
  it("J1 teacher voice absence -> structured -> confirm -> matching", async () => {
    const s = buildSeed();
    const r = await intakeAbsence("I'm sick with a fever tomorrow, the plan is in the folder", { teacherId: "tch-021", today: "2026-12-01", via: "voice" });
    expect(r.input.startDate).toBe("2026-12-02");
    expect(r.input.reason).toBe("illness");
    const res = C.reportAbsence(s, daniel, r.input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.status).toBe("offered");
      expect(s.offers.filter((o) => o.absence_id === res.value.id).length).toBeGreaterThan(0);
      expect(s.offers.some((o) => o.absence_id === res.value.id && o.substitute_id === "sub-001")).toBe(true); // preferred -> wave 1
    }
  });

  it("J3 school admin: no-show re-dispatch -> approve timesheets -> rate", () => {
    const s = buildSeed();
    const asg = s.assignments.find((a) => a.school_id === "sch-3" && a.date === "2026-12-01" && a.status === "accepted")!;
    expect(C.markNoShow(s, grace, asg.id).ok).toBe(true);
    const ts = s.timesheets.filter((t) => t.school_id === "sch-3" && t.status === "submitted");
    expect(ts.length).toBeGreaterThan(0);
    for (const t of ts) expect(C.approveTimesheet(s, grace, t.id).ok).toBe(true);
    const done = s.assignments.find((a) => a.school_id === "sch-3" && a.status === "completed" && !s.ratings.some((r) => r.assignment_id === a.id && r.from === grace.userId))!;
    expect(C.rateSubstitute(s, grace, done.id, 5, "Great day").ok).toBe(true);
  });

  it("J4 district admin: flagged credential -> alert -> payroll export -> automation edit -> trace -> audit chain", () => {
    const s = buildSeed();
    const flagged = s.credentials.find((c) => c.status === "needs_review")!;
    expect(C.reviewCredential(s, jordan, flagged.id, "rejected", "").ok).toBe(false); // reason required
    expect(C.reviewCredential(s, jordan, flagged.id, "verified", "Checked against fingerprint receipt").ok).toBe(true);
    const alert = s.alerts.find((a) => a.status === "open")!;
    expect(C.resolveAlert(s, jordan, alert.id).ok).toBe(true);
    const run = C.createPayRun(s, jordan, "2026-11-16", "2026-11-30");
    expect(run.ok).toBe(true);
    if (run.ok) {
      expect(C.approvePayRun(s, jordan, run.value).ok).toBe(true);
      expect(C.exportPayRun(s, jordan, run.value).ok).toBe(true);
    }
    expect(C.setAutomation(s, jordan, "W2", { params: { waveMinutes: 5 } }).ok).toBe(true);
    expect(s.agentRuns.some((r) => r.agent === "payroll")).toBe(true);
    expect(verifyChain(s.audit).valid).toBe(true);
  });

  it("J5 new substitute: apply -> upload -> AI verification -> orientation -> active", async () => {
    const s = buildSeed();
    const app = C.createApplicant(s, { userId: "anonymous", role: "anonymous", name: "Visitor" }, { name: "Robin Vale", email: "robin.vale@example.org", phone: "+1-555-0100", tier: "T2", subjects: ["Math"], gradeBands: ["6-8"], languages: ["en"], maxDistance: 15 });
    expect(app.ok).toBe(true);
    if (!app.ok) return;
    const me = { userId: app.value.userId, role: "substitute" as const, name: "Robin Vale" };
    for (const type of ["substitute_permit", "background_clearance", "health_clearance"] as const) {
      const ex = await extractCredential({ name: `${type}.pdf`, size: 200_000, type: "application/pdf" }, { type, holderName: "Robin Vale", today: "2026-12-01" });
      const up = C.uploadCredential(s, me, app.value.substituteId, { type, number: ex.number, issuer: ex.issuer, issueDate: ex.issueDate, expiryDate: ex.expiryDate, documentName: `${type}.pdf`, nameOnDocument: ex.nameOnDocument, extractionConfidence: ex.confidence });
      expect(up.ok && up.value.status).toBe("verified");
    }
    const o = C.completeOrientation(s, me, app.value.substituteId);
    expect(o.ok).toBe(true);
    expect(s.substitutes.find((x) => x.id === app.value.substituteId)?.stage).toBe("active");
  });

  it("anonymous visitors cannot run gated commands", () => {
    const s = buildSeed();
    const anon = { userId: "anonymous", role: "anonymous" as const, name: "Visitor" };
    expect(() => C.approveTimesheet(s, anon, s.timesheets[0].id)).toThrow();
  });
});
