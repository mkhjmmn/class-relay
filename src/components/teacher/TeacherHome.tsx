"use client";
import Link from "next/link";
import { EmptyState, Hydrated, PageHeader, Stat } from "@/components/shell/Page";
import { Badge, Button, Card } from "@/components/ui";
import { absenceView } from "@/data/queries";
import { useT } from "@/i18n/useT";
import { pct } from "@/lib/utils";
import { label, statusTone } from "@/components/substitute/common";
import { NotTeacher, useTeacher } from "./common";

function Body() {
  const t = useT();
  const { teacher, state, today } = useTeacher();
  if (!teacher) return <NotTeacher />;
  const mine = state.absences.filter((a) => a.teacher_id === teacher.id && a.endDate >= today && a.status !== "cancelled").map((a) => absenceView(state, a));
  const handoff = state.handoffs.filter((h) => h.teacher_id === teacher.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const emergency = state.lessonPlans.filter((p) => p.teacher_id === teacher.id && p.emergency).length;
  return (
    <>
      <PageHeader
        title={`${t("experience.teacher.home")}: ${teacher.name}`}
        purpose={t("experience.teacher.homePurpose")}
        action={
          <Button asChild>
            <Link href="/app/teacher/report">{t("experience.teacher.report")}</Link>
          </Button>
        }
        help={<p>Report an absence in one message, keep emergency plans ready, and read the Return Handoff after each substitute day.</p>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Upcoming absences" value={mine.length} />
        <Stat label="Covered" value={mine.filter((v) => v.substitute).length} tone="teal" />
        <Stat label="Emergency plans" value={`${emergency} / 3`} tone={emergency >= 3 ? "teal" : "amber"} />
      </div>
      <Card className="mb-6 p-5">
        <h2 className="font-semibold text-slate-950">Coverage status</h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-slate-700">No upcoming absences.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {mine.map((v) => (
              <li key={v.absence.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-900">
                  {v.absence.startDate}
                  {v.absence.endDate !== v.absence.startDate ? ` to ${v.absence.endDate}` : ""} · {v.substitute ? v.substitute.name : "Looking for a substitute"}
                </span>
                <Badge tone={statusTone(v.absence.status)}>{label(v.absence.status)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {handoff ? (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">Latest return handoff</h2>
          <p className="mt-1 text-sm text-slate-700">Continuity score {pct(handoff.continuityScore)} · {handoff.createdAt.slice(0, 10)}</p>
          <p className="mt-1 text-sm text-slate-900">{handoff.nextSteps[0] ?? handoff.taught[0]}</p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href="/app/teacher/handoffs">Read handoffs</Link>
          </Button>
        </Card>
      ) : (
        <EmptyState title="No handoffs yet" body="After a substitute day, the Return Handoff appears here." />
      )}
    </>
  );
}

export function TeacherHome() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
