# AGENTS.md — automotores (AutoVault)

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — next lint (ESLint + TS)
- `npx prisma db push` — sync schema (no migrations exist yet)

## Project structure
- `@/*` → `./src/*` (tsconfig paths)
- shadcn/ui uses **@base-ui/react** primitives (base-nova style, not Radix)
- UI components: `src/components/ui/` → `@/components/ui`
- Prisma generates to `src/generated/prisma/` (gitignored)
- Prisma 7 uses **driver adapters** — `@prisma/adapter-pg` wraps `pg` Pool. `PrismaClient({ adapter })` is required (plain constructor not supported). See `src/lib/prisma.ts`.

## Auth (custom, not NextAuth)
- `POST /api/auth` — bcrypt compare against `SECRET_PASSWORD_HASH`
- Sets `autovault_session` cookie (httpOnly, 1 week)
- Validated per-page in server component (no `middleware.ts`)
- Dev password: `RACINGCLUB333` (from `.env`)
- ⚠️ bcrypt hashes in `.env` contain `$` chars — must be escaped as `\$` or Next.js's env loader will truncate them

## Realtime (Pusher)
- Channels: `presence-autovault` (presence), `private-chat` (messages)
- Auth: `POST /api/pusher/auth`
- Message POST falls back to fake IDs if DB is unavailable

## CSS
- Dark-only (`<html className="dark">` in root layout)
- `globals.css` imports `tw-animate-css` + `shadcn/tailwind.css`

## Not in repo
- No test runner, CI, Docker, or API middleware
