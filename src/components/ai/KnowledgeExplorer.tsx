"use client";
import * as React from "react";
import { AlertTriangle, Search } from "lucide-react";
import { Badge, Card, Input, Label } from "@/components/ui";
import { useRepo } from "@/data/client";
import { NO_SOURCE, isStale, search } from "@/ai/retrieval";
import { buildGraph } from "@/ai/graph";
import { useT } from "@/i18n/useT";

export function KnowledgeExplorer() {
  const t = useT();
  const { state } = useRepo();
  const [q, setQ] = React.useState("");
  const today = state.now.slice(0, 10);
  const hits = q.trim() ? search(state.kbChunks, q) : [];
  const graph = React.useMemo(() => buildGraph(state), [state]);
  const rels = graph.edges.reduce<Record<string, number>>((m, e) => ((m[e.rel] = (m[e.rel] ?? 0) + 1), m), {});
  const stale = state.kbChunks.filter((c) => isStale(c, today));
  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold">{t("ai.kb.title")}</h2>
      {stale.length > 0 && (
        <p role="alert" className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
          <AlertTriangle aria-hidden className="size-4" /> {stale.length} source(s) past their review date: {stale.map((c) => c.id).join(", ")}
        </p>
      )}
      <div className="mt-3">
        <Label htmlFor="kb-q">{t("ai.kb.search")}</Label>
        <div className="mt-1 flex items-center gap-2">
          <Search aria-hidden className="size-4 text-slate-500" />
          <Input id="kb-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="half day pay" />
        </div>
        {q.trim() && (
          <ol className="mt-2 space-y-1 text-sm" aria-live="polite">
            {hits.length ? (
              hits.map((h, i) => (
                <li key={h.chunk.id} className="rounded bg-slate-50 p-2">
                  <span className="font-mono text-xs text-brand-800">
                    [{i + 1}] {h.chunk.id} score {h.score}
                  </span>
                  <span className="block">{h.chunk.text}</span>
                </li>
              ))
            ) : (
              <li>{NO_SOURCE}</li>
            )}
          </ol>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-700">
        Graph: {graph.nodes.length} nodes, {graph.edges.length} edges ({Object.entries(rels).map(([k, v]) => `${k} ${v}`).join(", ")})
      </p>
      <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-sm">
        {state.kbChunks.map((c) => (
          <li key={c.id} className="rounded border border-slate-200 p-2">
            <span className="font-mono text-xs">{c.id}</span> <Badge tone="outline">v{c.version}</Badge> <span className="text-xs text-slate-600">effective {c.effectiveDate} · review by {c.reviewBy}</span> {isStale(c, today) && <Badge tone="amber">Stale</Badge>}
            <span className="block text-xs text-slate-700">{c.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
