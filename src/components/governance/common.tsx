"use client";
import Link from "next/link";
import { Badge } from "@/components/ui";
import type { ControlStatus } from "@/governance/auditEngine";


/** Evidence link: in-app routes link directly; repo paths render as code with the path (the repo itself is the evidence). */
export function Evidence({ path }: { path: string }) {
  if (path.startsWith("/")) {
    return (
      <Link href={path} className="font-mono text-xs text-brand-800 underline underline-offset-2">
        {path}
      </Link>
    );
  }
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800" title="Repository file path">
      {path}
    </code>
  );
}

export function StatusBadge({ status }: { status: ControlStatus }) {
  const tone = status === "pass" ? "green" : status === "warn" ? "amber" : "red";
  const label = status === "pass" ? "Pass" : status === "warn" ? "Warn" : "Fail";
  return <Badge tone={tone}>{label}</Badge>;
}

export function Section({ id, title, purpose, children }: { id: string; title: string; purpose?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 space-y-3">
      <h2 id={`${id}-h`} className="text-xl font-bold text-slate-950">
        {title}
      </h2>
      {purpose && <p className="text-sm text-slate-700">{purpose}</p>}
      {children}
    </section>
  );
}
