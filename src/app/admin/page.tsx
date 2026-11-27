import type { Metadata } from "next";
import { AdminClient } from "@/components/governance/AdminClient";

export const metadata: Metadata = { title: "Admin panel" };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Admin panel</h1>
      <p className="mt-2 max-w-3xl text-slate-700">
        Users and roles, schools, pay rules, rule packs, integrations, model routing and system health for the synthetic Riverbend district, plus links to automations,
        agents, memory and the knowledge base.
      </p>
      <div className="mt-8">
        <AdminClient />
      </div>
    </main>
  );
}
