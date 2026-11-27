/**
 * Compliance rules engine (pure). Implements R1-R8 from the sample rule pack.
 * Every block carries a rule id and a plain-language explanation (F8).
 */
import { RULE_PACK, PAY_RULES, CREDENTIAL_LABELS } from "./rulePack";
import { addDays, daysBetween, weekday } from "./dates";
import type { Absence, Assignment, Credential, CredentialType, School, Substitute, Teacher } from "./schemas";

export interface RuleFinding {
  ruleId: string;
  message: string;
}

export interface EligibilityResult {
  eligible: boolean;
  violations: RuleFinding[];
  warnings: RuleFinding[];
}

export interface EligibilityContext {
  substitute: Substitute;
  credentials: Credential[];
  absence: Absence;
  school: School;
  teacher: Teacher;
  date: string;
  /** The substitute's non-cancelled assignments (all absences). */
  assignments: Assignment[];
  t4AnnualDayLimit: number;
  /** Optional HR override for R4 (R8 requires a named person and reason). */
  hourOverride?: { by: string; reason: string };
}

/** Effective credential status on a given date (expiry wins over stored status). */
export function credentialStatusOn(c: Credential, date: string): Credential["status"] {
  if (c.status === "rejected") return "rejected";
  if (c.expiryDate && c.expiryDate < date) return "expired";
  return c.status;
}

export function findCredential(creds: Credential[], type: CredentialType): Credential | undefined {
  // Prefer verified, then most recent.
  const of = creds.filter((c) => c.type === type);
  const rank = (c: Credential) => (c.status === "verified" ? 0 : 1);
  return [...of].sort((a, b) => rank(a) - rank(b) || b.issueDate.localeCompare(a.issueDate))[0];
}

function validOn(creds: Credential[], type: CredentialType, date: string): boolean {
  return creds.some((c) => c.type === type && credentialStatusOn(c, date) === "verified");
}

/** Hours scheduled for the ISO week (Mon-Sun) containing date. */
export function weeklyHours(assignments: Assignment[], date: string): number {
  const wd = weekday(date);
  const monday = addDays(date, wd === 0 ? -6 : 1 - wd);
  const sunday = addDays(monday, 6);
  return assignments
    .filter((a) => a.status !== "cancelled" && a.status !== "no_show" && a.date >= monday && a.date <= sunday)
    .reduce((h, a) => h + (a.dayPart === "full" ? PAY_RULES.fullDayHours : PAY_RULES.halfDayHours), 0);
}

export function checkEligibility(ctx: EligibilityContext): EligibilityResult {
  const { substitute: s, credentials: creds, absence, school, teacher, date } = ctx;
  const violations: RuleFinding[] = [];
  const warnings: RuleFinding[] = [];

  // R1 required credentials
  if (s.stage !== "active") violations.push({ ruleId: "R1", message: `${s.name} is not active (stage: ${s.stage}).` });
  if (!validOn(creds, "substitute_permit", date) && !validOn(creds, "teaching_license", date))
    violations.push({ ruleId: "R1", message: "No substitute permit or teaching license valid on the assignment date." });
  for (const t of ["background_clearance", "health_clearance", "district_orientation"] as CredentialType[]) {
    if (!validOn(creds, t, date)) violations.push({ ruleId: "R1", message: `${CREDENTIAL_LABELS[t]} is missing, unverified or expired.` });
  }
  const mr = creds.find((c) => c.type === "mandated_reporter" && credentialStatusOn(c, date) === "verified");
  if (!mr) violations.push({ ruleId: "R1", message: "Mandated-reporter training is missing or unverified." });
  else if (daysBetween(mr.issueDate, date) > RULE_PACK.mandatedReporterMonths * 30.5)
    violations.push({ ruleId: "R1", message: "Mandated-reporter training is older than 12 months." });

  // Overlap (data validation rule: no overlapping assignments per substitute)
  const sameDay = ctx.assignments.filter(
    (a) => a.date === date && a.absence_id !== absence.id && a.status !== "cancelled" && a.status !== "no_show",
  );
  for (const a of sameDay) {
    if (a.dayPart === "full" || absence.dayPart === "full" || a.dayPart === absence.dayPart)
      violations.push({ ruleId: "OVERLAP", message: `Already assigned on ${date} (${a.dayPart}).` });
  }

  // R2 / R3 same-assignment day caps
  const daysInThis = ctx.assignments.filter(
    (a) => a.absence_id === absence.id && a.status !== "cancelled" && a.status !== "no_show" && a.date < date,
  ).length;
  const cap = RULE_PACK.dayCapSameAssignment[s.tier];
  if (daysInThis + 1 > cap) violations.push({ ruleId: "R2", message: `${s.tier} substitutes may serve at most ${cap} days in the same assignment.` });
  if (absence.sped && !validOn(creds, "sped_endorsement", date)) {
    if (daysInThis + 1 > RULE_PACK.spedNoEndorsementCap)
      violations.push({ ruleId: "R3", message: "Special-education class: endorsement required beyond 20 days." });
    else warnings.push({ ruleId: "R3", message: `Special-education class without endorsement: day ${daysInThis + 1} of max 20.` });
  }

  // R4 weekly hours
  const add = absence.dayPart === "full" ? PAY_RULES.fullDayHours : PAY_RULES.halfDayHours;
  const hours = weeklyHours(ctx.assignments.filter((a) => a.absence_id !== absence.id || a.date !== date), date) + add;
  if (hours > RULE_PACK.weeklyHoursBlock) {
    if (ctx.hourOverride) warnings.push({ ruleId: "R4", message: `Weekly hours ${hours} over cap; overridden by ${ctx.hourOverride.by}: ${ctx.hourOverride.reason}` });
    else violations.push({ ruleId: "R4", message: `Weekly hours would reach ${hours} (block at ${RULE_PACK.weeklyHoursBlock}).` });
  } else if (hours >= RULE_PACK.weeklyHoursWarn) warnings.push({ ruleId: "R4", message: `Weekly hours would reach ${hours} (warn at ${RULE_PACK.weeklyHoursWarn}).` });

  // R5 T4 annual limit
  if (s.tier === "T4") {
    const limit = ctx.t4AnnualDayLimit;
    if (s.daysThisYear + 1 > limit) violations.push({ ruleId: "R5", message: `Retiree annual limit of ${limit} days reached.` });
    else if (s.daysThisYear + 1 >= limit * RULE_PACK.t4WarnRatio) warnings.push({ ruleId: "R5", message: `Retiree at ${s.daysThisYear + 1} of ${limit} annual days.` });
  }

  // R6 exclusion lists (school or teacher)
  if (school.excludedSubIds.includes(s.id)) violations.push({ ruleId: "R6", message: `On ${school.short}'s exclusion list.` });
  if (teacher.excludedSubIds.includes(s.id)) violations.push({ ruleId: "R6", message: `On ${teacher.name}'s do-not-send list.` });

  // R7 expiry within 60 days -> warning task
  for (const c of creds) {
    if (c.expiryDate && credentialStatusOn(c, date) === "verified") {
      const left = daysBetween(date, c.expiryDate);
      if (left <= RULE_PACK.expiryWarnDays[0]) warnings.push({ ruleId: "R7", message: `${CREDENTIAL_LABELS[c.type]} expires in ${left} days.` });
    }
  }

  return { eligible: violations.length === 0, violations: dedupe(violations), warnings: dedupe(warnings) };
}

function dedupe(f: RuleFinding[]): RuleFinding[] {
  const seen = new Set<string>();
  return f.filter((x) => (seen.has(x.message) ? false : (seen.add(x.message), true)));
}

/** R7 sweep: expiry tasks for one substitute at a date. Returns days-left buckets 60/30/7 and expired. */
export function expiryFindings(creds: Credential[], date: string): { credentialId: string; type: CredentialType; daysLeft: number; level: "expired" | "7" | "30" | "60" }[] {
  const out: { credentialId: string; type: CredentialType; daysLeft: number; level: "expired" | "7" | "30" | "60" }[] = [];
  for (const c of creds) {
    if (!c.expiryDate || c.status === "rejected") continue;
    const left = daysBetween(date, c.expiryDate);
    if (left < 0) out.push({ credentialId: c.id, type: c.type, daysLeft: left, level: "expired" });
    else if (left <= 7) out.push({ credentialId: c.id, type: c.type, daysLeft: left, level: "7" });
    else if (left <= 30) out.push({ credentialId: c.id, type: c.type, daysLeft: left, level: "30" });
    else if (left <= 60) out.push({ credentialId: c.id, type: c.type, daysLeft: left, level: "60" });
  }
  return out;
}
