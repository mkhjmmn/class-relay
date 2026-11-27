# Build log

Tool: Claude Code (VS Code extension). Model: Claude Opus 5.5 (`claude-opus-5-5`). One Master Prompt, plan approved once.

| Time (BST, 2026-11-27) | Phase | What shipped | What failed / fallback |
|---|---|---|---|
| 14:44 | Plan | Environment checked (Node 26, gh + vercel logged in). Plan per section 14 approved. | No Supabase or Anthropic keys: Sandbox + Sample mode fallbacks chosen. |
| 14:47 | Phase 0 | Master Prompt saved verbatim to docs/MASTER_PROMPT.md. create-next-app (Next.js 16.4) scaffold. | First scaffold name rejected by npm naming rules; re-ran. Copying node_modules via tar was too slow; switched to a directory move. |
| 14:50-15:10 | Phase 0 | Domain layer (zod schemas, state machine, rules R1-R8, pay, matching, hash chain), deterministic seed, repository + sandbox/supabase drivers, Relay Loop commands, UI kit, shell, i18n, stubs for every route. | vitest 5 incompatible with installed vite: pinned vitest 3 (second attempt fixed it). |
| 15:17 | Phase 0 | Typecheck clean, `next build` green, 19/19 unit tests green. Public repo github.com/mkhjmmn/class-relay pushed. | Seed latency used Date.now(): fixed for determinism. |
| 15:20 | Deploy 1 | Production: https://class-relay-henna.vercel.app | - |

## Anonymous route check - deploy 1 (15:21)

| Route | Status |
|---|---|
| / | 200 |
| /app | 200 |
| /demo-user | 200 |
| /demo-admin | 200 |
| /admin | 200 |
| /data | 200 |
| /security | 200 |
| /architecture | 200 |
| /presentation | 200 |
| /pitchdeck | 200 |
| /audit | 200 |
| /docs | 200 |
| /prompt | 200 |
