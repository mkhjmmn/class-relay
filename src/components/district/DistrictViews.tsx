"use client";
import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Download, FileCheck2, PlayCircle, ShieldAlert, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogClose, DialogContent, DialogTrigger, Field, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { EmptyState, PageHeader, Stat } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { byId, coverage, kpis, KPI_TARGETS } from "@/data/queries";
import { approvePayRun, createPayRun, exportPayRun, resolveAlert, reviewCredential } from "@/data/commands";
import { addDays, CREDENTIAL_LABELS, formatDate, formatMoney, payPeriodFor, RULE_PACK, RULES, timesheetsToCsv, weeklyHours } from "@/domain";
import { useT } from "@/i18n/useT";
import { downloadFile, pct } from "@/lib/utils";

const TASKS = [
  { key: "credential", label: "Review the flagged credential", href: "/app/district/compliance" },
  { key: "alert", label: "Resolve a compliance alert", href: "/app/district/compliance" },
  { key: "payroll", label: "Run and export payroll", href: "/app/district/payroll" },
  { key: "automation", label: "Edit an automation", href: "/app/district/automations" },
  { key: "trace", label: "Open an agent trace", href: "/app/district/agents" },
  { key: "audit", label: "Run the global audit", href: "/audit" },
] as const;

function TourPanel() {
  const { state, session, setSession } = useRepo();
  const [fromQuery] = React.useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tour") === "1");
  const show = fromQuery || session.tourDone.district_admin === false;
  if (!show) return null;
  const derived: Record<string, boolean> = {
    credential: state.audit.some((e) => e.action === "credential.verified" || e.action === "credential.rejected"),
    alert: state.audit.some((e) => e.action === "alert.resolved"),
    payroll: state.audit.some((e) => e.action === "payrun.exported"),
    automation: state.audit.some((e) => e.action.startsWith("automation.")),
  };
  const isDone = (k: string) => !!session.checklist[`district_admin.${k}`] || !!derived[k];
  const done = TASKS.filter((x) => isDone(x.key)).length;
  return (
    <Card className="mb-6 border-brand-200 bg-brand-50/40">
      <CardHeader>
        <CardTitle>Guided tour: Try these 5 tasks (plus the audit)</CardTitle>
        <CardDescription>
          You are Jordan Lee, district HR and operations. {done} of {TASKS.length} done.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {TASKS.map((x, i) => {
            const ok = isDone(x.key);
            return (
              <li key={x.key} className="flex flex-wrap items-center gap-2 text-sm">
                <button
                  type="button"
                  aria-label={`${ok ? "Mark not done" : "Mark done"}: ${x.label}`}
                  aria-pressed={ok}
                  onClick={() => setSession({ checklist: { ...session.checklist, [`district_admin.${x.key}`]: !session.checklist[`district_admin.${x.key}`] } })}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                >
                  {ok ? <CheckCircle2 aria-hidden className="size-5 text-teal-700" /> : <Circle aria-hidden className="size-5 text-slate-500" />}
                </button>
                <span className={ok ? "text-slate-600 line-through" : "text-slate-900"}>
                  {i + 1}. {x.label}
                </span>
                <Link className="text-brand-700 underline" href={x.href}>
                  Go
                </Link>
              </li>
            );
          })}
        </ol>
        <Button className="mt-3" size="sm" variant="ghost" onClick={() => setSession({ tourDone: { ...session.tourDone, district_admin: true } })}>
          Hide tour
        </Button>
      </CardContent>
    </Card>
  );
}

export function CommandCenter() {
  const t = useT();
  const { state } = useRepo();
  const k = kpis(state);
  const today = state.now.slice(0, 10);
  const todays = coverage(state, undefined, today, today).filter((v) => v.absence.status !== "cancelled");
  const open = state.alerts.filter((a) => a.status === "open");
  return (
    <>
      <PageHeader
        title={t("operations.command.title")}
        purpose={t("operations.command.purpose")}
        action={
          <Button asChild>
            <Link href="/app/district/compliance">
              <ShieldAlert aria-hidden /> Review compliance ({k.openAlerts})
            </Link>
          </Button>
        }
        help={
          <>
            <p>Every number is computed from the repository snapshot. Targets are labelled separately and are goals, not results.</p>
            <p>Add ?tour=1 to the URL to show the guided tour again.</p>
          </>
        }
      />
      <TourPanel />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Fill rate" value={pct(k.fillRate)} hint={`Target: ${pct(KPI_TARGETS.fillRate)}`} />
        <Stat label="Median time to fill" value={`${k.medianTtf} min`} hint={`Target: under ${KPI_TARGETS.medianTtf} min`} tone="teal" />
        <Stat label="Compliant placements" value={pct(k.compliance)} hint={`Target: ${pct(KPI_TARGETS.compliance)}`} tone={k.compliance < 1 ? "amber" : "teal"} />
        <Stat label="Continuity" value={pct(k.continuity)} hint="Average handoff score (no target set)" tone="amber" />
        <Stat label="Open alerts" value={k.openAlerts} hint="Target: 0" tone={k.openAlerts ? "red" : "teal"} />
        <Stat label="Pending timesheets" value={k.pendingTimesheets} hint={`Target: approved within ${KPI_TARGETS.timesheetHours} h`} tone="amber" />
        <Stat label="Exported timesheets" value={k.exportedTimesheets} hint="Exported or paid" />
        <Stat label="Active substitutes" value={k.activeSubs} hint="Stage: active" tone="teal" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open alerts ({open.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {open.length === 0 ? (
              <EmptyState title="No open alerts" />
            ) : (
              <ul className="space-y-2">
                {open.slice(0, 8).map((a) => (
                  <li key={a.id} className="rounded-xl bg-slate-50 p-2 text-sm">
                    <Badge tone={a.severity === "block" ? "red" : a.severity === "warn" ? "amber" : "neutral"}>{a.ruleId}</Badge> <strong>{byId(state.substitutes, a.substitute_id)?.name}</strong>: {a.message}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s coverage across {state.schools.length} schools</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>School</Th>
                  <Th>Absences</Th>
                  <Th>Covered</Th>
                  <Th>At risk</Th>
                </tr>
              </thead>
              <tbody>
                {state.schools.map((sc) => {
                  const v = todays.filter((x) => x.school.id === sc.id);
                  const covered = v.filter((x) => ["filled", "in_progress", "completed", "paid"].includes(x.absence.status)).length;
                  const risk = v.filter((x) => x.atRisk).length;
                  return (
                    <tr key={sc.id}>
                      <Td className="font-medium">{sc.name}</Td>
                      <Td>{v.length}</Td>
                      <Td>{covered}</Td>
                      <Td>{risk ? <Badge tone="red">{risk}</Badge> : 0}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function RejectDialog({ credId, label }: { credId: string; label: string }) {
  const { act } = useRepo();
  const [reason, setReason] = React.useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <X aria-hidden /> Reject
        </Button>
      </DialogTrigger>
      <DialogContent title={`Reject ${label}`} description="A reason is required (rule R8). The substitute is notified.">
        <Field label="Reason for rejection" htmlFor={`rej-${credId}`}>
          <Textarea id={`rej-${credId}`} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </Field>
        <DialogClose asChild>
          <Button className="mt-3" variant="danger" disabled={!reason.trim()} onClick={() => act(reviewCredential, credId, "rejected", reason)}>
            Reject with reason
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function Compliance() {
  const t = useT();
  const { state, act } = useRepo();
  const today = state.now.slice(0, 10);
  const queue = state.credentials.filter((c) => ["needs_review", "expired", "pending"].includes(c.status));
  const alerts = [...state.alerts].sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "open" ? -1 : 1));
  const ruleText = (id: string) => RULES.find((r) => r.id === id);
  const t4 = state.substitutes.filter((s) => s.tier === "T4");
  const hours = state.substitutes
    .map((s) => ({ s, h: weeklyHours(state.assignments.filter((a) => a.substitute_id === s.id), today) }))
    .filter((x) => x.h >= RULE_PACK.weeklyHoursWarn * 0.6)
    .sort((a, b) => b.h - a.h);
  const paused = state.substitutes.filter((s) => s.stage === "paused");
  return (
    <>
      <PageHeader
        title={t("operations.compliance.title")}
        purpose={t("operations.compliance.purpose")}
        action={
          <Button asChild variant="outline">
            <Link href="/audit">Run global audit</Link>
          </Button>
        }
        help={
          <>
            <p>Nothing is auto-rejected. Low-confidence extractions land here for a human. Rejection requires a reason and writes an audit event.</p>
            <p>{RULE_PACK.label}.</p>
          </>
        }
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Credential review queue ({queue.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <EmptyState title="Queue is clear" body="Every credential is verified or rejected." />
          ) : (
            <div className="space-y-3">
              {queue.map((c) => {
                const sub = byId(state.substitutes, c.substitute_id);
                return (
                  <div key={c.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        {sub?.name} · {CREDENTIAL_LABELS[c.type]}
                      </p>
                      <div className="flex gap-1">
                        <Badge tone={c.status === "expired" ? "red" : "amber"}>{c.status.replace("_", " ")}</Badge>
                        {c.confidence !== undefined && <Badge tone={c.confidence >= 0.8 ? "green" : "amber"}>Extraction confidence {pct(c.confidence)}</Badge>}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      {c.documentName ?? "No document"} · {c.number} · {c.issuer} · expires {c.expiryDate ? formatDate(c.expiryDate) : "never"}
                    </p>
                    {c.reviewNote && <p className="mt-1 text-sm text-amber-900">{c.reviewNote}</p>}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => act(reviewCredential, c.id, "verified", "Verified by human review")}>
                        <FileCheck2 aria-hidden /> Verify
                      </Button>
                      <RejectDialog credId={c.id} label={CREDENTIAL_LABELS[c.type]} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <EmptyState title="No alerts" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Rule</Th>
                  <Th>Substitute</Th>
                  <Th>Message</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <Td>
                      <Badge tone={a.severity === "block" ? "red" : a.severity === "warn" ? "amber" : "neutral"} title={ruleText(a.ruleId)?.text}>
                        {a.ruleId}
                      </Badge>
                      <span className="mt-1 block max-w-xs text-xs text-slate-600">{ruleText(a.ruleId)?.text}</span>
                    </Td>
                    <Td>{byId(state.substitutes, a.substitute_id)?.name}</Td>
                    <Td>{a.message}</Td>
                    <Td>{a.status === "open" ? <Badge tone="amber">open</Badge> : <Badge tone="green">resolved by {a.resolvedBy}</Badge>}</Td>
                    <Td>
                      {a.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => act(resolveAlert, a.id)}>
                          Resolve
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>T4 retiree day limit (R5)</CardTitle>
            <CardDescription>Limit {state.district.t4AnnualDayLimit} days; warn at {pct(RULE_PACK.t4WarnRatio)}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {t4.map((s) => {
                const r = s.daysThisYear / state.district.t4AnnualDayLimit;
                return (
                  <li key={s.id} className="flex justify-between">
                    <span>{s.name}</span>
                    <Badge tone={r >= 1 ? "red" : r >= RULE_PACK.t4WarnRatio ? "amber" : "neutral"}>
                      {s.daysThisYear}/{state.district.t4AnnualDayLimit}
                    </Badge>
                  </li>
                );
              })}
              {t4.length === 0 && <li>No T4 substitutes.</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly hours (R4)</CardTitle>
            <CardDescription>
              Warn at {RULE_PACK.weeklyHoursWarn} h, block at {RULE_PACK.weeklyHoursBlock} h, week of {formatDate(today)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {hours.slice(0, 10).map(({ s, h }) => (
                <li key={s.id} className="flex justify-between">
                  <span>{s.name}</span>
                  <Badge tone={h >= RULE_PACK.weeklyHoursBlock ? "red" : h >= RULE_PACK.weeklyHoursWarn ? "amber" : "neutral"}>{h} h</Badge>
                </li>
              ))}
              {hours.length === 0 && <li>No one is near the weekly cap.</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Paused substitutes ({paused.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {paused.map((s) => (
                <li key={s.id}>
                  <strong>{s.name}</strong>: {s.pauseReason ?? "No reason recorded"}
                </li>
              ))}
              {paused.length === 0 && <li>Nobody is paused.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function Payroll() {
  const t = useT();
  const { state, act, repo } = useRepo();
  const today = state.now.slice(0, 10);
  const current = payPeriodFor(today);
  const previous = payPeriodFor(addDays(current.start, -1));
  const periods = [previous, current];
  const [sel, setSel] = React.useState(0);
  const period = periods[sel];
  const approved = state.timesheets.filter((ts) => ts.status === "approved" && !ts.payRunId && ts.date >= period.start && ts.date <= period.end);
  const runs = [...state.payRuns].reverse();
  const active = runs.find((r) => r.periodStart === period.start && r.status !== "exported") ?? runs.find((r) => r.periodStart === period.start);
  const runTs = active ? state.timesheets.filter((ts) => active.timesheetIds.includes(ts.id)) : [];
  const flagged = runTs.filter((ts) => ts.anomalies.length);

  const exportRun = (id: string) => {
    const r = act(exportPayRun, id);
    if (!r.ok) return;
    const fresh = repo.getState();
    const run = fresh.payRuns.find((x) => x.id === id);
    const rows = fresh.timesheets
      .filter((ts) => ts.payRunId === id)
      .map((ts) => ({ ...ts, substituteName: byId(state.substitutes, ts.substitute_id)?.name ?? ts.substitute_id, schoolName: byId(state.schools, ts.school_id)?.name ?? ts.school_id }));
    downloadFile(`classrelay-payrun-${run?.periodStart ?? id}.csv`, timesheetsToCsv(rows), "text/csv");
  };

  return (
    <>
      <PageHeader
        title={t("operations.payroll.title")}
        purpose={t("operations.payroll.purpose")}
        action={
          <Button disabled={!approved.length} onClick={() => act(createPayRun, period.start, period.end)}>
            <PlayCircle aria-hidden /> Create draft run ({approved.length})
          </Button>
        }
        help={
          <>
            <p>The payroll agent drafts the run and flags anomalies (duplicates, overlaps, rate mismatches, hour caps, outside bell). A human must approve before export.</p>
            <p>Export writes a CSV for your payroll system. Nothing is sent to a bank in the demo.</p>
          </>
        }
      />
      <div className="mb-6 max-w-sm">
        <Field label="Pay period" htmlFor="period">
          <Select id="period" value={sel} onChange={(e) => setSel(Number(e.target.value))}>
            {periods.map((p, i) => (
              <option key={p.start} value={i}>
                {formatDate(p.start)} to {formatDate(p.end)}
                {i === 1 ? " (current)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <p className="mt-1 text-xs text-slate-600">{approved.length} approved timesheets not yet in a run.</p>
      </div>
      {active ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Pay run {active.id} · <Badge tone={active.status === "draft" ? "amber" : active.status === "approved" ? "teal" : "green"}>{active.status}</Badge>
            </CardTitle>
            <CardDescription>
              {active.timesheetIds.length} timesheets · total {formatMoney(active.total)} · {flagged.length} flagged
              {active.approvedBy && ` · approved by ${active.approvedBy}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flagged.length > 0 ? (
              <ul className="mb-3 space-y-1">
                {flagged.map((ts) => (
                  <li key={ts.id} className="rounded-lg bg-red-50 p-2 text-sm">
                    <strong>{byId(state.substitutes, ts.substitute_id)?.name}</strong> · {formatDate(ts.date)} · {formatMoney(ts.amount)}:{" "}
                    {ts.anomalies.map((a) => (
                      <Badge key={a.code} tone="red" className="mr-1">
                        {a.code}: {a.message}
                      </Badge>
                    ))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-slate-700">No anomalies flagged in this run.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {active.status === "draft" && <Button onClick={() => act(approvePayRun, active.id)}>Approve run (human)</Button>}
              {active.status !== "draft" && (
                <Button variant="teal" onClick={() => exportRun(active.id)}>
                  <Download aria-hidden /> {active.status === "exported" ? "Download CSV again" : "Export CSV"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mb-6">
          <EmptyState title="No pay run for this period yet" body={approved.length ? "Create a draft run to scan for anomalies." : "There are no approved timesheets in this period."} />
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Pay run history</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <EmptyState title="No pay runs yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Run</Th>
                  <Th>Period</Th>
                  <Th>Timesheets</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <Td className="font-mono text-xs">{r.id}</Td>
                    <Td>
                      {formatDate(r.periodStart)} to {formatDate(r.periodEnd)}
                    </Td>
                    <Td>{r.timesheetIds.length}</Td>
                    <Td>{formatMoney(r.total)}</Td>
                    <Td>
                      <Badge tone={r.status === "exported" ? "green" : "amber"}>{r.status}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
