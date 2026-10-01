import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getContributions } from "@/lib/contributions";
import { busiestDay, STEP_MS, Synth } from "@/lib/synth";
import { RidgeField, type RidgeFieldHandle } from "@/components/ridge-field";
import { PaletteMenu, usePalette } from "@/components/palette-picker";
import {
  ContributionStrip,
  STRIP_HEIGHT,
} from "@/components/contribution-strip";

export const Route = createFileRoute("/")({
  component: Home,
  loader: () => getContributions(),
  head: () => ({ meta: [{ title: "Grant Gurvis" }] }),
});

function Home() {
  const { weeks, days, total } = Route.useLoaderData();
  const [palette, setPalette] = usePalette("Cobalt");
  const [playing, setPlaying] = useState(false);
  const [week, setWeek] = useState(-1);

  const field = useRef<RidgeFieldHandle>(null);
  const synth = useRef<Synth | null>(null);

  useEffect(() => {
    if (!playing) return;
    let w = week >= weeks.length - 1 ? -1 : week;
    const id = setInterval(() => {
      w = (w + 1) % weeks.length;
      const { day, level } = busiestDay(weeks[w]);
      synth.current?.playWeek(weeks[w], w, "bell");
      field.current?.note(w, day, level);
      setWeek(w);
    }, STEP_MS);
    return () => clearInterval(id);
    // `week` is only the resume point; re-running on every step would reset the timer.
  }, [playing, weeks]);

  useEffect(() => () => synth.current?.close(), []);

  const toggle = () => {
    if (!playing) {
      synth.current ??= new Synth();
      synth.current.start();
    }
    setPlaying(!playing);
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-(--bg) font-display text-(--fg)"
      style={{ "--fg": palette.fg, "--bg": palette.bg } as React.CSSProperties}
    >
      <div className="relative border-b-[3px] border-(--fg)">
        <RidgeField ref={field} weeks={weeks} palette={palette} />
        <div className="border-t-[3px] border-(--fg) bg-(--bg) px-4 pt-3 pb-4 sm:absolute sm:bottom-[clamp(16px,3vw,44px)] sm:left-[clamp(16px,3vw,44px)] sm:border-[3px] sm:px-[22px] sm:pt-4 sm:pb-5">
          <h1 className="m-0 text-[clamp(56px,9vw,150px)] leading-[0.8] font-black uppercase [font-stretch:62%]">
            Grant Gurvis
          </h1>
        </div>
        <PaletteMenu
          palette={palette}
          onChange={setPalette}
          className="absolute top-[clamp(12px,3vw,44px)] right-[clamp(12px,3vw,44px)]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b-[3px] border-(--fg) px-[clamp(16px,3vw,44px)] py-3.5">
        {/* Fixed width keeps the bar from shifting as the label changes. */}
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play my year in commits"}
          className="flex w-28 shrink-0 cursor-pointer items-center justify-center gap-2.5 border-2 border-(--fg) bg-(--fg) font-pixel text-sm text-(--bg)"
          style={{ height: STRIP_HEIGHT }}
        >
          <svg
            viewBox="0 0 12 12"
            className="size-3"
            fill="currentColor"
            aria-hidden="true"
          >
            {playing ? (
              <path d="M1 1h3.5v10H1zM7.5 1H11v10H7.5z" />
            ) : (
              <path d="M2 0.5v11L11 6z" />
            )}
          </svg>
          {playing ? "Pause" : "Play"}
        </button>
        <ContributionStrip
          weeks={weeks}
          days={days}
          playhead={week}
          className="flex-[1_1_360px]"
        />
        {total > 0 && (
          <span className="font-pixel text-[13px] whitespace-nowrap">
            {total.toLocaleString("en-US")} contributions
          </span>
        )}
      </div>

      <div className="grid flex-grow grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        <section className="flex flex-col gap-2.5 p-[clamp(20px,3vw,40px)] sm:col-span-2 sm:border-r-[3px] sm:border-(--fg)">
          <span className="font-pixel text-[13px]">work</span>
          <a
            href="https://hercules.app"
            className="flex justify-between gap-3 border-b border-(--fg) px-1 pt-1 pb-2 text-[22px] hover:bg-(--fg) hover:text-(--bg)"
          >
            <span>
              <b>Hercules</b> · Co-founder &amp; CTO
            </span>
            <span>2025–</span>
          </a>
          <div className="flex justify-between gap-3 border-b border-(--fg) px-1 pt-1 pb-2 text-[22px]">
            <span>
              <b>AWS</b> · Engineer
            </span>
            <span>2023–25</span>
          </div>
          <a
            href="https://techcrunch.com/2023/08/29/amazon-fig-command-line-terminal-generative-ai/"
            className="flex justify-between gap-3 border-b border-(--fg) px-1 pt-1 pb-2 text-[22px] hover:bg-(--fg) hover:text-(--bg)"
          >
            <span>
              <b>Fig</b> · Engineer
            </span>
            <span>2021–23</span>
          </a>
        </section>
        <nav className="flex flex-col items-start gap-1.5 p-[clamp(20px,3vw,40px)] font-pixel text-[17px]">
          <span className="mb-1.5 text-[13px]">elsewhere</span>
          {[
            ["GitHub", "https://github.com/grant0417"],
            ["Twitter", "https://twitter.com/gurgrant"],
            ["LinkedIn", "https://www.linkedin.com/in/grant-gurvis/"],
            ["Email", "mailto:grant@gurvis.net"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="px-1 py-0.5 hover:bg-(--fg) hover:text-(--bg)"
            >
              {label} ↗
            </a>
          ))}
          <Link
            to="/powder"
            className="px-1 py-0.5 hover:bg-(--fg) hover:text-(--bg)"
          >
            Powder →
          </Link>
        </nav>
      </div>
    </div>
  );
}
