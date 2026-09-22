"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LuCalendarDays,
  LuMail,
  LuMailOpen,
  LuMap,
  LuMapPin,
  LuSparkles,
  LuTicket,
  LuUsers,
} from "react-icons/lu";

import ErrorAlert from "@/components/feedback/error-alert";
import { ImmersiveMapShell } from "@/components/map";
import { cardApi } from "@/features/cards/api";
import type { Card } from "@/features/cards/types";
import { eventApi } from "@/features/events/api";
import {
  eventMapCharacters,
  hiddenParticipantCount,
} from "@/features/events/event-map-adapter";
import {
  EVENT_ERROR_MESSAGES,
  eventPhaseBadgeClass,
  eventPhaseLabel,
  formatEventPeriod,
} from "@/features/events/presentation";
import type { EventParticipant, KasagiEvent } from "@/features/events/types";
import { venueMapId } from "@/features/events/venue";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import styles from "./event-venue.module.css";

type Venue = {
  event: KasagiEvent;
  participants: EventParticipant[];
  cards: Card[];
};

/**
 * 会場の状態は画面が所有し、共通Canvasへはキャラクターの配列だけを渡す。
 *
 * 会場テンプレートが決まってからシェルを描く。先に既定のマップで描くと、
 * マップIDの変更でCanvasが作り直され、JSONを二度取得することになる。
 */
export function EventVenue({ eventId }: { eventId: string }) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      eventApi.get(eventId, controller.signal),
      eventApi.participants(eventId, controller.signal),
      cardApi.listByEvent(eventId, controller.signal),
    ]).then(
      ([event, participants, cards]) => {
        if (controller.signal.aborted) return;
        setVenue({ event, participants, cards });
        setError(null);
      },
      (failure: unknown) => {
        if (controller.signal.aborted || isAbortError(failure)) return;
        setError(
          getErrorMessage(failure, {
            codes: EVENT_ERROR_MESSAGES,
            fallback: "会場を読み込めませんでした。",
          }),
        );
      },
    );
    return () => controller.abort();
  }, [eventId]);

  // 「存在しない」と「参加していない」はサーバーが区別しないため、行き止まりにせず戻り先を示す。
  if (error) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <h1 className="text-xl font-bold">会場に入れませんでした</h1>
        <ErrorAlert message={error} className="mt-4" />
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/events" className="btn btn-primary">
            <LuTicket aria-hidden="true" />
            イベント一覧へ
          </Link>
          <Link href="/map" className="btn">
            <LuMap aria-hidden="true" />
            街へ戻る
          </Link>
        </div>
      </main>
    );
  }

  if (!venue) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner" aria-label="会場を読み込み中" />
      </main>
    );
  }

  const mapId = venueMapId(venue.event.venueTemplate);
  const hidden = hiddenParticipantCount(venue.participants, mapId);
  const characters = eventMapCharacters(venue.participants, mapId);
  const unopenedCardCount = venue.cards.filter((card) => !card.opened).length;
  const atmosphere =
    venue.event.phase === "ONGOING"
      ? "会場ではゆったり交流が続いています"
      : venue.event.phase === "UPCOMING"
        ? "もうすぐ、このラウンジに参加者が集まります"
        : "イベントの余韻が残るラウンジです";

  return (
    <ImmersiveMapShell
      mapId={mapId}
      interaction="fixed"
      characters={characters}
      canvasClassName={styles.venueCanvas}
      hudClassName={styles.venueHud}
    >
      <div className={styles.venueChrome}>
        <p className={styles.ambientStatus}>
          <span className={styles.ambientDot} aria-hidden="true" />
          {atmosphere}
        </p>
        <section className={styles.eventCard} aria-labelledby="event-venue-title">
          <div className={styles.eventIdentity}>
            <p className={styles.eyebrow}>
              <LuSparkles aria-hidden="true" />
              Event lounge
              <span aria-hidden="true">·</span>
              <LuMapPin aria-hidden="true" />
              こもれびラウンジ
            </p>
            <div className={styles.titleRow}>
              <h2 id="event-venue-title" className={styles.title}>
                {venue.event.title}
              </h2>
              <span className={`badge badge-sm ${eventPhaseBadgeClass(venue.event.phase)}`}>
                {eventPhaseLabel(venue.event.phase)}
              </span>
            </div>
            {venue.event.description && (
              <p className={styles.description}>{venue.event.description}</p>
            )}
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <LuUsers aria-hidden="true" />
                {venue.event.participantCount}人が参加
                {hidden > 0 && `・ほか${hidden}人`}
              </span>
              <span className={styles.metaItem}>
                <LuCalendarDays aria-hidden="true" />
                {formatEventPeriod(venue.event.startsAt, venue.event.endsAt)}
              </span>
            </div>
          </div>

          <div className={styles.eventSide}>
            <div className={styles.attendees} aria-label="会場にいる参加者">
              {characters.length > 0 && (
                <div className={styles.avatarStack} aria-hidden="true">
                  {characters.slice(0, 4).map((character) => (
                    <span className={styles.avatar} key={character.id}>
                      <Image
                        src={character.src}
                        alt=""
                        fill
                        sizes="35px"
                        className={styles.avatarImage}
                      />
                    </span>
                  ))}
                </div>
              )}
              <span className={styles.attendeeCopy}>
                <span className={styles.attendeeCount}>
                  {characters.length > 0 ? `${venue.event.participantCount}人の仲間` : "最初の参加者を待っています"}
                </span>
                <span className={styles.attendeeHint}>
                  会場の分身たちが、交流の時間を過ごしています
                </span>
              </span>
            </div>

            <div className={styles.cardsPanel}>
              {venue.cards.length === 0 ? (
                <span className={styles.attendeeHint}>
                  まだカードは届いていません
                </span>
              ) : (
                <>
                  <span className="badge badge-primary badge-sm gap-1">
                    <LuMail aria-hidden="true" />
                    カード{venue.cards.length}枚
                  </span>
                  {unopenedCardCount > 0 && (
                    <span className="badge badge-outline badge-sm gap-1">
                      <LuMailOpen aria-hidden="true" />
                      未開封{unopenedCardCount}枚
                    </span>
                  )}
                  <Link
                    href={`/cards?eventId=${venue.event.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    <LuMail aria-hidden="true" />
                    カードを見る
                  </Link>
                </>
              )}
            </div>

            <nav className={styles.actions} aria-label="イベント会場の移動">
              <Link href="/events" className="btn btn-ghost btn-sm">
                <LuTicket aria-hidden="true" />
                イベント一覧
              </Link>
              <Link href="/map" className="btn btn-primary btn-sm">
                <LuMap aria-hidden="true" />
                街へ戻る
              </Link>
            </nav>
          </div>
        </section>
      </div>
    </ImmersiveMapShell>
  );
}
