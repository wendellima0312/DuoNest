create or replace function private.notify_household_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  item_label text := new.metadata ->> 'title';
  notification_kind public.notification_type := 'system';
  notification_title text := 'Atualizacao da casa';
  notification_body text;
begin
  select profile.display_name into actor_name
  from public.profiles as profile
  where profile.id = new.actor_id;

  actor_name := coalesce(actor_name, 'DuoNest');
  notification_kind := case new.entity_type
    when 'task' then 'task'::public.notification_type
    when 'mission' then 'mission'::public.notification_type
    when 'shopping' then 'shopping'::public.notification_type
    else 'system'::public.notification_type
  end;
  notification_title := case new.entity_type
    when 'task' then 'Atualizacao de tarefa'
    when 'mission' then 'Missao atualizada'
    when 'shopping' then 'Lista de mercado atualizada'
    when 'expense' then 'Financeiro atualizado'
    when 'plan' then 'Planejamento atualizado'
    when 'schedule' then 'Agenda do casal atualizada'
    when 'presence' then 'Ocupacao da casa atualizada'
    else 'Atualizacao da casa'
  end;
  notification_body := actor_name || ' ' || new.action ||
    case when item_label is not null then ': "' || item_label || '".' else '.' end;

  insert into public.notifications (home_id, user_id, type, title, body)
  select new.home_id, member.user_id, notification_kind, notification_title, notification_body
  from public.home_members as member
  where member.home_id = new.home_id
    and not exists (
      select 1
      from public.notifications as recent
      where new.action = 'nao concluiu uma tarefa no prazo'
        and recent.home_id = new.home_id
        and recent.user_id = member.user_id
        and recent.title = 'Tarefa atrasada'
        and recent.created_at >= now() - interval '1 minute'
    );

  return new;
end;
$$;

revoke all on function private.notify_household_activity() from public, anon, authenticated;
