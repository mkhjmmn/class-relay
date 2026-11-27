"use client";
import * as React from "react";
import { Send } from "lucide-react";
import { Button, Card, Field, Input } from "@/components/ui";
import { AiResult, EmptyState, Hydrated, PageHeader } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { recordAgentRun } from "@/data/commands";
import type { AiMeta } from "@/domain";
import { coachAnswer } from "@/ai/prepCoach";
import { useT } from "@/i18n/useT";

interface Turn {
  q: string;
  answer: string;
  meta: AiMeta;
}
const SUGGESTED = ["What time should I arrive and where do I sign in?", "What do I do in a fire drill?", "How do I take attendance?", "What is the plan for period 1?", "What is this student's diagnosis?"];
const LIVE = process.env.NEXT_PUBLIC_AI_LIVE === "true";

export function PrepCoach() {
  const t = useT();
  const { state, user, repo } = useRepo();
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const subId = user?.substitute_id;
  const myAsg = state.assignments.filter((a) => a.substitute_id === subId && (a.status === "accepted" || a.status === "in_progress")).sort((a, b) => a.date.localeCompare(b.date))[0];
  const brief = myAsg ? state.subBriefs.find((b) => b.assignment_id === myAsg.id) : undefined;

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setBusy(true);
    const t0 = performance.now();
    let res = coachAnswer(question, state.kbChunks, brief);
    let model = "sample:prep_coach";
    let cost = 0;
    let notes = ["Guardian: question scanned for student-sensitive requests", res.refused ? "Refused: need-to-know rule (kb-student-1)" : "Answer grounded in retrieved chunks only"];
    if (LIVE && !res.refused && !state.aiSettings.killSwitch) {
      try {
        const r = await fetch("/api/agents/prep-coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, context: brief ? `${brief.dayAtAGlance}\n${brief.periods.map((p) => `P${p.period}: ${p.objective}`).join("\n")}` : undefined }) });
        if (r.ok) {
          const j = (await r.json()) as { answer: string; refused: boolean; meta: AiMeta; model: string; costUsd: number; guardianNotes: string[] };
          if (j.meta?.sources) {
            res = { answer: j.answer, refused: j.refused, meta: j.meta };
            model = j.model;
            cost = j.costUsd;
            notes = j.guardianNotes;
          }
        }
      } catch {
        notes.push("Live call failed: fell back to Sample mode");
      }
    }
    const run = repo.run((d) => recordAgentRun(d, {
      agent: "prep_coach",
      inputSummary: `Q: ${question.slice(0, 120)}`,
      sources: res.meta.sources,
      toolCalls: [
        { tool: "retrieval.search", input: question.slice(0, 80), output: `${res.meta.sources.length} chunk(s)` },
        ...(brief ? [{ tool: "brief.read", input: brief.id, output: `${brief.periods.length} periods` }] : []),
      ],
      output: res.answer,
      confidence: res.meta.confidence,
      latencyMs: Math.round(performance.now() - t0),
      costUsd: cost,
      model,
      mode: res.meta.mode,
      status: res.refused ? "blocked" : res.meta.sources.length ? "ok" : "needs_review",
      guardianNotes: notes,
    }));
    const runId = run.id;
    setTurns((ts) => [...ts, { q: question, answer: res.answer, meta: { ...res.meta, agentRunId: runId } }]);
    setQ("");
    setBusy(false);
  };

  return (
    <div>
      <PageHeader
        title={t("ai.coach.title")}
        purpose={t("ai.coach.purpose")}
        help={
          <>
            <p>The Prep Coach answers from the Riverbend handbook and your assignment brief. Every answer cites its sources as [n].</p>
            <p>It refuses questions about diagnoses, grades, IEPs, discipline or addresses: substitutes get need-to-know supports only.</p>
          </>
        }
      />
      <Hydrated>
        <Card className="mb-4 p-4">
          <p className="text-sm text-slate-700">{brief ? `Grounded in your brief for ${myAsg?.date}: ${brief.dayAtAGlance}` : "No upcoming assignment brief: answers use the district handbook only."}</p>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(q);
            }}
          >
            <div className="flex-1">
              <Field label="Your question" htmlFor="coach-q">
                <Input id="coach-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ai.coach.placeholder")} maxLength={600} />
              </Field>
            </div>
            <Button type="submit" disabled={busy || !q.trim()}>
              <Send aria-hidden /> {busy ? "..." : t("ai.coach.ask")}
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <Button key={s} size="sm" variant="outline" onClick={() => void ask(s)} disabled={busy}>
                {s}
              </Button>
            ))}
          </div>
        </Card>
        {!turns.length ? (
          <EmptyState title="Ask your first question" body="Try one of the suggested questions above." />
        ) : (
          <div className="space-y-4">
            {[...turns].reverse().map((tn, i) => (
              <AiResult key={turns.length - i} meta={tn.meta} entityId={tn.meta.agentRunId ?? "prep_coach"} title={tn.q}>
                <p className="text-slate-900">{tn.answer}</p>
              </AiResult>
            ))}
          </div>
        )}
      </Hydrated>
    </div>
  );
}
