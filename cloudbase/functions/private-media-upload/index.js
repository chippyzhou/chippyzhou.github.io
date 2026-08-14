const crypto = require("node:crypto");
const path = require("node:path");
const cloudbase = require("@cloudbase/node-sdk");

const envId = "yuyun-portfolio-d2fw66i84b7160d0";
const app = cloudbase.init({ env: envId });
const postgresUrl = `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest`;
const productionOrigin = "https://chippyzhou.github.io";
const maxImageBytes = 50 * 1024 * 1024;
const maxAudioBytes = 500 * 1024 * 1024;
const allowedRpcFunctions = new Set([
  "unlock_private_space",
  "get_private_space",
  "post_guestbook_message_v2",
  "owner_get_dashboard",
  "owner_create_visitor_invite",
  "owner_set_visitor_active",
  "owner_delete_visitor",
  "owner_set_message_status",
  "owner_set_guestbook_reply",
  "owner_upsert_private_entry_v2",
  "owner_upsert_private_entry_v3",
  "owner_delete_private_entry",
  "owner_upsert_private_music_track",
  "owner_delete_private_music_track",
  "owner_reorder_private_music_tracks",
]);
const allowedTypes = {
  image: new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
    ["image/avif", ".avif"],
    ["image/heic", ".heic"],
    ["image/heif", ".heif"],
  ]),
  audio: new Map([
    ["audio/mpeg", ".mp3"],
    ["audio/mp4", ".m4a"],
    ["audio/x-m4a", ".m4a"],
    ["audio/aac", ".aac"],
    ["audio/wav", ".wav"],
    ["audio/x-wav", ".wav"],
    ["audio/ogg", ".ogg"],
    ["audio/flac", ".flac"],
    ["audio/x-flac", ".flac"],
    ["audio/webm", ".webm"],
  ]),
};

function fail(message, status = 400) {
  return { ok: false, error: message, status };
}

function requestHeader(event, name) {
  const headers = event && typeof event.headers === "object" ? event.headers : {};
  const expected = name.toLowerCase();
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === expected);
  return key ? String(headers[key]) : "";
}

function allowedOrigin(event) {
  const origin = requestHeader(event, "origin");
  if (origin === productionOrigin || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)) {
    return origin;
  }
  return productionOrigin;
}

function isHttpRequest(event) {
  return Boolean(event?.httpMethod || event?.requestContext || event?.headers);
}

function requestPayload(event) {
  if (!isHttpRequest(event) || event.body == null) return event;

  try {
    const bodyText = event.isBase64Encoded && typeof event.body === "string"
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    const body = typeof bodyText === "string" ? JSON.parse(bodyText) : bodyText;
    if (!body || typeof body !== "object" || Array.isArray(body)) return event;
    return {
      ...event,
      ...body,
      headers: event.headers,
      httpMethod: event.httpMethod,
      requestContext: event.requestContext,
    };
  } catch {
    return event;
  }
}

function httpResponse(event, payload, statusCode = payload.status || 200) {
  return {
    isBase64Encoded: false,
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin(event),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8",
      Vary: "Origin",
    },
    body: statusCode === 204 ? "" : JSON.stringify(payload),
  };
}

async function validateSession(sessionToken, ownerOnly, accessKey) {
  const token = String(sessionToken || "");
  const publicKey = String(accessKey || "");
  if (!token || !publicKey || publicKey.length > 4096) return null;

  const functionName = ownerOnly ? "owner_get_dashboard" : "get_private_space";
  const response = await fetch(`${postgresUrl}/rpc/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${publicKey}`,
      "Content-Type": "application/json",
      "Content-Profile": "public",
      "Accept-Profile": "public",
    },
    body: JSON.stringify({ session_token: token }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data || typeof data !== "object") return null;

  if (ownerOnly) {
    return data.owner_name ? { is_owner: true } : null;
  }
  return data.visitor || null;
}

async function proxyRpc(event) {
  const functionName = String(event.rpcName || "");
  const publicKey = String(event.accessKey || "");
  const args = event.args;
  if (!allowedRpcFunctions.has(functionName)) return fail("Unsupported database operation.", 403);
  if (!publicKey || publicKey.length > 4096) return fail("The client access key is invalid.", 401);
  if (!args || typeof args !== "object" || Array.isArray(args)) return fail("Invalid database arguments.");

  const headers = {
    Authorization: `Bearer ${publicKey}`,
    "Content-Type": "application/json",
    "Content-Profile": "public",
    "Accept-Profile": "public",
  };
  const forwardedFor = requestHeader(event, "x-forwarded-for").split(",")[0].trim();
  const userAgent = requestHeader(event, "user-agent").slice(0, 512);
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;
  if (userAgent) headers["User-Agent"] = userAgent;

  const response = await fetch(`${postgresUrl}/rpc/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    return fail(data?.message || data?.error || "The database request failed.", response.status);
  }
  return { ok: true, data };
}

function extensionFor(mediaKind, filename, contentType) {
  const typeMap = allowedTypes[mediaKind];
  if (!typeMap) return null;
  const canonicalType = String(contentType || "").toLowerCase().split(";")[0].trim();
  const expectedExtension = typeMap.get(canonicalType);
  if (!expectedExtension) return null;

  const suppliedExtension = path.extname(String(filename || "")).toLowerCase();
  const compatible = suppliedExtension === expectedExtension
    || (expectedExtension === ".jpg" && suppliedExtension === ".jpeg");
  return compatible || !suppliedExtension ? expectedExtension : null;
}

function isPrivateFileId(fileId) {
  return typeof fileId === "string"
    && fileId.startsWith("cloud://")
    && fileId.includes("/private/")
    && fileId.length <= 1024;
}

async function createUpload(event) {
  if (!await validateSession(event.sessionToken, true, event.accessKey)) {
    return fail("Owner access required.", 403);
  }

  const mediaKind = event.mediaKind === "audio" ? "audio" : event.mediaKind === "image" ? "image" : null;
  const byteSize = Number(event.byteSize);
  const extension = mediaKind && extensionFor(mediaKind, event.filename, event.contentType);
  const maxBytes = mediaKind === "audio" ? maxAudioBytes : maxImageBytes;
  if (!mediaKind || !extension) return fail("Unsupported file type.");
  if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > maxBytes) {
    return fail(mediaKind === "audio" ? "Audio files can be up to 500 MB." : "Images can be up to 50 MB.", 413);
  }

  const now = new Date();
  const cloudPath = [
    "private",
    mediaKind,
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${crypto.randomUUID()}${extension}`,
  ].join("/");
  const metadata = await app.getUploadMetadata({ cloudPath });
  const data = metadata?.data;
  if (!data?.url || !data?.fileId) return fail("Upload metadata could not be created.", 502);

  return {
    ok: true,
    upload: {
      url: data.url,
      token: data.token,
      authorization: data.authorization,
      fileId: data.fileId,
      cosFileId: data.cosFileId,
      downloadUrl: data.download_url,
      cloudPath,
    },
  };
}

async function resolveFiles(event) {
  if (!await validateSession(event.sessionToken, false, event.accessKey)) {
    return fail("Your invitation is no longer active.", 401);
  }

  const fileIds = Array.isArray(event.fileIds)
    ? [...new Set(event.fileIds.filter(isPrivateFileId))].slice(0, 100)
    : [];
  if (!fileIds.length) return { ok: true, files: {} };

  const result = await app.getTempFileURL({
    fileList: fileIds.map((fileID) => ({ fileID, maxAge: 60 * 60 * 2 })),
  });
  const files = {};
  for (const item of result?.fileList || []) {
    if (item.code === "SUCCESS" && item.tempFileURL) files[item.fileID] = item.tempFileURL;
  }
  return { ok: true, files };
}

exports.main = async (rawEvent = {}) => {
  const httpRequest = isHttpRequest(rawEvent);
  if (httpRequest && String(rawEvent.httpMethod || "").toUpperCase() === "OPTIONS") {
    return httpResponse(rawEvent, { ok: true }, 204);
  }

  try {
    const event = requestPayload(rawEvent);
    const result = event.action === "rpc"
      ? await proxyRpc(event)
      : event.action === "resolve"
        ? await resolveFiles(event)
        : event.action === "upload"
          ? await createUpload(event)
          : fail("Unsupported action.");
    return httpRequest ? httpResponse(rawEvent, result) : result;
  } catch (error) {
    console.error("private-media-upload failed", error);
    const result = fail("The media service could not complete the request.", 500);
    return httpRequest ? httpResponse(rawEvent, result) : result;
  }
};
