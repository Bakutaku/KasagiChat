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
  "home-sofa",
  "home-coffee-table",
] as const;
export type MapEntity = MapPoint & {
  id: string;
  sprite: (typeof objectNames)[number];
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  /** 生成素材の透明余白を除き、指定寸法の内側へ比率を保って収めます。 */
  trimTransparent?: boolean;
};
/** 室内マップだけが持つ外装。家具・配置品・APIの状態とは独立しています。 */
export type MapRoom = {
  wallHeight: number;
  wallColor: string;
  accentColor: string;
  trimColor: string;
};
/** 屋外マップを箱庭として見せる土台と遠景。室内の壁とは併用しません。 */
export type MapBackdrop = {
  height: number;
  baseThickness: number;
  baseColor: string;
  skyColor: string;
  distantColor: string;
  landscapeColor: string;
};
export type MapFloor = MapPoint & {
  sprite: FloorName;
  color?: string;
  /** 元の模様へ淡い色を混ぜます。乗算のcolorと異なり、明度も上げられます。 */
  tone?: { color: string; mix: number };
  spawnAllowed: boolean;
};
/** スポットには遷移先や会話ロジックを持たせず、画面側で選択結果を解釈します。 */
export type MapSpot = MapPoint & {
  id: string;
  name: string;
  entityId: string;
  /** 街の建物など、地図上で常時名前を示したい場所だけ指定します。 */
  showNameLabel?: boolean;
};
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
  room?: MapRoom;
  backdrop?: MapBackdrop;
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
  details?: MapTargetDetails;
  /** falseの場合は常時名札を隠し、ホバー時のDOMツールチップだけで名前を示します。 */
  showNameLabel?: boolean;
  /** イベント会場など、交流中の短いリアクションをランダム表示する画面だけが指定します。 */
  showAmbientEmotes?: boolean;
};
/** 表示だけの補足情報。開始可否や会話処理は画面が所有します。 */
export type MapTargetDetails = {
  description: string;
  status?: string;
  actionLabel?: string;
};
export type MapHover = {
  kind: "spot" | "character";
  id: string;
  x: number;
  y: number;
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
