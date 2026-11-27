import type { Metadata } from "next";

export const metadata: Metadata = { title: "Architecture" };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Architecture</h1>
      <p className="mt-2 text-slate-700">System, infrastructure, agent, integration and data-flow views, plus the absence-to-filled sequence.</p>
    </main>
  );
}
