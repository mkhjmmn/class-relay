/** Knowledge graph built from state, with an eligibility traversal that explains each hop. */
import { CREDENTIAL_LABELS, RULES, checkEligibility, credentialStatusOn, type KgEdge, type KgNode } from "@/domain";
import type { DemoState } from "@/data/state";

export function buildGraph(s: DemoState): { nodes: KgNode[]; edges: KgEdge[] } {
  const nodes = new Map<string, KgNode>();
  const edges: KgEdge[] = [];
  const add = (n: KgNode) => nodes.set(n.id, n);
  for (const r of RULES) add({ id: `rule:${r.id}`, kind: "rule", label: `${r.id} ${r.title}` });
  for (const sc of s.schools) add({ id: sc.id, kind: "school", label: sc.name });
  for (const t of s.teachers) {
    add({ id: t.id, kind: "teacher", label: t.name });
    add({ id: `subject:${t.subject}`, kind: "subject", label: t.subject });
    add({ id: `grade:${t.gradeBand}`, kind: "grade", label: t.gradeBand });
    edges.push({ from: t.id, to: t.school_id, rel: "TEACHES_AT" });
    for (const p of t.preferredSubIds) edges.push({ from: t.id, to: p, rel: "PREFERS" });
    for (const x of t.excludedSubIds) edges.push({ from: x, to: t.school_id, rel: "EXCLUDED_FROM" });
  }
  for (const sub of s.substitutes) {
    add({ id: sub.id, kind: "substitute", label: sub.name });
    for (const subj of sub.subjects) {
      add({ id: `subject:${subj}`, kind: "subject", label: subj });
      edges.push({ from: sub.id, to: `subject:${subj}`, rel: "QUALIFIES_FOR" });
    }
    for (const g of sub.gradeBands) {
      add({ id: `grade:${g}`, kind: "grade", label: g });
      edges.push({ from: sub.id, to: `grade:${g}`, rel: "QUALIFIES_FOR" });
    }
  }
  for (const c of s.credentials) {
    add({ id: c.id, kind: "credential", label: `${CREDENTIAL_LABELS[c.type]} (${c.status})` });
    edges.push({ from: c.substitute_id, to: c.id, rel: "HOLDS" });
    edges.push({ from: "rule:R1", to: c.id, rel: "APPLIES_TO" });
  }
  return { nodes: [...nodes.values()], edges };
}

export interface EligibilityExplanation {
  eligible: boolean;
  path: string[];
  ruleIds: string[];
}

/** Traverses substitute -> credentials -> rules and substitute -> subject/grade -> teacher -> school. */
export function explainEligibility(s: DemoState, subId: string, absenceId: string): EligibilityExplanation {
  const sub = s.substitutes.find((x) => x.id === subId);
  const absence = s.absences.find((x) => x.id === absenceId);
  if (!sub || !absence) return { eligible: false, path: ["Substitute or absence not found"], ruleIds: [] };
  const teacher = s.teachers.find((t) => t.id === absence.teacher_id)!;
  const school = s.schools.find((x) => x.id === absence.school_id)!;
  const creds = s.credentials.filter((c) => c.substitute_id === subId);
  const path: string[] = [];
  for (const c of creds) path.push(`${sub.name} -HOLDS-> ${CREDENTIAL_LABELS[c.type]} [${credentialStatusOn(c, absence.startDate)}] <-APPLIES_TO- R1`);
  path.push(`${sub.name} -QUALIFIES_FOR-> ${teacher.subject}: ${sub.subjects.includes(teacher.subject) ? "yes" : "no"}`);
  path.push(`${sub.name} -QUALIFIES_FOR-> ${teacher.gradeBand}: ${sub.gradeBands.includes(teacher.gradeBand) ? "yes" : "no"}`);
  path.push(`${teacher.name} -TEACHES_AT-> ${school.name}`);
  if (teacher.preferredSubIds.includes(subId)) path.push(`${teacher.name} -PREFERS-> ${sub.name}`);
  if (teacher.excludedSubIds.includes(subId)) path.push(`${sub.name} -EXCLUDED_FROM-> ${school.name} (R6)`);
  const res = checkEligibility({
    substitute: sub,
    credentials: creds,
    absence,
    school,
    teacher,
    date: absence.startDate,
    assignments: s.assignments.filter((a) => a.substitute_id === subId && a.status !== "cancelled" && a.status !== "no_show"),
    t4AnnualDayLimit: s.district.t4AnnualDayLimit,
  });
  for (const v of res.violations) path.push(`Blocked by ${v.ruleId}: ${v.message}`);
  for (const w of res.warnings) path.push(`Warning ${w.ruleId}: ${w.message}`);
  return { eligible: res.eligible, path, ruleIds: [...res.violations, ...res.warnings].map((f) => f.ruleId) };
}
