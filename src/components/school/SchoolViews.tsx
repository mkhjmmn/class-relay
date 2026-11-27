"use client";
import * as React from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Check, RotateCcw, Star, UserX } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogClose, DialogContent, DialogTrigger, Field, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { EmptyState, Hydrated, PageHeader, Stat } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { absenceView, byId, coverage, KPI_TARGETS } from "@/data/queries";
import { approveAbsence, approveTimesheet, markNoShow, rateSubstitute } from "@/data/commands";
import type { DemoState } from "@/data/state";
import { addDays, formatDate, formatMoney, isWeekend, minutesBetween } from "@/domain";
import { useT } from "@/i18n/useT";
import { pct } from "@/lib/utils";

type View = ReturnType<typeof absenceView>;

/** School in scope: the admin's school; other roles see the first school (read-only preview). */
export function useSchool() {
  const { state, user } = useRepo();
  const schoolId = user?.school_id ?? state.schools[0]?.id;
  return { school: byId(state.schools, schoolId), schoolId };
}

function groupOf(v: View): "filled" | "offered" | "atRisk" | "inProgress" | "completed" | null {
  const st = v.absence.status;
  if (st === "cancelled") return null;
  if (st === "completed" || st === "paid") return "completed";
  if (st === "in_progress") return "inProgress";
  if (st === "filled") return "filled";
  if (v.atRisk) return "atRisk";
  return "offered";
}

const GROUPS = [
  { key: "atRisk", label: "At risk", tone: "red" },
  { key: "offered", label: "Offered / matching", tone: "amber" },
  { key: "filled", label: "Filled", tone: "green" },
  { key: "inProgress", label: "In progress", tone: "teal" },
  { key: "completed", label: "Completed", tone: "neutral" },
] as const;

/** Internal coverage plan: same-school teachers in the same subject who are not absent that day. */
function internalPlan(s: DemoState, v: View): string {
  const absentIds = new Set(s.absences.filter((a) => a.status !== "cancelled" && a.startDate <= v.absence.startDate && a.endDate >= v.absence.startDate).map((a) => a.teacher_id));
  const peers = s.teachers.filter((t) => t.school_id === v.school.id && !absentIds.has(t.id) && t.id !== v.teacher.id);
  const same = peers.filter((t) => t.subject === v.teacher.subject);
  const pick = (same.length ? same : peers).slice(0, 2).map((t) => t.name);
  if (!pick.length) return "No internal colleague is free: escalate to the district sub desk.";
  return `Internal cover: split periods between ${pick.join(" and ")}${same.length ? ` (same subject: ${v.teacher.subject})` : ""}; use the emergency plan on file.`;
}

export function CoverageBoard() {
  const t = useT();
  const { state, act } = useRepo();
  const { school, schoolId } = useSchool();
  const today = state.now.slice(0, 10);
  const views = coverage(state, schoolId, today, addDays(today, 10));
  const pending = views.filter((v) => v.absence.status === "reported");
  const noShowable = state.assignments.filter((a) => a.school_id === schoolId && a.date === today && a.status === "accepted" && !a.checkInAt);
  const groups = GROUPS.map((g) => ({ ...g, items: views.filter((v) => groupOf(v) === g.key) }));
  return (
    <>
      <PageHeader
        title={t("operations.coverage.title")}
        purpose={`${t("operations.coverage.purpose")} ${school ? `(${school.name})` : ""}`}
        action={
          <Button asChild>
            <Link href="/app/school/timesheets">Review timesheets</Link>
          </Button>
        }
        help={
          <>
            <p>Absences from today to {formatDate(addDays(today, 10))} are grouped by status. At-risk means unfilled on or after the start date.</p>
            <p>Mark no-show applies to today&apos;s accepted assignments with no check-in: it records the no-show and re-dispatches offers (automation W4).</p>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {groups.map((g) => (
          <Stat key={g.key} label={g.label} value={g.items.length} tone={g.key === "atRisk" ? "red" : g.key === "offered" ? "amber" : "teal"} />
        ))}
      </div>

      {pending.length > 0 && (
        <Card className="mb-6 border-amber-300">
          <CardHeader>
            <CardTitle>Waiting for your approval ({pending.length})</CardTitle>
            <CardDescription>Approving starts matching immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((v) => (
              <div key={v.absence.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3">
                <span className="text-sm">
                  <strong>{v.teacher.name}</strong> · {formatDate(v.absence.startDate)} to {formatDate(v.absence.endDate)} · {v.absence.reason.replace("_", " ")}
                </span>
                <Button size="sm" onClick={() => act(approveAbsence, v.absence.id)}>
                  <Check aria-hidden /> Approve absence
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {noShowable.length > 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle>Today: not checked in yet ({noShowable.length})</CardTitle>
            <CardDescription>If the substitute has not arrived, record a no-show and re-dispatch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {noShowable.map((a) => {
              const sub = byId(state.substitutes, a.substitute_id);
              const abs = byId(state.absences, a.absence_id);
              const tch = abs && byId(state.teachers, abs.teacher_id);
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 p-3">
                  <span className="text-sm">
                    <strong>{sub?.name}</strong> covering {tch?.name} · {a.dayPart}
                  </span>
                  <Button size="sm" variant="danger" onClick={() => act(markNoShow, a.id)}>
                    <UserX aria-hidden /> Mark no-show &amp; re-dispatch
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {views.length === 0 ? (
        <EmptyState title="No absences in the next 10 days" body="When a teacher reports an absence it appears here within seconds." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`grp-${g.key}`} className="space-y-2">
              <h2 id={`grp-${g.key}`} className="flex items-center gap-2 font-semibold text-slate-900">
                <Badge tone={g.tone}>{g.items.length}</Badge> {g.label}
              </h2>
              {g.items.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">None.</p>}
              {g.items.map((v) => (
                <Card key={v.absence.id} className={g.key === "atRisk" ? "border-red-300 bg-red-50/40 p-4" : "p-4"}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{v.teacher.name}</p>
                      <p className="text-xs text-slate-600">
                        {v.teacher.subject} · {v.teacher.gradeBand} · {formatDate(v.absence.startDate)}
                        {v.absence.endDate !== v.absence.startDate && ` to ${formatDate(v.absence.endDate)}`} · {v.absence.dayPart}
                      </p>
                    </div>
                    <Badge tone="outline">{v.absence.status}</Badge>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-600">Substitute</dt>
                      <dd className="font-medium">{v.substitute?.name ?? "None yet"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-600">Wave</dt>
                      <dd className="font-medium">{v.absence.currentWave}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-600">Offers</dt>
                      <dd className="font-medium">{v.offers.length}</dd>
                    </div>
                  </dl>
                  {g.key === "atRisk" && (
                    <p className="mt-2 flex gap-1.5 rounded-lg bg-white p-2 text-xs text-red-900">
                      <AlertTriangle aria-hidden className="size-4 shrink-0" /> {internalPlan(state, v)}
                    </p>
                  )}
                </Card>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

export function SchoolTimesheets() {
  const t = useT();
  const { state, act } = useRepo();
  const { schoolId } = useSchool();
  const [note, setNote] = React.useState("");
  const list = state.timesheets.filter((x) => x.school_id === schoolId && x.status === "submitted");
  const recent = state.timesheets.filter((x) => x.school_id === schoolId && x.status !== "submitted").slice(-8).reverse();
  const clean = list.filter((x) => !x.anomalies.length);
  return (
    <>
      <PageHeader
        title={t("operations.timesheets.title")}
        purpose={t("operations.timesheets.purpose")}
        action={
          <Button disabled={!clean.length} onClick={() => clean.forEach((x) => act(approveTimesheet, x.id, true, "Bulk approved"))}>
            <Check aria-hidden /> Bulk approve {clean.length} without anomalies
          </Button>
        }
        help={<p>Timesheets are created when a substitute submits the end-of-day report. Flagged timesheets need an individual decision; bulk approve skips them. Returning a timesheet asks the substitute to correct it.</p>}
      />
      <div className="mb-4 max-w-md">
        <Field label="Note for returned timesheets" htmlFor="ts-note">
          <Textarea id="ts-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Example: check-out time is after the bell" />
        </Field>
      </div>
      {list.length === 0 ? (
        <EmptyState title="No timesheets waiting" body="Submitted timesheets for your school appear here." />
      ) : (
        <div className="space-y-3">
          {list.map((ts) => {
            const sub = byId(state.substitutes, ts.substitute_id);
            return (
              <Card key={ts.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{sub?.name}</p>
                    <p className="text-xs text-slate-600">
                      {formatDate(ts.date)} · {ts.dayPart} · {ts.hours} h · {ts.budgetCode}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-brand-800">{formatMoney(ts.amount)}</p>
                </div>
                <ul className="mt-2 text-sm">
                  {ts.lines.map((l) => (
                    <li key={l.label} className="flex justify-between border-b border-slate-100 py-0.5">
                      <span>{l.label}</span>
                      <span>{formatMoney(l.amount)}</span>
                    </li>
                  ))}
                </ul>
                {ts.anomalies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ts.anomalies.map((a) => (
                      <Badge key={a.code} tone="red" title={a.message}>
                        {a.code}: {a.message}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => act(approveTimesheet, ts.id, true, "")}>
                    <Check aria-hidden /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => act(approveTimesheet, ts.id, false, note)}>
                    <RotateCcw aria-hidden /> Return
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {recent.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recently decided</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Substitute</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((ts) => (
                  <tr key={ts.id}>
                    <Td>{formatDate(ts.date)}</Td>
                    <Td>{byId(state.substitutes, ts.substitute_id)?.name}</Td>
                    <Td>{formatMoney(ts.amount)}</Td>
                    <Td>
                      <Badge tone={ts.status === "rejected" ? "red" : "green"}>{ts.status}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function RateDialog({ assignmentId, subName }: { assignmentId: string; subName: string }) {
  const { act } = useRepo();
  const [score, setScore] = React.useState(5);
  const [comment, setComment] = React.useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Star aria-hidden /> Rate
        </Button>
      </DialogTrigger>
      <DialogContent title={`Rate ${subName}`} description="Ratings feed matching and are visible to district HR.">
        <div className="space-y-3">
          <Field label="Score (1-5)" htmlFor={`score-${assignmentId}`}>
            <Select id={`score-${assignmentId}`} value={score} onChange={(e) => setScore(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Comment" htmlFor={`cmt-${assignmentId}`}>
            <Textarea id={`cmt-${assignmentId}`} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <DialogClose asChild>
            <Button onClick={() => act(rateSubstitute, assignmentId, score, comment)}>Submit rating</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SchoolSubstitutes() {
  const t = useT();
  const { state, user } = useRepo();
  const { school, schoolId } = useSchool();
  const asg = state.assignments.filter((a) => a.school_id === schoolId && a.status !== "cancelled");
  const subIds = [...new Set(asg.map((a) => a.substitute_id))];
  const completed = asg.filter((a) => a.status === "completed").sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <PageHeader
        title={t("operations.schoolSubs.title")}
        purpose={t("operations.schoolSubs.purpose")}
        action={
          <Button asChild variant="outline">
            <Link href="/app/school">Back to coverage</Link>
          </Button>
        }
        help={<p>The list is built from assignments at your school. Rate each completed day once. Substitutes on the exclusion list are never offered your school (rule R6).</p>}
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Worked here ({subIds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {subIds.length === 0 ? (
            <EmptyState title="No substitutes yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Tier</Th>
                  <Th>Days here</Th>
                  <Th>Reliability</Th>
                  <Th>Rating</Th>
                </tr>
              </thead>
              <tbody>
                {subIds.map((id) => {
                  const s = byId(state.substitutes, id);
                  return (
                    <tr key={id}>
                      <Td className="font-medium">{s?.name}</Td>
                      <Td>{s?.tier}</Td>
                      <Td>{asg.filter((a) => a.substitute_id === id).length}</Td>
                      <Td>{pct(s?.reliability)}</Td>
                      <Td>{s?.rating ? s.rating.toFixed(1) : "No ratings"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Completed assignments to rate</CardTitle>
        </CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <EmptyState title="Nothing to rate yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Substitute</Th>
                  <Th>Teacher</Th>
                  <Th>Rating</Th>
                </tr>
              </thead>
              <tbody>
                {completed.map((a) => {
                  const s = byId(state.substitutes, a.substitute_id);
                  const abs = byId(state.absences, a.absence_id);
                  const mine = state.ratings.find((r) => r.assignment_id === a.id && r.from === user?.id);
                  return (
                    <tr key={a.id}>
                      <Td>{formatDate(a.date)}</Td>
                      <Td>{s?.name}</Td>
                      <Td>{abs && byId(state.teachers, abs.teacher_id)?.name}</Td>
                      <Td>{mine ? <Badge tone="green">Rated {mine.score}/5</Badge> : <RateDialog assignmentId={a.id} subName={s?.name ?? "substitute"} />}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Exclusion list for {school?.name}</CardTitle>
          <CardDescription>Maintained by district HR; requests go through your district contact.</CardDescription>
        </CardHeader>
        <CardContent>
          {school?.excludedSubIds.length ? (
            <ul className="list-disc pl-5 text-sm">
              {school.excludedSubIds.map((id) => (
                <li key={id}>{byId(state.substitutes, id)?.name ?? id}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-700">No substitutes are excluded from this school.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

const STATUS_TONE: Record<string, "red" | "amber" | "green" | "teal" | "neutral"> = { reported: "amber", approved: "amber", matching: "amber", offered: "amber", filled: "green", in_progress: "teal", completed: "neutral", paid: "neutral", cancelled: "neutral" };

export function SchoolCalendar() {
  const t = useT();
  const { state } = useRepo();
  const { schoolId } = useSchool();
  const today = state.now.slice(0, 10);
  // start on the Monday of this week
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const start = addDays(today, -((dow + 6) % 7));
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i)).filter((d) => !isWeekend(d));
  const views = coverage(state, schoolId, days[0], days[days.length - 1]);
  return (
    <>
      <PageHeader
        title={t("operations.calendar.title")}
        purpose={t("operations.calendar.purpose")}
        action={
          <Button asChild>
            <Link href="/app/school">Open coverage board</Link>
          </Button>
        }
        help={<p>Each school day lists the absent teachers and the coverage status. Today is outlined.</p>}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        {days.map((d) => {
          const items = views.filter((v) => v.absence.startDate <= d && v.absence.endDate >= d && v.absence.status !== "cancelled");
          return (
            <Card key={d} className={d === today ? "p-3 ring-2 ring-brand-600" : "p-3"}>
              <p className="text-xs font-semibold uppercase text-slate-600">{formatDate(d)}</p>
              {items.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">No absences</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {items.map((v) => (
                    <li key={v.absence.id} className="text-xs">
                      <span className="font-medium">{v.teacher.name}</span> <Badge tone={v.atRisk ? "red" : STATUS_TONE[v.absence.status]}>{v.atRisk ? "at risk" : v.absence.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

export function SchoolReports() {
  const t = useT();
  const { state } = useRepo();
  const { school, schoolId } = useSchool();
  const abs = state.absences.filter((a) => a.school_id === schoolId && (a.status !== "cancelled" || a.cancelReason?.startsWith("Unfilled")));
  const filled = abs.filter((a) => a.filledAt);
  const ttf = filled.map((a) => minutesBetween(a.createdAt, a.filledAt!)).filter((m) => m >= 0).sort((a, b) => a - b);
  const median = ttf.length ? ttf[Math.floor(ttf.length / 2)] : null;
  const asgIds = new Set(state.assignments.filter((a) => a.school_id === schoolId).map((a) => a.id));
  const handoffs = state.handoffs.filter((h) => asgIds.has(h.assignment_id));
  const continuity = handoffs.length ? handoffs.reduce((a, h) => a + h.continuityScore, 0) / handoffs.length : null;
  const chart = handoffs.slice(-10).map((h) => ({ name: byId(state.teachers, h.teacher_id)?.name.split(" ")[0] ?? h.teacher_id, score: Math.round(h.continuityScore * 100) }));
  const buckets = [
    { name: "0-5 min", n: ttf.filter((m) => m <= 5).length },
    { name: "6-10", n: ttf.filter((m) => m > 5 && m <= 10).length },
    { name: "11-30", n: ttf.filter((m) => m > 10 && m <= 30).length },
    { name: "31-120", n: ttf.filter((m) => m > 30 && m <= 120).length },
    { name: "> 2 h", n: ttf.filter((m) => m > 120).length },
  ];
  return (
    <>
      <PageHeader
        title={t("operations.reports.title")}
        purpose={`${t("operations.reports.purpose")} ${school ? `(${school.name})` : ""}`}
        action={
          <Button asChild variant="outline">
            <Link href="/app/school/calendar">Open calendar</Link>
          </Button>
        }
        help={<p>Fill rate = absences with a filled time / absences needing cover (cancellations excluded unless unfilled). Continuity is the average handoff continuity score for this school.</p>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Fill rate" value={abs.length ? pct(filled.length / abs.length) : "n/a"} hint={`Target: ${pct(KPI_TARGETS.fillRate)} · ${filled.length}/${abs.length}`} />
        <Stat label="Median time to fill" value={median === null ? "n/a" : `${median} min`} hint={`Target: ${KPI_TARGETS.medianTtf} min`} tone="teal" />
        <Stat label="Continuity" value={pct(continuity)} hint={`${handoffs.length} handoffs`} tone="amber" />
        <Stat label="Substitute days" value={state.assignments.filter((a) => a.school_id === schoolId && a.status === "completed").length} hint="Completed assignments" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Time to fill (absences)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <RTooltip />
                <Bar dataKey="n" name="Absences" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Continuity score by handoff (%)</h2>
          {chart.length === 0 ? (
            <EmptyState title="No handoffs yet" body="Handoffs are created from substitute day reports." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <RTooltip />
                  <Bar dataKey="score" name="Continuity %" fill="#4338ca" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export function SchoolPage({ children }: { children: React.ReactNode }) {
  return <Hydrated>{children}</Hydrated>;
}
