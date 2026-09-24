"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LuArrowLeft,
  LuBird,
  LuLightbulb,
  LuMailOpen,
  LuRefreshCw,
  LuSparkles,
} from "react-icons/lu";

import ErrorAlert from "@/components/feedback/error-alert";
import { cardApi } from "@/features/cards/api";
import { CARD_ERROR_MESSAGES } from "@/features/cards/presentation";
import type { Card } from "@/features/cards/types";
import { presetImagePath } from "@/features/npc/presets";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";

/**
 * カード開封画面。
 *
 * 表面(未開封) → 開封中(カササギの手紙運びローディング) → 会話報告、の順に演出する。
 * すでに開封済みのカードを開いた場合は、保存済みの会話報告をそのまま表示する
 * (バックエンドは再生成しない)。
 */
export function CardDetail({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<Card | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    cardApi.get(cardId, controller.signal).then(
      (value) => {
        if (controller.signal.aborted) return;
        setCard(value);
        setLoadError(null);
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setLoadError(
          getErrorMessage(error, {
            codes: CARD_ERROR_MESSAGES,
            fallback: "カードを読み込めませんでした。",
          }),
        );
      },
    );
    return () => controller.abort();
  }, [cardId]);

  async function handleOpen() {
    if (opening) return;
    setOpening(true);
    setOpenError(null);
    try {
      const opened = await cardApi.open(cardId);
      setCard(opened);
    } catch (error) {
      if (isAbortError(error)) return;
      setOpenError(
        getErrorMessage(error, {
          codes: CARD_ERROR_MESSAGES,
          fallback: "カードを開封できませんでした。",
        }),
      );
    } finally {
      setOpening(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <h1 className="text-xl font-bold">カードを開けませんでした</h1>
        <ErrorAlert message={loadError} className="mt-4" />
        <Link href="/cards" className="btn btn-primary mt-6">
          <LuArrowLeft aria-hidden="true" />
          カード一覧へ
        </Link>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-3">
          <span
            className="loading loading-spinner loading-lg"
            aria-label="カードを読み込み中"
          />
        </div>
      </div>
    );
  }

  if (opening) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
        <LuBird
          className="size-16 animate-bounce text-primary"
          aria-hidden="true"
        />
        <p className="mt-5 text-lg font-bold">カササギが手紙を運んでいます…</p>
        <p className="mt-1 text-sm opacity-70">
          {card.partnerName}との会話報告をまとめています。少し待ってね。
        </p>
        <span
          className="loading loading-dots loading-md mt-4"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-linear-to-b from-primary/5 via-base-200 to-base-200 px-4 py-8 sm:px-6 lg:py-10">
      <div
        className={`mx-auto w-full ${card.opened ? "max-w-5xl" : "max-w-2xl"}`}
      >
        <Link href="/cards" className="btn btn-ghost btn-sm">
          <LuArrowLeft aria-hidden="true" />
          カード一覧へ
        </Link>

        <article
          className={`mt-4 overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-md ${card.opened ? "lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : ""}`}
        >
          <header
            className={`relative overflow-hidden bg-linear-to-br from-primary/10 via-base-100 to-base-100 px-5 py-7 text-center sm:px-8 ${card.opened ? "lg:flex lg:items-center lg:justify-center" : ""}`}
          >
            <div
              className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full border-[22px] border-primary/10"
              aria-hidden="true"
            />
            <div className="relative">
              <p className="flex items-center justify-center gap-2 text-xs font-bold tracking-widest text-primary">
                <LuSparkles aria-hidden="true" />
                出会いの記録
              </p>
              <div className="mx-auto mt-5 flex size-28 items-center justify-center rounded-full border-4 border-base-100 bg-base-200 p-2 shadow-sm sm:size-32">
                <Image
                  src={presetImagePath(card.partnerPresetId)}
                  alt=""
                  width={112}
                  height={112}
                  className="h-full w-full object-contain"
                />
              </div>
              <h1 className="mt-4 text-2xl font-bold">{card.partnerName}</h1>
              <p className="mt-1 text-sm text-base-content/65">
                {card.eventTitle}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {(card.commonTags ?? []).length > 0 ? (
                  (card.commonTags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="badge badge-outline gap-1 bg-base-100"
                    >
                      <LuSparkles aria-hidden="true" />
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-base-content/50">
                    共通点なし
                  </span>
                )}
              </div>

              {!card.opened && (
                <div className="mt-6">
                  {openError && (
                    <ErrorAlert
                      message={openError}
                      className="mb-4 text-left"
                    />
                  )}
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    onClick={handleOpen}
                  >
                    {openError ? (
                      <>
                        <LuRefreshCw aria-hidden="true" />
                        もう一度開封する
                      </>
                    ) : (
                      <>
                        <LuMailOpen aria-hidden="true" />
                        開封する
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </header>

          {card.opened && (
            <div className="space-y-7 border-t border-base-300 px-5 py-6 sm:px-8 sm:py-8 lg:border-t-0 lg:border-l">
              <section aria-labelledby="conversation-report-title">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <LuMailOpen aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold tracking-widest text-primary">
                      CONVERSATION
                    </p>
                    <h2 id="conversation-report-title" className="font-bold">
                      {card.partnerName}との会話報告
                    </h2>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words rounded-2xl border border-base-300 bg-base-200/60 px-5 py-5 text-sm leading-7 sm:px-6">
                  {card.report}
                </p>
              </section>

              {(card.recommendedTopics ?? []).length > 0 && (
                <section aria-labelledby="recommended-topics-title">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <LuLightbulb aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-bold tracking-widest text-primary">
                        NEXT TOPICS
                      </p>
                      <h2 id="recommended-topics-title" className="font-bold">
                        おすすめの話題
                      </h2>
                    </div>
                  </div>
                  <ol className="mt-4 space-y-2">
                    {(card.recommendedTopics ?? []).map((topic, index) => (
                      <li
                        key={`${topic}-${index}`}
                        className="flex items-start gap-3 rounded-2xl border border-base-300 px-4 py-3 text-sm leading-relaxed"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <span className="min-w-0 break-words">{topic}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
