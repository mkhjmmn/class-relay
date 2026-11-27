"use client";
import * as React from "react";
import Link from "next/link";
import { EmptyState, Hydrated, PageHeader } from "@/components/shell/Page";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { assignmentsForSub } from "@/data/queries";
import { cancelAssignmentBySub, checkIn, submitDayReport } from "@/data/commands";
import type { DayReport } from "@/domain";
import { useT } from "@/i18n/useT";
import { NotSubstitute, label, money, statusTone, useSub } from "./common";

type Covered = DayReport["covered"];

function DayReportForm({ assignmentId, periods, onDone }: { assignmentId: string; periods: { n: number; label: string }[]; onDone: (timesheetId: string) => void }) {
  const t = useT();
  const { act, markTask } = useSub();
  const [covered, setCovered] = React.useState<Covered>(periods.map((p) => ({ period: p.n, status: "covered", note: "" })));
  const [attendance, setAttendance] = React.useState("");
  const [behavior, setBehavior] = React.useState("");
  const [materials, setMaterials] = React.useState("");
  const [message, setMessage] = React.useState("");
  const id = (s: string) => `${assignmentId}-${s}`;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = act(submitDayReport, assignmentId, { covered, attendanceNotes: attendance, behaviorNotes: behavior, materials, message });
    if (r.ok && "value" in r) {
      markTask("report");
      onDone(r.value.timesheetId);
    }
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-950">{t("experience.sub.dayReport")}</h3>
      <p className="text-sm text-slate-700">Report facts only. The teacher receives a Return Handoff built from this report.</p>
      {covered.map((c, i) => (
        <div key={c.period} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
          <Field label={`Period ${c.period}: ${periods[i]?.label ?? ""}`} htmlFor={id(`p${c.period}`)}>
            <Select id={id(`p${c.period}`)} value={c.status} onChange={(e) => setCovered(covered.map((x, j) => (j === i ? { ...x, status: e.target.value as Covered[number]["status"] } : x)))}>
              <option value="covered">Covered</option>
              <option value="partial">Partly covered</option>
              <option value="not_covered">Not covered</option>
            </Select>
          </Field>
          <Field label={`Period ${c.period} note`} htmlFor={id(`n${c.period}`)}>
            <Input id={id(`n${c.period}`)} value={c.note} placeholder="e.g. Finished the warm-up and page 42" onChange={(e) => setCovered(covered.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
          </Field>
        </div>
      ))}
      <Field label="Attendance" htmlFor={id("att")}>
        <Input id={id("att")} value={attendance} onChange={(e) => setAttendance(e.target.value)} placeholder="e.g. 2 absent in period 3, roster sent to office" />
      </Field>
      <Field label="Behavior facts" htmlFor={id("beh")} hint="Describe what happened, not judgments about students.">
        <Textarea id={id("beh")} value={behavior} onChange={(e) => setBehavior(e.target.value)} />
      </Field>
      <Field label="Materials used or missing" htmlFor={id("mat")}>
        <Input id={id("mat")} value={materials} onChange={(e) => setMaterials(e.target.value)} />
      </Field>
      <Field label="Message for the teacher" htmlFor={id("msg")}>
        <Textarea id={id("msg")} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <Button type="submit">Submit report and create timesheet</Button>
    </form>
  );
}

function Body() {
  const t = useT();
  const { sub, state, act, today, markTask } = useSub();
  const [reporting, setReporting] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [created, setCreated] = React.useState<string | null>(null);
  if (!sub) return <NotSubstitute />;
  const rows = assignmentsForSub(state, sub.id);
  const ts = created ? state.timesheets.find((x) => x.id === created) : undefined;

  return (
    <>
      <PageHeader
        title={t("experience.sub.schedule")}
        purpose={t("experience.sub.schedulePurpose")}
        action={
          <Button asChild variant="outline">
            <Link href="/app/sub/jobs">{t("experience.sub.jobs")}</Link>
          </Button>
        }
        help={
          <>
            <p>Check-in opens on the assignment date (the demo clock date is {today}). After check-in, send the end-of-day report: it closes the day and creates your timesheet.</p>
            <p>Cancelling sends the job back to matching. Late cancellations affect reliability, so add a clear reason.</p>
          </>
        }
      />
      {ts && (
        <Card role="status" className="mb-4 border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-900">Timesheet created: {money(ts.amount)} ({ts.hours} h)</p>
          <p className="text-sm text-emerald-900">Status: {label(ts.status)}. The school approves it before payroll export.</p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/app/sub/earnings">View earnings</Link>
          </Button>
        </Card>
      )}
      {rows.length === 0 ? (
        <EmptyState title="No assignments yet" body="Accepted jobs appear here with check-in and the day report." action={<Button asChild><Link href="/app/sub/jobs">See offers</Link></Button>} />
      ) : (
        <ul className="space-y-3">
          {rows.map(({ assignment: a, school, teacher, timesheet }) => (
            <li key={a.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {a.date} · {a.dayPart === "full" ? "Full day" : a.dayPart.toUpperCase()}
                    </p>
                    <p className="text-sm text-slate-700">
                      {school.name} · {teacher.name} ({teacher.subject})
                    </p>
                    {a.cancelReason && <p className="text-xs text-slate-600">Reason: {a.cancelReason}</p>}
                  </div>
                  <Badge tone={statusTone(a.status)}>{label(a.status)}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.status === "accepted" && a.date === today && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const r = act(checkIn, a.id);
                        if (r.ok) markTask("checkin");
                      }}
                    >
                      {t("experience.sub.checkIn")}
                    </Button>
                  )}
                  {a.status === "accepted" && a.date !== today && <span className="self-center text-xs text-slate-600">Check-in opens on {a.date}.</span>}
                  {a.status === "in_progress" && (
                    <Button size="sm" variant="teal" onClick={() => setReporting(reporting === a.id ? null : a.id)}>
                      {t("experience.sub.dayReport")}
                    </Button>
                  )}
                  {(a.status === "accepted" || a.status === "in_progress") && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/app/sub/briefs?a=${a.id}`}>Sub Brief</Link>
                    </Button>
                  )}
                  {a.status === "accepted" && (
                    <Button size="sm" variant="ghost" onClick={() => setCancelling(cancelling === a.id ? null : a.id)}>
                      Cancel assignment
                    </Button>
                  )}
                  {timesheet && <Badge tone={statusTone(timesheet.status)}>Timesheet {money(timesheet.amount)} · {label(timesheet.status)}</Badge>}
                </div>
                {cancelling === a.id && (
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const r = act(cancelAssignmentBySub, a.id, reason);
                      if (r.ok) {
                        setCancelling(null);
                        setReason("");
                      }
                    }}
                  >
                    <div className="flex-1">
                      <Field label="Reason for cancelling" htmlFor={`cr-${a.id}`}>
                        <Input id={`cr-${a.id}`} required minLength={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family emergency" />
                      </Field>
                    </div>
                    <Button type="submit" variant="danger" size="sm">
                      Confirm cancellation
                    </Button>
                  </form>
                )}
                {reporting === a.id && a.status === "in_progress" && (
                  <DayReportForm
                    assignmentId={a.id}
                    periods={school.periods.map((p) => ({ n: p.n, label: teacher.classes.find((c) => c.period === p.n)?.name ?? p.label }))}
                    onDone={(tid) => {
                      setReporting(null);
                      setCreated(tid);
                    }}
                  />
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function Schedule() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
