import { describe, expect, it } from "vitest";
import {
  decodePrivateMediaReference,
  encodePrivateMediaReference,
} from "./privateSpaceApi";

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
