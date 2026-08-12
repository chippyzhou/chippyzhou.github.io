import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodePrivateMediaReference,
  encodePrivateMediaReference,
  unlockPrivateSpace,
} from "./privateSpaceApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("private media references", () => {
  it("stores CloudBase file IDs as database-compatible site paths", () => {
    const fileId = "cloud://portfolio/private/audio/song one.wav";
    const stored = encodePrivateMediaReference(fileId);

    expect(stored).toMatch(/^\/__private_media__\//);
    expect(decodePrivateMediaReference(stored)).toBe(fileId);
  });

  it("leaves ordinary media URLs unchanged", () => {
    const url = "https://cdn.example.com/song.mp3";

    expect(encodePrivateMediaReference(url)).toBe(url);
    expect(decodePrivateMediaReference(url)).toBeNull();
  });
});

describe("private space RPC transport", () => {
  it("routes invitation unlocks through the CloudBase API function", async () => {
    const identity = {
      name: "Test visitor",
      visitor_number: 1,
      visit_count: 1,
      is_owner: false,
      session_token: "session-token",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, data: identity }),
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(unlockPrivateSpace("Visitor-example-code")).resolves.toEqual(identity);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("app.tcloudbase.com/private-media-upload");
    expect(JSON.parse(request.body)).toMatchObject({
      action: "rpc",
      rpcName: "unlock_private_space",
      args: { invite_code: "Visitor-example-code" },
    });
  });
});
