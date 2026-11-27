"use client";
import Link from "next/link";
import { Card } from "@/components/ui";
import { PageHeader } from "./Page";

/** Route-complete starting point: real heading, purpose and what this screen covers. Replaced by feature owners. */
export function StubPage({ title, purpose, points, links }: { title: string; purpose: string; points: string[]; links?: { href: string; label: string }[] }) {
  return (
    <div>
      <PageHeader title={title} purpose={purpose} help={<p>{purpose}</p>} />
      <Card className="p-5">
        <ul className="list-disc space-y-1 pl-5 text-slate-800">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {links && (
          <div className="mt-4 flex flex-wrap gap-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="font-semibold text-brand-800 underline">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
