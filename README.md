# ClassRelay

**Every class covered. Every lesson continued.**

ClassRelay is an AI-native platform for the substitute-teacher workforce. It fills each teacher absence with a verified, compliant, well-matched substitute and passes the class on like a relay baton: an AI-built **Sub Brief** before class and an AI-written **Return Handoff** to the teacher afterwards, followed by a timesheet ready for payroll.

> Honesty statement: this is a demo built on **synthetic data** for the fictional Riverbend Unified School District. There are no real people, schools or student records. ClassRelay is pre-launch, with **no customers, pilots or revenue**. Without an API key, AI features return recorded outputs labelled **Sample mode**. KPIs are labelled **targets**, and market figures are labelled **estimates**.

## Live demo

Production: https://class-relay-henna.vercel.app (no login needed; each visitor gets an isolated sandbox with "Reset demo")

| Route | What you get |
|---|---|
| [/](https://class-relay-henna.vercel.app/) | Landing page and Judge Hub |
| [/demo-user](https://class-relay-henna.vercel.app/demo-user) | One click in as substitute Maya Rahman, with a tour and 5 tasks |
| [/demo-admin](https://class-relay-henna.vercel.app/demo-admin) | One click in as district admin Jordan Lee, with a tour and 5 tasks |
| [/app](https://class-relay-henna.vercel.app/app) | The app: pick any of the four roles |
| [/admin](https://class-relay-henna.vercel.app/admin) | RBAC, rule packs, Automation Studio, Agent Console, Memory Center |
| [/data](https://class-relay-henna.vercel.app/data) | Data sources, API catalog, ER diagram, data dictionary, lineage |
| [/security](https://class-relay-henna.vercel.app/security) | RBAC + RLS, privacy, responsible AI, threat model |
| [/architecture](https://class-relay-henna.vercel.app/architecture) | Mermaid system, agent, data-flow and sequence diagrams, plus ADRs |
| [/presentation](https://class-relay-henna.vercel.app/presentation) | Problem, solution, users, market, tour, targets, ROI calculator |
| [/pitchdeck](https://class-relay-henna.vercel.app/pitchdeck) | YC-style deck with honest traction |
| [/audit](https://class-relay-henna.vercel.app/audit) | One-click global audit |
| [/docs](https://class-relay-henna.vercel.app/docs) | Role guides (J1-J5), API, agent cards, runbook, assumptions, build log |
| [/prompt](https://class-relay-henna.vercel.app/prompt) | The Master Prompt verbatim with its SHA-256 |

Repository: https://github.com/mkhjmmn/class-relay

## Quick start

```bash
npm ci --legacy-peer-deps
npm run dev        # http://localhost:3000
```

No env vars are needed. The app starts in Sandbox data mode and Sample AI mode.

## Modes

| Mode | When | How to switch |
|---|---|---|
| **Data mode: Sandbox** | No Supabase env vars | Seeded, deterministic world in your browser's localStorage. |
| **Data mode: Supabase** | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set | Apply `supabase/migrations` (tables, RLS by `district_id`, pgvector) and `supabase/seed.sql`. |
| **Sample mode** (AI) | No `ANTHROPIC_API_KEY` | Agents return recorded sample outputs, labelled in the UI. |
| **Live AI** | `ANTHROPIC_API_KEY` + `NEXT_PUBLIC_AI_LIVE=true` | Models come from the `AI_MODEL_*` routing table in env. |

Every variable is documented in `.env.example`. Secrets stay on the server.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (rules engine, state machine, pay, audit chain) |
| `npm run evals` | Agent eval sets |
| `npm run test:e2e` | Playwright route smoke test (`tests/routes.spec.ts`) |
| `npm run gates` | Typecheck, lint, tests, evals and build in one command |

## Architecture in one paragraph

Next.js App Router (TypeScript strict, Tailwind) renders every page. UI code talks only to a typed **Repository interface**, which runs either on the **sandbox driver** (localStorage) or on the **Supabase driver** (Postgres + RLS + pgvector). Domain commands in `src/data/commands.ts` implement the Relay Loop: `reportAbsence` → W1 → `startMatching` → `sendNextWave` → `respondOffer` (with a compliance check for each day) → `generateBrief` (W3) → `checkIn` → `submitDayReport` → timesheet + Return Handoff (W5). Eligibility rules R1-R8, pay rules and the absence state machine are **pure functions** in `src/domain` with unit tests. AI goes through one provider interface (`complete`, `vision`, `embed`). Eleven agents (A1 Relay Orchestrator supervising A2-A10) are wrapped by the **A11 Guardian**, and every run is recorded as an `agent_run`. Audit events are append-only and **SHA-256 hash-chained**. Diagrams are on [/architecture](https://class-relay-henna.vercel.app/architecture).

## How it was built

From one Master Prompt (`docs/MASTER_PROMPT.md`, published with its SHA-256 on `/prompt`), using Claude Code (VS Code extension) with Claude Opus 5.5. Assumptions are in `docs/ASSUMPTIONS.md` and the timeline is in `docs/BUILD_LOG.md`.
