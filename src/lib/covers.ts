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
  "Flow",
  "Weave",
  "Plasma",
  "Fractal",
  "Moiré",
  "Stars",
  "Hatch",
  "Mandala",
  "Circuit",
  "Barcode",
  "Blocks",
  "Harmonograph",
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

export type CoverParams = Record<string, number>;

/** Everything that decides a cover. Without a seed, the title is the seed. */
export type CoverLook = {
  style: number;
  palette: CoverPalette;
  seed?: number;
  params?: CoverParams;
};

/**
 * A post's `cover` front matter: a style name, or a style with its seed,
 * palette (1-based) and any knob values.
 */
export type CoverSpec = string | Record<string, string | number>;

function parseSpec(cover?: CoverSpec) {
  if (typeof cover !== "object") return { style: cover, params: {} };
  const { style, seed, palette, ...rest } = cover;
  const params: CoverParams = {};
  for (const [k, v] of Object.entries(rest))
    if (Number.isFinite(Number(v))) params[k] = Number(v);
  return {
    style: style === undefined ? undefined : String(style),
    seed: seed === undefined ? undefined : Number(seed),
    palette: palette === undefined ? undefined : Number(palette),
    params,
  };
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const styleIndex = (name?: string) =>
  COVER_STYLES.findIndex((s) => s.toLowerCase() === name?.toLowerCase());

/** The look a title gets on its own, before neighbor rules. */
export function lookFor(title: string, cover?: CoverSpec): CoverLook {
  const { style: name, seed, palette, params } = parseSpec(cover);
  const pinnedStyle = styleIndex(name);
  const pinnedPalette = COVER_PALETTES[(palette ?? 0) - 1];
  return {
    style:
      pinnedStyle >= 0
        ? pinnedStyle
        : hash(`${title}#style`) % COVER_STYLES.length,
    palette:
      pinnedPalette ??
      COVER_PALETTES[hash(`${title}#pal`) % COVER_PALETTES.length],
    seed,
    params,
  };
}

/** Front matter that reproduces a look exactly. */
export function coverFrontMatter(look: CoverLook, seed: number): string {
  const lines = [
    "cover:",
    `  style: ${COVER_STYLES[look.style].toLowerCase()}`,
    `  seed: ${seed}`,
    `  palette: ${COVER_PALETTES.indexOf(look.palette) + 1}`,
  ];
  for (const [k, v] of Object.entries(look.params ?? {}))
    lines.push(`  ${k}: ${Number(v.toFixed(4))}`);
  return lines.join("\n");
}

/**
 * Looks for a list of posts in order. Neighbors never share a style or a
 * palette: on a clash, step to the next one (pinned styles stay put).
 */
export function assignLooks(
  posts: { title: string; cover?: CoverSpec }[],
): CoverLook[] {
  let prevStyle = -1;
  let prevPalette = -1;
  return posts.map(({ title, cover }) => {
    const own = lookFor(title, cover);
    const pinned = parseSpec(cover);
    let style = own.style;
    let palette = COVER_PALETTES.indexOf(own.palette);
    if (style === prevStyle && styleIndex(pinned.style) < 0)
      style = (style + 1) % COVER_STYLES.length;
    if (palette === prevPalette && !pinned.palette)
      palette = (palette + 1) % COVER_PALETTES.length;
    prevStyle = style;
    prevPalette = palette;
    return { ...own, style, palette: COVER_PALETTES[palette] };
  });
}

type Field = { value: (x: number, y: number) => number; binary: boolean };

/** A 1-bit raster for styles that draw strokes rather than fields. */
class Mask {
  readonly bits: Uint8Array;
  constructor(
    readonly W: number,
    readonly H: number,
  ) {
    this.bits = new Uint8Array(W * H);
  }
  dot(x: number, y: number) {
    const ix = Math.round(x),
      iy = Math.round(y);
    if (ix >= 0 && ix < this.W && iy >= 0 && iy < this.H)
      this.bits[iy * this.W + ix] = 1;
  }
  line(x0: number, y0: number, x1: number, y1: number) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= steps; i++)
      this.dot(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps);
  }
  disc(cx: number, cy: number, r: number) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r + 0.5) this.dot(cx + x, cy + y);
  }
  field(): Field {
    return { binary: true, value: (x, y) => this.bits[y * this.W + x] };
  }
}

/** A tunable setting of a style, reported by `coverKnobs`. */
export type CoverKnob = {
  name: string;
  min: number;
  max: number;
  /** 0 for continuous, 1 for whole numbers. */
  step: number;
  value: number;
};

const TAU = Math.PI * 2;

/**
 * Per-pixel value in [0, 1]. Binary styles threshold at 0.5; the rest dither.
 * Every setting is a knob: an override from `params` if there is one, else a
 * value drawn from the seed. Knobs always consume their random draw, so
 * changing one leaves everything else where it was.
 */
function field(
  seed: number,
  style: number,
  W: number,
  H: number,
  params: CoverParams = {},
  report?: CoverKnob[],
): Field {
  const r = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const knob = (name: string, min: number, max: number, step = 0) => {
    const drawn = min + r() * (max - min);
    let v = params[name] ?? drawn;
    if (step) v = Math.round(v / step) * step;
    v = Math.min(max, Math.max(min, v));
    report?.push({ name, min, max, step, value: v });
    return v;
  };
  const int = (name: string, min: number, max: number) =>
    knob(name, min, max, 1);

  switch (COVER_STYLES[style]) {
    case "Waves": {
      const f1 = knob("rings", 3, 9),
        f2 = knob("wobble", 0, 7),
        lobes = int("lobes", 1, 6),
        a = knob("angle", 0, TAU);
      const cx = knob("x", 0, 1) * W,
        cy = knob("y", 0, 1) * H;
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
                Math.hypot(dx, dy) * f1 * 6 +
                  Math.sin(t * lobes + a) * f2 * 0.5,
              )
          );
        },
      };
    }
    case "Ridges": {
      const k = int("ridges", 3, 16),
        height = knob("height", 0.05, 0.4),
        width = knob("width", 0.02, 0.15),
        peaks = int("peaks", 1, 4);
      const ridges = Array.from({ length: k }, (_, j) => ({
        y0: H * (0.22 + (j * 0.72) / k),
        peaks: Array.from({ length: peaks }, () => ({
          c: 0.1 + r() * 0.8,
          w: width * (0.5 + r()),
        })),
        amp: H * height * (0.3 + r() * 0.7),
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
      const n = int("centers", 1, 5),
        freq = knob("frequency", 4, 30),
        spread = knob("spread", 0, 0.6);
      const centers = Array.from({ length: n }, () => ({
        x: r() * W,
        y: r() * H,
        f: (freq * (1 - spread / 2 + r() * spread)) / H,
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
      const s = Math.max(4, Math.round(H / knob("tiles", 2, 10))),
        w = s * knob("thickness", 0.04, 0.3),
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
      const s = Math.max(3, Math.round(H / knob("tiles", 3, 16))),
        w = knob("thickness", 0.6, 3),
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
          return (flip ? Math.abs(lx - ly) : Math.abs(lx + ly - (s - 1))) < w
            ? 1
            : 0;
        },
      };
    }
    case "Contours": {
      const n = int("hills", 1, 9),
        size = knob("size", 0.15, 1),
        bands = knob("lines", 2, 16),
        line = knob("thickness", 0.06, 0.5);
      const blobs = Array.from({ length: n }, () => ({
        x: r() * W,
        y: r() * H,
        rad: H * size * (0.4 + r() * 0.6),
        a: r() < 0.3 ? -1 : 1,
      }));
      return {
        binary: true,
        value: (x, y) => {
          let f = 0;
          for (const b of blobs)
            f +=
              b.a *
              Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (b.rad * b.rad));
          return f * bands - Math.floor(f * bands) < line ? 1 : 0;
        },
      };
    }
    case "Cells": {
      const n = int("cells", 3, 40),
        border = knob("border", 0.6, 4),
        fill = knob("fill", 0, 0.7);
      const pts = Array.from({ length: n }, () => ({
        x: r() * W,
        y: r() * H,
        level: [0.12, 0.38, 0.62][Math.floor(r() * 3)] * (fill / 0.62),
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
          return d2 - d1 < border ? 1 : pts[k].level;
        },
      };
    }
    case "Automaton": {
      const rules = [30, 45, 54, 60, 73, 90, 105, 110, 126, 150, 182];
      const rule = rules[int("rule", 0, rules.length - 1)];
      const c = int("cell", 1, 5),
        density = knob("density", 0.02, 0.98),
        cols = Math.ceil(W / c),
        rows = Math.ceil(H / c);
      const grid: number[][] = [
        Array.from({ length: cols }, () => (r() < density ? 1 : 0)),
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
      const s = Math.max(3, Math.round(H / knob("dots", 4, 20))),
        a = knob("angle", 0, TAU),
        f = knob("frequency", 0.5, 8),
        size = knob("size", 0.3, 0.9);
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
          return Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < k * s * size ? 1 : 0;
        },
      };
    }
    case "Stripes": {
      const ang = knob("angle", 0, Math.PI),
        f = knob("stripes", 3, 20) / H,
        amp = H * knob("wobble", 0, 0.3),
        g = knob("waves", 0.5, 5) / H,
        cut = knob("weight", -0.8, 0.8),
        ph = r() * TAU;
      return {
        binary: true,
        value: (x, y) => {
          const u = x * Math.cos(ang) + y * Math.sin(ang);
          const v = -x * Math.sin(ang) + y * Math.cos(ang);
          return Math.sin((u + Math.sin(v * g * TAU + ph) * amp) * f * TAU) >
            cut
            ? 1
            : 0;
        },
      };
    }
    case "Life": {
      const c = int("cell", 1, 5),
        density = knob("density", 0.1, 0.7),
        gens = int("generations", 1, 24),
        cols = Math.ceil(W / c),
        rows = Math.ceil(H / c);
      let g: number[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => (r() < density ? 1 : 0)),
      );
      for (let k = 0; k < gens; k++) {
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
    case "Spiral": {
      const arms = int("arms", 1, 9),
        twist = knob("twist", 0, 40) / H,
        fade = knob("fade", 0, 1);
      const cx = knob("x", 0, 1) * W,
        cy = knob("y", 0, 1) * H;
      return {
        binary: false,
        value: (x, y) => {
          const d = Math.hypot(x - cx, y - cy),
            t = Math.atan2(y - cy, x - cx);
          return (
            (0.5 + 0.5 * Math.sin(arms * t + d * twist)) *
            Math.min(1, 1 - fade * 0.65 + (d / H) * fade)
          );
        },
      };
    }
    case "Flow": {
      // Particles traced along a smooth angle field.
      const m = new Mask(W, H);
      const scale = knob("scale", 0.5, 6),
        turn = knob("turn", 0.3, 4),
        density = knob("density", 0.2, 3),
        len = knob("length", 5, 150),
        a = r() * TAU,
        ratio = 0.5 + r();
      const f1 = scale / H,
        f2 = (scale * ratio) / H;
      const angle = (x: number, y: number) =>
        (Math.sin(x * f1 * TAU + a) +
          Math.cos(y * f2 * TAU - a) +
          Math.sin((x + y) * f1 * 3)) *
        turn;
      const n = Math.round(((W * H) / 180) * density);
      for (let i = 0; i < n; i++) {
        let x = r() * W,
          y = r() * H;
        const l = len * (0.4 + r() * 0.6);
        for (let k = 0; k < l; k++) {
          m.dot(x, y);
          const t = angle(x, y);
          x += Math.cos(t);
          y += Math.sin(t);
        }
      }
      return m.field();
    }
    case "Weave": {
      // Over-under threads; each crossing shades whichever thread is on top.
      const t = Math.max(4, Math.round(H / knob("threads", 3, 14))),
        gap = Math.max(0, Math.round(t * knob("gap", 0, 0.35))),
        twill = int("twill", 1, 3);
      return {
        binary: false,
        value: (x, y) => {
          const cx = Math.floor(x / t),
            cy = Math.floor(y / t);
          const lx = x - cx * t,
            ly = y - cy * t;
          const inV = lx >= gap && lx < t - gap,
            inH = ly >= gap && ly < t - gap;
          if (!inV && !inH) return 0;
          const verticalOnTop =
            Math.floor((((cx + cy) % (2 * twill)) + 2 * twill) / twill) % 2 ===
            0;
          const across = verticalOnTop || !inH ? (inV ? lx : ly) : ly;
          const shade =
            0.3 +
            0.65 * Math.sin((Math.PI * (across - gap + 0.5)) / (t - 2 * gap));
          return (inV && inH ? verticalOnTop : inV) ? shade : shade * 0.75;
        },
      };
    }
    case "Plasma": {
      // Old-school demo plasma, banded into a few tones.
      const scale = knob("scale", 0.5, 10),
        bands = int("bands", 2, 8);
      const f = [0, 1, 2, 3].map(() => (scale * (0.4 + r() * 1.2)) / H),
        cx = r() * W,
        cy = r() * H;
      return {
        binary: false,
        value: (x, y) => {
          const v =
            Math.sin(x * f[0] * TAU) +
            Math.sin(y * f[1] * TAU) +
            Math.sin((x + y) * f[2] * 4) +
            Math.sin(Math.hypot(x - cx, y - cy) * f[3] * TAU);
          return Math.round(((v + 4) / 8) * bands) / bands;
        },
      };
    }
    case "Fractal": {
      // Bitwise fractals: Sierpinski triangles (x & y), XOR carpets or
      // multiplication tables, tiled every 2^tile cells.
      const mode = int("mode", 0, 2),
        sc = int("scale", 1, 4),
        bits = (1 << int("tile", 4, 8)) - 1,
        k = [3, 5, 7, 11, 13][int("modulus", 0, 4)],
        sh = int("shift", 2, 7);
      const ox = Math.floor(knob("x", 0, 1) * 256),
        oy = Math.floor(knob("y", 0, 1) * 256);
      return {
        binary: true,
        value: (x, y) => {
          const X = (Math.floor(x / sc) + ox) & bits,
            Y = (Math.floor(y / sc) + oy) & bits;
          if (mode === 0) return (X & Y) === 0 ? 1 : 0;
          if (mode === 1) return (X ^ Y) % k === 0 ? 1 : 0;
          return ((X * Y) >> sh) & 1;
        },
      };
    }
    case "Moiré": {
      // Two gratings a few degrees apart; their XOR makes the interference.
      const a = knob("angle", 0, Math.PI),
        d = knob("offset", 0.005, 0.25),
        f = knob("lines", 6, 40) / H,
        circles = int("circles", 0, 1);
      const cx = knob("x", 0, 1) * W,
        cy = knob("y", 0, 1) * H;
      const grate = (x: number, y: number, ang: number) =>
        Math.sin((x * Math.cos(ang) + y * Math.sin(ang)) * f * TAU) > 0;
      return {
        binary: true,
        value: (x, y) => {
          const g1 = circles
            ? Math.sin(Math.hypot(x - cx, y - cy) * f * TAU) > 0
            : grate(x, y, a);
          return g1 !== grate(x, y, a + d) ? 1 : 0;
        },
      };
    }
    case "Stars": {
      // A starfield, a few bright crosses, and constellations joining nearby stars.
      const m = new Mask(W, H);
      const density = knob("density", 5, 80),
        bright = knob("bright", 0, 0.1),
        groups = int("constellations", 0, 8),
        reach = knob("reach", 0.2, 1);
      const stars = Array.from(
        { length: Math.round((W * H * density) / 1000) },
        () => ({ x: r() * W, y: r() * H, b: r() }),
      );
      for (const s of stars) {
        m.dot(s.x, s.y);
        if (s.b < bright) {
          const l = 2 + Math.floor(r() * 3);
          m.line(s.x - l, s.y, s.x + l, s.y);
          m.line(s.x, s.y - l, s.x, s.y + l);
        }
      }
      for (let c = 0; c < groups; c++) {
        let x = r() * W,
          y = r() * H;
        for (let k = 0; k < 3 + Math.floor(r() * 4); k++) {
          const nx = Math.max(2, Math.min(W - 3, x + (r() - 0.5) * H * reach));
          const ny = Math.max(2, Math.min(H - 3, y + (r() - 0.5) * H * reach));
          m.line(x, y, nx, ny);
          m.disc(nx, ny, 1);
          x = nx;
          y = ny;
        }
      }
      return m.field();
    }
    case "Hatch": {
      // Pen-plotter crosshatching: more line families where the field is darker.
      const p = int("spacing", 2, 8),
        n = int("shapes", 1, 9),
        size = knob("size", 0.08, 0.7),
        dark = knob("darkness", 0.3, 2);
      const blobs = Array.from({ length: n }, () => ({
        x: r() * W,
        y: r() * H,
        rad: H * size * (0.5 + r() * 0.8),
        w: r() < 0.3 ? -0.6 : 1,
      }));
      return {
        binary: true,
        value: (x, y) => {
          let v = 0;
          for (const b of blobs)
            v +=
              b.w *
              Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (b.rad * b.rad));
          v *= dark;
          if (v > 0.1 && (x + y) % p === 0) return 1;
          if (v > 0.35 && (((x - y) % p) + p) % p === 0) return 1;
          if (v > 0.6 && y % p === 0) return 1;
          if (v > 0.85 && x % p === 0) return 1;
          return 0;
        },
      };
    }
    case "Mandala": {
      // Polar coordinates folded into k mirrored wedges.
      const k = int("wedges", 3, 18),
        f1 = knob("rings", 4, 40) / H,
        f2 = knob("petals", 0.5, 8),
        amp = knob("bend", 0, 5);
      const cx = knob("x", 0.2, 0.8) * W,
        cy = H / 2;
      return {
        binary: false,
        value: (x, y) => {
          const d = Math.hypot(x - cx, y - cy);
          const wedge = TAU / k;
          const t = Math.abs(
            (((Math.atan2(y - cy, x - cx) % wedge) + wedge) % wedge) -
              wedge / 2,
          );
          return (
            0.5 +
            0.5 *
              Math.sin(d * f1 + Math.cos(t * k * f2) * amp) *
              Math.cos(t * f2 * 4 - d * f1 * 0.3)
          );
        },
      };
    }
    case "Circuit": {
      // Traces on a grid that turn in 45° steps and end in pads.
      const m = new Mask(W, H);
      const g = int("grid", 2, 9),
        density = knob("density", 0.2, 3),
        segs = int("turns", 1, 8),
        pad = int("pads", 0, 3);
      const dirs = [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [1, -1],
      ];
      const traces = Math.round((10 + (W * H) / 900) * density);
      for (let i = 0; i < traces; i++) {
        let x = Math.floor((r() * W) / g) * g,
          y = Math.floor((r() * H) / g) * g;
        let dir = Math.floor(r() * 4) * 2;
        if (pad) m.disc(x, y, pad);
        for (let sgm = 0; sgm < segs; sgm++) {
          const len = (2 + Math.floor(r() * 6)) * g;
          const [dx, dy] = dirs[dir];
          const nx = x + dx * len,
            ny = y + dy * len;
          m.line(x, y, nx, ny);
          x = nx;
          y = ny;
          dir = (dir + (r() < 0.5 ? 1 : 7)) % 8;
        }
        if (pad) {
          m.disc(x, y, pad);
          // Drill hole.
          const hx = Math.round(x),
            hy = Math.round(y);
          if (pad > 1 && hx >= 0 && hx < W && hy >= 0 && hy < H)
            m.bits[hy * W + hx] = 0;
        }
      }
      return m.field();
    }
    case "Barcode": {
      // Bars of random widths, sliced into bands that glitch sideways.
      const widest = int("width", 1, 8),
        n = int("bands", 1, 10),
        glitch = knob("glitch", 0, 0.8);
      const bars: number[] = [];
      while (bars.length < W * 2) {
        const w = 1 + Math.floor(r() * widest),
          on = bars.length % 2 === 0 ? 1 : 0;
        for (let i = 0; i < w; i++) bars.push(on);
        if (r() < 0.04) for (let i = 0; i < 6; i++) bars.push(0);
      }
      const bands = Array.from({ length: n }, () => ({
        h: r(),
        shift: Math.floor((r() - 0.5) * W * glitch),
      }));
      const total = bands.reduce((s, b) => s + b.h, 0);
      let acc = 0;
      const edges = bands.map((b) => (acc += (b.h / total) * H));
      return {
        binary: true,
        value: (x, y) => {
          const band = edges.findIndex((e) => y < e);
          return bars[
            (((x + bands[Math.max(0, band)].shift) % bars.length) +
              bars.length) %
              bars.length
          ];
        },
      };
    }
    case "Blocks": {
      // Isometric "tumbling blocks": each hexagon splits into three shaded faces.
      const sz = Math.max(3, H / knob("blocks", 1.5, 10)),
        rot = int("light", 0, 2),
        contrast = knob("contrast", 0.2, 1);
      const tones = [0.5 + 0.4 * contrast, 0.5, 0.5 - 0.38 * contrast];
      return {
        binary: false,
        value: (x, y) => {
          const qf = ((Math.sqrt(3) / 3) * x - y / 3) / sz,
            rf = ((2 / 3) * y) / sz,
            sf = -qf - rf;
          let q = Math.round(qf),
            rr = Math.round(rf);
          const s2 = Math.round(sf);
          const dq = Math.abs(q - qf),
            dr = Math.abs(rr - rf),
            ds = Math.abs(s2 - sf);
          if (dq > dr && dq > ds) q = -rr - s2;
          else if (dr > ds) rr = -q - s2;
          const hx = sz * Math.sqrt(3) * (q + rr / 2),
            hy = sz * 1.5 * rr;
          const deg = (Math.atan2(y - hy, x - hx) * 180) / Math.PI;
          const face =
            deg >= -150 && deg < -30 ? 0 : deg >= -30 && deg < 90 ? 1 : 2;
          return tones[(face + rot) % 3];
        },
      };
    }
    case "Harmonograph": {
      // Two damped pendulums per axis, like the Victorian drawing machine.
      const m = new Mask(W, H);
      const f = [
        int("x1", 1, 6),
        int("x2", 1, 6),
        int("y1", 1, 6),
        int("y2", 1, 6),
      ];
      const detune = knob("detune", 0, 0.05),
        damp = knob("damping", 0.0003, 0.005),
        size = knob("size", 0.1, 0.35);
      const drift = f.map((v) => v + (r() - 0.5) * detune);
      const ph = [0, 1, 2, 3].map(() => r() * TAU);
      const sx = W * size,
        sy = H * size;
      let px = 0,
        py = 0;
      for (let i = 0; i < 9000; i++) {
        const t = i * 0.05,
          e = Math.exp(-damp * i);
        const x =
          W / 2 +
          sx *
            e *
            (Math.sin(drift[0] * t + ph[0]) + Math.sin(drift[1] * t + ph[1]));
        const y =
          H / 2 +
          sy *
            e *
            (Math.sin(drift[2] * t + ph[2]) + Math.sin(drift[3] * t + ph[3]));
        if (i > 0) m.line(px, py, x, y);
        px = x;
        py = y;
      }
      return m.field();
    }
    default:
      return field(seed, 0, W, H, params, report);
  }
}

/** The knobs a style has, with the values this seed and params give them. */
export function coverKnobs(
  style: number,
  seed: number,
  params: CoverParams = {},
): CoverKnob[] {
  const report: CoverKnob[] = [];
  field(seed, style, 24, 12, params, report);
  return report;
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
  const { value, binary } = field(
    look.seed ?? hash(title),
    look.style,
    W,
    H,
    look.params,
  );
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
