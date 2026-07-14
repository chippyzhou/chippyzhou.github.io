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

grant execute on function public.get_private_space(text) to anon, authenticated;
