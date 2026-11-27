"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Slide = { title: string; label?: string; points: string[] };

/** Keyboard-navigable slide deck: Prev/Next buttons, Left/Right arrow keys, and a full outline below. */
export function Deck({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const go = useCallback((d: number) => setI((x) => Math.min(slides.length - 1, Math.max(0, x + d))), [slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const s = slides[i];
  return (
    <div>
      <div ref={ref} role="region" aria-roledescription="slide deck" aria-label={`Slide ${i + 1} of ${slides.length}: ${s.title}`} className="mt-6 flex min-h-[22rem] flex-col rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-teal-800 p-6 text-white sm:p-10">
        <p className="text-sm font-semibold text-white/80">
          {i + 1} / {slides.length}
          {s.label ? <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs text-slate-950">{s.label}</span> : null}
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl" aria-live="polite">
          {s.title}
        </h2>
        <ul className="mt-5 space-y-2 text-base text-white/95 sm:text-lg">
          {s.points.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => go(-1)} disabled={i === 0} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
        </button>
        <p className="hidden text-sm text-slate-600 sm:block">Use the arrow keys to move between slides.</p>
        <button type="button" onClick={() => go(1)} disabled={i === slides.length - 1} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand-800 px-4 font-semibold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700">
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <nav aria-label="Slides" className="mt-4 flex flex-wrap gap-2">
        {slides.map((x, n) => (
          <button key={x.title} type="button" onClick={() => setI(n)} aria-current={n === i ? "step" : undefined} className={`min-h-9 rounded-full border px-3 text-sm ${n === i ? "border-brand-800 bg-brand-800 text-white" : "border-slate-300 bg-white text-slate-800"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700`}>
            {n + 1}. {x.title}
          </button>
        ))}
      </nav>
      <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-slate-900">Read the whole deck as text</summary>
        <ol className="mt-3 space-y-4">
          {slides.map((x, n) => (
            <li key={x.title}>
              <h3 className="font-semibold text-slate-900">
                {n + 1}. {x.title} {x.label ? <span className="text-xs text-amber-800">({x.label})</span> : null}
              </h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                {x.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
