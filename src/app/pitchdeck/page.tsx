import type { Metadata } from "next";
import Link from "next/link";
import { Deck, type Slide } from "@/components/story/Deck";

export const metadata: Metadata = { title: "Pitch deck" };

const SLIDES: Slide[] = [
  {
    title: "ClassRelay",
    points: ["Every class covered. Every lesson continued.", "An AI workforce platform for substitute teaching: fill each absence in minutes with a verified, compliant substitute, then hand the class back with a written handoff."],
  },
  {
    title: "Problem",
    points: [
      "Absences are filled by phone trees and spreadsheets before dawn.",
      "Some go unfilled; colleagues lose planning time or students lose a lesson.",
      "Credentials lapse without anyone noticing, which is a compliance risk for the district.",
      "Substitutes arrive unprepared, onboard slowly and get paid late.",
    ],
  },
  {
    title: "Solution: the Relay Loop",
    points: [
      "Absence, then verified match, then Sub Brief, then Return Handoff, then timesheet, in one workflow.",
      "Hard compliance rules (R1-R8) are pure, tested functions. AI explains and drafts, people approve.",
      "Offers go out in waves: preferred, then proven at this school, then the qualified pool.",
    ],
  },
  {
    title: "Why now, why AI",
    points: [
      "Models can now read credential documents, handwritten lesson plans and policy text reliably enough to draft and check, with a human gate.",
      "Matching under legal constraints, brief writing and continuous compliance are reasoning tasks, not CRUD.",
      "Guardrails ship from day one: PII redaction, citations, confidence thresholds, human review and a hash-chained audit trail.",
    ],
  },
  {
    title: "Market",
    label: "Estimates",
    points: [
      "Estimate: ~13,000 US public school districts (NCES order of magnitude).",
      "Estimate: ~49 million US public school students (NCES order of magnitude).",
      "Illustrative: at a hypothetical $10 to $20 per student per year, the US software opportunity is roughly $0.5B to $1B per year. This is an assumption, not market research.",
      "Expansion through rule packs: UK supply teachers, Australian relief teachers.",
    ],
  },
  {
    title: "Product",
    points: [
      "Four roles: substitute, teacher, school admin, district admin.",
      "Marketplace and matching, credential verification, scheduling, onboarding, payroll, lesson continuity, compliance and AI preparation.",
      "Eleven agents under a Relay Orchestrator and a Guardian. Every run is traced with sources, confidence, cost and mode.",
      "Live demo: /demo-user and /demo-admin, on synthetic data.",
    ],
  },
  {
    title: "Traction",
    label: "Honest",
    points: ["Pre-launch: no customers, no pilots, no revenue yet.", "A working demo on synthetic data for a fictional district (Riverbend Unified).", "AI runs in labelled Sample mode unless an API key is configured."],
  },
  {
    title: "Business model",
    label: "Hypothetical pricing",
    points: [
      "Per-student SaaS subscription for the district, for example $12 per student per year (hypothetical).",
      "Plus a per-filled-day platform fee, for example $4 per filled day (hypothetical).",
      "Example only: a 10,000-student district with 12,000 filled days a year would pay $120,000 + $48,000 = $168,000 a year.",
    ],
  },
  {
    title: "Competition",
    points: [
      "Absence-management modules inside HR or ERP suites: they record absences but do little to prepare the class.",
      "Staffing agencies: they supply people but leave districts with little transparency and control.",
      "Spreadsheets, phone trees and group chats: the default today.",
      "Our edge: verified matching, lesson continuity and auditable AI in one loop.",
    ],
  },
  {
    title: "Growth plan",
    points: [
      "Land with one district's HR team on a free sandbox import (CSV or OneRoster).",
      "Expand from substitutes to all variable-hour staff (paraprofessionals, coaches).",
      "Grow through state rule packs and SIS, HRIS and payroll integrations.",
    ],
  },
  {
    title: "Team",
    points: ["Built from one Master Prompt with Claude Code (Claude Opus 5.5).", "No invented founders, advisors or logos. The prompt and its SHA-256 are published on /prompt."],
  },
  {
    title: "The ask",
    label: "Hypothetical",
    points: ["Hypothetical: a pre-seed round to run 3 design-partner pilots with districts.", "Use of funds (hypothetical): integrations, a SOC 2 programme and district onboarding."],
  },
];

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Pitch deck</h1>
      <p className="mt-2 max-w-3xl text-slate-700">
        A Y Combinator-style deck in {SLIDES.length} slides. Estimates and hypothetical numbers are labelled, and traction is stated honestly. Want to see the product? Open{" "}
        <Link href="/demo-user" className="text-brand-800 underline">
          the substitute demo
        </Link>
        .
      </p>
      <Deck slides={SLIDES} />
    </main>
  );
}
