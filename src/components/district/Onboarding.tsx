"use client";
import * as React from "react";
import { ArrowLeft, ArrowRight, Upload } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Table, Tabs, TabsContent, TabsList, TabsTrigger, Td, Textarea, Th } from "@/components/ui";
import { AiResult, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { advanceStage, missingRequirements } from "@/data/commands";
import { mapCsvColumns, type ColumnMapping } from "@/ai/client";
import { AbsenceReasonSchema, formatMoney, PAY_RULES, PipelineStageSchema, RULE_PACK, RULES, type AiMeta, type PipelineStage } from "@/domain";
import { useT } from "@/i18n/useT";
import { pct } from "@/lib/utils";

const SAMPLE_CSV = `First Name,Last Name,Email Address,Mobile,Site,Department,Grade Level,Employee ID
Avery,Stone,avery.stone@example.org,555-0101,Cedar Hollow MS,Math,6-8,E1001
Blair,Novak,,555-0102,Maple Ridge Elementary,Science,3-5,E1002
Casey,Imani,casey.imani@example.org,555-0103,Lakeview Academy,English,9-12,E1003
Avery,Stone,avery.stone@example.org,555-0101,Cedar Hollow MS,Math,6-8,E1001`;

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
}

function CsvImport() {
  const { state } = useRepo();
  const [text, setText] = React.useState(SAMPLE_CSV);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ mappings: ColumnMapping[]; meta: AiMeta; report: string[]; rows: number } | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error("Add a header row and at least one data row.");
      if (rows.length > 5001) throw new Error("Limit is 5,000 rows per import in the demo.");
      const [headers, ...data] = rows;
      const { mappings, meta } = await mapCsvColumns(headers);
      const col = (target: string) => mappings.findIndex((m) => m.target === target);
      const emailI = col("email");
      const schoolI = col("school");
      const report: string[] = [];
      if (emailI < 0) report.push("No email column detected.");
      else {
        const missing = data.filter((r) => !r[emailI]).length;
        if (missing) report.push(`${missing} row(s) missing an email.`);
        const seen = new Map<string, number>();
        data.forEach((r) => r[emailI] && seen.set(r[emailI].toLowerCase(), (seen.get(r[emailI].toLowerCase()) ?? 0) + 1));
        const dups = [...seen.entries()].filter(([, n]) => n > 1);
        if (dups.length) report.push(`Duplicates: ${dups.map(([e, n]) => `${e} x${n}`).join(", ")}.`);
      }
      if (schoolI >= 0) {
        const known = new Set(state.schools.flatMap((s) => [s.name.toLowerCase(), s.short.toLowerCase()]));
        const unknown = [...new Set(data.map((r) => r[schoolI]).filter((v) => v && !known.has(v.toLowerCase())))];
        if (unknown.length) report.push(`Unknown schools: ${unknown.join(", ")}.`);
      } else report.push("No school column detected.");
      if (!report.length) report.push("No validation issues found.");
      setResult({ mappings, meta, report, rows: data.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the CSV.");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name) || f.size > 1_000_000) {
      setError("Upload a .csv file under 1 MB.");
      return;
    }
    setText(await f.text());
  };

  return (
    <div className="space-y-4">
      <Field label="Roster CSV (a sample is prefilled)" htmlFor="csv-text" hint="Synthetic sample rows. Nothing leaves the browser in Sandbox mode.">
        <Textarea id="csv-text" className="min-h-40 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-800" htmlFor="csv-file">
          Or choose a file
        </label>
        <input id="csv-file" type="file" accept=".csv,text/csv" className="text-sm" onChange={(e) => void onFile(e.target.files?.[0])} />
        <Button onClick={() => void run()} disabled={busy}>
          <Upload aria-hidden /> {busy ? "Mapping columns..." : "Map columns and validate"}
        </Button>
      </div>
      {busy && <LoadingState rows={1} />}
      {error && <ErrorState message={error} />}
      {result && (
        <AiResult meta={result.meta} entityId="import:roster-csv" title="Column mapping (Onboarding agent)">
          <Table>
            <thead>
              <tr>
                <Th>Source column</Th>
                <Th>Maps to</Th>
                <Th>Confidence</Th>
              </tr>
            </thead>
            <tbody>
              {result.mappings.map((m) => (
                <tr key={m.source}>
                  <Td>{m.source}</Td>
                  <Td>{m.target ?? <Badge tone="amber">needs a human choice</Badge>}</Td>
                  <Td>{pct(m.confidence)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <h3 className="mt-4 font-semibold">Validation report ({result.rows} rows)</h3>
          <ul className="list-disc pl-5 text-sm">
            {result.report.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </AiResult>
      )}
    </div>
  );
}

function Pipeline() {
  const { state, act } = useRepo();
  const stages = PipelineStageSchema.options;
  const flow: PipelineStage[] = ["applied", "documents", "verification", "orientation", "active"];
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {stages.map((st) => {
        const subs = state.substitutes.filter((s) => s.stage === st);
        return (
          <section key={st} aria-labelledby={`stage-${st}`} className="rounded-2xl bg-slate-50 p-2">
            <h3 id={`stage-${st}`} className="mb-2 flex items-center justify-between px-1 text-sm font-semibold capitalize">
              {st} <Badge>{subs.length}</Badge>
            </h3>
            <div className="max-h-[28rem] space-y-2 overflow-y-auto">
              {subs.length === 0 && <p className="px-1 text-xs text-slate-600">Empty</p>}
              {subs.map((s) => {
                const i = flow.indexOf(st);
                const next = st === "paused" ? "active" : flow[i + 1];
                const prev = st === "paused" ? undefined : flow[i - 1];
                const missing = st === "orientation" || st === "verification" ? missingRequirements(state, s.id) : [];
                return (
                  <Card key={s.id} className="p-2 text-xs">
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-slate-600">
                      {s.tier} · joined {s.joinedAt}
                    </p>
                    {missing.length > 0 && <p className="mt-1 text-amber-900">Missing: {missing.join(", ")}</p>}
                    <div className="mt-1 flex gap-1">
                      {prev && (
                        <Button size="sm" variant="ghost" aria-label={`Move ${s.name} back to ${prev}`} onClick={() => act(advanceStage, s.id, prev)}>
                          <ArrowLeft aria-hidden />
                        </Button>
                      )}
                      {next && (
                        <Button size="sm" variant="outline" aria-label={`Move ${s.name} to ${next}`} onClick={() => act(advanceStage, s.id, next)}>
                          {next} <ArrowRight aria-hidden />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const ADAPTERS = [
  { name: "SSO (SAML / OIDC)", does: "Staff sign in with the district identity provider." },
  { name: "SIS / OneRoster 1.2", does: "Nightly import of schools, teachers and class sections." },
  { name: "HRIS", does: "Substitute employment records and tiers." },
  { name: "Payroll export", does: "CSV or API push of approved pay runs." },
];

export function Onboarding() {
  const t = useT();
  const { state } = useRepo();
  return (
    <>
      <PageHeader
        title={t("operations.onboarding.title")}
        purpose={t("operations.onboarding.purpose")}
        action={
          <Button asChild>
            <a href="#import">Import a roster CSV</a>
          </Button>
        }
        help={<p>Each tab is one step of district setup. Values come from the current district configuration. The CSV mapping is an AI suggestion: a human confirms before anything is imported.</p>}
      />
      <Tabs defaultValue="schools">
        <TabsList aria-label="Onboarding steps">
          <TabsTrigger value="schools">1. Schools &amp; bells</TabsTrigger>
          <TabsTrigger value="pay">2. Pay rules</TabsTrigger>
          <TabsTrigger value="rules">3. Rule pack</TabsTrigger>
          <TabsTrigger value="reasons">4. Absence reasons</TabsTrigger>
          <TabsTrigger value="approval">5. Approval chain</TabsTrigger>
          <TabsTrigger value="import">6. CSV import</TabsTrigger>
          <TabsTrigger value="adapters">7. Adapters</TabsTrigger>
          <TabsTrigger value="pipeline">8. Pipeline</TabsTrigger>
        </TabsList>
        <TabsContent value="schools">
          <Table>
            <thead>
              <tr>
                <Th>School</Th>
                <Th>Level</Th>
                <Th>Bell</Th>
                <Th>Periods</Th>
                <Th>Budget code</Th>
              </tr>
            </thead>
            <tbody>
              {state.schools.map((s) => (
                <tr key={s.id}>
                  <Td className="font-medium">
                    {s.name} {s.hardToFill && <Badge tone="amber">hard to fill</Badge>}
                  </Td>
                  <Td>{s.level}</Td>
                  <Td>
                    {s.bellStart} to {s.bellEnd}
                  </Td>
                  <Td>{s.periods.length}</Td>
                  <Td className="font-mono text-xs">{s.budgetCode}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TabsContent>
        <TabsContent value="pay">
          <Card className="p-4 text-sm">
            <ul className="space-y-1">
              {Object.entries(PAY_RULES.daily).map(([tier, v]) => (
                <li key={tier}>
                  {tier} daily rate: <strong>{formatMoney(v)}</strong>
                </li>
              ))}
              <li>Half day: {pct(PAY_RULES.halfDayRatio)} of daily</li>
              <li>
                Long-term bonus from day {PAY_RULES.longTermFromDay}: {formatMoney(PAY_RULES.longTermBonus)} per day
              </li>
              <li>Hard-to-fill bonus: {formatMoney(PAY_RULES.hardToFillBonus)}</li>
              <li>Late cancellation window: {PAY_RULES.lateCancelHours} hours</li>
            </ul>
          </Card>
        </TabsContent>
        <TabsContent value="rules">
          <Badge tone="amber">{RULE_PACK.label}</Badge>
          <p className="mt-2 text-sm text-slate-700">
            {RULE_PACK.id} v{RULE_PACK.version}, effective {RULE_PACK.effectiveDate}
          </p>
          <ul className="mt-3 space-y-2">
            {RULES.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <strong>
                  {r.id} {r.title}
                </strong>
                <p className="text-slate-700">{r.text}</p>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="reasons">
          <ul className="flex flex-wrap gap-2">
            {AbsenceReasonSchema.options.map((r) => (
              <li key={r}>
                <Badge tone="brand">{r.replace(/_/g, " ")}</Badge>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="approval">
          <Card className="p-4 text-sm">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Teacher reports the absence (voice, text or form).</li>
              <li>{state.district.approvalRequired ? "School admin approves before matching starts." : "Matching starts immediately; the school admin is notified (approval not required)."}</li>
              <li>District HR reviews exceptions: overrides, flagged credentials and pay anomalies.</li>
            </ol>
          </Card>
        </TabsContent>
        <TabsContent value="import" id="import">
          <CsvImport />
        </TabsContent>
        <TabsContent value="adapters">
          <div className="grid gap-3 sm:grid-cols-2">
            {ADAPTERS.map((a) => (
              <Card key={a.name}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {a.name} <Badge tone="teal">{t("operations.sandboxed")}</Badge>
                  </CardTitle>
                  <CardDescription>{a.does}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="pipeline">
          {state.substitutes.length === 0 ? <EmptyState title="No applicants yet" /> : <Pipeline />}
          <CardContent className="px-0 text-xs text-slate-600">Moving to active checks every requirement; errors list what is missing.</CardContent>
        </TabsContent>
      </Tabs>
    </>
  );
}
