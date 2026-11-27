import type { AbsenceStatus } from "./schemas";

/** Absence state machine (Master Prompt A1): reported -> approved -> matching -> offered -> filled -> in_progress -> completed -> paid. */
export const ABSENCE_FLOW: AbsenceStatus[] = [
  "reported",
  "approved",
  "matching",
  "offered",
  "filled",
  "in_progress",
  "completed",
  "paid",
];

const TRANSITIONS: Record<AbsenceStatus, AbsenceStatus[]> = {
  reported: ["approved", "cancelled"],
  approved: ["matching", "cancelled"],
  matching: ["offered", "filled", "cancelled"],
  offered: ["filled", "matching", "cancelled"],
  // filled -> offered/matching covers no-show re-dispatch and substitute cancellation
  filled: ["in_progress", "offered", "matching", "cancelled"],
  in_progress: ["completed", "matching", "offered"],
  completed: ["paid"],
  paid: [],
  cancelled: [],
};

export function canTransition(from: AbsenceStatus, to: AbsenceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class TransitionError extends Error {
  constructor(
    public from: AbsenceStatus,
    public to: AbsenceStatus,
  ) {
    super(`Illegal absence transition ${from} -> ${to}`);
  }
}

export function transition(from: AbsenceStatus, to: AbsenceStatus): AbsenceStatus {
  if (!canTransition(from, to)) throw new TransitionError(from, to);
  return to;
}

export function nextStatuses(from: AbsenceStatus): AbsenceStatus[] {
  return TRANSITIONS[from];
}

export function stepIndex(s: AbsenceStatus): number {
  return ABSENCE_FLOW.indexOf(s);
}
