"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRepo } from "@/data/client";
import type { Role } from "@/domain";
import { ROLE_HOME } from "./routes";

/** One-click demo entry: sets the demo role and lands inside the app with the guided tour. */
export function DemoEntry({ role, name, heading }: { role: Role; name: string; heading: string }) {
  const { setSession, hydrated, session } = useRepo();
  const router = useRouter();
  useEffect(() => {
    if (!hydrated) return;
    setSession({ role, tourDone: { ...session.tourDone, [role]: false } });
    router.replace(`${ROLE_HOME[role]}?tour=1`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-950">{heading}</h1>
      <p className="mt-2 text-slate-700" aria-live="polite">
        Entering ClassRelay as {name} with a guided tour and a “Try these 5 tasks” checklist…
      </p>
      <p className="mt-4 text-sm">
        Not redirected?{" "}
        <Link className="font-semibold text-brand-800 underline" href={`${ROLE_HOME[role]}?tour=1`}>
          Continue
        </Link>
      </p>
    </main>
  );
}
