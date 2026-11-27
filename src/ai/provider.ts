/**
 * Provider interface (complete, vision, embed) with a model routing table read from env.
 * Server-only: never import this file from a client component. Feature code asks for a route
 * ("fast" | "reasoning" | "vision" | "embed" | "fallback"), never a model name.
 */
export type ModelRoute = "fast" | "reasoning" | "vision" | "embed" | "fallback";

export interface CompleteRequest {
  route: ModelRoute;
  system: string;
  prompt: string;
  maxTokens?: number;
}
export interface CompleteResponse {
  text: string;
  model: string;
  mode: "live" | "sample";
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
}
export type ImageMedia = "image/png" | "image/jpeg" | "image/webp" | "image/gif";
export interface Provider {
  readonly mode: "live" | "sample";
  complete(req: CompleteRequest): Promise<CompleteResponse>;
  vision(req: CompleteRequest & { imageBase64: string; mediaType: ImageMedia }): Promise<CompleteResponse>;
  embed(texts: string[]): Promise<number[][]>;
}

const ROUTE_ENV: Record<ModelRoute, string> = {
  fast: "AI_MODEL_FAST",
  reasoning: "AI_MODEL_REASONING",
  vision: "AI_MODEL_VISION",
  embed: "AI_MODEL_EMBED",
  fallback: "AI_MODEL_FALLBACK",
};

/** Model routing table, read from env at call time. */
export function routingTable(env: Record<string, string | undefined> = process.env): Record<ModelRoute, string> {
  const out = {} as Record<ModelRoute, string>;
  for (const [route, key] of Object.entries(ROUTE_ENV) as [ModelRoute, string][]) out[route] = env[key] || env.AI_MODEL_FALLBACK || "unconfigured";
  return out;
}

export function aiMode(env: Record<string, string | undefined> = process.env): "live" | "sample" {
  return env.ANTHROPIC_API_KEY ? "live" : "sample";
}

/** Per-million-token prices used only for the spend-cap estimate (configurable via env). */
function cost(i: number, o: number) {
  const pin = Number(process.env.AI_PRICE_IN_PER_MTOK ?? 3);
  const pout = Number(process.env.AI_PRICE_OUT_PER_MTOK ?? 15);
  return Math.round(((i * pin + o * pout) / 1_000_000) * 10000) / 10000;
}

/** Deterministic local embedding: hashed bag of words (sample mode and AI_MODEL_EMBED=local-bm25). */
export function localEmbed(text: string, dims = 64): number[] {
  const v = new Array<number>(dims).fill(0);
  for (const w of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    let h = 0;
    for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    v[h % dims] += 1;
  }
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

class SampleProvider implements Provider {
  readonly mode = "sample" as const;
  async complete(req: CompleteRequest): Promise<CompleteResponse> {
    return { text: "", model: `sample:${routingTable()[req.route]}`, mode: "sample", inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0 };
  }
  async vision(req: CompleteRequest): Promise<CompleteResponse> {
    return this.complete(req);
  }
  async embed(texts: string[]) {
    return texts.map((t) => localEmbed(t));
  }
}

interface MessagesApi {
  create(body: Record<string, unknown>): Promise<{ content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } }>;
}

class AnthropicProvider implements Provider {
  readonly mode = "live" as const;
  constructor(private apiKey: string) {}
  private async messages(): Promise<MessagesApi> {
    const mod = await import("@anthropic-ai/sdk");
    const client = new mod.default({ apiKey: this.apiKey });
    return client.messages as unknown as MessagesApi;
  }
  private async call(route: ModelRoute, system: string, content: unknown, maxTokens = 800): Promise<CompleteResponse> {
    const t0 = Date.now();
    const models = routingTable();
    const api = await this.messages();
    const tryModel = async (model: string): Promise<CompleteResponse> => {
      const res = await api.create({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content }] });
      const text = (res.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
      const i = res.usage?.input_tokens ?? 0;
      const o = res.usage?.output_tokens ?? 0;
      return { text, model, mode: "live", inputTokens: i, outputTokens: o, costUsd: cost(i, o), latencyMs: Date.now() - t0 };
    };
    try {
      return await tryModel(models[route]);
    } catch {
      return await tryModel(models.fallback);
    }
  }
  complete(req: CompleteRequest) {
    return this.call(req.route, req.system, req.prompt, req.maxTokens);
  }
  vision(req: CompleteRequest & { imageBase64: string; mediaType: ImageMedia }) {
    return this.call("vision", req.system, [{ type: "image", source: { type: "base64", media_type: req.mediaType, data: req.imageBase64 } }, { type: "text", text: req.prompt }], req.maxTokens);
  }
  async embed(texts: string[]) {
    // No hosted embedding route configured: embeddings stay local (pgvector when Supabase is configured).
    return texts.map((t) => localEmbed(t));
  }
}

let cached: Provider | null = null;
export function getProvider(): Provider {
  if (typeof window !== "undefined") throw new Error("provider.ts is server-only");
  if (!cached) cached = process.env.ANTHROPIC_API_KEY ? new AnthropicProvider(process.env.ANTHROPIC_API_KEY) : new SampleProvider();
  return cached;
}
