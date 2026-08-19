create table if not exists public.guestbook_message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.guestbook_messages(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists guestbook_message_replies_message_created_idx
  on public.guestbook_message_replies (message_id, created_at);

alter table public.guestbook_message_replies enable row level security;
revoke all on table public.guestbook_message_replies from public, anon, authenticated;

-- Preserve replies written before threaded replies were introduced.
insert into public.guestbook_message_replies (message_id, body, created_at)
select message.id, trim(message.owner_reply), coalesce(message.owner_replied_at, message.created_at)
from public.guestbook_messages message
where nullif(trim(coalesce(message.owner_reply, '')), '') is not null
  and not exists (
    select 1
    from public.guestbook_message_replies reply
    where reply.message_id = message.id
      and reply.body = trim(message.owner_reply)
      and reply.created_at = coalesce(message.owner_replied_at, message.created_at)
  );

create or replace function public.owner_post_guestbook_reply(
  session_token text,
  message_id uuid,
  reply_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  saved_reply public.guestbook_message_replies;
  normalized_reply text;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;
  if not exists (select 1 from public.guestbook_messages where id = message_id) then
    raise exception 'Message not found.';
  end if;

  normalized_reply := trim(coalesce(reply_body, ''));
  if char_length(normalized_reply) < 1 or char_length(normalized_reply) > 500 then
    raise exception 'Replies must contain between 1 and 500 characters.';
  end if;

  insert into public.guestbook_message_replies (message_id, body)
  values (message_id, normalized_reply)
  returning * into saved_reply;

  return jsonb_build_object(
    'id', saved_reply.id,
    'message_id', saved_reply.message_id,
    'body', saved_reply.body,
    'created_at', saved_reply.created_at
  );
end;
$$;

create or replace function public.owner_delete_guestbook_reply(
  session_token text,
  reply_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  deleted_reply public.guestbook_message_replies;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;

  delete from public.guestbook_message_replies
  where id = reply_id
  returning * into deleted_reply;
  if deleted_reply.id is null then raise exception 'Reply not found.'; end if;

  return jsonb_build_object('id', deleted_reply.id, 'message_id', deleted_reply.message_id);
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

create or replace function public.owner_get_dashboard(session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;

  return jsonb_build_object(
    'owner_name', owner_invite.label,
    'stats', jsonb_build_object(
      'total_visitors', (select count(*) from public.visitor_invites where is_owner = false),
      'active_visitors', (select count(*) from public.visitor_invites where is_owner = false and is_active = true and (expires_at is null or expires_at > now())),
      'total_visits', (select coalesce(sum(visit_count), 0) from public.visitor_invites where is_owner = false),
      'total_messages', (select count(*) from public.guestbook_messages)
    ),
    'invitations', coalesce((
      select jsonb_agg(to_jsonb(invites)) from (
        select id, label, is_active, expires_at, visit_count, last_seen_at, created_at, code_display
        from public.visitor_invites where is_owner = false order by created_at desc
      ) invites
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(recent_events)) from (
        select e.id, i.label as visitor_name, e.event_type, e.created_at
        from public.visitor_events e join public.visitor_invites i on i.id = e.invite_id
        where i.is_owner = false order by e.created_at desc limit 100
      ) recent_events
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(to_jsonb(recent_messages)) from (
        select
          message.id,
          message_invite.label as visitor_name,
          message.body,
          message.status,
          message.created_at,
          message.owner_reply,
          message.owner_replied_at,
          coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', reply.id,
              'message_id', reply.message_id,
              'body', reply.body,
              'created_at', reply.created_at
            ) order by reply.created_at)
            from public.guestbook_message_replies reply
            where reply.message_id = message.id
          ), '[]'::jsonb) as replies
        from public.guestbook_messages message
        join public.visitor_invites message_invite on message_invite.id = message.invite_id
        order by message.created_at desc limit 100
      ) recent_messages
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.owner_post_guestbook_reply(text, uuid, text) from public;
revoke all on function public.owner_delete_guestbook_reply(text, uuid) from public;
grant execute on function public.owner_post_guestbook_reply(text, uuid, text) to anon, authenticated;
grant execute on function public.owner_delete_guestbook_reply(text, uuid) to anon, authenticated;
