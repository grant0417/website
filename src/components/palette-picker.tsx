import { useEffect, useRef, useState } from "react";
import { PALETTES, type Palette } from "@/lib/dither";

const STORAGE_KEY = "gurvis.palette";

/** Palette choice, remembered per browser. */
export function usePalette(
  defaultName: string,
): [Palette, (p: Palette) => void] {
  const [palette, setPalette] = useState(
    () => PALETTES.find((p) => p.name === defaultName) ?? PALETTES[0],
  );

  // Read after mount so the server render and hydration agree.
  useEffect(() => {
    try {
      const saved = PALETTES.find(
        (p) => p.name === localStorage.getItem(STORAGE_KEY),
      );
      if (saved) setPalette(saved);
    } catch {}
  }, []);

  const choose = (p: Palette) => {
    setPalette(p);
    try {
      localStorage.setItem(STORAGE_KEY, p.name);
    } catch {}
  };

  return [palette, choose];
}

/** A cog button that opens the palette swatches. */
export function PaletteMenu({
  palette,
  onChange,
  className = "",
}: {
  palette: Palette;
  onChange: (p: Palette) => void;
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
        <svg
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      {open && (
        <div
          id="palette-menu"
          role="group"
          aria-label="Choose a color palette"
          className="absolute top-full right-0 z-10 mt-2 flex gap-1.5 border-[3px] border-(--fg) bg-(--bg) p-1.5"
        >
          {PALETTES.map((p) => (
            <button
              key={p.name}
              type="button"
              aria-label={`${p.name} palette`}
              aria-pressed={p.name === palette.name}
              onClick={() => onChange(p)}
              className="grid size-10 shrink-0 cursor-pointer grid-cols-2 border-2 border-(--fg) p-0 outline-offset-2 aria-pressed:outline-2 aria-pressed:outline-(--fg)"
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
