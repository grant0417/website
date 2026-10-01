/** 8×8 Bayer matrix, normalized to thresholds in (0, 1). */
export const BAYER_8: number[][] = (() => {
  let m = [[0]];
  while (m.length < 8) {
    const n = m.length;
    m = Array.from({ length: 2 * n }, (_, y) =>
      Array.from(
        { length: 2 * n },
        (_, x) =>
          m[y % n][x % n] * 4 + (y < n ? (x < n ? 0 : 2) : x < n ? 3 : 1),
      ),
    );
  }
  return m.map((row) => row.map((v) => (v + 0.5) / 64));
})();

export function thresholdMap(width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out[y * width + x] = BAYER_8[y & 7][x & 7];
  }
  return out;
}

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export type Palette = { name: string; bg: string; fg: string };

export const LIGHT: Palette = { name: "Light", bg: "#FFFFFF", fg: "#000000" };
export const DARK: Palette = { name: "Dark", bg: "#000000", fg: "#FFFFFF" };

export const PALETTES: Palette[] = [
  LIGHT,
  DARK,
  { name: "Pocket", bg: "#9BBC0F", fg: "#0F380F" },
  { name: "Ember", bg: "#1B1B3A", fg: "#FF7A3D" },
  { name: "Cobalt", bg: "#E8EDFF", fg: "#1F3BFF" },
];
