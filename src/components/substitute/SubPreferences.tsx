"use client";
import * as React from "react";
import { Hydrated, PageHeader } from "@/components/shell/Page";
import { Button, Card, Field, Input } from "@/components/ui";
import { updateSubstitute } from "@/data/commands";
import { GradeBandSchema, LanguageSchema, SubjectSchema, type GradeBand, type Language, type Subject, type Substitute } from "@/domain";
import { useT } from "@/i18n/useT";
import { NotSubstitute, useSub } from "./common";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LANG: Record<Language, string> = { en: "English", bn: "Bangla", es: "Spanish" };

function Checks<T extends string | number>({ legend, options, value, onChange, render }: { legend: string; options: readonly T[]; value: T[]; onChange: (v: T[]) => void; render?: (o: T) => string }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">{legend}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={String(o)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900">
            <input type="checkbox" checked={value.includes(o)} onChange={(e) => onChange(e.target.checked ? [...value, o] : value.filter((x) => x !== o))} />
            {render ? render(o) : String(o)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Form({ sub }: { sub: Substitute }) {
  const t = useT();
  const { state, act } = useSub();
  const [subjects, setSubjects] = React.useState<Subject[]>(sub.subjects);
  const [grades, setGrades] = React.useState<GradeBand[]>(sub.gradeBands);
  const [schools, setSchools] = React.useState<string[]>(sub.preferredSchoolIds);
  const [days, setDays] = React.useState<number[]>(sub.availableDays);
  const [dist, setDist] = React.useState(sub.maxDistance);
  const [langs, setLangs] = React.useState<Language[]>(sub.languages);
  const names = Object.fromEntries(state.schools.map((s) => [s.id, s.name]));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act(updateSubstitute, sub.id, { subjects, gradeBands: grades, preferredSchoolIds: schools, availableDays: [...days].sort(), maxDistance: dist, languages: langs });
      }}
    >
      <Card className="space-y-4 p-5">
        <Checks legend="Subjects" options={SubjectSchema.options} value={subjects} onChange={setSubjects} />
        <Checks legend="Grade bands" options={GradeBandSchema.options} value={grades} onChange={setGrades} />
        <Checks legend="Preferred schools" options={state.schools.map((s) => s.id)} value={schools} onChange={setSchools} render={(id) => names[id]} />
        <Checks legend="Available days" options={[1, 2, 3, 4, 5]} value={days} onChange={setDays} render={(d) => DAYS[d]} />
        <Checks legend="Languages (first is used for messages and briefs)" options={LanguageSchema.options} value={langs} onChange={setLangs} render={(l) => LANG[l]} />
        <div className="max-w-xs">
          <Field label="Maximum distance (miles)" htmlFor="pref-dist">
            <Input id="pref-dist" type="number" min={1} max={60} value={dist} onChange={(e) => setDist(Number(e.target.value) || 1)} />
          </Field>
        </div>
        <Button type="submit">{t("experience.save")}</Button>
      </Card>
    </form>
  );
}

function Body() {
  const t = useT();
  const { sub } = useSub();
  if (!sub) return <NotSubstitute />;
  return (
    <>
      <PageHeader
        title={t("experience.sub.preferences")}
        purpose={t("experience.sub.preferencesPurpose")}
        help={<p>Matching only offers jobs that fit your subjects, grade bands, days and distance. Preferred schools add to your score. Changes apply to the next wave of offers.</p>}
      />
      <Form key={sub.id} sub={sub} />
    </>
  );
}

export function SubPreferences() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
