-- Runtime app settings (e.g. demo mode toggled from the admin button).
-- Service role only: RLS on, no policies, no grants for browser roles.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
