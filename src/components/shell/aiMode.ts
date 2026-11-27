/**
 * Whether live AI is configured. The key itself is server-only; the server exposes only this boolean
 * via NEXT_PUBLIC_AI_LIVE (set at build time when ANTHROPIC_API_KEY is present, see next.config / .env.example).
 */
export function isLiveAiConfigured(): boolean {
  return process.env.NEXT_PUBLIC_AI_LIVE === "true";
}
