import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import posts from "virtual:blog-posts";

export type PostSummary = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  cover?: string;
  draft: boolean;
  minutes: number;
};

const summarize = ({
  html: _html,
  ...rest
}: (typeof posts)[number]): PostSummary => rest;

// Post bodies stay on the server; the client fetches them per page.
export const listPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PostSummary[]> => posts.map(summarize),
);

export const getPost = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const index = posts.findIndex((p) => p.slug === slug);
    if (index < 0) throw notFound();
    return {
      post: posts[index],
      // Neighbors decide the cover (no two in a row look alike) and the "older" link.
      all: posts.map(summarize),
      index,
    };
  });

export function formatDate(iso: string, style: "short" | "long" = "short") {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: style === "short" ? "short" : "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
