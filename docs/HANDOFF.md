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
