/** Sandbox driver: seeded deterministic world held in memory and persisted to this browser's localStorage. */
import { buildSeed } from "./seed";
import { STATE_VERSION, type DemoState } from "./state";
import type { DataMode, Repository } from "./repository";

const KEY = "classrelay.sandbox.v" + STATE_VERSION;

export class SandboxRepository implements Repository {
  readonly mode: DataMode = "sandbox";
  private state: DemoState;
  private listeners = new Set<() => void>();

  constructor(initial?: DemoState) {
    this.state = initial ?? buildSeed();
  }
  getState() {
    return this.state;
  }
  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  protected commit(next: DemoState) {
    this.state = next;
    this.persist();
    this.listeners.forEach((l) => l());
  }
  run<T>(command: (draft: DemoState) => T): T {
    const draft = structuredClone(this.state);
    const result = command(draft); // throws -> nothing committed
    this.commit(draft);
    return result;
  }
  reset() {
    this.commit(buildSeed());
  }
  async hydrate() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        if (parsed.version === STATE_VERSION) {
          this.state = parsed;
          this.listeners.forEach((l) => l());
        }
      }
    } catch {
      // corrupted storage: keep the fresh seed
    }
  }
  protected persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      // quota exceeded: the demo keeps working in memory
    }
  }
}
