"use client";
import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Hydrated, PageHeader } from "@/components/shell/Page";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { createApplicant, completeOrientation, missingRequirements } from "@/data/commands";
import { useRepo } from "@/data/client";
import { CREDENTIAL_LABELS, GradeBandSchema, SubjectSchema, type CredentialType, type GradeBand, type Language, type Subject, type Tier } from "@/domain";
import { useT } from "@/i18n/useT";
import { CredentialUploader } from "./CredentialUploader";
import { label } from "./common";

const DOCS: CredentialType[] = ["substitute_permit", "background_clearance", "health_clearance"];
const ORIENTATION = ["Read the district code of conduct for substitutes", "Watch the emergency procedures module", "Complete the mandated-reporter module", "Review student privacy (need-to-know only)"];

function ApplyForm({ onCreated }: { onCreated: (userId: string) => void }) {
  const { act } = useRepo();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [tier, setTier] = React.useState<Tier>("T2");
  const [subject, setSubject] = React.useState<Subject>("Math");
  const [grade, setGrade] = React.useState<GradeBand>("6-8");
  const [lang, setLang] = React.useState<Language>("en");
  const [dist, setDist] = React.useState(15);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const r = act(createApplicant, { name, email, phone, tier, subjects: [subject], gradeBands: [grade], languages: [lang], maxDistance: dist });
        if (r.ok && "value" in r) onCreated(r.value.userId);
      }}
    >
      <Field label="Full name" htmlFor="ap-name">
        <Input id="ap-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam Rivera" />
      </Field>
      <Field label="Email" htmlFor="ap-email">
        <Input id="ap-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sam@example.org" />
      </Field>
      <Field label="Mobile phone" htmlFor="ap-phone">
        <Input id="ap-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-0100" />
      </Field>
      <Field label="Tier" htmlFor="ap-tier" hint="T1 permit, T2 degree, T3 credentialed, T4 retired teacher">
        <Select id="ap-tier" value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
          {(["T1", "T2", "T3", "T4"] as Tier[]).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
      </Field>
      <Field label="Main subject" htmlFor="ap-subject">
        <Select id="ap-subject" value={subject} onChange={(e) => setSubject(e.target.value as Subject)}>
          {SubjectSchema.options.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
      </Field>
      <Field label="Grade band" htmlFor="ap-grade">
        <Select id="ap-grade" value={grade} onChange={(e) => setGrade(e.target.value as GradeBand)}>
          {GradeBandSchema.options.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
      </Field>
      <Field label="Preferred language" htmlFor="ap-lang">
        <Select id="ap-lang" value={lang} onChange={(e) => setLang(e.target.value as Language)}>
          <option value="en">English</option>
          <option value="bn">Bangla</option>
          <option value="es">Spanish</option>
        </Select>
      </Field>
      <Field label="Maximum distance (miles)" htmlFor="ap-dist">
        <Input id="ap-dist" type="number" min={1} max={60} value={dist} onChange={(e) => setDist(Number(e.target.value) || 1)} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit">Submit application</Button>
      </div>
    </form>
  );
}

function Body() {
  const t = useT();
  const { state, user, act, setSession } = useRepo();
  const sub = user?.substitute_id ? state.substitutes.find((s) => s.id === user.substitute_id) : undefined;
  const [checked, setChecked] = React.useState<boolean[]>(ORIENTATION.map(() => false));
  const creds = sub ? state.credentials.filter((c) => c.substitute_id === sub.id && c.status !== "rejected") : [];
  const has = (ty: CredentialType) => creds.some((c) => c.type === ty);
  const step = !sub ? 1 : DOCS.some((d) => !has(d)) ? 2 : sub.stage === "active" || has("district_orientation") ? 4 : 3;
  const missing = sub ? missingRequirements(state, sub.id) : [];
  const steps = ["Apply", "Upload documents", "Orientation", "Status"];

  return (
    <>
      <PageHeader
        title={t("experience.apply.title")}
        purpose={t("experience.apply.purpose")}
        help={
          <>
            <p>Four steps: application, documents (substitute permit, background and health clearance), a short orientation, then activation.</p>
            <p>Documents are read by the Credential Extractor. Clear, high-confidence documents verify automatically; anything else goes to an HR reviewer. Nothing is auto-rejected.</p>
          </>
        }
      />
      <ol className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Application steps">
        {steps.map((s, i) => (
          <li key={s} aria-current={step === i + 1 ? "step" : undefined} className={`rounded-xl border px-3 py-2 text-sm ${step === i + 1 ? "border-brand-300 bg-brand-50 font-semibold text-brand-900" : step > i + 1 ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      {user && !sub && (
        <Card className="mb-4 p-4 text-sm text-slate-800">
          You are signed in as {user.name} ({label(user.role)}). Submitting the form creates a new substitute applicant and switches the demo to that account.
        </Card>
      )}
      <Card className="p-5">
        {step === 1 && <ApplyForm onCreated={(userId) => setSession({ role: "substitute", userId })} />}
        {step === 2 && sub && (
          <div className="space-y-4">
            <ul className="space-y-1">
              {DOCS.map((d) => {
                const c = creds.find((x) => x.type === d);
                return (
                  <li key={d} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-900">{CREDENTIAL_LABELS[d]}</span>
                    <Badge tone={c ? (c.status === "verified" ? "green" : "amber") : "neutral"}>{c ? label(c.status) : "Not uploaded"}</Badge>
                  </li>
                );
              })}
            </ul>
            <CredentialUploader key={DOCS.find((d) => !has(d))} subId={sub.id} holderName={sub.name} types={DOCS} defaultType={DOCS.find((d) => !has(d))} idPrefix="apply" />
          </div>
        )}
        {step === 3 && sub && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              act(completeOrientation, sub.id);
            }}
          >
            <h2 className="font-semibold text-slate-950">Orientation checklist</h2>
            {ORIENTATION.map((o, i) => (
              <label key={o} className="flex items-center gap-2 text-sm text-slate-900">
                <input type="checkbox" checked={checked[i]} onChange={(e) => setChecked(checked.map((c, j) => (j === i ? e.target.checked : c)))} /> {o}
              </label>
            ))}
            <Button type="submit" disabled={!checked.every(Boolean)}>
              Complete orientation
            </Button>
          </form>
        )}
        {step === 4 && sub && (
          <div className="space-y-3">
            {sub.stage === "active" ? (
              <p className="flex items-center gap-2 font-semibold text-emerald-900">
                <CheckCircle2 aria-hidden className="size-5" /> You are active and can receive offers.
              </p>
            ) : (
              <>
                <p className="font-semibold text-amber-900">Stage: {label(sub.stage)}. Still needed before activation:</p>
                <ul className="list-disc pl-5 text-sm text-slate-900">
                  {missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
                <p className="text-sm text-slate-700">Documents in review are checked by HR; nothing is rejected automatically. You can upload a clearer copy from your credential wallet.</p>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/app/sub">Go to my home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/sub/credentials">Credential wallet</Link>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

export function Apply() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
