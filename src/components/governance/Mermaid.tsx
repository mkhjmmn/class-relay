"use client";
import { useEffect, useId, useState } from "react";

/** Client-only Mermaid renderer (CLAUDE.md lesson: dynamic import inside useEffect, never on the server). */
export function Mermaid({ chart, label }: { chart: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = "m" + useId().replace(/[^a-zA-Z0-9]/g, "");
  useEffect(() => {
    let cancelled = false;
    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
        const out = await mermaid.render(id, chart);
        if (!cancelled) setSvg(out.svg);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Diagram failed to render"));
    return () => {
      cancelled = true;
    };
  }, [chart, id]);
  if (error)
    return (
      <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Diagram could not render ({error}). Source:
        <pre className="mt-2 overflow-auto text-xs">{chart}</pre>
      </div>
    );
  if (!svg) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" aria-label={`Loading ${label}`} />;
  return <div role="img" aria-label={label} className="overflow-auto rounded-xl border border-slate-200 bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />;
}
