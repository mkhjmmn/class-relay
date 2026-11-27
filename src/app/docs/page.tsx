import type { Metadata } from "next";

export const metadata: Metadata = { title: "Documentation" };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Documentation</h1>
      <p className="mt-2 text-slate-700">Role guides, admin guide, API reference, agent cards, runbook, decision records, assumptions and build log.</p>
    </main>
  );
}
