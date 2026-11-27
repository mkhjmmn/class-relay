"use client";
import Link from "next/link";
import { useRepo } from "@/data/client";
import { EmptyState } from "@/components/shell/Page";
import { Button } from "@/components/ui";

export const TASKS = ["accept", "brief", "coach", "checkin", "report"] as const;
export type Task = (typeof TASKS)[number];

/** Current substitute (from the session user) plus repository helpers. */
export function useSub() {
  const repo = useRepo();
  const subId = repo.user?.substitute_id;
  const sub = subId ? repo.state.substitutes.find((s) => s.id === subId) : undefined;
  const today = repo.state.now.slice(0, 10);
  const { session, setSession } = repo;
  const markTask = (task: Task) => {
    const key = `substitute.${task}`;
    if (!session.checklist[key]) setSession({ checklist: { ...session.checklist, [key]: true } });
  };
  return { ...repo, sub, today, markTask };
}

export function NotSubstitute() {
  return (
    <EmptyState
      title="Sign in as a substitute to see this screen"
      body="This view belongs to a substitute account. Enter the demo as Maya Rahman, or apply as a new substitute."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/demo-user">Enter as Maya Rahman</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/apply">Apply as a new substitute</Link>
          </Button>
        </div>
      }
    />
  );
}

export const money = (n: number) => `$${n.toFixed(2)}`;

export function statusTone(s: string): "green" | "amber" | "red" | "teal" | "neutral" {
  if (["verified", "completed", "paid", "approved", "exported", "filled", "covered"].includes(s)) return "green";
  if (["needs_review", "pending", "submitted", "matching", "offered", "reported", "partial", "accepted"].includes(s)) return "amber";
  if (["expired", "rejected", "missing", "cancelled", "no_show", "not_covered"].includes(s)) return "red";
  if (s === "in_progress") return "teal";
  return "neutral";
}
export const label = (s: string) => s.replace(/_/g, " ");
