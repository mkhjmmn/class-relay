import type { Metadata } from "next";

export const metadata: Metadata = { title: "ClassRelay presentation" };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">ClassRelay presentation</h1>
      <p className="mt-2 text-slate-700">Problem, solution, users, market, product tour, impact KPIs and an ROI calculator.</p>
    </main>
  );
}
