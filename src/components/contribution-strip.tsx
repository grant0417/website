import { useState } from "react";
import type { Day } from "@/lib/contributions";

const LEVEL_OPACITY = [0.08, 0.25, 0.45, 0.7, 1];
/** Row height and gap, in px. The play button matches the strip's height. */
export const STRIP_HEIGHT = 7 * 6 + 6 * 2;

function describe(day: Day) {
  const date = new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const n = day.count;
  return `${n === 0 ? "No" : n.toLocaleString("en-US")} contribution${n === 1 ? "" : "s"} on ${date}`;
}

/** The contribution calendar as a strip, with the playing week lit up. */
export function ContributionStrip({
  weeks,
  days,
  playhead,
  className = "",
}: {
  weeks: number[][];
  days: (Day | null)[][];
  playhead: number;
  className?: string;
}) {
  const [hover, setHover] = useState<{ w: number; d: number } | null>(null);
  const hovered = hover && days[hover.w]?.[hover.d];

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        className="grid grid-flow-col grid-rows-[repeat(7,6px)] gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
        }}
        onPointerLeave={() => setHover(null)}
        aria-hidden="true"
      >
        {weeks.flatMap((levels, w) =>
          levels.map((level, d) => (
            <span
              key={`${w}-${d}`}
              onPointerEnter={() => setHover({ w, d })}
              className="bg-(--fg)"
              style={{
                opacity:
                  w === playhead || (hover?.w === w && hover.d === d)
                    ? 1
                    : LEVEL_OPACITY[level] *
                      (playhead >= 0 && w > playhead ? 0.5 : 1),
              }}
            />
          )),
        )}
      </div>
      {hover && hovered && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full z-10 mb-2 border-2 border-(--fg) bg-(--bg) px-2 py-1 font-pixel text-xs whitespace-nowrap"
          style={{
            left: `${((hover.w + 0.5) / weeks.length) * 100}%`,
            // Keep the tooltip inside the strip near either end.
            transform: `translateX(${hover.w < weeks.length * 0.15 ? "-10%" : hover.w > weeks.length * 0.85 ? "-90%" : "-50%"})`,
          }}
        >
          {describe(hovered)}
        </div>
      )}
    </div>
  );
}
