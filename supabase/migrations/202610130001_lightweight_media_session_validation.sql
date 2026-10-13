-- Media uploads only need authentication state. Avoid loading the full owner
-- dashboard or private-space payload for every upload and temporary URL lookup.
create or replace function public.validate_private_media_session(
  session_token text,
  owner_only boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  invite public.visitor_invites;
begin
  select * into invite from public.valid_visitor(session_token);

  if invite.id is null or (owner_only and invite.is_owner is not true) then
    return jsonb_build_object('is_valid', false, 'is_owner', false);
  end if;

  return jsonb_build_object(
    'is_valid', true,
    'is_owner', invite.is_owner
  );
end;
$$;

revoke all on function public.validate_private_media_session(text, boolean) from public;
grant execute on function public.validate_private_media_session(text, boolean) to anon, authenticated;
