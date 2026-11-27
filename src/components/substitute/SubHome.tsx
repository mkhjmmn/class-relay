"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { Hydrated, PageHeader, Stat } from "@/components/shell/Page";
import { Badge, Button, Card } from "@/components/ui";
import { assignmentsForSub, offersForSub } from "@/data/queries";
import { useT } from "@/i18n/useT";
import { NotSubstitute, TASKS, label, money, statusTone, useSub } from "./common";

const TASK_LINK: Record<(typeof TASKS)[number], string> = {
  accept: "/app/sub/jobs",
  brief: "/app/sub/briefs",
  coach: "/app/sub/coach",
  checkin: "/app/sub/schedule",
  report: "/app/sub/schedule",
};

function Body() {
  const t = useT();
  const params = useSearchParams();
  const { sub, state, today, session, setSession, markTask } = useSub();
  if (!sub) return <NotSubstitute />;
  const offers = offersForSub(state, sub.id);
  const upcoming = assignmentsForSub(state, sub.id).filter((a) => a.assignment.date >= today && (a.assignment.status === "accepted" || a.assignment.status === "in_progress"));
  const next = upcoming[0];
  const earned = state.timesheets.filter((x) => x.substitute_id === sub.id).reduce((a, x) => a + x.amount, 0);
  const showTour = params.get("tour") === "1" || session.tourDone.substitute === false;
  const done = TASKS.filter((k) => session.checklist[`substitute.${k}`]).length;

  return (
    <>
      <PageHeader
        title={`${t("experience.sub.home")}: ${sub.name}`}
        purpose={t("experience.sub.homePurpose")}
        action={
          <Button asChild>
            <Link href="/app/sub/jobs">{t("experience.sub.jobs")} ({offers.length})</Link>
          </Button>
        }
        help={
          <>
            <p>Offers arrive in waves. Open Job offers to see pay, distance and why you were matched, then accept or decline.</p>
            <p>On the day, check in from My schedule, read the Sub Brief, and send the end-of-day report to create your timesheet.</p>
          </>
        }
      />
      {showTour && (
        <Card className="mb-6 border-brand-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-950">{t("experience.tour.title")}</h2>
            <Badge tone="brand">
              {done} / {TASKS.length}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-700">Follow the Relay Loop as a substitute: each task is marked done when the action succeeds.</p>
          <ol className="mt-3 space-y-2">
            {TASKS.map((k, i) => {
              const ok = !!session.checklist[`substitute.${k}`];
              return (
                <li key={k} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-slate-900">
                    {ok ? <CheckCircle2 aria-label="Done" className="size-4 text-emerald-700" /> : <Circle aria-label="Not done" className="size-4 text-slate-500" />}
                    {i + 1}. {t(`experience.task.${k}`)}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={TASK_LINK[k]} onClick={() => k === "coach" && markTask("coach")}>
                      Go
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ol>
          <Button className="mt-3" size="sm" variant="ghost" onClick={() => setSession({ tourDone: { ...session.tourDone, substitute: true } })}>
            Hide the tour
          </Button>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open offers" value={offers.length} />
        <Stat label="Upcoming days" value={upcoming.length} tone="teal" />
        <Stat label="Stage" value={label(sub.stage)} tone={sub.stage === "active" ? "teal" : "amber"} />
        <Stat label="Timesheets total" value={money(earned)} tone="brand" />
      </div>
      <Card className="mt-6 p-5">
        <h2 className="font-semibold text-slate-950">Next assignment</h2>
        {next ? (
          <div className="mt-2 space-y-2">
            <p className="text-slate-900">
              {next.assignment.date} · {next.school.name} · {next.teacher.name} ({next.teacher.subject})
            </p>
            <Badge tone={statusTone(next.assignment.status)}>{label(next.assignment.status)}</Badge>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm">
                <Link href={`/app/sub/briefs?a=${next.assignment.id}`}>Open Sub Brief</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/app/sub/schedule">{next.assignment.date === today ? t("experience.sub.checkIn") : "View schedule"}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/app/sub/coach" onClick={() => markTask("coach")}>
                  Ask the Prep Coach
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-700">No upcoming assignment yet. Accept an offer to fill your calendar.</p>
        )}
      </Card>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Button asChild variant="outline">
          <Link href="/app/sub/credentials">{t("experience.sub.credentials")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/sub/earnings">{t("experience.sub.earnings")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/sub/preferences">{t("experience.sub.preferences")}</Link>
        </Button>
      </div>
    </>
  );
}

export function SubHome() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
