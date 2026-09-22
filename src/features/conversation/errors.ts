/**
 * 会話まわりのエラー文言。
 *
 * 通信失敗・401・5xx・CSRFは @/lib/api/errors の共通文言に任せ、
 * ここには会話の業務コードだけを置きます。
 * 会話種別ごとに伝えたいことが違うコード(CONVERSATION_TOO_SHORT など)は
 * 種別ごとの定数で上書きします。
 */

import type { ErrorMessageOverrides } from "@/lib/api/errors";
import type { ConversationType } from "./types";

/** どの会話種別でも意味が変わらないコード。 */
const SHARED_CODES: Record<string, string> = {
  CREDENTIAL_NOT_CONFIGURED: "先にAI利用設定を完了してください。",
  DEMO_LIMIT_EXCEEDED:
    "デモ利用の上限に達しました。AI利用設定から自分のAPIキーへ切り替えてください。",
  LLM_CALL_FAILED:
    "AIの返事を受け取れませんでした。送信内容は保存されていないため、もう一度試せます。",
  CONVERSATION_CONFIGURATION_ERROR:
    "会話を準備できませんでした。管理者へお問い合わせください。",
  CONVERSATION_NOT_FOUND:
    "会話が見つかりませんでした。一覧を読み直してください。",
  DAILY_QUESTION_NOT_AVAILABLE:
    "今日の質問はまだ用意できていません。練習の振り返りを終えると届きます。",
};

/** 会話種別ごとに言い換えるコード。 */
const TYPE_CODES: Record<ConversationType, Record<string, string>> = {
  BIRTH: {
    CONVERSATION_TOO_SHORT: "誕生を確定するには、あと少し会話が必要です。",
    // 会話がすでに締めくくられていたときの案内(共通の既定文言に誕生の導線を足す)。
    CONVERSATION_FINISHED:
      "会話はすでに締めくくられています。誕生の振り返りへ進めます。",
    NPC_STATE_INVALID:
      "分身はすでに誕生しています。家から会話を続けてください。",
    CONVERSATION_CONFIGURATION_ERROR:
      "最初の会話を準備できませんでした。管理者へお問い合わせください。",
  },
  PRACTICE: {
    CONVERSATION_TOO_SHORT: "振り返るには、あと少し会話が必要です。",
    CONVERSATION_FINISHED:
      "この練習はすでに締めくくられています。振り返りへ進めます。",
    NPC_STATE_INVALID:
      "分身がまだ誕生していません。先に最初の会話を終えてください。",
  },
  DAILY: {
    CONVERSATION_TOO_SHORT: "振り返るには、あと少し会話が必要です。",
    CONVERSATION_FINISHED:
      "この会話はすでに締めくくられています。振り返りへ進めます。",
    NPC_STATE_INVALID:
      "分身がまだ誕生していません。先に最初の会話を終えてください。",
  },
};

/**
 * 会話種別に対応するエラー文言を返す。
 *
 * useConversation へ渡すオブジェクトは同一性が変わらない方が扱いやすいため、
 * 種別ごとに1つだけ作って使い回す。
 */
const CACHE = new Map<ConversationType, ErrorMessageOverrides>();

export function conversationErrorMessages(
  type: ConversationType,
): ErrorMessageOverrides {
  const cached = CACHE.get(type);
  if (cached) {
    return cached;
  }

  const messages: ErrorMessageOverrides = {
    codes: { ...SHARED_CODES, ...TYPE_CODES[type] },
  };
  CACHE.set(type, messages);
  return messages;
}
