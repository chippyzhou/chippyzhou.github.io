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

  it("restores visible list markers inside article Markdown", () => {
    const markerRules = Array.from(stylesheet.matchAll(/\.archive-entry__body (?:ul(?: ul(?: ul)?)?|ol)\s*\{([^}]*)\}/gu), (match) => match[1]);

    expect(markerRules).toContainEqual(expect.stringContaining("list-style: disc"));
    expect(markerRules).toContainEqual(expect.stringContaining("list-style: circle"));
    expect(markerRules).toContainEqual(expect.stringContaining("list-style: decimal"));
  });

  it("keeps the editor entry list within the editor workspace height", () => {
    const entryListRule = stylesheet.match(/\.space-editor__entries\s*\{([^}]*)\}/u)?.[1];

    expect(entryListRule).toContain("height: min(720px, calc(100dvh - 160px))");
    expect(entryListRule).toContain("overflow-y: auto");
  });

  it("uses the shared editorial serif for the personal-space wordmark", () => {
    const wordmarkRule = stylesheet.match(/\.site--band \.site-name__yuyun,\s*\.site--band \.site-name__chen\s*\{([^}]*)\}/u)?.[1];

    expect(wordmarkRule).toContain('"Newsreader Variable"');
    expect(wordmarkRule).not.toContain("Comic Sans");
  });
});
