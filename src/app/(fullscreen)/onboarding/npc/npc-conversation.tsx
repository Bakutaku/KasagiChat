"use client";

import Image from "next/image";
import { LuLoaderCircle, LuSparkles } from "react-icons/lu";
import ConversationView from "@/features/conversation/conversation-view";
import type { Conversation } from "@/features/conversation/types";
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
}) {
  return (
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
      header={
        <header className="border-b border-base-300 bg-base-100 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-base-200">
              <Image
                src={presetImagePath(npc.presetId)}
                alt=""
                fill
                sizes="48px"
                className="object-contain object-bottom"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{npc.name}との最初の会話</p>
              <p className="text-xs text-base-content/50">
                あなたの言葉から、最初の個性が育ちます
              </p>
            </div>
            <div className="badge badge-ghost shrink-0">
              {conversation.turn}/{BIRTH_MAX_TURNS} 往復
            </div>
          </div>
        </header>
      }
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
              onClick={onReview}
              disabled={isReviewing || isSending}
            >
              {isReviewing ? (
                <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <LuSparkles aria-hidden="true" />
              )}
              {isReviewing ? "思い出を結んでいます…" : "会話を終えて誕生する"}
            </button>
          </div>
        )
      }
    />
  );
}
