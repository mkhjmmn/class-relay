MASTER PROMPT - ClassRelay
Challenge: AI Substitute Teacher Workforce & Scheduling Platform. Builder: Claude Code.

## 0. MISSION AND OPERATING RULES
You are principal engineer, product designer and AI architect. From this ONE prompt, build, test and publicly deploy ClassRelay, a complete, enterprise-grade, AI-native application ecosystem, in one pass. I only click approve / continue / yes / run / build / deploy, so:
- Never ask me anything. Decide, and log assumptions in docs/ASSUMPTIONS.md.
- In plan mode, return a plan that follows section 14, then execute it all after one approval.
- First: save this prompt verbatim to docs/MASTER_PROMPT.md; load CLAUDE.md, .claude/agents/* and docs/knowledge-base.md as standing memory (create them from this prompt if missing).
- Time box 60 minutes. Route-complete first, depth second: deploy a skeleton with every public route by minute 15, redeploy as modules land, freeze features at minute 46.
- P0, must be flawless: the Relay Loop (absence -> verified match -> Sub Brief -> handoff -> timesheet) and every section 9 route. P1: credentials, compliance, payroll, onboarding. P2: forecasts, what-if analysis, graph explorer, voice. Cut P2 first, never P0: one flawless core beats many half-built features.
- Never block: if a key, service or login is missing, use the section 13 fallback, label it in the UI and report it.
- Honesty: synthetic data only; no fabricated metrics, customers or AI results; label every sample or offline AI output.

## 1. PRODUCT OVERVIEW: VISION AND PROBLEM
ClassRelay - "Every class covered. Every lesson continued."
Problem: when a teacher is absent, schools scramble with phone trees and spreadsheets. Absences go unfilled, credentials lapse unnoticed, substitutes arrive unprepared, payroll is manual and districts carry compliance risk. Substitutes face slow onboarding, opaque access to work and late pay.
Solution: an agentic workforce platform that fills each absence in minutes with a verified, compliant, well-matched substitute and passes the class like a relay baton: an AI-built Sub Brief before class, an AI-written Return Handoff to the teacher after.
Why AI: matching under legal constraints, reading credential documents, turning lesson plans into briefs and continuous compliance are reasoning tasks, not CRUD.
KPIs on dashboards (labelled as targets): fill rate >= 95%; median time-to-fill < 10 min; 100% credential-compliant assignments; timesheet-to-payroll < 24 h; lesson continuity score.

## 2. TARGET USERS, PERSONAS AND ROLES
- Substitute teacher (demo user: Maya Rahman): finds work, proves credentials, prepares, teaches, gets paid.
- Classroom teacher (Daniel Ortiz): reports absences, shares plans and preferences, receives the handoff.
- School admin (Grace Kim): coverage board, approvals, feedback.
- District admin (demo admin: Jordan Lee, HR and payroll): onboarding, credential policy, compliance, payroll, analytics, AI governance.
Tenant = district; every record carries district_id; role separation gates every page and API.

## 3. CORE FEATURES AND FUNCTIONS (each works end to end on seeded data)
F1 Marketplace and matching: personalized open-jobs feed per substitute. Hard filters (valid credential for subject, grade and date; background clearance; day-limit and hour-cap rules; exclusion list; availability; distance), then a weighted score (teacher's preferred list, school ratings, subject fit, reliability, commute, fairness of opportunity, multi-day continuity). Offers go in waves (preferred -> proven at this school -> qualified pool).
F2 Credential verification: substitutes upload permit or license, background and health clearances and training certificates. A vision agent extracts type, number, issuer, dates and name match, checks the district rule pack and sets verified / needs review / expired / missing with confidence. Nothing is auto-rejected: negative outcomes go to an HR review queue.
F3 Scheduling: a teacher reports an absence in three taps or by voice or text; AI structures dates, periods, reason, classes and plan. Multi-day and half-day; calendars per role; conflict detection. Day-of: check-in, no-show detection, re-dispatch, cancellation and reassignment with reasons.
F4 District onboarding: wizard for schools, bell schedules, pay rules, credential rule pack, absence reasons and approval chain. CSV or OneRoster staff import with AI column mapping and validation report. SSO, SIS, HRIS and payroll adapters (sandboxed, labelled). Substitute pipeline (applied -> documents -> verification -> orientation -> active) as kanban.
F5 Payroll tracking: check-out creates a timesheet. Pay rules: daily and half-day rates by credential tier, long-term rate after day N, hard-to-fill bonus, late-cancel pay. School admin approves. Anomaly flags: duplicates, overlaps, rate mismatches, hour-cap breaches. Pay-period run by school and budget code; CSV export.
F6 Classroom preferences: teacher (routines, seating chart, behavior plan, preferred and do-not-send substitutes); substitute (grades, subjects, schools, days, distance, language); school (arrival and duty notes). All editable and feeding the personalization engine behind matching, notifications and briefs.
F7 Lesson continuity: plan library per class (upload, paste, or photo of a handwritten plan parsed by vision); emergency three-day plans with coverage meter; end-of-day report; the Return Handoff tells the teacher what was taught, gaps and next steps; multi-day assignments carry forward.
F8 Compliance monitoring: live dashboard of expiring and expired credentials, missing training, day-limit and hour-cap proximity and unverified assignments. Ineligible matches are blocked with rule id and explanation. Task queue; audit-ready reports; policy what-if analysis.
F9 AI-assisted classroom preparation: on acceptance, a Sub Brief: day at a glance; per-period plan summary with objectives, materials, timing and differentiation tips; routines; need-to-know student supports (privacy-filtered, admin-approved); emergency procedures. Backup activity generator when no plan exists. Prep Coach chat grounded in handbook and plan, with citations. In the substitute's language.
Also: notification center with an SMS, email and WhatsApp outbox preview (nothing is sent in demo); two-way ratings.

## 4. USER JOURNEYS (golden paths; all must pass)
J1 Teacher, 05:40: voice absence -> AI structures it -> confirm -> matching starts.
J2 Substitute: offer (pay, distance, why-matched) -> accept -> Sub Brief -> Prep Coach -> check-in -> day report -> timesheet -> earnings.
J3 School admin: coverage board -> no-show re-dispatch -> approve timesheets -> rate the substitute.
J4 District admin: flagged credential -> compliance alert -> payroll export -> automation edit -> agent trace -> audit.
J5 New substitute: apply -> upload credential -> AI verification -> orientation -> active.

## 5. AI-NATIVE ARCHITECTURE: AGENTS AND SUB-AGENTS
Pattern: event-driven supervisor. The Relay Orchestrator takes domain events, plans, delegates to specialists through a typed tool registry (also an MCP server at /api/mcp), passes every step through the Guardian and writes an agent trace. Each agent has a charter, tools, typed output, autonomy level (suggest / act with review / act), confidence threshold, human-in-the-loop gate and eval set.
A1 Relay Orchestrator (supervisor): owns the absence state machine reported -> approved -> matching -> offered -> filled -> in progress -> completed -> paid; routes, retries, escalates.
A2 Intake and Onboarding: turns voice, text and CSV into structured records; guides district and substitute onboarding.
A3 Credential Verifier (vision; sub-agents Extractor, Validator): reads documents, checks the rule pack, flags tampering; negative decisions go to human review.
A4 Matchmaker (sub-agents Constraint Checker, Scorer, Explainer): eligibility by knowledge-graph traversal, then scoring; ranked list with weights and plain-language reasons; fairness check.
A5 Dispatcher: offer waves, reminders, no-show re-dispatch, internal coverage fallback.
A6 Lesson Continuity (sub-agents Plan Parser, Brief Writer, Translator): Sub Briefs, backup activities, Return Handoffs, citing the source plan.
A7 Prep Coach: RAG chat with citations; refuses student data beyond need-to-know.
A8 Compliance Sentinel: scheduled and event checks, blocks, tasks, reports; cites rule id and source.
A9 Payroll: pay lines, anomaly flags, draft pay run; never finalizes without human approval.
A10 Insights: forecasts absences and fill risk.
A11 Guardian (wraps all agents): PII redaction, prompt-injection and unsafe-content checks, policy enforcement, confidence gating, bias monitor, audit logging.
Model routing (env-driven, editable in /admin): fast model for extraction, strongest for reasoning and writing, vision for documents, embeddings for retrieval; fallbacks; cost budget per agent. Context pack = role prompt + tools + cited retrieval + scoped memory + tenant policy.
Agent Console: traces (input, context, tool calls, output, confidence, cost), replay, autonomy sliders, kill switch. Evals: 5+ golden cases per agent in CI; pass rates on /audit.

## 6. MEMORY AND KNOWLEDGE BASE
Memory is typed, tenant-scoped and user-visible in a Memory Center (view, edit, delete, export; retention per type):
- Working: per conversation or task; expires on completion.
- Episodic: per substitute, teacher and school (history, feedback, routines, incidents).
- Semantic: district policies, rule packs, pay rules, glossary.
- Procedural: playbooks agents propose and admins approve.
Each write stores source, time, confidence and consent basis. Student-sensitive data never enters long-term memory.
Knowledge base = hybrid RAG + knowledge graph:
- Vector store (pgvector): chunks of handbook, procedures, lesson plans, rule packs and FAQs with source, version and effective date. Answers must cite chunks; stale sources raise alerts.
- Knowledge graph (kg_node, kg_edge) linking substitutes, credentials, subjects, grades, schools, teachers and rules (HOLDS, QUALIFIES_FOR, PREFERS, EXCLUDED_FROM, APPLIES_TO); drives eligibility traversal and "why" explanations.
- Ingestion: file parser (PDF, image, DOCX, CSV), OneRoster or CSV import, and a compliant fetcher for official public requirement pages (robots.txt respected, source URL and date stored, no personal data). Seed from docs/knowledge-base.md.

## 7. WORKFLOW AUTOMATION
Automation Studio: rules as trigger -> conditions -> actions with toggle, dry run and run history. Ship enabled:
W1 absence.reported -> validate -> approve if required -> match.
W2 offer unanswered 10 min -> next wave; unfilled at T-60 min -> escalate with internal coverage plan.
W3 assignment.accepted -> Sub Brief -> notify all -> calendar.
W4 no check-in at bell minus 20 min -> no-show protocol -> re-dispatch.
W5 assignment.completed -> day report -> timesheet -> Return Handoff.
W6 credential expiry at 60/30/7 days -> remind; expired -> pause matching; re-verified -> restore.
W7 pay period close -> anomaly scan -> approvals -> export.
W8 nightly -> compliance sweep, forecast, knowledge freshness, weekly digest.
Engine: event bus + durable job queue with cron. The demo runs it in-app with an event timeline and a "demo clock" so a judge can trigger every rule.

## 8. DATA MODEL AND BACKEND RULES
Multi-tenant Postgres (Supabase), Row-Level Security on every table by district_id and role; pgvector; storage with signed URLs.
Core tables: district, school, user, role, teacher, substitute, credential, credential_rule, availability, preference, absence, assignment, offer, lesson_plan, sub_brief, day_report, handoff, timesheet, pay_rule, pay_run, compliance_check, agent_run, memory, kb_chunk, kg_node, kg_edge, consent, audit_event (append-only, hash-chained).
Relationships: district 1-n school; school 1-n teacher and absence; absence 1-n assignment (one per day); assignment 1-n offer and 1-1 sub_brief, day_report and timesheet; substitute 1-n credential; pay_run 1-n timesheet.
Validation rules: no overlapping assignments per substitute; an assignment needs a passing compliance_check; first accepted offer wins; credential expiry after issue date; timesheet units within the bell schedule; state changes follow the state machine.
Access boundaries: substitutes see their own records and assignment briefs; teachers their classes; school admins their school; district admins their district.
Edge cases to handle and test: two substitutes accept at once; late cancellation by either side; no-show; teacher cancels or extends an absence; half-day and split-period coverage; credential expiring mid-assignment; cap reached mid-week; duplicate absence reports; low-confidence or failed AI extraction; preferred and exclusion lists in conflict.
Deliver migrations, RLS policies, seed script, typed repository, ER diagram, data dictionary (PII class, retention).
Seed (deterministic, synthetic, labelled): fictional Riverbend Unified School District; 6 schools; 60 teachers; 120 substitutes with valid, expiring, expired and pending credentials; 30 days of history; 12 upcoming absences (filled, unfilled, at-risk); pending timesheets; compliance alerts; lesson plans; handbook; rule pack.

## 9. GOVERNANCE: PUBLIC JUDGE ROUTES AND DEMO ACCESS (NO LOGIN WALLS)
PUBLIC_DEMO is on by default: every route below returns 200 to an anonymous visitor. Each visitor gets an isolated sandbox with "Reset demo". "/" is a landing page with a Judge Hub linking every route.
/app - main application: role picker for anonymous visitors, then the role home.
/demo-user - one click: enter as substitute Maya Rahman, with a guided tour and a "Try these 5 tasks" checklist.
/demo-admin - one click: enter as district admin Jordan Lee, with the same tour and checklist.
/admin - admin panel: users and roles (RBAC matrix), schools, pay rules, rule packs, Automation Studio, Agent Console and AI controls, Memory Center, knowledge base, integrations, system health.
/data - data sources, API catalog (OpenAPI, MCP tools), ingestion pipelines, ER diagram, data dictionary, lineage (source -> transform -> table -> consumer), knowledge base and graph explorer, retention.
/security - authentication (SSO, MFA, passwordless), authorization (RBAC + RLS), encryption, privacy, compliance matrix, data sovereignty, responsible-AI controls, threat model, incident response, live control status.
/architecture - Mermaid system diagram plus infrastructure, AI and agent, integration and data-flow views, an "absence to filled" sequence, scalability, decision records.
/presentation - problem, solution, users, market, product tour, impact KPIs, ROI calculator.
/pitchdeck - Y Combinator-style deck: problem, solution, market, product, traction (honest), business model (per-student SaaS plus per-filled-day fee), growth, investment ask; estimates labelled.
/audit - one-click global audit (section 11).
/docs - built-in documentation: role guides, admin guide, API reference, agent cards, runbook, decision records, assumptions, build log.
/prompt - this prompt verbatim with its SHA-256, tool, model and build timeline: proof of one-prompt compliance.

## 10. SECURITY, RESPONSIBLE AI AND DATA SOVEREIGNTY
Security: role separation with server-side RBAC plus RLS; secrets only in server env; input validation on every form and API; security headers; rate limits and spend caps on AI endpoints; dependency and secret scanning in CI; an append-only hash-chained audit log of sensitive actions and AI decisions.
Privacy and compliance: FERPA, COPPA, state student-privacy laws, SOC 2, WCAG 2.2 AA. Substitutes see only need-to-know student supports, approved by the school admin, from 12 h before until the assignment ends, every view logged. Consent records; export and deletion workflows.
Responsible AI: humans approve every adverse or financial action (credential rejection, removal from the pool, payroll finalization, policy change). Every AI output shows reasons, sources and confidence with "Request human review". Matching never uses protected attributes; a fairness monitor and bias tests watch offer distribution. AI content labelled; no AI decisions about students.
Data sovereignty: the district owns its data. Tenant-level region pinning and residency (US default, others configurable); no customer data used for model training; bring-your-own-key per tenant; full export in open formats; verified deletion.

## 11. AUDIT REPORTING
/audit "Run global audit" runs automated checks on the live configuration and data in 8 domains: security, privacy, compliance, governance, responsible AI, data sovereignty, operational readiness, risk. Output: score per domain; pass / warn / fail per control with evidence link; risk register; remediation plan; AI eval results; PDF and JSON export. Plus an audit-log explorer and a self-assessment on prompt quality, usability, documentation and governance.

## 12. UI, NAVIGATION AND RESPONSIVE LAYOUT
Visual style: calm, trustworthy education brand; deep blue and teal with a warm accent; rounded cards.
Navigation: role-based sidebar on desktop, bottom tab bar on mobile, and an Explore menu plus footer linking every public route from every page.
Page map. Substitute: Home, Jobs, Schedule, Briefs, Credentials, Earnings, Preferences, Coach. Teacher: Home, Report absence, Absences, Lesson plans, Preferences, Handoffs. School admin: Coverage board, Calendar, Timesheets, Substitutes, Reports. District admin: Command center, Onboarding, Substitutes, Compliance, Payroll, Analytics, Automations, AI agents, Settings.
Every screen: one-line purpose, primary action, empty, loading and error states, tooltips, sample data and a help panel. Zero dead buttons or broken routes. WCAG 2.2 AA.
Localization: English, Bangla and Spanish UI via i18n dictionaries and a header language switcher; briefs and notifications in the reader's language; low-bandwidth mode.

## 13. TECH STACK, DEPLOYMENT AND SCALABILITY
App: Next.js (App Router), TypeScript strict, Tailwind, shadcn/ui, zod, Mermaid.
Data: Supabase Postgres + RLS + pgvector + Storage behind a typed repository interface. Fallback: without Supabase env vars the same interface runs on a seeded in-browser sandbox (UI shows "Data mode: Sandbox"); migrations and RLS still ship and show on /data.
AI: Anthropic Claude API via server routes with tool use, vision and structured output. Fallback: without an API key agents return recorded sample outputs labelled "Sample mode".
Deploy: public GitHub repo (gh); GitHub Actions CI (typecheck, lint, build, evals, Playwright route smoke test); Vercel production (vercel --prod); verify every public URL anonymously.
Scalability: stateless serverless app, RLS tenant isolation, queued automations, read replicas, per-tenant cost limits, observability, region packs for other markets (UK supply, Australia relief teachers).

## 14. EXECUTION CONSTRAINTS: BUILD PLAN AND QUALITY GATES
Phase 0 (min 0-12), lead: scaffold, design system, domain types, seed, repository, app shell, stubs for ALL routes, CI, first deploy.
Phase 1 (12-38), parallel sub-agents with exclusive file ownership: experience-builder (substitute, teacher), operations-builder (school, district), ai-engineer (intelligence layer), governance-writer (/admin, /data, /security, /audit), storyteller (story pages, docs, translations).
Phase 2 (38-46): integrate, run J1-J5, fix.
Phase 3 (46-60), qa-release: gates, deploy, verify, final report.
Quality gates, all must pass: typecheck, lint and build clean; every public route 200 anonymously; J1-J5 pass; no console errors or dead links; accessibility check; no secrets in the repo; honesty labels present.
Final message: public URLs, repo URL, live versus sample, assumptions, known gaps.
