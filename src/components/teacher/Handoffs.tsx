"use client";
import { AiResult, EmptyState, Hydrated, PageHeader } from "@/components/shell/Page";
import { Badge } from "@/components/ui";
import { byId } from "@/data/queries";
import { useT } from "@/i18n/useT";
import { pct } from "@/lib/utils";
import { NotTeacher, useTeacher } from "./common";

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-900">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function Body() {
  const t = useT();
  const { teacher, state } = useTeacher();
  if (!teacher) return <NotTeacher />;
  const list = state.handoffs.filter((h) => h.teacher_id === teacher.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeader title={t("experience.teacher.handoffs")} purpose={t("experience.teacher.handoffsPurpose")} help={<p>The Return Handoff is written by the Lesson Continuity agent from the substitute&apos;s end-of-day report. The continuity score is the share of planned periods that were covered.</p>} />
      {list.length === 0 ? (
        <EmptyState title="No handoffs yet" body="Handoffs appear after a substitute submits the end-of-day report for your class." />
      ) : (
        <ul className="space-y-4">
          {list.map((h) => {
            const asg = byId(state.assignments, h.assignment_id);
            const sub = asg ? byId(state.substitutes, asg.substitute_id) : undefined;
            return (
              <li key={h.id}>
                <AiResult meta={h.meta} entityId={h.id} title={`Return handoff · ${asg?.date ?? h.createdAt.slice(0, 10)}${sub ? ` · ${sub.name}` : ""}`}>
                  <Badge tone={h.continuityScore >= 0.8 ? "green" : h.continuityScore >= 0.5 ? "amber" : "red"}>Continuity {pct(h.continuityScore)}</Badge>
                  <List title="Taught" items={h.taught} />
                  <List title="Gaps" items={h.gaps} />
                  <List title="Next steps" items={h.nextSteps} />
                  <List title="Follow-ups" items={h.followUps} />
                </AiResult>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function Handoffs() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
