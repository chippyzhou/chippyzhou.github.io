alter table public.private_entry_comments
  add column if not exists visibility text not null default 'public';

alter table public.private_entry_comments
  drop constraint if exists private_entry_comments_visibility_check;

alter table public.private_entry_comments
  add constraint private_entry_comments_visibility_check
  check (visibility in ('public', 'private'));

drop function if exists public.post_private_entry_comment(text, uuid, text, uuid);

create or replace function public.post_private_entry_comment(
  session_token text,
  target_entry_id uuid,
  comment_body text,
  comment_visibility text,
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
  normalized_visibility text;
begin
  select * into invite from public.valid_visitor(session_token);
  if invite.id is null then raise exception 'Your invitation is no longer active.'; end if;
  if request_id is null then raise exception 'A request id is required.'; end if;
  if char_length(trim(comment_body)) < 1 or char_length(trim(comment_body)) > 1000 then
    raise exception 'Comments must contain between 1 and 1000 characters.';
  end if;

  normalized_visibility := lower(trim(coalesce(comment_visibility, 'public')));
  if normalized_visibility not in ('public', 'private') then
    raise exception 'Comment visibility must be public or private.';
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
      entry_id, invite_id, visitor_name, body, visibility, client_request_id
    ) values (
      target_entry_id, invite.id, invite.label, trim(comment_body), normalized_visibility, request_id
    ) returning * into saved_comment;
  end if;

  return jsonb_build_object(
    'id', saved_comment.id,
    'entry_id', saved_comment.entry_id,
    'visitor_name', saved_comment.visitor_name,
    'body', saved_comment.body,
    'visibility', saved_comment.visibility,
    'is_own', true,
    'created_at', saved_comment.created_at
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
            'visibility', entry_comment.visibility,
            'is_own', entry_comment.invite_id = invite.id,
            'created_at', entry_comment.created_at
          ) order by entry_comment.created_at)
          from public.private_entry_comments entry_comment
          where entry_comment.entry_id = entry.id
            and entry_comment.status = 'visible'
            and (
              entry_comment.visibility = 'public'
              or entry_comment.invite_id = invite.id
              or invite.is_owner = true
            )
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
        'visitor_name', message_invite.label,
        'body', message.body,
        'created_at', message.created_at,
        'owner_reply', message.owner_reply,
        'owner_replied_at', message.owner_replied_at
      ) order by message.created_at desc)
      from public.guestbook_messages message
      join public.visitor_invites message_invite on message_invite.id = message.invite_id
      where message.status = 'visible'
        and (invite.is_owner = true or message.invite_id = invite.id)
    ), '[]'::jsonb)
  );
end;
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
    'like_count', (
      select count(*) from public.private_entry_likes entry_like
      where entry_like.entry_id = saved_entry.id
    ),
    'liked_by_visitor', exists(
      select 1 from public.private_entry_likes entry_like
      where entry_like.entry_id = saved_entry.id and entry_like.invite_id = owner_invite.id
    ),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', entry_comment.id,
        'entry_id', entry_comment.entry_id,
        'visitor_name', entry_comment.visitor_name,
        'body', entry_comment.body,
        'visibility', entry_comment.visibility,
        'is_own', entry_comment.invite_id = owner_invite.id,
        'created_at', entry_comment.created_at
      ) order by entry_comment.created_at)
      from public.private_entry_comments entry_comment
      where entry_comment.entry_id = saved_entry.id and entry_comment.status = 'visible'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.post_private_entry_comment(text, uuid, text, text, uuid) from public;
grant execute on function public.get_private_space(text) to anon, authenticated;
grant execute on function public.post_private_entry_comment(text, uuid, text, text, uuid) to anon, authenticated;
grant execute on function public.owner_upsert_private_entry_v4(
  text, uuid, text, text, text, text, text, text, boolean, date, boolean, uuid, boolean
) to anon, authenticated;
