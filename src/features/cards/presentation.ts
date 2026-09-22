/**
 * 出会いカードAPIの業務エラー文言。
 *
 * 通信失敗・401・5xxは @/lib/api/errors の共通文言に任せ、ここにはカード関連の
 * 業務コードだけを置く。開封(LLM呼び出し)の業務コードは既存の会話機能
 * (@/features/conversation/errors)と共通のため、文言もそちらへ合わせる。
 */

export const CARD_ERROR_MESSAGES: Record<string, string> = {
  CARD_NOT_FOUND:
    "カードが見つかりません。届いていないか、他の人宛てかもしれません。",
  EVENT_NOT_STARTED: "このイベントはまだ始まっていません。開始後に開封できます。",
  EVENT_NOT_FOUND:
    "イベントが見つかりません。終了・削除されたか、参加がまだかもしれません。",
  CREDENTIAL_NOT_CONFIGURED: "先にAI利用設定を完了してください。",
  DEMO_LIMIT_EXCEEDED:
    "デモ利用の上限に達しました。AI利用設定から自分のAPIキーへ切り替えてください。",
  LLM_CALL_FAILED:
    "カササギが手紙を届けられませんでした。もう一度開封をお試しください。",
};
