import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  COVER_PALETTES,
  COVER_STYLES,
  drawCover,
  lookFor,
  type CoverLook,
} from "@/lib/covers";

// Unlinked on purpose: a workbench for previewing and saving covers.
export const Route = createFileRoute("/blog/covers")({
  component: Covers,
  head: () => ({
    meta: [
      { title: "Covers · Grant Gurvis" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const W = 240;
const H = 120;
const EXPORT_SCALE = 5; // 1200×600, the usual social card size

const EXAMPLES = [
  "Turning a year of commits into music",
  "Falling sand in a few hundred lines",
  "Ordered dithering, explained with a homepage",
  "Moving my site to TanStack Start on Workers",
  "A 5×7 pixel font, one string per glyph",
  "Scraping my own contribution graph",
  "Why the waves were glitchy",
  "Picking colors that survive dark mode",
  "Web Audio without the cat on a piano",
  "Testing a sandbox with fourteen asserts",
  "A pixel cog in 144 squares",
  "Two colors are enough",
];

function Tile({
  index,
  title,
  palette,
}: {
  index: number;
  title: string;
  palette: number | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const look: CoverLook = {
    style: index,
    palette:
      palette === null ? lookFor(title).palette : COVER_PALETTES[palette],
  };

  useEffect(() => {
    if (ref.current) drawCover(ref.current, title, look, W, H);
  }, [title, index, look.palette]);

  const download = () => {
    const canvas = document.createElement("canvas");
    drawCover(canvas, title, look, W, H, EXPORT_SCALE);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${COVER_STYLES[index].toLowerCase()}-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-2.5">
      <canvas
        ref={ref}
        className="block w-full [image-rendering:pixelated]"
        style={{ aspectRatio: `${W} / ${H}`, background: look.palette.bg }}
        aria-label={`${COVER_STYLES[index]} cover for “${title}”`}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="font-pixel text-xs">
          {String(index + 1).padStart(2, "0")} · {COVER_STYLES[index]}
        </span>
        <button
          type="button"
          onClick={download}
          className="min-h-9 cursor-pointer border border-(--rule) px-2.5 font-pixel text-[11px] text-(--muted) hover:border-(--fg) hover:text-(--fg)"
        >
          PNG ↓
        </button>
      </div>
      <span className="text-[15px] leading-snug text-(--muted)">{title}</span>
    </div>
  );
}

function Covers() {
  const [custom, setCustom] = useState("");
  const [palette, setPalette] = useState<number | null>(null);

  return (
    <div className="blog min-h-screen px-6 py-12 font-display sm:px-12">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[34px] font-extrabold [font-stretch:88%]">
            Cover styles
          </h1>
          <p className="m-0 max-w-[70ch] text-base text-(--muted)">
            Every post's cover comes from its title: a style, a palette and the
            style's settings. Type a title to preview it in all twelve styles,
            and save any as a 1200×600 PNG.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-[min(100%,420px)] flex-[1_1_420px] flex-col gap-1.5">
            <span className="font-pixel text-[11px] text-(--muted)">Title</span>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Leave empty to see example titles"
              className="min-h-11 border border-(--rule) bg-transparent px-3 text-base outline-none focus:border-(--fg)"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="font-pixel text-[11px] text-(--muted)">
              Palette
            </span>
            <div role="group" aria-label="Palette" className="flex gap-1.5">
              <button
                type="button"
                aria-pressed={palette === null}
                onClick={() => setPalette(null)}
                className="min-h-11 cursor-pointer border border-(--rule) px-3 font-pixel text-[11px] aria-pressed:border-(--fg)"
              >
                From title
              </button>
              {COVER_PALETTES.map((p, i) => (
                <button
                  key={p.fg + p.bg}
                  type="button"
                  aria-label={`Palette ${i + 1}`}
                  aria-pressed={palette === i}
                  onClick={() => setPalette(i)}
                  className="grid size-11 cursor-pointer grid-cols-2 border border-(--rule) p-0 aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-(--fg)"
                >
                  <span style={{ background: p.bg }} />
                  <span style={{ background: p.fg }} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-x-6 gap-y-8">
          {COVER_STYLES.map((_, i) => (
            <Tile
              key={i}
              index={i}
              title={custom.trim() || EXAMPLES[i]}
              palette={palette}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
