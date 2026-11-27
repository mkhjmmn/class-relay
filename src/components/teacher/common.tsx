"use client";
import { useRepo } from "@/data/client";
import { EmptyState } from "@/components/shell/Page";
import { Button } from "@/components/ui";

/** Current teacher (from the session user) plus repository helpers. */
export function useTeacher() {
  const repo = useRepo();
  const tid = repo.user?.teacher_id;
  const teacher = tid ? repo.state.teachers.find((t) => t.id === tid) : undefined;
  const today = repo.state.now.slice(0, 10);
  return { ...repo, teacher, today };
}

export function NotTeacher() {
  const { setSession } = useRepo();
  return (
    <EmptyState
      title="Sign in as a teacher to see this screen"
      body="This view belongs to a teacher account. Switch the demo to teacher Daniel Ortiz (Cedar Hollow Middle School)."
      action={<Button onClick={() => setSession({ role: "teacher" })}>Continue as Daniel Ortiz</Button>}
    />
  );
}
