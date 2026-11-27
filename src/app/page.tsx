import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen, Bot, CalendarCheck, ClipboardCheck, ShieldCheck } from "lucide-react";
import { PUBLIC_ROUTES } from "@/components/shell/routes";

const LOOP = [
  { icon: CalendarCheck, title: "Absence reported", body: "A teacher speaks or types it at 05:40. The Intake agent structures dates, periods and plan." },
  { icon: BadgeCheck, title: "Verified match", body: "Hard rule checks (R1-R8) first, then a weighted, explainable score. Offers go out in waves." },
  { icon: BookOpen, title: "Sub Brief", body: "On acceptance, an AI-built brief: day at a glance, period plans, routines, need-to-know supports." },
  { icon: ClipboardCheck, title: "Handoff + timesheet", body: "The day report becomes a Return Handoff for the teacher and a timesheet for approval." },
];

const ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/app": "App",
  "/demo-user": "Demo: substitute",
  "/demo-admin": "Demo: district admin",
  "/admin": "Admin",
  "/data": "Data",
  "/security": "Security",
  "/architecture": "Architecture",
  "/presentation": "Presentation",
  "/pitchdeck": "Pitch deck",
  "/audit": "Audit",
  "/docs": "Docs",
  "/prompt": "Prompt",
};

export default function Home() {
  return (
    <main id="main">
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-teal-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">AI substitute teacher workforce and scheduling platform</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Every class covered. Every lesson continued.</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90">
            ClassRelay fills each teacher absence with a verified, compliant, well-matched substitute and passes the class like a relay baton: a Sub Brief before
            class, a Return Handoff after.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo-user" className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-6 font-semibold text-slate-950 hover:bg-amber-300">
              Try it as a substitute <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/demo-admin" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-brand-900 hover:bg-brand-50">
              Try it as a district admin
            </Link>
            <Link href="/app" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/60 px-6 font-semibold text-white hover:bg-white/10">
              Pick any role
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/80">Demo data only: the fictional Riverbend Unified School District. No login needed.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12" aria-labelledby="loop-h">
        <h2 id="loop-h" className="text-2xl font-bold text-slate-950">The Relay Loop</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {LOOP.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <s.icon className="size-6 text-teal-700" aria-hidden />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Step {i + 1}</p>
              <h3 className="font-semibold text-slate-950">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12" aria-labelledby="judge-h">
        <div className="rounded-3xl border border-brand-200 bg-brand-50 p-6 sm:p-8">
          <h2 id="judge-h" className="text-2xl font-bold text-slate-950">Judge Hub</h2>
          <p className="mt-1 text-slate-700">Every public route, no login wall. Each visitor gets an isolated sandbox with “Reset demo” in the header.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PUBLIC_ROUTES.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-brand-400">
                  <span className="font-semibold text-slate-950">
                    {ROUTE_LABELS[r.href]} <span className="font-mono text-xs font-normal text-slate-600">{r.href}</span>
                  </span>
                  <span className="mt-1 text-sm text-slate-700">{r.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-4 md:grid-cols-3" aria-label="Principles">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <ShieldCheck className="size-6 text-brand-700" aria-hidden />
          <h3 className="mt-2 font-semibold">Humans decide</h3>
          <p className="text-sm text-slate-700">Credential rejection, pool removal, payroll finalization and policy changes always need a person.</p>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <Bot className="size-6 text-brand-700" aria-hidden />
          <h3 className="mt-2 font-semibold">Explainable AI</h3>
          <p className="text-sm text-slate-700">Every AI output shows reasons, sources and confidence, with “Request human review”.</p>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <BadgeCheck className="size-6 text-brand-700" aria-hidden />
          <h3 className="mt-2 font-semibold">Honest by default</h3>
          <p className="text-sm text-slate-700">Synthetic data, labelled sample AI outputs, KPI targets shown as targets. No invented customers or metrics.</p>
        </div>
      </section>
    </main>
  );
}
