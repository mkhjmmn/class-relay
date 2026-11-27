# docs/knowledge-base.md - domain knowledge seed for ClassRelay (seeded in the workspace before the run)
Purpose: seeds the product knowledge base (vector store and knowledge graph), the rules engine and the agents' semantic memory. Everything below is a synthetic sample for the fictional Riverbend Unified School District. Real rules differ by state and district: before production use, replace each pack with the official source, record its URL, version and effective date, and have district HR approve it.

## 1. Glossary
- Absence: a teacher's time away that needs coverage (full day, half day or single periods).
- Assignment: one substitute covering one absence day at one school.
- Fill rate: filled absence days divided by absence days that needed a substitute.
- Time-to-fill: minutes from absence reported to assignment accepted.
- Day-to-day substitute: covers short absences. Long-term substitute: stays with the same class for many consecutive days.
- Building substitute: based at one school every day and placed where needed.
- Preferred list / exclusion list: substitutes a teacher or school asks for first / asks not to receive.
- Sub Brief: the preparation pack a substitute receives. Return Handoff: the summary the teacher receives.
- Emergency plans: ready-to-use lesson plans kept on file for unplanned absences.
- Need-to-know supports: the minimum information needed to keep a student safe and included that day.

## 2. Credential model
Credential record: type, number, issuer, issue date, expiry date, document, verification status, verified by, verified at.
Types in the sample pack: substitute permit; full teaching license; background clearance (fingerprint-based); health clearance; mandated-reporter training; district orientation; special-education endorsement.
Tiers for pay and eligibility: T1 permit holder; T2 degree holder with permit; T3 licensed teacher; T4 retired licensed teacher.
Rule pack archetypes (one per jurisdiction; every parameter is editable):
- Permit model: a state-issued substitute permit is required (pattern used by states such as California).
- District-discretion model: the district sets minimum education and training (pattern used by states such as Texas).
- Day-cap model: substitutes without a full license are capped at a number of days per school year (pattern used by states such as New York).
The Riverbend sample pack is the permit model with the day caps below. UI label: "Sample rule pack - verify with your state education agency".

## 3. Compliance rules (sample, parameterized)
R1 An assignment requires: active status, a permit or license valid on the assignment date, current background clearance, health clearance, mandated-reporter training within 12 months, district orientation complete.
R2 T1 and T2 may serve at most 30 days in the same assignment; T3 and T4 have no cap.
R3 Special-education classes need the endorsement; without it, at most 20 days in the same assignment.
R4 Weekly hours for variable-hour staff: warn at 25 hours, block at 29 hours unless HR overrides with a reason.
R5 T4 retirees: district-set annual day limit; warn at 80 percent.
R6 A substitute on a school's exclusion list is never offered that school.
R7 A credential expiring within 60 days raises a task; an expired credential pauses matching until re-verified.
R8 Every override needs a named person, a reason and an audit event.

## 4. Pay rules (sample)
Daily rates: T1 $140, T2 $160, T3 $190, T4 $200. Half day: 55 percent of the daily rate. Long-term rate: plus $40 per day from day 11 of the same assignment. Hard-to-fill bonus: plus $25 for schools or dates flagged by the district. Cancellation by the school inside 2 hours of the start: half-day pay. Pay periods: day 1 to 15 and day 16 to month end. Timesheets need school-admin approval within 2 working days.

## 5. Scheduling and dispatch policy (sample)
Absence types: planned (48 hours or more notice), short notice, same day. Offer waves: wave 1 the teacher's preferred substitutes (10 minutes), wave 2 substitutes with good history at the school (10 minutes), wave 3 the whole qualified pool. Same-day absences send waves 1 and 2 together. Unfilled 60 minutes before the first bell: alert the school admin and propose an internal coverage plan. No check-in 20 minutes before the bell: contact the substitute, then re-dispatch. A substitute may cancel without penalty up to 12 hours before the start; later cancellations enter reliability history with the reason.

## 6. Classroom continuity standards
Sub Brief sections: day at a glance; period-by-period plan with objective, activities, materials and timing; classroom routines; need-to-know supports; emergency procedures; who to call; arrival notes.
End-of-day report fields: what was covered in each period, what was not and why, attendance notes, behavior notes (facts only), materials used or needed, message for the teacher.
Return Handoff: what was taught, gaps, a suggested first lesson back, items needing follow-up.
Every teacher keeps three days of emergency plans on file; the coverage meter shows who is missing them.

## 7. Student information rules
Share only need-to-know supports, written as actions ("seat near the front", "the nurse holds the action plan for a severe allergy"). Never share diagnoses, grades, discipline history or family details. A school admin approves each support note. Access opens 12 hours before the assignment and closes when it ends; every view is logged.

## 8. Responsible-AI policy
AI recommends; people decide on credential rejection, removal from the pool, payroll finalization and policy changes. Matching may not use age, gender, race, religion, disability, national origin or any proxy for them. Reliability scores use only attendance, punctuality, cancellations and school feedback; they are visible to the substitute and can be appealed. Every AI output shows reasons, sources and confidence.

## 9. KPI definitions
Fill rate and time-to-fill as in the glossary. Credential compliance: assignments passing R1-R7 at start time divided by all assignments. Lesson continuity score: planned lesson steps reported as covered divided by planned steps. Timesheet cycle time: hours from check-out to payroll export.

## 10. Riverbend sample handbook (for the Prep Coach)
Arrive 30 minutes before the first bell and sign in at the main office with photo ID. Collect the sub folder and room key. Take attendance in the first 10 minutes of each period and send it to the office. Students leave the room only with a pass. Fire drill: follow the map by the door, take the class list, count students outside. Lockdown: lock the door, lights off, students away from windows, wait for the all-clear. Medical concern: call the office on extension 100; never give medication. End of day: leave the room tidy, return the key and complete the end-of-day report.
