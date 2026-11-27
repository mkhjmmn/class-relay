import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin panel" };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Admin panel</h1>
      <p className="mt-2 text-slate-700">Users and roles, schools, pay rules, rule packs, automations, agents, memory, knowledge base, integrations and health.</p>
    </main>
  );
}
