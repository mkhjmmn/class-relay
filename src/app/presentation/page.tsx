import type { Metadata } from "next";
import Link from "next/link";
import { Section, Toc } from "@/components/story/Layout";
import { RoiCalculator } from "@/components/story/RoiCalculator";

export const metadata: Metadata = { title: "ClassRelay presentation" };

const PROBLEMS = [
  ["Phone trees at dawn", "When a teacher is sick, an admin calls and texts substitutes one by one before the bell."],
  ["Unfilled classes", "Uncovered absences are split across colleagues, or students sit in study hall."],
  ["Lapsed credentials", "Expiring permits and clearances sit in spreadsheets until someone notices."],
  ["Unprepared substitutes", "Substitutes arrive with a paper note and no context, and the lesson stalls."],
  ["Manual payroll", "Timesheets are retyped, duplicates slip through, and substitutes wait to be paid."],
];

const LOOP = [
  ["1. Absence", "The teacher speaks or types it. The Intake agent turns it into a validated record and W1 starts matching."],
  ["2. Verified match", "Hard rules R1-R8 (credentials, caps, exclusions) come first, then a weighted, explainable score. Offers go out in waves."],
  ["3. Sub Brief", "On acceptance, eligibility is checked again for each day and W3 builds a Sub Brief from the teacher's plan."],
  ["4. Return Handoff", "The end-of-day report becomes a handoff for the teacher: what was taught, gaps and next steps."],
  ["5. Timesheet", "W5 creates the timesheet from pay rules. The school admin approves it and payroll exports a CSV."],
];

const PERSONAS = [
  ["Maya Rahman", "Substitute teacher", "Finds work, proves credentials, prepares with the Sub Brief and Prep Coach, and gets paid.", "/demo-user"],
  ["Daniel Ortiz", "Classroom teacher", "Reports an absence in three taps or by voice, shares plans, and receives the Return Handoff.", "/app"],
  ["Grace Kim", "School admin", "Watches the coverage board, handles no-shows, approves timesheets and rates substitutes.", "/app"],
  ["Jordan Lee", "District admin (HR and payroll)", "Onboarding, credential policy, compliance, payroll, analytics and AI governance.", "/demo-admin"],
];

const KPIS = [
  ["Fill rate", ">= 95%"],
  ["Median time-to-fill", "< 10 min"],
  ["Credential-compliant assignments", "100%"],
  ["Timesheet to payroll", "< 24 h"],
];

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">ClassRelay presentation</h1>
      <p className="mt-2 max-w-3xl text-lg text-slate-700">
        Every class covered. Every lesson continued. ClassRelay fills each teacher absence with a verified, compliant substitute in minutes, and passes the class on like a relay baton.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/demo-user" className="inline-flex min-h-11 items-center rounded-xl bg-amber-400 px-5 font-semibold text-slate-950 hover:bg-amber-300">
          Try it as Maya (substitute)
        </Link>
        <Link href="/demo-admin" className="inline-flex min-h-11 items-center rounded-xl bg-brand-800 px-5 font-semibold text-white hover:bg-brand-900">
          Try it as Jordan (district admin)
        </Link>
      </div>
      <Toc
        items={[
          { id: "problem", label: "Problem" },
          { id: "solution", label: "Solution" },
          { id: "users", label: "Users" },
          { id: "market", label: "Market" },
          { id: "tour", label: "Product tour" },
          { id: "impact", label: "Impact targets" },
          { id: "roi", label: "ROI calculator" },
        ]}
      />

      <Section id="problem" title="The problem" lead="Covering an absent teacher is still mostly manual work, and schools have to do it every morning.">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PROBLEMS.map(([t, b]) => (
            <li key={t} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{t}</p>
              <p className="mt-1 text-sm text-slate-700">{b}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="solution" title="The solution: the Relay Loop" lead="One agentic workflow from absence to payroll. AI does the reasoning work; pure rules make the compliance decisions; people approve anything adverse or financial.">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LOOP.map(([t, b]) => (
            <li key={t} className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
              <p className="font-semibold text-slate-900">{t}</p>
              <p className="mt-1 text-sm text-slate-800">{b}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-slate-700">
          Why AI: matching under legal constraints, reading credential documents, turning lesson plans into briefs and continuous compliance are reasoning tasks, not CRUD. Every AI result shows reasons, sources and confidence, plus a Request human review button.{" "}
          <Link href="/architecture#sequence" className="text-brand-800 underline">
            See the sequence diagram
          </Link>
          .
        </p>
      </Section>

      <Section id="users" title="Users" lead="Four roles in one tenant (the district). Every record carries district_id.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.map(([n, r, b, href]) => (
            <article key={n} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-900">{n}</h3>
              <p className="text-sm font-medium text-brand-800">{r}</p>
              <p className="mt-1 text-sm text-slate-700">{b}</p>
              <Link href={href} className="mt-2 inline-block text-sm font-semibold text-brand-800 underline">
                Open {href}
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">All personas are fictional, from the synthetic Riverbend Unified School District.</p>
      </Section>

      <Section id="market" title="Market" lead="Every figure below is an estimate, with its assumptions stated. None of it is measured.">
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-amber-800">Estimate</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">~13,000</p>
            <p className="text-sm text-slate-700">US public school districts (NCES order of magnitude).</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-amber-800">Estimate</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">~49 million</p>
            <p className="text-sm text-slate-700">US public school students (NCES order of magnitude).</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-amber-800">Estimate, assumption-driven</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">~$0.5B to $1B / yr</p>
            <p className="text-sm text-slate-700">Illustrative US software opportunity, assuming $10 to $20 per student per year across ~49M students. A hypothetical price, not market research.</p>
          </article>
        </div>
        <p className="mt-2 text-sm text-slate-700">Expansion: rule packs for UK supply teachers and Australian relief teachers reuse the same engine.</p>
      </Section>

      <Section id="tour" title="Product tour" lead="Two minutes, three clicks. Everything runs in your browser on synthetic data.">
        <ol className="grid gap-3 md:grid-cols-3">
          <li className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">1. Substitute view</p>
            <p className="mt-1 text-sm text-slate-700">Accept Maya&apos;s pending offer, read the Sub Brief, ask the Prep Coach, check in and submit the day report.</p>
            <Link href="/demo-user" className="mt-2 inline-block text-sm font-semibold text-brand-800 underline">
              /demo-user
            </Link>
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">2. District admin view</p>
            <p className="mt-1 text-sm text-slate-700">Review a flagged credential, draft and export a pay run, open an agent trace, then run the audit.</p>
            <Link href="/demo-admin" className="mt-2 inline-block text-sm font-semibold text-brand-800 underline">
              /demo-admin
            </Link>
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">3. Any role</p>
            <p className="mt-1 text-sm text-slate-700">Pick teacher or school admin, report an absence and watch matching start, or handle a no-show.</p>
            <Link href="/app" className="mt-2 inline-block text-sm font-semibold text-brand-800 underline">
              /app
            </Link>
          </li>
        </ol>
      </Section>

      <Section id="impact" title="Impact targets" lead="These are design targets that the dashboards track against. They are not achieved results.">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4">
              <dt className="text-sm text-slate-700">
                <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">Target</span>
                {k}
              </dt>
              <dd className="mt-1 text-2xl font-bold text-slate-950">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="roi" title="ROI calculator" lead="Enter your own numbers. Every assumption is shown under the results.">
        <RoiCalculator />
      </Section>
    </main>
  );
}
