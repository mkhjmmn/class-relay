"use client";
import * as React from "react";
import Link from "next/link";
import { Mic, MicOff } from "lucide-react";
import { AiResult, ErrorState, Hydrated, PageHeader } from "@/components/shell/Page";
import { Button, Card, Field, Input, Select, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "@/components/ui";
import { intakeAbsence, type IntakeResult } from "@/ai/client";
import { reportAbsence } from "@/data/commands";
import { AbsenceReasonSchema, addDays, type AbsenceInput, type AbsenceReason, type DayPart } from "@/domain";
import { useT } from "@/i18n/useT";
import { NotTeacher, useTeacher } from "./common";

interface SpeechRec {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechCtor = new () => SpeechRec;

function AbsenceFields({ value, onChange, idp }: { value: AbsenceInput; onChange: (v: AbsenceInput) => void; idp: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Start date" htmlFor={`${idp}-start`}>
        <Input id={`${idp}-start`} type="date" value={value.startDate} onChange={(e) => onChange({ ...value, startDate: e.target.value, endDate: value.endDate < e.target.value ? e.target.value : value.endDate })} />
      </Field>
      <Field label="End date" htmlFor={`${idp}-end`}>
        <Input id={`${idp}-end`} type="date" min={value.startDate} value={value.endDate} onChange={(e) => onChange({ ...value, endDate: e.target.value })} />
      </Field>
      <Field label="Day part" htmlFor={`${idp}-part`}>
        <Select id={`${idp}-part`} value={value.dayPart} onChange={(e) => onChange({ ...value, dayPart: e.target.value as DayPart })}>
          <option value="full">Full day</option>
          <option value="am">Morning (AM)</option>
          <option value="pm">Afternoon (PM)</option>
        </Select>
      </Field>
      <Field label="Reason" htmlFor={`${idp}-reason`}>
        <Select id={`${idp}-reason`} value={value.reason} onChange={(e) => onChange({ ...value, reason: e.target.value as AbsenceReason })}>
          {AbsenceReasonSchema.options.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes for the substitute and office" htmlFor={`${idp}-notes`}>
          <Textarea id={`${idp}-notes`} value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

function Done({ id }: { id: string }) {
  return (
    <Card role="status" className="border-emerald-200 bg-emerald-50 p-5">
      <p className="font-semibold text-emerald-900">Absence {id} reported. Matching has started.</p>
      <p className="text-sm text-emerald-900">The first wave of offers goes to your preferred and best-matched substitutes. You will be notified when someone accepts.</p>
      <Button asChild className="mt-3">
        <Link href="/app/teacher/absences">See coverage status</Link>
      </Button>
    </Card>
  );
}

function Body() {
  const t = useT();
  const { teacher, today, act } = useTeacher();
  const [text, setText] = React.useState("");
  const [via, setVia] = React.useState<"voice" | "text">("text");
  const [listening, setListening] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [intake, setIntake] = React.useState<IntakeResult | null>(null);
  const [draft, setDraft] = React.useState<AbsenceInput | null>(null);
  const [done, setDone] = React.useState<string | null>(null);
  const [speech, setSpeech] = React.useState<SpeechCtor | null>(null);
  const recRef = React.useRef<SpeechRec | null>(null);
  const [form, setForm] = React.useState<AbsenceInput | null>(null);

  React.useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ctor) setSpeech(() => ctor);
  }, []);

  if (!teacher) return <NotTeacher />;
  const formValue: AbsenceInput = form ?? { teacher_id: teacher.id, startDate: addDays(today, 1), endDate: addDays(today, 1), dayPart: "full", periods: [], reason: "illness", notes: "", reportedVia: "form" };

  const toggleMic = () => {
    if (!speech) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new speech();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ");
      setText((prev) => (prev ? `${prev} ${said}` : said));
      setVia("voice");
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setError("The microphone could not be used. Type your message instead.");
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const structure = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await intakeAbsence(text, { teacherId: teacher.id, today, via });
      setIntake(r);
      setDraft(r.input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the message.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (input: AbsenceInput) => {
    const r = act(reportAbsence, input);
    if (r.ok && "value" in r) {
      setDone(r.value.id);
      setIntake(null);
      setDraft(null);
      setText("");
    }
  };

  return (
    <>
      <PageHeader
        title={t("experience.teacher.report")}
        purpose={t("experience.teacher.reportPurpose")}
        action={
          <Button asChild variant="outline">
            <Link href="/app/teacher/absences">{t("experience.teacher.absences")}</Link>
          </Button>
        }
        help={
          <>
            <p>Speak or type naturally, for example &quot;I&apos;m sick tomorrow, plan is in the folder&quot;. The Intake agent turns it into dates, day part and reason. Nothing is sent until you confirm.</p>
            <p>Prefer a form? Use the Quick form tab: three choices and submit.</p>
          </>
        }
      />
      {done ? (
        <Done id={done} />
      ) : (
        <Tabs defaultValue="say">
          <TabsList aria-label="How to report">
            <TabsTrigger value="say">Say or type</TabsTrigger>
            <TabsTrigger value="form">Quick form</TabsTrigger>
          </TabsList>
          <TabsContent value="say">
            <Card className="space-y-3 p-5">
              <Field label="Your message" htmlFor="intake-text" hint={speech ? "Tap the microphone to dictate, or type." : "Voice input is not available in this browser, so type your message."}>
                <Textarea id="intake-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="I'm sick tomorrow, plan is in the folder" />
              </Field>
              <div className="flex flex-wrap gap-2">
                {speech && (
                  <Button type="button" variant={listening ? "danger" : "outline"} onClick={toggleMic} aria-pressed={listening}>
                    {listening ? <MicOff aria-hidden /> : <Mic aria-hidden />} {listening ? "Stop listening" : "Speak"}
                  </Button>
                )}
                <Button onClick={structure} disabled={!text.trim() || busy}>
                  {busy ? "Reading..." : "Structure my report"}
                </Button>
              </div>
              {error && <ErrorState message={error} />}
            </Card>
            {intake && draft && (
              <div className="mt-4">
                <AiResult meta={intake.meta} entityId={`intake:${teacher.id}`} title="Please confirm your absence">
                  <p className="mb-3 font-semibold text-slate-950">{intake.summary}</p>
                  <AbsenceFields value={draft} onChange={setDraft} idp="ai" />
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => submit(draft)}>{t("experience.confirm")}</Button>
                    <Button variant="outline" onClick={() => setIntake(null)}>
                      {t("experience.cancel")}
                    </Button>
                  </div>
                </AiResult>
              </div>
            )}
          </TabsContent>
          <TabsContent value="form">
            <Card className="space-y-4 p-5">
              <AbsenceFields value={formValue} onChange={setForm} idp="form" />
              <Button onClick={() => submit(formValue)}>Report absence</Button>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}

export function ReportAbsence() {
  return (
    <Hydrated>
      <Body />
    </Hydrated>
  );
}
