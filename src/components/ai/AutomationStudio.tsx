"use client";
import * as React from "react";
import { Clock, FlaskConical, Moon } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Input, Label, Switch } from "@/components/ui";
import { EmptyState } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { advanceClock, nightly, setAutomation } from "@/data/commands";
import { dryRun } from "@/automation/dryRun";
import { useT } from "@/i18n/useT";

export function AutomationStudio() {
  const t = useT();
  const { state, act, repo } = useRepo();
  const [dry, setDry] = React.useState<Record<string, string[]>>({});
  const tick = (min: number) => {
    const fired = act(advanceClock, min);
    if (Array.isArray(fired)) toast.message(fired.length ? fired.join(" · ") : `Clock +${min} min: no rule fired`);
  };
  const runNightly = () => {
    const fired = repo.run((d) => nightly(d));
    toast.message(fired.length ? fired.join(" · ") : "Nightly: nothing to do");
  };
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center gap-2 p-4">
        <p className="mr-2 flex items-center gap-1 font-semibold">
          <Clock aria-hidden className="size-4" /> {t("ai.studio.clock")}: <span className="font-mono text-sm">{state.now.replace("T", " ").slice(0, 16)}</span>
        </p>
        {[10, 30, 60].map((m) => (
          <Button key={m} size="sm" variant="outline" onClick={() => tick(m)}>
            +{m} min
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={() => tick(24 * 60)}>
          +1 day
        </Button>
        <Button size="sm" onClick={runNightly}>
          <Moon aria-hidden /> {t("ai.studio.nightly")}
        </Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {state.automations.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-brand-800">{r.id}</p>
                <h3 className="font-semibold">{r.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`en-${r.id}`} className="text-xs">
                  {r.enabled ? "On" : "Off"}
                </Label>
                <Switch id={`en-${r.id}`} checked={r.enabled} onCheckedChange={(v: boolean) => act(setAutomation, r.id, { enabled: v })} aria-label={`Enable ${r.name}`} />
              </div>
            </div>
            <p className="mt-2 text-sm">
              <Badge tone="brand">Trigger</Badge> {r.trigger}
            </p>
            <p className="mt-1 text-sm">
              <Badge tone="amber">If</Badge> {r.conditions.join("; ") || "always"}
            </p>
            <p className="mt-1 text-sm">
              <Badge tone="teal">Then</Badge> {r.actions.join(" -> ")}
            </p>
            {Object.entries(r.params).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(r.params).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1">
                    <Label htmlFor={`${r.id}-${k}`} className="text-xs">
                      {k}
                    </Label>
                    <Input
                      id={`${r.id}-${k}`}
                      type="number"
                      className="w-20"
                      defaultValue={v}
                      onBlur={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isFinite(n) && n !== v) act(setAutomation, r.id, { params: { [k]: n } });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => setDry((d) => ({ ...d, [r.id]: dryRun(state, r) }))}>
                <FlaskConical aria-hidden /> {t("ai.studio.dryRun")}
              </Button>
              {dry[r.id] && (
                <ul className="mt-2 list-disc pl-5 text-xs text-slate-700" aria-live="polite">
                  {dry[r.id].map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 text-lg font-semibold">Run history</h2>
          {!state.automationRuns.length ? (
            <EmptyState title="No automation runs yet" body="Advance the demo clock or report an absence." />
          ) : (
            <ol className="max-h-96 space-y-1 overflow-y-auto text-sm">
              {[...state.automationRuns].reverse().slice(0, 80).map((r) => (
                <li key={r.id} className="rounded bg-slate-50 px-2 py-1">
                  <span className="font-mono text-xs">{r.at.slice(5, 16).replace("T", " ")}</span> <Badge tone={r.status === "ok" ? "green" : "amber"}>{r.ruleId}</Badge> {r.steps.join("; ")}
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 text-lg font-semibold">Event timeline</h2>
          {!state.events.length ? (
            <EmptyState title="No events yet" />
          ) : (
            <ol className="max-h-96 space-y-1 overflow-y-auto border-l-2 border-brand-200 pl-3 text-sm">
              {[...state.events].reverse().slice(0, 100).map((e) => (
                <li key={e.id}>
                  <span className="font-mono text-xs">{e.at.slice(5, 16).replace("T", " ")}</span> <span className="font-mono text-xs text-brand-800">{e.type}</span> {e.summary} {e.ruleId && <Badge tone="outline">{e.ruleId}</Badge>}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
