import type { Metadata } from "next";
import { AuditClient } from "@/components/governance/AuditClient";

export const metadata: Metadata = { title: "Global audit" };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Global audit</h1>
      <p className="mt-2 max-w-3xl text-slate-700">
        Automated checks in 8 domains (security, privacy, compliance, governance, responsible AI, data sovereignty, operational readiness, risk), scored from live data,
        each with an evidence link, plus a risk register, remediation plan, JSON and PDF export.
      </p>
      <div className="mt-8">
        <AuditClient />
      </div>
    </main>
  );
}
