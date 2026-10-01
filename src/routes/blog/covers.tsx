import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  COVER_PALETTES,
  COVER_STYLES,
  coverFrontMatter,
  coverKnobs,
  drawCover,
  styleIndex,
  type CoverKnob,
  type CoverLook,
  type CoverParams,
} from "@/lib/covers";

type Search = { style?: string; seed?: number; palette?: number; k?: string };

// Unlinked on purpose: a workbench for tuning covers and saving them.
export const Route = createFileRoute("/blog/covers")({
  component: Covers,
  validateSearch: (s: Record<string, unknown>): Search => ({
    style: typeof s.style === "string" ? s.style : undefined,
    seed: Number.isFinite(Number(s.seed)) ? Number(s.seed) : undefined,
    palette: Number.isFinite(Number(s.palette)) ? Number(s.palette) : undefined,
    k: typeof s.k === "string" ? s.k : undefined,
  }),
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

// The sizes covers are drawn at around the blog.
const USES = [
  { label: "Latest", w: 256, h: 128 },
  { label: "List", w: 168, h: 84 },
  { label: "Post banner", w: 330, h: 55 },
];

const newSeed = () => Math.floor(Math.random() * 1e6);

// Knob values travel in the URL as `name:value,name:value`.
const encodeParams = (p: CoverParams) =>
  Object.entries(p)
    .map(([k, v]) => `${k}:${Number(v.toFixed(4))}`)
    .join(",") || undefined;
const decodeParams = (s?: string): CoverParams =>
  Object.fromEntries(
    (s ?? "")
      .split(",")
      .map((pair) => pair.split(":"))
      .filter(([k, v]) => k && Number.isFinite(Number(v)))
      .map(([k, v]) => [k, Number(v)]),
  );

/** A look nudged at random: a few knobs moved, sometimes a new seed. */
function mutate(knobs: CoverKnob[], params: CoverParams, seed: number) {
  const next = { ...params };
  for (const k of knobs) {
    if (Math.random() > 0.45) continue;
    const span = k.max - k.min;
    let v = k.value + (Math.random() - 0.5) * span * 0.6;
    if (k.step) v = Math.round(v);
    next[k.name] = Math.min(k.max, Math.max(k.min, v));
  }
  return { params: next, seed: Math.random() < 0.3 ? newSeed() : seed };
}

function Canvas({
  look,
  w,
  h,
  label,
}: {
  look: CoverLook;
  w: number;
  h: number;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawCover(ref.current, "", look, w, h);
  }, [look, w, h]);
  return (
    <canvas
      ref={ref}
      aria-label={label}
      className="block w-full [image-rendering:pixelated]"
      style={{ aspectRatio: `${w} / ${h}`, background: look.palette.bg }}
    />
  );
}

function Slider({
  knob,
  pinned,
  onChange,
  onReset,
}: {
  knob: CoverKnob;
  pinned: boolean;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  const step = knob.step || (knob.max - knob.min) / 400;
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-3 font-pixel text-[11px]">
        <span className={pinned ? "" : "text-(--muted)"}>{knob.name}</span>
        <span className="flex items-baseline gap-2">
          <span className="tabular-nums">
            {knob.step ? knob.value : knob.value.toFixed(3)}
          </span>
          {pinned && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onReset();
              }}
              className="cursor-pointer text-(--muted) hover:text-(--fg)"
              aria-label={`Reset ${knob.name} to the seed's value`}
            >
              ×
            </button>
          )}
        </span>
      </span>
      <input
        type="range"
        min={knob.min}
        max={knob.max}
        step={step}
        value={knob.value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-(--fg)"
      />
    </label>
  );
}

const button =
  "min-h-10 cursor-pointer border border-(--rule) px-3 font-pixel text-[11px] hover:border-(--fg)";

function Covers() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // A first visit gets a random seed once it's on the client.
  useEffect(() => {
    if (search.seed === undefined)
      navigate({ search: { ...search, seed: newSeed() }, replace: true });
  }, []);

  const style = Math.max(0, styleIndex(search.style));
  const seed = search.seed ?? 1;
  const paletteIndex = Math.min(
    COVER_PALETTES.length - 1,
    Math.max(0, (search.palette ?? 1) - 1),
  );
  const params = useMemo(() => decodeParams(search.k), [search.k]);

  const look: CoverLook = useMemo(
    () => ({ style, seed, params, palette: COVER_PALETTES[paletteIndex] }),
    [style, seed, params, paletteIndex],
  );
  const knobs = useMemo(
    () => coverKnobs(style, seed, params),
    [style, seed, params],
  );

  const set = (next: {
    style?: number;
    seed?: number;
    palette?: number;
    params?: CoverParams;
  }) =>
    navigate({
      replace: true,
      search: {
        style: COVER_STYLES[next.style ?? style].toLowerCase(),
        seed: next.seed ?? seed,
        palette: (next.palette ?? paletteIndex) + 1,
        k: encodeParams(next.params ?? params),
      },
    });

  const [variations, setVariations] = useState<
    { seed: number; params: CoverParams }[]
  >([]);
  useEffect(() => {
    setVariations(Array.from({ length: 8 }, () => mutate(knobs, params, seed)));
    // New variations when the style changes, not on every knob move.
  }, [style]);

  const gallery = useMemo(
    () =>
      COVER_STYLES.map((_, i) => ({
        style: i,
        seed,
        palette: COVER_PALETTES[paletteIndex],
      })),
    [seed, paletteIndex],
  );

  const [copied, setCopied] = useState(false);
  const yaml = coverFrontMatter(look, seed);
  const copy = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const download = () => {
    const canvas = document.createElement("canvas");
    drawCover(canvas, "", look, W, H, EXPORT_SCALE);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${COVER_STYLES[style].toLowerCase()}-${seed}.png`;
    a.click();
  };

  return (
    <div className="blog min-h-screen px-4 py-10 font-display sm:px-12">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[34px] font-extrabold [font-stretch:88%]">
            Cover styles
          </h1>
          <p className="m-0 max-w-[70ch] text-base text-(--muted)">
            Pick a style and tune its knobs. The seed fills in everything a knob
            doesn't set, like where the stars land. Copy the front matter into a
            post to pin its cover, or save it as a 1200×600 PNG.
          </p>
        </div>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Stays in view on phones while the knobs scroll beneath it. */}
            <div className="z-10 bg-(--bg) max-lg:sticky max-lg:top-0 max-lg:-mx-4 max-lg:px-4 max-lg:py-2">
              <Canvas
                look={look}
                w={W}
                h={H}
                label={`${COVER_STYLES[style]} cover`}
              />
            </div>
            <div className="grid grid-cols-[2fr_1.3fr] items-end gap-4 sm:grid-cols-[2fr_1.3fr_2.6fr]">
              {USES.map((u) => (
                <div
                  key={u.label}
                  className={`flex flex-col gap-1.5 ${u.w > 300 ? "max-sm:col-span-2" : ""}`}
                >
                  <Canvas look={look} w={u.w} h={u.h} />
                  <span className="font-pixel text-[11px] text-(--muted)">
                    {u.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="m-0 text-2xl font-bold [font-stretch:92%]">
                {COVER_STYLES[style]}
              </h2>
              <span className="font-pixel text-[11px] text-(--muted)">
                {String(style + 1).padStart(2, "0")} / {COVER_STYLES.length}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-pixel text-[11px] text-(--muted)">
                Seed
              </span>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => set({ seed: Number(e.target.value) || 0 })}
                  className="min-h-10 w-0 flex-1 border border-(--rule) bg-transparent px-3 font-pixel text-xs tabular-nums outline-none focus:border-(--fg)"
                  aria-label="Seed"
                />
                <button
                  type="button"
                  onClick={() => set({ seed: newSeed() })}
                  className={button}
                  title="New seed, same knobs"
                >
                  Reseed
                </button>
                <button
                  type="button"
                  onClick={() => set({ seed: newSeed(), params: {} })}
                  className={button}
                  title="New seed and fresh knobs"
                >
                  Random
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-pixel text-[11px] text-(--muted)">
                Palette
              </span>
              <div
                role="group"
                aria-label="Palette"
                className="grid grid-cols-8 gap-1.5"
              >
                {COVER_PALETTES.map((p, i) => (
                  <button
                    key={p.fg + p.bg}
                    type="button"
                    aria-label={`Palette ${i + 1}`}
                    aria-pressed={paletteIndex === i}
                    onClick={() => set({ palette: i })}
                    className="grid aspect-square cursor-pointer grid-cols-2 border border-(--rule) p-0 aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-(--fg)"
                  >
                    <span style={{ background: p.bg }} />
                    <span style={{ background: p.fg }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex items-baseline justify-between">
                <span className="font-pixel text-[11px] text-(--muted)">
                  Knobs
                </span>
                {Object.keys(params).length > 0 && (
                  <button
                    type="button"
                    onClick={() => set({ params: {} })}
                    className="cursor-pointer font-pixel text-[11px] text-(--muted) hover:text-(--fg)"
                  >
                    Reset all
                  </button>
                )}
              </div>
              {knobs.map((k) => (
                <Slider
                  key={k.name}
                  knob={k}
                  pinned={k.name in params}
                  onChange={(v) => set({ params: { ...params, [k.name]: v } })}
                  onReset={() => {
                    const { [k.name]: _, ...rest } = params;
                    set({ params: rest });
                  }}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <pre className="m-0 overflow-x-auto bg-(--code-bg) px-3 py-2.5 font-mono text-xs leading-relaxed">
                {yaml}
              </pre>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={copy}
                  className={`${button} flex-1`}
                >
                  {copied ? "Copied" : "Copy front matter"}
                </button>
                <button type="button" onClick={download} className={button}>
                  PNG ↓
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 text-xl font-bold [font-stretch:92%]">
              Variations
            </h2>
            <button
              type="button"
              onClick={() =>
                setVariations(
                  Array.from({ length: 8 }, () => mutate(knobs, params, seed)),
                )
              }
              className={button}
            >
              More
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {variations.map((v, i) => (
              <Variation
                key={i}
                look={{ ...look, seed: v.seed, params: v.params }}
                onPick={() => set({ seed: v.seed, params: v.params })}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-xl font-bold [font-stretch:92%]">
            All styles
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-x-4 gap-y-5">
            {gallery.map((g) => (
              <button
                key={g.style}
                type="button"
                aria-pressed={g.style === style}
                onClick={() => set({ style: g.style, params: {} })}
                className="group flex cursor-pointer flex-col gap-1.5 text-left aria-pressed:outline-2 aria-pressed:outline-offset-4 aria-pressed:outline-(--fg)"
              >
                <Canvas look={g} w={168} h={84} />
                <span className="font-pixel text-[11px] text-(--muted) group-hover:text-(--fg)">
                  {String(g.style + 1).padStart(2, "0")} ·{" "}
                  {COVER_STYLES[g.style]}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Variation({ look, onPick }: { look: CoverLook; onPick: () => void }) {
  const stable = useMemo(() => look, [look.seed, look.params, look.palette]);
  return (
    <button
      type="button"
      onClick={onPick}
      className="cursor-pointer p-0 hover:outline-2 hover:outline-offset-2 hover:outline-(--fg)"
      aria-label="Use this variation"
    >
      <Canvas look={stable} w={W} h={H} />
    </button>
  );
}
