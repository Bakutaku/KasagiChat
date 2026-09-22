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
          <span className="loading loading-spinner loading-lg" aria-label="カードを読み込み中" />
        </div>
      </div>
    );
  }

  if (opening) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
        <LuBird className="size-16 animate-bounce text-primary" aria-hidden="true" />
        <p className="mt-5 text-lg font-bold">
          カササギが手紙を運んでいます…
        </p>
        <p className="mt-1 text-sm opacity-70">
          {card.partnerName}との会話報告をまとめています。少し待ってね。
        </p>
        <span className="loading loading-dots loading-md mt-4" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link href="/cards" className="btn btn-ghost btn-sm">
        <LuArrowLeft aria-hidden="true" />
        カード一覧へ
      </Link>

      <div className="mt-4 card border border-base-300 bg-base-100">
        <div className="card-body items-center gap-4 text-center">
          <p className="text-xs opacity-60">{card.eventTitle}</p>

          <div className="avatar">
            <div className="w-28 rounded-full bg-base-200 p-2">
              <Image
                src={presetImagePath(card.partnerPresetId)}
                alt=""
                width={112}
                height={112}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <h1 className="card-title text-xl">{card.partnerName}</h1>

          <div className="flex flex-wrap justify-center gap-1">
            {(card.commonTags ?? []).length > 0 ? (
              (card.commonTags ?? []).map((tag) => (
                <span key={tag} className="badge badge-outline gap-1">
                  <LuSparkles aria-hidden="true" />
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm opacity-50">共通点なし</span>
            )}
          </div>

          {openError && <ErrorAlert message={openError} className="w-full text-left" />}

          {card.opened ? (
            <div className="mt-2 flex w-full flex-col gap-4 text-left">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold opacity-80">
                  <LuMailOpen aria-hidden="true" />
                  {card.partnerName}との会話報告
                </h2>
                <p className="mt-2 whitespace-pre-wrap rounded-box bg-base-200 p-4 text-sm leading-relaxed">
                  {card.report}
                </p>
              </div>

              {(card.recommendedTopics ?? []).length > 0 && (
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold opacity-80">
                    <LuLightbulb aria-hidden="true" />
                    おすすめの話題
                  </h2>
                  <ul className="mt-2 flex flex-col gap-2">
                    {(card.recommendedTopics ?? []).map((topic) => (
                      <li
                        key={topic}
                        className="rounded-box border border-base-300 px-3 py-2 text-sm"
                      >
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="card-actions mt-2 w-full justify-center">
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
      </div>
    </div>
  );
}
