/**
 * 出会いカードAPIの型定義。
 *
 * サーバー(Spring Boot)のレスポンスをそのまま写したものです。
 * opened / score / commonTags はサーバーが正で、画面側で計算し直しません。
 */

export type Card = {
  /** カードのID(UUID)。 */
  id: string;
  eventId: string;
  eventTitle: string;
  partnerName: string;
  partnerPresetId: string;
  score: number;
  /** 未開封でも入るカード表面用のタグ。キー自体が無い場合は空配列として扱う。 */
  commonTags: string[] | null;
  opened: boolean;
  /** 未開封はキー自体が無いレスポンスなので null として扱う。 */
  openedAt: string | null;
  /** 未開封はキー自体が無いレスポンスなので null として扱う。 */
  report: string | null;
  /** 未開封はキー自体が無いレスポンスなので null として扱う。 */
  recommendedTopics: string[] | null;
};
