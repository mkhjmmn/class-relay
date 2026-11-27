/** A7 Prep Coach (sample path, deterministic): grounded answers with citations, refusals for student data. */
import type { AiMeta, Citation, KbChunk, SubBrief } from "@/domain";
import { NO_SOURCE, search } from "./retrieval";

export const SENSITIVE = /\b(diagnos\w*|grades?|gpa|iep|504|discipline|suspen\w*|address|home|medication history|disabilit\w*)\b/i;

export interface CoachAnswer {
  answer: string;
  refused: boolean;
  meta: AiMeta;
}

export function coachAnswer(question: string, kb: KbChunk[], brief?: SubBrief): CoachAnswer {
  const studentRule = kb.find((c) => c.id === "kb-student-1");
  if (SENSITIVE.test(question)) {
    const sources: Citation[] = studentRule ? [{ chunkId: studentRule.id, source: studentRule.source, quote: studentRule.text.slice(0, 160) }] : [];
    return {
      refused: true,
      answer: "I can't share that. Substitutes receive only need-to-know supports written as actions; diagnoses, grades, IEP details, discipline history and family details stay with the school [1]. Check the supports section of your brief or ask the office.",
      meta: { mode: "sample", confidence: 0.95, reasons: ["Question asks for student data beyond need-to-know", "Refusal per student information rule"], sources, humanReviewRequested: false },
    };
  }
  const corpus: KbChunk[] = [...kb];
  if (brief) {
    const base = { district_id: brief.district_id, version: "brief", effectiveDate: brief.createdAt.slice(0, 10), reviewBy: "2099-12-31" };
    corpus.push({ ...base, id: `brief-${brief.id}-glance`, source: `brief:${brief.id}#day`, section: "Your assignment brief", text: `${brief.dayAtAGlance} Arrival: ${brief.arrival}` });
    brief.periods.forEach((p) => corpus.push({ ...base, id: `brief-${brief.id}-p${p.period}`, source: `brief:${brief.id}#period-${p.period}`, section: "Your assignment plan period lesson", text: `Period ${p.period} ${p.time} ${p.className}: ${p.objective}. Steps: ${p.steps.join("; ")}. Materials: ${p.materials.join(", ")}.` }));
    if (brief.routines.length) corpus.push({ ...base, id: `brief-${brief.id}-routines`, source: `brief:${brief.id}#routines`, section: "Classroom routines", text: brief.routines.join(" ") });
  }
  const hits = search(corpus, question, 3);
  if (!hits.length) {
    return { refused: false, answer: NO_SOURCE, meta: { mode: "sample", confidence: 0.3, reasons: ["No chunk passed the minimum relevance score", "Answer withheld instead of guessing"], sources: [], humanReviewRequested: false } };
  }
  const answer = hits.map((h, i) => `${h.chunk.text} [${i + 1}]`).join(" ");
  const top = hits[0].score;
  const confidence = Math.min(0.95, 0.55 + top / 20);
  return {
    refused: false,
    answer,
    meta: { mode: "sample", confidence: Math.round(confidence * 100) / 100, reasons: [`Retrieved ${hits.length} source(s) by BM25 (top score ${top})`, "Answer quotes sources only"], sources: hits.map((h) => h.citation), humanReviewRequested: false },
  };
}
