import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

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
          init: () => ({
            getTempFileURL: vi.fn(),
            getUploadMetadata: vi.fn(),
          }),
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
