create table if not exists public.private_music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null default '',
  audio_url text not null,
  cover_url text,
  external_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.private_music_tracks enable row level security;

alter table public.private_entries
  add column if not exists music_track_id uuid
  references public.private_music_tracks(id) on delete set null;

create index if not exists private_entries_music_track_id_idx
  on public.private_entries (music_track_id);

create index if not exists private_music_tracks_order_idx
  on public.private_music_tracks (sort_order, created_at);

create table if not exists public.private_unlock_attempts (
  id bigint generated always as identity primary key,
  client_hash text not null,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);

alter table public.private_unlock_attempts enable row level security;

create index if not exists private_unlock_attempts_recent_idx
  on public.private_unlock_attempts (client_hash, attempted_at desc)
  where succeeded = false;

-- Every private table is reachable only through the validated security-definer RPCs below.
revoke all on table public.visitor_invites from anon, authenticated;
revoke all on table public.visitor_sessions from anon, authenticated;
revoke all on table public.private_entries from anon, authenticated;
revoke all on table public.private_music_tracks from anon, authenticated;
revoke all on table public.guestbook_messages from anon, authenticated;
revoke all on table public.visitor_events from anon, authenticated;
revoke all on table public.private_unlock_attempts from anon, authenticated;

create or replace function public.unlock_private_space(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.visitor_invites;
  raw_token text;
  visitor_number integer;
  failed_attempts integer;
  request_headers jsonb;
  client_identity text;
  client_hash_value text;
begin
  request_headers := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb,
    '{}'::jsonb
  );
  client_identity := coalesce(
    nullif(trim(split_part(request_headers ->> 'x-forwarded-for', ',', 1)), ''),
    nullif(trim(request_headers ->> 'cf-connecting-ip'), ''),
    nullif(trim(request_headers ->> 'x-real-ip'), ''),
    'unknown'
  ) || '|' || coalesce(request_headers ->> 'user-agent', 'unknown');
  client_hash_value := encode(extensions.digest(client_identity, 'sha256'), 'hex');

  delete from public.private_unlock_attempts
  where attempted_at < now() - interval '7 days';

  select count(*) into failed_attempts
  from public.private_unlock_attempts
  where client_hash = client_hash_value
    and succeeded = false
    and attempted_at > now() - interval '15 minutes';

  if failed_attempts >= 10 then
    return jsonb_build_object(
      'error', 'Too many attempts. Please wait before trying again.',
      'status', 429
    );
  end if;

  select * into invite
  from public.visitor_invites
  where code_hash = encode(extensions.digest(lower(trim(invite_code)), 'sha256'), 'hex')
    and is_active = true
    and (expires_at is null or expires_at > now())
  limit 1;

  if invite.id is null then
    insert into public.private_unlock_attempts (client_hash, succeeded)
    values (client_hash_value, false);
    return jsonb_build_object(
      'error', 'This invitation is invalid or has been disabled.',
      'status', 401
    );
  end if;

  insert into public.private_unlock_attempts (client_hash, succeeded)
  values (client_hash_value, true);

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.visitor_sessions (invite_id, token_hash)
  values (invite.id, encode(extensions.digest(raw_token, 'sha256'), 'hex'));

  update public.visitor_invites
  set visit_count = visit_count + 1, last_seen_at = now()
  where id = invite.id
  returning * into invite;

  insert into public.visitor_events (invite_id, event_type) values (invite.id, 'unlock');
  select count(*) into visitor_number from public.visitor_invites where created_at <= invite.created_at;

  return jsonb_build_object(
    'name', invite.label,
    'visitor_number', visitor_number,
    'visit_count', invite.visit_count,
    'is_owner', invite.is_owner,
    'session_token', raw_token
  );
end;
$$;

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
        'is_published', entry.is_published
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
        'created_at', message.created_at
      ) order by message.created_at desc)
      from public.guestbook_messages message
      where message.invite_id = invite.id
        and message.status = 'visible'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.owner_upsert_private_music_track(
  session_token text,
  track_id uuid,
  track_title text,
  track_artist text,
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
  if char_length(coalesce(trim(track_artist), '')) > 180 then
    raise exception 'The artist name is too long.';
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
  select sort_order into next_sort_order
  from public.private_music_tracks where id = stable_track_id;
  if next_sort_order is null then
    select coalesce(max(sort_order) + 1, 0) into next_sort_order
    from public.private_music_tracks;
  end if;

  insert into public.private_music_tracks (
    id, title, artist, audio_url, cover_url, external_url, is_active, sort_order
  ) values (
    stable_track_id,
    trim(track_title),
    coalesce(trim(track_artist), ''),
    trim(track_audio_url),
    nullif(trim(coalesce(track_cover_url, '')), ''),
    nullif(trim(coalesce(track_external_url, '')), ''),
    coalesce(track_active, true),
    next_sort_order
  )
  on conflict (id) do update
  set title = excluded.title,
      artist = excluded.artist,
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
    'audio_url', saved_track.audio_url,
    'cover_url', saved_track.cover_url,
    'external_url', saved_track.external_url,
    'is_active', saved_track.is_active,
    'sort_order', saved_track.sort_order
  );
end;
$$;

create or replace function public.owner_delete_private_music_track(
  session_token text,
  track_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  deleted_track public.private_music_tracks;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;

  delete from public.private_music_tracks
  where id = track_id
  returning * into deleted_track;
  if deleted_track.id is null then raise exception 'Track not found.'; end if;

  return jsonb_build_object('id', deleted_track.id);
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
      select listed_id
      from unnest(coalesce(track_ids, '{}'::uuid[])) as listed(listed_id)
      except
      select id from public.private_music_tracks
    ) then
    raise exception 'The playlist order is incomplete or invalid.';
  end if;

  update public.private_music_tracks track
  set sort_order = ordered.position - 1,
      updated_at = now()
  from unnest(coalesce(track_ids, '{}'::uuid[])) with ordinality as ordered(id, position)
  where track.id = ordered.id;

  return coalesce((
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
  ), '[]'::jsonb);
end;
$$;

create or replace function public.owner_upsert_private_entry_v3(
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
  entry_music_track_id uuid
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
  if entry_kind not in ('writing', 'photography', 'film') then raise exception 'Invalid entry type.'; end if;
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
    event_date, music_track_id, is_published, sort_order
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
    entry_published,
    0
  )
  on conflict (id) do update
  set kind = excluded.kind,
      title = excluded.title,
      excerpt = excluded.excerpt,
      body = excluded.body,
      image_url = case
        when entry_replace_image then excluded.image_url
        else public.private_entries.image_url
      end,
      external_url = excluded.external_url,
      event_date = excluded.event_date,
      music_track_id = excluded.music_track_id,
      is_published = excluded.is_published
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
    'is_published', saved_entry.is_published
  );
end;
$$;

revoke all on function public.unlock_private_space(text) from public;
revoke all on function public.get_private_space(text) from public;
revoke all on function public.owner_upsert_private_music_track(text, uuid, text, text, text, text, text, boolean) from public;
revoke all on function public.owner_delete_private_music_track(text, uuid) from public;
revoke all on function public.owner_reorder_private_music_tracks(text, uuid[]) from public;
revoke all on function public.owner_upsert_private_entry_v3(
  text, uuid, text, text, text, text, text, text, boolean, date, boolean, uuid
) from public;

grant execute on function public.unlock_private_space(text) to anon, authenticated;
grant execute on function public.get_private_space(text) to anon, authenticated;
grant execute on function public.owner_upsert_private_music_track(text, uuid, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.owner_delete_private_music_track(text, uuid) to anon, authenticated;
grant execute on function public.owner_reorder_private_music_tracks(text, uuid[]) to anon, authenticated;
grant execute on function public.owner_upsert_private_entry_v3(
  text, uuid, text, text, text, text, text, text, boolean, date, boolean, uuid
) to anon, authenticated;
