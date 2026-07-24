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
        'id', id,
        'kind', kind,
        'title', title,
        'excerpt', excerpt,
        'body', body,
        'image_url', image_url,
        'external_url', external_url,
        'event_date', event_date,
        'display_date', coalesce(event_date, (created_at at time zone 'Asia/Shanghai')::date),
        'is_published', is_published
      ) order by sort_order, created_at desc)
      from public.private_entries
      where is_published = true or invite.is_owner = true
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

create or replace function public.owner_upsert_private_entry_v2(
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
  entry_published boolean
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

  stable_entry_id := coalesce(entry_id, gen_random_uuid());

  insert into public.private_entries (
    id,
    kind,
    title,
    excerpt,
    body,
    image_url,
    external_url,
    event_date,
    is_published,
    sort_order
  ) values (
    stable_entry_id,
    entry_kind,
    trim(entry_title),
    coalesce(trim(entry_excerpt), ''),
    coalesce(entry_body, ''),
    case when entry_replace_image then entry_image_url else null end,
    case when entry_kind = 'film' then nullif(trim(entry_external_url), '') else null end,
    entry_event_date,
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
    'display_date', coalesce(
      saved_entry.event_date,
      (saved_entry.created_at at time zone 'Asia/Shanghai')::date
    ),
    'is_published', saved_entry.is_published
  );
end;
$$;

grant execute on function public.get_private_space(text) to anon, authenticated;
grant execute on function public.owner_upsert_private_entry_v2(
  text, uuid, text, text, text, text, text, text, boolean, date, boolean
) to anon, authenticated;
