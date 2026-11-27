"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AiResult, EmptyState, Hydrated, PageHeader } from "@/components/shell/Page";
import { Badge, Button, Card, Field, Select } from "@/components/ui";
import { assignmentsForSub } from "@/data/queries";
import { generateBrief, viewSupports, type Actor } from "@/data/commands";
import type { DemoState } from "@/data/state";
import type { Language } from "@/domain";
import { useT } from "@/i18n/useT";
import { NotSubstitute, label, statusTone, useSub } from "./common";

const regenerate = (s: DemoState, _a: Actor, id: string, lang: Language) => {
  generateBrief(s, id, lang);
  return { ok: true as const, value: undefined, message: "Sub Brief regenerated." };
};

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-900">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </section>
  );
}

function Body() {
  const t = useT();
  const params = useSearchParams();
  const { sub, state, act, markTask } = useSub();
  const [supports, setSupports] = React.useState<{ id: string; notes: string[] } | null>(null);
  const [supportsError, setSupportsError] = React.useState<string | null>(null);
  const selected = params.get("a");
  const rows = sub ? assignmentsForSub(state, sub.id).filter((r) => r.brief) : [];
  const current = rows.find((r) => r.assignment.id === selected);
  React.useEffect(() => {
    if (current) markTask("brief");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.assignment.id]);
  if (!sub) return <NotSubstitute />;

  const header = (
    <PageHeader
      title={t("experience.sub.briefs")}
      purpose={t("experience.sub.briefsPurpose")}
      action={
        <Button asChild variant="outline">
          <Link href="/app/sub/coach" onClick={() => markTask("coach")}>
            Ask the Prep Coach
          </Link>
        </Button>
      }
      help={
        <>
          <p>The Lesson Continuity agent builds each brief from the teacher&apos;s plan, classroom routines and the school handbook. Sources and confidence are shown under the brief.</p>
          <p>Student supports are need-to-know notes approved by the school. They open 12 hours before the bell and close when the day ends; every view is logged.</p>
        </>
      }
    />
  );

  if (!current) {
    return (
      <>
        {header}
        {rows.length === 0 ? (
          <EmptyState title="No Sub Briefs yet" body="A brief is generated the moment you accept a job." action={<Button asChild><Link href="/app/sub/jobs">See offers</Link></Button>} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map(({ assignment: a, school, teacher }) => (
              <li key={a.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-950">{a.date}</p>
                      <p className="text-sm text-slate-700">
                        {school.name} · {teacher.name} ({teacher.subject})
                      </p>
                    </div>
                    <Badge tone={statusTone(a.status)}>{label(a.status)}</Badge>
                  </div>
                  <Button asChild size="sm" className="mt-3">
                    <Link href={`/app/sub/briefs?a=${a.id}`}>Open brief</Link>
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const b = current.brief!;
  const a = current.assignment;
  return (
    <>
      {header}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/app/sub/briefs">All briefs</Link>
        </Button>
        <div className="w-48">
          <Field label="Brief language" htmlFor="brief-lang">
            <Select id="brief-lang" value={b.language} onChange={(e) => act(regenerate, a.id, e.target.value as Language)}>
              <option value="en">English</option>
              <option value="bn">বাংলা (Bangla)</option>
              <option value="es">Español</option>
            </Select>
          </Field>
        </div>
      </div>
      <AiResult meta={b.meta} entityId={b.id} title={`Sub Brief · ${a.date} · ${current.school.name}`}>
        <p className="text-slate-900">{b.dayAtAGlance}</p>
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-semibold">Arrival: </span>
          {b.arrival}
        </p>
        <section className="mt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Periods</h3>
          <ol className="mt-2 space-y-3">
            {b.periods.map((p) => (
              <li key={p.period} className="rounded-xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-950">
                  P{p.period} · {p.time} · {p.className}
                </p>
                <p className="text-sm text-slate-800">Objective: {p.objective}</p>
                <ul className="mt-1 list-decimal pl-5 text-sm text-slate-800">
                  {p.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                {p.materials.length > 0 && <p className="mt-1 text-xs text-slate-700">Materials: {p.materials.join(", ")}</p>}
                {p.differentiation && <p className="text-xs text-slate-700">Differentiation: {p.differentiation}</p>}
              </li>
            ))}
          </ol>
        </section>
        <Section title="Routines" items={b.routines} />
        <Section title="Emergency procedures" items={b.emergency} />
        <Section title="Contacts" items={b.contacts} />
        <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <h3 className="text-sm font-semibold text-amber-900">Need-to-know student supports</h3>
          {supports?.id === a.id ? (
            supports.notes.length ? (
              <ul className="mt-1 list-disc pl-5 text-sm text-amber-950">
                {supports.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-amber-950">No approved supports for this class.</p>
            )
          ) : (
            <>
              <p className="mt-1 text-sm text-amber-950">Hidden until you open them. Opening is logged for the school.</p>
              {supportsError && <p className="mt-1 text-sm text-red-800">{supportsError}</p>}
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  const r = act(viewSupports, a.id);
                  if (r.ok && "value" in r) {
                    setSupports({ id: a.id, notes: r.value });
                    setSupportsError(null);
                  } else if (!r.ok) setSupportsError(r.error);
                }}
              >
                Show supports
              </Button>
            </>
          )}
        </section>
      </AiResult>
    </>
  );
}

export function Briefs() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
