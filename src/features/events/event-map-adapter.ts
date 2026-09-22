/**
 * イベント会場の参加者を、共通マップが描ける形へ変換する。
 *
 * ここは純粋な関数だけを置きます(tests/events.test.mjs から直接読み込むため、
 * @/ エイリアスや React への依存を持ち込まないでください)。
 */

import type { MapSceneId } from "../../components/map/map-registry";
import type {
  MapPoint,
  RuntimeMapCharacter,
} from "../../components/map/map-types";
import { presetImagePath } from "../npc/presets";
import type { EventParticipant } from "./types";

/**
 * こもれびラウンジの立ち位置。
 *
 * 整列して見えないよう、小さな会話グループが会場へ散らばる位置にしています。
 * 小数座標でグリッド感を抑えつつ、再取得や再描画で参加者が移動しないよう配列自体は固定です。
 * 共通描画は同じ位置のキャラクターを重ねるため、座標は重複させません。
 */
const LOUNGE_SEATS: readonly MapPoint[] = [
  { column: 3.1, row: 2.35 },
  { column: 4.05, row: 2.8 },
  { column: 7.15, row: 2.25 },
  { column: 8.15, row: 2.75 },
  { column: 1.7, row: 3.7 },
  { column: 2.65, row: 4.35 },
  { column: 7.45, row: 4.05 },
  { column: 8.55, row: 4.65 },
  { column: 1.35, row: 5.85 },
  { column: 2.45, row: 6.45 },
  { column: 4.05, row: 6.1 },
  { column: 5.15, row: 6.65 },
  { column: 6.45, row: 6.05 },
  { column: 8.1, row: 6.35 },
  { column: 9.35, row: 5.75 },
  { column: 2.9, row: 7.8 },
  { column: 6.7, row: 7.65 },
  { column: 9.25, row: 7.85 },
];

/** マップごとの座席表。APIの参加者と静的なマップの対応はここだけで扱います。 */
export const VENUE_SEATS: Record<string, readonly MapPoint[]> = {
  "komorebi-lounge": LOUNGE_SEATS,
};

export function venueSeats(mapId: MapSceneId): readonly MapPoint[] {
  return VENUE_SEATS[mapId] ?? LOUNGE_SEATS;
}

/**
 * 参加者を会場の座席へ順番に割り当てる。
 *
 * 並びはサーバーが返した参加順が正です。座席が足りない分は描画しません。
 *
 * @param participants サーバーが返した参加者の一覧
 * @param mapId 会場のマップID
 * @returns 共通マップへ渡すキャラクター
 */
export function eventMapCharacters(
  participants: readonly EventParticipant[],
  mapId: MapSceneId,
): RuntimeMapCharacter[] {
  const seats = venueSeats(mapId);
  return participants.slice(0, seats.length).map((participant, index) => ({
    id: `participant-${index}`,
    name: participant.name,
    src: presetImagePath(participant.presetId),
    column: seats[index].column,
    row: seats[index].row,
    showNameLabel: false,
    showAmbientEmotes: true,
  }));
}

/**
 * 座席に入りきらず描画されない人数を返す。HUDで「ほか○人」として伝えます。
 *
 * @param participants サーバーが返した参加者の一覧
 * @param mapId 会場のマップID
 * @returns 描画されない人数
 */
export function hiddenParticipantCount(
  participants: readonly EventParticipant[],
  mapId: MapSceneId,
): number {
  return Math.max(0, participants.length - venueSeats(mapId).length);
}
