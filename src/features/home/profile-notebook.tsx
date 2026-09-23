"use client";

/**
 * プロフィール帳。
 *
 * 家の中で分身の人格文書・口調・話題リストを見返し、編集する画面。
 * 設定画面(APIキー等の事務)とは役割を分け、分身に関する操作はすべてここに置く。
 */

import { useEffect, useId, useRef, useState } from "react";
import { LuBookOpenText, LuTrash2, LuX } from "react-icons/lu";
import ErrorAlert from "@/components/feedback/error-alert";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import { npcApi } from "@/features/npc/api";
import type { Npc } from "@/features/npc/types";
import { topicApi } from "./api";
import type { HomeItem } from "./types";

const PROFILE_MAX_LENGTH = 4000;
const SPEECH_STYLE_MAX_LENGTH = 1000;

const NPC_ERROR_MESSAGES = {
  VALIDATION_FAILED:
    "文字数の上限を超えている可能性があります。内容を確認してください。",
  NPC_NOT_FOUND: "分身が見つかりませんでした。",
} as const;

const TOPIC_ERROR_MESSAGES = {
  VALIDATION_FAILED: "操作内容を確認して、もう一度お試しください。",
  TOPIC_NOT_FOUND: "話題が見つかりませんでした。プロフィール帳を開き直してください。",
} as const;

function npcErrorMessage(error: unknown) {
  return getErrorMessage(error, {
    codes: NPC_ERROR_MESSAGES,
    fallback: "保存できませんでした。もう一度お試しください。",
  });
}

function topicErrorMessage(error: unknown) {
  return getErrorMessage(error, {
    codes: TOPIC_ERROR_MESSAGES,
    fallback: "操作に失敗しました。もう一度お試しください。",
  });
}

type ProfileNotebookProps = {
  items: HomeItem[];
  onItemsChange: (updater: (items: HomeItem[]) => HomeItem[]) => void;
};

export default function ProfileNotebook({ items, onItemsChange }: ProfileNotebookProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);

  const [npc, setNpc] = useState<Npc | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadRequestId, setLoadRequestId] = useState(0);

  const [profileDraft, setProfileDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [speechStyleDraft, setSpeechStyleDraft] = useState("");
  const [savingSpeechStyle, setSavingSpeechStyle] = useState(false);
  const [speechStyleError, setSpeechStyleError] = useState<string | null>(null);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [topicError, setTopicError] = useState<string | null>(null);
  const [topicBusyId, setTopicBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    npcApi.get(controller.signal).then(
      (value) => {
        if (controller.signal.aborted) return;
        setNpc(value);
        setProfileDraft(value.profile ?? "");
        setSpeechStyleDraft(value.speechStyle ?? "");
        setLoading(false);
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setLoadError(npcErrorMessage(error));
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [open, loadRequestId]);

  function openModal() {
    setLoading(true);
    setLoadError(null);
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    setLoadRequestId((value) => value + 1);
  }

  async function saveProfile() {
    if (!npc || profileDraft === (npc.profile ?? "") || savingProfile) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      const updated = await npcApi.update({ profile: profileDraft });
      setNpc(updated);
      setProfileDraft(updated.profile ?? "");
    } catch (error) {
      setProfileError(npcErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveSpeechStyle() {
    if (!npc || speechStyleDraft === (npc.speechStyle ?? "") || savingSpeechStyle) return;
    setSavingSpeechStyle(true);
    setSpeechStyleError(null);
    try {
      const updated = await npcApi.update({ speechStyle: speechStyleDraft });
      setNpc(updated);
      setSpeechStyleDraft(updated.speechStyle ?? "");
    } catch (error) {
      setSpeechStyleError(npcErrorMessage(error));
    } finally {
      setSavingSpeechStyle(false);
    }
  }

  async function toggleSpeechStyleEnabled() {
    if (!npc || togglingEnabled) return;
    const next = !npc.speechStyleEnabled;
    setTogglingEnabled(true);
    setToggleError(null);
    try {
      const updated = await npcApi.update({ speechStyleEnabled: next });
      setNpc(updated);
    } catch (error) {
      setToggleError(npcErrorMessage(error));
    } finally {
      setTogglingEnabled(false);
    }
  }

  async function toggleTopicVisibility(item: HomeItem) {
    if (topicBusyId !== null) return;
    setTopicBusyId(item.topicId);
    setTopicError(null);
    try {
      const updated = await topicApi.updateVisibility(item.topicId, !item.publicTopic);
      onItemsChange((current) =>
        current.map((it) => (it.topicId === updated.topicId ? updated : it)),
      );
    } catch (error) {
      setTopicError(topicErrorMessage(error));
    } finally {
      setTopicBusyId(null);
    }
  }

  async function deleteTopic(item: HomeItem) {
    if (topicBusyId !== null) return;
    const confirmed = window.confirm(
      `「${item.displayName}」を削除します。この操作は取り消せません。よろしいですか?`,
    );
    if (!confirmed) return;
    setTopicBusyId(item.topicId);
    setTopicError(null);
    try {
      await topicApi.remove(item.topicId);
      onItemsChange((current) => current.filter((it) => it.topicId !== item.topicId));
    } catch (error) {
      setTopicError(topicErrorMessage(error));
    } finally {
      setTopicBusyId(null);
    }
  }

  const profileDirty = npc !== null && profileDraft !== (npc.profile ?? "");
  const speechStyleDirty = npc !== null && speechStyleDraft !== (npc.speechStyle ?? "");

  return (
    <>
      <button
        type="button"
        className="btn btn-outline btn-sm w-full justify-start"
        onClick={openModal}
        aria-haspopup="dialog"
      >
        <LuBookOpenText aria-hidden="true" />
        プロフィール帳
      </button>

      <dialog
        ref={dialogRef}
        className="modal modal-middle"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeModal();
          }
        }}
      >
        <div className="modal-box flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col overflow-hidden p-0">
          <header className="flex items-start gap-4 border-b border-base-300 px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-bold">
                プロフィール帳
              </h2>
              <p className="mt-1 text-xs text-base-content/55">
                分身の人格文書・口調・話題リストを見返し、編集できます。
              </p>
            </div>
            <button
              type="button"
              className="btn btn-circle btn-ghost btn-sm shrink-0"
              onClick={closeModal}
              aria-label="プロフィール帳を閉じる"
            >
              <LuX className="size-5" aria-hidden="true" />
            </button>
          </header>

          <div className="space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-32 w-full" />
                <div className="skeleton h-24 w-full" />
                <div className="skeleton h-24 w-full" />
              </div>
            ) : loadError ? (
              <div>
                <ErrorAlert message={loadError} />
                <button type="button" className="btn btn-outline btn-sm mt-3" onClick={retryLoad}>
                  再読み込み
                </button>
              </div>
            ) : npc ? (
              <>
                <section aria-labelledby={`${titleId}-profile`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 id={`${titleId}-profile`} className="text-sm font-bold">
                      人格文書
                    </h3>
                    <span className="text-xs text-base-content/55">
                      {profileDraft.length}/{PROFILE_MAX_LENGTH}
                    </span>
                  </div>
                  <textarea
                    className="textarea textarea-bordered mt-2 w-full text-sm leading-relaxed"
                    rows={8}
                    maxLength={PROFILE_MAX_LENGTH}
                    value={profileDraft}
                    onChange={(event) => setProfileDraft(event.target.value)}
                    disabled={savingProfile}
                    aria-label="人格文書"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {profileError && (
                      <ErrorAlert message={profileError} className="mr-auto text-xs" />
                    )}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={saveProfile}
                      disabled={!profileDirty || savingProfile}
                    >
                      {savingProfile && <span className="loading loading-spinner loading-xs" />}
                      保存
                    </button>
                  </div>
                </section>

                <section aria-labelledby={`${titleId}-speech`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id={`${titleId}-speech`} className="text-sm font-bold">
                      口調
                    </h3>
                    <label className="flex items-center gap-2 text-xs">
                      口調を会話に反映する
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={npc.speechStyleEnabled}
                        onChange={toggleSpeechStyleEnabled}
                        disabled={togglingEnabled}
                        aria-label="口調を会話に反映する"
                      />
                    </label>
                  </div>
                  {toggleError && <ErrorAlert message={toggleError} className="mt-2 text-xs" />}
                  <div className="mt-2 flex items-center justify-end text-xs text-base-content/55">
                    <span>
                      {speechStyleDraft.length}/{SPEECH_STYLE_MAX_LENGTH}
                    </span>
                  </div>
                  <textarea
                    className="textarea textarea-bordered mt-1 w-full text-sm leading-relaxed"
                    rows={5}
                    maxLength={SPEECH_STYLE_MAX_LENGTH}
                    value={speechStyleDraft}
                    onChange={(event) => setSpeechStyleDraft(event.target.value)}
                    disabled={savingSpeechStyle}
                    aria-label="口調"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {speechStyleError && (
                      <ErrorAlert message={speechStyleError} className="mr-auto text-xs" />
                    )}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={saveSpeechStyle}
                      disabled={!speechStyleDirty || savingSpeechStyle}
                    >
                      {savingSpeechStyle && (
                        <span className="loading loading-spinner loading-xs" />
                      )}
                      保存
                    </button>
                  </div>
                </section>

                <section aria-labelledby={`${titleId}-topics`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 id={`${titleId}-topics`} className="text-sm font-bold">
                      話題リスト
                    </h3>
                    <span className="badge badge-ghost badge-sm">{items.length}件</span>
                  </div>
                  {topicError && <ErrorAlert message={topicError} className="mt-2 text-xs" />}
                  {items.length === 0 ? (
                    <p className="mt-2 text-xs leading-relaxed text-base-content/65">
                      まだ覚えた話題がありません。会話を重ねると、ここに一覧できます。
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {items.map((item) => {
                        const busy = topicBusyId === item.topicId;
                        return (
                          <li
                            key={item.topicId}
                            className="rounded-box border border-base-300 p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold" title={item.displayName}>
                                  {item.displayName}
                                </p>
                                <p className="text-xs text-base-content/55">
                                  {item.category?.name ?? "本棚(カテゴリなし)"}
                                </p>
                              </div>
                              <span
                                className={`badge badge-sm ${item.publicTopic ? "badge-success" : "badge-ghost"}`}
                              >
                                {item.publicTopic ? "公開" : "非公開"}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <label className="flex items-center gap-2 text-xs">
                                公開する
                                <input
                                  type="checkbox"
                                  className="toggle toggle-primary toggle-sm"
                                  checked={item.publicTopic}
                                  onChange={() => toggleTopicVisibility(item)}
                                  disabled={busy}
                                  aria-label={`${item.displayName}を公開する`}
                                />
                              </label>
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => deleteTopic(item)}
                                disabled={busy}
                              >
                                {busy ? (
                                  <span className="loading loading-spinner loading-xs" />
                                ) : (
                                  <LuTrash2 aria-hidden="true" />
                                )}
                                削除
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </>
            ) : null}
          </div>

          <footer className="border-t border-base-300 px-5 py-4 sm:px-6">
            <button
              type="button"
              className="btn btn-primary w-full sm:ml-auto sm:block sm:w-auto"
              onClick={closeModal}
            >
              閉じる
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
