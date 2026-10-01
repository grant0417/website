import { useEffect, useRef } from "react";
import { drawCover, type CoverLook } from "@/lib/covers";

/** A post's generated cover, drawn client-side at its native pixel size. */
export function Cover({
  title,
  look,
  width,
  height,
  className = "",
}: {
  title: string;
  look: CoverLook;
  width: number;
  height: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current) drawCover(ref.current, title, look, width, height);
  }, [title, look.style, look.palette, width, height]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`block w-full [image-rendering:pixelated] ${className}`}
      // The palette background shows until the canvas draws after hydration.
      style={{
        aspectRatio: `${width} / ${height}`,
        background: look.palette.bg,
      }}
    />
  );
}
