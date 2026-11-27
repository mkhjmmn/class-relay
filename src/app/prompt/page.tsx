import type { Metadata } from "next";
import { createHash } from "node:crypto";
import { readDoc } from "@/components/story/readDoc";

export const metadata: Metadata = { title: "The Master Prompt" };
export const dynamic = "force-static";

export default function Page() {
  const prompt = readDoc("MASTER_PROMPT.md");
  const sha = createHash("sha256").update(prompt, "utf8").digest("hex");
  const log = readDoc("BUILD_LOG.md");
  const words = prompt.split(/\s+/).filter(Boolean).length;

  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">The Master Prompt</h1>
      <p className="mt-2 max-w-3xl text-slate-700">
        ClassRelay was built from one prompt. It is shown below exactly as saved in docs/MASTER_PROMPT.md, with its SHA-256 hash so anyone can check it against the repository.
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">SHA-256 of docs/MASTER_PROMPT.md</dt>
          <dd className="mt-1 break-all font-mono text-sm text-slate-900">{sha}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">Tool</dt>
          <dd className="mt-1 text-sm text-slate-900">Claude Code (VS Code extension)</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">Model</dt>
          <dd className="mt-1 text-sm text-slate-900">Claude Opus 5.5 (claude-opus-5-5)</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-slate-700">
        Check it yourself: <code className="rounded bg-slate-100 px-1">sha256sum docs/MASTER_PROMPT.md</code> (or{" "}
        <code className="rounded bg-slate-100 px-1">Get-FileHash docs/MASTER_PROMPT.md</code> on Windows). The prompt has {words.toLocaleString("en-US")} words. The hash is computed at build time with node:crypto.
      </p>

      <section aria-labelledby="prompt-h" className="mt-8">
        <h2 id="prompt-h" className="text-2xl font-bold tracking-tight text-slate-950">
          Prompt, verbatim
        </h2>
        <pre tabIndex={0} aria-label="Master Prompt text" className="mt-3 max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-900 sm:text-sm">
          {prompt}
        </pre>
      </section>

      <section aria-labelledby="timeline-h" className="mt-8">
        <h2 id="timeline-h" className="text-2xl font-bold tracking-tight text-slate-950">
          Build timeline
        </h2>
        <p className="mt-1 text-slate-700">From docs/BUILD_LOG.md: time, phase, what shipped and what failed.</p>
        <pre tabIndex={0} aria-label="Build log" className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-slate-900 sm:text-sm">
          {log}
        </pre>
      </section>
    </main>
  );
}
