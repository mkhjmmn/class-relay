"use client";
import * as React from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { Pause, Play, Save } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogClose, DialogContent, DialogTrigger, Field, Input, Switch, Table, Td, Textarea, Th } from "@/components/ui";
import { EmptyState, PageHeader, PlannedCard, Stat } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { advanceStage, missingRequirements, updateSchoolNotes } from "@/data/commands";
import { KPI_TARGETS } from "@/data/queries";
import { formatTime, minutesBetween, offerConcentration, RULE_PACK, type School, type Substitute } from "@/domain";
import { useT } from "@/i18n/useT";
import { pct } from "@/lib/utils";

function PauseDialog({ sub }: { sub: Substitute }) {
  const { act } = useRepo();
  const pausing = sub.stage !== "paused";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant={pausing ? "outline" : "teal"}>
          {pausing ? <Pause aria-hidden /> : <Play aria-hidden />} {pausing ? "Pause" : "Restore"}
        </Button>
      </DialogTrigger>
      <DialogContent title={`${pausing ? "Pause" : "Restore"} ${sub.name}?`} description={pausing ? "Paused substitutes receive no offers. This is logged in the audit trail." : "Restoring re-checks every requirement before matching resumes."}>
        <div className="flex gap-2">
          <DialogClose asChild>
            <Button variant={pausing ? "danger" : "teal"} onClick={() => act(advanceStage, sub.id, pausing ? "paused" : "active")}>
              Confirm
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SubstitutePool() {
  const t = useT();
  const { state } = useRepo();
  const [q, setQ] = React.useState("");
  const list = state.substitutes.filter((s) => `${s.name} ${s.tier} ${s.stage} ${s.subjects.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader
        title={t("operations.pool.title")}
        purpose={t("operations.pool.purpose")}
        action={
          <Button asChild>
            <Link href="/app/district/onboarding">Open pipeline</Link>
          </Button>
        }
        help={<p>Credential status lists what blocks activation (rule R1). Pause and restore are human actions with a confirmation; restore fails if a requirement is missing.</p>}
      />
      <div className="mb-4 max-w-sm">
        <Field label="Search substitutes" htmlFor="pool-q">
          <Input id="pool-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, tier, stage or subject" />
        </Field>
      </div>
      {list.length === 0 ? (
        <EmptyState title="No substitutes match" body="Try another search." />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Tier</Th>
                <Th>Stage</Th>
                <Th>Reliability</Th>
                <Th>Rating</Th>
                <Th>Days this year</Th>
                <Th>Credentials</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const missing = missingRequirements(state, s.id);
                const review = state.credentials.filter((c) => c.substitute_id === s.id && (c.status === "needs_review" || c.status === "expired")).length;
                return (
                  <tr key={s.id}>
                    <Td className="font-medium">{s.name}</Td>
                    <Td>{s.tier}</Td>
                    <Td>
                      <Badge tone={s.stage === "active" ? "green" : s.stage === "paused" ? "red" : "amber"}>{s.stage}</Badge>
                      {s.pauseReason && <span className="block text-xs text-slate-600">{s.pauseReason}</span>}
                    </Td>
                    <Td>{pct(s.reliability)}</Td>
                    <Td>{s.rating ? s.rating.toFixed(1) : "None"}</Td>
                    <Td>{s.daysThisYear}</Td>
                    <Td>
                      {missing.length === 0 ? <Badge tone="green">Complete</Badge> : <Badge tone="amber">{missing.length} missing</Badge>}
                      {review > 0 && <Badge tone="red">{review} to review</Badge>}
                    </Td>
                    <Td>{(s.stage === "active" || s.stage === "paused") && <PauseDialog sub={s} />}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}

const COLORS = ["#0f766e", "#f59e0b", "#b91c1c", "#4338ca", "#64748b", "#16a34a"];

export function Analytics() {
  const t = useT();
  const { state } = useRepo();
  const bySchool = state.schools.map((sc) => {
    const need = state.absences.filter((a) => a.school_id === sc.id && (a.status !== "cancelled" || a.cancelReason?.startsWith("Unfilled")));
    return { name: sc.short, fill: need.length ? Math.round((need.filter((a) => a.filledAt).length / need.length) * 100) : 0, n: need.length };
  });
  const ttf = state.absences.filter((a) => a.filledAt).map((a) => minutesBetween(a.createdAt, a.filledAt!)).filter((m) => m >= 0);
  const dist = [
    { name: "0-5", n: ttf.filter((m) => m <= 5).length },
    { name: "6-10", n: ttf.filter((m) => m > 5 && m <= 10).length },
    { name: "11-30", n: ttf.filter((m) => m > 10 && m <= 30).length },
    { name: "31-120", n: ttf.filter((m) => m > 30 && m <= 120).length },
    { name: ">120", n: ttf.filter((m) => m > 120).length },
  ];
  const offerCounts = state.substitutes.map((s) => ({ name: s.name.split(" ")[0], n: state.offers.filter((o) => o.substitute_id === s.id).length })).sort((a, b) => b.n - a.n);
  const conc = offerConcentration(offerCounts.map((x) => x.n));
  const credStatus = Object.entries(
    state.credentials.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));
  return (
    <>
      <PageHeader
        title={t("operations.analytics.title")}
        purpose={t("operations.analytics.purpose")}
        action={
          <Button asChild variant="outline">
            <Link href="/app/district">Back to command center</Link>
          </Button>
        }
        help={<p>Charts are computed from the repository on every render. Offer concentration is the share of all offers that went to the top 10 percent of substitutes; a high value means offers are not spread fairly.</p>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Absences filled" value={ttf.length} hint={`of ${state.absences.length} absences`} />
        <Stat label="Offers sent" value={state.offers.length} tone="teal" />
        <Stat label="Offer concentration (top 10%)" value={pct(conc)} hint="Lower is fairer" tone={conc > 0.4 ? "amber" : "teal"} />
        <Stat label="Credentials tracked" value={state.credentials.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Fill rate by school (%) · target {pct(KPI_TARGETS.fillRate)}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySchool}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <RTooltip />
                <Bar dataKey="fill" name="Fill rate %" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Time to fill distribution (minutes)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <RTooltip />
                <Bar dataKey="n" name="Absences" fill="#4338ca" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Offers per substitute (top 15)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={offerCounts.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} fontSize={12} />
                <RTooltip />
                <Bar dataKey="n" name="Offers" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Credential status</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={credStatus} dataKey="value" nameKey="name" outerRadius={90} label>
                  {credStatus.map((c, i) => (
                    <Cell key={c.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {credStatus.map((c) => (
              <li key={c.name}>
                <Badge>
                  {c.name}: {c.value}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-6">
        <PlannedCard title="Absence forecast" does="Will predict absences per school for the next 4 weeks from history and the district calendar, so HR can pre-book substitutes before Monday spikes." />
      </div>
    </>
  );
}

function SchoolNotes({ school }: { school: School }) {
  const { act } = useRepo();
  const [arrival, setArrival] = React.useState(school.arrivalNotes);
  const [duty, setDuty] = React.useState(school.dutyNotes);
  const [hard, setHard] = React.useState(school.hardToFill);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{school.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Arrival notes" htmlFor={`arr-${school.id}`}>
          <Textarea id={`arr-${school.id}`} value={arrival} onChange={(e) => setArrival(e.target.value)} />
        </Field>
        <Field label="Duty notes" htmlFor={`duty-${school.id}`}>
          <Textarea id={`duty-${school.id}`} value={duty} onChange={(e) => setDuty(e.target.value)} />
        </Field>
        <div className="flex items-center gap-2">
          <Switch id={`hard-${school.id}`} checked={hard} onCheckedChange={setHard} />
          <label htmlFor={`hard-${school.id}`} className="text-sm">
            Hard to fill (adds pay bonus)
          </label>
        </div>
        <Button size="sm" onClick={() => act(updateSchoolNotes, school.id, { arrivalNotes: arrival, dutyNotes: duty, hardToFill: hard })}>
          <Save aria-hidden /> Save
        </Button>
      </CardContent>
    </Card>
  );
}

export function Settings() {
  const t = useT();
  const { state } = useRepo();
  const d = state.district;
  return (
    <>
      <PageHeader
        title={t("operations.settings.title")}
        purpose={t("operations.settings.purpose")}
        action={
          <Button asChild variant="outline">
            <Link href="/app/district/automations">Edit automations</Link>
          </Button>
        }
        help={<p>District-level policy is read-only in the demo except school notes. Every save writes an audit event.</p>}
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{d.name}</CardTitle>
          <CardDescription>{d.region}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-slate-600">Data residency</dt>
              <dd className="font-medium">{d.dataResidency}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Time zone</dt>
              <dd className="font-medium">{d.timezone}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Rule pack</dt>
              <dd className="font-medium">
                {d.rulePackId} <Badge tone="amber">{RULE_PACK.label}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Absence approval required</dt>
              <dd className="font-medium">{d.approvalRequired ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-slate-600">T4 annual day limit</dt>
              <dd className="font-medium">{d.t4AnnualDayLimit} days</dd>
            </div>
            <div>
              <dt className="text-slate-600">Weekly hours warn / block</dt>
              <dd className="font-medium">
                {RULE_PACK.weeklyHoursWarn} h / {RULE_PACK.weeklyHoursBlock} h
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <h2 className="mb-3 text-lg font-semibold">School notes</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {state.schools.map((s) => (
          <SchoolNotes key={s.id} school={s} />
        ))}
      </div>
    </>
  );
}

export function Notifications() {
  const t = useT();
  const { state, user } = useRepo();
  const mine = state.notifications.filter((n) => n.channel === "in_app" && n.toUserId === user?.id).reverse();
  const outbox = state.notifications.filter((n) => n.channel !== "in_app").slice(-30).reverse();
  return (
    <>
      <PageHeader
        title={t("operations.notifications.title")}
        purpose={t("operations.notifications.purpose")}
        action={
          <Button asChild variant="outline">
            <Link href="/app">Back to my home</Link>
          </Button>
        }
        help={<p>In-app messages are addressed to you. The outbox shows what SMS, email and WhatsApp messages would look like; {t("operations.demoNotSent").toLowerCase()}.</p>}
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>In-app ({mine.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {mine.length === 0 ? (
            <EmptyState title="No notifications for you yet" />
          ) : (
            <ul className="space-y-2">
              {mine.map((n) => (
                <li key={n.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="font-semibold">{n.subject}</p>
                  <p className="text-slate-700">{n.body}</p>
                  <p className="text-xs text-slate-500">{formatTime(n.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Outbox preview <Badge tone="amber">{t("operations.demoNotSent")}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {outbox.length === 0 ? (
            <EmptyState title="Outbox is empty" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Channel</Th>
                  <Th>To</Th>
                  <Th>Subject</Th>
                  <Th>Body</Th>
                  <Th>Language</Th>
                </tr>
              </thead>
              <tbody>
                {outbox.map((n) => (
                  <tr key={n.id}>
                    <Td>
                      <Badge tone="teal">{n.channel}</Badge>
                    </Td>
                    <Td className="text-xs">{n.to}</Td>
                    <Td>{n.subject}</Td>
                    <Td className="max-w-sm text-xs">{n.body}</Td>
                    <Td>{n.language}</Td>
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
