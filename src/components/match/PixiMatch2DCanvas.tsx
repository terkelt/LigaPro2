/**
 * PixiMatch2DCanvas — React wrapper for the PixiJS 2.5D match renderer.
 *
 * Drop-in replacement for the old Canvas 2D <Match2DCanvas>.
 * Same props, same integration, but GPU-accelerated with isometric projection.
 */

import { useRef, useEffect, useCallback } from "react";
import type { LiveMatchContext } from "@/lib/match-engine";
import type { FormationType } from "@/types/tactics";
import {
  createPixiMatchRenderer,
  type PixiMatchRendererHandle,
} from "@/lib/pixi-match-renderer";

interface PixiMatch2DCanvasProps {
  ctx: LiveMatchContext;
  homeFormation?: FormationType;
  awayFormation?: FormationType;
  className?: string;
}

export function PixiMatch2DCanvas({
  ctx,
  homeFormation,
  awayFormation,
  className,
}: PixiMatch2DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PixiMatchRendererHandle | null>(null);
  const initRef = useRef(false);

  // Initialize PixiJS renderer on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || initRef.current) return;
    initRef.current = true;

    let handle: PixiMatchRendererHandle | null = null;

    createPixiMatchRenderer(canvas, ctx, homeFormation, awayFormation).then(
      (h) => {
        handle = h;
        rendererRef.current = h;

        // Initial resize
        const rect = container.getBoundingClientRect();
        h.resize(rect.width, rect.height);
      },
    );

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          rendererRef.current?.resize(width, height);
        }
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (handle) {
        handle.destroy();
        rendererRef.current = null;
      }
      initRef.current = false;
    };
    // Only run on mount/unmount — ctx updates go through updateCtx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push context updates to the renderer every time ctx changes
  useEffect(() => {
    rendererRef.current?.updateCtx(ctx, homeFormation, awayFormation);
  }, [ctx, homeFormation, awayFormation]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className ?? ""}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full rounded-xl"
        style={{ display: "block" }}
      />
    </div>
  );
}
