update public.tasks
set status = 'open',
    due_at = case
      when due_at is null or due_at <= now() or status = 'resolved'
        then private.next_task_due_at(due_at, recurrence, now())
      else due_at
    end,
    last_penalized_due_at = null
where recurrence not in ('none', 'custom');
