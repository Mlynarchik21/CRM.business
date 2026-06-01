# Studio CRM — agent index

**Path:** `C:\Users\ggmly\studio-crm`  
**Product:** CRM для студии (лиды, клиенты, проекты, сделки, оплаты, поддержка).  
**Stack:** Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, Supabase, Zustand, TanStack Table, RHF + Zod, Recharts.

## Read order (start of every session)

1. **This file** (`AGENTS.md`) — index and forbidden actions.
2. **`docs/AI-GUIDE.md`** — full Russian guide (map, skills matrix, pitfalls).
3. **⭐ block** in `CLAUDE.md` or full journal in `docs/CRM-PROGRESS.md`.
4. **Architecture (if unknown):** `graphify-out/wiki/index.md` — or run `graphify . --wiki --no-viz`.
5. **Feature priorities:** `docs/TZ-improvements.md`.

## Environment

- Copy `.env.example` → `.env.local` (never commit `.env.local`).
- Dev: `npm run dev` → **http://localhost:3001** (port 3000 often busy on this machine).
- Typecheck without build: `npx tsc --noEmit`.
- Do **not** run `npm run build` while `next dev` is running (corrupts `.next`).

## Key paths

| Area | Path |
|------|------|
| Dashboard routes | `app/(dashboard)/*` |
| UI | `components/*` |
| Shared logic | `lib/*` |
| DB migrations | `supabase/migrations/001` … `009` |
| Nav labels | `lib/constants.ts` → `NAV_ITEMS` |
| Supabase clients | `lib/supabase/client.ts`, `server.ts`, `middleware.ts` |
| Telegram | `app/api/telegram/*` |
| Lead intake API | `app/api/agents/lead-intake` |

## Tools installed in repo (2026-06-01)

| Tool | Purpose |
|------|---------|
| **graphify** | Code knowledge graph → `graphify-out/` |
| **Ruflo** | Agent orchestration, memory, cost tracking |
| **Cursor skills** | `.cursor/skills/graphify/` |

Setup scripts: `scripts/setup-graphify-ruflo.ps1`, `scripts/sync-graphify-skill.ps1`.

## Forbidden actions

- Commit `.env.local` or secrets.
- Use `SUPABASE_SERVICE_ROLE_KEY` in client components (server-only, e.g. `createAdminClient`).
- Delete leads from the system (business rule).
- Expect `tools/lead-parser` in the repo — it is **gitignored**; lead intake via API only.
- Confuse **CRM agents** (`/agents`, `settings.agents`) with **Cursor/Ruflo** agents.

## Graphify quick commands

```powershell
cd C:\Users\ggmly\studio-crm
graphify . --wiki --no-viz
graphify query "how do payments update project paid_amount?"
graphify . --update --wiki
```

## Ruflo

See `docs/RUFLO.md`. MCP: `.cursor/mcp.json` → `npx ruflo@latest mcp start`.

## Handoff prompt (VS Code / any assistant)

```
Открой папку C:\Users\ggmly\studio-crm.
Прочитай AGENTS.md, затем docs/AI-GUIDE.md, затем блок «⭐ ТЕКУЩЕЕ СОСТОЯНИЕ» в CLAUDE.md.
Если нет graphify-out/ — предложи запустить graphify . --wiki --no-viz.
Уточни у меня, какие миграции Supabase уже применены.
```
