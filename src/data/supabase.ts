/**
 * Supabase driver. Runs the same domain commands, then persists the visitor's tenant snapshot through
 * PostgREST (table demo_snapshot, RLS by district_id + visitor id; see supabase/migrations).
 * Normalized tables (absence, assignment, ...) are populated by the seed SQL and the sync job described in /data.
 * Selected automatically when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 */
import { SandboxRepository } from "./sandbox";
import type { DemoState } from "./state";
import type { DataMode } from "./repository";

function visitorId(): string {
  const k = "classrelay.visitor";
  let v = window.localStorage.getItem(k);
  if (!v) {
    v = crypto.randomUUID();
    window.localStorage.setItem(k, v);
  }
  return v;
}

export class SupabaseRepository extends SandboxRepository {
  readonly mode: DataMode = "supabase";
  private url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  private key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  private headers() {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" };
  }
  async hydrate() {
    await super.hydrate();
    try {
      const res = await fetch(`${this.url}/rest/v1/demo_snapshot?visitor_id=eq.${visitorId()}&select=state`, { headers: this.headers() });
      if (res.ok) {
        const rows = (await res.json()) as { state: DemoState }[];
        if (rows[0]?.state) this.commit(rows[0].state);
      }
    } catch {
      // offline: fall back to local copy
    }
  }
  protected persist() {
    super.persist();
    if (typeof window === "undefined") return;
    const s = this.getState();
    void fetch(`${this.url}/rest/v1/demo_snapshot`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ visitor_id: visitorId(), district_id: s.district.id, state: s, updated_at: new Date().toISOString() }),
    }).catch(() => undefined);
  }
}
