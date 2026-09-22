/**
 * 会話APIの呼び出し。CSRFやエラー変換は @/lib/api/client が担当する。
 *
 * type / scene は引数で受け取るだけで、組み合わせの妥当性はサーバーが判断する
 * (PRACTICE はシーン必須、BIRTH と DAILY はシーン禁止)。
 */

import { api } from "@/lib/api/client";
import type {
  Conversation,
  ConversationScene,
  ConversationSummary,
  ConversationType,
  DailyQuestion,
  ReviewResult,
  SendMessageResponse,
} from "./types";

const CONVERSATIONS_PATH = "/api/conversations";

export const conversationApi = {
  /**
   * 会話を開始する。未振り返りの会話があればそれを再開して返す
   * (新規なら 201、再開なら 200。どちらもレスポンス形式は同じ)。
   */
  start: (
    type: ConversationType,
    scene: ConversationScene,
    signal?: AbortSignal,
  ) => api.post<Conversation>(CONVERSATIONS_PATH, { type, scene }, signal),

  /**
   * 未振り返りの会話を新しい順に取得する。
   * 進行中(IN_PROGRESS)と終了済み(FINISHED)の両方が返る。
   */
  listUnreviewed: async (signal?: AbortSignal): Promise<ConversationSummary[]> =>
    // 本文なし・非JSONのときクライアントは undefined を返すため、空配列へ寄せる。
    (await api.get<ConversationSummary[] | undefined>(
      `${CONVERSATIONS_PATH}?status=UNREVIEWED`,
      signal,
    )) ?? [],

  /**
   * 今日のひとことの質問を取得する。
   * まだ用意できていないときサーバーは 204 を返すため、null に寄せる。
   */
  dailyQuestion: async (signal?: AbortSignal): Promise<DailyQuestion | null> =>
    (await api.get<DailyQuestion | undefined>("/api/daily-question", signal)) ??
    null,

  /** 保存済みの状態と全メッセージを取得する。再読込やずれの解消に使う。 */
  get: (id: string, signal?: AbortSignal) =>
    api.get<Conversation>(`${CONVERSATIONS_PATH}/${id}`, signal),

  /**
   * ユーザー発言を送り、NPCの応答を1件生成する。
   * expectedTurn には画面が最後に確認した往復数を渡す(ずれていれば 409 TURN_MISMATCH)。
   */
  send: (
    id: string,
    text: string,
    expectedTurn: number,
    signal?: AbortSignal,
  ) =>
    api.post<SendMessageResponse>(
      `${CONVERSATIONS_PATH}/${id}/messages`,
      { text, expectedTurn },
      signal,
    ),

  /** 振り返りを実行する。リクエスト本文はなし。 */
  review: (id: string, signal?: AbortSignal) =>
    api.post<ReviewResult>(
      `${CONVERSATIONS_PATH}/${id}/review`,
      undefined,
      signal,
    ),
};
