export type PrivateEntry = {
  id: string;
  kind: "writing" | "photography" | "film";
  title: string;
  excerpt: string;
  body: string;
  image_url: string | null;
  event_date: string | null;
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
  session_token: string;
};

export type PrivateSpaceContent = {
  visitor: Omit<VisitorIdentity, "session_token">;
  entries: PrivateEntry[];
  messages: GuestbookMessage[];
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
