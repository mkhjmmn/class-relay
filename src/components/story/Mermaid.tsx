"use client";
import { useEffect, useId, useState } from "react";

/** Client-only Mermaid renderer (CLAUDE.md lesson: never render Mermaid on the server). */
export function Mermaid({ chart, title }: { chart: string; title: string }) {
  const rawId = useId();
  const id = `mmd-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral", fontFamily: "inherit" });
        const { svg: out } = await mermaid.render(id, chart.trim());
        if (!cancelled) setSvg(out);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Diagram failed to render.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      <figcaption className="mb-2 text-sm font-semibold text-slate-800">{title}</figcaption>
      {svg ? (
        <div role="img" aria-label={title} className="overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : error ? (
        <p className="text-sm text-red-700">Diagram could not render: {error}. The source is shown below.</p>
      ) : (
        <p className="text-sm text-slate-600" aria-live="polite">
          Rendering diagram…
        </p>
      )}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-brand-800 underline-offset-2 hover:underline">Mermaid source</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre rounded-lg bg-slate-50 p-3 text-xs text-slate-800">{chart.trim()}</pre>
      </details>
    </figure>
  );
}
