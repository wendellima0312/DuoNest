# Security Checklist

- RLS is enabled on every public table.
- Client roles have explicit grants; `anon` has no table grants.
- Policies use `TO authenticated` plus membership checks.
- Policies wrap `auth.uid()` as `(select auth.uid())`.
- Foreign keys and RLS columns are indexed.
- `service_role` or secret keys are never referenced by `NEXT_PUBLIC_` variables.
- Private helper functions use `security definer`, `set search_path = ''`, and schema-qualified table names.
- Storage buckets are protected by `storage.objects` policies.
- Upload paths are scoped by `home_id/user_id`.
- Views are not used. If added later, use `security_invoker = true`.
- RLS tests include owner/member/stranger cases.
- Realtime tables still rely on table RLS.
- `.env` and `.env.local` remain unversioned.

Before production:

- Run `supabase db push` against a staging project.
- Run `supabase test db`.
- Run Supabase advisors in the Dashboard or CLI.
- Confirm Auth email verification and redirect URLs.
- Configure Vercel environment variables.
- Verify Storage upload size and MIME policies.
