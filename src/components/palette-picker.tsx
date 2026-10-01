import { useEffect, useState } from "react";
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

export function PalettePicker({
  palette,
  onChange,
  className = "",
}: {
  palette: Palette;
  onChange: (p: Palette) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Color palette"
      className={`flex gap-1.5 ${className}`}
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
  );
}
