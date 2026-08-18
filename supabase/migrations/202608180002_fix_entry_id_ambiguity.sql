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
        'created_at', entry_comment.created_at
      ) order by entry_comment.created_at)
      from public.private_entry_comments entry_comment
      where entry_comment.entry_id = saved_entry.id and entry_comment.status = 'visible'
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.owner_upsert_private_entry_v4(
  text, uuid, text, text, text, text, text, text, boolean, date, boolean, uuid, boolean
) to anon, authenticated;
