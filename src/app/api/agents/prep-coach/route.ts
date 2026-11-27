/** A7 Prep Coach live route: retrieval-grounded answer via the provider, under the Guardian, rate limit and spend cap. */
import { NextResponse } from "next/server";
import { z } from "zod";
import { KB_CHUNKS } from "@/data/seed/knowledge";
import { getProvider } from "@/ai/provider";
import { coachAnswer } from "@/ai/prepCoach";
import { search } from "@/ai/retrieval";
import { AGENT_BY_ID, OutputSchemas } from "@/ai/agents/registry";
import { runWithGuardian } from "@/ai/guardian";
import { addSpend, rateLimit, underSpendCap } from "@/ai/limits";

export const dynamic = "force-dynamic";

const Body = z.object({ question: z.string().min(1).max(600), context: z.string().max(4000).optional() });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!rateLimit(ip)) return NextResponse.json({ error: "Rate limit reached. Try again in a minute." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { question, context } = parsed.data;
  const provider = getProvider();
  const sample = coachAnswer(question, KB_CHUNKS);
  if (provider.mode === "sample" || sample.refused || !underSpendCap()) return NextResponse.json({ ...sample, model: "sample", costUsd: 0, guardianNotes: ["Sample mode or refusal: deterministic path"] });
  const hits = search(KB_CHUNKS, question, 4);
  if (!hits.length) return NextResponse.json({ ...sample, model: "sample", costUsd: 0, guardianNotes: ["No relevant source: answer withheld"] });
  const agent = AGENT_BY_ID.prep_coach;
  let model = "";
  let costUsd = 0;
  const verdict = await runWithGuardian(
    { id: agent.id, schema: OutputSchemas.prep_coach, confidenceThreshold: agent.confidenceThreshold },
    { text: question, documentText: context },
    async ({ text, documentText }) => {
      const res = await provider.complete({
        route: agent.route,
        system: `${agent.charter}\nReturn only JSON: {"answer": string with [n] markers, "refused": boolean, "sources": [{"chunkId","source","quote"}], "confidence": number, "reasons": string[]}`,
        prompt: `Sources:\n${hits.map((h, i) => `[${i + 1}] ${h.chunk.id} (${h.chunk.source}): ${h.chunk.text}`).join("\n")}\n${documentText ?? ""}\nQuestion: ${text}`,
      });
      model = res.model;
      costUsd += res.costUsd;
      return JSON.parse(res.text.replace(/^[^{]*/, "").replace(/[^}]*$/, ""));
    },
    (o) => o.confidence,
  );
  addSpend(costUsd);
  if (!verdict.output) return NextResponse.json({ ...sample, model: model || "sample", costUsd, guardianNotes: verdict.notes, status: verdict.status });
  const o = verdict.output;
  return NextResponse.json({ answer: o.answer, refused: o.refused, meta: { mode: "live", confidence: o.confidence, reasons: o.reasons, sources: o.sources, humanReviewRequested: false }, model, costUsd, guardianNotes: verdict.notes, status: verdict.status });
}
