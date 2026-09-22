/**
 * イベントAPIの型定義。
 *
 * サーバー(Spring Boot)のレスポンスをそのまま写したものです。
 * phase / participantCount / owner / joined はサーバーが正で、画面側で計算し直しません。
 */

/** 会場のテンプレート。現時点ではどれも同じマップで描画します。 */
export type VenueTemplate = "HALL" | "PARTY_ROOM" | "CLASSROOM";

/** 開催フェーズ。サーバーが取得時点の日時から算出します。 */
export type EventPhase = "UPCOMING" | "ONGOING" | "ENDED";

export type KasagiEvent = {
  /** イベントの公開ID(UUID)。会場のURLに使います。 */
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  venueTemplate: VenueTemplate;
  phase: EventPhase;
  /** 作成者の分身の名前。分身が無い場合はnull。 */
  creatorName: string | null;
  participantCount: number;
  owner: boolean;
  joined: boolean;
  /** 招待コード。作成者以外にはnullが返ります。 */
  inviteCode: string | null;
};

/**
 * 会場の賑わい表示に使う参加者。
 *
 * 識別子は返りません。並びはサーバーが決めた参加順が正で、座席の割り当てもこの順に従います。
 */
export type EventParticipant = {
  name: string;
  presetId: string;
};

/** 招待コードから参照するイベントの概要。参加前でも取得できます。 */
export type Invitation = {
  eventId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  venueTemplate: VenueTemplate;
  phase: EventPhase;
  creatorName: string | null;
  participantCount: number;
  joined: boolean;
};

export type CreateEventInput = {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  venueTemplate: VenueTemplate;
};
