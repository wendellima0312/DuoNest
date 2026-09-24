# DuoNest Architecture

## Product Flow

1. User creates an individual Supabase Auth account.
2. Onboarding creates a `profile`.
3. User creates a `home`.
4. A database trigger inserts the creator as `owner` in `home_members`.
5. Owner creates an invite in `home_invites`.
6. Partner accepts the invite and becomes a `member`.
7. All shared data is scoped by `home_id`.

## Data Model

Core identity:

- `profiles`: one row per `auth.users` account.
- `homes`: shared household workspace.
- `home_members`: membership and role (`owner`, `member`).
- `home_invites`: invite code/status lifecycle.

Routine modules:

- `tasks`, `task_completions`, `task_attachments`
- `reminders`
- `missions`, `mission_completions`
- `shopping_lists`, `shopping_items`
- `attention_points`, `attention_point_attachments`
- `home_records`, `record_attachments`
- `notifications`
- `activity_log`
- `xp_transactions`, `levels`, `achievements`, `user_achievements`

## RLS Rule

Main invariant:

> A user can access only rows that belong to a home where they are a member.

Policies use private `security definer` helper functions in schema `private`:

- `private.is_home_member(home_id)`
- `private.is_home_owner(home_id)`
- `private.profile_visible(user_id)`

These functions pin `search_path = ''`, include the caller identity with `(select auth.uid())`, and are not exposed to `anon`.

## Storage

Buckets:

- `avatars`
- `task-attachments`
- `home-records`
- `attention-points`

Private file buckets use path structure:

```text
home_id/user_id/file-name
```

Storage RLS verifies the first folder is a member home and the second folder matches the uploader.

## Realtime

`shopping_items` is added to `supabase_realtime` for collaborative shopping updates. The frontend can subscribe to list rows scoped by `home_id`.

## Frontend

Next.js App Router structure:

- `src/app/(auth)`: login, signup, password recovery.
- `src/app/onboarding`: first-run home setup.
- `src/app/(app)`: authenticated product routes.
- `src/components`: layout and UI primitives.
- `src/features/duonest`: product screens and demo data.
- `src/lib/supabase`: browser/server Supabase clients.

The current UI is navigable and interactive with local state. Supabase persistence is prepared through clients, env vars, and migrations.
