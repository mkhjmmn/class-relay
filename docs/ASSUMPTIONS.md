# Assumptions and decisions

Every default chosen without asking. Format: decision, reason, how to change it.

| # | Decision | Reason | How to change |
|---|----------|--------|---------------|
| A1 | Data runs on the seeded in-browser **Sandbox** driver (localStorage, one per visitor) | No Supabase keys in the build environment (section 13 fallback). Gives each judge an isolated sandbox with "Reset demo". | Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; apply `supabase/migrations`. The UI badge switches to "Data mode: Supabase". |
| A2 | AI runs in **Sample mode** (deterministic recorded outputs, labelled) | No `ANTHROPIC_API_KEY` assumed. Section 13 fallback. | Set `ANTHROPIC_API_KEY` and `NEXT_PUBLIC_AI_LIVE=true` on the server. Model routing is in `AI_MODEL_*` env vars. |
| A3 | Demo world anchored to **Tue 2026-12-01 05:40** (demo clock) | Deterministic seed renders identically on server and client; matches the J1 "05:40" story. | `DEMO_TODAY` in `src/domain/dates.ts`. |
| A4 | Seed uses mulberry32 with seed 42 | Deterministic synthetic world on every machine. | `buildSeed()` in `src/data/seed/index.ts`. |
| A5 | Times are shown in the school's wall-clock time (stored as UTC strings without offset conversion) | Avoids timezone drift in a single-district demo. | Add tz-aware formatting with `district.timezone`. |
| A6 | Offers are for the whole absence; acceptance creates one assignment per school day and re-checks eligibility for each day | Multi-day continuity (F7) and the "assignment needs a passing compliance_check" rule. | `respondOffer` in `src/data/commands.ts`. |
| A7 | Later offer waves widen the pool; earlier offers stay open until the first acceptance | Keeps preferred substitutes able to accept; first accepted offer wins. | `sendNextWave` in `src/data/commands.ts`. |
| A8 | District approval is not required for absences by default | Most districts auto-approve; W1 still has the approval branch. | `district.approvalRequired` in the seed or /app/district/settings. |
| A9 | Credential auto-verification only at confidence >= 0.85 with an exact name match; everything else goes to the HR queue | "Nothing is auto-rejected" (F2) and human approval of adverse actions. | `uploadCredential` threshold. |
| A10 | Demo authentication = role picker + `cr_role` cookie; SSO/MFA/passwordless documented as adapters | PUBLIC_DEMO: no login walls for judges. | Wire Supabase Auth; server routes already read the role from the session. |
| A11 | Retrieval in sandbox uses lexical (BM25-style) scoring over knowledge chunks; pgvector schema ships in migrations | No embedding key; answers still cite chunks. | Set an embeddings model in `AI_MODEL_EMBED` with Supabase configured. |
| A12 | Audit PDF export uses the browser print dialog with a print stylesheet; JSON export is a file download | No server PDF dependency needed. | Swap in a server renderer if required. |
| A13 | Voice intake uses the Web Speech API when the browser supports it, with a typed fallback | No external speech service needed. | Replace with a server STT provider. |
| A14 | Scaffolded with create-next-app (Next.js 16) and hand-written shadcn-style components on Radix primitives instead of the shadcn CLI | Saves time and avoids interactive prompts; same API shape. | `src/components/ui/index.tsx`. |
| A15 | Times shown on dashboards for KPIs are computed from repository data; targets are labelled "Target" | Honesty rule: no invented metrics. | `src/data/queries.ts`. |

- experience-builder: pay periods on the earnings screen are semi-monthly (1st-15th, 16th-end). Reason: there is no pay-period field on Timesheet. Change it in src/components/substitute/Earnings.tsx (period()).
- experience-builder: the Prep Coach checklist task is marked when the substitute opens the coach link, because the coach route belongs to ai-engineer. Change it by calling setSession on the first coach answer.
| S1 | Market figures on /presentation and /pitchdeck are order-of-magnitude **estimates** (~13,000 US districts, ~49M public-school students, NCES order of magnitude); the TAM uses a hypothetical $10-$20 per student per year | No market research was run during the build; the honesty rule requires labels and stated assumptions. | Edit `src/app/presentation/page.tsx` and `src/app/pitchdeck/page.tsx`. |
| S2 | The ROI calculator assumes 180 school days, 5 admin minutes per fill with ClassRelay, a 5% residual unfilled rate and 45 minutes saved per avoided unfilled absence, all labelled "illustrative estimate" | These are design targets, not measurements; every one is visible next to the result. | Constants at the top of `src/components/story/RoiCalculator.tsx`. |

- AI (ai-engineer): retrieval is lexical BM25 in both modes (AI_MODEL_EMBED=local-bm25); pgvector embeddings are a later swap behind `Provider.embed`. Reason: no embedding route without extra keys. Change: implement embed in provider.ts and score with cosine in retrieval.ts.
- AI (ai-engineer): rate limit and spend cap are in-memory per server instance. Reason: no shared store in sandbox mode. Change: back `src/ai/limits.ts` with Supabase or Redis.

- Governance (governance-writer): RLS reads role scopes from custom JWT claims (district_id, app_role, school_id, teacher_id, substitute_id) set by an auth hook. Reason: one isolation key for every policy. Change: edit the app_* helper functions at the top of supabase/migrations/0001_core.sql.
- Governance: the DB audit hash is sha256(prev_hash || payload::text) per district, as specified; the in-browser chain (src/domain/audit.ts) hashes a canonical body. Both are verifiable; they are not byte-identical. Change: align the trigger to the canonical JSON if cross-verification is needed.
- Governance: self-assessment scores on /audit are fixed, human-written and labelled as not computed.
