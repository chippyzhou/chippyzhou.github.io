create extension if not exists pgcrypto with schema extensions;

create table if not exists public.visitor_invites (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  code_hash text not null unique,
  is_owner boolean not null default false,
  is_active boolean not null default true,
  expires_at timestamptz,
  visit_count integer not null default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.visitor_invites(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

create table if not exists public.private_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('writing', 'photography', 'film')),
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  image_url text,
  event_date date,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.guestbook_messages (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.visitor_invites(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now()
);

create table if not exists public.visitor_events (
  id bigint generated always as identity primary key,
  invite_id uuid not null references public.visitor_invites(id) on delete cascade,
  event_type text not null check (event_type in ('unlock', 'return', 'message')),
  created_at timestamptz not null default now()
);

alter table public.visitor_invites enable row level security;
alter table public.visitor_sessions enable row level security;
alter table public.private_entries enable row level security;
alter table public.guestbook_messages enable row level security;
alter table public.visitor_events enable row level security;

create or replace function public.valid_visitor(session_token text)
returns public.visitor_invites
language sql
security definer
set search_path = public
stable
as $$
  select i.*
  from public.visitor_sessions s
  join public.visitor_invites i on i.id = s.invite_id
  where s.token_hash = encode(extensions.digest(session_token, 'sha256'), 'hex')
    and s.expires_at > now()
    and i.is_active = true
    and (i.expires_at is null or i.expires_at > now())
  limit 1;
$$;

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
begin
  select * into invite
  from public.visitor_invites
  where code_hash = encode(extensions.digest(lower(trim(invite_code)), 'sha256'), 'hex')
    and is_active = true
    and (expires_at is null or expires_at > now())
  limit 1;

  if invite.id is null then
    raise exception 'This invitation is invalid or has been disabled.';
  end if;

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
        'id', id, 'kind', kind, 'title', title, 'excerpt', excerpt,
        'body', body, 'image_url', image_url, 'event_date', event_date
      ) order by sort_order, created_at desc)
      from public.private_entries where is_published = true
    ), '[]'::jsonb),
    'messages', '[]'::jsonb
  );
end;
$$;

create or replace function public.post_guestbook_message(session_token text, message_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.visitor_invites;
  new_message public.guestbook_messages;
begin
  select * into invite from public.valid_visitor(session_token);
  if invite.id is null then raise exception 'Your invitation is no longer active.'; end if;
  if char_length(trim(message_body)) < 1 or char_length(trim(message_body)) > 500 then
    raise exception 'Messages must contain between 1 and 500 characters.';
  end if;

  insert into public.guestbook_messages (invite_id, body)
  values (invite.id, trim(message_body)) returning * into new_message;
  insert into public.visitor_events (invite_id, event_type) values (invite.id, 'message');

  return jsonb_build_object(
    'id', new_message.id,
    'visitor_name', invite.label,
    'body', new_message.body,
    'created_at', new_message.created_at
  );
end;
$$;

revoke all on function public.valid_visitor(text) from public, anon, authenticated;
grant execute on function public.unlock_private_space(text) to anon, authenticated;
grant execute on function public.get_private_space(text) to anon, authenticated;
grant execute on function public.post_guestbook_message(text, text) to anon, authenticated;
