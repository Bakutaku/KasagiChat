/** 新規マップはここへIDを追加し、public/assets/maps/index.jsonにJSONを登録します。 */
export const mapRegistry = {
  "home-interior": { label: "家" },
  "hoshikawa-town": { label: "星川の街" },
  "komorebi-lounge": { label: "こもれびラウンジ" },
} as const;
export type MapSceneId = keyof typeof mapRegistry;

export function isMapSceneId(value: string): value is MapSceneId {
  return Object.hasOwn(mapRegistry, value);
}
