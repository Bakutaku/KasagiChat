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
 * こもれびラウンジの座席。中央のカーペット(列3〜7・行3〜6)を囲む木床のリング。
 *
 * 共通描画は同じマスのキャラクターを重ねて描くため、座席は重複させません。
 * 並びは中央から外側へ交互にして、少人数でも輪になって話しているように見せます。
 */
const LOUNGE_SEATS: readonly MapPoint[] = [
  { column: 5, row: 2 },
  { column: 5, row: 7 },
  { column: 4, row: 2 },
  { column: 6, row: 2 },
  { column: 4, row: 7 },
  { column: 6, row: 7 },
  { column: 3, row: 2 },
  { column: 7, row: 2 },
  { column: 3, row: 7 },
  { column: 7, row: 7 },
  { column: 2, row: 4 },
  { column: 8, row: 4 },
  { column: 2, row: 5 },
  { column: 8, row: 5 },
  { column: 2, row: 3 },
  { column: 8, row: 3 },
  { column: 2, row: 6 },
  { column: 8, row: 6 },
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
