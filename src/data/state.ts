import type {
  Absence,
  AgentRun,
  Assignment,
  AuditEvent,
  AutomationRule,
  AutomationRun,
  ComplianceAlert,
  ComplianceCheck,
  Consent,
  Credential,
  DayReport,
  District,
  DomainEvent,
  Handoff,
  KbChunk,
  KgEdge,
  KgNode,
  Language,
  LessonPlan,
  Memory,
  Notification,
  Offer,
  PayRun,
  Rating,
  Role,
  School,
  StudentSupport,
  SubBrief,
  Substitute,
  Teacher,
  Timesheet,
  User,
} from "@/domain";

/** Whole tenant snapshot held by a repository driver. */
export interface DemoState {
  version: number;
  now: string; // demo clock (ISO)
  counters: Record<string, number>; // deterministic id generation
  district: District;
  schools: School[];
  users: User[];
  teachers: Teacher[];
  substitutes: Substitute[];
  credentials: Credential[];
  absences: Absence[];
  offers: Offer[];
  assignments: Assignment[];
  complianceChecks: ComplianceCheck[];
  lessonPlans: LessonPlan[];
  subBriefs: SubBrief[];
  dayReports: DayReport[];
  handoffs: Handoff[];
  timesheets: Timesheet[];
  payRuns: PayRun[];
  alerts: ComplianceAlert[];
  agentRuns: AgentRun[];
  memories: Memory[];
  kbChunks: KbChunk[];
  kgNodes: KgNode[];
  kgEdges: KgEdge[];
  audit: AuditEvent[];
  notifications: Notification[];
  ratings: Rating[];
  automations: AutomationRule[];
  automationRuns: AutomationRun[];
  events: DomainEvent[];
  consents: Consent[];
  supports: StudentSupport[];
  supportViews: { id: string; supportId: string; assignmentId: string; viewer: string; at: string }[];
  aiSettings: {
    killSwitch: boolean;
    autonomy: Record<string, "suggest" | "act_with_review" | "act">;
    spendCapUsd: number;
    spentUsd: number;
  };
}

/** Session (who is looking) - kept separate from tenant data. */
export interface Session {
  role: Role | null;
  userId: string | null;
  language: Language;
  lowBandwidth: boolean;
  tourDone: Record<string, boolean>;
  checklist: Record<string, boolean>;
}

export const STATE_VERSION = 1;
