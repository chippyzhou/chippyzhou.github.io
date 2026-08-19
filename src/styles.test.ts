import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("private article typography", () => {
  it("keeps paragraph text on the article body's typeface", () => {
    const paragraphRule = stylesheet.match(/\.archive-entry__body p\s*\{([^}]*)\}/u)?.[1];

    expect(paragraphRule).toContain("font-family: inherit");
  });
});
