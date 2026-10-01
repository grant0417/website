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
    case "Spiral": {
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
    case "Flow": {
      // Particles traced along a smooth angle field.
      const m = new Mask(W, H);
      const f1 = (1.5 + r() * 3) / H,
        f2 = (1.5 + r() * 3) / H,
        a = r() * 6.28,
        turn = 1 + r() * 2;
      const angle = (x: number, y: number) =>
        (Math.sin(x * f1 * 6.28 + a) +
          Math.cos(y * f2 * 6.28 - a) +
          Math.sin((x + y) * f1 * 3)) *
        turn;
      const n = Math.round((W * H) / 180);
      for (let i = 0; i < n; i++) {
        let x = r() * W,
          y = r() * H;
        const len = 20 + r() * 60;
        for (let k = 0; k < len; k++) {
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
      const t = Math.max(6, Math.round(H / (5 + r() * 6))),
        gap = Math.max(1, Math.round(t * 0.18));
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
          const verticalOnTop = (cx + cy) % 2 === 0;
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
      const f = [0, 1, 2, 3].map(() => (2 + r() * 6) / H),
        cx = r() * W,
        cy = r() * H,
        bands = 3 + Math.floor(r() * 3);
      return {
        binary: false,
        value: (x, y) => {
          const v =
            Math.sin(x * f[0] * 6.28) +
            Math.sin(y * f[1] * 6.28) +
            Math.sin((x + y) * f[2] * 4) +
            Math.sin(Math.hypot(x - cx, y - cy) * f[3] * 6.28);
          return Math.round(((v + 4) / 8) * bands) / bands;
        },
      };
    }
    case "Fractal": {
      // Bitwise fractals: Sierpinski triangles (x & y), XOR carpets or
      // multiplication tables, tiled every 64 or 128 cells.
      const sc = 1 + Math.floor(r() * 2);
      const bits = r() < 0.5 ? 63 : 127;
      const ox = Math.floor(r() * 128),
        oy = Math.floor(r() * 128);
      const mode = Math.floor(r() * 3),
        k = [3, 5, 7, 11][Math.floor(r() * 4)],
        sh = 3 + Math.floor(r() * 3);
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
      const a = r() * 3.14,
        d = 0.03 + r() * 0.12,
        f = (14 + r() * 18) / H,
        circles = r() < 0.4;
      const cx = r() * W,
        cy = r() * H;
      const grate = (x: number, y: number, ang: number) =>
        Math.sin((x * Math.cos(ang) + y * Math.sin(ang)) * f * 6.28) > 0;
      return {
        binary: true,
        value: (x, y) => {
          const g1 = circles
            ? Math.sin(Math.hypot(x - cx, y - cy) * f * 6.28) > 0
            : grate(x, y, a);
          return g1 !== grate(x, y, a + d) ? 1 : 0;
        },
      };
    }
    case "Stars": {
      // A starfield, a few bright crosses, and constellations joining nearby stars.
      const m = new Mask(W, H);
      const stars = Array.from({ length: Math.round((W * H) / 30) }, () => ({
        x: r() * W,
        y: r() * H,
        b: r(),
      }));
      for (const s of stars) {
        m.dot(s.x, s.y);
        if (s.b > 0.97) {
          const l = 2 + Math.floor(r() * 3);
          m.line(s.x - l, s.y, s.x + l, s.y);
          m.line(s.x, s.y - l, s.x, s.y + l);
        }
      }
      for (let c = 0; c < 2 + Math.floor(r() * 3); c++) {
        let x = r() * W,
          y = r() * H;
        for (let k = 0; k < 3 + Math.floor(r() * 4); k++) {
          const nx = Math.max(2, Math.min(W - 3, x + (r() - 0.5) * H * 0.6));
          const ny = Math.max(2, Math.min(H - 3, y + (r() - 0.5) * H * 0.6));
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
      const blobs = Array.from({ length: 5 }, () => ({
        x: r() * W,
        y: r() * H,
        rad: H * (0.15 + r() * 0.3),
        w: r() < 0.3 ? -0.6 : 1,
      }));
      const p = 3 + Math.floor(r() * 3);
      return {
        binary: true,
        value: (x, y) => {
          let v = 0;
          for (const b of blobs)
            v +=
              b.w *
              Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (b.rad * b.rad));
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
      const cx = W / 2 + (r() - 0.5) * W * 0.3,
        cy = H / 2;
      const k = 6 + Math.floor(r() * 7),
        f1 = (10 + r() * 20) / H,
        f2 = 2 + r() * 6,
        amp = 1 + r() * 3;
      return {
        binary: false,
        value: (x, y) => {
          const d = Math.hypot(x - cx, y - cy);
          const wedge = (Math.PI * 2) / k;
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
      const g = 4 + Math.floor(r() * 3);
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
      const traces = 10 + Math.floor((W * H) / 900);
      for (let i = 0; i < traces; i++) {
        let x = Math.floor((r() * W) / g) * g,
          y = Math.floor((r() * H) / g) * g;
        let dir = Math.floor(r() * 4) * 2;
        m.disc(x, y, 2);
        const segs = 2 + Math.floor(r() * 4);
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
        m.disc(x, y, 2);
        m.bits[Math.round(y) * W + Math.round(x)] = 0; // drill hole
      }
      return m.field();
    }
    case "Barcode": {
      // Bars of random widths, sliced into bands that glitch sideways.
      const bars: number[] = [];
      while (bars.length < W * 2) {
        const w = 1 + Math.floor(r() * 4),
          on = bars.length % 2 === 0 ? 1 : 0;
        for (let i = 0; i < w; i++) bars.push(on);
        if (r() < 0.04) for (let i = 0; i < 6; i++) bars.push(0);
      }
      const bands = Array.from({ length: 3 + Math.floor(r() * 5) }, () => ({
        h: r(),
        shift: Math.floor((r() - 0.5) * W * 0.4),
      }));
      const total = bands.reduce((s, b) => s + b.h, 0);
      let acc = 0;
      const edges = bands.map((b) => (acc += (b.h / total) * H));
      return {
        binary: true,
        value: (x, y) => {
          const band = edges.findIndex((e) => y < e);
          return bars[(x + bands[Math.max(0, band)].shift + W) % bars.length];
        },
      };
    }
    case "Blocks": {
      // Isometric "tumbling blocks": each hexagon splits into three shaded faces.
      const sz = Math.max(5, H / (3 + r() * 4)),
        tones = [0.9, 0.5, 0.12];
      const rot = Math.floor(r() * 3);
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
      const f = [0, 1, 2, 3].map(
        () => 1 + Math.floor(r() * 4) + (r() - 0.5) * 0.02,
      );
      const ph = [0, 1, 2, 3].map(() => r() * 6.28),
        damp = 0.0015 + r() * 0.002;
      const sx = W * 0.23,
        sy = H * 0.23;
      let px = 0,
        py = 0;
      for (let i = 0; i < 9000; i++) {
        const t = i * 0.05,
          e = Math.exp(-damp * i);
        const x =
          W / 2 +
          sx * e * (Math.sin(f[0] * t + ph[0]) + Math.sin(f[1] * t + ph[1]));
        const y =
          H / 2 +
          sy * e * (Math.sin(f[2] * t + ph[2]) + Math.sin(f[3] * t + ph[3]));
        if (i > 0) m.line(px, py, x, y);
        px = x;
        py = y;
      }
      return m.field();
    }
    default:
      return field(title, 0, W, H);
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
