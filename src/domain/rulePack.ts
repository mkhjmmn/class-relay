import type { CredentialType, Tier } from "./schemas";

/**
 * Riverbend sample rule pack (permit model with day caps), from docs/knowledge-base.md sections 3-4.
 * UI label: "Sample rule pack - verify with your state education agency".
 */
export const RULE_PACK = {
  id: "riverbend-permit-v1",
  label: "Sample rule pack - verify with your state education agency",
  version: "1.0.0",
  effectiveDate: "2026-08-01",
  model: "permit" as const,
  dayCapSameAssignment: { T1: 30, T2: 30, T3: Infinity, T4: Infinity } as Record<Tier, number>,
  spedNoEndorsementCap: 20,
  weeklyHoursWarn: 25,
  weeklyHoursBlock: 29,
  t4WarnRatio: 0.8,
  mandatedReporterMonths: 12,
  expiryWarnDays: [60, 30, 7],
};

export const RULES: { id: string; title: string; text: string }[] = [
  {
    id: "R1",
    title: "Required credentials",
    text: "An assignment requires: active status, a permit or license valid on the assignment date, current background clearance, health clearance, mandated-reporter training within 12 months, district orientation complete.",
  },
  { id: "R2", title: "Same-assignment day cap", text: "T1 and T2 may serve at most 30 days in the same assignment; T3 and T4 have no cap." },
  {
    id: "R3",
    title: "Special education",
    text: "Special-education classes need the endorsement; without it, at most 20 days in the same assignment.",
  },
  {
    id: "R4",
    title: "Weekly hour cap",
    text: "Weekly hours for variable-hour staff: warn at 25 hours, block at 29 hours unless HR overrides with a reason.",
  },
  { id: "R5", title: "Retiree annual limit", text: "T4 retirees: district-set annual day limit; warn at 80 percent." },
  { id: "R6", title: "Exclusion list", text: "A substitute on a school's exclusion list is never offered that school." },
  {
    id: "R7",
    title: "Expiry monitoring",
    text: "A credential expiring within 60 days raises a task; an expired credential pauses matching until re-verified.",
  },
  { id: "R8", title: "Overrides", text: "Every override needs a named person, a reason and an audit event." },
];

export const CREDENTIAL_LABELS: Record<CredentialType, string> = {
  substitute_permit: "Substitute permit",
  teaching_license: "Teaching license",
  background_clearance: "Background clearance",
  health_clearance: "Health clearance",
  mandated_reporter: "Mandated-reporter training",
  district_orientation: "District orientation",
  sped_endorsement: "Special-education endorsement",
};

export const PAY_RULES = {
  daily: { T1: 140, T2: 160, T3: 190, T4: 200 } as Record<Tier, number>,
  halfDayRatio: 0.55,
  longTermFromDay: 11,
  longTermBonus: 40,
  hardToFillBonus: 25,
  lateCancelHours: 2,
  fullDayHours: 7,
  halfDayHours: 3.5,
  approvalWorkingDays: 2,
};

export const DISPATCH = {
  waveMinutes: 10,
  escalateMinutesBeforeBell: 60,
  noShowMinutesBeforeBell: 20,
  freeCancelHours: 12,
};
