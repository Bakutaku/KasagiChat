import type { MapPoint, MapSize } from "./map-types";

/** マップの中心を原点に揃え、JSONの列・行をThree.jsのXZ座標へ変換します。 */
export function toWorld(
  point: MapPoint,
  size: MapSize,
): [number, number, number] {
  return [
    point.column - (size.columns - 1) / 2,
    0,
    point.row - (size.rows - 1) / 2,
  ];
}
export function cameraPosition(size: MapSize): [number, number, number] {
  const distance = Math.max(size.columns, size.rows, 4) * 1.8;
  return [distance, distance * Math.sqrt(2 / 3), distance];
}
/** スマホでも同じシーンを画面幅に合わせて縮小。Canvasを非表示にはしません。 */
export function cameraZoom(
  size: MapSize,
  viewport: { width: number; height: number },
): number {
  const diagonal = (size.columns + size.rows) / Math.sqrt(2);
  return Math.max(
    0.1,
    Math.min(
      viewport.width / (diagonal + 5),
      viewport.height / (diagonal / 2 + 5),
    ),
  );
}

/** ピンチ・ドラッグ後のpointerupをスポットのタップと誤認しないための純粋な入力状態機械。 */
export type TapState = {
  pointerId: number;
  x: number;
  y: number;
  cancelled: boolean;
} | null;
export function beginTap(
  current: TapState,
  pointerId: number,
  x: number,
  y: number,
): TapState {
  return current
    ? { ...current, cancelled: true }
    : { pointerId, x, y, cancelled: false };
}
export function moveTap(state: TapState, x: number, y: number): TapState {
  return (
    state && {
      ...state,
      cancelled: state.cancelled || Math.hypot(x - state.x, y - state.y) >= 6,
    }
  );
}
export function isTap(
  state: TapState,
  pointerId: number,
  x: number,
  y: number,
): boolean {
  return (
    !!state && state.pointerId === pointerId && !moveTap(state, x, y)?.cancelled
  );
}
