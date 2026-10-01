/**
 * Falling-sand simulation for /powder. The page text is "packed" dust that
 * pours into place on load, then crumbles when touched or rained on.
 */

export type Tool = "touch" | "powder" | "water" | "fire" | "erase";

const EMPTY = 0;
const FLOOR = 1;
const POWDER = 2;
const WATER = 3;
const FIRE = 4;
// Packed (static) dust, by text style. Loosened, it becomes POWDER but keeps its tint.
const NAME = 9;
const TEXT = 10;
const DIM = 11;

const GLYPHS: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001",
  C: "01110 10001 10000 10000 10000 10001 01110",
  D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01110 10001 10000 10111 10001 10001 01110",
  H: "10001 10001 10001 11111 10001 10001 10001",
  I: "01110 00100 00100 00100 00100 00100 01110",
  L: "10000 10000 10000 10000 10000 10000 11111",
  N: "10001 11001 10101 10011 10001 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 10101 01010",
  "0": "01110 10001 10011 10101 11001 10001 01110",
  "1": "00100 01100 00100 00100 00100 00100 01110",
  "2": "01110 10001 00001 00010 00100 01000 11111",
  "3": "11110 00001 00001 01110 00001 00001 11110",
  "5": "11111 10000 11110 00001 00001 10001 01110",
  "&": "01100 10010 10100 01000 10101 10010 01101",
  "-": "00000 00000 00000 11111 00000 00000 00000",
  " ": "00000 00000 00000 00000 00000 00000 00000",
};
const FONT = Object.fromEntries(
  Object.entries(GLYPHS).map(([k, v]) => [k, v.replace(/ /g, "")]),
);

const JOBS = [
  ["2025-NOW", "HERCULES", "CO-FOUNDER & CTO"],
  ["2023-25", "AWS", "ENGINEER"],
  ["2021-23", "FIG", "ENGINEER"],
] as const;

type Rgb = readonly [number, number, number];
const PACKED: Record<number, Rgb> = {
  [NAME]: [245, 214, 123],
  [TEXT]: [226, 226, 232],
  [DIM]: [130, 130, 140],
};
// Loose grains by tint (0 = plain powder), four shades each.
const LOOSE: Rgb[][] = [
  [
    [150, 138, 114],
    [140, 128, 104],
    [160, 148, 124],
    [130, 118, 96],
  ],
  [
    [245, 214, 123],
    [236, 200, 104],
    [250, 222, 140],
    [228, 192, 96],
  ],
  [
    [226, 226, 232],
    [210, 210, 218],
    [238, 238, 244],
    [200, 200, 208],
  ],
  [
    [130, 130, 140],
    [120, 120, 130],
    [140, 140, 150],
    [112, 112, 122],
  ],
];

type Grain = {
  i: number;
  type: number;
  x: number;
  y: number;
  targetY: number;
  vy: number;
  done: boolean;
};

export class DustSim {
  width = 0;
  height = 0;
  rain = true;
  private ctx: CanvasRenderingContext2D;
  private img!: ImageData;
  private cells!: Uint8Array;
  private tint!: Uint8Array;
  private life!: Uint8Array;
  private shade!: Uint8Array;
  private flash!: Uint8Array;
  private targets: [index: number, type: number][] = [];
  private columns: { x: number; queue: [number, number][] }[] = [];
  private grains: Grain[] = [];
  private intro = false;
  private frame = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /** Resize to the element's CSS size. Returns true if the grid changed. */
  resize(cssWidth: number, cssHeight: number): boolean {
    if (cssWidth < 20 || cssHeight < 20) return false;
    // Aim for ~240 cells across, but keep cells 3–6 CSS px.
    const cell = Math.max(3, Math.min(6, cssWidth / 240));
    const w = Math.max(60, Math.floor(cssWidth / cell));
    const h = Math.max(60, Math.floor(cssHeight / cell));
    if (w === this.width && h === this.height) return false;

    this.width = w;
    this.height = h;
    this.ctx.canvas.width = w;
    this.ctx.canvas.height = h;
    this.img = this.ctx.createImageData(w, h);
    const n = w * h;
    this.cells = new Uint8Array(n);
    this.tint = new Uint8Array(n);
    this.life = new Uint8Array(n);
    this.flash = new Uint8Array(n);
    this.shade = new Uint8Array(n);
    for (let i = 0; i < n; i++) this.shade[i] = Math.floor(Math.random() * 4);
    this.layout();
    this.replay();
    return true;
  }

  /** Percentage of the packed text still standing. */
  intact(): number {
    let packed = 0;
    for (let i = 0; i < this.cells.length; i++)
      if (this.cells[i] >= NAME) packed++;
    return Math.round((packed / Math.max(1, this.targets.length)) * 100);
  }

  /** Clear the board and pour the text back in, column by column. */
  replay() {
    const { width: w, height: h, cells } = this;
    cells.fill(EMPTY);
    this.tint.fill(0);
    this.flash.fill(0);
    for (let x = 0; x < w; x++) cells[(h - 1) * w + x] = FLOOR;

    const byColumn = new Map<number, [number, number][]>();
    for (const t of this.targets) {
      const x = t[0] % w;
      if (!byColumn.has(x)) byColumn.set(x, []);
      byColumn.get(x)!.push(t);
    }
    // Fill each column bottom-up, like sand filling a mold.
    this.columns = [...byColumn].map(([x, queue]) => ({
      x,
      queue: queue.sort((a, b) => b[0] - a[0]),
    }));
    this.grains = [];
    this.intro = true;
  }

  tick() {
    if (this.intro) this.pour();
    this.step();
    this.draw();
    this.frame++;
  }

  /** Apply a tool at CSS-pixel coordinates relative to the canvas. */
  touch(
    x: number,
    y: number,
    cssWidth: number,
    cssHeight: number,
    tool: Tool,
    hover: boolean,
  ) {
    if (this.intro) return;
    const cx = Math.floor((x / cssWidth) * this.width);
    const cy = Math.floor((y / cssHeight) * this.height);
    const r = hover ? 3 : 4;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const px = cx + dx;
        const py = cy + dy;
        if (px < 0 || px >= this.width || py < 0 || py >= this.height - 1)
          continue;
        const i = py * this.width + px;
        const t = this.cells[i];
        if (t >= NAME) {
          // Hovering crumbles the text gently; pressing breaks it outright.
          if (!hover || Math.random() < 0.35) this.cells[i] = POWDER;
          continue;
        }
        if (hover || tool === "touch") continue;
        if (tool === "erase") {
          this.cells[i] = EMPTY;
        } else if (t === EMPTY && Math.random() < 0.5) {
          this.cells[i] =
            tool === "powder" ? POWDER : tool === "water" ? WATER : FIRE;
          this.tint[i] = 0;
          if (tool === "fire")
            this.life[i] = 30 + Math.floor(Math.random() * 30);
        }
      }
    }
  }

  private layout() {
    const w = this.width;
    const textWidth = (s: string, scale: number) => (s.length * 6 - 1) * scale;
    this.targets = [];
    const stamp = (
      text: string,
      x0: number | null,
      y0: number,
      scale: number,
      type: number,
    ) => {
      const left = x0 ?? Math.floor((w - textWidth(text, scale)) / 2);
      for (let k = 0; k < text.length; k++) {
        const bits = FONT[text[k]] ?? FONT[" "];
        for (let gy = 0; gy < 7; gy++) {
          for (let gx = 0; gx < 5; gx++) {
            if (bits[gy * 5 + gx] !== "1") continue;
            for (let dy = 0; dy < scale; dy++) {
              for (let dx = 0; dx < scale; dx++) {
                const x = left + k * 6 * scale + gx * scale + dx;
                const y = y0 + gy * scale + dy;
                if (x >= 0 && x < w && y >= 0 && y < this.height - 2)
                  this.targets.push([y * w + x, type]);
              }
            }
          }
        }
      }
    };

    let y = Math.max(8, Math.floor(this.height * 0.16));
    if (textWidth("GRANT GURVIS", 3) <= w - 10) {
      stamp("GRANT GURVIS", null, y, 3, NAME);
      y += 21 + 14;
    } else {
      const scale = textWidth("GURVIS", 3) <= w - 8 ? 3 : 2;
      stamp("GRANT", null, y, scale, NAME);
      y += 9 * scale;
      stamp("GURVIS", null, y, scale, NAME);
      y += 7 * scale + 14;
    }

    const wide = "2025-NOW  HERCULES  CO-FOUNDER & CTO";
    if (textWidth(wide, 1) <= w - 10) {
      const x0 = Math.floor((w - textWidth(wide, 1)) / 2);
      for (const [years, company, role] of JOBS) {
        stamp(years, x0, y, 1, DIM);
        stamp(company, x0 + 60, y, 1, TEXT);
        stamp(role, x0 + 120, y, 1, TEXT);
        y += 11;
      }
    } else {
      // Narrow screens: company and years on one line, role underneath.
      const x0 = Math.max(
        3,
        Math.floor((w - textWidth("CO-FOUNDER & CTO", 1)) / 2),
      );
      for (const [years, company, role] of JOBS) {
        stamp(company, x0, y, 1, TEXT);
        stamp(years, x0 + textWidth(company, 1) + 7, y, 1, DIM);
        y += 9;
        stamp(role, x0, y, 1, TEXT);
        y += 15;
      }
    }
  }

  private place(i: number, type: number) {
    this.cells[i] = type;
    this.tint[i] = type - 8;
    this.flash[i] = 255;
  }

  private pour() {
    let busy = false;
    for (const col of this.columns) {
      if (col.queue.length && Math.random() < 0.3) {
        const [i, type] = col.queue.shift()!;
        this.grains.push({
          i,
          type,
          x: col.x,
          y: -2,
          targetY: Math.floor(i / this.width),
          vy: 0.5,
          done: false,
        });
      }
      if (col.queue.length) busy = true;
    }
    for (const g of this.grains) {
      if (g.done) continue;
      busy = true;
      g.vy = Math.min(3, g.vy + 0.25);
      g.y += g.vy;
      if (g.y >= g.targetY) {
        g.done = true;
        this.place(g.i, g.type);
      }
    }
    if (this.frame % 30 === 0) this.grains = this.grains.filter((g) => !g.done);
    if (!busy) this.intro = false;
  }

  private swap(i: number, j: number) {
    for (const a of [this.cells, this.life, this.tint]) {
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
  }

  private step() {
    const { width: w, height: h, cells, life } = this;
    if (this.rain && !this.intro && Math.random() < (0.3 * w) / 240) {
      const x = Math.floor(Math.random() * w);
      if (cells[x] === EMPTY) {
        cells[x] = WATER;
        this.tint[x] = 0;
      }
    }
    // Water drains out at the floor so the board never floods.
    for (let x = 0; x < w; x++) {
      const i = (h - 2) * w + x;
      if (cells[i] === WATER && Math.random() < 0.08) cells[i] = EMPTY;
    }

    const leftToRight = this.frame % 2 === 0;
    for (let y = h - 2; y >= 0; y--) {
      for (let k = 0; k < w; k++) {
        const x = leftToRight ? k : w - 1 - k;
        const i = y * w + x;
        const t = cells[i];
        if (t < POWDER) continue;
        const below = i + w;

        if (t >= NAME) {
          // Packed dust erodes slowly in rain and burns away quickly.
          for (const j of [i - 1, i + 1, i - w, below]) {
            if (j < 0 || j >= cells.length) continue;
            if (
              (cells[j] === WATER && Math.random() < 0.012) ||
              (cells[j] === FIRE && Math.random() < 0.3)
            ) {
              cells[i] = POWDER;
              break;
            }
          }
          continue;
        }

        const d = Math.random() < 0.5 ? -1 : 1;
        const sideOk = x + d >= 0 && x + d < w;
        if (t === POWDER) {
          if (cells[below] === EMPTY || cells[below] === WATER)
            this.swap(i, below);
          else if (
            sideOk &&
            (cells[below + d] === EMPTY || cells[below + d] === WATER)
          )
            this.swap(i, below + d);
        } else if (t === WATER) {
          if (cells[below] === EMPTY) this.swap(i, below);
          else if (sideOk && cells[below + d] === EMPTY)
            this.swap(i, below + d);
          else if (sideOk && cells[i + d] === EMPTY) this.swap(i, i + d);
        } else if (t === FIRE) {
          if (life[i] <= 1) {
            cells[i] = EMPTY;
            continue;
          }
          life[i]--;
          if (y > 0 && Math.random() < 0.5) {
            const nx = x + Math.floor(Math.random() * 3) - 1;
            if (nx >= 0 && nx < w && cells[i - w + nx - x] === EMPTY)
              this.swap(i, i - w + nx - x);
          }
        }
      }
    }
  }

  private draw() {
    const { width: w, height: h, cells, img } = this;
    const px = img.data;
    for (let i = 0; i < w * h; i++) {
      const t = cells[i];
      let c: Rgb;
      if (t === EMPTY) c = [7, 7, 10];
      else if (t === FLOOR) c = [40, 40, 48];
      else if (t === WATER) c = [58, 107, 255];
      else if (t === FIRE)
        c = Math.random() < 0.5 ? [255, 90, 31] : [255, 194, 61];
      else if (t >= NAME) {
        const base = PACKED[t];
        const f = this.flash[i] / 255;
        c = f
          ? [
              base[0] + (255 - base[0]) * f,
              base[1] + (255 - base[1]) * f,
              base[2] + (255 - base[2]) * f,
            ]
          : base;
        if (this.flash[i]) this.flash[i] = Math.max(0, this.flash[i] - 12);
      } else c = LOOSE[this.tint[i]][this.shade[i]];
      px[i * 4] = c[0];
      px[i * 4 + 1] = c[1];
      px[i * 4 + 2] = c[2];
      px[i * 4 + 3] = 255;
    }
    if (this.intro) {
      for (const g of this.grains) {
        if (g.done || g.y < 0) continue;
        const j = (Math.round(g.y) * w + g.x) * 4;
        const c = PACKED[g.type];
        px[j] = c[0];
        px[j + 1] = c[1];
        px[j + 2] = c[2];
      }
    }
    this.ctx.putImageData(img, 0, 0);
  }
}
