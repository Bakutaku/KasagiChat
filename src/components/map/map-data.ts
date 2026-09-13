import type { GroundName, MapEntity } from "./map-assets";

export const MAX_MAP_CELLS = 10_000;

export const floorNames = ["plain", "oak", "limestone", "carpet"] as const;
export type FloorName = GroundName | (typeof floorNames)[number];
export type Cell = { column: number; row: number };
export type MapSize = { columns: number; rows: number };
export type Floor = Cell & {
  id: string;
  sprite: FloorName;
  color?: string;
  spawnAllowed: boolean;
};

export const systemNpcCatalog = {
  guide: {
    name: "案内スタッフ",
    src: "/assets/npc/スーツを着た人.png",
    message: "ようこそ！",
  },
  cafe: {
    name: "カフェ店員",
    src: "/assets/npc/カフェ店員.png",
    message: "ひと息ついていきませんか？",
  },
} as const;

export type SystemNpcAsset = keyof typeof systemNpcCatalog;
export type MapNpc = Cell & {
  id: string;
  asset: SystemNpcAsset;
  name: string;
  message: string;
};
export type MapDisplay = {
  showNames: boolean;
  showBubbles: boolean;
  characterBubble: string;
};

/** プリセットを描画用に展開したマップ。編集用の履歴や保存先は持ちません。 */
export type MapDocument = {
  version: 3;
  name: string;
  description: string;
  size: MapSize;
  ground: Floor[];
  entities: MapEntity[];
  npcs: MapNpc[];
  display: MapDisplay;
};

/** Shipped presets use symbols so large floors stay reviewable in source control. */
export type MapPreset = {
  version: 1;
  id: string;
  name: string;
  description: string;
  size: MapSize;
  floor: {
    legend: Record<
      string,
      { sprite: FloorName; color?: string; spawnAllowed: boolean }
    >;
    rows: string[];
  };
  entities: MapEntity[];
  npcs: MapNpc[];
  display: MapDisplay;
};

export type MapPresetIndex = {
  version: 1;
  defaultMapId: string;
  maps: Array<{ id: string; file: string }>;
};

export type LoadedMapPreset = { id: string; document: MapDocument };
export type MapCatalog = { defaultMapId: string; maps: LoadedMapPreset[] };

export const defaultDisplay: MapDisplay = {
  showNames: true,
  showBubbles: true,
  characterBubble: "こんにちは",
};

export const floorLabels: Record<FloorName, string> = {
  plain: "無地",
  oak: "オーク木床",
  limestone: "淡い石材",
  carpet: "カーペット",
  grass: "草地",
  stone: "石畳",
  dirt: "土",
  water: "水辺",
};

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
