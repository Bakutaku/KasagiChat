"use client";

import { LuLoaderCircle, LuSparkles } from "react-icons/lu";
import ConversationResultPanel from "@/features/conversation/conversation-result-panel";
import ConversationShell from "@/features/conversation/conversation-shell";
import ConversationView from "@/features/conversation/conversation-view";
import type { ConversationDisplaySettings } from "@/features/conversation/presentation";
import type { Conversation, ReviewResult } from "@/features/conversation/types";
import { BIRTH_MAX_TURNS } from "@/features/npc/constants";
import { presetImagePath } from "@/features/npc/presets";
import type { Npc } from "@/features/npc/types";

/**
 * [conversation] NPCとの最初の会話。
 *
 * メッセージ一覧・入力欄は共通の ConversationView に任せ、
 * ここではBIRTH専用のヘッダー(往復数)と誕生確定パネルをスロットへ差し込む。
 */
export default function NpcConversation({
  npc,
  conversation,
  draft,
  onDraftChange,
  onSend,
  onReview,
  isSending,
  isReviewing,
  canSend,
  isFinished,
  error,
  review,
  onGoHome,
}: {
  npc: Npc;
  conversation: Conversation;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onReview: () => void;
  isSending: boolean;
  isReviewing: boolean;
  canSend: boolean;
  isFinished: boolean;
  error: string | null;
  review?: ReviewResult | null;
  onGoHome?: () => void;
}) {
  const displaySettings: ConversationDisplaySettings = {
    title: review ? `${npc.name}が誕生しました` : `${npc.name}との最初の会話`,
    assistant: {
      name: npc.name,
      imageSrc: presetImagePath(npc.presetId),
      imageAlt: `${npc.name}の姿`,
    },
    backgroundKey: "home",
    completionLabel: "会話を終えて誕生する",
    presentation: "fullscreen",
    onFinish: onReview,
  };

  return (
    <ConversationShell
      settings={displaySettings}
      status={conversation.status}
      meta={
        <div className="flex items-center gap-2">
          <span className="badge badge-ghost">最初の会話</span>
          <span className="badge badge-primary badge-outline">
            {conversation.turn}/{BIRTH_MAX_TURNS} 往復
          </span>
        </div>
      }
    >
      {review && onGoHome ? (
        <ConversationResultPanel
          actorName={npc.name}
          result={review}
          actionLabel="いっしょに家へ帰る"
          onAction={onGoHome}
        />
      ) : (
        <ConversationView
          messages={conversation.messages}
          assistantName={npc.name}
          draft={draft}
          onDraftChange={onDraftChange}
          onSend={onSend}
          isSending={isSending}
          canSend={canSend}
          isFinished={isFinished}
          isInputLocked={isReviewing}
          error={error}
          footer={
            // 誕生確定はBIRTH専用なので、共通の表示コンポーネントへ差し込む形にする。
            // 十分に会話が進んだ(canFinish)ら、会話継続中でも確定できる。
            conversation.canFinish && (
              <div className="mt-3 flex flex-col items-center justify-between gap-3 rounded-box border border-primary/20 bg-primary/5 p-4 sm:flex-row">
                <p className="text-sm leading-6 text-base-content/65">
                  {isFinished
                    ? "最初の会話を振り返って、分身の誕生を確定できます。"
                    : "ここまでの会話で誕生できます。もう少し話しても大丈夫です。"}
                </p>
                <button
                  className="btn btn-primary shrink-0"
                  type="button"
                  onClick={displaySettings.onFinish}
                  disabled={isReviewing || isSending}
                >
                  {isReviewing ? (
                    <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <LuSparkles aria-hidden="true" />
                  )}
                  {isReviewing ? "思い出を結んでいます…" : displaySettings.completionLabel}
                </button>
              </div>
            )
          }
        />
      )}
    </ConversationShell>
  );
}
