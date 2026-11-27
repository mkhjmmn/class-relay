/** Server-side rate limit (per visitor per minute) and spend cap for AI endpoints. In-memory per instance. */
const hits = new Map<string, number[]>();
let spent = 0;
let spentDay = "";

export function rateLimit(key: string, perMin = Number(process.env.AI_RATE_LIMIT_PER_MIN ?? 20)): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= perMin) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}

export function underSpendCap(cap = Number(process.env.AI_SPEND_CAP_USD ?? 25)): boolean {
  const d = new Date().toISOString().slice(0, 10);
  if (d !== spentDay) {
    spentDay = d;
    spent = 0;
  }
  return spent < cap;
}

export function addSpend(usd: number) {
  spent += usd;
}
