import type { Metadata } from "next";
import { DataClient } from "@/components/governance/DataClient";

export const metadata: Metadata = { title: "Data" };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Data</h1>
      <p className="mt-2 max-w-3xl text-slate-700">
        Data sources, API catalog, ingestion pipelines, ER diagram, data dictionary with PII classes and retention, lineage, knowledge base and retention policy. All data is
        synthetic.
      </p>
      <div className="mt-8">
        <DataClient />
      </div>
    </main>
  );
}
