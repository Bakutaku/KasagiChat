"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuMailOpen, LuMailX, LuSparkles } from "react-icons/lu";

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
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">出会いカード</h1>
        <p className="mt-1 text-sm opacity-70">
          {eventId
            ? "このイベントで届いたカードです。"
            : "これまでに届いたカードです。新しい順に並んでいます。"}
        </p>
      </div>

      {loadError && <ErrorAlert message={loadError} className="mt-4" />}

      {cards === null && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      )}

      {cards !== null && cards.length === 0 && !loadError && (
        <div className="mt-6 rounded-box border border-base-300 bg-base-100 p-8 text-center">
          <p className="font-medium">まだカードは届いていません。</p>
          <p className="mt-1 text-sm opacity-70">
            イベントに参加すると、共通点のある相手からカードが届きます。
          </p>
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {(cards ?? []).map((card) => (
          <li key={card.id}>
            <Link
              href={`/cards/${card.id}`}
              className="card card-side border border-base-300 bg-base-100 transition-colors hover:border-primary"
            >
              <figure className="w-24 shrink-0 bg-base-200 p-2 sm:w-28">
                <Image
                  src={presetImagePath(card.partnerPresetId)}
                  alt=""
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                />
              </figure>
              <div className="card-body gap-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="card-title text-base">{card.partnerName}</h2>
                  {card.opened ? (
                    <span className="badge badge-ghost badge-sm gap-1">
                      <LuMailOpen aria-hidden="true" />
                      開封済み
                    </span>
                  ) : (
                    <span className="badge badge-primary badge-sm gap-1">
                      <LuMailX aria-hidden="true" />
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
                      <span key={tag} className="badge badge-outline badge-sm gap-1">
                        <LuSparkles aria-hidden="true" />
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs opacity-50">共通点なし</span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
