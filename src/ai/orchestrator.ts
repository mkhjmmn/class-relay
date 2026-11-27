/** A1 Relay Orchestrator: reconstructs the Relay Loop trace (absence -> timesheet) from events and agent runs. */
import type { DemoState } from "@/data/state";
import { planRelay } from "./agents/registry";

export const RELAY_STAGES = ["absence.reported", "offer.sent", "offer.accepted", "brief.generated", "assignment.checked_in", "day_report.submitted", "handoff.created", "timesheet.created"] as const;

export interface RelayTrace {
  absenceId: string;
  stages: { stage: string; done: boolean; at?: string; summary?: string }[];
  agentRuns: DemoState["agentRuns"];
  complete: boolean;
}

export function relayTrace(s: DemoState, absenceId: string): RelayTrace {
  const asgIds = new Set(s.assignments.filter((a) => a.absence_id === absenceId).map((a) => a.id));
  const tsIds = new Set(s.timesheets.filter((t) => asgIds.has(t.assignment_id)).map((t) => t.id));
  const related = (id: string) => id === absenceId || asgIds.has(id) || tsIds.has(id);
  const events = s.events.filter((e) => related(e.entityId));
  const stages = RELAY_STAGES.map((stage) => {
    const prefix = stage.split(".")[0];
    const ev = events.find((e) => e.type === stage) ?? events.find((e) => e.type.startsWith(prefix + "."));
    const done = stage === "timesheet.created" ? tsIds.size > 0 : !!ev;
    return { stage, done, at: ev?.at, summary: ev?.summary };
  });
  const agentRuns = s.agentRuns.filter((r) => r.inputSummary.includes(absenceId) || [...asgIds].some((id) => r.inputSummary.includes(id)));
  return { absenceId, stages, agentRuns, complete: tsIds.size > 0 };
}

export { planRelay };
