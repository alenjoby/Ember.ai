-- 1. Example lanterns: the 12 seed lanterns from fixtures/thoughts.json, stored for real
--    (is_example: always visible, never fade). They used to be shown by the app only while the
--    sky was empty, vanished as soon as one real lantern existed, and couldn't be replied to.
--    Ids are derived from the fixture ids, so running this again changes nothing.
-- 2. Thank-you hearts: the author of a lantern can thank a reply (POST .../thanks); the replier
--    sees it through POST /notifications. replies.seeded marks the seeded replies, so the admin
--    wipe can clear people's replies on the examples but keep the examples themselves.

alter table public.replies add column if not exists thanked_at timestamptz;
alter table public.replies add column if not exists seeded boolean not null default false;

create temporary table _seed on commit drop as
select $seed$[
  {
    "id": "thought_example_1",
    "text": "I moved to a new city three weeks ago. My apartment is completely quiet and I haven't heard my own voice out loud today.",
    "timestamp": "2026-10-05T08:30:00.000Z",
    "rotation": -1.5,
    "x": -380,
    "y": -260,
    "width": 300,
    "variant": "teal",
    "emotion": "lonely",
    "authorId": "user_seed_1",
    "responses": [
      {
        "id": "reply_ex_1_1",
        "type": "note",
        "content": "The first month in a new place is the quietest mountain to climb. You are making roots even when it feels like drifting.",
        "timestamp": "2026-10-05T08:45:00.000Z",
        "isAI": false,
        "authorId": "user_seed_2"
      },
      {
        "id": "reply_ex_1_2",
        "type": "sticker",
        "content": "sticker_hug",
        "timestamp": "2026-10-05T09:02:00.000Z",
        "isAI": false,
        "authorId": "user_seed_3"
      },
      {
        "id": "reply_ex_1_3",
        "type": "note",
        "content": "The silence can feel heavy, but this quiet space holds you until you find your rhythm. You are not alone tonight.",
        "timestamp": "2026-10-05T09:15:00.000Z",
        "isAI": true
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#67e8f9",
        "#0e7490",
        "#083344"
      ],
      "glow": 0.85,
      "flicker": 0.35,
      "shape": "tall",
      "sound": {
        "mood": "night",
        "instrument": "pad",
        "key": "D minor",
        "tempo": 52
      },
      "caption": "quiet rain at midnight"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_2",
    "text": "My grandmother taught me how to fold paper cranes when I was little. Today I folded one for her from an old grocery receipt.",
    "timestamp": "2026-10-05T09:10:00.000Z",
    "rotation": 2.1,
    "x": 420,
    "y": -310,
    "width": 290,
    "variant": "warm",
    "emotion": "grateful",
    "authorId": "user_seed_4",
    "responses": [
      {
        "id": "reply_ex_2_1",
        "type": "note",
        "content": "Those little rituals stay forever. She folds them with you in spirit.",
        "timestamp": "2026-10-05T09:25:00.000Z",
        "isAI": false,
        "authorId": "user_seed_5"
      },
      {
        "id": "reply_ex_2_2",
        "type": "sticker",
        "content": "sticker_heart",
        "timestamp": "2026-10-05T09:30:00.000Z",
        "isAI": false,
        "authorId": "user_seed_6"
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#fde047",
        "#f97316",
        "#7c2d12"
      ],
      "glow": 0.95,
      "flicker": 0.45,
      "shape": "round",
      "sound": {
        "mood": "chimes",
        "instrument": "bells",
        "key": "G major",
        "tempo": 64
      },
      "caption": "paper cranes and golden tea"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_3",
    "text": "Waiting for test results tomorrow morning. My chest feels tight and my mind keeps preparing for storms that haven't arrived.",
    "timestamp": "2026-10-05T10:00:00.000Z",
    "rotation": -0.8,
    "x": -540,
    "y": 180,
    "width": 310,
    "variant": "rose",
    "emotion": "anxious",
    "authorId": "user_seed_7",
    "responses": [
      {
        "id": "reply_ex_3_1",
        "type": "note",
        "content": "Take one slow breath in with me. You do not have to live tomorrow tonight.",
        "timestamp": "2026-10-05T10:14:00.000Z",
        "isAI": false,
        "authorId": "user_seed_8"
      },
      {
        "id": "reply_ex_3_2",
        "type": "note",
        "content": "Your mind is trying so hard to protect you. It is okay to set the shield down for just ten minutes and rest.",
        "timestamp": "2026-10-05T10:20:00.000Z",
        "isAI": true
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#c084fc",
        "#7e22ce",
        "#3b0764"
      ],
      "glow": 0.75,
      "flicker": 0.55,
      "shape": "diamond",
      "sound": {
        "mood": "wind",
        "instrument": "synth",
        "key": "A minor",
        "tempo": 48
      },
      "caption": "a quiet breath in the dark"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_4",
    "text": "Watered the little fiddle-leaf fig tree I thought was completely dead. Today a tiny bright green leaf broke through the dry soil.",
    "timestamp": "2026-10-05T11:20:00.000Z",
    "rotation": 1.4,
    "x": 220,
    "y": 340,
    "width": 295,
    "variant": "warm",
    "emotion": "hopeful",
    "authorId": "user_seed_9",
    "responses": [
      {
        "id": "reply_ex_4_1",
        "type": "note",
        "content": "Life waits quietly under the dirt. What a gentle little reminder for both of you.",
        "timestamp": "2026-10-05T11:35:00.000Z",
        "isAI": false,
        "authorId": "user_seed_10"
      },
      {
        "id": "reply_ex_4_2",
        "type": "sticker",
        "content": "sticker_leaf",
        "timestamp": "2026-10-05T11:42:00.000Z",
        "isAI": false,
        "authorId": "user_seed_11"
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#fbbf24",
        "#d97706",
        "#78350f"
      ],
      "glow": 0.9,
      "flicker": 0.25,
      "shape": "paper",
      "sound": {
        "mood": "ocean",
        "instrument": "kalimba",
        "key": "E major",
        "tempo": 58
      },
      "caption": "morning light on a new leaf"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_5",
    "text": "It has been one year since my father passed away. I still find myself looking for him in the vegetable garden every Sunday afternoon.",
    "timestamp": "2026-10-05T12:05:00.000Z",
    "rotation": -2.3,
    "x": -160,
    "y": -450,
    "width": 315,
    "variant": "teal",
    "emotion": "grieving",
    "authorId": "user_seed_12",
    "responses": [
      {
        "id": "reply_ex_5_1",
        "type": "note",
        "content": "Love doesn't vanish just because someone leaves. It lives in every plant he tended and every Sunday you remember.",
        "timestamp": "2026-10-05T12:20:00.000Z",
        "isAI": false,
        "authorId": "user_seed_13"
      },
      {
        "id": "reply_ex_5_2",
        "type": "note",
        "content": "Missing him this tenderly is proof of how deeply he loved you. This little flame stays lit for him tonight.",
        "timestamp": "2026-10-05T12:30:00.000Z",
        "isAI": true
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#818cf8",
        "#4338ca",
        "#1e1b4b"
      ],
      "glow": 0.8,
      "flicker": 0.3,
      "shape": "tall",
      "sound": {
        "mood": "night",
        "instrument": "pad",
        "key": "C minor",
        "tempo": 44
      },
      "caption": "lavender and Sunday soil"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_6",
    "text": "After months of doubting myself, I finally hit send on my manuscript draft today! My hands were trembling, but I did it.",
    "timestamp": "2026-10-05T13:40:00.000Z",
    "rotation": 1.8,
    "x": 580,
    "y": 120,
    "width": 300,
    "variant": "rose",
    "emotion": "joyful",
    "authorId": "user_seed_14",
    "responses": [
      {
        "id": "reply_ex_6_1",
        "type": "note",
        "content": "Huge congratulations! Sending bravery across the sky. You poured your heart out and that is everything.",
        "timestamp": "2026-10-05T13:55:00.000Z",
        "isAI": false,
        "authorId": "user_seed_15"
      },
      {
        "id": "reply_ex_6_2",
        "type": "sticker",
        "content": "sticker_sparkle",
        "timestamp": "2026-10-05T14:10:00.000Z",
        "isAI": false,
        "authorId": "user_seed_16"
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#fb7185",
        "#e11d48",
        "#881337"
      ],
      "glow": 1,
      "flicker": 0.4,
      "shape": "round",
      "sound": {
        "mood": "chimes",
        "instrument": "harp",
        "key": "F major",
        "tempo": 72
      },
      "caption": "first page written by candlelight"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_7",
    "text": "Sitting on the train watching everyone tap their screens. Sometimes it feels like we are all surrounded by a thousand people and yet completely solitary.",
    "timestamp": "2026-10-05T14:15:00.000Z",
    "rotation": -1.1,
    "x": -240,
    "y": 380,
    "width": 305,
    "variant": "teal",
    "emotion": "lonely",
    "authorId": "user_seed_17",
    "responses": [
      {
        "id": "reply_ex_7_1",
        "type": "note",
        "content": "I feel that same train solitude every commute. Look up next time — someone is probably looking for a friendly face too.",
        "timestamp": "2026-10-05T14:30:00.000Z",
        "isAI": false,
        "authorId": "user_seed_18"
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#38bdf8",
        "#0284c7",
        "#0c4a6e"
      ],
      "glow": 0.78,
      "flicker": 0.32,
      "shape": "paper",
      "sound": {
        "mood": "night",
        "instrument": "pad",
        "key": "D minor",
        "tempo": 50
      },
      "caption": "windows on the evening train"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_8",
    "text": "The barista remembered my name and drew a tiny smiling sun on the coffee lid. It carried me through an entire ten-hour shift.",
    "timestamp": "2026-10-05T15:00:00.000Z",
    "rotation": 2.6,
    "x": -620,
    "y": -120,
    "width": 290,
    "variant": "warm",
    "emotion": "grateful",
    "authorId": "user_seed_19",
    "responses": [
      {
        "id": "reply_ex_8_1",
        "type": "note",
        "content": "Tiny kindnesses are the real glue that holds the world together. Beautiful.",
        "timestamp": "2026-10-05T15:15:00.000Z",
        "isAI": false,
        "authorId": "user_seed_20"
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#fef08a",
        "#eab308",
        "#854d0e"
      ],
      "glow": 0.92,
      "flicker": 0.28,
      "shape": "diamond",
      "sound": {
        "mood": "chimes",
        "instrument": "bells",
        "key": "G major",
        "tempo": 60
      },
      "caption": "steaming coffee on a cold porch"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_9",
    "text": "Starting a new job tomorrow after six months out of work. Terrified that I'll forget everything on day one.",
    "timestamp": "2026-10-05T15:50:00.000Z",
    "rotation": -0.6,
    "x": 140,
    "y": -190,
    "width": 300,
    "variant": "rose",
    "emotion": "anxious",
    "authorId": "user_seed_21",
    "responses": [
      {
        "id": "reply_ex_9_1",
        "type": "note",
        "content": "They hired you because of who you are, not because you memorized everything. You'll do wonderful.",
        "timestamp": "2026-10-05T16:05:00.000Z",
        "isAI": false,
        "authorId": "user_seed_22"
      },
      {
        "id": "reply_ex_9_2",
        "type": "note",
        "content": "Nerves just mean you care. Walk in, breathe slowly, and take it one hour at a time.",
        "timestamp": "2026-10-05T16:20:00.000Z",
        "isAI": true
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#e879f9",
        "#a21caf",
        "#4a044e"
      ],
      "glow": 0.82,
      "flicker": 0.42,
      "shape": "tall",
      "sound": {
        "mood": "wind",
        "instrument": "synth",
        "key": "A minor",
        "tempo": 54
      },
      "caption": "quiet desk before sunrise"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_10",
    "text": "Applied for the community grant today. Even if we don't get selected, this was the first time our little neighborhood came together to dream.",
    "timestamp": "2026-10-05T16:40:00.000Z",
    "rotation": 1.2,
    "x": 490,
    "y": -90,
    "width": 310,
    "variant": "warm",
    "emotion": "hopeful",
    "authorId": "user_seed_23",
    "responses": [
      {
        "id": "reply_ex_10_1",
        "type": "note",
        "content": "The dream itself changes the soil. Rooting for you and your community!",
        "timestamp": "2026-10-05T16:55:00.000Z",
        "isAI": false,
        "authorId": "user_seed_24"
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#fcd34d",
        "#b45309",
        "#451a03"
      ],
      "glow": 0.88,
      "flicker": 0.38,
      "shape": "round",
      "sound": {
        "mood": "ocean",
        "instrument": "kalimba",
        "key": "E major",
        "tempo": 62
      },
      "caption": "warm streetlights on brick walls"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_11",
    "text": "Found my late mother's handwritten recipe card for apple spice cake tucked inside an old cookbook. The handwriting is so familiar it stopped my breath.",
    "timestamp": "2026-10-05T17:10:00.000Z",
    "rotation": -1.9,
    "x": -80,
    "y": 160,
    "width": 315,
    "variant": "teal",
    "emotion": "grieving",
    "authorId": "user_seed_25",
    "responses": [
      {
        "id": "reply_ex_11_1",
        "type": "note",
        "content": "Bake it this weekend. The scent of cinnamon and nutmeg is like a hug from across time.",
        "timestamp": "2026-10-05T17:25:00.000Z",
        "isAI": false,
        "authorId": "user_seed_26"
      },
      {
        "id": "reply_ex_11_2",
        "type": "note",
        "content": "Ink carries a person's rhythm long after they rest. What a precious treasure to uncover.",
        "timestamp": "2026-10-05T17:35:00.000Z",
        "isAI": true
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#a5b4fc",
        "#4f46e5",
        "#312e81"
      ],
      "glow": 0.84,
      "flicker": 0.34,
      "shape": "paper",
      "sound": {
        "mood": "night",
        "instrument": "pad",
        "key": "C minor",
        "tempo": 46
      },
      "caption": "cinnamon and yellowed parchment"
    },
    "showHelp": false,
    "isExample": true
  },
  {
    "id": "thought_example_12",
    "text": "My seven-year-old sister told me today that my laugh is her favorite song in the whole world. I’m going to hold that close on heavy days.",
    "timestamp": "2026-10-05T18:00:00.000Z",
    "rotation": 2.2,
    "x": -420,
    "y": 520,
    "width": 295,
    "variant": "rose",
    "emotion": "joyful",
    "authorId": "user_seed_27",
    "responses": [
      {
        "id": "reply_ex_12_1",
        "type": "note",
        "content": "Kids see right to the heart of what matters. Never let that laughter fade.",
        "timestamp": "2026-10-05T18:15:00.000Z",
        "isAI": false,
        "authorId": "user_seed_28"
      },
      {
        "id": "reply_ex_12_2",
        "type": "sticker",
        "content": "sticker_heart",
        "timestamp": "2026-10-05T18:22:00.000Z",
        "isAI": false,
        "authorId": "user_seed_29"
      }
    ],
    "aiStatus": "done",
    "lantern": {
      "palette": [
        "#fda4af",
        "#f43f5e",
        "#9f1239"
      ],
      "glow": 0.96,
      "flicker": 0.36,
      "shape": "round",
      "sound": {
        "mood": "chimes",
        "instrument": "harp",
        "key": "F major",
        "tempo": 68
      },
      "caption": "laughter echoing in the yard"
    },
    "showHelp": false,
    "isExample": true
  }
]$seed$::jsonb as data;

insert into public.thoughts
  (id, text, emotion, author_id, x, y, rotation, width, variant, ai_status, lantern, show_help, is_example, created_at)
select
  md5('ember-seed:' || e->>'id')::uuid,
  e->>'text',
  e->>'emotion',
  e->>'authorId',
  (e->>'x')::real,
  (e->>'y')::real,
  coalesce((e->>'rotation')::real, 0),
  coalesce((e->>'width')::int, 300),
  coalesce(e->>'variant', 'warm'),
  coalesce(e->>'aiStatus', 'done'),
  e->'lantern',
  false,
  true,
  (e->>'timestamp')::timestamptz
from _seed, jsonb_array_elements(_seed.data) e
on conflict (id) do nothing;

insert into public.replies (id, thought_id, type, content, is_ai, author_id, created_at, seeded)
select
  md5('ember-seed:' || r->>'id')::uuid,
  md5('ember-seed:' || e->>'id')::uuid,
  r->>'type',
  coalesce(r->>'content', ''),
  coalesce((r->>'isAI')::boolean, false),
  r->>'authorId',
  (r->>'timestamp')::timestamptz,
  true
from _seed, jsonb_array_elements(_seed.data) e, jsonb_array_elements(coalesce(e->'responses', '[]'::jsonb)) r
on conflict (id) do nothing;

-- Feed: same as 20261006000000_get_feed.sql, plus "thanked": true on replies the author thanked.
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
          || case when r.thanked_at is not null then jsonb_build_object('thanked', true) else '{}'::jsonb end
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

