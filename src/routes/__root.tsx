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
      { name: "color-scheme", content: "light dark" },
      { name: "darkreader-lock", content: "true" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Silkscreen&display=swap",
      },
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
    <main className="flex min-h-screen flex-col items-start justify-end gap-6 bg-[#0E0E0E] p-[clamp(20px,4vw,56px)] font-display text-[#E8E6E0]">
      <title>404 - Page not found</title>
      <span className="font-pixel text-sm">404</span>
      <h1 className="m-0 text-[clamp(72px,12vw,200px)] leading-[0.8] font-black uppercase [font-stretch:62%]">
        Page not found
      </h1>
      <Link
        to="/"
        className="border-[3px] border-[#E8E6E0] px-4 py-3 font-pixel text-base hover:bg-[#E8E6E0] hover:text-[#0E0E0E]"
      >
        ← Back home
      </Link>
    </main>
  );
}
