import type { Metadata } from "next";
import { SecurityClient } from "@/components/governance/SecurityClient";

export const metadata: Metadata = { title: "Security and trust" };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Security and trust</h1>
      <p className="mt-2 max-w-3xl text-slate-700">
        How ClassRelay protects staff and student data: authentication, role-based access, row-level security, encryption, privacy, compliance, data sovereignty,
        responsible AI, threat model and incident response, with live control status from this running app.
      </p>
      <div className="mt-8">
        <SecurityClient />
      </div>
    </main>
  );
}
