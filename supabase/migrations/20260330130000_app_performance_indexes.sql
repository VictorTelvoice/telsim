create index if not exists idx_sms_logs_user_received_at
  on public.sms_logs (user_id, received_at desc);

create index if not exists idx_sms_logs_user_unread_received_at
  on public.sms_logs (user_id, received_at desc)
  where is_read = false;

create index if not exists idx_slots_assigned_to_created_at
  on public.slots (assigned_to, created_at desc);

create index if not exists idx_subscriptions_user_status_created_at
  on public.subscriptions (user_id, status, created_at desc);

create index if not exists idx_subscriptions_slot_status_created_at
  on public.subscriptions (slot_id, status, created_at desc);
