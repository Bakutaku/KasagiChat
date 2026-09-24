"use client";

/**
 * プロフィール帳。
 *
 * 家の中で分身の人格文書・口調・話題リストを見返し、編集する画面。
 * 設定画面(APIキー等の事務)とは役割を分け、分身に関する操作はすべてここに置く。
 */

import { useEffect, useId, useRef, useState } from "react";
import { LuBookOpenText, LuChevronRight, LuPencil, LuTrash2, LuX } from "react-icons/lu";
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
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [speechStyleDraft, setSpeechStyleDraft] = useState("");
  const [editingSpeechStyle, setEditingSpeechStyle] = useState(false);
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
    setEditingProfile(false);
    setEditingSpeechStyle(false);
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
      setEditingProfile(false);
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
      setEditingSpeechStyle(false);
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
        className="btn btn-outline h-auto w-full justify-start gap-3 whitespace-normal border-primary/30 bg-primary/5 px-3 py-3 text-left"
        onClick={openModal}
        aria-haspopup="dialog"
      >
        <LuBookOpenText className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">分身のプロフィール帳</span>
          <span className="mt-0.5 block text-xs font-normal leading-relaxed text-base-content/70">
            性格・話し方・覚えた話題を見る／編集する
          </span>
        </span>
        <LuChevronRight className="size-4 shrink-0" aria-hidden="true" />
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
                {npc ? `${npc.name}のプロフィール帳` : "分身のプロフィール帳"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-base-content/65">
                会話を通して育った分身の性格、話し方、覚えた話題を確認できます。
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

          <div className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
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
                <section aria-labelledby={`${titleId}-profile`} className="rounded-box border border-base-300 bg-base-200/45 p-4">
                  <h3 id={`${titleId}-profile`} className="text-sm font-bold">性格・好きなこと</h3>
                  <p className="mt-1 text-xs leading-relaxed text-base-content/65">
                    分身の性格や大切にしていることをまとめた文章です。気になるところは自分で直せます。
                  </p>
                  {editingProfile ? (
                    <>
                      <textarea
                        className="textarea textarea-bordered mt-3 w-full text-sm leading-relaxed"
                        rows={8}
                        maxLength={PROFILE_MAX_LENGTH}
                        value={profileDraft}
                        onChange={(event) => setProfileDraft(event.target.value)}
                        disabled={savingProfile}
                        aria-label="性格・好きなことを編集"
                      />
                      <p className="mt-1 text-right text-xs text-base-content/55">
                        {profileDraft.length}/{PROFILE_MAX_LENGTH}文字
                      </p>
                      {profileError && <ErrorAlert message={profileError} className="mt-2 text-xs" />}
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setProfileDraft(npc.profile ?? "");
                            setProfileError(null);
                            setEditingProfile(false);
                          }}
                          disabled={savingProfile}
                          aria-label="性格・好きなことの編集をキャンセル"
                        >
                          キャンセル
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={saveProfile} disabled={!profileDirty || savingProfile} aria-label="性格・好きなことの変更を保存">
                          {savingProfile && <span className="loading loading-spinner loading-xs" />}
                          変更を保存
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-base-content/85">
                        {npc.profile || "まだ記録がありません。会話を振り返ると、ここに分身の性格が記されます。"}
                      </p>
                      <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => setEditingProfile(true)} aria-label="性格・好きなことの文章を編集">
                        <LuPencil aria-hidden="true" />文章を編集
                      </button>
                    </>
                  )}
                </section>

                <section aria-labelledby={`${titleId}-speech`} className="rounded-box border border-base-300 bg-base-200/45 p-4">
                  <h3 id={`${titleId}-speech`} className="text-sm font-bold">話し方</h3>
                  <p className="mt-1 text-xs leading-relaxed text-base-content/65">
                    分身の言葉づかいや話す雰囲気です。下のスイッチで会話への反映を切り替えられます。
                  </p>
                  {editingSpeechStyle ? (
                    <>
                      <textarea
                        className="textarea textarea-bordered mt-3 w-full text-sm leading-relaxed"
                        rows={5}
                        maxLength={SPEECH_STYLE_MAX_LENGTH}
                        value={speechStyleDraft}
                        onChange={(event) => setSpeechStyleDraft(event.target.value)}
                        disabled={savingSpeechStyle}
                        aria-label="話し方を編集"
                      />
                      <p className="mt-1 text-right text-xs text-base-content/55">
                        {speechStyleDraft.length}/{SPEECH_STYLE_MAX_LENGTH}文字
                      </p>
                      {speechStyleError && <ErrorAlert message={speechStyleError} className="mt-2 text-xs" />}
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setSpeechStyleDraft(npc.speechStyle ?? "");
                            setSpeechStyleError(null);
                            setEditingSpeechStyle(false);
                          }}
                          disabled={savingSpeechStyle}
                          aria-label="話し方の編集をキャンセル"
                        >
                          キャンセル
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={saveSpeechStyle} disabled={!speechStyleDirty || savingSpeechStyle} aria-label="話し方の変更を保存">
                          {savingSpeechStyle && <span className="loading loading-spinner loading-xs" />}
                          変更を保存
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-base-content/85">
                        {npc.speechStyle || "まだ記録がありません。会話を振り返ると、ここに分身の話し方が記されます。"}
                      </p>
                      <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => setEditingSpeechStyle(true)} aria-label="話し方の文章を編集">
                        <LuPencil aria-hidden="true" />文章を編集
                      </button>
                    </>
                  )}
                  <label className="mt-4 flex items-center justify-between gap-3 border-t border-base-300 pt-3 text-xs">
                    <span className="font-medium">この話し方を会話に反映する</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={npc.speechStyleEnabled}
                      onChange={toggleSpeechStyleEnabled}
                      disabled={togglingEnabled}
                    />
                  </label>
                  {toggleError && <ErrorAlert message={toggleError} className="mt-2 text-xs" />}
                </section>

                <section aria-labelledby={`${titleId}-topics`} className="rounded-box border border-base-300 bg-base-200/45 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id={`${titleId}-topics`} className="text-sm font-bold">
                      覚えている話題
                    </h3>
                    <span className="badge badge-ghost badge-sm">{items.length}件</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-base-content/65">
                    会話から覚えた話題です。公開・非公開を切り替えたり、不要な話題を削除したりできます。
                  </p>
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
