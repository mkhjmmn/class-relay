/**
 * Matchmaker core (pure): hard filters via the rules engine, then a weighted score, then offer waves.
 * Protected attributes are never inputs: the Substitute type has no age, gender, race, religion,
 * disability or national-origin fields, and the score uses only the features listed in WEIGHTS.
 */
import { checkEligibility, type EligibilityResult } from "./rules";
import { computePay } from "./pay";
import type { Absence, Assignment, Credential, School, Substitute, Teacher } from "./schemas";

export const WEIGHTS = {
  preferred: 0.25,
  schoolHistory: 0.15,
  subjectFit: 0.2,
  reliability: 0.15,
  commute: 0.1,
  fairness: 0.1,
  continuity: 0.05,
} as const;
export type WeightKey = keyof typeof WEIGHTS;

export const WEIGHT_LABELS: Record<WeightKey, string> = {
  preferred: "Teacher's preferred list",
  schoolHistory: "Good history at this school",
  subjectFit: "Subject and grade fit",
  reliability: "Reliability",
  commute: "Commute",
  fairness: "Fairness of opportunity",
  continuity: "Multi-day continuity",
};

export interface MatchContext {
  absence: Absence;
  school: School;
  teacher: Teacher;
  date: string;
  substitutes: Substitute[];
  credentialsBySub: Record<string, Credential[]>;
  assignmentsBySub: Record<string, Assignment[]>;
  /** Count of completed assignments per substitute at this school. */
  historyAtSchool: Record<string, number>;
  /** Mean rating given by this school per substitute (1-5). */
  schoolRating: Record<string, number>;
  t4AnnualDayLimit: number;
}

export interface Candidate {
  substitute: Substitute;
  eligibility: EligibilityResult;
  score: number;
  breakdown: Record<WeightKey, number>;
  reasons: string[];
  distance: number;
  pay: number;
  wave: 1 | 2 | 3;
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 10) / 10;
}

export function rankCandidates(ctx: MatchContext): { ranked: Candidate[]; blocked: Candidate[] } {
  const { absence, school, teacher, date } = ctx;
  const maxOffers = Math.max(1, ...ctx.substitutes.map((s) => s.offersLast30));
  const all: Candidate[] = ctx.substitutes.map((s) => {
    const eligibility = checkEligibility({
      substitute: s,
      credentials: ctx.credentialsBySub[s.id] ?? [],
      absence,
      school,
      teacher,
      date,
      assignments: ctx.assignmentsBySub[s.id] ?? [],
      t4AnnualDayLimit: ctx.t4AnnualDayLimit,
    });
    const dist = distance(s, school);
    // Availability and distance are hard filters too.
    const wd = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    if (!s.availableDays.includes(wd)) eligibility.violations.push({ ruleId: "AVAIL", message: "Not available on this weekday." });
    if (dist > s.maxDistance) eligibility.violations.push({ ruleId: "DIST", message: `${dist} mi exceeds their ${s.maxDistance} mi limit.` });
    if (!s.subjects.includes(teacher.subject))
      eligibility.violations.push({ ruleId: "FIT", message: `Does not list ${teacher.subject}.` });
    if (!s.gradeBands.includes(teacher.gradeBand)) eligibility.violations.push({ ruleId: "FIT", message: `Does not list grades ${teacher.gradeBand}.` });
    eligibility.eligible = eligibility.violations.length === 0;

    const preferred = teacher.preferredSubIds.includes(s.id) ? 1 : 0;
    const hist = Math.min(1, (ctx.historyAtSchool[s.id] ?? 0) / 5);
    const rating = (ctx.schoolRating[s.id] ?? s.rating) / 5;
    const breakdown: Record<WeightKey, number> = {
      preferred,
      schoolHistory: hist * 0.6 + rating * 0.4,
      subjectFit: (s.subjects.includes(teacher.subject) ? 0.7 : 0.4) + (s.gradeBands.includes(teacher.gradeBand) ? 0.3 : 0),
      reliability: s.reliability,
      commute: Math.max(0, 1 - dist / Math.max(1, s.maxDistance)),
      fairness: 1 - s.offersLast30 / maxOffers,
      continuity: (ctx.assignmentsBySub[s.id] ?? []).some((a) => a.absence_id === absence.id) ? 1 : 0,
    };
    const score = Math.round((Object.keys(WEIGHTS) as WeightKey[]).reduce((acc, k) => acc + WEIGHTS[k] * breakdown[k], 0) * 100);
    const reasons: string[] = [];
    if (preferred) reasons.push(`On ${teacher.name}'s preferred list`);
    if ((ctx.historyAtSchool[s.id] ?? 0) > 0) reasons.push(`${ctx.historyAtSchool[s.id]} past days at ${school.short}`);
    if (s.subjects.includes(teacher.subject)) reasons.push(`Teaches ${teacher.subject}, grades ${teacher.gradeBand}`);
    reasons.push(`Reliability ${Math.round(s.reliability * 100)}%`);
    reasons.push(`${dist} mi away`);
    if (breakdown.fairness > 0.6) reasons.push("Fewer recent offers (fairness boost)");
    if (breakdown.continuity) reasons.push("Already covering earlier days of this absence");
    const wave: 1 | 2 | 3 = preferred ? 1 : (ctx.historyAtSchool[s.id] ?? 0) >= 2 && rating >= 0.8 ? 2 : 3;
    const pay = computePay({ tier: s.tier, dayPart: absence.dayPart, dayNumber: 1, hardToFill: school.hardToFill }).amount;
    return { substitute: s, eligibility, score, breakdown, reasons, distance: dist, pay, wave };
  });
  const ranked = all.filter((c) => c.eligibility.eligible).sort((a, b) => b.score - a.score || a.substitute.id.localeCompare(b.substitute.id));
  const blocked = all.filter((c) => !c.eligibility.eligible);
  return { ranked, blocked };
}

/** Wave selection: same-day absences send waves 1 and 2 together. */
export function candidatesForWave(ranked: Candidate[], wave: number, sameDay: boolean, limit = 5): Candidate[] {
  const waves = sameDay && wave <= 2 ? [1, 2] : [wave];
  const pool = ranked.filter((c) => waves.includes(c.wave));
  return (wave >= 3 ? ranked.filter((c) => c.wave === 3) : pool).slice(0, wave >= 3 ? limit * 2 : limit);
}

/** Fairness monitor: share of offers going to the top decile of substitutes. */
export function offerConcentration(offerCounts: number[]): number {
  if (!offerCounts.length) return 0;
  const sorted = [...offerCounts].sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0) || 1;
  const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 10))).reduce((a, b) => a + b, 0);
  return top / total;
}
