import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDate, getPost } from "@/lib/blog";
import { assignLooks, postColorVars } from "@/lib/covers";
import { Cover } from "@/components/cover";

export const Route = createFileRoute("/blog/$slug")({
  component: Post,
  loader: ({ params }) => getPost({ data: params.slug }),
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return {};
    return {
      meta: [
        { title: `${post.title} · Grant Gurvis` },
        { name: "description", content: post.description },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        ...(post.draft ? [{ name: "robots", content: "noindex" }] : []),
      ],
    };
  },
});

function Post() {
  const { post, all, index } = Route.useLoaderData();
  const looks = assignLooks(all);
  const look = looks[index];
  const older = all[index + 1];

  return (
    <div
      className="blog min-h-screen px-6 pb-24 font-display"
      style={postColorVars(look)}
    >
      <header className="mx-auto flex max-w-[880px] items-center justify-between py-6 text-[15px]">
        <Link to="/blog" className="font-semibold">
          ← Writing
        </Link>
        <Link to="/" className="text-(--muted) hover:text-(--fg)">
          Grant Gurvis
        </Link>
      </header>
      <div className="mx-auto mt-6 max-w-[880px]">
        <Cover title={post.title} look={look} width={330} height={55} />
      </div>
      <main className="mx-auto max-w-[680px]">
        <div className="mt-9 mb-3.5 flex flex-wrap gap-x-[18px] gap-y-2 font-pixel text-[11px] text-(--muted)">
          <span>{formatDate(post.date)}</span>
          <span>{post.minutes} min read</span>
          {post.draft && <span>draft</span>}
          {post.tags.map((tag) => (
            <span key={tag} className="text-(--accent-text)">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="mb-3.5 text-[40px] leading-[1.04] font-extrabold tracking-[-0.01em] [font-stretch:85%] sm:text-[52px] sm:leading-[1.02]">
          {post.title}
        </h1>
        {post.description && (
          <p className="mb-11 text-[21px] leading-normal text-(--muted)">
            {post.description}
          </p>
        )}
        <article
          className="prose"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        <nav className="mt-14 grid gap-4 sm:grid-cols-2">
          {older ? (
            <Link
              to="/blog/$slug"
              params={{ slug: older.slug }}
              className="flex items-center gap-3.5 border border-(--rule) p-3.5 hover:border-(--fg)"
            >
              <div className="w-[72px] flex-none">
                <Cover
                  title={older.title}
                  look={looks[index + 1]}
                  width={48}
                  height={24}
                />
              </div>
              <span className="flex flex-col gap-1">
                <span className="font-pixel text-[10px] text-(--muted)">
                  ← Older
                </span>
                <span className="text-base leading-tight font-semibold">
                  {older.title}
                </span>
              </span>
            </Link>
          ) : (
            <span className="max-sm:hidden" />
          )}
          <Link
            to="/blog"
            className="flex flex-col justify-center gap-1 border border-(--rule) p-3.5 text-right hover:border-(--fg)"
          >
            <span className="font-pixel text-[10px] text-(--muted)">
              All writing
            </span>
            <span className="text-base font-semibold">Back to the list →</span>
          </Link>
        </nav>
      </main>
    </div>
  );
}
