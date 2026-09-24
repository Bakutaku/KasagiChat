"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuArrowUpRight, LuMail, LuMailOpen, LuSparkles } from "react-icons/lu";

import ErrorAlert from "@/components/feedback/error-alert";
import { cardApi } from "@/features/cards/api";
import { CARD_ERROR_MESSAGES } from "@/features/cards/presentation";
import type { Card } from "@/features/cards/types";
import { presetImagePath } from "@/features/npc/presets";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";

/** カード一覧画面。eventId があればその会場宛て、無ければ自分宛て全件を表示する。 */
export function CardsList({ eventId }: { eventId: string | null }) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const unopenedCount = cards?.filter((card) => !card.opened).length ?? 0;

  useEffect(() => {
    const controller = new AbortController();
    const request = eventId
      ? cardApi.listByEvent(eventId, controller.signal)
      : cardApi.listAll(controller.signal);
    request.then(
      (value) => {
        if (controller.signal.aborted) return;
        setCards(value);
        setLoadError(null);
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setCards([]);
        setLoadError(
          getErrorMessage(error, {
            codes: CARD_ERROR_MESSAGES,
            fallback: "カードを読み込めませんでした。",
          }),
        );
      },
    );
    return () => controller.abort();
  }, [eventId]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-linear-to-b from-primary/5 via-base-200 to-base-200">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <header className="relative overflow-hidden rounded-3xl border border-base-300 bg-linear-to-br from-base-100 via-base-100 to-primary/10 px-5 py-6 shadow-sm sm:px-8">
          <div
            className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full border-[20px] border-primary/10"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary">
              <LuMail aria-hidden="true" />
              届いた手紙
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              出会いカード
            </h1>
            <p className="mt-2 text-sm text-base-content/70">
              {eventId
                ? "このイベントで届いたカードです。"
                : "これまでに届いたカードです。新しい順に並んでいます。"}
            </p>
            {cards !== null && cards.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="badge badge-soft badge-primary gap-1.5">
                  <LuMail aria-hidden="true" />
                  {cards.length}枚のカード
                </span>
                {unopenedCount > 0 && (
                  <span className="badge badge-outline gap-1.5">
                    <LuMail aria-hidden="true" />
                    未開封 {unopenedCount}枚
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {loadError && <ErrorAlert message={loadError} className="mt-4" />}

        {cards === null && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        )}

        {cards !== null && cards.length === 0 && !loadError && (
          <div className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-8 text-center shadow-sm">
            <LuMail
              className="mx-auto mb-3 size-9 text-primary/60"
              aria-hidden="true"
            />
            <p className="font-medium">まだカードは届いていません。</p>
            <p className="mt-1 text-sm opacity-70">
              イベントに参加すると、共通点のある相手からカードが届きます。
            </p>
          </div>
        )}

        <ul
          className={`mt-6 grid gap-4 ${cards !== null && cards.length > 1 ? "lg:grid-cols-2" : ""}`}
        >
          {(cards ?? []).map((card) => (
            <li key={card.id}>
              <Link
                href={`/cards/${card.id}`}
                className={`card card-side group h-full overflow-hidden border bg-base-100 shadow-sm hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${card.opened ? "border-base-300" : "border-primary/40"}`}
              >
                <figure
                  className={`flex w-24 shrink-0 items-center justify-center border-r p-2 sm:w-32 sm:p-3 ${card.opened ? "border-base-300 bg-base-200" : "border-primary/10 bg-primary/10"}`}
                >
                  <Image
                    src={presetImagePath(card.partnerPresetId)}
                    alt=""
                    width={96}
                    height={96}
                    className="max-h-28 w-full object-contain"
                  />
                </figure>
                <div className="card-body min-w-0 gap-2 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="card-title min-w-0 text-base sm:text-lg">
                      {card.partnerName}
                    </h2>
                    {card.opened ? (
                      <span className="badge badge-ghost badge-sm gap-1">
                        <LuMailOpen aria-hidden="true" />
                        開封済み
                      </span>
                    ) : (
                      <span className="badge badge-primary badge-sm gap-1">
                        <LuMail aria-hidden="true" />
                        未開封
                      </span>
                    )}
                  </div>
                  {!eventId && (
                    <p className="text-xs opacity-60">{card.eventTitle}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(card.commonTags ?? []).length > 0 ? (
                      (card.commonTags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="badge badge-outline badge-sm gap-1"
                        >
                          <LuSparkles aria-hidden="true" />
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs opacity-50">共通点なし</span>
                    )}
                  </div>
                  <span className="mt-1 flex items-center gap-1 self-end text-xs font-bold text-primary">
                    カードを見る
                    <LuArrowUpRight aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
