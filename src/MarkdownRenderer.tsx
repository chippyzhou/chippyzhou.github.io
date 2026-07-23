import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

const customProtocols = ["callout://", "highlight://", "wikilink://", "attachment://"];

function customUrlTransform(url: string) {
  return customProtocols.some((protocol) => url.startsWith(protocol))
    ? url
    : defaultUrlTransform(url);
}

function encodeTarget(value: string) {
  return encodeURIComponent(value.trim());
}

export function transformObsidianMarkdown(source: string) {
  return source
    .replace(/%%[\s\S]*?%%/g, "")
    .replace(
      /!\[\[(https?:\/\/[^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_, url: string, alt?: string) => `![${alt || "Embedded image"}](${url})`,
    )
    .replace(
      /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_, target: string, label?: string) => `[${label || target}](attachment://${encodeTarget(target)})`,
    )
    .replace(
      /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
      (_, target: string, label: string) => `[${label}](wikilink://${encodeTarget(target)})`,
    )
    .replace(
      /\[\[([^\]]+)\]\]/g,
      (_, target: string) => `[${target}](wikilink://${encodeTarget(target)})`,
    )
    .replace(
      /^>\s*\[!([a-zA-Z-]+)\][+-]?\s*(.*)$/gm,
      (_, kind: string, title: string) => `> [${kind.toUpperCase()}](callout://${kind.toLowerCase()})${title ? ` **${title}**` : ""}`,
    )
    .replace(/==([^=\n]+)==/g, "[$1](highlight://mark)");
}

const components: Components = {
  a({ href = "", children, ...props }) {
    if (href.startsWith("highlight://")) {
      return <mark>{children}</mark>;
    }
    if (href.startsWith("wikilink://")) {
      const target = decodeURIComponent(href.slice("wikilink://".length));
      return <span className="obsidian-wikilink" title={`[[${target}]]`}>{children}</span>;
    }
    if (href.startsWith("attachment://")) {
      const target = decodeURIComponent(href.slice("attachment://".length));
      return <span className="obsidian-attachment" title={target}>{children}</span>;
    }
    if (href.startsWith("callout://")) {
      const kind = href.slice("callout://".length);
      return <span className="obsidian-callout__badge" data-callout={kind}>{children}</span>;
    }
    const isExternal = /^https?:\/\//.test(href);
    return <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer" : undefined} {...props}>{children}</a>;
  },
  img({ src, alt }) {
    return <img src={src} alt={alt || ""} loading="lazy" />;
  },
};

export function MarkdownRenderer({ source, emptyLabel }: { source: string; emptyLabel: string }) {
  if (!source.trim()) return <p className="markdown-empty">{emptyLabel}</p>;

  return (
    <ReactMarkdown
      components={components}
      remarkPlugins={[remarkFrontmatter, remarkGfm, remarkBreaks, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      urlTransform={customUrlTransform}
    >
      {transformObsidianMarkdown(source)}
    </ReactMarkdown>
  );
}
