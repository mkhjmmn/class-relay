"use client";
import { useState } from "react";

type Inputs = { teachers: number; absenceRate: number; minutesToday: number; hourlyCost: number; unfilledRate: number };

const DEFAULTS: Inputs = { teachers: 400, absenceRate: 5, minutesToday: 30, hourlyCost: 35, unfilledRate: 10 };

/** Assumed effect of ClassRelay. These are illustrative assumptions, not measured results. */
const ASSUMED_MINUTES_WITH = 5;
const ASSUMED_UNFILLED_WITH = 5;
const SCHOOL_DAYS = 180;
const MINUTES_PER_UNFILLED = 45;

const FIELDS: { key: keyof Inputs; label: string; hint: string; min: number; max: number; step: number }[] = [
  { key: "teachers", label: "Teachers in the district", hint: "Headcount", min: 1, max: 100000, step: 1 },
  { key: "absenceRate", label: "Teacher absence rate (%)", hint: "Share of teachers absent on a typical day", min: 0, max: 30, step: 0.5 },
  { key: "minutesToday", label: "Admin minutes per fill today", hint: "Phone trees, spreadsheets, follow-ups", min: 0, max: 240, step: 1 },
  { key: "hourlyCost", label: "Hourly admin cost (USD)", hint: "Loaded cost per staff hour", min: 0, max: 300, step: 1 },
  { key: "unfilledRate", label: "Unfilled rate today (%)", hint: "Absences nobody covers", min: 0, max: 100, step: 1 },
];

export function RoiCalculator() {
  const [v, setV] = useState<Inputs>(DEFAULTS);
  const absencesPerYear = v.teachers * (v.absenceRate / 100) * SCHOOL_DAYS;
  const minutesSavedFill = Math.max(0, v.minutesToday - ASSUMED_MINUTES_WITH) * absencesPerYear;
  const unfilledAvoided = absencesPerYear * Math.max(0, v.unfilledRate - ASSUMED_UNFILLED_WITH) / 100;
  const minutesSavedUnfilled = unfilledAvoided * MINUTES_PER_UNFILLED;
  const hours = (minutesSavedFill + minutesSavedUnfilled) / 60;
  const cost = hours * v.hourlyCost;
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Illustrative estimate, not a measured result</p>
      <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => e.preventDefault()} aria-label="ROI inputs">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label htmlFor={`roi-${f.key}`} className="text-sm font-semibold text-slate-900">
              {f.label}
            </label>
            <input
              id={`roi-${f.key}`}
              type="number"
              inputMode="decimal"
              min={f.min}
              max={f.max}
              step={f.step}
              value={v[f.key]}
              aria-describedby={`roi-${f.key}-hint`}
              onChange={(e) => {
                const n = Number(e.target.value);
                setV((p) => ({ ...p, [f.key]: Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, n)) : 0 }));
              }}
              className="h-11 rounded-xl border border-slate-300 px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700"
            />
            <span id={`roi-${f.key}-hint`} className="text-xs text-slate-600">
              {f.hint}
            </span>
          </div>
        ))}
      </form>
      <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-live="polite">
        <div className="rounded-xl bg-brand-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-700">Absences per year</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{fmt(absencesPerYear)}</p>
        </div>
        <div className="rounded-xl bg-teal-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-700">Admin hours saved per year</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{fmt(hours)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-700">Admin cost saved per year</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">${fmt(cost)}</p>
        </div>
      </div>
      <details className="mt-4 text-sm text-slate-700" open>
        <summary className="cursor-pointer font-semibold text-slate-900">Assumptions behind the numbers</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Absences per year = teachers x absence rate x {SCHOOL_DAYS} school days.</li>
          <li>With ClassRelay, each fill is assumed to take {ASSUMED_MINUTES_WITH} admin minutes (exceptions and approvals only). This is a design target, not a measurement.</li>
          <li>With ClassRelay, the unfilled rate is assumed to drop to {ASSUMED_UNFILLED_WITH}% (the 95% fill-rate target). Each avoided unfilled absence is assumed to save {MINUTES_PER_UNFILLED} minutes of internal-coverage scrambling.</li>
          <li>Only admin time is counted. Lost instruction, substitute pay and payroll processing are left out.</li>
          <li>There are no customers or pilots yet, so nothing here has been observed in a real district.</li>
        </ul>
      </details>
    </div>
  );
}
