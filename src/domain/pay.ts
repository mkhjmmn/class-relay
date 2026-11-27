/** Pay rules and anomaly detection (pure). Source: docs/knowledge-base.md section 4. */
import { PAY_RULES, RULE_PACK } from "./rulePack";
import { weeklyHours } from "./rules";
import type { Anomaly, Assignment, DayPart, PayLine, Tier, Timesheet } from "./schemas";

export interface PayInput {
  tier: Tier;
  dayPart: DayPart;
  dayNumber: number; // day N of the same assignment
  hardToFill: boolean;
  lateCancelBySchool?: boolean;
}

export function computePay(p: PayInput): { rate: number; hours: number; lines: PayLine[]; amount: number } {
  const daily = PAY_RULES.daily[p.tier];
  if (p.lateCancelBySchool) {
    const amt = round(daily * PAY_RULES.halfDayRatio);
    return { rate: daily, hours: 0, lines: [{ label: "Late cancellation by school (half-day pay)", amount: amt }], amount: amt };
  }
  const lines: PayLine[] = [];
  const base = p.dayPart === "full" ? daily : round(daily * PAY_RULES.halfDayRatio);
  lines.push({ label: p.dayPart === "full" ? `Daily rate ${p.tier}` : `Half-day rate ${p.tier} (55%)`, amount: base });
  if (p.dayNumber >= PAY_RULES.longTermFromDay) lines.push({ label: `Long-term rate (day ${p.dayNumber})`, amount: PAY_RULES.longTermBonus });
  if (p.hardToFill) lines.push({ label: "Hard-to-fill bonus", amount: PAY_RULES.hardToFillBonus });
  const hours = p.dayPart === "full" ? PAY_RULES.fullDayHours : PAY_RULES.halfDayHours;
  return { rate: daily, hours, lines, amount: round(lines.reduce((s, l) => s + l.amount, 0)) };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Flags: duplicates, overlaps, rate mismatches, hour-cap breaches. */
export function detectAnomalies(ts: Timesheet, all: Timesheet[], tier: Tier, assignments: Assignment[]): Anomaly[] {
  const out: Anomaly[] = [];
  const others = all.filter((t) => t.id !== ts.id && t.substitute_id === ts.substitute_id && t.status !== "rejected");
  if (others.some((t) => t.assignment_id === ts.assignment_id)) out.push({ code: "duplicate", message: "Another timesheet exists for the same assignment." });
  const sameDay = others.filter((t) => t.date === ts.date && t.assignment_id !== ts.assignment_id);
  if (sameDay.some((t) => t.dayPart === "full" || ts.dayPart === "full" || t.dayPart === ts.dayPart))
    out.push({ code: "overlap", message: `Overlaps another timesheet on ${ts.date}.` });
  if (ts.rate !== PAY_RULES.daily[tier]) out.push({ code: "rate_mismatch", message: `Rate $${ts.rate} does not match ${tier} rate $${PAY_RULES.daily[tier]}.` });
  const maxHours = ts.dayPart === "full" ? PAY_RULES.fullDayHours : PAY_RULES.halfDayHours;
  if (ts.hours > maxHours + 0.01) out.push({ code: "outside_bell", message: `${ts.hours} h exceeds the bell schedule (${maxHours} h).` });
  if (weeklyHours(assignments, ts.date) > RULE_PACK.weeklyHoursBlock)
    out.push({ code: "hour_cap", message: `Weekly hours exceed the ${RULE_PACK.weeklyHoursBlock} h cap.` });
  return out;
}

/** Pay periods: day 1-15 and day 16 to month end. */
export function payPeriodFor(date: string): { start: string; end: string } {
  const [y, m, d] = date.split("-").map(Number);
  const mm = String(m).padStart(2, "0");
  if (d <= 15) return { start: `${y}-${mm}-01`, end: `${y}-${mm}-15` };
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${y}-${mm}-16`, end: `${y}-${mm}-${last}` };
}

export function timesheetsToCsv(rows: (Timesheet & { substituteName: string; schoolName: string })[]): string {
  const head = ["timesheet_id", "date", "substitute", "school", "budget_code", "day_part", "hours", "amount", "status", "anomalies"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [
    head.join(","),
    ...rows.map((r) =>
      [r.id, r.date, r.substituteName, r.schoolName, r.budgetCode, r.dayPart, r.hours, r.amount.toFixed(2), r.status, r.anomalies.map((a) => a.code).join("|")]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}
