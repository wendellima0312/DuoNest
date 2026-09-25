alter type public.recurrence_type add value if not exists 'business_days' after 'daily';
alter type public.recurrence_type add value if not exists 'weekends' after 'business_days';
