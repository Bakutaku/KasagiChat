"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LuArrowRight, LuCheck, LuSend, LuSparkles } from "react-icons/lu";
import { demoConfig, scenes } from "./fixtures";
import { turnCount } from "./service";
import { usePrototype } from "./store";
import { Avatar, Modal } from "./ui";

export function ConversationDialog({
  id,
  onClose,
  onComplete,
  completeLabel,
}: {
  id: string;
  onClose: () => void;
  onComplete?: () => void;
  completeLabel?: string;
}) {
  const { state, dispatch, preview } = usePrototype();
  const conversation = state.conversations.find((item) => item.id === id);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"reply" | "review" | null>(null);
  const [error, setError] = useState("");
  const [failReview, setFailReview] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lock = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [conversation?.messages.length, busy]);
  if (!conversation) return null;
  const scene = scenes[conversation.scene];
  const turns = turnCount(conversation.messages);
  const birth = conversation.scene === "birth";
  const finished = conversation.status === "reviewed";
  const canFinish = turns >= (birth ? demoConfig.birthEarlyExit : 1);
  const maxTurns = birth && turns >= demoConfig.birthTurns;

  function close() {
    if (!finished) dispatch({ type: "pause", id });
    onClose();
  }

  function send(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || lock.current || maxTurns || finished) return;
    lock.current = true;
    dispatch({ type: "send", id, text: draft, expectedTurn: turns });
    setDraft("");
    setBusy("reply");
    timer.current = setTimeout(() => {
      setBusy(null);
      lock.current = false;
      input.current?.focus();
    }, demoConfig.replyDelay);
  }

  function review() {
    if (lock.current || !canFinish) return;
    lock.current = true;
    setBusy("review");
    setError("");
    dispatch({ type: "pause", id });
    timer.current = setTimeout(() => {
      if (failReview) {
        setError(
          "カササギが報告をまとめるのに失敗したみたい。会話は保存されています。もう一度頼んでみましょう。",
        );
        setFailReview(false);
      } else dispatch({ type: "review", id });
      setBusy(null);
      lock.current = false;
    }, demoConfig.revealDelay);
  }

  return (
    <Modal title={scene.title} onClose={close}>
      <div className="grid md:grid-cols-[180px_1fr]">
        <aside className="flex items-center gap-3 bg-primary/5 p-4 md:flex-col md:p-6">
          <Avatar
            id={state.avatar}
            src={scene.src}
            name={scene.partner}
            className="h-24 w-20 md:h-60 md:w-36"
          />
          <div className="text-center">
            <p className="font-bold">{scene.partner}</p>
            <p className="mt-2 text-xs leading-5 text-base-content/60">
              {birth
                ? "あなたのことを聞かせてね。"
                : "ゆっくり、自分のペースで。"}
            </p>
          </div>
          {scene.src && (
            <div className="mt-auto hidden items-center gap-2 rounded-xl bg-base-100 p-2 text-xs md:flex">
              <Avatar id={state.avatar} className="h-14 w-10" />
              <span>分身も見守っています</span>
            </div>
          )}
        </aside>
        <div className="flex min-w-0 flex-col">
          {finished ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-5 p-7 text-center">
              <span className="rounded-full bg-success/15 p-4 text-success">
                <LuCheck className="size-7" />
              </span>
              <p className="text-xl font-bold">
                {birth
                  ? "これから、よろしくね。"
                  : "今日の一歩を、分身と一緒に。"}
              </p>
              <p className="text-sm leading-7">{conversation.review}</p>
              <span className="badge badge-soft badge-primary p-4">
                <LuSparkles /> +{demoConfig.reviewExp} EXP ·
                思い出を保存しました
              </span>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onComplete?.();
                }}
              >
                {completeLabel ??
                  (birth ? "家で暮らしをはじめる" : "振り返りを閉じる")}
                <LuArrowRight />
              </button>
            </div>
          ) : (
            <>
              <div
                className="max-h-[38vh] min-h-52 overflow-y-auto p-5 md:max-h-[44vh]"
                role="log"
                aria-label="会話ログ"
                aria-live="polite"
              >
                {conversation.messages.map((message, index) =>
                  busy === "reply" &&
                  index === conversation.messages.length - 1 ? null : (
                    <div
                      key={index}
                      className={`chat ${message.role === "user" ? "chat-end" : "chat-start"}`}
                    >
                      <div className="chat-header mb-1 text-xs text-base-content/50">
                        {message.role === "user" ? "あなた" : scene.partner}
                      </div>
                      <div
                        className={`chat-bubble whitespace-pre-wrap break-words text-sm leading-6 ${message.role === "user" ? "chat-bubble-primary" : "bg-base-200 text-base-content"}`}
                      >
                        {message.text}
                      </div>
                    </div>
                  ),
                )}
                {busy && (
                  <p
                    role="status"
                    className="mt-4 flex items-center gap-2 text-sm text-base-content/60"
                  >
                    <span className="loading loading-dots loading-sm" />
                    {busy === "reply"
                      ? "言葉を考えています"
                      : "カササギが振り返りを届けています"}
                  </p>
                )}
                <div ref={bottom} />
              </div>
              <div className="border-t border-base-300 p-5">
                {error && (
                  <p role="alert" className="alert alert-error mb-3 text-sm">
                    {error}
                  </p>
                )}
                {maxTurns ? (
                  <p className="mb-4 text-sm leading-6">
                    お話ありがとう。「会話を終える」で分身の誕生を振り返りましょう。
                  </p>
                ) : (
                  <form onSubmit={send} className="flex items-end gap-2">
                    <label className="flex-1">
                      <span className="sr-only">メッセージ</span>
                      <textarea
                        ref={input}
                        className="textarea w-full resize-none"
                        placeholder="あなたの言葉で話してみよう…"
                        value={draft}
                        maxLength={2000}
                        rows={2}
                        disabled={!!busy}
                        onChange={(event) => setDraft(event.target.value)}
                      />
                    </label>
                    <button
                      className="btn btn-primary btn-square"
                      type="submit"
                      aria-label="送信"
                      disabled={!draft.trim() || !!busy}
                    >
                      <LuSend />
                    </button>
                  </form>
                )}
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-xs text-base-content/50">
                    {birth
                      ? `${turns} / ${demoConfig.birthTurns} 往復 · 3往復から終了できます`
                      : `${turns} 往復 · いつでもひと休みできます`}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={review}
                    disabled={!canFinish || !!busy}
                  >
                    {error ? "振り返りを再試行" : "会話を終える"}
                  </button>
                </div>
                {preview && (
                  <details className="mt-3 text-xs text-base-content/45">
                    <summary className="cursor-pointer">
                      プレビューの動作確認
                    </summary>
                    <label className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={failReview}
                        onChange={(event) =>
                          setFailReview(event.target.checked)
                        }
                      />
                      次の振り返りを失敗させる（再試行の確認用）
                    </label>
                  </details>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
