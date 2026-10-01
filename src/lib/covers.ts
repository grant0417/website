/**
 * Generative post covers. A post's title picks a style, a palette and the
 * style's parameters, so every cover is different but stable over time.
 */
import { BAYER_8, hexToRgb } from "@/lib/dither";

export const COVER_STYLES = [
  "Waves",
  "Ridges",
  "Rings",
  "Truchet",
  "Maze",
  "Contours",
  "Cells",
  "Automaton",
  "Halftone",
  "Stripes",
  "Life",
  "Spiral",
] as const;
export type CoverStyle = (typeof COVER_STYLES)[number];

export type CoverPalette = { bg: string; fg: string };

export const COVER_PALETTES: CoverPalette[] = [
  { bg: "#1B1B3A", fg: "#FF7A3D" },
  { bg: "#9BBC0F", fg: "#0F380F" },
  { bg: "#E8EDFF", fg: "#1F3BFF" },
  { bg: "#FFF1E6", fg: "#C2410C" },
  { bg: "#0B3D2E", fg: "#7CE3A1" },
  { bg: "#2A0F2E", fg: "#FF8AD8" },
  { bg: "#111111", fg: "#F2F2EE" },
  { bg: "#FFF8D6", fg: "#5B3A00" },
];

export type CoverLook = { style: number; palette: CoverPalette };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The look a title gets on its own, before neighbor rules. */
export function lookFor(title: string, pinned?: string): CoverLook {
  const pinnedStyle = COVER_STYLES.findIndex(
    (s) => s.toLowerCase() === pinned?.toLowerCase(),
  );
  return {
    style:
      pinnedStyle >= 0
        ? pinnedStyle
        : hash(`${title}#style`) % COVER_STYLES.length,
    palette: COVER_PALETTES[hash(`${title}#pal`) % COVER_PALETTES.length],
  };
}

/**
 * Looks for a list of posts in order. Neighbors never share a style or a
 * palette: on a clash, step to the next one (pinned styles stay put).
 */
export function assignLooks(
  posts: { title: string; cover?: string }[],
): CoverLook[] {
  let prevStyle = -1;
  let prevPalette = -1;
  return posts.map(({ title, cover }) => {
    const own = lookFor(title, cover);
    let style = own.style;
    let palette = COVER_PALETTES.indexOf(own.palette);
    if (style === prevStyle && !cover)
      style = (style + 1) % COVER_STYLES.length;
    if (palette === prevPalette)
      palette = (palette + 1) % COVER_PALETTES.length;
    prevStyle = style;
    prevPalette = palette;
    return { style, palette: COVER_PALETTES[palette] };
  });
}

type Field = { value: (x: number, y: number) => number; binary: boolean };

/** Per-pixel value in [0, 1]. Binary styles threshold at 0.5; the rest dither. */
function field(title: string, style: number, W: number, H: number): Field {
  let seed = hash(title);
  const r = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  switch (COVER_STYLES[style]) {
    case "Waves": {
      const a = r() * 6.28,
        f1 = 3 + r() * 6,
        f2 = 2 + r() * 5;
      const cx = (0.2 + r() * 0.6) * W,
        cy = (0.2 + r() * 0.6) * H;
      return {
        binary: false,
        value: (x, y) => {
          const dx = (x - cx) / H,
            dy = (y - cy) / H;
          const t = Math.atan2(dy, dx);
          return (
            0.5 +
            0.5 *
              Math.sin(
                Math.hypot(dx, dy) * f1 * 6 + Math.sin(t * 3 + a) * f2 * 0.5,
              )
          );
        },
      };
    }
    case "Ridges": {
      const k = 7 + Math.floor(r() * 6);
      const ridges = Array.from({ length: k }, (_, j) => ({
        y0: H * (0.22 + (j * 0.72) / k),
        peaks: [0, 1, 2].map(() => ({
          c: 0.1 + r() * 0.8,
          w: 0.04 + r() * 0.08,
        })),
        amp: H * (0.08 + r() * 0.22),
      }));
      return {
        binary: false,
        value: (x, y) => {
          let v = 0.07;
          for (const g of ridges) {
            let h = 0;
            g.peaks.forEach((p, i) => {
              h +=
                Math.exp(-Math.pow((x / W - p.c) / p.w, 2)) *
                (i === 0 ? 1 : 0.55);
            });
            const crest = g.y0 - h * g.amp;
            // Later ridges sit in front and hide the ones behind them.
            if (Math.abs(y - crest) < 0.8) v = 1;
            else if (y > crest && y <= g.y0 + 1) v = 0;
          }
          return v;
        },
      };
    }
    case "Rings": {
      const centers = Array.from({ length: 1 + Math.floor(r() * 3) }, () => ({
        x: r() * W,
        y: r() * H,
        f: (8 + r() * 14) / H,
      }));
      return {
        binary: false,
        value: (x, y) => {
          let s = 0;
          for (const c of centers)
            s += Math.cos(Math.hypot(x - c.x, y - c.y) * c.f * 2);
          return 0.5 + 0.5 * (s / centers.length);
        },
      };
    }
    case "Truchet": {
      const s = Math.max(6, Math.round(H / (3 + r() * 4)));
      const w = s * 0.13,
        sd = seed;
      return {
        binary: true,
        value: (x, y) => {
          const tx = Math.floor(x / s),
            ty = Math.floor(y / s);
          const lx = x - tx * s + 0.5,
            ly = y - ty * s + 0.5;
          const flip =
            ((Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663) ^ sd) >>> 0) %
            2;
          const d1 = flip ? Math.hypot(lx, ly) : Math.hypot(lx - s, ly);
          const d2 = flip ? Math.hypot(lx - s, ly - s) : Math.hypot(lx, ly - s);
          return Math.abs(d1 - s / 2) < w || Math.abs(d2 - s / 2) < w ? 1 : 0;
        },
      };
    }
    case "Maze": {
      const s = Math.max(5, Math.round(H / (5 + r() * 6))),
        sd = seed;
      return {
        binary: true,
        value: (x, y) => {
          const tx = Math.floor(x / s),
            ty = Math.floor(y / s);
          const lx = x - tx * s,
            ly = y - ty * s;
          const flip =
            ((Math.imul(tx, 2654435761) ^ Math.imul(ty, 40503) ^ sd) >>> 0) % 2;
          return (flip ? Math.abs(lx - ly) : Math.abs(lx + ly - (s - 1))) < 1.3
            ? 1
            : 0;
        },
      };
    }
    case "Contours": {
      const blobs = Array.from({ length: 5 }, () => ({
        x: r() * W,
        y: r() * H,
        rad: H * (0.3 + r() * 0.7),
        a: r() < 0.3 ? -1 : 1,
      }));
      const bands = 5 + r() * 7;
      return {
        binary: true,
        value: (x, y) => {
          let f = 0;
          for (const b of blobs)
            f +=
              b.a *
              Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (b.rad * b.rad));
          return f * bands - Math.floor(f * bands) < 0.17 ? 1 : 0;
        },
      };
    }
    case "Cells": {
      const pts = Array.from({ length: 8 + Math.floor(r() * 12) }, () => ({
        x: r() * W,
        y: r() * H,
        level: [0.12, 0.38, 0.62][Math.floor(r() * 3)],
      }));
      return {
        binary: false,
        value: (x, y) => {
          let d1 = Infinity,
            d2 = Infinity,
            k = 0;
          pts.forEach((p, i) => {
            const d = Math.hypot(x - p.x, y - p.y);
            if (d < d1) {
              d2 = d1;
              d1 = d;
              k = i;
            } else if (d < d2) d2 = d;
          });
          return d2 - d1 < 1.4 ? 1 : pts[k].level;
        },
      };
    }
    case "Automaton": {
      const rule = [30, 90, 110, 45, 73, 150][Math.floor(r() * 6)];
      const c = 2,
        cols = Math.ceil(W / c),
        rows = Math.ceil(H / c);
      const grid: number[][] = [
        Array.from({ length: cols }, () => (r() < 0.5 ? 1 : 0)),
      ];
      for (let y = 1; y < rows; y++) {
        const p = grid[y - 1];
        grid.push(
          p.map(
            (_, i) =>
              (rule >>
                ((p[(i + cols - 1) % cols] << 2) |
                  (p[i] << 1) |
                  p[(i + 1) % cols])) &
              1,
          ),
        );
      }
      return {
        binary: true,
        value: (x, y) => grid[Math.floor(y / c)][Math.floor(x / c)],
      };
    }
    case "Halftone": {
      const s = Math.max(5, Math.round(H / (7 + r() * 6))),
        a = r() * 6.28,
        f = 2 + r() * 4;
      return {
        binary: true,
        value: (x, y) => {
          const cx = (Math.floor(x / s) + 0.5) * s,
            cy = (Math.floor(y / s) + 0.5) * s;
          const k =
            0.5 +
            0.5 *
              Math.sin(
                ((cx * Math.cos(a) + cy * Math.sin(a)) / H) * f +
                  Math.sin((cy / H) * 3),
              );
          return Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < k * s * 0.62 ? 1 : 0;
        },
      };
    }
    case "Stripes": {
      const ang = r() * 3.14,
        f = (5 + r() * 9) / H,
        g = (1 + r() * 3) / H;
      const amp = H * (0.05 + r() * 0.18),
        ph = r() * 6.28;
      return {
        binary: true,
        value: (x, y) => {
          const u = x * Math.cos(ang) + y * Math.sin(ang);
          const v = -x * Math.sin(ang) + y * Math.cos(ang);
          return Math.sin((u + Math.sin(v * g * 6.28 + ph) * amp) * f * 6.28) >
            0.15
            ? 1
            : 0;
        },
      };
    }
    case "Life": {
      const c = 2,
        cols = Math.ceil(W / c),
        rows = Math.ceil(H / c);
      let g: number[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => (r() < 0.36 ? 1 : 0)),
      );
      for (let k = 0; k < 9; k++) {
        g = g.map((row, y) =>
          row.map((alive, x) => {
            let n = 0;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++)
                if (dx || dy)
                  n += g[(y + dy + rows) % rows][(x + dx + cols) % cols];
            return (alive && (n === 2 || n === 3)) || (!alive && n === 3)
              ? 1
              : 0;
          }),
        );
      }
      return {
        binary: true,
        value: (x, y) => g[Math.floor(y / c)][Math.floor(x / c)],
      };
    }
    default: {
      const cx = (0.25 + r() * 0.5) * W,
        cy = (0.25 + r() * 0.5) * H;
      const arms = 2 + Math.floor(r() * 5),
        twist = (10 + r() * 22) / H;
      return {
        binary: false,
        value: (x, y) => {
          const d = Math.hypot(x - cx, y - cy),
            t = Math.atan2(y - cy, x - cx);
          return (
            (0.5 + 0.5 * Math.sin(arms * t + d * twist)) *
            Math.min(1, 0.35 + d / H)
          );
        },
      };
    }
  }
}

/** Draw a cover into a canvas at W×H pixels (scale it up with CSS or `scale`). */
export function drawCover(
  canvas: HTMLCanvasElement,
  title: string,
  look: CoverLook,
  W: number,
  H: number,
  scale = 1,
) {
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(W, H);
  const { value, binary } = field(title, look.style, W, H);
  const fg = hexToRgb(look.palette.fg);
  const bg = hexToRgb(look.palette.bg);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = value(x, y);
      const on = binary ? v > 0.5 : v > BAYER_8[y & 7][x & 7];
      const c = on ? fg : bg;
      const i = (y * W + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
  }
  if (scale === 1) {
    ctx.putImageData(img, 0, 0);
  } else {
    // Upscale with hard pixel edges, e.g. for a downloadable PNG.
    const small = document.createElement("canvas");
    small.width = W;
    small.height = H;
    small.getContext("2d")!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, W * scale, H * scale);
  }
}

/** Accent colors for a cover palette, picked to stay readable per theme. */
export function accentsFor(palette: CoverPalette) {
  const rgb = (h: string) => hexToRgb(h);
  const lum = (h: string) => {
    const [r, g, b] = rgb(h).map((v) => v / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const chroma = (h: string) => Math.max(...rgb(h)) - Math.min(...rgb(h));
  const [darker, lighter] =
    lum(palette.fg) < lum(palette.bg)
      ? [palette.fg, palette.bg]
      : [palette.bg, palette.fg];
  return {
    /** The palette's most saturated color, for underlines and tints. */
    accent: chroma(palette.fg) >= chroma(palette.bg) ? palette.fg : palette.bg,
    textLight: darker,
    textDark: lighter,
  };
}

const mix = (a: string, b: string, t: number) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `#${A.map((v, i) =>
    Math.round(v * (1 - t) + B[i] * t)
      .toString(16)
      .padStart(2, "0"),
  ).join("")}`;
};

/**
 * CSS custom properties that tint a post with its cover palette. Light and
 * dark variants are both set; the blog stylesheet picks one per theme.
 */
export function postColorVars(look: CoverLook): Record<string, string> {
  const { accent, textLight, textDark } = accentsFor(look.palette);
  return {
    "--accent": accent,
    "--accent-text-l": textLight,
    "--accent-text-d": textDark,
    "--inline-l": mix("#111111", accent, 0.4),
    "--inline-d": mix("#F2F2EE", accent, 0.45),
    "--hl-l": mix("#F4F4F1", accent, 0.14),
    "--hl-d": mix("#111114", accent, 0.18),
  };
}
