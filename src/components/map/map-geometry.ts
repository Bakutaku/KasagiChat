import type { Cell, MapSize } from "./map-data";

/** Keep every map centered at the world origin so camera and controls share one target. */
export function toWorld(cell: Cell, size: MapSize): [number, number, number] {
  return [
    cell.column - (size.columns - 1) / 2,
    0,
    cell.row - (size.rows - 1) / 2,
  ];
}

export function fromWorld(x: number, z: number, size: MapSize): Cell | null {
  const column = Math.floor(x + size.columns / 2);
  const row = Math.floor(z + size.rows / 2);
  return column >= 0 && column < size.columns && row >= 0 && row < size.rows
    ? { column, row }
    : null;
}

export function cameraPosition(size: MapSize): [number, number, number] {
  const distance = Math.max(size.columns, size.rows, 4) * 1.8;
  return [distance, distance * Math.sqrt(2 / 3), distance];
}

/**
 * The camera faces a 45-degree map diagonal. These projected spans include room for
 * sprites and captions, so maps of any supported dimensions fit on reset.
 */
export function cameraZoom(
  size: MapSize,
  viewport: { width: number; height: number },
): number {
  const diagonal = (size.columns + size.rows) / Math.sqrt(2);
  const horizontalSpan = diagonal + 1.5;
  const verticalSpan = diagonal / 2 + 2.6;
  return Math.max(
    1,
    Math.min(viewport.width / horizontalSpan, viewport.height / verticalSpan),
  );
}
