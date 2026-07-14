export type PrivateEntry = {
  id: string;
  kind: "writing" | "photography" | "film";
  title: string;
  excerpt: string;
  body: string;
  image_url: string | null;
  event_date: string | null;
  is_published: boolean;
};

export type GuestbookMessage = {
  id: string;
  visitor_name: string;
  body: string;
  created_at: string;
};

export type VisitorIdentity = {
  name: string;
  visitor_number: number;
  visit_count: number;
  is_owner: boolean;
  session_token: string;
};

export type PrivateSpaceContent = {
  visitor: Omit<VisitorIdentity, "session_token">;
  entries: PrivateEntry[];
  messages: GuestbookMessage[];
};

export type AdminInvite = {
  id: string;
  label: string;
  is_active: boolean;
  expires_at: string | null;
  visit_count: number;
  last_seen_at: string | null;
  created_at: string;
};

export type AdminEvent = {
  id: number;
  visitor_name: string;
  event_type: "unlock" | "return" | "message";
  created_at: string;
};

export type AdminMessage = GuestbookMessage & {
  status: "visible" | "hidden";
};

export type AdminDashboard = {
  owner_name: string;
  stats: {
    total_visitors: number;
    active_visitors: number;
    total_visits: number;
    total_messages: number;
  };
  invitations: AdminInvite[];
  events: AdminEvent[];
  messages: AdminMessage[];
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isPrivateSpaceConfigured = Boolean(supabaseUrl && supabaseAnonKey);

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("The private space is not connected yet.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "The request could not be completed.");
  }

  return response.json() as Promise<T>;
}

export function unlockPrivateSpace(code: string) {
  return rpc<VisitorIdentity>("unlock_private_space", { invite_code: code });
}

export function loadPrivateSpace(sessionToken: string) {
  return rpc<PrivateSpaceContent>("get_private_space", { session_token: sessionToken });
}

export function postGuestbookMessage(sessionToken: string, message: string) {
  return rpc<GuestbookMessage>("post_guestbook_message", {
    session_token: sessionToken,
    message_body: message,
  });
}

export function loadAdminDashboard(sessionToken: string) {
  return rpc<AdminDashboard>("owner_get_dashboard", { session_token: sessionToken });
}

export function createVisitorInvite(
  sessionToken: string,
  visitorName: string,
  inviteCode: string,
  expiresAt: string | null,
) {
  return rpc<AdminInvite>("owner_create_visitor_invite", {
    session_token: sessionToken,
    visitor_name: visitorName,
    invite_code: inviteCode,
    invite_expires_at: expiresAt || null,
  });
}

export function setVisitorInviteStatus(sessionToken: string, inviteId: string, isActive: boolean) {
  return rpc<AdminInvite>("owner_set_visitor_active", {
    session_token: sessionToken,
    visitor_id: inviteId,
    new_active: isActive,
  });
}

export function setGuestbookMessageStatus(
  sessionToken: string,
  messageId: string,
  status: "visible" | "hidden",
) {
  return rpc<AdminMessage>("owner_set_message_status", {
    session_token: sessionToken,
    message_id: messageId,
    new_status: status,
  });
}

export function savePrivateEntry(
  sessionToken: string,
  entry: {
    id: string | null;
    kind: PrivateEntry["kind"];
    title: string;
    excerpt: string;
    body: string;
    image_url: string | null;
    event_date: string | null;
    is_published: boolean;
  },
) {
  return rpc<PrivateEntry>("owner_upsert_private_entry", {
    session_token: sessionToken,
    entry_id: entry.id,
    entry_kind: entry.kind,
    entry_title: entry.title,
    entry_excerpt: entry.excerpt,
    entry_body: entry.body,
    entry_image_url: entry.image_url,
    entry_event_date: entry.event_date,
    entry_published: entry.is_published,
  });
}

export function deletePrivateEntry(sessionToken: string, entryId: string) {
  return rpc<{ id: string }>("owner_delete_private_entry", {
    session_token: sessionToken,
    entry_id: entryId,
  });
}
