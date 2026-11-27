# Handoff notes

Sub-agents append a section here: what shipped, what is still a "Planned" card, how to verify it, and any change requests for the lead (shared types in `src/domain` are lead-owned).

## Lead - Phase 0 (shared foundation)

Shipped:
- `src/domain`: zod schemas for all entities (`schemas.ts`), absence state machine, rules engine R1-R8 (`rules.ts`), pay rules + anomalies (`pay.ts`), matching with waves and fairness (`matching.ts`), hash-chained audit (`audit.ts`, pure SHA-256).
- `src/data`: `Repository` interface, sandbox driver (localStorage), supabase driver, deterministic seed (`seed/`), domain commands (`commands.ts`) that implement the full Relay Loop, W1-W8 time rules (`advanceClock`, `nightly`), selectors (`queries.ts`), React bindings (`client.tsx`: `useRepo()` -> `{ state, act, actor, user, session, setSession, mode, hydrated }`).
- `src/components/ui` (Button, Card, Badge, Input, Select, Textarea, Field, Tabs, Dialog, Switch, Tooltip, Progress, Table, Skeleton), `src/components/shell` (header with Explore menu, language switcher, honesty badges, Reset demo; footer with all public routes; AppShell with role sidebar, mobile bottom tabs, demo clock; `PageHeader`, `EmptyState`, `ErrorState`, `LoadingState`, `Hydrated`, `Stat`, `AiResult`, `PlannedCard`).
- `src/i18n`: `translate`, `useT()`; core en/bn/es in `core.ts`; feature modules register in `modules/index.ts`.
- Stubs for every app and public route.

How to use (for every builder):
```tsx
const { state, act, user } = useRepo();
const r = act(respondOffer, offerId, true); // runs as the current user, toasts the Result
```
Never mutate `state` directly. Add new commands in your own module as `(s: DemoState, actor: Actor, ...args) => Result` and run them through `act`.

Demo identities: `usr-maya` (sub-001), `usr-daniel` (tch-021, Cedar Hollow MS), `usr-grace` (school admin sch-3), `usr-jordan` (district admin).
Seeded scenarios: Maya has 2 pending offers (abs-0001 today Priya Natarajan Math, abs-0002 tomorrow) and one accepted job (abs-0010, Fri); a filled absence at sch-3 today with no check-in (no-show path); submitted timesheets at sch-3; Ethan Brooks (sub-007) has a background clearance in `needs_review`; expiring/expired credential alerts; a duplicate and a rate-mismatch timesheet for payroll.

## operations-builder - J3 school admin and J4 district admin (Phase 1)
Shipped (all client components, data only via useRepo/commands/queries, every number computed from the repository snapshot):
- J3 `/app/school` coverage board (today + 10 days; At risk / Offered / Filled / In progress / Completed with teacher, substitute, wave, offers; at-risk cards show an internal coverage plan built from free same-subject colleagues), approve "reported" absences (approveAbsence), "Mark no-show & re-dispatch" for today's accepted, not-checked-in assignments (markNoShow). `/timesheets` approve/return with note, bulk approve (skips flagged), pay lines + anomaly badges. `/substitutes` worked-here table, rating dialog per completed assignment (rateSubstitute), exclusion list. `/calendar` 2-week weekday grid. `/reports` fill rate, median TTF, continuity, recharts bars.
- J4 `/app/district` KPI Stats from kpis() with "Target: ..." from KPI_TARGETS, open alerts, today's coverage per school, guided tour + checklist (shown on ?tour=1 or session.tourDone.district_admin === false; items auto-tick from audit events credential.*, alert.resolved, payrun.exported, automation.*; others toggle session.checklist["district_admin.<key>"]). `/compliance` credential queue (Verify / Reject-with-required-reason), alerts table with rule id + RULES text and Resolve, T4 day limit, weekly hours, paused list. `/payroll` period picker (previous period default, current), draft -> anomalies -> human approve -> export CSV (exportPayRun then downloadFile(timesheetsToCsv) from fresh repo state), history. `/onboarding` 8 tabs incl. CSV import (sample prefilled, file upload .csv < 1 MB, mapCsvColumns -> mapping + validation report for missing emails, duplicates, unknown schools in AiResult), adapters labelled Sandboxed, pipeline kanban with advanceStage (activation errors list missing requirements via toast details). `/substitutes` searchable pool with pause/restore confirm dialog. `/analytics` 4 recharts (fill by school, TTF distribution, offers per sub + offerConcentration, credential status pie). `/settings` district policy + editable school notes (updateSchoolNotes).
- `/app/notifications` in-app for user.id + outbox table labelled "Nothing is sent in demo".
- Files: src/components/school/SchoolViews.tsx, src/components/district/{DistrictViews,Onboarding,MoreViews}.tsx, src/i18n/modules/operations.ts, route pages under src/app/app/school/**, src/app/app/district/** (not agents/automations), src/app/app/notifications/page.tsx.
Planned cards: Absence forecast (analytics).
Known gaps / requests for lead: only page titles, purposes and outbox label are in i18n (en + bn/es titles); inner labels are English inline - move to operations.* keys if time allows. The "Open an agent trace" and "Run the global audit" checklist items need the ai-engineer / audit pages to set session.checklist["district_admin.trace"] / ["district_admin.audit"] (otherwise user ticks them manually).
Verify: `npx eslint src/app/app/school src/app/app/district src/app/app/notifications src/components/school src/components/district` (clean); `npx tsc --noEmit` shows no errors in these paths (remaining errors are in src/components/ai/*). J3: /demo-admin? -> sign in as Grace, /app/school, approve a reported absence, mark no-show, /app/school/timesheets approve. J4: /app/district?tour=1, compliance verify/reject cred-sub-007-bg-new, payroll Nov 16-30 create -> approve -> export CSV.

## experience-builder - Phase 1 (substitute, teacher, apply)

Shipped (all client components, Hydrated, PageHeader with help, empty/error states, labelled controls, mobile-first):
- Substitute (J2): `/app/sub` home with stats, next assignment, quick actions and the guided tour + "Try these 5 tasks" checklist (shown on `?tour=1` or `session.tourDone.substitute === false`; items stored in `session.checklist["substitute.<task>"]`, marked on successful accept, brief open, check-in, day report; "Ask the Prep Coach" is marked when the user opens the coach link, because the coach route is owned by ai-engineer). `/jobs` offers with pay, distance, dates, bell and a "Why this match" panel (offer.reasons + score), Accept routes to `/app/sub/briefs?a=<assignmentId>`. `/schedule` check-in (only on the demo-clock date), cancel with reason, end-of-day report form (per period covered/partial/not covered + note, attendance, behavior facts, materials, message) -> timesheet amount card + link to earnings. `/briefs` list + detail inside AiResult, language switch regenerates via `generateBrief`, supports only via `viewSupports`. `/credentials` wallet (status, expiry, renew-soon badge, missing requirements) + uploader (pdf/png/jpg, 5 MB, type select) -> `extractCredential` in AiResult -> confirm -> `uploadCredential`. `/earnings` timesheets grouped by semi-monthly pay period with lines and totals. `/preferences` -> `updateSubstitute`.
- Teacher (J1): `/app/teacher` home (coverage of own absences, emergency plan count, latest handoff). `/report` say-or-type (Web Speech API mic when available, text otherwise) -> `intakeAbsence` -> editable confirmation in AiResult -> `reportAbsence` -> "matching started" + link; plus a "Quick form" tab. `/absences` list with status/substitute, cancel with reason, extend end date. `/plans` library, paste plan -> `saveLessonPlan` (one period per `teacher.classes`), emergency coverage meter (n of 3). `/preferences` routines, behavior plan, seating, preferred/do-not-send -> `updateTeacher`. `/handoffs` Return Handoffs in AiResult with continuity score.
- New substitute (J5): `/app/apply` 4-step wizard: application -> `createApplicant` -> `setSession({ role: "substitute", userId })` -> permit/background/health uploads (shared `CredentialUploader`) -> orientation checklist -> `completeOrientation` -> active status or the missing list. Copy states nothing is auto-rejected.
- Shared: `src/components/substitute/common.tsx` (`useSub`, `NotSubstitute`, `statusTone`, `money`), `src/components/teacher/common.tsx` (`useTeacher`, `NotTeacher`), i18n `experience.*` (en full, bn/es key labels).

Planned cards: none; every listed screen is live.

Notes for the lead:
- `generateBrief(s, assignmentId, lang)` has no actor parameter, so Briefs wraps it in a local command for `act`. Consider giving it the standard `(s, actor, ...)` shape.
- There is no `/demo-teacher` entry; `NotTeacher` offers a button that calls `setSession({ role: "teacher" })`.

How to verify: J2: `/demo-user` -> Job offers -> Accept the abs-0001 offer (today) -> lands on the brief -> Show supports -> My schedule -> Check in -> End-of-day report -> Submit -> timesheet card -> Earnings. J1: switch to teacher -> Report an absence -> type "I'm sick tomorrow, plan is in the folder" -> Structure -> Confirm -> My absences shows it matching. J5: Reset demo -> `/app/apply` -> fill the form -> upload three files (e.g. permit.pdf, background.pdf, health.pdf) -> tick the orientation checklist -> Complete -> Active. `npx tsc --noEmit` reports no errors in these paths (the only remaining errors are in `src/components/ai/AgentConsole.tsx`, which ai-engineer owns); eslint passes on the owned paths.

## Storyteller - Phase 1 (story pages, docs, translations)

Shipped:
- `src/components/story/`: `Mermaid.tsx` (client-only, dynamic `import("mermaid")` in useEffect, securityLevel strict, unique ids, source in `<details>` as a fallback), `Layout.tsx` (Section, Toc), `RoiCalculator.tsx`, `Deck.tsx` (Prev/Next buttons, arrow and PageUp/PageDown keys, slide chips, full-text outline), `readDoc.ts` (build-time fs read of `docs/*` via process.cwd()).
- `/architecture`: system, infrastructure, agents, integrations, data-flow, absence-to-filled sequence (follows `src/data/commands.ts`), state machine (follows `src/domain/absenceMachine.ts` TRANSITIONS), scalability notes, ADR-001..006.
- `/presentation`: problem, Relay Loop, personas, market (labelled estimates with assumptions), product tour, KPI targets, ROI calculator (illustrative, all assumptions visible).
- `/pitchdeck`: 12 slides; traction says "Pre-launch: no customers, no pilots, no revenue yet"; pricing and the ask are labelled hypothetical; no named competitors or people.
- `/docs`: J1-J5 role guides with exact URLs, admin guide, API reference (/api/health, /api/mcp tools/list and tools/call, /api/agents/*), agent cards A1-A11, runbook, link to ADRs, ASSUMPTIONS.md and BUILD_LOG.md rendered at build time (force-static).
- `/prompt`: MASTER_PROMPT.md verbatim, SHA-256 via node:crypto (currently d3af8336...6083255), tool, model, build timeline (force-static).
- `README.md`; `src/i18n/core.ts` bn/es now cover all 84 core keys; `src/i18n/modules/story.ts` adds story.* keys in en/bn/es.

Notes for the lead:
- The /api/mcp tools/call example uses a placeholder tool name ("<tool name from tools/list>") because the MCP route was not written yet when the docs were. Replace it with a real tool name once `src/app/api/mcp/route.ts` lands.
- The agent-card confidence thresholds for A2, A6 and A9 (0.70, 0.70, 0.90) are documented design values; A3's 0.85 matches `uploadCredential`. Align them with `src/ai` charters when those land.

Verify: `npx tsc --noEmit` (clean at 15:31), `npx eslint src/app/{presentation,pitchdeck,architecture,docs,prompt} src/components/story src/i18n` (clean). Open each page on a phone-width viewport; Mermaid renders client-side with the source as a fallback.

## AI engineer - Phase 1 (src/ai, src/automation, src/app/api, src/components/ai)

Shipped:
- `src/ai/provider.ts` (server-only): Provider { complete, vision, embed }, `routingTable()` from AI_MODEL_FAST/REASONING/VISION/EMBED/FALLBACK, Anthropic implementation via dynamic `@anthropic-ai/sdk` import when ANTHROPIC_API_KEY is set (falls back to AI_MODEL_FALLBACK on error), else SampleProvider. `src/ai/limits.ts` rate limit (AI_RATE_LIMIT_PER_MIN) + daily spend cap (AI_SPEND_CAP_USD).
- `src/ai/agents/registry.ts`: A1-A11 (`AGENTS`, `AGENT_BY_ID`, `AGENT_CARDS`, `OutputSchemas`, `planRelay`) with inline charter prompts, zod schemas, tools, autonomy, threshold, HITL gate, sub-agents, model route. `src/ai/orchestrator.ts`: `relayTrace(state, absenceId)` stages absence -> timesheet + related agent runs.
- `src/ai/guardian.ts`: redactPII, detectInjection, asData, blockUnsafe, confidenceGate, runWithGuardian (schema retry once -> needs_review).
- `src/ai/retrieval.ts` (BM25, min score + relative cutoff, NO_SOURCE), `src/ai/graph.ts` (buildGraph, explainEligibility), `src/ai/prepCoach.ts` (coachAnswer: citations, refusal citing kb-student-1).
- `src/automation/dryRun.ts`: non-mutating W1-W8 dry run.
- API: `/api/mcp` (GET info+tools; POST JSON-RPC initialize, tools/list, tools/call for check_eligibility, rank_candidates, compute_pay, search_knowledge, get_rule; zod-validated; seeded snapshot), `/api/health`, `/api/agents/prep-coach` (live path under Guardian + rate limit + spend cap; sample fallback).
- UI: `src/components/ai/{AgentConsole,AutomationStudio,MemoryCenter,KnowledgeExplorer,PrepCoach}.tsx`, barrel `src/components/ai/index.ts`. Pages `/app/sub/coach`, `/app/district/agents`, `/app/district/automations`. i18n `ai.*` keys in en/bn/es.
- Evals: `src/ai/evals/cases.ts` 60 golden cases (5-7 per agent), `npm run evals` -> `src/ai/evals/results.json` (100% at 15:31), exits 1 below 90%; already wired in .github/workflows/ci.yml. `evalSummary()` in `src/ai/evals/summary.ts` for /audit.

Notes for the lead:
- Embed in /admin: `import { AgentConsole, AutomationStudio, MemoryCenter, KnowledgeExplorer } from "@/components/ai"` (each expects to be inside `<Hydrated>`).
- Docs MCP example can use `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"compute_pay","arguments":{"tier":"T2","dayPart":"full","dayNumber":11,"hardToFill":true}}}` -> amount 225.
- Threshold alignment: A2 intake is 0.75 in the registry (storyteller docs say 0.70); A6 0.70, A9 0.90, A3 0.85 match. Use `AGENT_CARDS` as the source of truth.
- `recordAgentRun` and `nightly` have no actor parameter, so the UI calls them via `repo.run((d) => ...)` rather than `act`.
- Live Prep Coach is used only when NEXT_PUBLIC_AI_LIVE=true; ANTHROPIC_API_KEY is read only in server files (provider.ts, api routes).

Verify: `npx tsc --noEmit` and `npx eslint src/ai src/automation src/app/api src/components/ai src/app/app/sub/coach src/app/app/district/agents src/app/app/district/automations` are clean; `npm run evals` prints 60/60. Manual: `/demo-user` -> /app/sub/coach -> ask "What do I do in a fire drill?" (cites kb-hb-3) and "What is this student's diagnosis?" (refusal citing kb-student-1); `/demo-admin` -> /app/district/agents shows the run, Trace and Replay; /app/district/automations -> Dry run, +10 min, Run nightly; `curl /api/mcp`.

## governance-writer - Phase 1 (/admin, /data, /security, /audit, supabase)

Shipped:
- `supabase/migrations/0001_core.sql`: all section 8 tables + `demo_snapshot`; every table has district_id, RLS enabled and policies in the same file (claims via `auth.jwt()`: district_id, app_role, school_id, teacher_id, substitute_id). Constraints: `assignment_no_overlap` (gist exclusion on substitute_id + slot), `credential_expiry_after_issue`, unique partial index `offer_one_accepted_per_absence`. `audit_event` is append-only (update/delete/truncate revoked, blocking trigger) and its hash is computed by trigger = sha256(prev_hash || payload). `kb_chunk.embedding vector(1024)` with HNSW index. `supabase/seed.sql`: synthetic district, 6 schools, 2 subs, credentials, pay rules, one audit event.
- `src/governance/`: `dictionary.ts` (29 tables, every field with PII class + retention; `dictionaryMarkdown()` generated `docs/DATA_DICTIONARY.md`), `lineage.ts`, `rbac.ts` (matrix from requireRole calls in src/data/commands.ts), `auditEngine.ts` (`runAudit(state, env)` -> 8 domains, 38 controls, scores, risk register, remediation).
- `src/components/governance/`: `Mermaid.tsx` (client-only dynamic import), `AuditClient`, `DataClient`, `SecurityClient` (exports `RbacMatrix`), `AdminClient`, `common.tsx` (Evidence, StatusBadge, Section).
- Pages: /audit (Run global audit with progress, domain results with evidence, risk register, remediation, JSON export, PDF via print, AI eval note + agent-run counts, audit-log explorer with chain badge + filters, self-assessment), /data, /security (live header check via HEAD fetch, chain, kill switch, AI mode), /admin (tabs incl. model routing session-only edits).

Still Planned / for the lead:
- Admin tabs Automation Studio, Agent Console, Memory Center, Knowledge base are description + link cards; embed ai-engineer components there (src/components/governance/AdminClient.tsx, `LINKED`).
- Visible strings on these pages are English literals, not yet in `src/i18n/modules/governance.ts` (time box).
- Public requirements fetcher shown as "Planned (seeded chunks today)" on /data.
- Evidence links to repo files render as code paths; point them at the GitHub repo URL once it exists (`Evidence` in common.tsx).

Verify: `npx tsc --noEmit`; `npx eslint src/app/admin src/app/data src/app/security src/app/audit src/governance src/components/governance`; open /audit and press "Run global audit". On the seed, the engine returns overall 91, 31 pass / 7 warn / 0 fail (SEC-1 becomes pass in the browser once headers are read).
