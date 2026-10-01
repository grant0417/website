import { createServerFn } from "@tanstack/react-start";

export type Contributions = {
  /** weeks[w][d] is GitHub's contribution level (0–4), Sunday first. */
  weeks: number[][];
  total: number;
  /** False when GitHub couldn't be reached and placeholder data is shown. */
  live: boolean;
};

const GITHUB_USER = "grant0417";

export const getContributions = createServerFn({ method: "GET" }).handler(
  async (): Promise<Contributions> => {
    try {
      const res = await fetch(
        `https://github.com/users/${GITHUB_USER}/contributions`,
        {
          headers: { "User-Agent": "gurvis.net" },
          cf: { cacheTtl: 3600, cacheEverything: true },
        },
      );
      if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
      return parseCalendar(await res.text());
    } catch (err) {
      console.error("Using placeholder contributions:", err);
      return placeholderContributions();
    }
  },
);

// GitHub has no unauthenticated API for the calendar, so this reads the
// same HTML fragment the profile page embeds.
function parseCalendar(html: string): Contributions {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(
    /for="(contribution-day-component-[\d-]+)"[^>]*>(No|[\d,]+) contribution/g,
  )) {
    counts.set(m[1], m[2] === "No" ? 0 : Number(m[2].replace(/,/g, "")));
  }

  const days: { date: string; level: number; count: number }[] = [];
  for (const m of html.matchAll(/<td[^>]*data-date="([\d-]+)"[^>]*>/g)) {
    const level = Number(/data-level="(\d)"/.exec(m[0])?.[1] ?? 0);
    const id = /id="([^"]+)"/.exec(m[0])?.[1] ?? "";
    days.push({ date: m[1], level, count: counts.get(id) ?? 0 });
  }
  if (days.length < 300) throw new Error("Unexpected contributions markup");

  days.sort((a, b) => a.date.localeCompare(b.date));
  const startDow = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const weeks: number[][] = [];
  days.forEach((day, i) => {
    const slot = i + startDow;
    (weeks[Math.floor(slot / 7)] ??= Array(7).fill(0))[slot % 7] = day.level;
  });

  return {
    weeks,
    total: days.reduce((sum, d) => sum + d.count, 0),
    live: true,
  };
}

function placeholderContributions(): Contributions {
  let s = 3;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const weeks = Array.from({ length: 53 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const activity =
        0.25 + 0.75 * Math.abs(Math.sin(w * 0.37) * Math.cos(w * 0.11));
      const v = rand() * activity * (d === 0 || d === 6 ? 0.6 : 1);
      return v < 0.12 ? 0 : v < 0.3 ? 1 : v < 0.5 ? 2 : v < 0.7 ? 3 : 4;
    }),
  );
  return { weeks, total: 0, live: false };
}
