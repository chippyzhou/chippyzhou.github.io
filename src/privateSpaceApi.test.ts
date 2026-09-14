import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodePrivateMediaReference,
  encodePrivateMediaReference,
  loadPublicTechnicalNotes,
  loadPrivateSpace,
  postPrivateEntryComment,
  preparePrivateImageUpload,
  savePrivateEntry,
  togglePrivateEntryLike,
  unlockPrivateSpace,
} from "./privateSpaceApi";

const heicConverter = vi.hoisted(() => vi.fn());

vi.mock("heic2any", () => ({ default: heicConverter }));

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

  it("converts HEIC uploads to JPEG before media storage", async () => {
    heicConverter.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
    const heic = new File(["heic"], "summer-photo.HEIC", { type: "image/heic", lastModified: 42 });

    const prepared = await preparePrivateImageUpload(heic);

    expect(heicConverter).toHaveBeenCalledWith(expect.objectContaining({ blob: heic, toType: "image/jpeg" }));
    expect(prepared.name).toBe("summer-photo.jpg");
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.lastModified).toBe(42);
  });
});

describe("private space RPC transport", () => {
  it("resolves a large private media set in browser-sized batches", async () => {
    const tracks = Array.from({ length: 21 }, (_, index) => ({
      id: `track-${index}`,
      title: `Track ${index}`,
      artist: "Artist",
      audio_url: `/__private_media__/cloud%3A%2F%2Fportfolio%2Fprivate%2Faudio%2Ftrack-${index}.mp3`,
      cover_url: null,
      external_url: null,
      is_active: true,
      sort_order: index,
    }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            visitor: { name: "Visitor", visitor_number: 1, visit_count: 1, is_owner: false },
            entries: [],
            playlist: tracks,
            messages: [],
          },
        }),
        ok: true,
        status: 200,
      })
      .mockResolvedValue({
        json: async () => ({ ok: true, files: {} }),
        ok: true,
        status: 200,
      });
    vi.stubGlobal("fetch", fetchMock);

    const content = await loadPrivateSpace("visitor-token");

    expect(content.playlist).toHaveLength(21);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).fileIds).toHaveLength(20);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).fileIds).toHaveLength(1);
  });

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

  it("uses the v4 entry writer for Tech Notes and the public VOL.01 flag", async () => {
    const saved = {
      id: "tech-one",
      kind: "tech",
      title: "Evaluation notes",
      excerpt: "",
      body: "# Notes",
      image_url: null,
      external_url: null,
      event_date: null,
      music_track_id: null,
      is_published: false,
      is_public: true,
      like_count: 0,
      liked_by_visitor: false,
      comments: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, data: saved }), ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await savePrivateEntry("owner-token", {
      id: null,
      kind: "tech",
      title: "Evaluation notes",
      excerpt: "",
      body: "# Notes",
      image_url: null,
      external_url: null,
      replace_image: false,
      event_date: null,
      music_track_id: null,
      is_published: false,
      is_public: true,
    });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request).toMatchObject({
      action: "rpc",
      rpcName: "owner_upsert_private_entry_v4",
      args: { entry_kind: "tech", entry_public: true },
    });
  });

  it("keeps existing non-Tech entries saveable while the cloud function is being upgraded", async () => {
    const saved = {
      id: "writing-one",
      kind: "writing",
      title: "Existing note",
      excerpt: "",
      body: "Body",
      image_url: null,
      external_url: null,
      event_date: null,
      music_track_id: null,
      is_published: true,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ ok: false, error: "Unsupported database operation.", status: 403 }), ok: false, status: 403 })
      .mockResolvedValueOnce({ json: async () => ({ ok: true, data: saved }), ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await savePrivateEntry("owner-token", {
      id: "writing-one",
      kind: "writing",
      title: "Existing note",
      excerpt: "",
      body: "Body",
      image_url: null,
      external_url: null,
      replace_image: false,
      event_date: null,
      music_track_id: null,
      is_published: true,
      is_public: false,
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).rpcName).toBe("owner_upsert_private_entry_v4");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).rpcName).toBe("owner_upsert_private_entry_v3");
  });

  it("routes article likes and idempotent comments through their dedicated operations", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ ok: true, data: { entry_id: "entry-one", like_count: 1, liked_by_visitor: true } }), ok: true, status: 200 })
      .mockResolvedValueOnce({ json: async () => ({ ok: true, data: { id: "comment-one" } }), ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await togglePrivateEntryLike("visitor-token", "entry-one");
    await postPrivateEntryComment("visitor-token", "entry-one", "A comment", "private", "request-one");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ rpcName: "toggle_private_entry_like" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      rpcName: "post_private_entry_comment",
      args: { comment_visibility: "private", request_id: "request-one" },
    });
  });

  it("loads public Tech Notes without a private visitor session", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        data: [{ id: "public-tech", kind: "tech", image_url: null }],
        files: {},
      }),
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);

    const notes = await loadPublicTechnicalNotes();

    expect(notes[0]).toMatchObject({ id: "public-tech", is_public: true, comments: [] });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ action: "public-content" });
  });
});
