# DuoNest

DuoNest is a modern shared household routine manager for couples and growing homes. It combines domestic tasks, reminders, shopping lists, attention points, records, XP, levels, missions, achievements, notifications, and weekly collaboration metrics.

## Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Supabase Auth, Postgres, RLS, Storage, Realtime
- Vercel-ready deployment

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Never put service-role or secret keys in `NEXT_PUBLIC_` variables.

## Supabase

The initial schema is in:

```text
supabase/migrations/20260924153000_initial_duonest_schema.sql
```

It creates household membership tables, routine modules, UUID keys, indexed foreign keys, RLS policies scoped by home membership, Storage buckets, and Realtime support for collaborative shopping items.

Apply locally or to a linked project:

```bash
supabase db push
supabase test db
```

## Routes

- `/login`
- `/cadastro`
- `/recuperar-senha`
- `/onboarding`
- `/dashboard`
- `/tarefas`
- `/tarefas/[id]`
- `/calendario`
- `/missoes`
- `/mercado`
- `/mercado/[id]`
- `/pontos-atencao`
- `/pontos-atencao/[id]`
- `/registros`
- `/conquistas`
- `/perfil`
- `/configuracoes`
- `/configuracoes/casa`
- `/configuracoes/membros`
- `/configuracoes/notificacoes`

## Deployment

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Run the Supabase migration before using the production app.
5. Keep secret/server keys only in server-side environment variables.

## Architecture Docs

- `docs/ARCHITECTURE.md`
- `docs/SECURITY_CHECKLIST.md`
