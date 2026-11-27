/** Knowledge-base chunks seeded from docs/knowledge-base.md (synthetic sample for Riverbend USD). */
import type { KbChunk } from "@/domain";

const D = "dist-riverbend";
const base = { district_id: D, version: "1.0.0", effectiveDate: "2026-08-01", reviewBy: "2027-07-31" };

const raw: [string, string, string][] = [
  ["kb-gloss-1", "Glossary", "Absence: a teacher's time away that needs coverage (full day, half day or single periods). Assignment: one substitute covering one absence day at one school."],
  ["kb-gloss-2", "Glossary", "Fill rate: filled absence days divided by absence days that needed a substitute. Time-to-fill: minutes from absence reported to assignment accepted."],
  ["kb-gloss-3", "Glossary", "Sub Brief: the preparation pack a substitute receives. Return Handoff: the summary the teacher receives. Emergency plans: ready-to-use lesson plans kept on file for unplanned absences."],
  ["kb-gloss-4", "Glossary", "Need-to-know supports: the minimum information needed to keep a student safe and included that day. Preferred list / exclusion list: substitutes a teacher or school asks for first / asks not to receive."],
  ["kb-cred-1", "Credential model", "Credential types in the sample pack: substitute permit; full teaching license; background clearance (fingerprint-based); health clearance; mandated-reporter training; district orientation; special-education endorsement."],
  ["kb-cred-2", "Credential model", "Tiers for pay and eligibility: T1 permit holder; T2 degree holder with permit; T3 licensed teacher; T4 retired licensed teacher. The Riverbend sample pack is the permit model with day caps."],
  ["kb-rule-R1", "Compliance rules", "R1 An assignment requires: active status, a permit or license valid on the assignment date, current background clearance, health clearance, mandated-reporter training within 12 months, district orientation complete."],
  ["kb-rule-R2", "Compliance rules", "R2 T1 and T2 may serve at most 30 days in the same assignment; T3 and T4 have no cap. R3 Special-education classes need the endorsement; without it, at most 20 days in the same assignment."],
  ["kb-rule-R4", "Compliance rules", "R4 Weekly hours for variable-hour staff: warn at 25 hours, block at 29 hours unless HR overrides with a reason. R5 T4 retirees: district-set annual day limit; warn at 80 percent."],
  ["kb-rule-R6", "Compliance rules", "R6 A substitute on a school's exclusion list is never offered that school. R7 A credential expiring within 60 days raises a task; an expired credential pauses matching until re-verified. R8 Every override needs a named person, a reason and an audit event."],
  ["kb-pay-1", "Pay rules", "Daily rates: T1 $140, T2 $160, T3 $190, T4 $200. Half day: 55 percent of the daily rate. Long-term rate: plus $40 per day from day 11 of the same assignment. Hard-to-fill bonus: plus $25 for schools or dates flagged by the district."],
  ["kb-pay-2", "Pay rules", "Cancellation by the school inside 2 hours of the start: half-day pay. Pay periods: day 1 to 15 and day 16 to month end. Timesheets need school-admin approval within 2 working days."],
  ["kb-dispatch-1", "Scheduling and dispatch", "Offer waves: wave 1 the teacher's preferred substitutes (10 minutes), wave 2 substitutes with good history at the school (10 minutes), wave 3 the whole qualified pool. Same-day absences send waves 1 and 2 together."],
  ["kb-dispatch-2", "Scheduling and dispatch", "Unfilled 60 minutes before the first bell: alert the school admin and propose an internal coverage plan. No check-in 20 minutes before the bell: contact the substitute, then re-dispatch."],
  ["kb-dispatch-3", "Scheduling and dispatch", "A substitute may cancel without penalty up to 12 hours before the start; later cancellations enter reliability history with the reason."],
  ["kb-cont-1", "Classroom continuity", "Sub Brief sections: day at a glance; period-by-period plan with objective, activities, materials and timing; classroom routines; need-to-know supports; emergency procedures; who to call; arrival notes."],
  ["kb-cont-2", "Classroom continuity", "End-of-day report fields: what was covered in each period, what was not and why, attendance notes, behavior notes (facts only), materials used or needed, message for the teacher."],
  ["kb-cont-3", "Classroom continuity", "Return Handoff: what was taught, gaps, a suggested first lesson back, items needing follow-up. Every teacher keeps three days of emergency plans on file; the coverage meter shows who is missing them."],
  ["kb-student-1", "Student information rules", "Share only need-to-know supports, written as actions. Never share diagnoses, grades, discipline history or family details. A school admin approves each support note. Access opens 12 hours before the assignment and closes when it ends; every view is logged."],
  ["kb-rai-1", "Responsible-AI policy", "AI recommends; people decide on credential rejection, removal from the pool, payroll finalization and policy changes. Matching may not use age, gender, race, religion, disability, national origin or any proxy for them."],
  ["kb-rai-2", "Responsible-AI policy", "Reliability scores use only attendance, punctuality, cancellations and school feedback; they are visible to the substitute and can be appealed. Every AI output shows reasons, sources and confidence."],
  ["kb-kpi-1", "KPI definitions", "Credential compliance: assignments passing R1-R7 at start time divided by all assignments. Lesson continuity score: planned lesson steps reported as covered divided by planned steps. Timesheet cycle time: hours from check-out to payroll export."],
  ["kb-hb-1", "Riverbend handbook", "Arrive 30 minutes before the first bell and sign in at the main office with photo ID. Collect the sub folder and room key."],
  ["kb-hb-2", "Riverbend handbook", "Take attendance in the first 10 minutes of each period and send it to the office. Students leave the room only with a pass."],
  ["kb-hb-3", "Riverbend handbook", "Fire drill: follow the map by the door, take the class list, count students outside. Lockdown: lock the door, lights off, students away from windows, wait for the all-clear."],
  ["kb-hb-4", "Riverbend handbook", "Medical concern: call the office on extension 100; never give medication. End of day: leave the room tidy, return the key and complete the end-of-day report."],
];

export const KB_CHUNKS: KbChunk[] = raw.map(([id, section, text]) => ({
  ...base,
  id,
  section,
  text,
  source: `docs/knowledge-base.md#${section.toLowerCase().replace(/[^a-z]+/g, "-")}`,
  // one stale source to demonstrate freshness alerts
  ...(id === "kb-dispatch-3" ? { version: "0.9.0", effectiveDate: "2025-08-01", reviewBy: "2026-07-31" } : {}),
}));
