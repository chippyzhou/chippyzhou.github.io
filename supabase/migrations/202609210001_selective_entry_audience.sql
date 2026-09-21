alter table public.private_entries
  add column if not exists audience text not null default 'all';

alter table public.private_entries
  drop constraint if exists private_entries_audience_check;

alter table public.private_entries
  add constraint private_entries_audience_check
  check (audience in ('all', 'selected'));

create table if not exists public.private_entry_viewers (
  entry_id uuid not null references public.private_entries(id) on delete cascade,
  invite_id uuid not null references public.visitor_invites(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, invite_id)
);

create index if not exists private_entry_viewers_invite_entry_idx
  on public.private_entry_viewers (invite_id, entry_id);

alter table public.private_entry_viewers enable row level security;
revoke all on table public.private_entry_viewers from public, anon, authenticated;

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
    'available_visitors', case when invite.is_owner then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', visitor.id,
        'label', visitor.label,
        'is_active', visitor.is_active,
        'expires_at', visitor.expires_at
      ) order by visitor.created_at desc)
      from public.visitor_invites visitor
      where visitor.is_owner = false
    ), '[]'::jsonb) else '[]'::jsonb end,
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
        'audience', entry.audience,
        'audience_visitor_ids', case when invite.is_owner then coalesce((
          select jsonb_agg(viewer.invite_id order by viewer.created_at)
          from public.private_entry_viewers viewer
          where viewer.entry_id = entry.id
        ), '[]'::jsonb) else '[]'::jsonb end,
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
      where invite.is_owner = true
        or (
          entry.is_published = true
          and (
            entry.audience = 'all'
            or exists (
              select 1 from public.private_entry_viewers viewer
              where viewer.entry_id = entry.id and viewer.invite_id = invite.id
            )
          )
        )
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
        'owner_replied_at', message.owner_replied_at,
        'replies', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', reply.id,
            'message_id', reply.message_id,
            'body', reply.body,
            'created_at', reply.created_at
          ) order by reply.created_at)
          from public.guestbook_message_replies reply
          where reply.message_id = message.id
        ), '[]'::jsonb)
      ) order by message.created_at desc)
      from public.guestbook_messages message
      join public.visitor_invites message_invite on message_invite.id = message.invite_id
      where message.status = 'visible'
        and (invite.is_owner = true or message.invite_id = invite.id)
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
    where entry.id = target_entry_id
      and (
        invite.is_owner = true
        or (
          entry.is_published = true
          and (
            entry.audience = 'all'
            or exists (
              select 1 from public.private_entry_viewers viewer
              where viewer.entry_id = entry.id and viewer.invite_id = invite.id
            )
          )
        )
      )
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
    where entry.id = target_entry_id
      and (
        invite.is_owner = true
        or (
          entry.is_published = true
          and (
            entry.audience = 'all'
            or exists (
              select 1 from public.private_entry_viewers viewer
              where viewer.entry_id = entry.id and viewer.invite_id = invite.id
            )
          )
        )
      )
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

-- Keep the established RPC name so the deployed HTTPS gateway does not need
-- another allowlist change. The additional argument names let PostgREST select
-- this overload while the previous frontend remains compatible during rollout.
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
  entry_public boolean,
  entry_audience text,
  entry_visitor_ids uuid[]
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
  normalized_audience text;
  selected_visitor_ids uuid[];
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;
  if entry_kind not in ('writing', 'photography', 'reading', 'film', 'tech') then raise exception 'Invalid entry type.'; end if;
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

  normalized_audience := lower(trim(coalesce(entry_audience, 'all')));
  if normalized_audience not in ('all', 'selected') then
    raise exception 'Entry audience must be all or selected.';
  end if;

  selected_visitor_ids := coalesce(entry_visitor_ids, array[]::uuid[]);
  if exists (
    select 1
    from unnest(selected_visitor_ids) requested_id
    left join public.visitor_invites visitor on visitor.id = requested_id
    where visitor.id is null or visitor.is_owner = true
  ) then raise exception 'One or more selected visitors are invalid.'; end if;
  if coalesce(entry_published, false)
    and normalized_audience = 'selected'
    and cardinality(selected_visitor_ids) = 0 then
    raise exception 'Select at least one visitor.';
  end if;

  stable_entry_id := coalesce(entry_id, gen_random_uuid());

  insert into public.private_entries (
    id, kind, title, excerpt, body, image_url, external_url,
    event_date, music_track_id, is_published, is_public, audience, sort_order
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
    normalized_audience,
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
      is_public = excluded.is_public,
      audience = excluded.audience
  returning * into saved_entry;

  delete from public.private_entry_viewers where entry_id = stable_entry_id;
  if normalized_audience = 'selected' then
    insert into public.private_entry_viewers (entry_id, invite_id)
    select stable_entry_id, selected_id
    from (select distinct unnest(selected_visitor_ids) as selected_id) selected
    on conflict do nothing;
  end if;

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
    'audience', saved_entry.audience,
    'audience_visitor_ids', coalesce((
      select jsonb_agg(viewer.invite_id order by viewer.created_at)
      from public.private_entry_viewers viewer
      where viewer.entry_id = saved_entry.id
    ), '[]'::jsonb),
    'like_count', (select count(*) from public.private_entry_likes entry_like where entry_like.entry_id = saved_entry.id),
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

revoke all on function public.owner_upsert_private_entry_v4(
  text, uuid, text, text, text, text, text, text, boolean, date, boolean, uuid, boolean, text, uuid[]
) from public;

grant execute on function public.get_private_space(text) to anon, authenticated;
grant execute on function public.toggle_private_entry_like(text, uuid) to anon, authenticated;
grant execute on function public.post_private_entry_comment(text, uuid, text, text, uuid) to anon, authenticated;
grant execute on function public.owner_upsert_private_entry_v4(
  text, uuid, text, text, text, text, text, text, boolean, date, boolean, uuid, boolean, text, uuid[]
) to anon, authenticated;
