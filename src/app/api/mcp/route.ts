/** MCP-style JSON-RPC 2.0 endpoint exposing ClassRelay tools over a server-side seeded snapshot. */
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSeed } from "@/data/seed";
import { matchContext } from "@/data/commands";
import { RULES, TierSchema, DayPartSchema, computePay, rankCandidates } from "@/domain";
import { explainEligibility } from "@/ai/graph";
import { search } from "@/ai/retrieval";

export const dynamic = "force-dynamic";

const TOOLS = [
  { name: "check_eligibility", description: "Explain whether a substitute is eligible for an absence (R1-R8 graph traversal).", inputSchema: { type: "object", properties: { substituteId: { type: "string" }, absenceId: { type: "string" } }, required: ["substituteId", "absenceId"] } },
  { name: "rank_candidates", description: "Rank eligible substitutes for an absence with reasons.", inputSchema: { type: "object", properties: { absenceId: { type: "string" }, limit: { type: "number" } }, required: ["absenceId"] } },
  { name: "compute_pay", description: "Compute pay lines from the sample rule pack.", inputSchema: { type: "object", properties: { tier: { enum: ["T1", "T2", "T3", "T4"] }, dayPart: { enum: ["full", "am", "pm"] }, dayNumber: { type: "number" }, hardToFill: { type: "boolean" } }, required: ["tier", "dayPart"] } },
  { name: "search_knowledge", description: "BM25 search over the knowledge base with citations.", inputSchema: { type: "object", properties: { query: { type: "string" }, k: { type: "number" } }, required: ["query"] } },
  { name: "get_rule", description: "Return a compliance rule (R1-R8) by id.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
];

const Args = {
  check_eligibility: z.object({ substituteId: z.string(), absenceId: z.string() }),
  rank_candidates: z.object({ absenceId: z.string(), limit: z.number().int().min(1).max(20).default(5) }),
  compute_pay: z.object({ tier: TierSchema, dayPart: DayPartSchema, dayNumber: z.number().int().min(1).default(1), hardToFill: z.boolean().default(false) }),
  search_knowledge: z.object({ query: z.string().min(1).max(500), k: z.number().int().min(1).max(10).default(3) }),
  get_rule: z.object({ id: z.string().regex(/^R[1-8]$/) }),
};
type ToolName = keyof typeof Args;

const RpcSchema = z.object({ jsonrpc: z.literal("2.0"), id: z.union([z.string(), z.number(), z.null()]).optional(), method: z.string(), params: z.record(z.string(), z.unknown()).optional() });

let snapshot: ReturnType<typeof buildSeed> | null = null;
const state = () => (snapshot ??= buildSeed());

function callTool(name: string, raw: unknown): unknown {
  if (!(name in Args)) throw new Error(`Unknown tool ${name}`);
  const s = state();
  switch (name as ToolName) {
    case "check_eligibility": {
      const a = Args.check_eligibility.parse(raw);
      return explainEligibility(s, a.substituteId, a.absenceId);
    }
    case "rank_candidates": {
      const a = Args.rank_candidates.parse(raw);
      const abs = s.absences.find((x) => x.id === a.absenceId);
      if (!abs) throw new Error("Absence not found");
      const { ranked, blocked } = rankCandidates(matchContext(s, abs, abs.startDate));
      return { ranked: ranked.slice(0, a.limit).map((c) => ({ substituteId: c.substitute.id, name: c.substitute.name, score: c.score, wave: c.wave, reasons: c.reasons })), blockedCount: blocked.length };
    }
    case "compute_pay":
      return computePay(Args.compute_pay.parse(raw));
    case "search_knowledge": {
      const a = Args.search_knowledge.parse(raw);
      const hits = search(s.kbChunks, a.query, a.k);
      return hits.length ? hits.map((h) => ({ ...h.citation, score: h.score })) : { result: "No relevant source found" };
    }
    case "get_rule": {
      const a = Args.get_rule.parse(raw);
      return RULES.find((r) => r.id === a.id);
    }
  }
}

const info = { name: "classrelay-mcp", version: "1.0.0", protocolVersion: "2025-06-18", note: "Runs on the seeded synthetic Riverbend snapshot (Demo data)." };

export function GET() {
  return NextResponse.json({ serverInfo: info, tools: TOOLS });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }
  const p = RpcSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, { status: 400 });
  const { id = null, method, params } = p.data;
  try {
    if (method === "initialize") return NextResponse.json({ jsonrpc: "2.0", id, result: { serverInfo: info, capabilities: { tools: {} }, protocolVersion: info.protocolVersion } });
    if (method === "tools/list") return NextResponse.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    if (method === "tools/call") {
      const name = z.string().parse(params?.name);
      const result = callTool(name, params?.arguments ?? {});
      return NextResponse.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result } });
    }
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (e) {
    const msg = e instanceof z.ZodError ? `Invalid params: ${e.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}` : e instanceof Error ? e.message : "Tool error";
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32602, message: msg } });
  }
}
