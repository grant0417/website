import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { hexToRgb, thresholdMap, type Palette } from "@/lib/dither";

export type RidgeFieldHandle = {
  /** Ripple out from a day of a week and lift that week's ridge. */
  note: (week: number, day: number, level: number) => void;
};

const W = 240;
const H = 110;
const TOP = 18;
const MARGIN_X = 24;

type Ripple = { x: number; ridge: number; born: number; amp: number };

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
    const out = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const env = Math.exp(-Math.pow((u - 0.5) / 0.26, 2));
      const pos = u * 13;
      const i = Math.floor(pos);
      const frac = pos - i;
      const level = (day(i) * (1 - frac) + day(Math.min(13, i + 1)) * frac) / 4;
      const j = rand();
      out[x] = env * (level * 0.85 + j * 0.12 * level) + (1 - env) * j * 0.02;
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let x = 1; x < W - 1; x++)
        out[x] = (out[x - 1] + out[x] * 2 + out[x + 1]) / 4;
    }
    return out;
  });
}

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
  const state = useRef({
    ripples: [] as Ripple[],
    pulse: new Float32Array(0),
    t: 0,
    lastPoke: 0,
  });

  const ridgeCount = Math.ceil(weeks.length / 2);
  const step = (H - TOP - 6) / ridgeCount;

  useImperativeHandle(ref, () => ({
    note(week, day, level) {
      const s = state.current;
      const ridge = Math.floor(week / 2);
      if (ridge < s.pulse.length) s.pulse[ridge] = 1;
      if (day < 0) return;
      s.ripples.push({
        x: MARGIN_X + ((day + 0.5) / 7) * (W - 2 * MARGIN_X),
        ridge,
        born: s.t,
        amp: 3 + level * 1.4,
      });
      if (s.ripples.length > 14) s.ripples.shift();
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
    const thresholds = thresholdMap(W, H);
    const profiles = ridgeProfiles(weeks);
    const buf = new Float32Array(W * H);
    const amp = step * 6;
    const s = state.current;
    s.pulse = new Float32Array(profiles.length);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let frame = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (frame++ % 2 !== 0 || document.hidden) return;
      s.t += 0.03;
      const t = s.t;
      const drift = reduceMotion ? 0 : t;
      s.ripples = s.ripples.filter((r) => t - r.born < 3);

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          buf[y * W + x] =
            0.12 +
            0.1 *
              Math.sin(x * 0.045 + drift) *
              Math.cos(y * 0.07 - drift * 0.6);
        }
      }

      for (let r = 0; r < profiles.length; r++) {
        s.pulse[r] *= 0.93;
        const y0 = TOP + r * step;
        const boost = 1 + s.pulse[r] * 0.9;
        const thick = s.pulse[r] > 0.25;
        const profile = profiles[r];
        for (let x = 0; x < W; x++) {
          let h =
            profile[x] * amp * boost +
            Math.sin(x * 0.03 + drift + r * 0.3) * 0.8;
          for (const q of s.ripples) {
            const age = t - q.born;
            const dist = Math.hypot(x - q.x, (r - q.ridge) * step * 1.6);
            h +=
              q.amp *
              Math.sin(dist * 0.35 - age * 7) *
              Math.exp(-age * 1.3) *
              Math.exp(-dist * 0.03);
          }
          const crest = Math.round(y0 - h);
          const base = Math.min(H - 1, Math.round(y0) + 1);
          // Fill below the crest so nearer ridges hide the ones behind them.
          for (let y = Math.max(0, crest + 1); y <= base; y++)
            buf[y * W + x] = 0;
          if (crest >= 0 && crest < H) buf[crest * W + x] = 1;
          if (thick && crest - 1 >= 0) buf[(crest - 1) * W + x] = 1;
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
  }, [weeks, step]);

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = state.current;
    const now = performance.now();
    if (now - s.lastPoke < 140) return;
    s.lastPoke = now;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    s.ripples.push({
      x,
      ridge: Math.max(0, Math.min(ridgeCount - 1, (y - TOP) / step)),
      born: s.t,
      amp: 2.5,
    });
    if (s.ripples.length > 14) s.ripples.shift();
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerMove={onPointerMove}
      className="block h-auto w-full [image-rendering:pixelated]"
      aria-label="Dithered ridgelines drawn from my last year of commits. Each note of the music ripples across them."
    />
  );
}
