import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DustSim, type Tool } from "@/lib/dust";

export const Route = createFileRoute("/powder")({
  component: Powder,
  head: () => ({ meta: [{ title: "Grant Gurvis · Powder" }] }),
});

const TOOLS: { tool: Tool; label: string; color: string }[] = [
  { tool: "touch", label: "Touch", color: "#F5D67B" },
  { tool: "powder", label: "Powder", color: "#C9B48A" },
  { tool: "water", label: "Water", color: "#6A96FF" },
  { tool: "fire", label: "Fire", color: "#FF6A2F" },
  { tool: "erase", label: "Erase", color: "#DADAE0" },
];

const LINKS = [
  { label: "Hercules ↗", href: "https://hercules.app", color: "#F5D67B" },
  { label: "GitHub ↗", href: "https://github.com/grant0417" },
  {
    label: "Twitter ↗",
    href: "https://twitter.com/gurgrant",
    color: "#7FC8F8",
  },
  {
    label: "LinkedIn ↗",
    href: "https://www.linkedin.com/in/grant-gurvis/",
    color: "#8FB0FF",
  },
  { label: "Email ↗", href: "mailto:grant@gurvis.net", color: "#FF8A5B" },
];

const control =
  "inline-flex min-h-11 flex-[1_0_auto] cursor-pointer items-center justify-center whitespace-nowrap border border-[#33333B] bg-[#16161B] px-3 font-pixel text-[13px] text-[#DADAE0] hover:border-[#7A7A86] hover:bg-[#23232A]";
const row = "flex gap-1 overflow-x-auto [scrollbar-width:none]";

function Powder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<DustSim | null>(null);
  const drawing = useRef(false);
  const [tool, setTool] = useState<Tool>("touch");
  const [rain, setRain] = useState(true);
  const [intact, setIntact] = useState(0);
  const toolRef = useRef(tool);
  toolRef.current = tool;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const s = new DustSim(ctx);
    sim.current = s;

    const fit = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      s.resize(rect.width, rect.height);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas.parentElement!);

    let raf = 0;
    let frame = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || !s.width) return;
      s.tick();
      if (++frame % 30 === 0) setIntact(s.intact());
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const apply = (e: React.PointerEvent<HTMLCanvasElement>, hover: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    sim.current?.touch(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height,
      toolRef.current,
      hover,
    );
  };

  return (
    <div className="flex h-screen min-h-[480px] flex-col bg-[#07070A]">
      <h1 className="sr-only">
        Grant Gurvis: co-founder and CTO at Hercules, previously engineer at
        Amazon Web Services and Fig
      </h1>
      <div className="relative min-h-0 flex-auto">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            drawing.current = true;
            apply(e, false);
          }}
          onPointerMove={(e) => apply(e, !drawing.current)}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
          className="absolute inset-0 size-full cursor-crosshair touch-none [image-rendering:pixelated]"
          aria-label="My name and work history pour in as sand, then crumble when you touch them."
        />
      </div>
      <div className="flex flex-col gap-1 border-t-2 border-[#33333B] bg-[#0F0F13] p-1.5">
        <div className={row}>
          {TOOLS.map((t) => (
            <button
              key={t.tool}
              type="button"
              onClick={() => setTool(t.tool)}
              aria-pressed={tool === t.tool}
              className={control}
              style={{
                color: t.color,
                outline: tool === t.tool ? `2px solid ${t.color}` : "none",
                outlineOffset: -4,
              }}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className={control}
            aria-pressed={rain}
            onClick={() => {
              if (sim.current) sim.current.rain = !rain;
              setRain(!rain);
            }}
          >
            {rain ? "Rain on" : "Rain off"}
          </button>
          <button
            type="button"
            className={control}
            style={{ color: "#F5D67B" }}
            onClick={() => sim.current?.replay()}
          >
            ↻ Pour again
          </button>
        </div>
        <nav className={row}>
          <Link to="/" className={control}>
            ← Home
          </Link>
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={control}
              style={{ color: l.color }}
            >
              {l.label}
            </a>
          ))}
          <span
            className={`${control} cursor-default text-[#7A7A86] hover:border-[#33333B] hover:bg-[#16161B]`}
          >
            {intact}% intact
          </span>
        </nav>
      </div>
    </div>
  );
}
