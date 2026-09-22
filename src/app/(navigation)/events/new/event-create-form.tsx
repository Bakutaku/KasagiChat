"use client";

import Link from "next/link";
import { useState } from "react";
import { LuArrowLeft, LuSparkles } from "react-icons/lu";

import ErrorAlert from "@/components/feedback/error-alert";
import { InvitePanel } from "@/components/events/invite-panel";
import { eventApi } from "@/features/events/api";
import {
  EVENT_ERROR_MESSAGES,
  formatEventPeriod,
  toDatetimeLocalValue,
  toIsoUtc,
} from "@/features/events/presentation";
import type { KasagiEvent, VenueTemplate } from "@/features/events/types";
import { VENUE_TEMPLATES, venueTemplateLabel } from "@/features/events/venue";
import { getErrorMessage } from "@/lib/api/errors";

const HOUR = 60 * 60 * 1000;

/** 次の正時を初期値にする。入力・表示とも日本時間で扱う。 */
function defaultPeriod() {
  const nextHour = Math.ceil(Date.now() / HOUR) * HOUR;
  return {
    startsAt: toDatetimeLocalValue(new Date(nextHour).toISOString()),
    endsAt: toDatetimeLocalValue(new Date(nextHour + 3 * HOUR).toISOString()),
  };
}

export function EventCreateForm() {
  const initial = defaultPeriod();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [endsAt, setEndsAt] = useState(initial.endsAt);
  const [venueTemplate, setVenueTemplate] = useState<VenueTemplate>("HALL");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<KasagiEvent | null>(null);

  const periodIsValid = Boolean(
    toIsoUtc(startsAt) && toIsoUtc(endsAt) && toIsoUtc(endsAt) > toIsoUtc(startsAt),
  );

  async function submit(submitted: React.FormEvent) {
    submitted.preventDefault();
    if (submitting) return;
    if (!periodIsValid) {
      setError(EVENT_ERROR_MESSAGES.INVALID_EVENT_PERIOD);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setCreated(
        await eventApi.create({
          title: title.trim(),
          description: description.trim() || null,
          startsAt: toIsoUtc(startsAt),
          endsAt: toIsoUtc(endsAt),
          venueTemplate,
        }),
      );
    } catch (failure) {
      setError(
        getErrorMessage(failure, {
          codes: EVENT_ERROR_MESSAGES,
          fallback: "イベントを作成できませんでした。",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <LuSparkles aria-hidden="true" className="text-primary" />
          イベントを作成しました
        </h1>
        <p className="mt-2 text-sm opacity-70">
          {created.title}（{formatEventPeriod(created.startsAt, created.endsAt)}）
        </p>

        {created.inviteCode && (
          <InvitePanel inviteCode={created.inviteCode} className="mt-6" />
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/events/${created.id}`} className="btn btn-primary">
            会場を見る
          </Link>
          <Link href="/events" className="btn">
            イベント一覧へ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/events" className="btn btn-ghost btn-sm -ml-2">
        <LuArrowLeft aria-hidden="true" />
        イベント一覧
      </Link>
      <h1 className="mt-2 text-2xl font-bold">イベントを作る</h1>
      <p className="mt-1 text-sm opacity-70">
        作成すると招待コードが発行され、あなたも参加者として会場に並びます。
      </p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
        <label className="form-control">
          <span className="label-text font-medium">タイトル</span>
          <input
            className="input input-bordered mt-1 w-full"
            value={title}
            onChange={(changed) => setTitle(changed.target.value)}
            maxLength={100}
            required
            placeholder="技術カンファレンス懇親会"
          />
        </label>

        <label className="form-control">
          <span className="label-text font-medium">説明</span>
          <textarea
            className="textarea textarea-bordered mt-1 h-28 w-full"
            value={description}
            onChange={(changed) => setDescription(changed.target.value)}
            maxLength={2000}
            placeholder="どんな集まりかを書いておくと、参加者が安心して入れます。"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="form-control">
            <span className="label-text font-medium">開始日時</span>
            <input
              type="datetime-local"
              className="input input-bordered mt-1 w-full"
              value={startsAt}
              onChange={(changed) => setStartsAt(changed.target.value)}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text font-medium">終了日時</span>
            <input
              type="datetime-local"
              className="input input-bordered mt-1 w-full"
              value={endsAt}
              onChange={(changed) => setEndsAt(changed.target.value)}
              required
            />
          </label>
        </div>
        <p className="-mt-2 text-xs opacity-70">
          日時は日本時間で扱います。
          {!periodIsValid && (
            <span className="text-error">
              　終了日時は開始日時より後にしてください。
            </span>
          )}
        </p>

        <label className="form-control">
          <span className="label-text font-medium">会場</span>
          <select
            className="select select-bordered mt-1 w-full"
            value={venueTemplate}
            onChange={(changed) =>
              setVenueTemplate(changed.target.value as VenueTemplate)
            }
          >
            {VENUE_TEMPLATES.map((template) => (
              <option key={template} value={template}>
                {venueTemplateLabel(template)}
              </option>
            ))}
          </select>
        </label>

        {error && <ErrorAlert message={error} />}

        <div className="flex justify-end gap-2">
          <Link href="/events" className="btn btn-ghost">
            やめる
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !title.trim() || !periodIsValid}
          >
            {submitting && (
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            )}
            作成して招待コードを発行
          </button>
        </div>
      </form>
    </div>
  );
}
