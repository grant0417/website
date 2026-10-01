import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/")({
  component: Blog,
  head: () => ({ meta: [{ title: "Grant Gurvis" }] }),
});

const BLOG_POSTS = [
  {
    title: "Cracking Electron apps open",
    date: "Jul 03, 2023",
    tags: ["electron", "rust", "asar"],
    description:
      "I use the draw.io desktop app to make diagrams for my website. I run it on an actual desktop, like Windows or macOS, but the asset pipeline that converts .drawio files, to .pdf, to .svg, and then to .svg again (but smaller) runs on Linux.",
    href: "/blog/cracking-electron-apps-open",
  },
  {
    title: "The RustConf Keynote Fiasco, explained",
    date: "May 31, 2023",
    tags: ["rust", "governance"],
    description:
      "Disclosure: At some point in this article, I discuss The Rust Foundation. I have received a $5000 grant from them in 2023 for making educational articles and videos about Rust.",
    href: "/blog/the-rustconf-keynote-fiasco-explained",
  },
  {
    title: "Rust: The wrong people are resigning",
    date: "May 28, 2023",
    tags: ["rust", "governance"],
    description:
      "(Note: this was originally posted as a gist) Reassuring myself about Rust",
    href: "/blog/rust-the-wrong-people-are-resigning",
  },
];

function BlogPost({
  title,
  date,
  tags,
  description,
}: {
  title: string;
  date: string;
  tags: string[];
  description: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-2xl font-bold">{title}</h3>
      <div className="flex flex-row gap-3 text-zinc-400">
        <span>{date}</span>
        <span>
          {tags.map((tag, i) => (
            <span key={tag}>
              {tag}
              {i !== tags.length - 1 && ", "}
            </span>
          ))}
        </span>
      </div>
      <p className="">{description}</p>
    </div>
  );
}

function Blog() {
  return (
    <div className="flex flex-col gap-8 max-w-2xl px-1 mx-auto py-4">
      <h1 className="text-4xl font-bold">{"Grant's Blog"}</h1>
      <div className="flex flex-col gap-6">
        {BLOG_POSTS.map((post, i) => (
          <BlogPost key={i} {...post} />
        ))}
      </div>
    </div>
  );
}
