/** Lexical BM25 retrieval over knowledge chunks, returning cited chunks (or an explicit "no source" answer). */
import type { Citation, KbChunk } from "@/domain";

const STOP = new Set("a an the of to in on for and or is are be do does what when how who where which why i my me can should with at by it this that from".split(" "));
export const tokenize = (s: string) => (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => !STOP.has(w) && w.length > 1).map((w) => w.replace(/(ing|es|s)$/, ""));

export interface Hit {
  chunk: KbChunk;
  score: number;
  citation: Citation;
}
export const NO_SOURCE = "No relevant source found in the knowledge base, so no answer is given. Ask your school office.";

export function search(chunks: KbChunk[], query: string, k = 3, minScore = 2.5): Hit[] {
  const q = [...new Set(tokenize(query))];
  if (!q.length) return [];
  const docs = chunks.map((c) => tokenize(`${c.section} ${c.text}`));
  const avg = docs.reduce((s, d) => s + d.length, 0) / (docs.length || 1);
  const df = new Map<string, number>();
  for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) ?? 0) + 1);
  const N = docs.length;
  const k1 = 1.4;
  const b = 0.75;
  return chunks
    .map((chunk, i) => {
      const d = docs[i];
      let score = 0;
      for (const w of q) {
        const tf = d.filter((x) => x === w).length;
        if (!tf) continue;
        const idf = Math.log(1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5));
        score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.length) / avg));
      }
      return { chunk, score: Math.round(score * 100) / 100, citation: { chunkId: chunk.id, source: chunk.source, quote: chunk.text.slice(0, 160) } };
    })
    .filter((h) => h.score >= minScore)
    .sort((a, b2) => b2.score - a.score)
    .filter((h, _i, arr) => h.score >= arr[0].score * 0.4)
    .slice(0, k);
}

export function isStale(c: KbChunk, today: string) {
  return c.reviewBy < today;
}
