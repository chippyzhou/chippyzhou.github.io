export type EntryImageSize = "small" | "medium" | "large" | "full";
export type EntryImageAlign = "left" | "center" | "right";

export type EntryImage = {
  id: string;
  src: string;
  size: EntryImageSize;
  align: EntryImageAlign;
  caption: string;
  focusX: number;
  focusY: number;
  isCover: boolean;
};

const mediaEnvelopePrefix = "yuyun-media-v1:";
const imageSizes = new Set<EntryImageSize>(["small", "medium", "large", "full"]);
const imageAlignments = new Set<EntryImageAlign>(["left", "center", "right"]);

function isEntryImage(value: unknown): value is Partial<EntryImage> & Pick<EntryImage, "id" | "src" | "size" | "isCover"> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EntryImage>;
  return typeof candidate.id === "string"
    && typeof candidate.src === "string"
    && typeof candidate.size === "string"
    && imageSizes.has(candidate.size as EntryImageSize)
    && typeof candidate.isCover === "boolean";
}

function clampPercentage(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 50;
}

function normalizeEntryImage(image: Partial<EntryImage> & Pick<EntryImage, "id" | "src" | "size" | "isCover">): EntryImage {
  return {
    id: image.id,
    src: image.src,
    size: image.size,
    align: imageAlignments.has(image.align as EntryImageAlign) ? image.align as EntryImageAlign : "center",
    caption: typeof image.caption === "string" ? image.caption : "",
    focusX: clampPercentage(image.focusX),
    focusY: clampPercentage(image.focusY),
    isCover: image.isCover,
  };
}

export function parseEntryImages(value: string | null): EntryImage[] {
  if (!value) return [];
  if (!value.startsWith(mediaEnvelopePrefix)) {
    return [normalizeEntryImage({
      id: "legacy-cover",
      src: value,
      size: "large",
      isCover: true,
    })];
  }

  try {
    const parsed = JSON.parse(value.slice(mediaEnvelopePrefix.length));
    if (!Array.isArray(parsed)) return [];
    const images = parsed.filter(isEntryImage).map(normalizeEntryImage);
    const firstCover = images.findIndex((image) => image.isCover);
    return images.map((image, index) => ({
      ...image,
      isCover: firstCover >= 0 && index === firstCover,
    }));
  } catch {
    return [];
  }
}

export function serializeEntryImages(images: EntryImage[]): string | null {
  if (images.length === 0) return null;
  const firstCover = images.findIndex((image) => image.isCover);
  const normalized = images.map((image, index) => ({
    ...image,
    isCover: firstCover >= 0 && index === firstCover,
  }));
  return `${mediaEnvelopePrefix}${JSON.stringify(normalized)}`;
}

export function moveEntryImage(images: EntryImage[], imageId: string, targetId: string): EntryImage[] {
  const sourceIndex = images.findIndex((image) => image.id === imageId);
  const targetIndex = images.findIndex((image) => image.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return images;

  const next = [...images];
  const [image] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, image);
  return next;
}

export function markdownPreview(markdown: string, maxLength = 180) {
  const plain = markdown
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/%%[\s\S]*?%%/gu, "")
    .replace(/```[\s\S]*?```/gu, " ")
    .replace(/!\[\[[^\]]+\]\]/gu, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/gu, " ")
    .replace(/\{\{media:[^}]+\}\}/gu, " ")
    .replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/gu, (_match, target: string, alias?: string) => alias || target)
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/^#{1,6}\s+/gmu, "")
    .replace(/^>\s?/gmu, "")
    .replace(/^[-*+]\s+/gmu, "")
    .replace(/^\d+\.\s+/gmu, "")
    .replace(/[*_~=`>#|]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  return plain.length > maxLength ? `${plain.slice(0, maxLength).trimEnd()}...` : plain;
}
