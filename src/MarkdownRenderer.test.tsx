import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { extractMarkdownOutline, MarkdownRenderer, transformObsidianMarkdown } from "./MarkdownRenderer";

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

  it("renders raw HTML and script URLs as inert text rather than executable content", () => {
    const { container } = render(
      <MarkdownRenderer
        emptyLabel="Empty"
        source={'<script>window.__xss = true</script>\n\n[bad](javascript:alert(1))'}
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect((window as Window & { __xss?: boolean }).__xss).toBeUndefined();
  });

  it("renders all six heading levels and exposes them for an article outline", () => {
    const source = [
      "# Level one",
      "## Level two",
      "### Level three",
      "#### Level four",
      "##### Level five",
      "###### Level six",
    ].join("\n\n");
    const { container } = render(<MarkdownRenderer emptyLabel="Empty" source={source} />);

    expect(Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6"), (heading) => heading.textContent))
      .toEqual(["Level one", "Level two", "Level three", "Level four", "Level five", "Level six"]);
    expect(extractMarkdownOutline(source).map((item) => [item.level, item.label])).toEqual([
      [1, "Level one"], [2, "Level two"], [3, "Level three"],
      [4, "Level four"], [5, "Level five"], [6, "Level six"],
    ]);
  });
});
