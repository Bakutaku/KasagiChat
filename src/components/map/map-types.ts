export type MapPoint = { column: number; row: number };
export type MapSize = { columns: number; rows: number };
export const floorNames = ["plain", "oak", "limestone", "carpet"] as const;
export const groundNames = ["grass", "stone", "dirt", "water"] as const;
export type FloorName =
  (typeof floorNames)[number] | (typeof groundNames)[number];
export const objectNames = [
  "tree",
  "bench",
  "lamp",
  "planter",
  "cafe",
  "home",
  "lobby",
  "office",
  "bridge",
  "fence",
  "fountain",
  "flowerbed",
] as const;
export type MapEntity = MapPoint & {
  id: string;
  sprite: (typeof objectNames)[number];
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
};
export type MapFloor = MapPoint & {
  sprite: FloorName;
  color?: string;
  spawnAllowed: boolean;
};
/** スポットには遷移先や会話ロジックを持たせず、画面側で選択結果を解釈します。 */
export type MapSpot = MapPoint & { id: string; name: string; entityId: string };
/** 静的な配置地点。所有者・取得状態・アイテム名は含めません。寸法は床1マス単位。 */
export type MapPlacementAnchor = MapPoint & {
  id: string;
  label: string;
  width: number;
  height: number;
};
export type MapDocument = {
  id: string;
  name: string;
  description: string;
  size: MapSize;
  ground: MapFloor[];
  entities: MapEntity[];
  spots: MapSpot[];
  placementAnchors: MapPlacementAnchor[];
};
/** APIを扱う画面が静的な地点へ関連付ける表示専用データ。 */
export type RuntimeMapObject = {
  id: string;
  anchorId: string;
  src: string;
  fallbackSrc: string;
  name: string;
};
export type MapObjectEditing = {
  anchorIds: readonly string[];
  selectedId: string | null;
  availableAnchorIds: readonly string[];
  disabled: boolean;
  onSelectObject: (id: string) => void;
  onSelectAnchor: (anchorId: string) => void;
};
/**
 * JSONは場所の固定情報だけを保持します。ユーザーや参加者は変化するため、
 * APIを知る画面側がこの形式に変換して渡し、共通描画には保存・取得責務を持たせません。
 */
export type RuntimeMapCharacter = MapPoint & {
  id: string;
  src: string;
  name: string;
};
export type MapInteraction = "fixed" | "explore";
export const floorColors: Record<FloorName, string> = {
  plain: "#ece5d6",
  oak: "#c99962",
  limestone: "#dedbd0",
  carpet: "#7b9185",
  grass: "#72a95a",
  stone: "#aaa69d",
  dirt: "#b98b57",
  water: "#4ca9cf",
};
export type MapIndex = { version: 1; maps: { id: string; file: string }[] };
