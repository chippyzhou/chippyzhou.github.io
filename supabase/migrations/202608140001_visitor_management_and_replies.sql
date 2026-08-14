-- New invitations retain an owner-only display copy. Existing hashes cannot be reversed.
alter table public.visitor_invites
  add column if not exists code_display text;

alter table public.guestbook_messages
  add column if not exists owner_reply text,
  add column if not exists owner_replied_at timestamptz;

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
        'id', entry.id, 'kind', entry.kind, 'title', entry.title,
        'excerpt', entry.excerpt, 'body', entry.body, 'image_url', entry.image_url,
        'external_url', entry.external_url, 'event_date', entry.event_date,
        'display_date', coalesce(entry.event_date, (entry.created_at at time zone 'Asia/Shanghai')::date),
        'music_track_id', entry.music_track_id, 'is_published', entry.is_published
      ) order by entry.sort_order, entry.created_at desc)
      from public.private_entries entry
      where entry.is_published = true or invite.is_owner = true
    ), '[]'::jsonb),
    'playlist', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', track.id, 'title', track.title, 'artist', track.artist,
        'audio_url', track.audio_url, 'cover_url', track.cover_url,
        'external_url', track.external_url, 'is_active', track.is_active,
        'sort_order', track.sort_order
      ) order by track.sort_order, track.created_at)
      from public.private_music_tracks track
      where track.is_active = true or invite.is_owner = true
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', message.id, 'visitor_name', invite.label, 'body', message.body,
        'created_at', message.created_at, 'owner_reply', message.owner_reply,
        'owner_replied_at', message.owner_replied_at
      ) order by message.created_at desc)
      from public.guestbook_messages message
      where message.invite_id = invite.id and message.status = 'visible'
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
        select m.id, i.label as visitor_name, m.body, m.status, m.created_at, m.owner_reply, m.owner_replied_at
        from public.guestbook_messages m join public.visitor_invites i on i.id = m.invite_id
        order by m.created_at desc limit 100
      ) recent_messages
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.owner_create_visitor_invite(
  session_token text, visitor_name text, invite_code text, invite_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  new_invite public.visitor_invites;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;
  if char_length(trim(visitor_name)) < 1 then raise exception 'Visitor name is required.'; end if;
  if char_length(trim(invite_code)) < 10 then raise exception 'Invitation codes must contain at least 10 characters.'; end if;

  insert into public.visitor_invites (label, code_hash, code_display, expires_at)
  values (trim(visitor_name), encode(extensions.digest(lower(trim(invite_code)), 'sha256'), 'hex'), trim(invite_code), invite_expires_at)
  returning * into new_invite;

  return jsonb_build_object(
    'id', new_invite.id, 'label', new_invite.label, 'is_active', new_invite.is_active,
    'expires_at', new_invite.expires_at, 'visit_count', new_invite.visit_count,
    'last_seen_at', new_invite.last_seen_at, 'created_at', new_invite.created_at,
    'code_display', new_invite.code_display
  );
exception when unique_violation then raise exception 'This invitation code is already in use.';
end;
$$;

create or replace function public.owner_delete_visitor(session_token text, visitor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  deleted_invite public.visitor_invites;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;
  delete from public.visitor_invites where id = visitor_id and is_owner = false returning * into deleted_invite;
  if deleted_invite.id is null then raise exception 'Visitor not found.'; end if;
  return jsonb_build_object('id', deleted_invite.id);
end;
$$;

create or replace function public.owner_set_guestbook_reply(session_token text, message_id uuid, reply_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  updated_message public.guestbook_messages;
  visitor_name text;
  normalized_reply text;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;
  normalized_reply := nullif(trim(coalesce(reply_body, '')), '');
  if normalized_reply is not null and char_length(normalized_reply) > 500 then raise exception 'Replies must contain at most 500 characters.'; end if;
  update public.guestbook_messages
  set owner_reply = normalized_reply, owner_replied_at = case when normalized_reply is null then null else now() end
  where id = message_id returning * into updated_message;
  if updated_message.id is null then raise exception 'Message not found.'; end if;
  select label into visitor_name from public.visitor_invites where id = updated_message.invite_id;
  return jsonb_build_object(
    'id', updated_message.id, 'visitor_name', visitor_name, 'body', updated_message.body,
    'status', updated_message.status, 'created_at', updated_message.created_at,
    'owner_reply', updated_message.owner_reply, 'owner_replied_at', updated_message.owner_replied_at
  );
end;
$$;

grant execute on function public.owner_get_dashboard(text) to anon, authenticated;
grant execute on function public.owner_create_visitor_invite(text, text, text, timestamptz) to anon, authenticated;
grant execute on function public.owner_delete_visitor(text, uuid) to anon, authenticated;
grant execute on function public.owner_set_guestbook_reply(text, uuid, text) to anon, authenticated;
