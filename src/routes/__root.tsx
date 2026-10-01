import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "description", content: "Grant Gurvis" },
      { name: "theme-color", content: "black" },
      { name: "color-scheme", content: "dark" },
      { name: "darkreader-lock", content: "true" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/images/icon.png" },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Pages set their own <title>; React hoists this one into <head>.
function NotFound() {
  return (
    <main className="bg-zinc-950 min-h-screen flex flex-col justify-center">
      <title>404 - Page not found</title>
      <div className="flex flex-col text-center gap-2">
        <h1 className="text-5xl font-bold text-white">Page not found</h1>
        <Link to="/" className="text-2xl text-white underline">
          {"< Go back to the homepage"}
        </Link>
      </div>
    </main>
  );
}
