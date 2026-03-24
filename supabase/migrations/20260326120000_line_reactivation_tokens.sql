-- Tokens únicos para reactivar línea tras cancelación (válidos 48h; uso único).
create table if not exists public.line_reactivation_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references public.users (id) on delete cascade,
  slot_id text not null,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  plan_name text,
  billing_type text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_line_reactivation_tokens_token_active
  on public.line_reactivation_tokens (token)
  where used_at is null;

create index if not exists idx_line_reactivation_tokens_expires
  on public.line_reactivation_tokens (expires_at)
  where used_at is null;

alter table public.line_reactivation_tokens enable row level security;
