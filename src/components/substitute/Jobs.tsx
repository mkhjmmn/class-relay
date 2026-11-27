"use client";
import { useRouter } from "next/navigation";
import { MapPin, Sparkles } from "lucide-react";
import { EmptyState, Hydrated, PageHeader } from "@/components/shell/Page";
import { Badge, Button, Card } from "@/components/ui";
import { offersForSub } from "@/data/queries";
import { respondOffer } from "@/data/commands";
import { useT } from "@/i18n/useT";
import { NotSubstitute, label, money, useSub } from "./common";

function Body() {
  const t = useT();
  const router = useRouter();
  const { sub, state, act, markTask } = useSub();
  if (!sub) return <NotSubstitute />;
  const offers = offersForSub(state, sub.id);

  const respond = (offerId: string, accept: boolean) => {
    const r = act(respondOffer, offerId, accept);
    if (r.ok && accept && "value" in r && r.value.assignmentIds[0]) {
      markTask("accept");
      router.push(`/app/sub/briefs?a=${r.value.assignmentIds[0]}`);
    }
  };

  return (
    <>
      <PageHeader
        title={t("experience.sub.jobs")}
        purpose={t("experience.sub.jobsPurpose")}
        help={
          <>
            <p>Each offer shows the match score and the reasons from the matching engine: subject, grade band, distance, teacher preference, reliability and fairness.</p>
            <p>The first substitute to accept wins the job. Eligibility (permit, clearances, day limits) is checked again at the moment you accept.</p>
          </>
        }
      />
      {offers.length === 0 ? (
        <EmptyState title="No open offers right now" body="New offers appear here and by text message as soon as a matching absence is reported." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {offers.map(({ offer, absence, school, teacher }) => (
            <li key={offer.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {teacher.subject} · {teacher.gradeBand}
                    </p>
                    <p className="text-sm text-slate-700">
                      {school.name} · {teacher.name}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-brand-800">{money(offer.pay)}</p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-slate-600">Dates</dt>
                    <dd className="text-slate-900">
                      {absence.startDate}
                      {absence.endDate !== absence.startDate ? ` to ${absence.endDate}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Day part</dt>
                    <dd className="text-slate-900">{absence.dayPart === "full" ? "Full day" : `Half day (${absence.dayPart.toUpperCase()})`}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Distance</dt>
                    <dd className="flex items-center gap-1 text-slate-900">
                      <MapPin aria-hidden className="size-3.5" /> {offer.distance.toFixed(1)} mi
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Bell</dt>
                    <dd className="text-slate-900">
                      {school.bellStart} to {school.bellEnd}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3">
                  <p className="flex items-center justify-between gap-2 text-sm font-semibold text-teal-900">
                    <span className="flex items-center gap-1">
                      <Sparkles aria-hidden className="size-4" /> {t("experience.sub.whyMatch")}
                    </span>
                    <Badge tone="teal">Score {Math.round(offer.score)}</Badge>
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                    {offer.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-slate-600">Wave {offer.wave} · {label(absence.noticeType)} notice</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" onClick={() => respond(offer.id, true)}>
                    {t("experience.sub.accept")}
                  </Button>
                  <Button className="flex-1" variant="outline" onClick={() => respond(offer.id, false)}>
                    {t("experience.sub.decline")}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function Jobs() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
