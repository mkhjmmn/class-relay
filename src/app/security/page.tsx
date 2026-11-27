import type { Metadata } from "next";

export const metadata: Metadata = { title: "Security and trust" };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Security and trust</h1>
      <p className="mt-2 text-slate-700">Authentication, authorization (RBAC + RLS), encryption, privacy, compliance, sovereignty, responsible AI and incident response.</p>
    </main>
  );
}
