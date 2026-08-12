export type PrivateEntry = {
  id: string;
  kind: "writing" | "photography" | "film";
  title: string;
  excerpt: string;
  body: string;
  image_url: string | null;
  external_url: string | null;
  event_date: string | null;
  display_date?: string | null;
  music_track_id: string | null;
  is_published: boolean;
};

export type PrivateMusicTrack = {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  audio_storage_url?: string;
  cover_url: string | null;
  cover_storage_url?: string | null;
  external_url: string | null;
  is_active: boolean;
  sort_order: number;
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
  playlist: PrivateMusicTrack[];
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

type CloudbaseMediaResponse = {
  ok: boolean;
  error?: string;
  status?: number;
  data?: unknown;
  files?: Record<string, string>;
  upload?: {
    url: string;
    token: string;
    authorization: string;
    fileId: string;
    cosFileId: string;
    downloadUrl?: string;
    cloudPath: string;
  };
};

const cloudbaseAccessKey = import.meta.env.VITE_CLOUDBASE_ACCESS_KEY;
const cloudbaseMediaEndpoint = import.meta.env.VITE_CLOUDBASE_MEDIA_ENDPOINT
  || "https://yuyun-portfolio-d2fw66i84b7160d0-1321999291.ap-shanghai.app.tcloudbase.com/private-media-upload";
const requestTimeoutMs = 12_000;
const saveRequestTimeoutMs = 20_000;
const mediaEnvelopePrefix = "yuyun-media-v1:";
const privateMediaReferencePrefix = "/__private_media__/";
export const isPrivateSpaceConfigured = Boolean(cloudbaseMediaEndpoint && cloudbaseAccessKey);

export function encodePrivateMediaReference(value: string) {
  return value.startsWith("cloud://")
    ? `${privateMediaReferencePrefix}${encodeURIComponent(value)}`
    : value;
}

export function decodePrivateMediaReference(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("cloud://")) return value;
  if (!value.startsWith(privateMediaReferencePrefix)) return null;
  try {
    const decoded = decodeURIComponent(value.slice(privateMediaReferencePrefix.length));
    return decoded.startsWith("cloud://") ? decoded : null;
  } catch {
    return null;
  }
}

export class PrivateSpaceRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PrivateSpaceRequestError";
    this.status = status;
  }
}

export function isTransientPrivateSpaceError(error: unknown) {
  return (error instanceof DOMException && error.name === "AbortError")
    || error instanceof TypeError
    || (error instanceof PrivateSpaceRequestError
      && (error.status === 408 || error.status === 429 || error.status >= 500));
}

async function rpc<T>(
  name: string,
  body: Record<string, unknown>,
  timeoutMs = requestTimeoutMs,
): Promise<T> {
  const response = await callPrivateMedia({
    action: "rpc",
    rpcName: name,
    args: body,
  }, timeoutMs);
  return response.data as T;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new DOMException("The request timed out.", "AbortError")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function callPrivateMedia(
  data: Record<string, unknown>,
  timeoutMs = requestTimeoutMs,
) {
  const requestData = { ...data, accessKey: cloudbaseAccessKey };
  const response = await withTimeout(fetch(cloudbaseMediaEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestData),
  }), timeoutMs);
  let payload: CloudbaseMediaResponse;
  try {
    payload = await response.json() as CloudbaseMediaResponse;
  } catch {
    throw new PrivateSpaceRequestError("The private service returned an invalid response.", 502);
  }
  if (!payload.ok) throw new PrivateSpaceRequestError(payload.error || "The private request failed.", payload.status || response.status || 500);
  return payload;
}

async function resolvePrivateMedia(sessionToken: string, fileIds: string[]) {
  const uniqueIds = [...new Set(fileIds
    .map((value) => decodePrivateMediaReference(value))
    .filter((value): value is string => Boolean(value)))];
  if (!uniqueIds.length) return {};
  const response = await callPrivateMedia({
    action: "resolve",
    sessionToken,
    fileIds: uniqueIds,
  });
  return response.files || {};
}

function entryMediaIds(value: string | null) {
  if (!value) return [];
  if (value.startsWith("cloud://")) return [value];
  if (!value.startsWith(mediaEnvelopePrefix)) return [];
  try {
    const images = JSON.parse(value.slice(mediaEnvelopePrefix.length));
    return Array.isArray(images)
      ? images.flatMap((image) => [image?.storageSrc, image?.src]).filter((item): item is string => typeof item === "string" && item.startsWith("cloud://"))
      : [];
  } catch {
    return [];
  }
}

function hydrateEntryMedia(value: string | null, files: Record<string, string>) {
  if (!value) return value;
  if (value.startsWith("cloud://")) {
    const resolved = files[value];
    if (!resolved) return value;
    return `${mediaEnvelopePrefix}${JSON.stringify([{
      id: "cloud-cover",
      src: resolved,
      storageSrc: value,
      size: "large",
      align: "center",
      caption: "",
      focusX: 50,
      focusY: 50,
      isCover: true,
    }])}`;
  }
  if (!value.startsWith(mediaEnvelopePrefix)) return value;
  try {
    const images = JSON.parse(value.slice(mediaEnvelopePrefix.length));
    if (!Array.isArray(images)) return value;
    return `${mediaEnvelopePrefix}${JSON.stringify(images.map((image) => {
      const storageSrc = typeof image?.storageSrc === "string" && image.storageSrc.startsWith("cloud://")
        ? image.storageSrc
        : typeof image?.src === "string" && image.src.startsWith("cloud://") ? image.src : null;
      return storageSrc && files[storageSrc]
        ? { ...image, storageSrc, src: files[storageSrc] }
        : image;
    }))}`;
  } catch {
    return value;
  }
}

function hydratePlaylist(playlist: PrivateMusicTrack[], files: Record<string, string>) {
  return playlist.map((track) => {
    const audioStorageUrl = decodePrivateMediaReference(track.audio_url)
      || decodePrivateMediaReference(track.audio_storage_url);
    const coverStorageUrl = decodePrivateMediaReference(track.cover_url)
      || decodePrivateMediaReference(track.cover_storage_url);
    return {
      ...track,
      audio_storage_url: audioStorageUrl || track.audio_storage_url,
      audio_url: audioStorageUrl ? files[audioStorageUrl] || track.audio_url : track.audio_url,
      cover_storage_url: coverStorageUrl || track.cover_storage_url,
      cover_url: coverStorageUrl ? files[coverStorageUrl] || track.cover_url : track.cover_url,
    };
  });
}

export async function uploadPrivateMedia(
  sessionToken: string,
  file: File | Blob,
  kind: "image" | "audio",
  filename = file instanceof File ? file.name : `${kind}-upload`,
) {
  if (!isPrivateSpaceConfigured) throw new Error("File uploads are not connected yet.");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), kind === "audio" ? 20 * 60_000 : 5 * 60_000);
  try {
    const metadata = await callPrivateMedia({
      action: "upload",
      sessionToken,
      mediaKind: kind,
      filename,
      contentType: file.type || "application/octet-stream",
      byteSize: file.size,
    });
    if (!metadata.upload) throw new PrivateSpaceRequestError("Upload metadata is missing.", 502);
    const upload = metadata.upload;
    // An empty Blob type avoids an unsigned Content-Type header without copying
    // large audio files into memory before the upload starts.
    const uploadBody = file.slice(0, file.size, "");
    const response = await fetch(upload.url, {
      method: "PUT",
      headers: {
        Signature: upload.authorization,
        authorization: upload.authorization,
        "x-cos-security-token": upload.token,
        "x-cos-meta-fileid": upload.cosFileId,
        key: encodeURIComponent(upload.cloudPath),
      },
      body: uploadBody,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new PrivateSpaceRequestError(`The file could not be uploaded (${response.status}).`, response.status);
    }
    const resolved = await resolvePrivateMedia(sessionToken, [upload.fileId]);
    return {
      storage_url: upload.fileId,
      url: resolved[upload.fileId] || upload.downloadUrl || upload.fileId,
      media_kind: kind,
    };
  } catch (error) {
    if (controller.signal.aborted) throw new DOMException("The request timed out.", "AbortError");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function unlockPrivateSpace(code: string) {
  const response = await rpc<VisitorIdentity | { error: string; status?: number }>(
    "unlock_private_space",
    { invite_code: code },
  );
  if ("error" in response) {
    throw new PrivateSpaceRequestError(response.error, response.status || 401);
  }
  return response;
}

export async function loadPrivateSpace(sessionToken: string) {
  const content = await rpc<PrivateSpaceContent>("get_private_space", { session_token: sessionToken });
  const fileIds = [
    ...content.entries.flatMap((entry) => entryMediaIds(entry.image_url)),
    ...content.playlist.flatMap((track) => [track.audio_url, track.cover_url || ""]),
  ];
  const files = await resolvePrivateMedia(sessionToken, fileIds);
  return {
    ...content,
    entries: content.entries.map((entry) => ({
      ...entry,
      image_url: hydrateEntryMedia(entry.image_url, files),
    })),
    playlist: hydratePlaylist(content.playlist, files),
  };
}

export function postGuestbookMessage(sessionToken: string, message: string, requestId: string) {
  return rpc<GuestbookMessage>("post_guestbook_message_v2", {
    session_token: sessionToken,
    message_body: message,
    request_id: requestId,
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
    external_url: string | null;
    replace_image: boolean;
    event_date: string | null;
    music_track_id?: string | null;
    is_published: boolean;
  },
) {
  const body = {
    session_token: sessionToken,
    entry_id: entry.id,
    entry_kind: entry.kind,
    entry_title: entry.title,
    entry_excerpt: entry.excerpt,
    entry_body: entry.body,
    entry_image_url: entry.image_url,
    entry_external_url: entry.external_url,
    entry_replace_image: entry.replace_image,
    entry_event_date: entry.event_date,
    entry_published: entry.is_published,
  };

  return "music_track_id" in entry
    ? rpc<PrivateEntry>("owner_upsert_private_entry_v3", {
      ...body,
      entry_music_track_id: entry.music_track_id,
    }, saveRequestTimeoutMs)
    : rpc<PrivateEntry>("owner_upsert_private_entry_v2", body, saveRequestTimeoutMs);
}

export function deletePrivateEntry(sessionToken: string, entryId: string) {
  return rpc<{ id: string }>("owner_delete_private_entry", {
    session_token: sessionToken,
    entry_id: entryId,
  });
}

export async function savePrivateMusicTrack(
  sessionToken: string,
  track: {
    id: string | null;
    title: string;
    artist: string;
    audio_url: string;
    cover_url: string | null;
    external_url: string | null;
    is_active: boolean;
  },
) {
  const saved = await rpc<PrivateMusicTrack>("owner_upsert_private_music_track", {
    session_token: sessionToken,
    track_id: track.id,
    track_title: track.title,
    track_artist: track.artist,
    track_audio_url: encodePrivateMediaReference(track.audio_url),
    track_cover_url: track.cover_url ? encodePrivateMediaReference(track.cover_url) : null,
    track_external_url: track.external_url,
    track_active: track.is_active,
  }, saveRequestTimeoutMs);
  const files = await resolvePrivateMedia(sessionToken, [saved.audio_url, saved.cover_url || ""]);
  return hydratePlaylist([saved], files)[0];
}

export function deletePrivateMusicTrack(sessionToken: string, trackId: string) {
  return rpc<{ id: string }>("owner_delete_private_music_track", {
    session_token: sessionToken,
    track_id: trackId,
  });
}

export async function reorderPrivateMusicTracks(sessionToken: string, trackIds: string[]) {
  const tracks = await rpc<PrivateMusicTrack[]>("owner_reorder_private_music_tracks", {
    session_token: sessionToken,
    track_ids: trackIds,
  }, saveRequestTimeoutMs);
  const files = await resolvePrivateMedia(sessionToken, tracks.flatMap((track) => [track.audio_url, track.cover_url || ""]));
  return hydratePlaylist(tracks, files);
}
