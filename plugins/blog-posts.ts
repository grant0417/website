/**
 * Vite plugin: compiles blog/*.md at build time into `virtual:blog-posts`,
 * so the Worker ships finished HTML and no Markdown tooling.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { highlight } from "sugar-high";
import type { Plugin } from "vite";

const VIRTUAL_ID = "virtual:blog-posts";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export type CompiledPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  /** A style name, or `{ style, seed, palette, ...knobs }`. */
  cover?: string | Record<string, string | number>;
  draft: boolean;
  minutes: number;
  html: string;
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** `{4,6-8}` in a code fence's meta → the set of lines to highlight. */
function highlightedLines(meta: string | null | undefined): Set<number> {
  const out = new Set<number>();
  const match = meta?.match(/\{([\d,\s-]+)\}/);
  for (const part of match?.[1].split(",") ?? []) {
    const [a, b] = part.trim().split("-").map(Number);
    for (let n = a; n <= (b || a); n++) out.add(n);
  }
  return out;
}

// Highlightable languages; anything else renders as plain text.
const CODE_LANGS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "javascript",
  "typescript",
  "json",
  "css",
  "html",
  "rust",
  "rs",
  "go",
  "py",
  "python",
  "sh",
  "bash",
]);

/** Code fences → highlighted blocks with line numbers. */
function remarkCode() {
  return (tree: any) => {
    visit(tree, "code", (node: any, index, parent: any) => {
      const lang = (node.lang ?? "").toLowerCase();
      const marked = highlightedLines(node.meta);
      const lines = (
        CODE_LANGS.has(lang) ? highlight(node.value) : escapeHtml(node.value)
      ).split("\n");
      const body = lines
        .map(
          (line, i) =>
            `<span class="line${marked.has(i + 1) ? " hl" : ""}"><span class="ln">${i + 1}</span>${line}</span>`,
        )
        .join("");
      parent.children[index!] = {
        type: "html",
        value: `<div class="code" data-lang="${escapeHtml(lang)}"><pre><code>${body}</code></pre></div>`,
      };
    });
  };
}

/** A paragraph holding only an image → <figure>, with its title as the caption. */
function remarkFigures() {
  return (tree: any) => {
    visit(tree, "paragraph", (node: any, index, parent: any) => {
      if (node.children.length !== 1 || node.children[0].type !== "image")
        return;
      const { url, alt, title } = node.children[0];
      const caption = title
        ? `<figcaption>${escapeHtml(title)}</figcaption>`
        : "";
      parent.children[index!] = {
        type: "html",
        value: `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(alt ?? "")}" loading="lazy">${caption}</figure>`,
      };
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkCode)
  .use(remarkFigures)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

function compile(file: string): CompiledPost {
  const { data, content } = matter(readFileSync(file, "utf8"));
  const words = content.split(/\s+/).filter(Boolean).length;
  const date =
    data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : String(data.date ?? "");
  return {
    slug: path.basename(file, ".md"),
    title: String(data.title ?? path.basename(file, ".md")),
    description: String(data.description ?? ""),
    date,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    cover:
      data.cover && typeof data.cover === "object"
        ? data.cover
        : data.cover
          ? String(data.cover)
          : undefined,
    draft: Boolean(data.draft),
    minutes: Math.max(1, Math.round(words / 230)),
    html: String(processor.processSync(content)),
  };
}

export function blogPosts(dir = "blog"): Plugin {
  let includeDrafts = false;
  return {
    name: "blog-posts",
    configResolved(config) {
      includeDrafts = config.command === "serve";
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const root = path.resolve(dir);
      const files = readdirSync(root).filter((f) => f.endsWith(".md"));
      const posts = files
        .map((f) => {
          const file = path.join(root, f);
          this.addWatchFile(file);
          return compile(file);
        })
        .filter((p) => includeDrafts || !p.draft)
        .sort((a, b) => b.date.localeCompare(a.date));
      return `export default ${JSON.stringify(posts)};`;
    },
  };
}
