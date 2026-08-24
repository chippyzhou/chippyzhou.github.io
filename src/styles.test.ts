import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("private article typography", () => {
  it("keeps paragraph text on the article body's typeface", () => {
    const paragraphRule = stylesheet.match(/\.archive-entry__body p\s*\{([^}]*)\}/u)?.[1];

    expect(paragraphRule).toContain("font-family: inherit");
  });

  it("keeps writing covers prominent and constrains the music playlist grid", () => {
    const writingRule = stylesheet.match(/\.archive-entry--writing:not\(\.is-expanded\)\s*\{([^}]*)\}/u)?.[1];
    const trackListRule = stylesheet.match(/\.music-library-editor__track-list\s*\{([^}]*)\}/u)?.[1];

    expect(writingRule).toContain("grid-template-rows: 190px minmax(0, 1fr)");
    expect(trackListRule).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(trackListRule).toContain("overflow-y: auto");
  });
});
