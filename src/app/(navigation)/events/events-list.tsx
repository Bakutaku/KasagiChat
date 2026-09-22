"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LuArchive,
  LuCalendar,
  LuMapPin,
  LuPlus,
  LuTicket,
  LuTrash2,
  LuUsers,
} from "react-icons/lu";

import ErrorAlert from "@/components/feedback/error-alert";
import { InvitePanel } from "@/components/events/invite-panel";
import { eventApi } from "@/features/events/api";
import {
  EVENT_ERROR_MESSAGES,
  eventPhaseBadgeClass,
  eventPhaseLabel,
  formatEventPeriod,
} from "@/features/events/presentation";
import type { KasagiEvent } from "@/features/events/types";
import { venueTemplateLabel } from "@/features/events/venue";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";

/** 招待コードの入力ゆれを吸収する。サーバーも大文字へ正規化して照合する。 */
function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function EventsList() {
  const router = useRouter();
  const [events, setEvents] = useState<KasagiEvent[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    eventApi.list(controller.signal).then(
      (value) => {
        if (controller.signal.aborted) return;
        setEvents(value);
        setLoadError(null);
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setEvents([]);
        setLoadError(
          getErrorMessage(error, {
            codes: EVENT_ERROR_MESSAGES,
            fallback: "イベントを読み込めませんでした。",
          }),
        );
      },
    );
    return () => controller.abort();
  }, [requestId]);

  async function runAction(
    event: KasagiEvent,
    action: (eventId: string) => Promise<unknown>,
  ) {
    setPendingId(event.id);
    setActionError(null);
    try {
      await action(event.id);
      setRequestId((value) => value + 1);
    } catch (error) {
      setActionError(
        getErrorMessage(error, {
          codes: EVENT_ERROR_MESSAGES,
          fallback: "操作に失敗しました。",
        }),
      );
    } finally {
      setPendingId(null);
    }
  }

  function openInvitation(submitted: React.FormEvent) {
    submitted.preventDefault();
    const normalized = normalizeCode(code);
    if (normalized) {
      router.push(`/invite/${normalized}`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">イベント</h1>
          <p className="mt-1 text-sm opacity-70">
            参加すると、共通点のある人の分身が会場に集まります。
          </p>
        </div>
        <Link href="/events/new" className="btn btn-primary btn-sm sm:btn-md">
          <LuPlus aria-hidden="true" />
          イベントを作る
        </Link>
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-2 rounded-box border border-base-300 bg-base-100 p-4"
        onSubmit={openInvitation}
      >
        <label className="flex-1" htmlFor="invite-code">
          <span className="flex items-center gap-2 text-sm font-medium">
            <LuTicket aria-hidden="true" />
            招待コードで参加
          </span>
          <input
            id="invite-code"
            className="input input-bordered mt-1 w-full font-mono tracking-widest"
            value={code}
            onChange={(changed) => setCode(changed.target.value)}
            placeholder="DEMO2026"
            maxLength={16}
            autoComplete="off"
          />
        </label>
        <button type="submit" className="btn" disabled={!normalizeCode(code)}>
          確認する
        </button>
      </form>

      {loadError && <ErrorAlert message={loadError} className="mt-4" />}
      {actionError && <ErrorAlert message={actionError} className="mt-4" />}

      {events === null && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="skeleton h-28 w-full" />
          <div className="skeleton h-28 w-full" />
        </div>
      )}

      {events !== null && events.length === 0 && !loadError && (
        <div className="mt-6 rounded-box border border-base-300 bg-base-100 p-8 text-center">
          <p className="font-medium">まだ参加中のイベントはありません。</p>
          <p className="mt-1 text-sm opacity-70">
            招待コードを受け取るか、自分でイベントを作ってみてください。
          </p>
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-4">
        {(events ?? []).map((event) => (
          <li key={event.id} className="card border border-base-300 bg-base-100">
            <div className="card-body gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="card-title">{event.title}</h2>
                <span className={`badge ${eventPhaseBadgeClass(event.phase)}`}>
                  {eventPhaseLabel(event.phase)}
                </span>
              </div>

              {event.description && (
                <p className="whitespace-pre-wrap text-sm opacity-80">
                  {event.description}
                </p>
              )}

              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm opacity-70">
                <div className="flex items-center gap-1">
                  <LuCalendar aria-hidden="true" />
                  <dt className="sr-only">開催期間</dt>
                  <dd>{formatEventPeriod(event.startsAt, event.endsAt)}</dd>
                </div>
                <div className="flex items-center gap-1">
                  <LuUsers aria-hidden="true" />
                  <dt className="sr-only">参加人数</dt>
                  <dd>{event.participantCount}人</dd>
                </div>
                <div className="flex items-center gap-1">
                  <LuMapPin aria-hidden="true" />
                  <dt className="sr-only">会場</dt>
                  <dd>{venueTemplateLabel(event.venueTemplate)}</dd>
                </div>
              </dl>

              {event.inviteCode && <InvitePanel inviteCode={event.inviteCode} />}

              <div className="card-actions justify-end">
                {event.joined && event.phase !== "ENDED" && (
                  <Link href={`/events/${event.id}`} className="btn btn-primary btn-sm">
                    会場へ
                  </Link>
                )}
                {event.owner && event.phase !== "ENDED" && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={pendingId === event.id}
                    onClick={() => runAction(event, eventApi.archive)}
                  >
                    <LuArchive aria-hidden="true" />
                    終了する
                  </button>
                )}
                {event.owner && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-error"
                    disabled={pendingId === event.id}
                    onClick={() => runAction(event, eventApi.remove)}
                  >
                    <LuTrash2 aria-hidden="true" />
                    削除
                  </button>
                )}
                {event.joined && !event.owner && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={pendingId === event.id}
                    onClick={() => runAction(event, eventApi.leave)}
                  >
                    退出する
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
