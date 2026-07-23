import { describe, expect, it } from "vitest";
import {
  markdownPreview,
  moveEntryImage,
  parseEntryImages,
  serializeEntryImages,
  type EntryImage,
} from "./privateEntryMedia";

const images: EntryImage[] = [
  {
    id: "one",
    src: "data:image/webp;base64,one",
    size: "small",
    align: "left",
    caption: "First image",
    focusX: 50,
    focusY: 50,
    isCover: false,
  },
  {
    id: "two",
    src: "data:image/webp;base64,two",
    size: "full",
    align: "center",
    caption: "",
    focusX: 27,
    focusY: 68,
    isCover: true,
  },
];

describe("private entry media", () => {
  it("round-trips multiple images and preserves one cover", () => {
    expect(parseEntryImages(serializeEntryImages(images))).toEqual(images);
  });

  it("keeps old single-image articles compatible", () => {
    expect(parseEntryImages("https://example.com/cover.jpg")).toEqual([
      {
        id: "legacy-cover",
        src: "https://example.com/cover.jpg",
        size: "large",
        align: "center",
        caption: "",
        focusX: 50,
        focusY: 50,
        isCover: true,
      },
    ]);
  });

  it("adds centered crop and layout defaults to old media envelopes", () => {
    const legacyEnvelope = `yuyun-media-v1:${JSON.stringify([{
      id: "old",
      src: "data:image/webp;base64,old",
      size: "medium",
      isCover: true,
    }])}`;

    expect(parseEntryImages(legacyEnvelope)[0]).toMatchObject({
      align: "center",
      caption: "",
      focusX: 50,
      focusY: 50,
    });
  });

  it("reorders images without changing their layout settings", () => {
    expect(moveEntryImage(images, "two", "one").map((image) => image.id)).toEqual(["two", "one"]);
  });

  it("creates a compact plain-text preview from Markdown", () => {
    expect(markdownPreview("# Heading\n\nA **useful** [[note|summary]].")).toBe("Heading A useful summary.");
  });
});
