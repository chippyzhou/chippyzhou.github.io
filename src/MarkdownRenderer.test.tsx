import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { extractMarkdownOutline, MarkdownRenderer, normalizeLatexDelimiters, transformObsidianMarkdown } from "./MarkdownRenderer";

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

  it("renders bracket-delimited LaTeX blocks pasted into the editor", () => {
    const source = String.raw`\[
\boxed{
\begin{aligned}
\mathcal{F}(\theta)
&=\lim_{N\to\infty}\sum_{n=1}^{N}\frac{(-1)^{n+1}}{n^\alpha}
+\det\!\begin{pmatrix}a_{11}&a_{12}\\a_{21}&a_{22}\end{pmatrix}
+\left\|\mathbf{y}-\sum_{k=1}^{K}\sigma(\mathbf{W}_k\mathbf{x}+\mathbf{b}_k)\right\|_2^2
\\
&\quad+\begin{cases}
\dfrac{\Gamma(\alpha+1)}{\sqrt{2\pi\sigma^2}}\exp\!\left(-\dfrac{(x-\mu)^2}{2\sigma^2}\right),&x\ge0,\\
\displaystyle\sum_{j=0}^{\infty}\dfrac{(-1)^j x^{2j+1}}{(2j+1)!},&x<0.
\end{cases}
\end{aligned}
}
\]`;
    const { container } = render(<MarkdownRenderer emptyLabel="Empty" source={source} />);

    expect(normalizeLatexDelimiters(source)).toMatch(/^\$\$/u);
    expect(container.querySelector(".katex-display")).toBeTruthy();
    expect(container.querySelector(".katex-error")).toBeNull();
  });

  it("leaves LaTeX delimiters inside fenced code blocks untouched", () => {
    const source = "```tex\n\\[x^2\\]\n```";
    expect(normalizeLatexDelimiters(source)).toBe(source);
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
