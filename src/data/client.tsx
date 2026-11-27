"use client";
/**
 * React bindings for the repository. Components call useRepo() to read the snapshot and act() to run
 * domain commands. Storage is read only after mount (no hydration mismatch).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import type { Language, Role } from "@/domain";
import { dataMode, type Repository } from "./repository";
import { SandboxRepository } from "./sandbox";
import { SupabaseRepository } from "./supabase";
import type { DemoState, Session } from "./state";
import type { Actor, Result } from "./commands";
import { DEMO_USERS } from "./seed";

const SESSION_KEY = "classrelay.session.v1";
const defaultSession: Session = { role: null, userId: null, language: "en", lowBandwidth: false, tourDone: {}, checklist: {} };

let singleton: Repository | null = null;
function getRepo(): Repository {
  if (!singleton) singleton = dataMode() === "supabase" ? new SupabaseRepository() : new SandboxRepository();
  return singleton;
}

interface Ctx {
  repo: Repository;
  hydrated: boolean;
  session: Session;
  setSession: (patch: Partial<Session>) => void;
}
const RepoContext = createContext<Ctx | null>(null);

function writeRoleCookie(role: Role | null) {
  document.cookie = role ? `cr_role=${role}; path=/; max-age=86400; samesite=lax` : "cr_role=; path=/; max-age=0";
}

export function RepoProvider({ children }: { children: ReactNode }) {
  const repo = getRepo();
  const [hydrated, setHydrated] = useState(false);
  const [session, setSessionState] = useState<Session>(defaultSession);

  useEffect(() => {
    let alive = true;
    void repo.hydrate().then(() => {
      if (!alive) return;
      try {
        const raw = window.localStorage.getItem(SESSION_KEY);
        if (raw) setSessionState({ ...defaultSession, ...(JSON.parse(raw) as Session) });
      } catch {
        /* ignore */
      }
      setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, [repo]);

  const setSession = useCallback((patch: Partial<Session>) => {
    setSessionState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.role !== undefined && patch.userId === undefined) next.userId = patch.role ? DEMO_USERS[patch.role] : null;
      try {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      if (patch.role !== undefined) writeRoleCookie(next.role);
      if (patch.language) document.documentElement.lang = patch.language;
      return next;
    });
  }, []);

  useEffect(() => {
    if (hydrated) document.documentElement.lang = session.language;
  }, [hydrated, session.language]);

  const value = useMemo(() => ({ repo, hydrated, session, setSession }), [repo, hydrated, session, setSession]);
  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

function useCtx(): Ctx {
  const c = useContext(RepoContext);
  if (!c) throw new Error("useRepo must be used inside <RepoProvider>");
  return c;
}

/** Read the tenant snapshot (re-renders on change). */
export function useRepoState(): DemoState {
  const { repo } = useCtx();
  return useSyncExternalStore(repo.subscribe.bind(repo), () => repo.getState(), () => repo.getState());
}

export function useSession() {
  const { session, setSession, hydrated } = useCtx();
  return { session, setSession, hydrated };
}

export function useLanguage(): [Language, (l: Language) => void] {
  const { session, setSession } = useCtx();
  return [session.language, (l: Language) => setSession({ language: l })];
}

/** Main hook: snapshot, current actor and command runner. */
export function useRepo() {
  const { repo, hydrated, session, setSession } = useCtx();
  const state = useRepoState();
  const user = session.userId ? state.users.find((u) => u.id === session.userId) : undefined;
  const actor: Actor = user ? { userId: user.id, role: user.role, name: user.name } : { userId: "anonymous", role: "system", name: "Visitor" };

  /**
   * Execute a domain command as the current user. Shows a toast for Result values.
   * Usage: act(reportAbsence, input)
   */
  const act = useCallback(
    <A extends unknown[], R>(fn: (s: DemoState, actor: Actor, ...args: A) => R, ...args: A): R | Result<never> => {
      try {
        const r = repo.run((d) => fn(d, actor, ...args));
        if (r && typeof r === "object" && "ok" in r) {
          const res = r as unknown as Result<unknown>;
          if (res.ok) {
            if (res.message) toast.success(res.message);
          } else toast.error(res.error, { description: res.details?.join(" · ") });
        }
        return r;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        toast.error(msg);
        return { ok: false, error: msg };
      }
    },
    [repo, actor],
  );

  const reset = useCallback(() => {
    repo.reset();
    toast.success("Demo reset to the seeded Riverbend world.");
  }, [repo]);

  return { state, mode: repo.mode, hydrated, session, setSession, user, actor, act, reset, repo };
}
