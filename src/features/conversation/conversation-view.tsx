"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { SubmitEvent } from "react";
import { LuCircleAlert, LuLoaderCircle, LuSend } from "react-icons/lu";
import { MAX_MESSAGE_LENGTH } from "./constants";
import type { ConversationMessage } from "./types";

/**
 * 会話の表示部分(メッセージ一覧・入力欄・末尾スクロール)。
 *
 * 状態は一切持たず、useConversation の値をそのまま受け取ります。
 * 会話種別に固有のUI(BIRTHの誕生確定パネルなど)は footer スロットへ差し込みます。
 */
export type ConversationViewProps = {
  messages: ConversationMessage[];
  /** 相手の表示名(NPC名)。吹き出しのラベルとプレースホルダーに使う。 */
  assistantName: string;
  draft: string;
  onDraftChange: (value: string) => void;
  /** 送信要求。useConversation の send をそのまま渡せる。 */
  onSend: () => void;
  isSending: boolean;
  canSend: boolean;
  /** 会話が締めくくられているか。true なら入力欄を出さない。 */
  isFinished: boolean;
  /** 入力欄を一時的に触らせない(振り返り中など)。 */
  isInputLocked?: boolean;
  error?: string | null;
  /** 入力欄の下(誕生確定パネルなど、会話種別ごとの操作)。 */
  footer?: ReactNode;
};

export default function ConversationView({
  messages,
  assistantName,
  draft,
  onDraftChange,
  onSend,
  isSending,
  canSend,
  isFinished,
  isInputLocked = false,
  error,
  footer,
}: ConversationViewProps) {
  // メッセージ末尾の目印。新着時と返答待ち表示の切り替え時にここまでスクロールする。
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages.length, isSending]);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend();
  }

  return (
    <div className="flex h-full min-h-0 flex-col text-base-content">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        {/* メッセージ一覧: USERは右(chat-end)、相手は左(chat-start) */}
        <div className="mx-auto w-full max-w-3xl space-y-4" aria-live="polite">
          {messages.map((message, index) => {
            const isUser = message.role === "USER";

            return (
              // サーバーはメッセージIDを返さないため、並び順が変わらないことを前提にindexで識別する。
              <div
                key={`${message.role}-${index}`}
                className={`chat ${isUser ? "chat-end" : "chat-start"}`}
              >
                <div className="chat-header mb-1 text-xs text-base-content/50">
                  {isUser ? "あなた" : assistantName}
                </div>
                <div
                  className={`chat-bubble leading-7 ${isUser ? "chat-bubble-primary" : "bg-base-100 text-base-content shadow-sm"}`}
                >
                  {message.text}
                </div>
              </div>
            );
          })}

          {/* 返答待ちインジケーター */}
          {isSending && (
            <div className="chat chat-start">
              <div className="chat-header mb-1 text-xs text-base-content/50">
                {assistantName}
              </div>
              <div
                className="chat-bubble bg-base-100 text-base-content shadow-sm"
                aria-label={`${assistantName}が考え中`}
              >
                <span className="loading loading-dots loading-sm" />
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>
      </div>

      {/* 右パネル下部: エラー / 入力フォーム / 追加操作 */}
      <div className="shrink-0 border-t border-base-300/80 bg-base-100/75 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {error && (
            <div className="alert alert-error mb-3" role="alert">
              <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {!isFinished && (
            <form className="flex items-end gap-2" onSubmit={handleSubmit}>
              <label className="form-control flex-1">
                <span className="sr-only">{assistantName}への返事</span>
                <textarea
                  className="textarea textarea-bordered min-h-14 w-full resize-none bg-base-100"
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  placeholder={`${assistantName}に返事をする`}
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={2}
                  disabled={isSending || isInputLocked}
                />
              </label>
              <button
                className="btn btn-primary btn-square btn-lg"
                type="submit"
                disabled={!canSend}
                aria-label="返事を送る"
              >
                {isSending ? (
                  <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <LuSend aria-hidden="true" />
                )}
              </button>
            </form>
          )}

          {footer}
        </div>
      </div>
    </div>
  );
}
