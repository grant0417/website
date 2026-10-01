import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

// Workers have no filesystem, so posts are bundled at build time.
const files = import.meta.glob<string>("/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const posts = Object.entries(files).map(([path, contents]) => {
  const id = path.replace(/^\/blog\//, "").replace(/\.md$/, "");
  return { id, ...matter(contents) };
});

export function getSortedPostsData() {
  return posts
    .map(({ id, data }) => ({
      id,
      ...(data as { date: string; title: string }),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllPostIds() {
  return posts.map(({ id }) => ({ post: id }));
}

export async function getPostData(id: string) {
  const post = posts.find((p) => p.id === id);
  if (!post) return undefined;

  const processedContent = await remark().use(html).process(post.content);

  return {
    id,
    contentHtml: processedContent.toString(),
    ...(post.data as { date: string; title: string }),
  };
}
