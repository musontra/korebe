// Canvas setup/resize and world-units (1000x1000) to pixel scaling.

export const WORLD_SIZE = 1000;
export const CANVAS_SIZE = 720; // fixed square; responsive is a later concern (ugly phase)
const SCALE = CANVAS_SIZE / WORLD_SIZE;

let ctx: CanvasRenderingContext2D | null = null;

export function initCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("2D context not available");
  ctx = c;
  return c;
}

export function getCtx(): CanvasRenderingContext2D {
  if (!ctx) throw new Error("canvas not initialized");
  return ctx;
}

// world unit -> pixel (uniform scale, square arena)
export function worldToPixel(v: number): number {
  return v * SCALE;
}

// pixel -> world unit (for translating clicks back into server coordinates)
export function pixelToWorld(v: number): number {
  return v / SCALE;
}
