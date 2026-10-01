/**
 * Falling-sand simulation for /powder, in the spirit of Dan-Ball's Powder
 * Game. The page text is "packed" dust that pours into place on load, then
 * crumbles when touched, rained on, burned or eaten by acid.
 */

export const ELEMENTS = [
  { id: "powder", label: "Powder", color: "#E8C872" },
  { id: "water", label: "Water", color: "#5A7BFF" },
  { id: "fire", label: "Fire", color: "#FF5A2A" },
  { id: "seed", label: "Seed", color: "#9BE070" },
  { id: "wood", label: "Wood", color: "#B07A45" },
  { id: "oil", label: "Oil", color: "#B5824E" },
  { id: "ice", label: "Ice", color: "#A6E3FF" },
  { id: "magma", label: "Magma", color: "#FF7A1A" },
  { id: "stone", label: "Stone", color: "#A3A3A3" },
  { id: "gas", label: "Gas", color: "#C9A8FF" },
  { id: "salt", label: "Salt", color: "#F2F2F2" },
  { id: "acid", label: "Acid", color: "#8CFF4A" },
  { id: "torch", label: "Torch", color: "#FFB04A" },
  { id: "clone", label: "Clone", color: "#E0B870" },
  { id: "block", label: "Block", color: "#9A9AA6" },
  { id: "wind", label: "Wind", color: "#DADAE0" },
  { id: "erase", label: "Erase", color: "#DADAE0" },
] as const;

export type Tool = (typeof ELEMENTS)[number]["id"];

const EMPTY = 0;
const FLOOR = 1;
const POWDER = 2;
const WATER = 3;
const FIRE = 4;
const PLANT = 5;
const SEED = 6;
const WOOD = 7;
const OIL = 8;
// Packed (static) dust, by text style. Loosened, it becomes POWDER but keeps its tint.
const NAME = 9;
const TEXT = 10;
const DIM = 11;
const ICE = 12;
const MAGMA = 13;
const STONE = 14;
const GAS = 15;
const BLOCK = 16;
const SALT = 17;
const ACID = 18;
const TORCH = 19;
const CLONE = 20;
const STEAM = 21;

const TOOL_CELL: Partial<Record<Tool, number>> = {
  powder: POWDER,
  water: WATER,
  fire: FIRE,
  seed: SEED,
  wood: WOOD,
  oil: OIL,
  ice: ICE,
  magma: MAGMA,
  stone: STONE,
  gas: GAS,
  salt: SALT,
  acid: ACID,
  torch: TORCH,
  clone: CLONE,
  block: BLOCK,
};

const isPacked = (t: number) => t >= NAME && t <= DIM;
const isStatic = (t: number) =>
  t === FLOOR ||
  t === WOOD ||
  t === ICE ||
  t === BLOCK ||
  t === TORCH ||
  t === CLONE ||
  t === PLANT ||
  isPacked(t);
/** Things a falling grain can sink through. */
const isLight = (t: number) =>
  t === EMPTY || t === WATER || t === OIL || t === GAS || t === STEAM;
/** Chance per step that fire next to this catches. */
const FLAMMABILITY: Record<number, number> = {
  [POWDER]: 0.08,
  [PLANT]: 0.25,
  [SEED]: 0.3,
  [WOOD]: 0.06,
  [OIL]: 0.4,
  [GAS]: 0.9,
};

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
const shades = (r: number, g: number, b: number): Rgb[] =>
  [0, -10, 8, -18].map((k) => [
    Math.max(0, Math.min(255, r + k)),
    Math.max(0, Math.min(255, g + k)),
    Math.max(0, Math.min(255, b + k)),
  ]);

const PACKED: Record<number, Rgb> = {
  [NAME]: [245, 214, 123],
  [TEXT]: [226, 226, 232],
  [DIM]: [130, 130, 140],
};
// Loose text grains keep their color; tint 0 is plain powder.
const LOOSE: Rgb[][] = [
  shades(232, 200, 114),
  shades(245, 214, 123),
  shades(226, 226, 232),
  shades(130, 130, 140),
];
const COLORS: Record<number, Rgb[]> = {
  [FLOOR]: shades(40, 40, 48),
  [WATER]: shades(58, 107, 255),
  [PLANT]: shades(63, 191, 79),
  [SEED]: shades(155, 224, 112),
  [WOOD]: shades(140, 92, 50),
  [OIL]: shades(122, 74, 38),
  [ICE]: shades(166, 227, 255),
  [STONE]: shades(150, 150, 150),
  [GAS]: shades(150, 120, 200),
  [BLOCK]: shades(120, 120, 132),
  [SALT]: shades(240, 240, 240),
  [ACID]: shades(120, 240, 70),
  [TORCH]: shades(200, 120, 50),
  [CLONE]: shades(190, 150, 80),
  [STEAM]: shades(170, 180, 200),
};

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
  paused = false;
  private ctx: CanvasRenderingContext2D;
  private img!: ImageData;
  private cells!: Uint8Array;
  private tint!: Uint8Array;
  /** Fire/steam lifetime, plant growth left, or a clone's source element. */
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

  /** Number of loose particles on the board, like Powder Game's "dot". */
  dots(): number {
    let n = 0;
    for (let i = 0; i < this.cells.length; i++) {
      const t = this.cells[i];
      if (t !== EMPTY && t !== FLOOR && !isPacked(t)) n++;
    }
    return n;
  }

  /** Clear the board and pour the text back in, column by column. */
  replay() {
    this.clear(false);
    const byColumn = new Map<number, [number, number][]>();
    for (const t of this.targets) {
      const x = t[0] % this.width;
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

  /** Remove every particle; optionally leave the packed text standing. */
  clear(keepText = true) {
    const { width: w, height: h, cells } = this;
    for (let i = 0; i < cells.length; i++) {
      if (keepText && isPacked(cells[i])) continue;
      cells[i] = EMPTY;
      this.tint[i] = 0;
      this.life[i] = 0;
      this.flash[i] = 0;
    }
    for (let x = 0; x < w; x++) cells[(h - 1) * w + x] = FLOOR;
  }

  tick() {
    if (this.intro) this.pour();
    if (!this.paused) this.step();
    this.draw();
    this.frame++;
  }

  /**
   * Apply a tool at CSS-pixel coordinates relative to the canvas. `hover`
   * means the pointer is up: it only crumbles text. `dx`/`dy` are the
   * pointer's movement, used by the wind tool.
   */
  touch(
    x: number,
    y: number,
    cssWidth: number,
    cssHeight: number,
    tool: Tool,
    radius: number,
    hover: boolean,
    dx = 0,
    dy = 0,
  ) {
    if (this.intro) return;
    const { width: w, height: h, cells } = this;
    const cx = Math.floor((x / cssWidth) * w);
    const cy = Math.floor((y / cssHeight) * h);
    const r = hover ? 3 : radius;
    const placed = TOOL_CELL[tool];
    const solid = placed !== undefined && isStatic(placed);
    const windX = Math.sign(dx);
    const windY = Math.sign(dy);

    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        if (ox * ox + oy * oy > r * r) continue;
        const px = cx + ox;
        const py = cy + oy;
        if (px < 0 || px >= w || py < 0 || py >= h - 1) continue;
        const i = py * w + px;
        const t = cells[i];
        if (isPacked(t)) {
          // Hovering crumbles the text gently; pressing breaks it outright.
          if (!hover || Math.random() < 0.35) cells[i] = POWDER;
          continue;
        }
        if (hover) continue;
        if (tool === "erase") {
          cells[i] = EMPTY;
          this.life[i] = 0;
        } else if (tool === "wind") {
          if (t === EMPTY || isStatic(t) || Math.random() < 0.4) continue;
          const nx = px + windX;
          const ny = py + windY;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h - 1) continue;
          if (cells[ny * w + nx] === EMPTY) this.swap(i, ny * w + nx);
        } else if (placed !== undefined && t === EMPTY) {
          if (!solid && Math.random() < 0.5) continue;
          cells[i] = placed;
          this.tint[i] = 0;
          this.life[i] =
            placed === FIRE
              ? 30 + Math.floor(Math.random() * 30)
              : placed === STEAM
                ? 80
                : 0;
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
        this.cells[g.i] = g.type;
        this.tint[g.i] = g.type - 8;
        this.flash[g.i] = 255;
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

  private set(i: number, type: number, life = 0) {
    this.cells[i] = type;
    this.life[i] = life;
    this.tint[i] = 0;
  }

  private ignite(i: number) {
    this.set(i, FIRE, 20 + Math.floor(Math.random() * 30));
  }

  /** Fall straight down, else diagonally, into anything `canEnter` allows. */
  private fall(i: number, x: number, canEnter: (t: number) => boolean) {
    const { width: w, cells } = this;
    const below = i + w;
    if (canEnter(cells[below])) {
      this.swap(i, below);
      return true;
    }
    const d = Math.random() < 0.5 ? -1 : 1;
    if (x + d >= 0 && x + d < w && canEnter(cells[below + d])) {
      this.swap(i, below + d);
      return true;
    }
    return false;
  }

  /** Liquids: fall, else spread sideways. */
  private flow(i: number, x: number, canEnter: (t: number) => boolean) {
    if (this.fall(i, x, canEnter)) return;
    const d = Math.random() < 0.5 ? -1 : 1;
    if (x + d >= 0 && x + d < this.width && this.cells[i + d] === EMPTY)
      this.swap(i, i + d);
  }

  /** Gases: drift upward, else sideways. */
  private rise(i: number, x: number, y: number) {
    const { width: w, cells } = this;
    if (y === 0) return;
    const d = Math.floor(Math.random() * 3) - 1;
    const up = i - w + d;
    if (x + d >= 0 && x + d < w && cells[up] === EMPTY) this.swap(i, up);
    else if (x + d >= 0 && x + d < w && cells[i + d] === EMPTY)
      this.swap(i, i + d);
  }

  private neighbors(i: number): number[] {
    const w = this.width;
    const x = i % w;
    const out = [i - w, i + w];
    if (x > 0) out.push(i - 1);
    if (x < w - 1) out.push(i + 1);
    return out.filter((j) => j >= 0 && j < this.cells.length);
  }

  private step() {
    const { width: w, height: h, cells, life } = this;
    if (this.rain && !this.intro && Math.random() < (0.3 * w) / 240) {
      const x = Math.floor(Math.random() * w);
      if (cells[x] === EMPTY) this.set(x, WATER);
    }
    // While it rains, water drains out at the floor so the board never floods.
    if (this.rain) {
      for (let x = 0; x < w; x++) {
        const i = (h - 2) * w + x;
        if (cells[i] === WATER && Math.random() < 0.08) cells[i] = EMPTY;
      }
    }

    const leftToRight = this.frame % 2 === 0;
    for (let y = h - 2; y >= 0; y--) {
      for (let k = 0; k < w; k++) {
        const x = leftToRight ? k : w - 1 - k;
        const i = y * w + x;
        const t = cells[i];
        if (t === EMPTY || t === FLOOR || t === BLOCK || t === WOOD) continue;

        if (isPacked(t)) {
          // Packed dust erodes slowly in rain and burns away quickly.
          for (const j of this.neighbors(i)) {
            const u = cells[j];
            if (
              (u === WATER && Math.random() < 0.012) ||
              ((u === FIRE || u === MAGMA) && Math.random() < 0.3) ||
              (u === ACID && Math.random() < 0.08)
            ) {
              cells[i] = POWDER;
              break;
            }
          }
          continue;
        }

        switch (t) {
          case POWDER:
          case STONE:
            this.fall(i, x, isLight);
            break;
          case SALT:
            for (const j of this.neighbors(i)) {
              if (cells[j] === WATER && Math.random() < 0.03) {
                this.set(i, EMPTY);
                break;
              }
              if (cells[j] === ICE && Math.random() < 0.05) this.set(j, WATER);
            }
            if (cells[i] === SALT) this.fall(i, x, isLight);
            break;
          case SEED:
            if (!this.fall(i, x, isLight)) {
              const ground = cells[i + w];
              if (ground !== EMPTY && ground !== WATER && Math.random() < 0.05)
                this.set(i, PLANT, 12 + Math.floor(Math.random() * 24));
            }
            break;
          case PLANT: {
            // Sprouts grow upward while they have growth left, and any
            // plant spreads into water it touches.
            if (life[i] > 0 && Math.random() < 0.15) {
              const d = Math.floor(Math.random() * 3) - 1;
              const j = i - w + d;
              if (y > 0 && x + d >= 0 && x + d < w && cells[j] === EMPTY) {
                this.set(j, PLANT, life[i] - 1);
                life[i] = 0;
              }
            }
            if (Math.random() < 0.04) {
              const ns = this.neighbors(i);
              const j = ns[Math.floor(Math.random() * ns.length)];
              if (cells[j] === WATER) this.set(j, PLANT);
            }
            break;
          }
          case WATER:
            this.flow(
              i,
              x,
              (u) => u === EMPTY || u === GAS || u === STEAM || u === OIL,
            );
            break;
          case OIL:
            this.flow(i, x, (u) => u === EMPTY || u === GAS || u === STEAM);
            break;
          case ACID: {
            const ns = this.neighbors(i);
            const j = ns[Math.floor(Math.random() * ns.length)];
            const u = cells[j];
            if (
              u !== EMPTY &&
              u !== FLOOR &&
              u !== ACID &&
              !isPacked(u) &&
              Math.random() < 0.1
            ) {
              this.set(j, EMPTY);
              if (Math.random() < 0.3) {
                this.set(i, EMPTY);
                break;
              }
            }
            this.flow(i, x, (v) => v === EMPTY || v === GAS || v === STEAM);
            break;
          }
          case MAGMA: {
            let cooled = false;
            for (const j of this.neighbors(i)) {
              const u = cells[j];
              if (u === WATER) {
                this.set(i, STONE);
                this.set(j, STEAM, 80 + Math.floor(Math.random() * 60));
                cooled = true;
                break;
              }
              if (u === ICE) this.set(j, WATER);
              else if (FLAMMABILITY[u] && Math.random() < 0.3) this.ignite(j);
            }
            if (cooled) break;
            if (y > 0 && cells[i - w] === EMPTY && Math.random() < 0.004)
              this.ignite(i - w);
            if (Math.random() < 0.35)
              this.flow(i, x, (u) => u === EMPTY || u === GAS || u === STEAM);
            break;
          }
          case ICE:
            if (Math.random() < 0.03) {
              const ns = this.neighbors(i);
              const j = ns[Math.floor(Math.random() * ns.length)];
              if (cells[j] === WATER) this.set(j, ICE);
            }
            break;
          case TORCH:
            if (y > 0 && cells[i - w] === EMPTY && Math.random() < 0.3)
              this.ignite(i - w);
            break;
          case CLONE: {
            // Remember the first element that touches, then copy it out.
            if (life[i] === 0) {
              for (const j of this.neighbors(i)) {
                const u = cells[j];
                if (u !== EMPTY && u !== FLOOR && u !== CLONE && !isPacked(u)) {
                  life[i] = u;
                  break;
                }
              }
            } else if (Math.random() < 0.2) {
              const ns = this.neighbors(i);
              const j = ns[Math.floor(Math.random() * ns.length)];
              if (cells[j] === EMPTY)
                this.set(
                  j,
                  life[i],
                  life[i] === FIRE ? 30 : life[i] === STEAM ? 80 : 0,
                );
            }
            break;
          }
          case GAS:
            this.rise(i, x, y);
            break;
          case STEAM:
            if (life[i] <= 1 || Math.random() < 0.003) {
              this.set(i, WATER);
              break;
            }
            life[i]--;
            this.rise(i, x, y);
            break;
          case FIRE: {
            if (life[i] <= 1) {
              cells[i] = EMPTY;
              break;
            }
            life[i]--;
            let out = false;
            let fueled = false;
            for (const j of this.neighbors(i)) {
              const u = cells[j];
              if (u === WATER) {
                cells[i] = EMPTY;
                if (Math.random() < 0.2) this.set(j, STEAM, 60);
                out = true;
                break;
              }
              if (u === ICE && Math.random() < 0.1) this.set(j, WATER);
              const p = FLAMMABILITY[u];
              if (p) {
                fueled = true;
                if (Math.random() < p) this.ignite(j);
              }
            }
            // Fire clings to fuel so it can spread; otherwise it floats up.
            if (!out && !fueled && Math.random() < 0.5) this.rise(i, x, y);
            break;
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
      else if (t === FIRE)
        c = Math.random() < 0.5 ? [255, 90, 31] : [255, 194, 61];
      else if (t === MAGMA)
        c =
          Math.random() < 0.1
            ? [255, 214, 90]
            : this.shade[i] < 2
              ? [255, 96, 20]
              : [225, 60, 15];
      else if (t === POWDER) c = LOOSE[this.tint[i]][this.shade[i]];
      else if (isPacked(t)) {
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
      } else c = COLORS[t][this.shade[i]];
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
