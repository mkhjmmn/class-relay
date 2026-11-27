import type { Metadata } from "next";

export const metadata: Metadata = { title: "The Master Prompt" };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">The Master Prompt</h1>
      <p className="mt-2 text-slate-700">The one prompt that built ClassRelay, verbatim, with its SHA-256 and the build timeline.</p>
    </main>
  );
}
