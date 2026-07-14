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
        'body', body, 'image_url', image_url, 'event_date', event_date,
        'is_published', is_published
      ) order by sort_order, created_at desc)
      from public.private_entries
      where is_published = true or invite.is_owner = true
    ), '[]'::jsonb),
    'messages', '[]'::jsonb
  );
end;
$$;

create or replace function public.owner_upsert_private_entry(
  session_token text,
  entry_id uuid,
  entry_kind text,
  entry_title text,
  entry_excerpt text,
  entry_body text,
  entry_image_url text,
  entry_event_date date,
  entry_published boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  saved_entry public.private_entries;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;
  if entry_kind not in ('writing', 'photography', 'film') then raise exception 'Invalid entry type.'; end if;
  if char_length(trim(entry_title)) < 1 then raise exception 'A title is required.'; end if;
  if char_length(coalesce(entry_image_url, '')) > 4000000 then raise exception 'The image is too large.'; end if;

  if entry_id is null then
    insert into public.private_entries (
      kind, title, excerpt, body, image_url, event_date, is_published, sort_order
    ) values (
      entry_kind, trim(entry_title), coalesce(trim(entry_excerpt), ''),
      coalesce(entry_body, ''), entry_image_url, entry_event_date,
      entry_published, 0
    ) returning * into saved_entry;
  else
    update public.private_entries
    set kind = entry_kind,
        title = trim(entry_title),
        excerpt = coalesce(trim(entry_excerpt), ''),
        body = coalesce(entry_body, ''),
        image_url = entry_image_url,
        event_date = entry_event_date,
        is_published = entry_published
    where id = entry_id
    returning * into saved_entry;
    if saved_entry.id is null then raise exception 'Entry not found.'; end if;
  end if;

  return jsonb_build_object(
    'id', saved_entry.id,
    'kind', saved_entry.kind,
    'title', saved_entry.title,
    'excerpt', saved_entry.excerpt,
    'body', saved_entry.body,
    'image_url', saved_entry.image_url,
    'event_date', saved_entry.event_date,
    'is_published', saved_entry.is_published
  );
end;
$$;

create or replace function public.owner_delete_private_entry(
  session_token text,
  entry_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_invite public.visitor_invites;
  deleted_entry public.private_entries;
begin
  select * into owner_invite from public.valid_owner(session_token);
  if owner_invite.id is null then raise exception 'Owner access required.'; end if;

  delete from public.private_entries
  where id = entry_id
  returning * into deleted_entry;
  if deleted_entry.id is null then raise exception 'Entry not found.'; end if;

  return jsonb_build_object('id', deleted_entry.id);
end;
$$;

grant execute on function public.get_private_space(text) to anon, authenticated;
grant execute on function public.owner_upsert_private_entry(text, uuid, text, text, text, text, text, date, boolean) to anon, authenticated;
grant execute on function public.owner_delete_private_entry(text, uuid) to anon, authenticated;
