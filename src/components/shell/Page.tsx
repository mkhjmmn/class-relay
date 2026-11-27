"use client";
import * as React from "react";
import { AlertTriangle, HelpCircle, Inbox, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Button, Card, Dialog, DialogContent, DialogTrigger, Progress, Skeleton } from "@/components/ui";
import { useT } from "@/i18n/useT";
import { useRepo } from "@/data/client";
import { requestHumanReview } from "@/data/commands";
import type { AiMeta } from "@/domain";
import { pct } from "@/lib/utils";

/** Every screen: title, one-line purpose, primary action, help panel (CLAUDE.md section 6). */
export function PageHeader({ title, purpose, action, help }: { title: string; purpose: string; action?: React.ReactNode; help: React.ReactNode }) {
  const t = useT();
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-slate-700">{purpose}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label={`${t("shell.help")}: ${title}`}>
              <HelpCircle aria-hidden /> {t("shell.help")}
            </Button>
          </DialogTrigger>
          <DialogContent title={`${t("shell.help")}: ${title}`}>
            <div className="prose prose-sm space-y-2 text-sm text-slate-800">{help}</div>
          </DialogContent>
        </Dialog>
        {action}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <Inbox aria-hidden className="size-8 text-slate-500" />
      <p className="font-semibold text-slate-900">{title}</p>
      {body && <p className="max-w-md text-sm text-slate-600">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="flex items-center gap-2 font-semibold text-red-900">
        <AlertTriangle aria-hidden className="size-4" /> {t("state.error")}
      </p>
      <p className="text-sm text-red-900">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("state.retry")}
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  const t = useT();
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">{t("state.loading")}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

/** Waits for client hydration (localStorage is read only after mount). */
export function Hydrated({ children, rows }: { children: React.ReactNode; rows?: number }) {
  const { hydrated } = useRepo();
  if (!hydrated) return <LoadingState rows={rows} />;
  return <>{children}</>;
}

export function Stat({ label, value, hint, tone = "brand" }: { label: string; value: React.ReactNode; hint?: string; tone?: "brand" | "teal" | "amber" | "red" }) {
  const toneCls = { brand: "text-brand-800", teal: "text-teal-800", amber: "text-amber-800", red: "text-red-800" }[tone];
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneCls}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-600">{hint}</p>}
    </Card>
  );
}

/** Every AI result shows reasons, sources, confidence and "Request human review" (CLAUDE.md section 6). */
export function AiResult({ meta, entityId, children, title }: { meta: AiMeta; entityId: string; children?: React.ReactNode; title?: string }) {
  const t = useT();
  const { act } = useRepo();
  const [requested, setRequested] = React.useState(meta.humanReviewRequested);
  return (
    <Card className="border-teal-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 bg-teal-50/60 px-5 py-2.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-teal-900">
          <Sparkles aria-hidden className="size-4" /> {title ?? t("badge.aiGenerated")}
        </p>
        <div className="flex items-center gap-2">
          <Badge tone={meta.mode === "live" ? "green" : "teal"}>{meta.mode === "live" ? t("badge.liveAi") : t("badge.sampleMode")}</Badge>
          <Badge tone={meta.confidence >= 0.8 ? "green" : meta.confidence >= 0.6 ? "amber" : "red"}>
            {t("ai.confidence")} {pct(meta.confidence)}
          </Badge>
        </div>
      </div>
      {children && <div className="p-5">{children}</div>}
      <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t("ai.reasons")}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
            {meta.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="mt-3">
            <Progress value={meta.confidence * 100} label={t("ai.confidence")} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t("ai.sources")}</p>
          {meta.sources.length ? (
            <ol className="mt-1 space-y-1 text-sm">
              {meta.sources.map((c, i) => (
                <li key={c.chunkId + i} className="rounded-lg bg-slate-50 px-2 py-1">
                  <span className="font-mono text-xs text-brand-800">[{i + 1}] {c.source}</span>
                  <span className="block text-xs text-slate-700">“{c.quote}”</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-sm text-slate-700">No sources retrieved: the answer says so instead of guessing.</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        {meta.mode === "sample" && <p className="text-xs text-slate-600">{t("ai.sampleNote")}</p>}
        <Button
          variant="outline"
          size="sm"
          disabled={requested}
          onClick={() => {
            const r = act(requestHumanReview, entityId, "Requested from AI result panel");
            if (r.ok) setRequested(true);
          }}
        >
          <ShieldCheck aria-hidden /> {requested ? t("ai.reviewRequested") : t("ai.requestReview")}
        </Button>
      </div>
    </Card>
  );
}

/** "Planned" card for P2 features at risk (CLAUDE.md section 8). */
export function PlannedCard({ title, does }: { title: string; does: string }) {
  return (
    <Card className="border-dashed p-5">
      <Badge tone="outline">Planned</Badge>
      <p className="mt-2 font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-700">{does}</p>
    </Card>
  );
}
