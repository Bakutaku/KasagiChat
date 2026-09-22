"use client";

import { useEffect, useState } from "react";
import { LuCheck, LuLoaderCircle, LuMap, LuHouse } from "react-icons/lu";
import { presetImagePath } from "@/features/npc/presets";
import ConversationResultPanel from "./conversation-result-panel";
import ConversationShell from "./conversation-shell";
import ConversationView from "./conversation-view";
import { conversationErrorMessages } from "./errors";
import { conversationDisplay } from "./presentation";
import { PRACTICE_SCENES } from "./scene";
import type { ConversationScene, ConversationType, ReviewResult } from "./types";
import { useConversation } from "./use-conversation";

/**
 * 練習・今日のひとことの会話1件を、開始から振り返りまで通して扱う画面部品。
 *
 * 通信は useConversation、外枠は ConversationShell、本文は ConversationView に任せ、
 * ここは「会話種別ごとの見た目と操作」だけを組み立てる。
 * NPC誕生はオンボーディング固有の演出(awakening など)を挟むため、
 * 従来どおり npc-conversation.tsx が担当する。
 */

export type ConversationSessionProps = {
  type: Exclude<ConversationType, "BIRTH">;
  scene: ConversationScene;
  npc: { name: string; presetId: string };
  /** マップや家へ重ねるときは modal。 */
  presentation: "fullscreen" | "modal";
  /** 閉じる操作。modal のときは必須。 */
  onClose?: () => void;
  /** 振り返りが完了したとき。家やマップの再読み込みに使う。 */
  onReviewed?: (result: ReviewResult) => void;
};

export default function ConversationSession({
  type,
  scene,
  npc,
  presentation,
  onClose,
  onReviewed,
}: ConversationSessionProps) {
  const [review, setReview] = useState<ReviewResult | null>(null);

  const errorMessages = conversationErrorMessages(type);
  const conversation = useConversation({
    type,
    scene,
    errorMessages,
    onReviewed: (result) => {
      setReview(result);
      onReviewed?.(result);
    },
  });

  const { start } = conversation;
  useEffect(() => {
    const controller = new AbortController();
    // 失敗は actionError に出るため、ここでは握りつぶす。
    start(controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [start]);

  const partnerImageSrc =
    type === "PRACTICE" && scene
      ? presetImagePath(PRACTICE_SCENES[scene].partnerPresetId)
      : undefined;

  // メモ化しない。onFinish が古い描画の review を捕まえると、
  // 「会話を終える」を押しても何も起きない状態になる。組み立ては十分軽い。
  const settings = conversationDisplay({
    type,
    scene,
    npcName: npc.name,
    npcImageSrc: presetImagePath(npc.presetId),
    partnerImageSrc,
    presentation,
    onFinish: () => void conversation.review(),
    onClose,
  });

  if (!conversation.conversation) {
    return (
      <ConversationLoading
        presentation={presentation}
        error={conversation.actionError}
        onClose={onClose}
      />
    );
  }

  const current = conversation.conversation;
  const isPractice = type === "PRACTICE";

  if (review) {
    return (
      <ConversationShell settings={settings} status={current.status}>
        <ConversationResultPanel
          actorName={npc.name}
          result={review}
          headline={isPractice ? "練習を終えました" : "今日のひとことを終えました"}
          actionLabel={isPractice ? "マップへ戻る" : "家へ戻る"}
          icon={isPractice ? <LuMap aria-hidden="true" /> : <LuHouse aria-hidden="true" />}
          onAction={() => onClose?.()}
        />
      </ConversationShell>
    );
  }

  return (
    <ConversationShell
      settings={settings}
      status={current.status}
      meta={
        <div className="flex items-center gap-2">
          <span className="badge badge-ghost">
            {isPractice && scene ? PRACTICE_SCENES[scene].label : "今日のひとこと"}
          </span>
          {/* 練習と今日のひとことは往復数に上限がないため、分母を出さない。 */}
          <span className="badge badge-primary badge-outline">
            {current.turn} 往復
          </span>
        </div>
      }
    >
      <ConversationView
        messages={current.messages}
        assistantName={settings.assistant.name}
        draft={conversation.draft}
        onDraftChange={conversation.setDraft}
        onSend={conversation.send}
        failedMessage={conversation.failedMessage}
        onRetrySend={conversation.retrySend}
        isSending={conversation.isSending}
        canSend={conversation.canSend}
        isFinished={conversation.isFinished}
        isInputLocked={conversation.isReviewing}
        error={conversation.actionError}
        footer={
          current.canFinish && (
            <div className="mt-3 flex flex-col items-center justify-between gap-3 rounded-box border border-primary/20 bg-primary/5 p-4 sm:flex-row">
              <p className="text-sm leading-6 text-base-content/65">
                {conversation.actionError
                  ? "振り返りに失敗しました。同じボタンでもう一度実行できます。"
                  : `${npc.name}が会話を振り返って、覚えたことを持ち帰ります。`}
              </p>
              <button
                className="btn btn-primary shrink-0"
                type="button"
                onClick={settings.onFinish}
                disabled={
                  conversation.isReviewing ||
                  conversation.isSending ||
                  !!conversation.failedMessage
                }
              >
                {conversation.isReviewing ? (
                  <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <LuCheck aria-hidden="true" />
                )}
                {conversation.isReviewing
                  ? "思い出を結んでいます…"
                  : settings.completionLabel}
              </button>
            </div>
          )
        }
      />
    </ConversationShell>
  );
}

/** 会話の取得中・取得失敗の表示。modal では同じ枠に収める。 */
function ConversationLoading({
  presentation,
  error,
  onClose,
}: {
  presentation: "fullscreen" | "modal";
  error: string | null;
  onClose?: () => void;
}) {
  const body = (
    <div className="grid min-h-60 place-items-center rounded-box border border-base-300 bg-base-100/95 p-8 shadow-xl">
      {error ? (
        <div className="max-w-md text-center">
          <p className="text-sm leading-relaxed text-error" role="alert">
            {error}
          </p>
          {onClose && (
            <button type="button" className="btn btn-sm mt-4" onClick={onClose}>
              閉じる
            </button>
          )}
        </div>
      ) : (
        <span className="loading loading-dots loading-lg" role="status" aria-label="会話を準備しています" />
      )}
    </div>
  );

  if (presentation === "fullscreen") {
    return <div className="grid min-h-dvh place-items-center p-6">{body}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-6 backdrop-blur-sm">
      {body}
    </div>
  );
}
