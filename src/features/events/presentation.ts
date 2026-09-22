/**
 * イベント画面の表示に使う、純粋なデータと関数。
 *
 * ここは tests/events.test.mjs から直接読み込むため、@/ エイリアスや React への
 * 依存を持ち込まないでください。
 */

import type { EventPhase } from "./types";

/**
 * 日時の表示と入力に使うタイムゾーン。
 *
 * 実行環境のタイムゾーンを使うと、サーバーとブラウザで文字列が食い違って
 * ハイドレーションが一致しません。日本語UIのサービスなので日本時間に固定します。
 * 日本には夏時間が無いため、固定のオフセットで足ります。
 */
const JST_OFFSET_MINUTES = 9 * 60;

const MINUTE = 60 * 1000;

const DATETIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

export const EVENT_PHASE_LABELS: Record<EventPhase, string> = {
  UPCOMING: "開催前",
  ONGOING: "開催中",
  ENDED: "終了",
};

/** daisyUIのバッジ修飾クラス。テーマを変えても意味が変わらないものだけを使う。 */
export const EVENT_PHASE_BADGE_CLASSES: Record<EventPhase, string> = {
  UPCOMING: "badge-outline",
  ONGOING: "badge-primary",
  ENDED: "badge-ghost",
};

/**
 * イベントAPIの業務エラー。
 *
 * サーバーは存在しないイベントと閲覧権限が無いイベントを区別せずEVENT_NOT_FOUNDで返すため、
 * 文言も両方に当てはまるものにする。
 */
export const EVENT_ERROR_MESSAGES: Record<string, string> = {
  EVENT_NOT_FOUND:
    "イベントが見つかりません。終了・削除されたか、招待リンクからの参加がまだかもしれません。",
  NPC_NOT_BORN: "分身が誕生すると、イベントに参加できます。",
  EVENT_ENDED: "このイベントは終了しています。",
  EVENT_HAS_PARTICIPANTS:
    "参加者がいるイベントは削除できません。終了させることはできます。",
  INVALID_EVENT_PERIOD: "終了日時は開始日時より後にしてください。",
  INVITE_CODE_GENERATION_FAILED:
    "招待コードを発行できませんでした。もう一度お試しください。",
};

export function eventPhaseLabel(phase: EventPhase): string {
  return EVENT_PHASE_LABELS[phase] ?? EVENT_PHASE_LABELS.ENDED;
}

export function eventPhaseBadgeClass(phase: EventPhase): string {
  return EVENT_PHASE_BADGE_CLASSES[phase] ?? EVENT_PHASE_BADGE_CLASSES.ENDED;
}

/**
 * datetime-localの入力値(日本時間)をサーバーへ送るISO 8601のUTCへ変換する。
 *
 * @param value "2026-03-01T19:00" 形式の入力値
 * @returns UTCのISO 8601文字列。解釈できない入力では空文字
 */
export function toIsoUtc(value: string): string {
  const parts = DATETIME_LOCAL_PATTERN.exec(value);
  if (!parts) {
    return "";
  }
  const [, year, month, day, hour, minute] = parts;
  const utc =
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) -
    JST_OFFSET_MINUTES * MINUTE;
  return new Date(utc).toISOString();
}

/**
 * サーバーのISO 8601日時をdatetime-localの入力値(日本時間)へ変換する。
 *
 * @param iso UTCのISO 8601文字列
 * @returns "2026-03-01T19:00" 形式。解釈できない入力では空文字
 */
export function toDatetimeLocalValue(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) {
    return "";
  }
  return new Date(time + JST_OFFSET_MINUTES * MINUTE).toISOString().slice(0, 16);
}

/**
 * 日時を日本時間で表示する。
 *
 * @param iso UTCのISO 8601文字列
 * @returns "2026/03/01 19:00" 形式。解釈できない入力では空文字
 */
export function formatEventDateTime(iso: string): string {
  const local = toDatetimeLocalValue(iso);
  if (!local) {
    return "";
  }
  return `${local.slice(0, 10).replace(/-/g, "/")} ${local.slice(11, 16)}`;
}

/**
 * 開催期間を1行で表示する。同じ日に終わる場合は日付を繰り返さない。
 *
 * @param startsAt 開始日時のISO 8601文字列
 * @param endsAt 終了日時のISO 8601文字列
 * @returns 表示用の期間
 */
export function formatEventPeriod(startsAt: string, endsAt: string): string {
  const start = formatEventDateTime(startsAt);
  const end = formatEventDateTime(endsAt);
  if (!start || !end) {
    return start || end;
  }
  return start.slice(0, 10) === end.slice(0, 10)
    ? `${start} 〜 ${end.slice(11)}`
    : `${start} 〜 ${end}`;
}
