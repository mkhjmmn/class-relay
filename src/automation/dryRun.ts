/** Automation dry run: describes what each W1-W8 rule would do against the current state, without mutating. */
import { DISPATCH, expiryFindings, minutesBetween, type AutomationRule } from "@/domain";
import type { DemoState } from "@/data/state";

export function dryRun(s: DemoState, rule: AutomationRule): string[] {
  const d = s.now.slice(0, 10);
  if (!rule.enabled) return ["Rule is disabled: nothing would fire."];
  const out: string[] = [];
  switch (rule.id) {
    case "W1": {
      const n = s.absences.filter((a) => a.status === "reported" || a.status === "matching").length;
      out.push(n ? `${n} new absence(s) would be matched and wave 1 dispatched.` : "No newly reported absences to match.");
      break;
    }
    case "W2": {
      const waveMin = rule.params.waveMinutes ?? DISPATCH.waveMinutes;
      for (const a of s.absences.filter((x) => x.status === "offered")) {
        const pending = s.offers.filter((o) => o.absence_id === a.id && o.status === "pending");
        const last = pending.reduce((m, o) => (o.sentAt > m ? o.sentAt : m), "");
        const age = last ? minutesBetween(last, s.now) : 0;
        out.push(age >= waveMin ? `${a.id}: wave ${a.currentWave} unanswered ${age} min, next wave would send.` : `${a.id}: wave ${a.currentWave} open ${age}/${waveMin} min, waiting.`);
      }
      if (!out.length) out.push("No absences waiting on offers.");
      break;
    }
    case "W3":
      out.push(`${s.offers.filter((o) => o.status === "accepted").length} accepted offer(s); briefs exist for ${s.subBriefs.length} assignment(s).`);
      break;
    case "W4": {
      const n = s.assignments.filter((x) => x.date === d && x.status === "accepted").length;
      out.push(n ? `${n} assignment(s) today without check-in; no-show protocol fires ${DISPATCH.noShowMinutesBeforeBell} min before the bell.` : "No pending check-ins today.");
      break;
    }
    case "W5":
      out.push(`${s.dayReports.length} day report(s); each would create a timesheet and a Return Handoff.`);
      break;
    case "W6": {
      let n = 0;
      for (const sub of s.substitutes) n += expiryFindings(s.credentials.filter((c) => c.substitute_id === sub.id), d).length;
      out.push(`${n} credential expiry finding(s) would raise reminders or pause matching.`);
      break;
    }
    case "W7":
      out.push(`${s.timesheets.filter((t) => t.status === "submitted").length} submitted timesheet(s) awaiting approval would be reminded.`);
      break;
    case "W8":
      out.push(`Nightly: compliance sweep, forecast refresh, ${s.kbChunks.filter((c) => c.reviewBy < d).length} stale knowledge source(s) flagged.`);
      break;
    default:
      out.push(`Trigger "${rule.trigger}" has no dry-run model yet.`);
  }
  return out.map((x) => `[dry run] ${x}`);
}
