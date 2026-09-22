/**
 * 会場テンプレートと共通マップの対応。
 *
 * ここは純粋なデータと関数だけを置きます(tests/events.test.mjs から直接読み込むため、
 * @/ エイリアスや React への依存を持ち込まないでください)。
 */

import type { MapSceneId } from "../../components/map/map-registry";
import type { VenueTemplate } from "./types";

/**
 * 会場テンプレートごとのマップ。
 *
 * テンプレート別のマップはまだ用意していないため、3種とも同じラウンジを使います。
 * 専用のマップを追加したら、ここを差し替えるだけで切り替わります。
 */
export const VENUE_MAP_IDS: Record<VenueTemplate, MapSceneId> = {
  HALL: "komorebi-lounge",
  PARTY_ROOM: "komorebi-lounge",
  CLASSROOM: "komorebi-lounge",
};

/** 会場作成の選択肢に出す名前。 */
export const VENUE_TEMPLATE_LABELS: Record<VenueTemplate, string> = {
  HALL: "ホール",
  PARTY_ROOM: "パーティールーム",
  CLASSROOM: "教室",
};

export const VENUE_TEMPLATES = Object.keys(VENUE_MAP_IDS) as VenueTemplate[];

export function venueMapId(template: VenueTemplate): MapSceneId {
  return VENUE_MAP_IDS[template] ?? VENUE_MAP_IDS.HALL;
}

export function venueTemplateLabel(template: VenueTemplate): string {
  return VENUE_TEMPLATE_LABELS[template] ?? VENUE_TEMPLATE_LABELS.HALL;
}
