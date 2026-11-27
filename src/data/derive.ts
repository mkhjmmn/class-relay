/**
 * Deterministic "Sample mode" builders for Sub Briefs and Return Handoffs.
 * Used when no AI key is configured (and as the fallback when a live call fails validation twice).
 * Output is labelled mode: "sample" and cites the plan and handbook chunks it used.
 */
import type { Assignment, Citation, DayReport, Handoff, Language, LessonPlan, SubBrief } from "@/domain";
import type { DemoState } from "./state";

const HEAD: Record<Language, { glance: string; arrive: string }> = {
  en: { glance: "Day at a glance", arrive: "Arrive" },
  bn: { glance: "এক নজরে দিন", arrive: "পৌঁছান" },
  es: { glance: "El día de un vistazo", arrive: "Llegue" },
};

export function planFor(s: DemoState, teacherId: string, date: string): LessonPlan | undefined {
  const plans = s.lessonPlans.filter((p) => p.teacher_id === teacherId);
  return plans.find((p) => p.date === date) ?? plans.find((p) => p.emergency);
}

function cite(s: DemoState, ids: string[]): Citation[] {
  return ids
    .map((id) => s.kbChunks.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => ({ chunkId: c!.id, source: c!.source, quote: c!.text.slice(0, 120) }));
}

export function buildSampleBrief(s: DemoState, a: Assignment, language: Language, id: string): SubBrief {
  const absence = s.absences.find((x) => x.id === a.absence_id)!;
  const teacher = s.teachers.find((t) => t.id === absence.teacher_id)!;
  const school = s.schools.find((x) => x.id === absence.school_id)!;
  const plan = planFor(s, teacher.id, a.date);
  const periodsTaught = teacher.classes.filter((c) => a.dayPart === "full" || (a.dayPart === "am" ? c.period <= 3 : c.period > 3));
  const supports = s.supports.filter((x) => x.teacher_id === teacher.id && x.approved).map((x) => x.note);
  const periods = periodsTaught.map((c) => {
    const p = school.periods.find((pp) => pp.n === c.period);
    const lp = plan?.periods.find((pp) => pp.period === c.period) ?? plan?.periods[0];
    return {
      period: c.period,
      time: p ? `${p.start}-${p.end}` : "",
      className: `${c.name} (Room ${c.room}, ${c.students} students)`,
      objective: lp?.objective ?? "Backup activity: reading and reflection journal (no plan on file).",
      steps: lp?.activities ?? ["10 min: warm-up journal prompt", "25 min: independent reading", "10 min: pair share and exit ticket"],
      materials: lp?.materials ?? ["Journals", "Classroom library"],
      differentiation: lp?.differentiation ?? "Offer sentence starters; let early finishers choose an extension question.",
    };
  });
  const sources: Citation[] = [
    ...(plan ? [{ chunkId: plan.id, source: `lesson_plan:${plan.id}`, quote: plan.title }] : []),
    ...cite(s, ["kb-hb-1", "kb-hb-2", "kb-hb-3", "kb-hb-4", "kb-student-1"]),
  ];
  return {
    id,
    district_id: s.district.id,
    assignment_id: a.id,
    language,
    dayAtAGlance: `${HEAD[language].glance}: ${teacher.name}, ${teacher.subject} ${teacher.gradeBand} at ${school.name}. ${periods.length} periods, ${school.bellStart}-${school.bellEnd}. ${plan ? `Plan: ${plan.title}.` : "No plan on file: backup activities included."}`,
    periods,
    routines: [teacher.routines, teacher.seatingNotes, teacher.behaviorPlan].filter(Boolean),
    supports,
    emergency: [
      "Fire drill: follow the map by the door, take the class list, count students outside.",
      "Lockdown: lock the door, lights off, students away from windows, wait for the all-clear.",
      "Medical concern: call the office on extension 100; never give medication.",
    ],
    contacts: ["Main office: ext. 100", `School admin: ${s.users.find((u) => u.role === "school_admin" && u.school_id === school.id)?.name ?? "Front office"}`],
    arrival: `${HEAD[language].arrive} 30 min before ${school.bellStart}. ${school.arrivalNotes}`,
    meta: {
      mode: "sample",
      confidence: plan ? 0.86 : 0.62,
      reasons: [plan ? `Built from "${plan.title}"` : "No plan on file; generated backup activities", "Routines from the teacher's preferences", "Emergency steps from the Riverbend handbook"],
      sources,
      humanReviewRequested: false,
    },
    createdAt: s.now,
  };
}

export function buildSampleHandoff(s: DemoState, a: Assignment, report: DayReport, id: string): Handoff {
  const absence = s.absences.find((x) => x.id === a.absence_id)!;
  const covered = report.covered.filter((c) => c.status === "covered");
  const partial = report.covered.filter((c) => c.status !== "covered");
  const score = report.covered.length ? (covered.length + partial.filter((p) => p.status === "partial").length * 0.5) / report.covered.length : 0;
  const plan = planFor(s, absence.teacher_id, a.date);
  return {
    id,
    district_id: s.district.id,
    assignment_id: a.id,
    teacher_id: absence.teacher_id,
    taught: covered.map((c) => `Period ${c.period}: ${c.note || "covered as planned"}`),
    gaps: partial.map((c) => `Period ${c.period} (${c.status.replace("_", " ")}): ${c.note || "not finished"}`),
    nextSteps: [
      partial.length ? `Start with a 10-minute review of period ${partial[0].period} material before moving on.` : "Continue with the next lesson in your plan.",
      report.materials ? `Restock: ${report.materials}` : "No materials flagged.",
    ],
    followUps: [report.behaviorNotes, report.attendanceNotes, report.message].filter((x) => x && x.trim().length > 0),
    continuityScore: Math.round(score * 100) / 100,
    meta: {
      mode: "sample",
      confidence: 0.84,
      reasons: ["Summarized from the substitute's end-of-day report", plan ? `Compared against "${plan.title}"` : "No plan to compare against"],
      sources: [
        { chunkId: report.id, source: `day_report:${report.id}`, quote: report.message.slice(0, 120) || "End-of-day report" },
        ...(plan ? [{ chunkId: plan.id, source: `lesson_plan:${plan.id}`, quote: plan.title }] : []),
        ...cite(s, ["kb-cont-3"]),
      ],
      humanReviewRequested: false,
    },
    createdAt: s.now,
  };
}
