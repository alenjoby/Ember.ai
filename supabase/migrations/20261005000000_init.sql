-- Ember: core schema (spec 02-BACKEND.md, Step 1)
-- The browser (anon key) can only READ visible content. Every write goes through
-- the `server` edge function using the service role.

create extension if not exists pgcrypto;

-- ─── Tables ─────────────────────────────────────────────────────────

create table if not exists public.thoughts (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 600),
  emotion text,
  author_id text,
  x real not null,
  y real not null,
  rotation real not null,
  width int not null,
  variant text not null check (variant in ('warm', 'light', 'teal', 'rose')),
  ai_status text not null default 'waiting'
    check (ai_status in ('waiting', 'replying', 'done', 'skipped')),
  lantern jsonb,
  show_help boolean not null default false,
  is_example boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists thoughts_visible_created_idx
  on public.thoughts (created_at desc) where not hidden;

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  thought_id uuid not null references public.thoughts(id) on delete cascade,
  type text not null check (type in ('note', 'voice', 'drawing', 'sticker')),
  content text not null default '',
  audio_url text,
  drawing_url text,
  is_ai boolean not null default false,
  author_id text,
  created_at timestamptz not null default now()
);
create index if not exists replies_thought_created_idx
  on public.replies (thought_id, created_at);

-- Owner tokens (SHA-256 hashes) live here, never readable by the browser.
create table if not exists public.owners (
  item_id uuid primary key,
  kind text not null check (kind in ('thought', 'reply')),
  token_hash text not null
);

create table if not exists public.rate_events (
  ip_hash text not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_events_lookup_idx
  on public.rate_events (ip_hash, kind, created_at);

-- ─── Row Level Security ─────────────────────────────────────────────

alter table public.thoughts enable row level security;
alter table public.replies enable row level security;
alter table public.owners enable row level security;       -- no policies: deny all
alter table public.rate_events enable row level security;  -- no policies: deny all

drop policy if exists "read visible thoughts" on public.thoughts;
create policy "read visible thoughts" on public.thoughts
  for select to anon, authenticated
  using (not hidden);

drop policy if exists "read replies of visible thoughts" on public.replies;
create policy "read replies of visible thoughts" on public.replies
  for select to anon, authenticated
  using (exists (select 1 from public.thoughts t where t.id = thought_id and not t.hidden));

-- Defense in depth: no write grants for browser roles at all.
revoke insert, update, delete, truncate on public.thoughts, public.replies from anon, authenticated;
revoke all on public.owners, public.rate_events from anon, authenticated;

-- Lock the legacy KV table (old frontend wrote to it with the anon key path).
do $$
begin
  if to_regclass('public.kv_store_9b55d09a') is not null then
    execute 'alter table public.kv_store_9b55d09a enable row level security';
    execute 'revoke all on public.kv_store_9b55d09a from anon, authenticated';
  end if;
end $$;

-- ─── Realtime ───────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'thoughts') then
    alter publication supabase_realtime add table public.thoughts;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'replies') then
    alter publication supabase_realtime add table public.replies;
  end if;
end $$;

-- ─── Storage ────────────────────────────────────────────────────────
-- Public read via unguessable URLs (voice/<uuid>.webm, drawing/<uuid>.png, ai/<uuid>.mp3).
-- No storage policies for anon: only the service role can write.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ember-media', 'ember-media', true, 2097152,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
