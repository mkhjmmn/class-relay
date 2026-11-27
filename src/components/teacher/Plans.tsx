"use client";
import * as React from "react";
import { EmptyState, Hydrated, PageHeader } from "@/components/shell/Page";
import { Badge, Button, Card, Field, Input, Progress, Textarea } from "@/components/ui";
import { saveLessonPlan } from "@/data/commands";
import { useT } from "@/i18n/useT";
import { NotTeacher, useTeacher } from "./common";

function Body() {
  const t = useT();
  const { teacher, state, act } = useTeacher();
  const [title, setTitle] = React.useState("");
  const [text, setText] = React.useState("");
  const [emergency, setEmergency] = React.useState(true);
  if (!teacher) return <NotTeacher />;
  const plans = state.lessonPlans.filter((p) => p.teacher_id === teacher.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const em = plans.filter((p) => p.emergency).length;
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const steps = text
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const r = act(saveLessonPlan, {
      teacher_id: teacher.id,
      title,
      emergency,
      source: "paste",
      periods: teacher.classes.map((c) => ({ period: c.period, className: c.name, objective: steps[0] ?? title, activities: steps.length ? steps : [title], materials: [], minutes: 50 })),
    });
    if (r.ok) {
      setTitle("");
      setText("");
    }
  };
  return (
    <>
      <PageHeader title={t("experience.teacher.plans")} purpose={t("experience.teacher.plansPurpose")} help={<p>Emergency plans are used when an absence is reported without a dated plan. Keep at least three ready. Pasted plans are applied to every one of your class periods.</p>} />
      <Card className="mb-6 p-5">
        <p className="font-semibold text-slate-950">Emergency plan coverage: {em} of 3</p>
        <div className="mt-2">
          <Progress value={Math.min(100, (em / 3) * 100)} label="Emergency plan coverage" />
        </div>
      </Card>
      <Card className="mb-6 p-5">
        <form onSubmit={save} className="space-y-3">
          <h2 className="font-semibold text-slate-950">Paste a new plan</h2>
          <Field label="Title" htmlFor="plan-title">
            <Input id="plan-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ratios review with exit ticket" />
          </Field>
          <Field label="Plan steps (one per line)" htmlFor="plan-text">
            <Textarea id="plan-text" required value={text} onChange={(e) => setText(e.target.value)} placeholder={"Warm-up: 5 ratio problems on the board\nWorksheet pages 42-43 in pairs\nExit ticket in the blue folder"} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-900">
            <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} /> Emergency plan (usable any day)
          </label>
          <Button type="submit">Save plan</Button>
        </form>
      </Card>
      {plans.length === 0 ? (
        <EmptyState title="No plans yet" body="Paste your first plan above." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {plans.map((p) => (
            <li key={p.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-950">{p.title}</p>
                  <Badge tone={p.emergency ? "amber" : "neutral"}>{p.emergency ? "Emergency" : (p.date ?? "Dated")}</Badge>
                </div>
                <p className="text-sm text-slate-700">
                  {p.periods.length} periods · source {p.source} · updated {p.updatedAt.slice(0, 10)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function Plans() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
