"use client";
import { EmptyState, Hydrated, PageHeader } from "@/components/shell/Page";
import { Badge, Card } from "@/components/ui";
import { missingRequirements } from "@/data/commands";
import { CREDENTIAL_LABELS, daysBetween } from "@/domain";
import { useT } from "@/i18n/useT";
import { CredentialUploader } from "./CredentialUploader";
import { NotSubstitute, label, statusTone, useSub } from "./common";

function Body() {
  const t = useT();
  const { sub, state, today } = useSub();
  if (!sub) return <NotSubstitute />;
  const creds = state.credentials.filter((c) => c.substitute_id === sub.id && c.status !== "rejected").sort((a, b) => a.type.localeCompare(b.type));
  const missing = missingRequirements(state, sub.id);
  return (
    <>
      <PageHeader
        title={t("experience.sub.credentials")}
        purpose={t("experience.sub.credentialsPurpose")}
        help={
          <>
            <p>Every assignment needs a valid permit or license, background and health clearance, mandated-reporter training and district orientation (rule R1).</p>
            <p>Uploads are read by the Credential Extractor. High-confidence clear documents verify automatically; anything uncertain goes to HR review. Nothing is auto-rejected.</p>
          </>
        }
      />
      <Card className={`mb-4 p-4 ${missing.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
        <p className="font-semibold text-slate-950">{missing.length ? `Missing or not yet verified: ${missing.join(", ")}` : "All required credentials are valid."}</p>
        <p className="text-sm text-slate-700">Stage: {label(sub.stage)}{sub.pauseReason ? ` (${sub.pauseReason})` : ""}</p>
      </Card>
      {creds.length === 0 ? (
        <EmptyState title="No credentials on file" body="Upload your permit and clearances below." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {creds.map((c) => {
            const left = c.expiryDate ? daysBetween(today, c.expiryDate) : null;
            const soon = left !== null && left >= 0 && left <= 30;
            return (
              <li key={c.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-950">{CREDENTIAL_LABELS[c.type]}</p>
                    <Badge tone={statusTone(c.status)}>{label(c.status)}</Badge>
                  </div>
                  <p className="text-sm text-slate-700">
                    {c.issuer} · <span className="font-mono">{c.number}</span>
                  </p>
                  <p className="text-sm text-slate-700">
                    Issued {c.issueDate} · {c.expiryDate ? `Expires ${c.expiryDate}` : "No expiry"}
                  </p>
                  {soon && <Badge tone="amber" className="mt-1">Expires in {left} days: renew soon</Badge>}
                  {c.reviewNote && <p className="mt-1 text-xs text-amber-900">{c.reviewNote}</p>}
                  {c.verifiedBy && <p className="mt-1 text-xs text-slate-600">Verified by {c.verifiedBy}</p>}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Card className="mt-6 p-5">
        <h2 className="mb-3 font-semibold text-slate-950">Upload a document</h2>
        <CredentialUploader subId={sub.id} holderName={sub.name} />
      </Card>
    </>
  );
}

export function Credentials() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
