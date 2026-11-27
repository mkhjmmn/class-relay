"use client";
import * as React from "react";
import { Hydrated, PageHeader } from "@/components/shell/Page";
import { Button, Card, Field, Textarea } from "@/components/ui";
import { updateTeacher } from "@/data/commands";
import type { Teacher } from "@/domain";
import { useT } from "@/i18n/useT";
import { NotTeacher, useTeacher } from "./common";

function Form({ teacher }: { teacher: Teacher }) {
  const t = useT();
  const { state, act } = useTeacher();
  const [routines, setRoutines] = React.useState(teacher.routines);
  const [behavior, setBehavior] = React.useState(teacher.behaviorPlan);
  const [seating, setSeating] = React.useState(teacher.seatingNotes);
  const [pref, setPref] = React.useState<string[]>(teacher.preferredSubIds);
  const [excl, setExcl] = React.useState<string[]>(teacher.excludedSubIds);
  const subs = state.substitutes.filter((s) => s.stage === "active" || pref.includes(s.id) || excl.includes(s.id));
  const toggle = (list: string[], set: (v: string[]) => void, id: string, on: boolean) => set(on ? [...list, id] : list.filter((x) => x !== id));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act(updateTeacher, teacher.id, { routines, behaviorPlan: behavior, seatingNotes: seating, preferredSubIds: pref, excludedSubIds: excl });
      }}
    >
      <Card className="space-y-4 p-5">
        <Field label="Classroom routines" htmlFor="tp-routines">
          <Textarea id="tp-routines" value={routines} onChange={(e) => setRoutines(e.target.value)} />
        </Field>
        <Field label="Behavior plan" htmlFor="tp-behavior">
          <Textarea id="tp-behavior" value={behavior} onChange={(e) => setBehavior(e.target.value)} />
        </Field>
        <Field label="Seating notes" htmlFor="tp-seating" hint="No student names or diagnoses: describe the arrangement.">
          <Textarea id="tp-seating" value={seating} onChange={(e) => setSeating(e.target.value)} />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium text-slate-800">Substitutes: preferred or do not send</legend>
          <ul className="mt-2 max-h-80 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="text-slate-900">
                  {s.name} <span className="text-slate-600">({s.subjects.slice(0, 2).join(", ")})</span>
                </span>
                <span className="flex gap-3">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={pref.includes(s.id)} onChange={(e) => toggle(pref, setPref, s.id, e.target.checked)} /> Preferred
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={excl.includes(s.id)} onChange={(e) => toggle(excl, setExcl, s.id, e.target.checked)} /> Do not send
                  </label>
                </span>
              </li>
            ))}
          </ul>
        </fieldset>
        <Button type="submit">{t("experience.save")}</Button>
      </Card>
    </form>
  );
}

function Body() {
  const t = useT();
  const { teacher } = useTeacher();
  if (!teacher) return <NotTeacher />;
  return (
    <>
      <PageHeader title={t("experience.teacher.preferences")} purpose={t("experience.teacher.preferencesPurpose")} help={<p>Routines, behavior plan and seating notes go into every Sub Brief. Preferred substitutes get the first wave of offers; do-not-send substitutes are never offered your classes.</p>} />
      <Form key={teacher.id} teacher={teacher} />
    </>
  );
}

export function TeacherPreferences() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
