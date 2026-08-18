-- Existing invitation codes were intentionally stored only as hashes. This lets
-- the owner safely issue a new readable code while invalidating old sessions.
create or replace function public.owner_reset_visitor_invite_code(
  session_token text, visitor_id uuid, invite_code text
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
  if char_length(trim(invite_code)) < 10 then raise exception 'Invitation codes must contain at least 10 characters.'; end if;

  update public.visitor_invites
  set code_hash = encode(extensions.digest(lower(trim(invite_code)), 'sha256'), 'hex'),
      code_display = trim(invite_code)
  where id = visitor_id and is_owner = false
  returning * into updated_invite;
  if updated_invite.id is null then raise exception 'Visitor not found.'; end if;

  delete from public.visitor_sessions where invite_id = updated_invite.id;

  return jsonb_build_object(
    'id', updated_invite.id, 'label', updated_invite.label, 'is_active', updated_invite.is_active,
    'expires_at', updated_invite.expires_at, 'visit_count', updated_invite.visit_count,
    'last_seen_at', updated_invite.last_seen_at, 'created_at', updated_invite.created_at,
    'code_display', updated_invite.code_display
  );
exception when unique_violation then raise exception 'This invitation code is already in use.';
end;
$$;

grant execute on function public.owner_reset_visitor_invite_code(text, uuid, text) to anon, authenticated;
