# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MapleStory inventory and progression tracker — a React/TypeScript SPA backed by Supabase. Tracks accounts, characters, items (with cubing history), resources, bossing sessions, clients, accounts receivable, and daily check-up tasks. Deployed on Vercel.

## Commands

```bash
npm run dev          # Start dev server at localhost:5173
npm run build        # tsc -b && vite build (used for Vercel deploys)
npm run lint         # ESLint check
npx tsc --noEmit     # Type-check only, no output
```

## Build & Deploy Verification

- Always run `npx tsc --noEmit` before declaring a task complete.
- Check for unused imports/variables after refactors — they break Vercel deploys.
- Verify JSX has a single root element (or Fragment) before saving components.

## Architecture

### Data Flow
All database access goes through `src/services/` — one service file per domain (e.g. `bosses.ts`, `items.ts`). Services call `src/lib/supabase.ts` directly; no ORM or query builder abstraction. Types in `src/types/index.ts` mirror the Supabase table shapes.

### Auth & Roles
`AuthContext` (`src/context/AuthContext.tsx`) wraps the app. Three roles: `admin`, `worker`, `unauthorized`. Workers only see `/daily-checkup`; all other routes are admin-only and gated with `<ProtectedRoute adminOnly>` in `App.tsx`.

### Routing
Flat route tree under `MainLayout`. All routes except `/login` are protected. Unauthenticated users redirect to `/login`; workers redirect to `/daily-checkup`.

### Component Structure
- `src/components/Layout/` — `MainLayout`, `Header`, `Sidebar`
- `src/components/UI/` — shared primitives (Button, Card, Input, Table, Modal, ItemCard, ItemTooltip, etc.)
- `src/components/Modals/` — generic modal wrappers
- `src/pages/` — one folder per route; modals colocated with their page

### CSS
Per-component CSS files colocated with each component. Global variables/tokens in `src/styles/tokens.css`; resets/base in `src/styles/global.css`.

### Environment Variables
Required in `.env` (not committed):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
App throws on startup if either is missing.

## Database / Supabase Workflow

- Before assuming a column is missing, query the live schema via the Supabase MCP.
- When schema changes are needed, generate a migration file in `supabase/migrations/` rather than editing inline.
- If the Supabase MCP lacks project access, surface that immediately and hand off the SQL for manual execution.

## MCP Configuration

- Use `claude mcp add <name> -- <command>` to register MCP servers, **not** by editing `settings.json` directly.
- After adding an MCP server, a Claude Code restart is required before the server is usable.
