"use client";
import * as React from "react";
import { AiResult, ErrorState } from "@/components/shell/Page";
import { Button, Field, Input, Select } from "@/components/ui";
import { extractCredential, type ExtractionResult } from "@/ai/client";
import { uploadCredential } from "@/data/commands";
import { useRepo } from "@/data/client";
import { CREDENTIAL_LABELS, type CredentialType } from "@/domain";

const ACCEPT = [".pdf", ".png", ".jpg", ".jpeg"];
const MAX = 5 * 1024 * 1024;

/** Upload -> A3 extraction (AiResult) -> confirm -> uploadCredential. Nothing is auto-rejected. */
export function CredentialUploader({ subId, holderName, types, defaultType, onSaved, idPrefix = "cu" }: { subId: string; holderName: string; types?: CredentialType[]; defaultType?: CredentialType; onSaved?: (type: CredentialType) => void; idPrefix?: string }) {
  const { state, act } = useRepo();
  const options = types ?? (Object.keys(CREDENTIAL_LABELS) as CredentialType[]);
  const [type, setType] = React.useState<CredentialType>(defaultType ?? options[0]);
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [ex, setEx] = React.useState<ExtractionResult | null>(null);

  const onFile = (f: File | null) => {
    setEx(null);
    setError(null);
    if (!f) return setFile(null);
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPT.includes(ext)) {
      setFile(null);
      return setError("Please choose a PDF, PNG or JPG file.");
    }
    if (f.size > MAX) {
      setFile(null);
      return setError("The file is larger than 5 MB.");
    }
    setFile(f);
  };

  const extract = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setEx(await extractCredential({ name: file.name, size: file.size, type: file.type }, { type, holderName, today: state.now.slice(0, 10) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!ex || !file) return;
    const r = act(uploadCredential, subId, { type: ex.type, number: ex.number, issuer: ex.issuer, issueDate: ex.issueDate, expiryDate: ex.expiryDate, documentName: file.name, nameOnDocument: ex.nameOnDocument, extractionConfidence: ex.confidence });
    if (r.ok) {
      setEx(null);
      setFile(null);
      onSaved?.(ex.type);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Document type" htmlFor={`${idPrefix}-type`}>
          <Select id={`${idPrefix}-type`} value={type} onChange={(e) => setType(e.target.value as CredentialType)}>
            {options.map((o) => (
              <option key={o} value={o}>
                {CREDENTIAL_LABELS[o]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="File (PDF, PNG or JPG, up to 5 MB)" htmlFor={`${idPrefix}-file`}>
          <Input id={`${idPrefix}-file`} type="file" accept={ACCEPT.join(",")} className="py-1.5" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </Field>
      </div>
      {error && <ErrorState message={error} />}
      <Button onClick={extract} disabled={!file || busy}>
        {busy ? "Reading document..." : "Read document"}
      </Button>
      {ex && (
        <AiResult meta={ex.meta} entityId={`${subId}:${ex.type}`} title={`Extraction: ${CREDENTIAL_LABELS[ex.type]}`}>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-600">Name on document</dt>
            <dd className="text-slate-900">{ex.nameOnDocument}</dd>
            <dt className="text-slate-600">Number</dt>
            <dd className="font-mono text-slate-900">{ex.number}</dd>
            <dt className="text-slate-600">Issuer</dt>
            <dd className="text-slate-900">{ex.issuer}</dd>
            <dt className="text-slate-600">Issued</dt>
            <dd className="text-slate-900">{ex.issueDate}</dd>
            <dt className="text-slate-600">Expires</dt>
            <dd className="text-slate-900">{ex.expiryDate ?? "No expiry"}</dd>
          </dl>
          {ex.tamperFlags.length > 0 && <p className="mt-2 text-sm text-red-800">Flags: {ex.tamperFlags.join("; ")}</p>}
          <p className="mt-3 text-xs text-slate-600">Clear, high-confidence documents are verified automatically. Anything else goes to an HR reviewer: nothing is ever rejected automatically.</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={confirm}>Confirm and save</Button>
            <Button variant="outline" onClick={() => setEx(null)}>
              Discard
            </Button>
          </div>
        </AiResult>
      )}
    </div>
  );
}
