"use client";
import { EmptyState, Hydrated, PageHeader, Stat } from "@/components/shell/Page";
import { Badge, Card } from "@/components/ui";
import { byId } from "@/data/queries";
import { useT } from "@/i18n/useT";
import { NotSubstitute, label, money, statusTone, useSub } from "./common";

/** Semi-monthly pay periods: 1st-15th and 16th-end of month. */
const period = (d: string) => `${d.slice(0, 7)} ${Number(d.slice(8, 10)) <= 15 ? "(1st to 15th)" : "(16th to end)"}`;

function Body() {
  const t = useT();
  const { sub, state } = useSub();
  if (!sub) return <NotSubstitute />;
  const ts = state.timesheets.filter((x) => x.substitute_id === sub.id).sort((a, b) => b.date.localeCompare(a.date));
  const groups = new Map<string, typeof ts>();
  for (const x of ts) groups.set(period(x.date), [...(groups.get(period(x.date)) ?? []), x]);
  const total = ts.reduce((a, x) => a + x.amount, 0);
  const paid = ts.filter((x) => x.status === "paid" || x.status === "exported").reduce((a, x) => a + x.amount, 0);
  return (
    <>
      <PageHeader
        title={t("experience.sub.earnings")}
        purpose={t("experience.sub.earningsPurpose")}
        help={
          <>
            <p>Each end-of-day report creates a timesheet from the district pay rules: daily rate by tier, half-day ratio and long-term uplift after consecutive days.</p>
            <p>Statuses: submitted (waiting for the school), approved, exported to payroll, paid.</p>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="All timesheets" value={money(total)} />
        <Stat label="Exported or paid" value={money(paid)} tone="teal" />
        <Stat label="Days worked" value={ts.length} tone="amber" />
      </div>
      {ts.length === 0 ? (
        <EmptyState title="No timesheets yet" body="Submit an end-of-day report after your first assignment to create a timesheet." />
      ) : (
        [...groups.entries()].map(([p, list]) => (
          <section key={p} className="mb-6">
            <h2 className="mb-2 flex items-center justify-between font-semibold text-slate-950">
              <span>Pay period {p}</span>
              <span className="text-brand-800">{money(list.reduce((a, x) => a + x.amount, 0))}</span>
            </h2>
            <ul className="space-y-3">
              {list.map((x) => (
                <li key={x.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {x.date} · {byId(state.schools, x.school_id)?.name}
                        </p>
                        <p className="text-sm text-slate-700">
                          {x.hours} h · {x.dayPart === "full" ? "Full day" : x.dayPart.toUpperCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-brand-800">{money(x.amount)}</p>
                        <Badge tone={statusTone(x.status)}>{label(x.status)}</Badge>
                      </div>
                    </div>
                    <ul className="mt-2 space-y-0.5 text-sm">
                      {x.lines.map((l) => (
                        <li key={l.label} className="flex justify-between text-slate-800">
                          <span>{l.label}</span>
                          <span>{money(l.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

export function Earnings() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
