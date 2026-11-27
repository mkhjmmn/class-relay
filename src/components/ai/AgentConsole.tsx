"use client";
import * as React from "react";
import { Play, Power } from "lucide-react";
import { Badge, Button, Card, Dialog, DialogContent, DialogTrigger, Label, Progress, Select, Switch, Table, Td, Th } from "@/components/ui";
import { EmptyState } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { recordAgentRun, setAiSettings } from "@/data/commands";
import type { AgentRun } from "@/domain";
import { AGENTS, type Autonomy } from "@/ai/agents/registry";
import { useT } from "@/i18n/useT";
import evalResults from "@/ai/evals/results.json";

const tone = (s: AgentRun["status"]) => (s === "ok" ? "green" : s === "needs_review" ? "amber" : "red");

export function AgentConsole() {
  const t = useT();
  const { state, act, repo } = useRepo();
  const runs = [...state.agentRuns].reverse();
  const ai = state.aiSettings;
  const replay = (r: AgentRun) =>
    repo.run((d) => recordAgentRun(d, {
      agent: r.agent,
      inputSummary: `Replay of ${r.id}: ${r.inputSummary}`,
      sources: r.sources,
      toolCalls: r.toolCalls,
      output: r.output,
      confidence: r.confidence,
      latencyMs: Math.max(5, Math.round(r.latencyMs * 0.9)),
      costUsd: 0,
      model: r.mode === "sample" ? r.model : `sample-replay:${r.model}`,
      mode: "sample",
      status: r.status,
      guardianNotes: [...r.guardianNotes, "Deterministic sample replay: same inputs, same output"],
    }));
  const rates = (evalResults as { agents: Record<string, { passed: number; total: number }> }).agents ?? {};
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-slate-600">{t("ai.console.spend")}</p>
          <p className="mt-1 text-2xl font-bold text-brand-800">
            ${ai.spentUsd.toFixed(4)} / ${ai.spendCapUsd}
          </p>
          <Progress className="mt-2" value={Math.min(100, (ai.spentUsd / (ai.spendCapUsd || 1)) * 100)} label={t("ai.console.spend")} />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-slate-600">{t("ai.console.killSwitch")}</p>
          <div className="mt-2 flex items-center gap-3">
            <Switch id="kill" checked={ai.killSwitch} onCheckedChange={(v: boolean) => act(setAiSettings, { killSwitch: v })} aria-label={t("ai.console.killSwitch")} />
            <Label htmlFor="kill">
              <Power aria-hidden className="mr-1 inline size-4" />
              {ai.killSwitch ? "ON: agents suggest only" : "OFF: agents act per autonomy"}
            </Label>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-slate-600">{t("ai.console.evals")}</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{Math.round(((evalResults as { passRate?: number }).passRate ?? 0) * 100)}%</p>
          <p className="text-xs text-slate-600">{(evalResults as { total?: number }).total ?? 0} golden cases (npm run evals)</p>
        </Card>
      </div>

      <Card className="overflow-x-auto p-4">
        <h2 className="mb-3 text-lg font-semibold">Agents A1-A11</h2>
        <Table>
          <thead>
            <tr>
              <Th>Agent</Th>
              <Th>Tools</Th>
              <Th>Threshold</Th>
              <Th>HITL gate</Th>
              <Th>Evals</Th>
              <Th>Autonomy</Th>
            </tr>
          </thead>
          <tbody>
            {AGENTS.map((a) => {
              const r = rates[a.id];
              return (
                <tr key={a.id}>
                  <Td>
                    <span className="font-mono text-xs">{a.code}</span> {a.name}
                  </Td>
                  <Td className="text-xs">{a.tools.join(", ")}</Td>
                  <Td>{a.confidenceThreshold}</Td>
                  <Td className="text-xs">{a.hitlGate}</Td>
                  <Td>{r ? `${r.passed}/${r.total}` : "-"}</Td>
                  <Td>
                    <Select aria-label={`Autonomy for ${a.name}`} value={ai.autonomy[a.id] ?? a.autonomy} onChange={(e) => act(setAiSettings, { autonomy: { ...ai.autonomy, [a.id]: e.target.value as Autonomy } })}>
                      <option value="suggest">Suggest</option>
                      <option value="act_with_review">Act with review</option>
                      <option value="act">Act</option>
                    </Select>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Card className="overflow-x-auto p-4">
        <h2 className="mb-3 text-lg font-semibold">Agent runs ({runs.length})</h2>
        {!runs.length ? (
          <EmptyState title={t("ai.console.empty")} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Agent</Th>
                <Th>Input</Th>
                <Th>Tools</Th>
                <Th>Confidence</Th>
                <Th>Cost</Th>
                <Th>Latency</Th>
                <Th>Model</Th>
                <Th>Mode</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 100).map((r) => (
                <tr key={r.id}>
                  <Td className="font-mono text-xs">{r.agent}</Td>
                  <Td className="max-w-xs truncate text-xs" title={r.inputSummary}>
                    {r.inputSummary}
                  </Td>
                  <Td>{r.toolCalls.length}</Td>
                  <Td>{Math.round(r.confidence * 100)}%</Td>
                  <Td>${r.costUsd.toFixed(4)}</Td>
                  <Td>{r.latencyMs} ms</Td>
                  <Td className="text-xs">{r.model}</Td>
                  <Td>
                    <Badge tone={r.mode === "live" ? "green" : "teal"}>{r.mode === "live" ? "Live" : "Sample mode"}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={tone(r.status)}>{r.status}</Badge>
                  </Td>
                  <Td className="flex gap-1">
                    <RunDrawer run={r} />
                    <Button size="sm" variant="outline" onClick={() => replay(r)} aria-label={`Replay ${r.id}`}>
                      <Play aria-hidden /> {t("ai.console.replay")}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function RunDrawer({ run }: { run: AgentRun }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Trace for ${run.id}`}>
          Trace
        </Button>
      </DialogTrigger>
      <DialogContent title={`Trace ${run.id} (${run.agent})`} description={run.inputSummary}>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto text-sm">
          <section>
            <h3 className="font-semibold">Tool calls</h3>
            <ol className="list-decimal pl-5">
              {run.toolCalls.map((c, i) => (
                <li key={i}>
                  <span className="font-mono text-xs">{c.tool}</span>({c.input}) {"->"} {c.output}
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h3 className="font-semibold">Output</h3>
            <p className="whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{run.output}</p>
          </section>
          <section>
            <h3 className="font-semibold">Sources</h3>
            {run.sources.length ? (
              <ul className="space-y-1">
                {run.sources.map((s, i) => (
                  <li key={i} className="text-xs">
                    [{i + 1}] <span className="font-mono">{s.source}</span>: {s.quote}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs">No sources retrieved.</p>
            )}
          </section>
          <section>
            <h3 className="font-semibold">Guardian notes</h3>
            <ul className="list-disc pl-5 text-xs">
              {(run.guardianNotes.length ? run.guardianNotes : ["No guardian notes recorded"]).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
