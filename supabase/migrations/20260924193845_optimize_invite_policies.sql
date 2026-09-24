drop policy if exists "home_invites_select_members" on public.home_invites;
drop policy if exists "home_invites_select_recipient" on public.home_invites;
create policy "home_invites_select_allowed"
on public.home_invites for select to authenticated
using (
  (select private.is_home_member(home_id))
  or (
    status = 'pending'
    and expires_at > now()
    and email is not null
    and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
);

drop policy if exists "home_invites_update_owner_or_acceptor" on public.home_invites;
drop policy if exists "home_invites_update_recipient" on public.home_invites;
create policy "home_invites_update_allowed"
on public.home_invites for update to authenticated
using (
  (select private.is_home_owner(home_id))
  or accepted_by = (select auth.uid())
  or (
    status = 'pending'
    and expires_at > now()
    and email is not null
    and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
)
with check (
  (select private.is_home_owner(home_id))
  or accepted_by = (select auth.uid())
);

drop policy if exists "home_members_insert_owner" on public.home_members;
drop policy if exists "home_members_insert_invited" on public.home_members;
create policy "home_members_insert_allowed"
on public.home_members for insert to authenticated
with check (
  (select private.is_home_owner(home_id))
  or (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.home_invites as invite
      where invite.home_id = home_members.home_id
        and invite.status = 'pending'
        and invite.expires_at > now()
        and invite.email is not null
        and lower(invite.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    )
  )
);
