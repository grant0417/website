import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDate, listPosts, type PostSummary } from "@/lib/blog";
import { assignLooks, postColorVars, type CoverLook } from "@/lib/covers";
import { Cover } from "@/components/cover";

export const Route = createFileRoute("/blog/")({
  component: Blog,
  loader: () => listPosts(),
  head: () => ({
    meta: [
      { title: "Writing · Grant Gurvis" },
      { name: "description", content: "Notes on building things." },
    ],
    links: [
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Grant Gurvis",
        href: "/rss.xml",
      },
    ],
  }),
});

function Meta({ post }: { post: PostSummary }) {
  return (
    <span className="font-pixel text-[11px] text-(--muted)">
      {formatDate(post.date)} · {post.minutes} min
      {post.draft && " · draft"}
      {post.tags.length > 0 && (
        <>
          {" · "}
          <span className="text-(--accent-text)">{post.tags.join(" · ")}</span>
        </>
      )}
    </span>
  );
}

function Featured({ post, look }: { post: PostSummary; look: CoverLook }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group grid items-center gap-8 border-b border-(--rule) pb-10 sm:grid-cols-[1.25fr_1fr]"
      style={postColorVars(look)}
    >
      <Cover title={post.title} look={look} width={256} height={128} />
      <div className="flex flex-col gap-2.5">
        <span className="font-pixel text-[11px] text-(--muted)">Latest</span>
        <Meta post={post} />
        <h2 className="m-0 text-[34px] leading-[1.08] font-extrabold [font-stretch:88%] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-[5px]">
          {post.title}
        </h2>
        {post.description && (
          <p className="m-0 text-[17px] leading-normal text-(--muted)">
            {post.description}
          </p>
        )}
      </div>
    </Link>
  );
}

function Row({ post, look }: { post: PostSummary; look: CoverLook }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group grid grid-cols-[112px_1fr] items-center gap-5 border-b border-(--rule) py-[22px] sm:grid-cols-[168px_1fr] sm:gap-7"
      style={postColorVars(look)}
    >
      <Cover title={post.title} look={look} width={168} height={84} />
      <div className="flex flex-col gap-1.5">
        <Meta post={post} />
        <h2 className="m-0 text-[22px] leading-[1.18] font-bold [font-stretch:92%] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-[5px] sm:text-2xl">
          {post.title}
        </h2>
        {post.description && (
          <p className="m-0 text-base leading-normal text-(--muted) max-sm:hidden">
            {post.description}
          </p>
        )}
      </div>
    </Link>
  );
}

function Blog() {
  const posts = Route.useLoaderData();
  const looks = assignLooks(posts);

  return (
    <div className="blog min-h-screen px-6 pb-24 font-display">
      <main className="mx-auto flex max-w-[960px] flex-col">
        <header className="flex items-center justify-between py-6 text-[15px]">
          <Link to="/" className="font-semibold">
            Grant Gurvis
          </Link>
          <a href="/rss.xml" className="text-(--muted) hover:text-(--fg)">
            RSS
          </a>
        </header>
        <h1 className="mt-12 mb-2.5 text-[56px] leading-none font-extrabold [font-stretch:85%]">
          Writing
        </h1>
        <p className="mb-10 text-lg leading-normal text-(--muted)">
          Notes on building things.
        </p>
        {posts.length === 0 ? (
          <p className="border-t border-(--rule) py-10 text-(--muted)">
            Nothing here yet.
          </p>
        ) : (
          <>
            <Featured post={posts[0]} look={looks[0]} />
            {posts.slice(1).map((post, i) => (
              <Row key={post.slug} post={post} look={looks[i + 1]} />
            ))}
          </>
        )}
      </main>
    </div>
  );
}
