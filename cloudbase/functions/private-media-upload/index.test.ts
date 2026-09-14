import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type FunctionResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  status?: number;
};

type CloudFunction = (event?: Record<string, unknown>) => Promise<FunctionResult>;

const source = readFileSync(
  path.join(process.cwd(), "cloudbase/functions/private-media-upload/index.js"),
  "utf8",
);

const cloudbaseApp = {
  getTempFileURL: vi.fn(),
  getUploadMetadata: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

function loadFunction(fetchImplementation: typeof fetch): CloudFunction {
  const functionExports: { main?: CloudFunction } = {};
  const sandbox = {
    Buffer,
    console,
    exports: functionExports,
    fetch: fetchImplementation,
    module: { exports: functionExports },
    require(moduleName: string) {
      if (moduleName === "node:crypto") return crypto;
      if (moduleName === "node:path") return path;
      if (moduleName === "@cloudbase/node-sdk") {
        return {
          init: () => cloudbaseApp,
        };
      }
      throw new Error(`Unexpected module: ${moduleName}`);
    },
  };

  vm.runInNewContext(source, sandbox, { filename: "private-media-upload/index.js" });
  if (!functionExports.main) throw new Error("Cloud function did not export main().");
  return functionExports.main;
}

describe("private media RPC proxy", () => {
  it("forwards an allowlisted operation to the database gateway", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ name: "Yuyun", is_owner: true }),
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;
    const main = loadFunction(fetchMock);

    const result = await main({
      action: "rpc",
      accessKey: "public-client-key",
      rpcName: "unlock_private_space",
      args: { invite_code: "example" },
    });

    expect(result).toMatchObject({
      ok: true,
      data: { name: "Yuyun", is_owner: true },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/rpc\/unlock_private_space$/);
    expect(request).toMatchObject({
      method: "POST",
      body: JSON.stringify({ invite_code: "example" }),
    });
  });

  it("allows the owner reply and visitor deletion RPC operations", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ ok: true }),
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;
    const main = loadFunction(fetchMock);

    const deleteResult = await main({
      action: "rpc",
      accessKey: "public-client-key",
      rpcName: "owner_delete_visitor",
      args: { session_token: "owner-token", invite_id: "invite-1" },
    });
    const replyResult = await main({
      action: "rpc",
      accessKey: "public-client-key",
      rpcName: "owner_set_guestbook_reply",
      args: { session_token: "owner-token", message_id: "message-1", reply_body: "See you soon" },
    });

    expect(deleteResult).toMatchObject({ ok: true, data: { ok: true } });
    expect(replyResult).toMatchObject({ ok: true, data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/rpc\/owner_delete_visitor$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/rpc\/owner_set_guestbook_reply$/);
  });

  it("allows article interaction and v4 Tech Note operations", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ ok: true }),
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;
    const main = loadFunction(fetchMock);

    for (const rpcName of [
      "toggle_private_entry_like",
      "post_private_entry_comment",
      "owner_upsert_private_entry_v4",
    ]) {
      const result = await main({
        action: "rpc",
        accessKey: "public-client-key",
        rpcName,
        args: { session_token: "session-token" },
      });
      expect(result).toMatchObject({ ok: true });
    }

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("loads public Tech Notes through the dedicated public-content action", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ([{
        id: "public-tech",
        kind: "tech",
        image_url: null,
        is_public: true,
      }]),
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;
    const main = loadFunction(fetchMock);

    const result = await main({
      action: "public-content",
      accessKey: "public-client-key",
    });

    expect(result).toMatchObject({
      ok: true,
      data: [{ id: "public-tech", kind: "tech", is_public: true }],
      files: {},
    });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/rpc\/get_public_technical_notes$/);
  });

  it("keeps private content available when an old media object cannot be resolved", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ visitor: { name: "Visitor" } }),
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;
    cloudbaseApp.getTempFileURL.mockRejectedValueOnce(new Error("file not found"));
    const main = loadFunction(fetchMock);

    const result = await main({
      action: "resolve",
      accessKey: "public-client-key",
      sessionToken: "visitor-session",
      fileIds: ["cloud://portfolio/private/image/missing.jpg"],
    });

    expect(result).toEqual({ ok: true, files: {} });
  });

  it("resolves private media in small batches so a large playlist cannot fail the page", async () => {
    const fileIds = Array.from({ length: 21 }, (_, index) => `cloud://portfolio/private/audio/track-${index}.mp3`);
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ visitor: { name: "Visitor" } }),
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;
    cloudbaseApp.getTempFileURL
      .mockResolvedValueOnce({
        fileList: fileIds.slice(0, 20).map((fileID) => ({ code: "SUCCESS", fileID, tempFileURL: `https://cdn.example/${fileID}` })),
      })
      .mockRejectedValueOnce(new Error("too many files in one request"));
    const main = loadFunction(fetchMock);

    const result = await main({
      action: "resolve",
      accessKey: "public-client-key",
      sessionToken: "visitor-session",
      fileIds,
    });

    expect(result).toMatchObject({ ok: true });
    expect(Object.keys(result.files || {})).toHaveLength(20);
    expect(cloudbaseApp.getTempFileURL).toHaveBeenCalledTimes(2);
    expect(cloudbaseApp.getTempFileURL.mock.calls[0][0].fileList).toHaveLength(20);
    expect(cloudbaseApp.getTempFileURL.mock.calls[1][0].fileList).toHaveLength(1);
  });

  it("reports a storage quota failure instead of hiding it behind a generic error", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ owner_name: "Yuyun" }),
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;
    cloudbaseApp.getUploadMetadata.mockRejectedValueOnce(new Error("storage quota exceeded"));
    const main = loadFunction(fetchMock);

    const result = await main({
      action: "upload",
      accessKey: "public-client-key",
      sessionToken: "owner-session",
      mediaKind: "image",
      filename: "cover.jpg",
      contentType: "image/jpeg",
      byteSize: 10,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 507,
      error: "Private media storage quota reached. Please check CloudBase storage usage.",
    });
  });

  it("rejects operations outside the explicit allowlist", async () => {
    const fetchMock = vi.fn() as unknown as typeof fetch;
    const main = loadFunction(fetchMock);

    const result = await main({
      action: "rpc",
      accessKey: "public-client-key",
      rpcName: "run_arbitrary_sql",
      args: {},
    });

    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-object database arguments", async () => {
    const fetchMock = vi.fn() as unknown as typeof fetch;
    const main = loadFunction(fetchMock);

    const result = await main({
      action: "rpc",
      accessKey: "public-client-key",
      rpcName: "get_private_space",
      args: ["not", "an", "object"],
    });

    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
