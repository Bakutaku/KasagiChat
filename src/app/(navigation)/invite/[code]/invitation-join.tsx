"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuCalendar, LuCheck, LuMapPin, LuUsers } from "react-icons/lu";

import ErrorAlert from "@/components/feedback/error-alert";
import { invitationApi } from "@/features/events/api";
import {
  EVENT_ERROR_MESSAGES,
  eventPhaseBadgeClass,
  eventPhaseLabel,
  formatEventPeriod,
} from "@/features/events/presentation";
import type { Invitation } from "@/features/events/types";
import { venueTemplateLabel } from "@/features/events/venue";
import { ApiError, isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";

/**
 * ログイン後に招待ページへ戻るための短命Cookie。
 *
 * OAuthの成功後の遷移先はサーバーが決めており、クエリ文字列は往復で失われる。
 * 初回ユーザーは規約同意・AI利用設定・分身の誕生を挟むため、有効期限は長めにとる。
 */
const PENDING_INVITE_COOKIE = "kc_pending_invite";
const PENDING_INVITE_MAX_AGE = 60 * 60;

function rememberInvite(code: string) {
  document.cookie = `${PENDING_INVITE_COOKIE}=${encodeURIComponent(code)}; Path=/; Max-Age=${PENDING_INVITE_MAX_AGE}; SameSite=Lax`;
}

export function InvitationJoin({ code }: { code: string }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    invitationApi.get(code, controller.signal).then(
      (value) => {
        if (controller.signal.aborted) return;
        setInvitation(value);
        setJoined(value.joined);
        setLoadError(null);
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        // 招待URLはQRから未ログインで開かれる。コードを預けてログインへ送る。
        if (error instanceof ApiError && error.status === 401) {
          rememberInvite(code);
          router.replace("/login");
          return;
        }
        setLoadError(
          getErrorMessage(error, {
            codes: EVENT_ERROR_MESSAGES,
            fallback: "招待を読み込めませんでした。",
          }),
        );
      },
    );
    return () => controller.abort();
  }, [code, router]);

  async function join() {
    if (joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const event = await invitationApi.join(code);
      setJoined(true);
      setInvitation((current) =>
        current
          ? { ...current, joined: true, participantCount: event.participantCount }
          : current,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        rememberInvite(code);
        router.replace("/login");
        return;
      }
      setJoinError(
        getErrorMessage(error, {
          codes: EVENT_ERROR_MESSAGES,
          fallback: "参加できませんでした。",
        }),
      );
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <p className="text-sm opacity-70">イベントへの招待</p>

      {loadError && <ErrorAlert message={loadError} className="mt-4" />}

      {!invitation && !loadError && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-24 w-full" />
        </div>
      )}

      {invitation && (
        <div className="mt-2 card border border-base-300 bg-base-100">
          <div className="card-body gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="card-title text-xl">{invitation.title}</h1>
              <span className={`badge ${eventPhaseBadgeClass(invitation.phase)}`}>
                {eventPhaseLabel(invitation.phase)}
              </span>
            </div>

            {invitation.description && (
              <p className="whitespace-pre-wrap text-sm opacity-80">
                {invitation.description}
              </p>
            )}

            <dl className="flex flex-col gap-1 text-sm opacity-70">
              <div className="flex items-center gap-2">
                <LuCalendar aria-hidden="true" />
                <dt className="sr-only">開催期間</dt>
                <dd>{formatEventPeriod(invitation.startsAt, invitation.endsAt)}</dd>
              </div>
              <div className="flex items-center gap-2">
                <LuUsers aria-hidden="true" />
                <dt className="sr-only">参加人数</dt>
                <dd>
                  {invitation.participantCount}人が参加中
                  {invitation.creatorName && `・主催 ${invitation.creatorName}`}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <LuMapPin aria-hidden="true" />
                <dt className="sr-only">会場</dt>
                <dd>{venueTemplateLabel(invitation.venueTemplate)}</dd>
              </div>
            </dl>

            {joinError && <ErrorAlert message={joinError} />}

            {joined ? (
              <div className="flex flex-col gap-3">
                <p className="flex items-center gap-2 font-medium text-primary">
                  <LuCheck aria-hidden="true" />
                  参加しています
                </p>
                <div className="card-actions">
                  <Link
                    href={`/events/${invitation.eventId}`}
                    className="btn btn-primary hidden sm:inline-flex"
                  >
                    会場へ
                  </Link>
                  <Link href="/events" className="btn">
                    イベント一覧へ
                  </Link>
                </div>
                <p className="text-xs opacity-70 sm:hidden">
                  会場のマップはPCからご覧いただけます。
                </p>
              </div>
            ) : (
              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  disabled={joining || invitation.phase === "ENDED"}
                  onClick={join}
                >
                  {joining && (
                    <span
                      className="loading loading-spinner loading-sm"
                      aria-hidden="true"
                    />
                  )}
                  {invitation.phase === "ENDED"
                    ? "終了したイベントです"
                    : "このイベントに参加する"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
