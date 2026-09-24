alter function private.next_task_due_at(
  timestamptz,
  public.recurrence_type,
  timestamptz
) stable;
