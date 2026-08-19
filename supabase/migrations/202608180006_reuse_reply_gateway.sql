-- The existing HTTPS gateway allowlists this RPC name, so keep all reply
-- mutations behind the same owner-only route while supporting reply threads.
drop function if exists public.owner_set_guestbook_reply(text, uuid, text);

create function public.owner_set_guestbook_reply(
  session_token text,
  message_id uuid default null,
  reply_body text default null,
  reply_id uuid default null,
  delete_reply boolean default false
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

  if coalesce(delete_reply, false) then
    if reply_id is null then raise exception 'Reply id is required.'; end if;
    delete from public.guestbook_message_replies
    where id = reply_id
    returning * into saved_reply;
    if saved_reply.id is null then raise exception 'Reply not found.'; end if;
    return jsonb_build_object('id', saved_reply.id, 'message_id', saved_reply.message_id);
  end if;

  if message_id is null or not exists (select 1 from public.guestbook_messages where id = message_id) then
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

revoke all on function public.owner_set_guestbook_reply(text, uuid, text, uuid, boolean) from public;
grant execute on function public.owner_set_guestbook_reply(text, uuid, text, uuid, boolean) to anon, authenticated;
