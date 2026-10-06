-- Feed for the browser, read straight from PostgREST (POST /rest/v1/rpc/get_feed).
-- Load test (100 simultaneous reads): PostgREST ~570 ms median vs ~2.4 s through the edge
-- function, whose per-request overhead was the bottleneck. Writes still go through the function.
--
-- Returns exactly the GET /thoughts shape (docs/01-API-CONTRACT.md):
-- newest 200 visible thoughts from the last `thought_ttl_hours` (examples always), replies
-- oldest first, simulated (demo_*) content only while demo mode is on.
-- Settings come from app_settings, which the edge function keeps in sync with its
-- DEMO_MODE / THOUGHT_TTL_HOURS secrets.

create or replace function public.iso_utc(ts timestamptz)
returns text
language sql
immutable
as $$
  select to_char(ts at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

create or replace function public.get_feed()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with settings as (
    select
      coalesce((select (value)::text::boolean from app_settings where key = 'demo_mode'), false) as demo,
      coalesce((select (value)::text::numeric from app_settings where key = 'thought_ttl_hours'), 24) as ttl_hours
  ),
  visible as (
    select t.*
    from thoughts t, settings s
    where not t.hidden
      and (t.is_example or t.created_at >= now() - make_interval(secs => s.ttl_hours * 3600))
      and (s.demo or t.author_id is null or t.author_id not like 'demo\_%')
    order by t.created_at desc
    limit 200
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', v.id,
      'text', v.text,
      'timestamp', iso_utc(v.created_at),
      'rotation', v.rotation,
      'x', v.x,
      'y', v.y,
      'width', v.width,
      'variant', v.variant,
      'responses', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'type', r.type,
            'content', r.content,
            'timestamp', iso_utc(r.created_at),
            'isAI', r.is_ai
          )
          || case when r.drawing_url is not null then jsonb_build_object('drawingData', r.drawing_url) else '{}'::jsonb end
          || case when r.audio_url is not null then jsonb_build_object('audioUrl', r.audio_url) else '{}'::jsonb end
          || case when r.author_id is not null then jsonb_build_object('authorId', r.author_id) else '{}'::jsonb end
          order by r.created_at
        )
        from replies r, settings s
        where r.thought_id = v.id
          and (s.demo or r.author_id is null or r.author_id not like 'demo\_%')
      ), '[]'::jsonb),
      'aiStatus', v.ai_status,
      'lantern', v.lantern,
      'showHelp', v.show_help,
      'isExample', v.is_example
    )
    || case when v.emotion is not null then jsonb_build_object('emotion', v.emotion) else '{}'::jsonb end
    || case when v.author_id is not null then jsonb_build_object('authorId', v.author_id) else '{}'::jsonb end
    order by v.created_at desc
  ), '[]'::jsonb)
  from visible v
$$;

-- Read-only for the browser; it can't touch app_settings directly (security definer reads it).
revoke all on function public.get_feed() from public;
grant execute on function public.get_feed() to anon, authenticated, service_role;
