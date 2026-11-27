/**
 * Deterministic synthetic seed: fictional Riverbend Unified School District.
 * 6 schools, 60 teachers, 120 substitutes, 30 days of history, 12 upcoming absences.
 * No real people, schools or student records.
 */
import {
  addDays,
  computePay,
  DEMO_START_TIME,
  DEMO_TODAY,
  schoolDays,
  type Absence,
  type AutomationRule,
  type ClassSection,
  type Credential,
  type GradeBand,
  type LessonPlan,
  type Period,
  type School,
  type Subject,
  type Substitute,
  type Teacher,
  type Tier,
  type User,
} from "@/domain";
import { KB_CHUNKS } from "./knowledge";
import { FIRST, LAST } from "./names";
import { int, mulberry32, pad, pick, sample } from "./prng";
import { STATE_VERSION, type DemoState } from "../state";
import { SYSTEM, nextId, reportAbsence, respondOffer } from "../commands";

export const DISTRICT_ID = "dist-riverbend";
export const DEMO_USERS = {
  substitute: "usr-maya",
  teacher: "usr-daniel",
  school_admin: "usr-grace",
  district_admin: "usr-jordan",
} as const;

function periods(bellStart: string): Period[] {
  const [h, m] = bellStart.split(":").map(Number);
  let t = h * 60 + m;
  const out: Period[] = [];
  for (let n = 1; n <= 6; n++) {
    const fmt = (x: number) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
    out.push({ n, label: `Period ${n}`, start: fmt(t), end: fmt(t + 55) });
    t += 60;
    if (n === 3) t += 30; // lunch
  }
  return out;
}

const SCHOOLS: Omit<School, "periods" | "district_id" | "excludedSubIds">[] = [
  { id: "sch-1", name: "Riverbend Elementary", short: "Riverbend ES", level: "Elementary", gradeBands: ["K-2", "3-5"], address: "100 Willow Lane, Riverbend", x: 3, y: 4, bellStart: "08:30", bellEnd: "14:55", hardToFill: false, arrivalNotes: "Park in the north lot; enter through the main office.", dutyNotes: "Morning bus duty at door B on Mondays.", budgetCode: "RB-ES-1100" },
  { id: "sch-2", name: "Cedar Hollow Elementary", short: "Cedar Hollow ES", level: "Elementary", gradeBands: ["K-2", "3-5"], address: "42 Cedar Road, Riverbend", x: 9, y: 3, bellStart: "08:30", bellEnd: "14:55", hardToFill: false, arrivalNotes: "Visitor badges at the front desk; buzz at the south door.", dutyNotes: "Recess duty 11:45-12:05.", budgetCode: "RB-ES-1200" },
  { id: "sch-3", name: "Cedar Hollow Middle School", short: "Cedar Hollow MS", level: "Middle", gradeBands: ["6-8"], address: "300 Ridge Avenue, Riverbend", x: 7, y: 7, bellStart: "08:00", bellEnd: "14:30", hardToFill: false, arrivalNotes: "Sign in at the main office; sub folders are in the blue tray.", dutyNotes: "Hallway duty between periods 3 and 4.", budgetCode: "RB-MS-2100" },
  { id: "sch-4", name: "Lakeside Middle School", short: "Lakeside MS", level: "Middle", gradeBands: ["6-8"], address: "8 Shoreline Drive, Riverbend", x: 12, y: 9, bellStart: "08:00", bellEnd: "14:30", hardToFill: true, arrivalNotes: "Use the east entrance; the office opens at 07:15.", dutyNotes: "Lunch duty in the cafeteria on Wednesdays.", budgetCode: "RB-MS-2200" },
  { id: "sch-5", name: "Riverbend High School", short: "Riverbend HS", level: "High", gradeBands: ["9-12"], address: "1 Scholar Way, Riverbend", x: 5, y: 11, bellStart: "07:45", bellEnd: "14:15", hardToFill: false, arrivalNotes: "Check in at Attendance, room A-101.", dutyNotes: "No duties assigned to substitutes.", budgetCode: "RB-HS-3100" },
  { id: "sch-6", name: "North Valley High School", short: "North Valley HS", level: "High", gradeBands: ["9-12"], address: "77 Valley Road, Riverbend", x: 14, y: 14, bellStart: "07:45", bellEnd: "14:15", hardToFill: true, arrivalNotes: "Main office is up the ramp past the gym.", dutyNotes: "Study hall supervision period 6 when assigned.", budgetCode: "RB-HS-3200" },
];

const ELEM_SUBJECTS: Subject[] = ["Elementary", "Elementary", "Elementary", "Elementary", "Elementary", "Elementary", "Special Education", "Art", "Music", "PE"];
const SEC_SUBJECTS: Subject[] = ["Science", "Math", "English", "Science", "Social Studies", "Spanish", "Special Education", "Art", "PE", "Computer Science"];

const AUTOMATIONS: AutomationRule[] = [
  { id: "W1", name: "Absence intake", trigger: "absence.reported", conditions: ["input valid", "approval required?"], actions: ["validate", "approve if required", "start matching"], enabled: true, params: {} },
  { id: "W2", name: "Offer waves and escalation", trigger: "offer unanswered / T-60 before bell", conditions: ["no response in waveMinutes", "unfilled at T-60"], actions: ["send next wave", "escalate with internal coverage plan"], enabled: true, params: { waveMinutes: 10, escalateMinutes: 60 } },
  { id: "W3", name: "Accepted -> Sub Brief", trigger: "assignment.accepted", conditions: [], actions: ["generate Sub Brief", "notify all", "add to calendars"], enabled: true, params: {} },
  { id: "W4", name: "No-show protocol", trigger: "no check-in at bell minus 20 min", conditions: ["assignment accepted", "no check-in"], actions: ["contact substitute", "mark no-show", "re-dispatch"], enabled: true, params: { minutesBeforeBell: 20 } },
  { id: "W5", name: "Day complete", trigger: "assignment.completed", conditions: [], actions: ["store day report", "create timesheet", "send Return Handoff"], enabled: true, params: {} },
  { id: "W6", name: "Credential expiry", trigger: "credential expiry at 60/30/7 days", conditions: ["credential verified", "expiry approaching or passed"], actions: ["remind", "pause matching if expired", "restore when re-verified"], enabled: true, params: { d1: 60, d2: 30, d3: 7 } },
  { id: "W7", name: "Pay period close", trigger: "pay period close", conditions: ["approved timesheets"], actions: ["anomaly scan", "human approval", "export"], enabled: true, params: {} },
  { id: "W8", name: "Nightly sweep", trigger: "nightly 02:00", conditions: [], actions: ["compliance sweep", "forecast", "knowledge freshness", "weekly digest"], enabled: true, params: {} },
];

function emptyState(): DemoState {
  return {
    version: STATE_VERSION,
    now: DEMO_START_TIME,
    counters: {},
    district: { id: DISTRICT_ID, name: "Riverbend Unified School District", region: "US", timezone: "America/Los_Angeles", dataResidency: "US (default)", rulePackId: "riverbend-permit-v1", approvalRequired: false, t4AnnualDayLimit: 100 },
    schools: [], users: [], teachers: [], substitutes: [], credentials: [], absences: [], offers: [], assignments: [], complianceChecks: [], lessonPlans: [], subBriefs: [], dayReports: [], handoffs: [], timesheets: [], payRuns: [], alerts: [], agentRuns: [], memories: [], kbChunks: [...KB_CHUNKS], kgNodes: [], kgEdges: [], audit: [], notifications: [], ratings: [], automations: AUTOMATIONS.map((a) => ({ ...a, params: { ...a.params } })), automationRuns: [], events: [], consents: [], supports: [], supportViews: [],
    aiSettings: { killSwitch: false, autonomy: { orchestrator: "act", intake: "act_with_review", credential_verifier: "act_with_review", matchmaker: "act", dispatcher: "act", lesson_continuity: "act", prep_coach: "act", compliance_sentinel: "act_with_review", payroll: "suggest", insights: "suggest", guardian: "act" }, spendCapUsd: 25, spentUsd: 0 },
  };
}

const email = (name: string) => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@riverbend.example`;

export function buildSeed(): DemoState {
  const r = mulberry32(42);
  const s = emptyState();
  s.schools = SCHOOLS.map((x) => ({ ...x, district_id: DISTRICT_ID, periods: periods(x.bellStart), excludedSubIds: [] }));

  // ---- substitutes ----
  const usedNames = new Set<string>(["Maya Rahman", "Daniel Ortiz", "Grace Kim", "Jordan Lee"]);
  const uniqueName = () => {
    for (;;) {
      const n = `${pick(r, FIRST)} ${pick(r, LAST)}`;
      if (!usedNames.has(n)) return usedNames.add(n), n;
    }
  };
  const allSubjects: Subject[] = ["Elementary", "English", "Math", "Science", "Social Studies", "Spanish", "Art", "Music", "PE", "Special Education", "Computer Science"];
  const bandsAll: GradeBand[] = ["K-2", "3-5", "6-8", "9-12"];
  for (let i = 1; i <= 120; i++) {
    const id = `sub-${pad(i)}`;
    const name = i === 1 ? "Maya Rahman" : i === 7 ? "Ethan Brooks" : uniqueName();
    const tier: Tier = i === 1 ? "T2" : pick(r, ["T1", "T2", "T2", "T3", "T3", "T4"] as Tier[]);
    const stage: Substitute["stage"] = i === 1 ? "active" : i > 110 ? (["applied", "applied", "documents", "documents", "verification", "verification", "orientation", "orientation", "applied", "documents"] as const)[i - 111] : "active";
    const b = int(r, 0, 2);
    const sub: Substitute = {
      id,
      district_id: DISTRICT_ID,
      name,
      email: email(name),
      phone: `+1-555-01${pad(i, 2).slice(-2)}-${pad(i, 4)}`,
      tier,
      stage,
      subjects: i === 1 ? ["Math", "Science", "Elementary", "English"] : Array.from(new Set([pick(r, allSubjects), pick(r, allSubjects), pick(r, ["Elementary", "Math", "English", "Science"] as Subject[])])),
      gradeBands: i === 1 ? ["3-5", "6-8"] : [bandsAll[b], bandsAll[b + 1]],
      preferredSchoolIds: i === 1 ? ["sch-3", "sch-2"] : sample(r, s.schools.map((x) => x.id), 2),
      availableDays: i === 1 ? [1, 2, 3, 4, 5] : sample(r, [1, 2, 3, 4, 5], int(r, 3, 5)).sort(),
      maxDistance: i === 1 ? 15 : int(r, 8, 22),
      x: i === 1 ? 6 : int(r, 0, 15),
      y: i === 1 ? 6 : int(r, 0, 15),
      languages: i === 1 ? ["en", "bn"] : r() < 0.25 ? ["en", "es"] : r() < 0.08 ? ["en", "bn"] : ["en"],
      reliability: i === 1 ? 0.97 : Math.round((0.78 + r() * 0.21) * 100) / 100,
      rating: i === 1 ? 4.8 : Math.round((3.6 + r() * 1.4) * 10) / 10,
      daysThisYear: i === 1 ? 41 : int(r, 0, tier === "T4" ? 85 : 60),
      offersLast30: i === 1 ? 9 : int(r, 0, 14),
      joinedAt: addDays(DEMO_TODAY, -int(r, 40, 900)),
    };
    s.substitutes.push(sub);
    s.users.push({ id: i === 1 ? DEMO_USERS.substitute : `usr-${id}`, district_id: DISTRICT_ID, name, email: sub.email, role: "substitute", substitute_id: id, language: sub.languages.includes("es") && i !== 1 ? "es" : "en" });
    s.consents.push({ id: `cns-${id}`, district_id: DISTRICT_ID, subjectId: id, purpose: "Background check and credential verification", basis: "Consent (substitute application)", grantedAt: `${sub.joinedAt}T12:00:00.000Z` });
    seedCredentials(s, sub, i, r);
  }

  // ---- teachers & staff ----
  let t = 0;
  for (const sc of s.schools) {
    const subjects = sc.level === "Elementary" ? ELEM_SUBJECTS : SEC_SUBJECTS;
    for (let k = 0; k < 10; k++) {
      t++;
      const id = `tch-${pad(t)}`;
      const name = sc.id === "sch-3" && k === 0 ? "Daniel Ortiz" : sc.id === "sch-3" && k === 1 ? "Priya Natarajan" : uniqueName();
      if (name === "Priya Natarajan") usedNames.add(name);
      const subject = sc.id === "sch-3" && k === 1 ? "Math" : subjects[k];
      const gradeBand: GradeBand = sc.level === "Elementary" ? (k % 2 === 0 ? "K-2" : "3-5") : sc.level === "Middle" ? "6-8" : "9-12";
      const classes: ClassSection[] =
        sc.level === "Elementary"
          ? [
              { id: `${id}-c1`, name: `${gradeBand === "K-2" ? "Grade 2" : "Grade 4"} ${subject === "Elementary" ? "Literacy" : subject}`, subject, gradeBand, period: 1, room: `${sc.short.slice(0, 1)}${100 + k}`, students: int(r, 18, 26) },
              { id: `${id}-c2`, name: `${gradeBand === "K-2" ? "Grade 2" : "Grade 4"} ${subject === "Elementary" ? "Math" : subject}`, subject, gradeBand, period: 3, room: `${sc.short.slice(0, 1)}${100 + k}`, students: int(r, 18, 26) },
              { id: `${id}-c3`, name: `${gradeBand === "K-2" ? "Grade 2" : "Grade 4"} ${subject === "Elementary" ? "Science" : subject}`, subject, gradeBand, period: 5, room: `${sc.short.slice(0, 1)}${100 + k}`, students: int(r, 18, 26) },
            ]
          : [1, 2, 3, 5, 6].map((p, j) => ({ id: `${id}-c${j + 1}`, name: `${subject} ${sc.level === "Middle" ? 6 + (j % 3) : 9 + (j % 4)}${String.fromCharCode(65 + j)}`, subject, gradeBand, period: p, room: `${200 + k * 2}`, students: int(r, 22, 32) }));
      const tch: Teacher = {
        id,
        district_id: DISTRICT_ID,
        school_id: sc.id,
        name,
        subject,
        gradeBand,
        classes,
        preferredSubIds: [],
        excludedSubIds: [],
        routines: pick(r, ["Bell-ringer question on the board for the first 5 minutes.", "Students collect folders from the crate by the door.", "Silent reading for 10 minutes after lunch.", "Table captains hand out materials."]),
        behaviorPlan: pick(r, ["Three-step reminders: nonverbal cue, quiet word, move seat. Praise specific effort.", "Class points jar: add a marble for on-task transitions.", "Use the calm corner pass; no phones out during work time."]),
        seatingNotes: "Seating chart is in the front of the sub folder.",
        language: r() < 0.2 ? "es" : "en",
      };
      s.teachers.push(tch);
      s.users.push({ id: name === "Daniel Ortiz" ? DEMO_USERS.teacher : `usr-${id}`, district_id: DISTRICT_ID, name, email: email(name), role: "teacher", school_id: sc.id, teacher_id: id, language: name === "Daniel Ortiz" ? "en" : tch.language });
    }
    const adminName = sc.id === "sch-3" ? "Grace Kim" : uniqueName();
    s.users.push({ id: sc.id === "sch-3" ? DEMO_USERS.school_admin : `usr-admin-${sc.id}`, district_id: DISTRICT_ID, name: adminName, email: email(adminName), role: "school_admin", school_id: sc.id, language: "en" });
  }
  s.users.push({ id: DEMO_USERS.district_admin, district_id: DISTRICT_ID, name: "Jordan Lee", email: "jordan.lee@riverbend.example", role: "district_admin", language: "en" });
  const hrName = uniqueName();
  s.users.push({ id: "usr-hr-2", district_id: DISTRICT_ID, name: hrName, email: email(hrName), role: "district_admin", language: "en" });

  // preferences and exclusion lists (sub-001 = Maya is preferred at Cedar Hollow MS)
  const active = s.substitutes.filter((x) => x.stage === "active");
  for (const tch of s.teachers) {
    const fits = active.filter((x) => x.subjects.includes(tch.subject) && x.gradeBands.includes(tch.gradeBand) && x.id !== "sub-001");
    tch.preferredSubIds = sample(r, fits, 2).map((x) => x.id);
  }
  const T = (id: string) => s.teachers.find((x) => x.id === id)!;
  T("tch-021").subject = "Science";
  T("tch-022").preferredSubIds.unshift("sub-001");
  T("tch-024").preferredSubIds.unshift("sub-001");
  T("tch-021").preferredSubIds.unshift("sub-001");
  T("tch-021").routines = "Lab notebooks are in the bins under the window. Bell-ringer on the board. Goggles on for any lab activity.";
  s.schools.find((x) => x.id === "sch-4")!.excludedSubIds.push("sub-015");
  T("tch-023").excludedSubIds.push("sub-022");

  // ---- lesson plans ----
  for (const tch of s.teachers) {
    if (r() < 0.72 || ["tch-021", "tch-022", "tch-023", "tch-024"].includes(tch.id))
      s.lessonPlans.push(emergencyPlan(tch, s.lessonPlans.length + 1));
  }
  s.lessonPlans.push(datedPlan(T("tch-022"), "plan-priya-1201", DEMO_TODAY, "Ratios and rates: unit pricing", ["Compare unit prices from grocery flyers", "Write ratios three ways", "Exit ticket: best buy"], ["Grocery flyer handout", "Calculators"]));
  s.lessonPlans.push(datedPlan(T("tch-021"), "plan-daniel-1202", addDays(DEMO_TODAY, 1), "Cells: plant vs animal under the microscope", ["Review microscope safety (5 min)", "Prepared slides: onion skin and cheek cells", "Venn diagram plant vs animal cells"], ["Microscopes (cart 2)", "Prepared slides", "Venn diagram worksheet"]));
  s.lessonPlans.push(datedPlan(T("tch-024"), "plan-tch024-1202", addDays(DEMO_TODAY, 1), "Forces and motion: ramps", ["Predict how ramp height changes speed", "Small-group ramp trials", "Graph results"], ["Ramps and toy cars", "Meter sticks", "Graph paper"]));

  // ---- need-to-know supports (action-phrased, no diagnoses) ----
  const sup = (id: string, teacher: string, classId: string, note: string, approved: boolean) => s.supports.push({ id, district_id: DISTRICT_ID, teacher_id: teacher, classId, note, approved, approvedBy: approved ? "Grace Kim" : undefined });
  sup("sup-1", "tch-022", "tch-022-c1", "One student sits near the front and may use noise-reducing headphones during independent work.", true);
  sup("sup-2", "tch-022", "tch-022-c2", "The nurse holds the action plan for a severe allergy; no food in class.", true);
  sup("sup-3", "tch-022", "tch-022-c3", "Allow a student to step out for a 2-minute water break with the hall pass.", false);
  sup("sup-4", "tch-021", "tch-021-c1", "Pair one student with a reading buddy for lab instructions.", true);
  sup("sup-5", "tch-024", "tch-024-c2", "Provide printed copies of board notes to one student at the front table.", true);

  // ---- 30 days of history ----
  seedHistory(s, r);

  // ---- memories ----
  const mem = (id: string, type: DemoState["memories"][number]["type"], scope: string, content: string, source: string, confidence: number, consentBasis: string, approved = true, expiresAt?: string) =>
    s.memories.push({ id, district_id: DISTRICT_ID, type, scope, content, source, confidence, consentBasis, approved, createdAt: `${addDays(DEMO_TODAY, -3)}T10:00:00.000Z`, expiresAt });
  mem("mem-1", "episodic", "substitute:sub-001", "Prefers middle-school Math and Science; covered Cedar Hollow MS 6 times this term with 5-star feedback.", "assignment history + ratings", 0.92, "Legitimate interest (employment)", true, "2027-06-30T00:00:00.000Z");
  mem("mem-2", "episodic", "school:sch-3", "Sub folders are in the blue tray in the main office; front desk opens 07:15.", "school preferences (Grace Kim)", 0.99, "District policy", true, "2027-06-30T00:00:00.000Z");
  mem("mem-3", "semantic", "district", "Rule pack riverbend-permit-v1: permit model, T1/T2 30-day cap, 25/29 weekly hour thresholds.", "docs/knowledge-base.md#compliance-rules", 1, "District policy", true);
  mem("mem-4", "semantic", "district", "Pay rules: T1 $140, T2 $160, T3 $190, T4 $200; half day 55%; +$40 from day 11; +$25 hard-to-fill.", "docs/knowledge-base.md#pay-rules", 1, "District policy", true);
  mem("mem-5", "procedural", "district", "Playbook (proposed by Dispatcher): for same-day Science absences at Cedar Hollow MS, send waves 1 and 2 together and include lab-certified substitutes first.", "agent proposal (dispatcher)", 0.74, "District policy", false);
  mem("mem-6", "episodic", "teacher:tch-021", "Daniel Ortiz asks that lab activities are swapped for the video lesson when the sub has no lab safety training.", "teacher preferences", 0.95, "Consent (teacher)", true, "2027-06-30T00:00:00.000Z");
  mem("mem-7", "working", "conversation:prep-coach", "Current Prep Coach session context (expires on completion).", "prep coach", 1, "Task context", true, `${DEMO_TODAY}T23:59:00.000Z`);

  // ---- 12 upcoming absences (through the real command path) ----
  const absences: { teacher: string; start: string; end?: string; part?: Absence["dayPart"]; reason: Absence["reason"]; fill?: string | "top"; plan?: string; notes: string }[] = [
    { teacher: "tch-022", start: DEMO_TODAY, reason: "illness", plan: "plan-priya-1201", notes: "Sick today. Plan is in the folder: unit pricing." },
    { teacher: "tch-024", start: addDays(DEMO_TODAY, 1), reason: "professional_development", plan: "plan-tch024-1202", notes: "District science PD." },
    { teacher: "tch-023", start: DEMO_TODAY, reason: "family", fill: "top", notes: "Family matter." },
    { teacher: "tch-003", start: DEMO_TODAY, reason: "illness", fill: "top", notes: "" },
    { teacher: "tch-043", start: DEMO_TODAY, reason: "illness", notes: "Same-day: essay plan is on the desk." },
    { teacher: "tch-014", start: addDays(DEMO_TODAY, 2), end: addDays(DEMO_TODAY, 4), reason: "jury_duty", fill: "top", notes: "Jury duty, three days." },
    { teacher: "tch-032", start: addDays(DEMO_TODAY, 1), part: "am", reason: "personal", notes: "Morning appointment, back after lunch." },
    { teacher: "tch-057", start: addDays(DEMO_TODAY, 3), reason: "professional_development", notes: "Special-education conference." },
    { teacher: "tch-042", start: addDays(DEMO_TODAY, 6), end: addDays(DEMO_TODAY, 17), reason: "family", fill: "top", notes: "Family leave, ten school days (long-term)." },
    { teacher: "tch-012", start: addDays(DEMO_TODAY, 3), reason: "personal", fill: "sub-001", notes: "Grade 4 field-trip prep day." },
    { teacher: "tch-035", start: addDays(DEMO_TODAY, 7), reason: "professional_development", notes: "" },
    { teacher: "tch-052", start: addDays(DEMO_TODAY, 9), reason: "illness", notes: "Planned surgery." },
  ];
  for (const a of absences) {
    const res = reportAbsence(s, SYSTEM, { teacher_id: a.teacher, startDate: a.start, endDate: a.end ?? a.start, dayPart: a.part ?? "full", periods: [], reason: a.reason, notes: a.notes, planId: a.plan, reportedVia: "seed" });
    if (!res.ok || !a.fill) continue;
    const offers = s.offers.filter((o) => o.absence_id === res.value.id && o.status === "pending");
    let offer = a.fill === "top" ? offers.filter((o) => o.substitute_id !== "sub-001")[0] : offers.find((o) => o.substitute_id === a.fill);
    if (!offer && a.fill !== "top") {
      // ensure Maya receives an offer for her pre-accepted job
      const abs = res.value;
      s.offers.push({ id: nextId(s, "ofr"), district_id: DISTRICT_ID, absence_id: abs.id, substitute_id: a.fill, wave: 1, status: "pending", score: 88, reasons: ["Teaches Elementary, grades 3-5", "Reliability 97%", "3.2 mi away"], pay: 160, distance: 3.2, sentAt: s.now });
      offer = s.offers[s.offers.length - 1];
    }
    if (offer) respondOffer(s, SYSTEM, offer.id, true);
  }
  // Maya should not see offers for jobs other subs hold; ensure she has the two J2 offers
  s.notifications = s.notifications.slice(-80);
  return s;
}

function seedCredentials(s: DemoState, sub: Substitute, i: number, r: () => number) {
  const c = (type: Credential["type"], issue: string, expiry: string | undefined, status: Credential["status"], extra: Partial<Credential> = {}) =>
    s.credentials.push({ id: `cred-${sub.id}-${type}`, district_id: DISTRICT_ID, substitute_id: sub.id, type, number: `${type.slice(0, 3).toUpperCase()}-${pad(i, 5)}`, issuer: type === "substitute_permit" || type === "teaching_license" || type === "sped_endorsement" ? "State Commission on Teacher Credentialing (sample)" : type === "background_clearance" ? "State DOJ fingerprint service (sample)" : "Riverbend USD", issueDate: issue, expiryDate: expiry, status, confidence: status === "verified" ? 0.97 : 0.7, documentName: `${type}.pdf`, verifiedBy: status === "verified" ? "HR: Jordan Lee" : undefined, verifiedAt: status === "verified" ? `${issue}T15:00:00.000Z` : undefined, ...extra });
  if (sub.stage === "applied") return;
  const T0 = DEMO_TODAY;
  const yearsAgo = (n: number) => addDays(T0, -Math.round(n * 365));
  const lic = sub.tier === "T3" || sub.tier === "T4" ? "teaching_license" : "substitute_permit";
  const pending = sub.stage === "documents" || sub.stage === "verification";
  // expiry scenarios
  const expiringHealth = i % 17 === 3 || i === 9;
  const expiredPermit = i % 23 === 5 && sub.stage === "active";
  c(lic, yearsAgo(2), expiredPermit ? addDays(T0, -int0(r, 3, 20)) : addDays(T0, 300 + Math.floor(r() * 700)), pending ? "pending" : "verified");
  if (sub.stage === "documents") return;
  c("background_clearance", yearsAgo(1.5), addDays(T0, 400 + Math.floor(r() * 500)), sub.stage === "verification" ? "pending" : "verified");
  c("health_clearance", yearsAgo(1), expiringHealth ? addDays(T0, [5, 25, 45, 58][i % 4]) : addDays(T0, 200 + Math.floor(r() * 600)), sub.stage === "verification" ? "pending" : "verified");
  if (sub.stage === "verification") return;
  c("mandated_reporter", addDays(T0, -int0(r, 30, 300)), undefined, "verified");
  if (sub.stage === "orientation") return;
  c("district_orientation", yearsAgo(1), undefined, "verified");
  if (sub.subjects.includes("Special Education") && r() < 0.6) c("sped_endorsement", yearsAgo(3), addDays(T0, 500), "verified");
  if (expiredPermit) {
    sub.stage = "paused";
    sub.pauseReason = "Expired credential (R7)";
  }
  if (i === 7)
    s.credentials.push({ id: "cred-sub-007-bg-new", district_id: DISTRICT_ID, substitute_id: sub.id, type: "background_clearance", number: "BAC-00007-R", issuer: "State DOJ fingerprint service (sample)", issueDate: addDays(T0, -4), expiryDate: addDays(T0, 726), status: "needs_review", confidence: 0.62, documentName: "background_renewal_scan.jpg", reviewNote: 'Name on document "E. Brookes" does not match "Ethan Brooks"; issuer seal partially obscured.' });
  if (i === 1) {
    // Maya: health clearance renews in 52 days -> R7 reminder task
    const h = s.credentials.find((x) => x.id === "cred-sub-001-health_clearance")!;
    h.expiryDate = addDays(T0, 52);
  }
}
function int0(r: () => number, lo: number, hi: number) {
  return lo + Math.floor(r() * (hi - lo + 1));
}

function emergencyPlan(t: Teacher, n: number): LessonPlan {
  return {
    id: `plan-em-${t.id}`,
    district_id: DISTRICT_ID,
    teacher_id: t.id,
    title: `Emergency plan ${n % 3 === 0 ? "C" : n % 2 === 0 ? "B" : "A"}: ${t.subject} review day`,
    emergency: true,
    source: "seed",
    periods: t.classes.map((c) => ({
      period: c.period,
      className: c.name,
      objective: `Review and practice recent ${t.subject} concepts independently.`,
      activities: ["5 min: bell-ringer from the board", "25 min: review packet in the sub folder", "15 min: partner check and discussion", "5 min: exit ticket"],
      materials: ["Review packets (sub folder)", "Exit tickets"],
      minutes: 55,
      differentiation: "Starred questions for early finishers; read directions aloud for students who ask.",
    })),
    updatedAt: `${addDays(DEMO_TODAY, -20)}T16:00:00.000Z`,
  };
}

function datedPlan(t: Teacher, id: string, date: string, title: string, activities: string[], materials: string[]): LessonPlan {
  return {
    id,
    district_id: DISTRICT_ID,
    teacher_id: t.id,
    title,
    date,
    emergency: false,
    source: "paste",
    periods: t.classes.map((c) => ({ period: c.period, className: c.name, objective: title, activities, materials, minutes: 55, differentiation: "Pair students strategically; offer a worked example card." })),
    updatedAt: `${addDays(DEMO_TODAY, -1)}T18:00:00.000Z`,
  };
}

function seedHistory(s: DemoState, r: () => number) {
  const days = schoolDays(addDays(DEMO_TODAY, -30), addDays(DEMO_TODAY, -1));
  const active = s.substitutes.filter((x) => x.stage === "active");
  let n = 0;
  for (const d of days) {
    const count = 4 + Math.floor(r() * 4);
    const usedSubs = new Set<string>();
    const usedTeachers = new Set<string>();
    for (let k = 0; k < count; k++) {
      const tch = s.teachers[Math.floor(r() * s.teachers.length)];
      if (usedTeachers.has(tch.id) || tch.id === "tch-021") continue;
      usedTeachers.add(tch.id);
      const school = s.schools.find((x) => x.id === tch.school_id)!;
      const fits = active.filter((x) => !usedSubs.has(x.id) && x.subjects.includes(tch.subject) && x.gradeBands.includes(tch.gradeBand));
      n++;
      const absId = `abs-h${pad(n, 4)}`;
      const unfilled = r() < 0.05 || !fits.length;
      const sub = d >= addDays(DEMO_TODAY, -14) && tch.school_id === "sch-3" && s.substitutes[0].subjects.includes(tch.subject) && !usedSubs.has("sub-001") && r() < 0.5 ? s.substitutes[0] : fits[Math.floor(r() * fits.length)];
      const paidPeriod = d < "2026-11-16";
      s.absences.push({ id: absId, district_id: DISTRICT_ID, school_id: school.id, teacher_id: tch.id, startDate: d, endDate: d, dayPart: r() < 0.15 ? "am" : "full", periods: [], reason: pick(r, ["illness", "illness", "family", "professional_development", "personal"] as const), noticeType: r() < 0.4 ? "same_day" : "planned", status: unfilled ? "cancelled" : paidPeriod ? "paid" : "completed", notes: "", reportedVia: "seed", createdAt: `${addDays(d, -1)}T19:00:00.000Z`, filledAt: unfilled ? undefined : `${addDays(d, -1)}T19:${pad(2 + Math.floor(r() * 30), 2)}:00.000Z`, currentWave: 1 + Math.floor(r() * 2), sped: tch.subject === "Special Education", cancelReason: unfilled ? "Unfilled: covered internally" : undefined });
      if (unfilled || !sub) continue;
      usedSubs.add(sub.id);
      const abs = s.absences[s.absences.length - 1];
      const asgId = `asg-h${pad(n, 4)}`;
      s.assignments.push({ id: asgId, district_id: DISTRICT_ID, absence_id: absId, substitute_id: sub.id, school_id: school.id, date: d, dayPart: abs.dayPart, status: "completed", dayNumber: 1, complianceCheckId: `chk-h${pad(n, 4)}`, acceptedAt: abs.filledAt!, checkInAt: `${d}T07:${pad(10 + Math.floor(r() * 30), 2)}:00.000Z`, checkOutAt: `${d}T15:05:00.000Z` });
      s.complianceChecks.push({ id: `chk-h${pad(n, 4)}`, district_id: DISTRICT_ID, substitute_id: sub.id, absence_id: absId, date: d, passed: true, violations: [], warnings: [], checkedAt: abs.filledAt! });
      const pay = computePay({ tier: sub.tier, dayPart: abs.dayPart, dayNumber: 1, hardToFill: school.hardToFill });
      const pending = d >= addDays(DEMO_TODAY, -5);
      const tsStatus = paidPeriod ? "exported" : pending && (school.id === "sch-3" || r() < 0.3) ? "submitted" : "approved";
      s.timesheets.push({ id: `ts-h${pad(n, 4)}`, district_id: DISTRICT_ID, assignment_id: asgId, substitute_id: sub.id, school_id: school.id, date: d, dayPart: abs.dayPart, hours: pay.hours, rate: pay.rate, lines: pay.lines, amount: pay.amount, status: tsStatus, anomalies: [], budgetCode: school.budgetCode, payRunId: paidPeriod ? "run-pay-2026-11a" : undefined, approvedBy: tsStatus === "submitted" ? undefined : "School admin", createdAt: `${d}T15:05:00.000Z` });
      if (r() < 0.6) s.ratings.push({ id: `rat-h${pad(n, 4)}`, district_id: DISTRICT_ID, assignment_id: asgId, from: `usr-admin-${school.id}`, toSubstituteId: sub.id, score: Math.min(5, Math.max(2, Math.round(sub.rating + (r() - 0.5)))), comment: "", at: `${d}T16:00:00.000Z` });
    }
  }
  // seeded anomaly: a duplicate timesheet for payroll review (J4)
  const dupSrc = s.timesheets.find((x) => x.status === "approved")!;
  s.timesheets.push({ ...dupSrc, id: "ts-dup-0001", createdAt: dupSrc.createdAt, anomalies: [{ code: "duplicate", message: "Another timesheet exists for the same assignment." }] });
  const rateSrc = s.timesheets.filter((x) => x.status === "approved")[3];
  if (rateSrc) {
    rateSrc.rate = rateSrc.rate + 15;
    rateSrc.amount = rateSrc.amount + 15;
    rateSrc.anomalies = [{ code: "rate_mismatch", message: `Rate $${rateSrc.rate} does not match the tier rate.` }];
  }
  const exported = s.timesheets.filter((x) => x.payRunId === "run-pay-2026-11a");
  s.payRuns.push({ id: "run-pay-2026-11a", district_id: DISTRICT_ID, periodStart: "2026-11-01", periodEnd: "2026-11-15", status: "exported", timesheetIds: exported.map((x) => x.id), total: Math.round(exported.reduce((a, x) => a + x.amount, 0) * 100) / 100, createdAt: "2026-11-16T09:00:00.000Z", approvedBy: "Jordan Lee" });
  // compliance alerts from the sweep
  for (const sub of s.substitutes) {
    for (const c of s.credentials.filter((x) => x.substitute_id === sub.id && x.expiryDate)) {
      const left = Math.round((new Date(`${c.expiryDate}T00:00:00Z`).getTime() - new Date(`${DEMO_TODAY}T00:00:00Z`).getTime()) / 86400000);
      if (left <= 60) s.alerts.push({ id: `alr-${c.id}`, district_id: DISTRICT_ID, substitute_id: sub.id, ruleId: "R7", severity: left < 0 ? "block" : "warn", message: left < 0 ? `${labelOf(c.type)} expired ${-left} days ago: matching paused` : `${labelOf(c.type)} expires in ${left} days`, status: "open", createdAt: `${DEMO_TODAY}T02:00:00.000Z` });
    }
    if (s.credentials.some((x) => x.substitute_id === sub.id && x.status === "needs_review"))
      s.alerts.push({ id: `alr-review-${sub.id}`, district_id: DISTRICT_ID, substitute_id: sub.id, ruleId: "R1", severity: "warn", message: "Background clearance needs HR review: name mismatch, low confidence (0.62)", status: "open", createdAt: `${DEMO_TODAY}T02:00:00.000Z` });
    if (sub.daysThisYear >= 80 && sub.tier === "T4") s.alerts.push({ id: `alr-r5-${sub.id}`, district_id: DISTRICT_ID, substitute_id: sub.id, ruleId: "R5", severity: "warn", message: `Retiree at ${sub.daysThisYear} of 100 annual days (80% warning)`, status: "open", createdAt: `${DEMO_TODAY}T02:00:00.000Z` });
  }
}

const LABELS: Record<string, string> = { substitute_permit: "Substitute permit", teaching_license: "Teaching license", background_clearance: "Background clearance", health_clearance: "Health clearance", mandated_reporter: "Mandated-reporter training", district_orientation: "District orientation", sped_endorsement: "Special-education endorsement" };
const labelOf = (t: string) => LABELS[t] ?? t;

export type { User };
