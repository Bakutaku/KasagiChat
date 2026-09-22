"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuMap, LuTicket, LuUsers } from "react-icons/lu";

import ErrorAlert from "@/components/feedback/error-alert";
import { ImmersiveMapShell } from "@/components/map";
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

type Venue = { event: KasagiEvent; participants: EventParticipant[] };

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
    ]).then(
      ([event, participants]) => {
        if (controller.signal.aborted) return;
        setVenue({ event, participants });
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

  return (
    <ImmersiveMapShell
      mapId={mapId}
      interaction="fixed"
      characters={eventMapCharacters(venue.participants, mapId)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100/85 p-3 backdrop-blur">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span className="truncate">{venue.event.title}</span>
            <span className={`badge ${eventPhaseBadgeClass(venue.event.phase)}`}>
              {eventPhaseLabel(venue.event.phase)}
            </span>
          </p>
          <p className="flex items-center gap-1 text-xs opacity-70">
            <LuUsers aria-hidden="true" />
            {venue.event.participantCount}人が参加中
            {hidden > 0 && `（会場に映らない ほか${hidden}人）`}・
            {formatEventPeriod(venue.event.startsAt, venue.event.endsAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/events" className="btn btn-sm">
            イベント一覧
          </Link>
          <Link href="/map" className="btn btn-sm">
            街へ戻る
          </Link>
        </div>
      </div>
    </ImmersiveMapShell>
  );
}
