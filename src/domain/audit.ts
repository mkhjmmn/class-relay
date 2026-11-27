/** Append-only, hash-chained audit ledger (pure). hash = sha256(prevHash + canonical payload). */
import { sha256 } from "./sha256";
import type { AuditEvent } from "./schemas";

export const GENESIS_HASH = "0".repeat(64);

function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .filter((k) => o[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
    .join(",")}}`;
}

export function hashEvent(e: Omit<AuditEvent, "hash">): string {
  const { prevHash, ...body } = e;
  return sha256(prevHash + canonical(body));
}

export function appendEvent(
  chain: AuditEvent[],
  e: Pick<AuditEvent, "district_id" | "at" | "actor" | "action" | "entity" | "payload">,
): AuditEvent {
  const prev = chain[chain.length - 1];
  const seq = prev ? prev.seq + 1 : 1;
  const base = { ...e, seq, id: `aud-${String(seq).padStart(5, "0")}`, prevHash: prev ? prev.hash : GENESIS_HASH };
  return { ...base, hash: hashEvent(base) };
}

export function verifyChain(chain: AuditEvent[]): { valid: boolean; brokenAt?: number } {
  let prev = GENESIS_HASH;
  for (const e of chain) {
    const { hash, ...rest } = e;
    if (e.prevHash !== prev || hashEvent(rest) !== hash) return { valid: false, brokenAt: e.seq };
    prev = hash;
  }
  return { valid: true };
}
