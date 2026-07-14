alter table public.visitor_invites
  add column if not exists is_owner boolean not null default false;

-- Promote the test invitation created during setup. This can be changed later.
update public.visitor_invites
set is_owner = true
where label = 'Yuyun 测试访客';

create or replace function public.valid_owner(session_token text)
returns public.visitor_invites
language sql
security definer
set search_path = public
stable
as $$
  select visitor.*
  from public.valid_visitor(session_token) visitor
  where visitor.is_owner = true
  limit 1;
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
        'id', id, 'kind', kind, 'title', title, 'excerpt', excerpt,
        'body', body, 'image_url', image_url, 'event_date', event_date
      ) order by sort_order, created_at desc)
      from public.private_entries where is_published = true
    ), '[]'::jsonb),
    'messages', '[]'::jsonb
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
      select jsonb_agg(to_jsonb(invites))
      from (
        select id, label, is_active, expires_at, visit_count, last_seen_at, created_at
        from public.visitor_invites
        where is_owner = false
        order by created_at desc
      ) invites
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(recent_events))
      from (
        select e.id, i.label as visitor_name, e.event_type, e.created_at
        from public.visitor_events e
        join public.visitor_invites i on i.id = e.invite_id
        where i.is_owner = false
        order by e.created_at desc
        limit 100
      ) recent_events
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(to_jsonb(recent_messages))
      from (
        select m.id, i.label as visitor_name, m.body, m.status, m.created_at
        from public.guestbook_messages m
        join public.visitor_invites i on i.id = m.invite_id
        order by m.created_at desc
        limit 100
      ) recent_messages
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.owner_create_visitor_invite(
  session_token text,
  visitor_name text,
  invite_code text,
  invite_expires_at timestamptz default null
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

  insert into public.visitor_invites (label, code_hash, expires_at)
  values (
    trim(visitor_name),
    encode(extensions.digest(lower(trim(invite_code)), 'sha256'), 'hex'),
    invite_expires_at
  )
  returning * into new_invite;

  return jsonb_build_object(
    'id', new_invite.id,
    'label', new_invite.label,
    'is_active', new_invite.is_active,
    'expires_at', new_invite.expires_at,
    'visit_count', new_invite.visit_count,
    'last_seen_at', new_invite.last_seen_at,
    'created_at', new_invite.created_at
  );
exception
  when unique_violation then raise exception 'This invitation code is already in use.';
end;
$$;

create or replace function public.owner_set_visitor_active(
  session_token text,
  visitor_id uuid,
  new_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  updated_invite public.visitor_invites;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;

  update public.visitor_invites
  set is_active = new_active
  where id = visitor_id and is_owner = false
  returning * into updated_invite;
  if updated_invite.id is null then raise exception 'Visitor not found.'; end if;

  return jsonb_build_object(
    'id', updated_invite.id,
    'label', updated_invite.label,
    'is_active', updated_invite.is_active,
    'expires_at', updated_invite.expires_at,
    'visit_count', updated_invite.visit_count,
    'last_seen_at', updated_invite.last_seen_at,
    'created_at', updated_invite.created_at
  );
end;
$$;

create or replace function public.owner_set_message_status(
  session_token text,
  message_id uuid,
  new_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  updated_message public.guestbook_messages;
  visitor_name text;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;
  if new_status not in ('visible', 'hidden') then raise exception 'Invalid message status.'; end if;

  update public.guestbook_messages
  set status = new_status
  where id = message_id
  returning * into updated_message;
  if updated_message.id is null then raise exception 'Message not found.'; end if;
  select label into visitor_name from public.visitor_invites where id = updated_message.invite_id;

  return jsonb_build_object(
    'id', updated_message.id,
    'visitor_name', visitor_name,
    'body', updated_message.body,
    'status', updated_message.status,
    'created_at', updated_message.created_at
  );
end;
$$;

revoke all on function public.valid_owner(text) from public, anon, authenticated;
grant execute on function public.owner_get_dashboard(text) to anon, authenticated;
grant execute on function public.owner_create_visitor_invite(text, text, text, timestamptz) to anon, authenticated;
grant execute on function public.owner_set_visitor_active(text, uuid, boolean) to anon, authenticated;
grant execute on function public.owner_set_message_status(text, uuid, text) to anon, authenticated;
