/**
 * Client-side AI contract used by feature UIs. Signatures are stable; ai-engineer owns the bodies.
 * In Sample mode these run deterministic recorded logic; in live mode they call /api/agents/* (server routes)
 * and fall back to the sample path if the call fails or the output fails its zod schema twice.
 */
import { addDays, weekday, type AbsenceInput, type AbsenceReason, type AiMeta, type CredentialType, type DayPart } from "@/domain";

export interface IntakeResult {
  input: AbsenceInput;
  summary: string;
  meta: AiMeta;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nextWeekday(today: string, target: number): string {
  let d = addDays(today, 1);
  while (weekday(d) !== target) d = addDays(d, 1);
  return d;
}

/** A2 Intake: turns a voice or text absence report into a structured AbsenceInput. */
export async function intakeAbsence(text: string, ctx: { teacherId: string; today: string; via: "voice" | "text" }): Promise<IntakeResult> {
  const t = text.toLowerCase();
  const reasons: string[] = [];
  let start = ctx.today;
  if (/\btomorrow\b|\bmañana\b/.test(t)) {
    start = addDays(ctx.today, 1);
    reasons.push('"tomorrow" -> next calendar day');
  } else {
    const wd = WEEKDAYS.findIndex((w) => t.includes(w));
    if (wd >= 0 && !/until|through|thru|to (?:mon|tue|wed|thu|fri)/.test(t.slice(0, t.indexOf(WEEKDAYS[wd])))) {
      start = nextWeekday(ctx.today, wd);
      reasons.push(`"${WEEKDAYS[wd]}" -> ${start}`);
    } else reasons.push("No date mentioned -> today");
  }
  while (weekday(start) === 0 || weekday(start) === 6) start = addDays(start, 1);
  let end = start;
  const until = t.match(/(?:until|through|thru|to)\s+(monday|tuesday|wednesday|thursday|friday)/);
  if (until) {
    const target = WEEKDAYS.indexOf(until[1]);
    end = start;
    while (weekday(end) !== target) end = addDays(end, 1);
    reasons.push(`"until ${until[1]}" -> ends ${end}`);
  }
  const days = t.match(/(\d+|two|three|four|five)\s+days/);
  if (days && !until) {
    const n = { two: 2, three: 3, four: 4, five: 5 }[days[1] as "two"] ?? Number(days[1]);
    let count = 1;
    while (count < n) {
      end = addDays(end, 1);
      if (weekday(end) !== 0 && weekday(end) !== 6) count++;
    }
    reasons.push(`"${days[0]}" -> ${n} school days`);
  }
  let dayPart: DayPart = "full";
  if (/morning|half[- ]day.*morning|\bam\b|first half/.test(t)) dayPart = "am";
  else if (/afternoon|\bpm\b|second half|after lunch/.test(t)) dayPart = "pm";
  else if (/half[- ]day/.test(t)) dayPart = "am";
  if (dayPart !== "full") reasons.push(`Half day (${dayPart})`);
  const reasonMap: [RegExp, AbsenceReason][] = [
    [/sick|ill|fever|flu|doctor|unwell|enfermo|migraine/, "illness"],
    [/family|child|kid|daughter|son|funeral/, "family"],
    [/training|conference|pd\b|professional|workshop/, "professional_development"],
    [/jury/, "jury_duty"],
    [/personal|appointment|errand/, "personal"],
  ];
  const reason = reasonMap.find(([re]) => re.test(t))?.[1] ?? "other";
  reasons.push(`Reason classified as ${reason.replace("_", " ")}`);
  const confidence = reasons.some((r) => r.startsWith("No date")) || reason === "other" ? 0.72 : 0.9;
  const input: AbsenceInput = {
    teacher_id: ctx.teacherId,
    startDate: start,
    endDate: end,
    dayPart,
    periods: [],
    reason,
    notes: text.slice(0, 500),
    reportedVia: ctx.via,
  };
  return {
    input,
    summary: `${dayPart === "full" ? "Full day" : `Half day (${dayPart.toUpperCase()})`}, ${start}${end !== start ? ` to ${end}` : ""}, ${reason.replace("_", " ")}.`,
    meta: {
      mode: "sample",
      confidence,
      reasons,
      sources: [{ chunkId: "kb-gloss-1", source: "docs/knowledge-base.md#glossary", quote: "Absence: a teacher's time away that needs coverage (full day, half day or single periods)." }],
      humanReviewRequested: false,
    },
  };
}

export interface ExtractionResult {
  type: CredentialType;
  number: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  nameOnDocument: string;
  confidence: number;
  tamperFlags: string[];
  meta: AiMeta;
}

/** A3 Extractor: reads a credential document (vision in live mode). Sample mode uses the file name and declared fields. */
export async function extractCredential(file: { name: string; size: number; type: string }, declared: { type: CredentialType; holderName: string; today: string }): Promise<ExtractionResult> {
  const lower = file.name.toLowerCase();
  const blurry = /blur|scan|photo|img|jpe?g/.test(lower) && file.size < 60_000;
  const mismatch = /mismatch|other/.test(lower);
  const expired = /expired|old/.test(lower);
  const confidence = blurry ? 0.64 : 0.93;
  const tamperFlags = /edit|tamper/.test(lower) ? ["Font inconsistency near the expiry date"] : [];
  return {
    type: declared.type,
    number: `${declared.type.slice(0, 3).toUpperCase()}-${(file.size % 100000).toString().padStart(5, "0")}`,
    issuer: declared.type === "background_clearance" ? "State DOJ fingerprint service (sample)" : declared.type.includes("permit") || declared.type.includes("license") ? "State Commission on Teacher Credentialing (sample)" : "Riverbend USD",
    issueDate: addDays(declared.today, expired ? -800 : -10),
    expiryDate: declared.type === "mandated_reporter" || declared.type === "district_orientation" ? undefined : addDays(declared.today, expired ? -30 : 730),
    nameOnDocument: mismatch ? declared.holderName.split(" ").reverse().join(", ") : declared.holderName,
    confidence: tamperFlags.length ? Math.min(confidence, 0.5) : confidence,
    tamperFlags,
    meta: {
      mode: "sample",
      confidence,
      reasons: [blurry ? "Image is small or blurry: lower confidence" : "Clear document text", mismatch ? "Name order differs from the profile" : "Name matches the profile", expired ? "Expiry date is in the past" : "Dates are valid"],
      sources: [{ chunkId: "kb-cred-1", source: "docs/knowledge-base.md#credential-model", quote: "Credential types in the sample pack: substitute permit; full teaching license; background clearance" }],
      humanReviewRequested: false,
    },
  };
}

export interface ColumnMapping {
  source: string;
  target: string | null;
  confidence: number;
}
const TARGETS: [RegExp, string][] = [
  [/^(first|given)/i, "first_name"],
  [/^(last|sur|family)/i, "last_name"],
  [/full.?name|^name$/i, "name"],
  [/mail/i, "email"],
  [/phone|mobile|cell/i, "phone"],
  [/school|site|building|campus/i, "school"],
  [/subject|dept|department|course/i, "subject"],
  [/grade|level/i, "grade_band"],
  [/role|position|title/i, "role"],
  [/id$|sourcedid|employee/i, "external_id"],
];
/** A2 CSV / OneRoster column mapping with a validation report. */
export async function mapCsvColumns(headers: string[]): Promise<{ mappings: ColumnMapping[]; meta: AiMeta }> {
  const mappings = headers.map((h) => {
    const hit = TARGETS.find(([re]) => re.test(h.trim()));
    return { source: h, target: hit?.[1] ?? null, confidence: hit ? 0.9 : 0.2 };
  });
  const unmapped = mappings.filter((m) => !m.target).map((m) => m.source);
  return {
    mappings,
    meta: {
      mode: "sample",
      confidence: unmapped.length ? 0.7 : 0.92,
      reasons: [`${mappings.length - unmapped.length} of ${mappings.length} columns mapped by name pattern`, ...(unmapped.length ? [`Needs a human choice: ${unmapped.join(", ")}`] : [])],
      sources: [],
      humanReviewRequested: false,
    },
  };
}
