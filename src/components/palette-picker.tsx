import { useEffect, useRef, useState } from "react";
import { DARK, LIGHT, PALETTES, type Palette } from "@/lib/dither";

const STORAGE_KEY = "gurvis.palette";

/**
 * The palette to draw with. With no saved choice it follows the system
 * theme; `chosen` is null in that case so the page can let CSS pick the
 * colors and avoid a flash before hydration.
 */
export function usePalette() {
  const [chosen, setChosen] = useState<Palette | null>(null);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    try {
      const saved = PALETTES.find(
        (p) => p.name === localStorage.getItem(STORAGE_KEY),
      );
      if (saved) setChosen(saved);
    } catch {}
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(query.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const choose = (p: Palette | null) => {
    setChosen(p);
    try {
      if (p) localStorage.setItem(STORAGE_KEY, p.name);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return {
    palette: chosen ?? (systemDark ? DARK : LIGHT),
    chosen,
    choose,
  };
}

// A 12×12 cog, drawn procedurally: eight teeth around a ring with a hole.
const GEAR_PIXELS = (() => {
  const out: [number, number][] = [];
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const dx = x - 5.5;
      const dy = y - 5.5;
      const r = Math.hypot(dx, dy);
      const a = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI / 4);
      const onTooth = Math.min(a, Math.PI / 4 - a) < 0.24;
      if (r >= 2.1 && r <= (onTooth ? 6.1 : 4.6)) out.push([x, y]);
    }
  }
  return out;
})();

function PixelGear() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="size-6"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {GEAR_PIXELS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

const swatch =
  "grid size-10 shrink-0 cursor-pointer grid-cols-2 border-2 border-(--fg) p-0 outline-offset-2 aria-pressed:outline-2 aria-pressed:outline-(--fg)";

/** A cog button that opens the palette swatches. */
export function PaletteMenu({
  chosen,
  onChange,
  className = "",
}: {
  chosen: Palette | null;
  onChange: (p: Palette | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={className}>
      <button
        type="button"
        aria-label="Color palette"
        aria-expanded={open}
        aria-controls="palette-menu"
        onClick={() => setOpen(!open)}
        className="flex size-11 cursor-pointer items-center justify-center border-[3px] border-(--fg) bg-(--bg) text-(--fg) hover:bg-(--fg) hover:text-(--bg) aria-expanded:bg-(--fg) aria-expanded:text-(--bg)"
      >
        <PixelGear />
      </button>
      {open && (
        <div
          id="palette-menu"
          role="group"
          aria-label="Choose a color palette"
          className="absolute top-full right-0 z-10 mt-2 flex gap-1.5 border-[3px] border-(--fg) bg-(--bg) p-1.5"
        >
          <button
            type="button"
            aria-label="Match system theme"
            aria-pressed={chosen === null}
            onClick={() => onChange(null)}
            className={swatch}
          >
            {/* Diagonal split so "auto" reads differently from Light/Dark. */}
            <span
              className="col-span-2"
              style={{
                background: `linear-gradient(135deg, ${LIGHT.bg} 50%, ${DARK.bg} 50%)`,
              }}
            />
          </button>
          {PALETTES.map((p) => (
            <button
              key={p.name}
              type="button"
              aria-label={`${p.name} palette`}
              aria-pressed={p.name === chosen?.name}
              onClick={() => onChange(p)}
              className={swatch}
            >
              <span style={{ background: p.bg }} />
              <span style={{ background: p.fg }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
