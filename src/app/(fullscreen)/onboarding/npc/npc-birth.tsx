"use client";

import { useState } from "react";
import { useConversation } from "@/features/conversation/use-conversation";
import type { ReviewResult } from "@/features/conversation/types";
import { useNpcBirthFlow } from "@/features/npc/use-npc-birth-flow";
import type { ErrorMessageOverrides } from "@/lib/api/errors";
import NpcAwakening from "./npc-awakening";
import NpcConversation from "./npc-conversation";
import NpcLoading from "./npc-loading";
import NpcSelect from "./npc-select";

/**
 * NPC(分身)の誕生オンボーディング画面。
 *
 * このファイルはフックと画面の配線だけを担当する。
 *   通信・状態管理 : useNpcBirthFlow(stage / npc / 初期読み込み / NPC作成)
 *                    useConversation(会話の開始・送信・振り返り)
 *   表示           : stageごとのコンポーネント(下の分岐を参照)
 *
 * 画面遷移の詳細は useNpcBirthFlow のコメントを参照。
 */

// この画面固有のエラー文言。通信失敗・401・5xx・CSRFは @/lib/api/errors の共通文言を使う。
// モジュール定数にしてフックへ渡すオブジェクトの同一性を保つ。
const BIRTH_ERROR_MESSAGES: ErrorMessageOverrides = {
  codes: {
    CREDENTIAL_NOT_CONFIGURED: "先にAI利用設定を完了してください。",
    DEMO_LIMIT_EXCEEDED:
      "デモ利用の上限に達しました。AI利用設定から自分のAPIキーへ切り替えてください。",
    LLM_CALL_FAILED:
      "AIの返事を受け取れませんでした。送信内容は保存されていないため、もう一度試せます。",
    CONVERSATION_CONFIGURATION_ERROR:
      "最初の会話を準備できませんでした。管理者へお問い合わせください。",
    CONVERSATION_TOO_SHORT: "誕生を確定するには、あと少し会話が必要です。",
    // 会話がすでに締めくくられていたときの案内(共通の既定文言に誕生の導線を足す)。
    CONVERSATION_FINISHED:
      "会話はすでに締めくくられています。誕生の振り返りへ進めます。",
  },
};

export default function NpcBirth() {
  // 誕生確定の結果。BIRTH固有なので共通フックの外で保持する。
  const [review, setReview] = useState<ReviewResult | null>(null);

  const conversation = useConversation({
    type: "BIRTH",
    scene: null,
    errorMessages: BIRTH_ERROR_MESSAGES,
    onReviewed: setReview,
  });

  const flow = useNpcBirthFlow({
    errorMessages: BIRTH_ERROR_MESSAGES,
    // start は同一性が変わらないため、初期読み込みのuseEffectへそのまま渡せる。
    resumeConversation: conversation.start,
  });

  // setup: NPCを作成し、演出へ切り替えてから裏で最初の会話を準備する。
  async function handleCreate(presetId: string, name: string) {
    const created = await flow.createNpc(presetId, name);
    if (!created) {
      return;
    }

    // 会話準備(LLM呼び出し)に時間がかかるため、先に演出を見せる。
    flow.goToStage("awakening");
    // 失敗は conversation.actionError に出るので、ここでは再スローしない。
    await conversation.start().catch(() => undefined);
  }

  // awakening: 会話の準備に失敗したときの再試行。
  async function handleRestartConversation() {
    await conversation.start().catch(() => undefined);
  }

  // conversation: 振り返り(誕生確定)。結果は onReviewed 経由で review に入る。
  async function handleReview() {
    const result = await conversation.review();
    if (result) {
      flow.goToStage("complete");
    }
  }

  if (flow.stage === "loading") {
    return <NpcLoading error={flow.loadError} onRetry={flow.reload} />;
  }

  if (flow.stage === "setup") {
    return (
      <NpcSelect
        isCreating={flow.isCreating}
        error={flow.actionError}
        onSubmit={handleCreate}
      />
    );
  }

  if (flow.stage === "awakening" && flow.npc) {
    return (
      <NpcAwakening
        npc={flow.npc}
        isConversationReady={conversation.conversation !== null}
        isStarting={conversation.isStarting}
        error={conversation.actionError}
        onRetryStart={handleRestartConversation}
        onContinue={() => flow.goToStage("conversation")}
      />
    );
  }

  if (
    flow.stage === "complete" &&
    flow.npc &&
    review &&
    conversation.conversation
  ) {
    return (
      <NpcConversation
        npc={flow.npc}
        conversation={conversation.conversation}
        draft={conversation.draft}
        onDraftChange={conversation.setDraft}
        onSend={conversation.send}
        failedMessage={conversation.failedMessage}
        onRetrySend={conversation.retrySend}
        onReview={handleReview}
        isSending={conversation.isSending}
        isReviewing={conversation.isReviewing}
        canSend={conversation.canSend}
        isFinished={conversation.isFinished}
        error={conversation.actionError}
        review={review}
        onGoHome={flow.goHome}
      />
    );
  }

  // ここから下は conversation。必要なデータが揃うまでは何も描画しない。
  if (!flow.npc || !conversation.conversation) {
    return null;
  }

  return (
    <NpcConversation
      npc={flow.npc}
      conversation={conversation.conversation}
      draft={conversation.draft}
      onDraftChange={conversation.setDraft}
      onSend={conversation.send}
      failedMessage={conversation.failedMessage}
      onRetrySend={conversation.retrySend}
      onReview={handleReview}
      isSending={conversation.isSending}
      isReviewing={conversation.isReviewing}
      canSend={conversation.canSend}
      isFinished={conversation.isFinished}
      error={conversation.actionError}
    />
  );
}
