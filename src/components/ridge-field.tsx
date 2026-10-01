import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { BAYER_8, hexToRgb, type Palette } from "@/lib/dither";

export type RidgeFieldHandle = {
  /** Push a wave out from a day of a week and lift that week's ridge. */
  note: (week: number, day: number, level: number) => void;
};

// Lines render at 2× resolution for smooth motion; the dither pattern is
// sampled at 1× so the texture stays chunky.
const S = 2;
const W = 240 * S;
const H = 110 * S;
const TOP = 18 * S;
const MARGIN_X = 24 * S;

// Wave equation over (column, ridge): speeds along and across the ridges,
// per-substep damping, and a weak spring back to rest.
const SUBSTEPS = 3;
const C_ALONG = 0.24;
const C_ACROSS = 0.1;
const DAMPING = 0.993;
const SPRING = 0.0015;
const MAX_DISPLACEMENT = 14 * S;

/** Each ridge is two weeks: fourteen days smoothed into a mountain profile. */
function ridgeProfiles(weeks: number[][]): Float32Array[] {
  const ridges = Math.ceil(weeks.length / 2);
  return Array.from({ length: ridges }, (_, r) => {
    const a = weeks[r * 2];
    const b = weeks[r * 2 + 1] ?? a;
    const day = (k: number) => (k < 7 ? a[k] : b[Math.min(6, k - 7)]);
    let seed = r * 97 + 13;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const coarse = new Float32Array(W / S);
    for (let x = 0; x < coarse.length; x++) {
      const u = x / (coarse.length - 1);
      const env = Math.exp(-Math.pow((u - 0.5) / 0.26, 2));
      const pos = u * 13;
      const i = Math.floor(pos);
      const frac = pos - i;
      const level = (day(i) * (1 - frac) + day(Math.min(13, i + 1)) * frac) / 4;
      const j = rand();
      coarse[x] =
        env * (level * 0.85 + j * 0.12 * level) + (1 - env) * j * 0.02;
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let x = 1; x < coarse.length - 1; x++)
        coarse[x] = (coarse[x - 1] + coarse[x] * 2 + coarse[x + 1]) / 4;
    }
    // Upsample linearly to render resolution.
    const out = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      const p = Math.min(coarse.length - 1, x / S);
      const i = Math.floor(p);
      const f = p - i;
      out[x] =
        coarse[i] * (1 - f) + coarse[Math.min(coarse.length - 1, i + 1)] * f;
    }
    return out;
  });
}

type Pointer = { x: number; ridge: number };

export function RidgeField({
  weeks,
  palette,
  ref,
}: {
  weeks: number[][];
  palette: Palette;
  ref?: Ref<RidgeFieldHandle>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  const ridgeCount = Math.ceil(weeks.length / 2);
  const step = (H - TOP - 6 * S) / ridgeCount;

  const sim = useRef({
    u: new Float32Array(0),
    v: new Float32Array(0),
    pulse: new Float32Array(0),
    pointer: null as Pointer | null,
    lastPointer: null as Pointer | null,
  });

  /** Add velocity in a soft blob around (x, ridge). */
  const push = (x: number, ridge: number, strength: number, radius: number) => {
    const { v } = sim.current;
    const x0 = Math.max(0, Math.floor(x - radius * 3));
    const x1 = Math.min(W - 1, Math.ceil(x + radius * 3));
    const r0 = Math.max(0, Math.floor(ridge - 2));
    const r1 = Math.min(ridgeCount - 1, Math.ceil(ridge + 2));
    const inv = 1 / (2 * radius * radius);
    for (let r = r0; r <= r1; r++) {
      const dr = r - ridge;
      const across = Math.exp(-(dr * dr) / 1.3);
      for (let cx = x0; cx <= x1; cx++) {
        const dx = cx - x;
        v[r * W + cx] += strength * across * Math.exp(-dx * dx * inv);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    note(week, day, level) {
      const s = sim.current;
      const ridge = Math.floor(week / 2);
      if (ridge < s.pulse.length) s.pulse[ridge] = 1;
      if (day < 0) return;
      const x = MARGIN_X + ((day + 0.5) / 7) * (W - 2 * MARGIN_X);
      push(x, ridge, (1.2 + level * 0.5) * S, 7 * S);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = W;
    canvas.height = H;

    const img = ctx.createImageData(W, H);
    const px = img.data;
    const thresholds = new Float32Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        thresholds[y * W + x] =
          BAYER_8[Math.floor(y / S) & 7][Math.floor(x / S) & 7];

    const profiles = ridgeProfiles(weeks);
    const R = profiles.length;
    const s = sim.current;
    s.u = new Float32Array(R * W);
    s.v = new Float32Array(R * W);
    s.pulse = new Float32Array(R);

    const buf = new Float32Array(W * H);
    const sinX = new Float32Array(W);
    const cosY = new Float32Array(H);
    const amp = step * 6;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const simulate = () => {
      const { u, v } = s;
      for (let k = 0; k < SUBSTEPS; k++) {
        for (let r = 0; r < R; r++) {
          const up = r > 0 ? -W : 0;
          const down = r < R - 1 ? W : 0;
          for (let x = 0; x < W; x++) {
            const i = r * W + x;
            const left = x > 0 ? u[i - 1] : u[i];
            const right = x < W - 1 ? u[i + 1] : u[i];
            const lap =
              C_ALONG * (left + right - 2 * u[i]) +
              C_ACROSS * (u[i + up] + u[i + down] - 2 * u[i]);
            v[i] = (v[i] + lap - SPRING * u[i]) * DAMPING;
          }
        }
        for (let i = 0; i < u.length; i++) {
          const next = u[i] + v[i];
          u[i] =
            next > MAX_DISPLACEMENT
              ? MAX_DISPLACEMENT
              : next < -MAX_DISPLACEMENT
                ? -MAX_DISPLACEMENT
                : next;
        }
      }
    };

    // Drag along the whole path since last frame so fast moves stay continuous.
    const dragForce = () => {
      const cur = s.pointer;
      const prev = s.lastPointer;
      s.lastPointer = cur;
      if (!cur || !prev) return;
      const dx = cur.x - prev.x;
      const dr = (cur.ridge - prev.ridge) * step;
      const dist = Math.hypot(dx, dr);
      if (dist < 0.5) return;
      const samples = Math.max(1, Math.ceil(dist / (3 * S)));
      const strength = Math.min(dist * 0.02, 1.4) / samples;
      for (let k = 1; k <= samples; k++) {
        const f = k / samples;
        push(
          prev.x + dx * f,
          prev.ridge + (cur.ridge - prev.ridge) * f,
          -strength * S,
          5 * S,
        );
      }
    };

    let raf = 0;
    let t = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      t += 0.015;
      const drift = reduceMotion ? 0 : t;

      dragForce();
      simulate();

      for (let x = 0; x < W; x++) sinX[x] = Math.sin((x / S) * 0.045 + drift);
      for (let y = 0; y < H; y++)
        cosY[y] = Math.cos((y / S) * 0.07 - drift * 0.6);
      for (let y = 0; y < H; y++) {
        const row = y * W;
        const c = cosY[y];
        for (let x = 0; x < W; x++) buf[row + x] = 0.12 + 0.1 * sinX[x] * c;
      }

      const { u } = s;
      for (let r = 0; r < R; r++) {
        s.pulse[r] *= 0.965;
        const y0 = TOP + r * step;
        const boost = 1 + s.pulse[r] * 0.9;
        const thickness = s.pulse[r] > 0.25 ? 2 * S : S;
        const profile = profiles[r];
        const base = Math.min(H - 1, Math.round(y0) + S);
        const wobblePhase = drift + r * 0.3;
        for (let x = 0; x < W; x++) {
          const h =
            profile[x] * amp * boost +
            Math.sin((x / S) * 0.03 + wobblePhase) * 0.8 * S +
            u[r * W + x];
          const crest = Math.round(y0 - h);
          // Fill below the crest so nearer ridges hide the ones behind them.
          for (let y = Math.max(0, crest + 1); y <= base; y++)
            buf[y * W + x] = 0;
          for (
            let y = Math.max(0, crest - thickness + 1);
            y <= crest && y < H;
            y++
          )
            buf[y * W + x] = 1;
        }
      }

      const fg = hexToRgb(paletteRef.current.fg);
      const bg = hexToRgb(paletteRef.current.bg);
      for (let i = 0; i < W * H; i++) {
        const c = buf[i] > thresholds[i] ? fg : bg;
        px[i * 4] = c[0];
        px[i * 4 + 1] = c[1];
        px[i * 4 + 2] = c[2];
        px[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    tick();
    return () => cancelAnimationFrame(raf);
    // `push` only touches refs, so it doesn't need to restart the loop.
  }, [weeks, step]);

  const track = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    sim.current.pointer = {
      x,
      ridge: Math.max(-1, Math.min(ridgeCount, (y - TOP) / step)),
    };
  };
  const release = () => {
    sim.current.pointer = null;
    sim.current.lastPointer = null;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerMove={track}
      onPointerDown={track}
      onPointerLeave={release}
      onPointerCancel={release}
      className="block h-auto w-full touch-pan-y [image-rendering:pixelated]"
      aria-label="Dithered ridgelines drawn from my last year of commits. Drag across them to make waves; each note of the music sends one too."
    />
  );
}
