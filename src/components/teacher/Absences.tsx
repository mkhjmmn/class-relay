"use client";
import * as React from "react";
import Link from "next/link";
import { EmptyState, Hydrated, PageHeader } from "@/components/shell/Page";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { absenceView } from "@/data/queries";
import { cancelAbsence, extendAbsence } from "@/data/commands";
import { useT } from "@/i18n/useT";
import { label, statusTone } from "@/components/substitute/common";
import { NotTeacher, useTeacher } from "./common";

function Body() {
  const t = useT();
  const { teacher, state, act } = useTeacher();
  const [mode, setMode] = React.useState<{ id: string; kind: "cancel" | "extend" } | null>(null);
  const [reason, setReason] = React.useState("");
  const [end, setEnd] = React.useState("");
  if (!teacher) return <NotTeacher />;
  const list = state.absences
    .filter((a) => a.teacher_id === teacher.id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((a) => absenceView(state, a));
  const open = (a: string) => !["cancelled", "completed", "paid"].includes(a);
  return (
    <>
      <PageHeader
        title={t("experience.teacher.absences")}
        purpose={t("experience.teacher.absencesPurpose")}
        action={
          <Button asChild>
            <Link href="/app/teacher/report">{t("experience.teacher.report")}</Link>
          </Button>
        }
        help={<p>Cancelling notifies any assigned substitute and records the reason. Extending adds days to the same absence so the same substitute can continue.</p>}
      />
      {list.length === 0 ? (
        <EmptyState title="No absences reported" action={<Button asChild><Link href="/app/teacher/report">Report one</Link></Button>} />
      ) : (
        <ul className="space-y-3">
          {list.map(({ absence: a, substitute, offers }) => (
            <li key={a.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {a.startDate}
                      {a.endDate !== a.startDate ? ` to ${a.endDate}` : ""} · {a.dayPart === "full" ? "Full day" : a.dayPart.toUpperCase()}
                    </p>
                    <p className="text-sm text-slate-700">
                      {label(a.reason)} · {substitute ? `Substitute: ${substitute.name}` : `${offers.filter((o) => o.status === "pending").length} offers out`}
                    </p>
                    {a.cancelReason && <p className="text-xs text-slate-600">Cancelled: {a.cancelReason}</p>}
                  </div>
                  <Badge tone={statusTone(a.status)}>{label(a.status)}</Badge>
                </div>
                {open(a.status) && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setMode({ id: a.id, kind: "extend" }); setEnd(a.endDate); }}>
                      Extend
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMode({ id: a.id, kind: "cancel" })}>
                      Cancel absence
                    </Button>
                  </div>
                )}
                {mode?.id === a.id && (
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const r = mode.kind === "cancel" ? act(cancelAbsence, a.id, reason) : act(extendAbsence, a.id, end);
                      if (r.ok) {
                        setMode(null);
                        setReason("");
                      }
                    }}
                  >
                    <div className="flex-1">
                      {mode.kind === "cancel" ? (
                        <Field label="Reason for cancelling" htmlFor={`can-${a.id}`}>
                          <Input id={`can-${a.id}`} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Feeling better, back at school" />
                        </Field>
                      ) : (
                        <Field label="New end date" htmlFor={`ext-${a.id}`}>
                          <Input id={`ext-${a.id}`} type="date" required min={a.endDate} value={end} onChange={(e) => setEnd(e.target.value)} />
                        </Field>
                      )}
                    </div>
                    <Button type="submit" size="sm" variant={mode.kind === "cancel" ? "danger" : "default"}>
                      {t("experience.confirm")}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
                      {t("experience.cancel")}
                    </Button>
                  </form>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function Absences() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
