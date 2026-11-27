/**
 * Typed repository interface. UI code never touches storage directly: it reads the tenant snapshot
 * through getState()/useRepo() and changes it only through commands executed by run().
 * Drivers: sandbox (seeded, in-browser, per visitor) and supabase (same commands, persisted remotely).
 */
import type { DemoState } from "./state";

export type DataMode = "sandbox" | "supabase";

export interface Repository {
  readonly mode: DataMode;
  getState(): DemoState;
  subscribe(listener: () => void): () => void;
  /** Runs a command against a draft copy and commits it atomically (all-or-nothing). */
  run<T>(command: (draft: DemoState) => T): T;
  reset(): void;
  /** Loads persisted data (after mount, never during SSR). */
  hydrate(): Promise<void>;
}

export function dataMode(): DataMode {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase" : "sandbox";
}
