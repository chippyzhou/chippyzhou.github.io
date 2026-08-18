alter table public.private_music_tracks
  add column if not exists album text not null default '',
  add column if not exists description text not null default '';

drop function if exists public.owner_upsert_private_music_track(
  text, uuid, text, text, text, text, text, boolean
);

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
        'album', track.album,
        'description', track.description,
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

create or replace function public.owner_upsert_private_music_track(
  session_token text,
  track_id uuid,
  track_title text,
  track_artist text,
  track_album text,
  track_description text,
  track_audio_url text,
  track_cover_url text,
  track_external_url text,
  track_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  stable_track_id uuid;
  next_sort_order integer;
  saved_track public.private_music_tracks;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;
  if char_length(trim(track_title)) < 1 or char_length(trim(track_title)) > 180 then
    raise exception 'A track title between 1 and 180 characters is required.';
  end if;
  if char_length(coalesce(trim(track_artist), '')) > 180
    or char_length(coalesce(trim(track_album), '')) > 180
    or char_length(coalesce(trim(track_description), '')) > 240 then
    raise exception 'The track metadata is too long.';
  end if;
  if char_length(coalesce(track_audio_url, '')) > 2048
    or coalesce(track_audio_url, '') !~ '^(https?://|/)' then
    raise exception 'The audio address must use http, https, or a site-relative path.';
  end if;
  if nullif(trim(coalesce(track_cover_url, '')), '') is not null
    and (char_length(track_cover_url) > 2048 or track_cover_url !~ '^(https?://|/)') then
    raise exception 'The cover address must use http, https, or a site-relative path.';
  end if;
  if nullif(trim(coalesce(track_external_url, '')), '') is not null
    and (char_length(track_external_url) > 2048 or track_external_url !~ '^https?://') then
    raise exception 'The music-service link must use http or https.';
  end if;

  stable_track_id := coalesce(track_id, gen_random_uuid());
  select sort_order into next_sort_order from public.private_music_tracks where id = stable_track_id;
  if next_sort_order is null then
    select coalesce(max(sort_order) + 1, 0) into next_sort_order from public.private_music_tracks;
  end if;

  insert into public.private_music_tracks (
    id, title, artist, album, description, audio_url, cover_url, external_url, is_active, sort_order
  ) values (
    stable_track_id,
    trim(track_title),
    coalesce(trim(track_artist), ''),
    coalesce(trim(track_album), ''),
    coalesce(trim(track_description), ''),
    trim(track_audio_url),
    nullif(trim(coalesce(track_cover_url, '')), ''),
    nullif(trim(coalesce(track_external_url, '')), ''),
    coalesce(track_active, true),
    next_sort_order
  )
  on conflict (id) do update
  set title = excluded.title,
      artist = excluded.artist,
      album = excluded.album,
      description = excluded.description,
      audio_url = excluded.audio_url,
      cover_url = excluded.cover_url,
      external_url = excluded.external_url,
      is_active = excluded.is_active,
      updated_at = now()
  returning * into saved_track;

  return jsonb_build_object(
    'id', saved_track.id,
    'title', saved_track.title,
    'artist', saved_track.artist,
    'album', saved_track.album,
    'description', saved_track.description,
    'audio_url', saved_track.audio_url,
    'cover_url', saved_track.cover_url,
    'external_url', saved_track.external_url,
    'is_active', saved_track.is_active,
    'sort_order', saved_track.sort_order
  );
end;
$$;

create or replace function public.owner_reorder_private_music_tracks(
  session_token text,
  track_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  track_count integer;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;

  select count(*) into track_count from public.private_music_tracks;
  if coalesce(cardinality(track_ids), 0) <> track_count
    or coalesce(cardinality(track_ids), 0) <> (
      select count(distinct listed_id)
      from unnest(coalesce(track_ids, '{}'::uuid[])) as listed(listed_id)
    )
    or exists (
      select listed_id from unnest(coalesce(track_ids, '{}'::uuid[])) as listed(listed_id)
      except select id from public.private_music_tracks
    ) then raise exception 'The playlist order is incomplete or invalid.';
  end if;

  update public.private_music_tracks track
  set sort_order = ordered.position - 1, updated_at = now()
  from unnest(coalesce(track_ids, '{}'::uuid[])) with ordinality as ordered(id, position)
  where track.id = ordered.id;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', track.id,
      'title', track.title,
      'artist', track.artist,
      'album', track.album,
      'description', track.description,
      'audio_url', track.audio_url,
      'cover_url', track.cover_url,
      'external_url', track.external_url,
      'is_active', track.is_active,
      'sort_order', track.sort_order
    ) order by track.sort_order, track.created_at)
    from public.private_music_tracks track
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.owner_upsert_private_music_track(
  text, uuid, text, text, text, text, text, text, text, boolean
) to anon, authenticated;
