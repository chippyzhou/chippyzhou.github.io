import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer, transformObsidianMarkdown } from "./MarkdownRenderer";

describe("Obsidian Markdown", () => {
  it("transforms Obsidian links, embeds, callouts, highlights, and comments", () => {
    const transformed = transformObsidianMarkdown([
      "> [!note] Field note",
      "> Keep this ==important==.",
      "",
      "Open [[Model notes|the model log]] and ![[figure.png]].",
      "%%private editor comment%%",
    ].join("\n"));

    expect(transformed).toContain("callout://note");
    expect(transformed).toContain("highlight://mark");
    expect(transformed).toContain("wikilink://Model%20notes");
    expect(transformed).toContain("attachment://figure.png");
    expect(transformed).not.toContain("private editor comment");
  });

  it("renders GFM tables, tasks, math, and Obsidian inline syntax", () => {
    const { container } = render(
      <MarkdownRenderer
        emptyLabel="Empty"
        source={[
          "| Model | Score |",
          "| --- | ---: |",
          "| Baseline | 0.91 |",
          "",
          "- [x] Reproduce result",
          "- [ ] Write report",
          "",
          "==Key result== and [[Experiment log]].",
          "",
          "Inline math: $x^2$",
        ].join("\n")}
      />,
    );

    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(container.querySelector("mark")?.textContent).toBe("Key result");
    expect(container.querySelector(".obsidian-wikilink")?.textContent).toBe("Experiment log");
    expect(container.querySelector(".katex")).toBeTruthy();
  });
});
