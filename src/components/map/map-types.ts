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
export type MapDocument = {
  id: string;
  name: string;
  description: string;
  size: MapSize;
  ground: MapFloor[];
  entities: MapEntity[];
  spots: MapSpot[];
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
