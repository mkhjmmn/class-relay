/**
 * ClassRelay shared domain schemas (single source of truth).
 * Owned by the lead. Sub-agents import from here and never edit it:
 * request changes in docs/HANDOFF.md.
 * Every entity carries district_id (tenant isolation, mirrored by RLS in supabase/migrations).
 */
import { z } from "zod";

export const Id = z.string().min(1);
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
export const IsoDateTime = z.string().min(10);

export const RoleSchema = z.enum(["substitute", "teacher", "school_admin", "district_admin"]);
export type Role = z.infer<typeof RoleSchema>;

export const LanguageSchema = z.enum(["en", "bn", "es"]);
export type Language = z.infer<typeof LanguageSchema>;

export const TierSchema = z.enum(["T1", "T2", "T3", "T4"]);
export type Tier = z.infer<typeof TierSchema>;

export const GradeBandSchema = z.enum(["K-2", "3-5", "6-8", "9-12"]);
export type GradeBand = z.infer<typeof GradeBandSchema>;

export const SubjectSchema = z.enum([
  "Elementary",
  "English",
  "Math",
  "Science",
  "Social Studies",
  "Spanish",
  "Art",
  "Music",
  "PE",
  "Special Education",
  "Computer Science",
]);
export type Subject = z.infer<typeof SubjectSchema>;

export const DistrictSchema = z.object({
  id: Id,
  name: z.string(),
  region: z.string(),
  timezone: z.string(),
  dataResidency: z.string(),
  rulePackId: z.string(),
  approvalRequired: z.boolean(),
  t4AnnualDayLimit: z.number().int(),
});
export type District = z.infer<typeof DistrictSchema>;

export const PeriodSchema = z.object({
  n: z.number().int(),
  label: z.string(),
  start: z.string(), // HH:MM
  end: z.string(),
});
export type Period = z.infer<typeof PeriodSchema>;

export const SchoolSchema = z.object({
  id: Id,
  district_id: Id,
  name: z.string(),
  short: z.string(),
  level: z.enum(["Elementary", "Middle", "High"]),
  gradeBands: z.array(GradeBandSchema),
  address: z.string(),
  x: z.number(), // synthetic map coordinates in miles
  y: z.number(),
  bellStart: z.string(),
  bellEnd: z.string(),
  periods: z.array(PeriodSchema),
  hardToFill: z.boolean(),
  arrivalNotes: z.string(),
  dutyNotes: z.string(),
  budgetCode: z.string(),
  excludedSubIds: z.array(Id),
});
export type School = z.infer<typeof SchoolSchema>;

export const UserSchema = z.object({
  id: Id,
  district_id: Id,
  name: z.string(),
  email: z.string(),
  role: RoleSchema,
  school_id: Id.optional(),
  teacher_id: Id.optional(),
  substitute_id: Id.optional(),
  language: LanguageSchema,
});
export type User = z.infer<typeof UserSchema>;

export const ClassSectionSchema = z.object({
  id: Id,
  name: z.string(),
  subject: SubjectSchema,
  gradeBand: GradeBandSchema,
  period: z.number().int(),
  room: z.string(),
  students: z.number().int(),
});
export type ClassSection = z.infer<typeof ClassSectionSchema>;

export const TeacherSchema = z.object({
  id: Id,
  district_id: Id,
  school_id: Id,
  name: z.string(),
  subject: SubjectSchema,
  gradeBand: GradeBandSchema,
  classes: z.array(ClassSectionSchema),
  preferredSubIds: z.array(Id),
  excludedSubIds: z.array(Id),
  routines: z.string(),
  behaviorPlan: z.string(),
  seatingNotes: z.string(),
  language: LanguageSchema,
});
export type Teacher = z.infer<typeof TeacherSchema>;

export const PipelineStageSchema = z.enum(["applied", "documents", "verification", "orientation", "active", "paused"]);
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const SubstituteSchema = z.object({
  id: Id,
  district_id: Id,
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  tier: TierSchema,
  stage: PipelineStageSchema,
  subjects: z.array(SubjectSchema),
  gradeBands: z.array(GradeBandSchema),
  preferredSchoolIds: z.array(Id),
  availableDays: z.array(z.number().int().min(0).max(6)), // 0=Sun
  maxDistance: z.number(),
  x: z.number(),
  y: z.number(),
  languages: z.array(LanguageSchema),
  reliability: z.number().min(0).max(1),
  rating: z.number().min(0).max(5),
  daysThisYear: z.number().int(),
  offersLast30: z.number().int(),
  joinedAt: IsoDate,
  pauseReason: z.string().optional(),
});
export type Substitute = z.infer<typeof SubstituteSchema>;

export const CredentialTypeSchema = z.enum([
  "substitute_permit",
  "teaching_license",
  "background_clearance",
  "health_clearance",
  "mandated_reporter",
  "district_orientation",
  "sped_endorsement",
]);
export type CredentialType = z.infer<typeof CredentialTypeSchema>;

export const CredentialStatusSchema = z.enum(["verified", "needs_review", "expired", "missing", "pending", "rejected"]);
export type CredentialStatus = z.infer<typeof CredentialStatusSchema>;

export const CredentialSchema = z
  .object({
    id: Id,
    district_id: Id,
    substitute_id: Id,
    type: CredentialTypeSchema,
    number: z.string(),
    issuer: z.string(),
    issueDate: IsoDate,
    expiryDate: IsoDate.optional(),
    status: CredentialStatusSchema,
    confidence: z.number().min(0).max(1).optional(),
    documentName: z.string().optional(),
    verifiedBy: z.string().optional(),
    verifiedAt: IsoDateTime.optional(),
    reviewNote: z.string().optional(),
  })
  .refine((c) => !c.expiryDate || c.expiryDate > c.issueDate, {
    message: "Expiry must be after issue date",
    path: ["expiryDate"],
  });
export type Credential = z.infer<typeof CredentialSchema>;

export const AbsenceStatusSchema = z.enum([
  "reported",
  "approved",
  "matching",
  "offered",
  "filled",
  "in_progress",
  "completed",
  "paid",
  "cancelled",
]);
export type AbsenceStatus = z.infer<typeof AbsenceStatusSchema>;

export const DayPartSchema = z.enum(["full", "am", "pm"]);
export type DayPart = z.infer<typeof DayPartSchema>;

export const AbsenceReasonSchema = z.enum(["illness", "family", "professional_development", "personal", "jury_duty", "other"]);
export type AbsenceReason = z.infer<typeof AbsenceReasonSchema>;

export const AbsenceSchema = z.object({
  id: Id,
  district_id: Id,
  school_id: Id,
  teacher_id: Id,
  startDate: IsoDate,
  endDate: IsoDate,
  dayPart: DayPartSchema,
  periods: z.array(z.number().int()),
  reason: AbsenceReasonSchema,
  noticeType: z.enum(["planned", "short_notice", "same_day"]),
  status: AbsenceStatusSchema,
  notes: z.string(),
  planId: Id.optional(),
  reportedVia: z.enum(["voice", "text", "form", "seed"]),
  createdAt: IsoDateTime,
  filledAt: IsoDateTime.optional(),
  currentWave: z.number().int().min(0).max(3),
  sped: z.boolean(),
  cancelReason: z.string().optional(),
});
export type Absence = z.infer<typeof AbsenceSchema>;

/** Input for reporting an absence (forms, AI intake output). */
export const AbsenceInputSchema = z
  .object({
    teacher_id: Id,
    startDate: IsoDate,
    endDate: IsoDate,
    dayPart: DayPartSchema,
    periods: z.array(z.number().int()).default([]),
    reason: AbsenceReasonSchema,
    notes: z.string().max(1000).default(""),
    planId: Id.optional(),
    reportedVia: z.enum(["voice", "text", "form", "seed"]).default("form"),
  })
  .refine((a) => a.endDate >= a.startDate, { message: "End date must be on or after start date", path: ["endDate"] });
export type AbsenceInput = z.infer<typeof AbsenceInputSchema>;

export const OfferStatusSchema = z.enum(["pending", "accepted", "declined", "expired", "superseded"]);
export const OfferSchema = z.object({
  id: Id,
  district_id: Id,
  absence_id: Id,
  substitute_id: Id,
  wave: z.number().int().min(1).max(3),
  status: OfferStatusSchema,
  score: z.number(),
  reasons: z.array(z.string()),
  pay: z.number(),
  distance: z.number(),
  sentAt: IsoDateTime,
  respondedAt: IsoDateTime.optional(),
});
export type Offer = z.infer<typeof OfferSchema>;

export const AssignmentStatusSchema = z.enum(["accepted", "in_progress", "completed", "cancelled", "no_show"]);
export const AssignmentSchema = z.object({
  id: Id,
  district_id: Id,
  absence_id: Id,
  substitute_id: Id,
  school_id: Id,
  date: IsoDate,
  dayPart: DayPartSchema,
  status: AssignmentStatusSchema,
  dayNumber: z.number().int().min(1), // consecutive day of this assignment (long-term pay)
  complianceCheckId: Id,
  acceptedAt: IsoDateTime,
  checkInAt: IsoDateTime.optional(),
  checkOutAt: IsoDateTime.optional(),
  cancelReason: z.string().optional(),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

export const LessonPeriodSchema = z.object({
  period: z.number().int(),
  className: z.string(),
  objective: z.string(),
  activities: z.array(z.string()),
  materials: z.array(z.string()),
  minutes: z.number().int(),
  differentiation: z.string().optional(),
});
export type LessonPeriod = z.infer<typeof LessonPeriodSchema>;

export const LessonPlanSchema = z.object({
  id: Id,
  district_id: Id,
  teacher_id: Id,
  title: z.string(),
  date: IsoDate.optional(),
  emergency: z.boolean(),
  source: z.enum(["upload", "paste", "photo", "seed"]),
  periods: z.array(LessonPeriodSchema),
  updatedAt: IsoDateTime,
});
export type LessonPlan = z.infer<typeof LessonPlanSchema>;

export const CitationSchema = z.object({
  chunkId: z.string(),
  source: z.string(),
  quote: z.string(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const AiMetaSchema = z.object({
  mode: z.enum(["live", "sample"]),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  sources: z.array(CitationSchema),
  agentRunId: z.string().optional(),
  humanReviewRequested: z.boolean().default(false),
});
export type AiMeta = z.infer<typeof AiMetaSchema>;

export const SubBriefSchema = z.object({
  id: Id,
  district_id: Id,
  assignment_id: Id,
  language: LanguageSchema,
  dayAtAGlance: z.string(),
  periods: z.array(
    z.object({
      period: z.number().int(),
      time: z.string(),
      className: z.string(),
      objective: z.string(),
      steps: z.array(z.string()),
      materials: z.array(z.string()),
      differentiation: z.string(),
    }),
  ),
  routines: z.array(z.string()),
  supports: z.array(z.string()), // need-to-know, action-phrased, admin-approved
  emergency: z.array(z.string()),
  contacts: z.array(z.string()),
  arrival: z.string(),
  meta: AiMetaSchema,
  createdAt: IsoDateTime,
});
export type SubBrief = z.infer<typeof SubBriefSchema>;

export const DayReportSchema = z.object({
  id: Id,
  district_id: Id,
  assignment_id: Id,
  covered: z.array(z.object({ period: z.number().int(), status: z.enum(["covered", "partial", "not_covered"]), note: z.string() })),
  attendanceNotes: z.string(),
  behaviorNotes: z.string(),
  materials: z.string(),
  message: z.string(),
  submittedAt: IsoDateTime,
});
export type DayReport = z.infer<typeof DayReportSchema>;

export const HandoffSchema = z.object({
  id: Id,
  district_id: Id,
  assignment_id: Id,
  teacher_id: Id,
  taught: z.array(z.string()),
  gaps: z.array(z.string()),
  nextSteps: z.array(z.string()),
  followUps: z.array(z.string()),
  continuityScore: z.number().min(0).max(1),
  meta: AiMetaSchema,
  createdAt: IsoDateTime,
  readAt: IsoDateTime.optional(),
});
export type Handoff = z.infer<typeof HandoffSchema>;

export const AnomalySchema = z.object({
  code: z.enum(["duplicate", "overlap", "rate_mismatch", "hour_cap", "outside_bell"]),
  message: z.string(),
});
export type Anomaly = z.infer<typeof AnomalySchema>;

export const PayLineSchema = z.object({ label: z.string(), amount: z.number() });
export type PayLine = z.infer<typeof PayLineSchema>;

export const TimesheetStatusSchema = z.enum(["submitted", "approved", "exported", "paid", "rejected"]);
export const TimesheetSchema = z.object({
  id: Id,
  district_id: Id,
  assignment_id: Id,
  substitute_id: Id,
  school_id: Id,
  date: IsoDate,
  dayPart: DayPartSchema,
  hours: z.number(),
  rate: z.number(),
  lines: z.array(PayLineSchema),
  amount: z.number(),
  status: TimesheetStatusSchema,
  anomalies: z.array(AnomalySchema),
  budgetCode: z.string(),
  payRunId: Id.optional(),
  approvedBy: z.string().optional(),
  createdAt: IsoDateTime,
});
export type Timesheet = z.infer<typeof TimesheetSchema>;

export const PayRunSchema = z.object({
  id: Id,
  district_id: Id,
  periodStart: IsoDate,
  periodEnd: IsoDate,
  status: z.enum(["draft", "approved", "exported"]),
  timesheetIds: z.array(Id),
  total: z.number(),
  createdAt: IsoDateTime,
  approvedBy: z.string().optional(),
});
export type PayRun = z.infer<typeof PayRunSchema>;

export const ComplianceAlertSchema = z.object({
  id: Id,
  district_id: Id,
  substitute_id: Id,
  ruleId: z.string(),
  severity: z.enum(["info", "warn", "block"]),
  message: z.string(),
  status: z.enum(["open", "resolved"]),
  createdAt: IsoDateTime,
  resolvedBy: z.string().optional(),
});
export type ComplianceAlert = z.infer<typeof ComplianceAlertSchema>;

export const ComplianceCheckSchema = z.object({
  id: Id,
  district_id: Id,
  substitute_id: Id,
  absence_id: Id,
  date: IsoDate,
  passed: z.boolean(),
  violations: z.array(z.object({ ruleId: z.string(), message: z.string() })),
  warnings: z.array(z.object({ ruleId: z.string(), message: z.string() })),
  checkedAt: IsoDateTime,
});
export type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;

export const AgentIdSchema = z.enum([
  "orchestrator",
  "intake",
  "credential_verifier",
  "matchmaker",
  "dispatcher",
  "lesson_continuity",
  "prep_coach",
  "compliance_sentinel",
  "payroll",
  "insights",
  "guardian",
]);
export type AgentId = z.infer<typeof AgentIdSchema>;

export const AgentRunSchema = z.object({
  id: Id,
  district_id: Id,
  agent: AgentIdSchema,
  inputSummary: z.string(),
  sources: z.array(CitationSchema),
  toolCalls: z.array(z.object({ tool: z.string(), input: z.string(), output: z.string() })),
  output: z.string(),
  confidence: z.number(),
  latencyMs: z.number(),
  costUsd: z.number(),
  model: z.string(),
  mode: z.enum(["live", "sample"]),
  status: z.enum(["ok", "needs_review", "blocked", "error"]),
  guardianNotes: z.array(z.string()),
  createdAt: IsoDateTime,
});
export type AgentRun = z.infer<typeof AgentRunSchema>;

export const MemoryTypeSchema = z.enum(["working", "episodic", "semantic", "procedural"]);
export const MemorySchema = z.object({
  id: Id,
  district_id: Id,
  type: MemoryTypeSchema,
  scope: z.string(), // e.g. "substitute:sub-001", "school:sch-1", "district"
  content: z.string(),
  source: z.string(),
  confidence: z.number(),
  consentBasis: z.string(),
  approved: z.boolean(),
  createdAt: IsoDateTime,
  expiresAt: IsoDateTime.optional(),
});
export type Memory = z.infer<typeof MemorySchema>;

export const KbChunkSchema = z.object({
  id: Id,
  district_id: Id,
  source: z.string(),
  section: z.string(),
  text: z.string(),
  version: z.string(),
  effectiveDate: IsoDate,
  reviewBy: IsoDate,
});
export type KbChunk = z.infer<typeof KbChunkSchema>;

export const KgNodeSchema = z.object({
  id: Id,
  kind: z.enum(["substitute", "credential", "subject", "grade", "school", "teacher", "rule"]),
  label: z.string(),
});
export type KgNode = z.infer<typeof KgNodeSchema>;
export const KgEdgeSchema = z.object({
  from: Id,
  to: Id,
  rel: z.enum(["HOLDS", "QUALIFIES_FOR", "PREFERS", "EXCLUDED_FROM", "APPLIES_TO", "TEACHES_AT"]),
});
export type KgEdge = z.infer<typeof KgEdgeSchema>;

export const AuditEventSchema = z.object({
  seq: z.number().int(),
  id: Id,
  district_id: Id,
  at: IsoDateTime,
  actor: z.string(),
  action: z.string(),
  entity: z.string(),
  payload: z.record(z.string(), z.unknown()),
  prevHash: z.string(),
  hash: z.string(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const NotificationSchema = z.object({
  id: Id,
  district_id: Id,
  channel: z.enum(["sms", "email", "whatsapp", "in_app"]),
  to: z.string(),
  toUserId: z.string().optional(),
  subject: z.string(),
  body: z.string(),
  language: LanguageSchema,
  at: IsoDateTime,
  read: z.boolean(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const RatingSchema = z.object({
  id: Id,
  district_id: Id,
  assignment_id: Id,
  from: z.string(),
  toSubstituteId: Id.optional(),
  toSchoolId: Id.optional(),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500),
  at: IsoDateTime,
});
export type Rating = z.infer<typeof RatingSchema>;

export const AutomationRuleSchema = z.object({
  id: z.string(), // W1..W8
  name: z.string(),
  trigger: z.string(),
  conditions: z.array(z.string()),
  actions: z.array(z.string()),
  enabled: z.boolean(),
  params: z.record(z.string(), z.number()),
});
export type AutomationRule = z.infer<typeof AutomationRuleSchema>;

export const DomainEventSchema = z.object({
  id: Id,
  type: z.string(), // e.g. absence.reported
  at: IsoDateTime,
  entityId: z.string(),
  summary: z.string(),
  ruleId: z.string().optional(), // automation that handled it
});
export type DomainEvent = z.infer<typeof DomainEventSchema>;

export const AutomationRunSchema = z.object({
  id: Id,
  ruleId: z.string(),
  eventId: z.string(),
  at: IsoDateTime,
  dryRun: z.boolean(),
  steps: z.array(z.string()),
  status: z.enum(["ok", "skipped", "error"]),
});
export type AutomationRun = z.infer<typeof AutomationRunSchema>;

export const ConsentSchema = z.object({
  id: Id,
  district_id: Id,
  subjectId: z.string(),
  purpose: z.string(),
  basis: z.string(),
  grantedAt: IsoDateTime,
  revokedAt: IsoDateTime.optional(),
});
export type Consent = z.infer<typeof ConsentSchema>;

export const StudentSupportSchema = z.object({
  id: Id,
  district_id: Id,
  teacher_id: Id,
  classId: Id,
  note: z.string(), // action-phrased, no diagnoses
  approved: z.boolean(),
  approvedBy: z.string().optional(),
});
export type StudentSupport = z.infer<typeof StudentSupportSchema>;
