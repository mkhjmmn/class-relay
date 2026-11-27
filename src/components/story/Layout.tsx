import type React from "react";

export function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 py-6">
      <h2 id={`${id}-h`} className="text-2xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>
      {lead ? <p className="mt-1 max-w-3xl text-slate-700">{lead}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Toc({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-800 hover:border-brand-700 hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700">
          {i.label}
        </a>
      ))}
    </nav>
  );
}
