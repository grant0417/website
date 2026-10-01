import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DustSim, ELEMENTS, type Tool } from "@/lib/dust";

export const Route = createFileRoute("/powder")({
  component: Powder,
  head: () => ({ meta: [{ title: "Grant Gurvis · Powder" }] }),
});

const PEN_SIZES = [1, 2, 4, 8];

const cell =
  "flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap border border-[#2E2E36] bg-[#16161B] px-2 font-pixel text-xs uppercase text-[#DADAE0] hover:border-[#7A7A86] hover:bg-[#23232A]";

function Powder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<DustSim | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tool>("powder");
  const [pen, setPen] = useState(2);
  const [rain, setRain] = useState(true);
  const [paused, setPaused] = useState(false);
  const [dots, setDots] = useState(0);
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const penRef = useRef(pen);
  penRef.current = pen;

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
      if (++frame % 30 === 0) setDots(s.dots());
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const apply = (e: React.PointerEvent<HTMLCanvasElement>, hover: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const prev = lastPoint.current ?? { x, y };
    lastPoint.current = { x, y };
    sim.current?.touch(
      x,
      y,
      rect.width,
      rect.height,
      toolRef.current,
      PEN_SIZES[penRef.current],
      hover,
      x - prev.x,
      y - prev.y,
    );
  };
  const stop = () => {
    drawing.current = false;
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
          onPointerUp={stop}
          onPointerLeave={(e) => {
            stop();
            lastPoint.current = null;
            e.currentTarget.releasePointerCapture?.(e.pointerId);
          }}
          onPointerCancel={stop}
          className="absolute inset-0 size-full cursor-crosshair touch-none [image-rendering:pixelated]"
          aria-label="Falling sand sandbox. My name and work history pour in as sand, then crumble when you touch them."
        />
      </div>
      {/* Two rows that fill left to right; they scroll sideways on phones. */}
      <div className="grid auto-cols-[minmax(84px,1fr)] grid-flow-col grid-rows-2 gap-1 overflow-x-auto border-t-2 border-[#2E2E36] bg-[#0F0F13] p-1.5 [scrollbar-width:none]">
        {ELEMENTS.map((el) => (
          <button
            key={el.id}
            type="button"
            onClick={() => setTool(el.id)}
            aria-pressed={tool === el.id}
            className={cell}
            style={{
              color: el.color,
              outline: tool === el.id ? `2px solid ${el.color}` : "none",
              outlineOffset: -4,
            }}
          >
            {el.label}
          </button>
        ))}
        <button
          type="button"
          className={cell}
          onClick={() => setPen((pen + 1) % PEN_SIZES.length)}
          aria-label={`Pen size ${PEN_SIZES[pen]}, change`}
        >
          Pen {PEN_SIZES[pen]}
        </button>
        <button
          type="button"
          className={cell}
          aria-pressed={paused}
          onClick={() => {
            if (sim.current) sim.current.paused = !paused;
            setPaused(!paused);
          }}
        >
          {paused ? "Start" : "Stop"}
        </button>
        <button
          type="button"
          className={cell}
          aria-pressed={rain}
          onClick={() => {
            if (sim.current) sim.current.rain = !rain;
            setRain(!rain);
          }}
        >
          Rain {rain ? "on" : "off"}
        </button>
        <button
          type="button"
          className={cell}
          onClick={() => sim.current?.clear()}
        >
          Clear
        </button>
        <button
          type="button"
          className={cell}
          style={{ color: "#F5D67B" }}
          onClick={() => sim.current?.replay()}
        >
          Reset
        </button>
        <Link to="/" className={cell}>
          ← Home
        </Link>
        <span
          className={`${cell} cursor-default text-[#7A7A86] hover:border-[#2E2E36] hover:bg-[#16161B]`}
        >
          Dot {dots}
        </span>
      </div>
    </div>
  );
}
