/**
 * RBAC matrix derived from the requireRole(...) calls in src/data/commands.ts (server-side role check on every mutation).
 * "system" = scheduled automations. Keep in sync when a command's role list changes.
 */
import type { Role } from "@/domain";

export const RBAC_SOURCE = "src/data/commands.ts";
export const ROLES: Role[] = ["substitute", "teacher", "school_admin", "district_admin"];

export const RBAC: { command: string; action: string; roles: (Role | "system")[] }[] = [
  { command: "reportAbsence", action: "Report an absence", roles: ["teacher", "school_admin", "district_admin", "system"] },
  { command: "approveAbsence", action: "Approve an absence", roles: ["school_admin", "district_admin"] },
  { command: "cancelAbsence", action: "Cancel an absence", roles: ["teacher", "school_admin", "district_admin"] },
  { command: "extendAbsence", action: "Extend an absence", roles: ["teacher", "school_admin", "district_admin"] },
  { command: "respondOffer", action: "Accept or decline an offer", roles: ["substitute", "system"] },
  { command: "checkIn", action: "Check in at school", roles: ["substitute", "school_admin"] },
  { command: "markNoShow", action: "Mark a no-show", roles: ["school_admin", "district_admin", "system"] },
  { command: "cancelAssignmentBySub", action: "Cancel an accepted job", roles: ["substitute"] },
  { command: "submitDayReport", action: "Submit day report", roles: ["substitute"] },
  { command: "approveTimesheet", action: "Approve a timesheet", roles: ["school_admin", "district_admin"] },
  { command: "rateSubstitute", action: "Rate an assignment", roles: ["school_admin", "teacher", "substitute"] },
  { command: "createPayRun", action: "Create a pay run", roles: ["district_admin"] },
  { command: "approvePayRun", action: "Approve a pay run", roles: ["district_admin"] },
  { command: "exportPayRun", action: "Export payroll CSV", roles: ["district_admin"] },
  { command: "uploadCredential", action: "Upload a credential", roles: ["substitute", "district_admin"] },
  { command: "reviewCredential", action: "Verify or reject a credential", roles: ["district_admin"] },
  { command: "advanceStage", action: "Advance onboarding stage", roles: ["district_admin", "substitute", "system"] },
  { command: "updateTeacher", action: "Edit teacher profile", roles: ["teacher", "school_admin", "district_admin"] },
  { command: "updateSubstitute", action: "Edit substitute profile", roles: ["substitute", "district_admin"] },
  { command: "updateSchoolNotes", action: "Edit school arrival notes", roles: ["school_admin", "district_admin"] },
  { command: "saveLessonPlan", action: "Save a lesson plan", roles: ["teacher", "school_admin"] },
  { command: "approveSupport", action: "Approve need-to-know support", roles: ["school_admin"] },
  { command: "resolveAlert", action: "Resolve a compliance alert", roles: ["district_admin", "school_admin"] },
  { command: "setAutomation", action: "Change an automation", roles: ["district_admin"] },
  { command: "setAiSettings", action: "AI kill switch, autonomy, spend cap", roles: ["district_admin"] },
];
