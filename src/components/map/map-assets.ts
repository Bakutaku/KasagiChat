export const TILESET_URL = "/assets/map/hoshikawa-tileset.png";

export const groundNames = ["grass", "stone", "dirt", "water"] as const;
export type GroundName = (typeof groundNames)[number];

/** Straight-down, tileable photos/paintings for the flat 3D floor mesh — not the isometric tileset art. */
export const groundTextureFiles: Record<GroundName, string> = {
  grass: "/assets/map/floor/grass.png",
  stone: "/assets/map/floor/stone.png",
  dirt: "/assets/map/floor/dirt.png",
  water: "/assets/map/floor/water.png",
};

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
export type ObjectName = (typeof objectNames)[number];
export type SpriteName = GroundName | ObjectName;

export type MapPoint = { column: number; row: number };
export type MapEntity = MapPoint & {
  id: string;
  sprite: ObjectName;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
};

export const spriteLabels: Record<SpriteName, string> = {
  grass: "草地",
  stone: "石畳",
  dirt: "土",
  water: "水辺",
  tree: "木",
  bench: "ベンチ",
  lamp: "街灯",
  planter: "花壇（長方形）",
  cafe: "カフェ",
  home: "住宅",
  lobby: "ロビー",
  office: "オフィス",
  bridge: "橋",
  fence: "柵",
  fountain: "噴水",
  flowerbed: "花壇（円形）",
};

export const entitySizes: Record<
  ObjectName,
  { width: number; height: number }
> = {
  tree: { width: 116, height: 124 },
  bench: { width: 104, height: 69 },
  lamp: { width: 54, height: 92 },
  planter: { width: 102, height: 68 },
  cafe: { width: 205, height: 137 },
  home: { width: 205, height: 137 },
  lobby: { width: 224, height: 149 },
  office: { width: 210, height: 140 },
  bridge: { width: 154, height: 103 },
  fence: { width: 108, height: 72 },
  fountain: { width: 145, height: 97 },
  flowerbed: { width: 96, height: 64 },
};

export const spriteCells: Record<SpriteName, { column: number; row: number }> =
  {
    grass: { column: 0, row: 0 },
    stone: { column: 1, row: 0 },
    dirt: { column: 2, row: 0 },
    water: { column: 3, row: 0 },
    tree: { column: 0, row: 1 },
    bench: { column: 1, row: 1 },
    lamp: { column: 2, row: 1 },
    planter: { column: 3, row: 1 },
    cafe: { column: 0, row: 2 },
    home: { column: 1, row: 2 },
    lobby: { column: 2, row: 2 },
    office: { column: 3, row: 2 },
    bridge: { column: 0, row: 3 },
    fence: { column: 1, row: 3 },
    fountain: { column: 2, row: 3 },
    flowerbed: { column: 3, row: 3 },
  };

export type PreviewCharacter = MapPoint & { name: string; src: string };

// These are runtime participants, not map-owned data. Their final cells are chosen per map.
export const previewCharacters: PreviewCharacter[] = [
  { name: "あなた", src: "/assets/npc/元気な女の子.png", column: 6, row: 9 },
  {
    name: "ハル",
    src: "/assets/npc/おとなしめの男の子.png",
    column: 5,
    row: 8,
  },
  {
    name: "レイ",
    src: "/assets/npc/かっこいい_お兄さん.png",
    column: 7,
    row: 7,
  },
  { name: "アオイ", src: "/assets/npc/クールな女の子.png", column: 8, row: 9 },
];
