alter table public.private_entries
  drop constraint if exists private_entries_kind_check;

alter table public.private_entries
  add constraint private_entries_kind_check
  check (kind in ('writing', 'photography', 'film', 'tech'));

alter table public.private_entries
  add column if not exists is_public boolean not null default false;

create table if not exists public.private_entry_likes (
  entry_id uuid not null references public.private_entries(id) on delete cascade,
  invite_id uuid not null references public.visitor_invites(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, invite_id)
);

create table if not exists public.private_entry_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.private_entries(id) on delete cascade,
  invite_id uuid references public.visitor_invites(id) on delete set null,
  visitor_name text not null,
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  client_request_id uuid not null,
  created_at timestamptz not null default now()
);

create unique index if not exists private_entry_comments_invite_request_key
  on public.private_entry_comments (invite_id, client_request_id)
  where invite_id is not null;

alter table public.private_entry_likes enable row level security;
alter table public.private_entry_comments enable row level security;

create or replace function public.get_private_space(session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.visitor_invites;
  visitor_number integer;
begin
  select * into invite from public.valid_visitor(session_token);
  if invite.id is null then raise exception 'Your invitation is no longer active.'; end if;

  select count(*) into visitor_number from public.visitor_invites where created_at <= invite.created_at;
  insert into public.visitor_events (invite_id, event_type) values (invite.id, 'return');

  return jsonb_build_object(
    'visitor', jsonb_build_object(
      'name', invite.label,
      'visitor_number', visitor_number,
      'visit_count', invite.visit_count,
      'is_owner', invite.is_owner
    ),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', entry.id,
        'kind', entry.kind,
        'title', entry.title,
        'excerpt', entry.excerpt,
        'body', entry.body,
        'image_url', entry.image_url,
        'external_url', entry.external_url,
        'event_date', entry.event_date,
        'display_date', coalesce(entry.event_date, (entry.created_at at time zone 'Asia/Shanghai')::date),
        'music_track_id', entry.music_track_id,
        'is_published', entry.is_published,
        'is_public', entry.is_public,
        'like_count', (select count(*) from public.private_entry_likes likes where likes.entry_id = entry.id),
        'liked_by_visitor', exists(
          select 1 from public.private_entry_likes likes
          where likes.entry_id = entry.id and likes.invite_id = invite.id
        ),
        'comments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', entry_comment.id,
            'entry_id', entry_comment.entry_id,
            'visitor_name', entry_comment.visitor_name,
            'body', entry_comment.body,
            'created_at', entry_comment.created_at
          ) order by entry_comment.created_at)
          from public.private_entry_comments entry_comment
          where entry_comment.entry_id = entry.id and entry_comment.status = 'visible'
        ), '[]'::jsonb)
      ) order by entry.sort_order, entry.created_at desc)
      from public.private_entries entry
      where entry.is_published = true or invite.is_owner = true
    ), '[]'::jsonb),
    'playlist', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', track.id,
        'title', track.title,
        'artist', track.artist,
        'audio_url', track.audio_url,
        'cover_url', track.cover_url,
        'external_url', track.external_url,
        'is_active', track.is_active,
        'sort_order', track.sort_order
      ) order by track.sort_order, track.created_at)
      from public.private_music_tracks track
      where track.is_active = true or invite.is_owner = true
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', message.id,
        'visitor_name', invite.label,
        'body', message.body,
        'created_at', message.created_at,
        'owner_reply', message.owner_reply,
        'owner_replied_at', message.owner_replied_at
      ) order by message.created_at desc)
      from public.guestbook_messages message
      where message.invite_id = invite.id and message.status = 'visible'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.toggle_private_entry_like(
  session_token text,
  target_entry_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.visitor_invites;
  liked boolean;
begin
  select * into invite from public.valid_visitor(session_token);
  if invite.id is null then raise exception 'Your invitation is no longer active.'; end if;
  if not exists (
    select 1 from public.private_entries entry
    where entry.id = target_entry_id and (entry.is_published = true or invite.is_owner = true)
  ) then raise exception 'Entry not found.'; end if;

  delete from public.private_entry_likes
  where entry_id = target_entry_id and invite_id = invite.id;

  if found then
    liked := false;
  else
    insert into public.private_entry_likes (entry_id, invite_id)
    values (target_entry_id, invite.id);
    liked := true;
  end if;

  return jsonb_build_object(
    'entry_id', target_entry_id,
    'like_count', (select count(*) from public.private_entry_likes where entry_id = target_entry_id),
    'liked_by_visitor', liked
  );
end;
$$;

create or replace function public.post_private_entry_comment(
  session_token text,
  target_entry_id uuid,
  comment_body text,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.visitor_invites;
  saved_comment public.private_entry_comments;
begin
  select * into invite from public.valid_visitor(session_token);
  if invite.id is null then raise exception 'Your invitation is no longer active.'; end if;
  if request_id is null then raise exception 'A request id is required.'; end if;
  if char_length(trim(comment_body)) < 1 or char_length(trim(comment_body)) > 1000 then
    raise exception 'Comments must contain between 1 and 1000 characters.';
  end if;
  if not exists (
    select 1 from public.private_entries entry
    where entry.id = target_entry_id and (entry.is_published = true or invite.is_owner = true)
  ) then raise exception 'Entry not found.'; end if;

  select * into saved_comment
  from public.private_entry_comments
  where invite_id = invite.id and client_request_id = request_id;

  if saved_comment.id is null then
    insert into public.private_entry_comments (
      entry_id, invite_id, visitor_name, body, client_request_id
    ) values (
      target_entry_id, invite.id, invite.label, trim(comment_body), request_id
    ) returning * into saved_comment;
  end if;

  return jsonb_build_object(
    'id', saved_comment.id,
    'entry_id', saved_comment.entry_id,
    'visitor_name', saved_comment.visitor_name,
    'body', saved_comment.body,
    'created_at', saved_comment.created_at
  );
end;
$$;

create or replace function public.get_public_technical_notes()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', entry.id,
    'kind', entry.kind,
    'title', entry.title,
    'excerpt', entry.excerpt,
    'body', entry.body,
    'image_url', entry.image_url,
    'external_url', null,
    'event_date', entry.event_date,
    'display_date', coalesce(entry.event_date, (entry.created_at at time zone 'Asia/Shanghai')::date),
    'music_track_id', null,
    'is_published', entry.is_published,
    'is_public', true,
    'like_count', 0,
    'liked_by_visitor', false,
    'comments', '[]'::jsonb
  ) order by entry.sort_order, entry.created_at desc), '[]'::jsonb)
  from public.private_entries entry
  where entry.kind = 'tech' and entry.is_public = true;
$$;

create or replace function public.owner_upsert_private_entry_v4(
  session_token text,
  entry_id uuid,
  entry_kind text,
  entry_title text,
  entry_excerpt text,
  entry_body text,
  entry_image_url text,
  entry_external_url text,
  entry_replace_image boolean,
  entry_event_date date,
  entry_published boolean,
  entry_music_track_id uuid,
  entry_public boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  stable_entry_id uuid;
  saved_entry public.private_entries;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;
  if entry_kind not in ('writing', 'photography', 'film', 'tech') then raise exception 'Invalid entry type.'; end if;
  if char_length(trim(entry_title)) < 1 then raise exception 'A title is required.'; end if;
  if entry_replace_image and char_length(coalesce(entry_image_url, '')) > 12000000 then
    raise exception 'The combined image data is too large.';
  end if;
  if entry_external_url is not null and entry_external_url !~ '^https?://' then
    raise exception 'The external link must use http or https.';
  end if;
  if entry_music_track_id is not null
    and not exists (select 1 from public.private_music_tracks where id = entry_music_track_id) then
    raise exception 'The selected soundtrack does not exist.';
  end if;

  stable_entry_id := coalesce(entry_id, gen_random_uuid());

  insert into public.private_entries (
    id, kind, title, excerpt, body, image_url, external_url,
    event_date, music_track_id, is_published, is_public, sort_order
  ) values (
    stable_entry_id,
    entry_kind,
    trim(entry_title),
    coalesce(trim(entry_excerpt), ''),
    coalesce(entry_body, ''),
    case when entry_replace_image then entry_image_url else null end,
    case when entry_kind = 'film' then nullif(trim(entry_external_url), '') else null end,
    entry_event_date,
    entry_music_track_id,
    coalesce(entry_published, false),
    entry_kind = 'tech' and coalesce(entry_public, false),
    0
  )
  on conflict (id) do update
  set kind = excluded.kind,
      title = excluded.title,
      excerpt = excluded.excerpt,
      body = excluded.body,
      image_url = case when entry_replace_image then excluded.image_url else public.private_entries.image_url end,
      external_url = excluded.external_url,
      event_date = excluded.event_date,
      music_track_id = excluded.music_track_id,
      is_published = excluded.is_published,
      is_public = excluded.is_public
  returning * into saved_entry;

  return jsonb_build_object(
    'id', saved_entry.id,
    'kind', saved_entry.kind,
    'title', saved_entry.title,
    'excerpt', saved_entry.excerpt,
    'body', saved_entry.body,
    'image_url', saved_entry.image_url,
    'external_url', saved_entry.external_url,
    'event_date', saved_entry.event_date,
    'display_date', coalesce(saved_entry.event_date, (saved_entry.created_at at time zone 'Asia/Shanghai')::date),
    'music_track_id', saved_entry.music_track_id,
    'is_published', saved_entry.is_published,
    'is_public', saved_entry.is_public,
    'like_count', (select count(*) from public.private_entry_likes where entry_id = saved_entry.id),
    'liked_by_visitor', exists(
      select 1 from public.private_entry_likes where entry_id = saved_entry.id and invite_id = owner_invite.id
    ),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', entry_comment.id,
        'entry_id', entry_comment.entry_id,
        'visitor_name', entry_comment.visitor_name,
        'body', entry_comment.body,
        'created_at', entry_comment.created_at
      ) order by entry_comment.created_at)
      from public.private_entry_comments entry_comment
      where entry_comment.entry_id = saved_entry.id and entry_comment.status = 'visible'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.toggle_private_entry_like(text, uuid) from public;
revoke all on function public.post_private_entry_comment(text, uuid, text, uuid) from public;
revoke all on function public.get_public_technical_notes() from public;
revoke all on function public.owner_upsert_private_entry_v4(
  text, uuid, text, text, text, text, text, text, boolean, date, boolean, uuid, boolean
) from public;

grant execute on function public.get_private_space(text) to anon, authenticated;
grant execute on function public.toggle_private_entry_like(text, uuid) to anon, authenticated;
grant execute on function public.post_private_entry_comment(text, uuid, text, uuid) to anon, authenticated;
grant execute on function public.get_public_technical_notes() to anon, authenticated;
grant execute on function public.owner_upsert_private_entry_v4(
  text, uuid, text, text, text, text, text, text, boolean, date, boolean, uuid, boolean
) to anon, authenticated;
