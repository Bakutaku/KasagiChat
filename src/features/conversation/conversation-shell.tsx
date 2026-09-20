"use client";

import Image from "next/image";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { LuEye, LuMapPin, LuX } from "react-icons/lu";
import {
  CONVERSATION_SCENES,
  needsSaveBeforeClose,
} from "./presentation";
import type { ConversationDisplaySettings } from "./presentation";
import type { ConversationStatus } from "./types";

export type ConversationShellProps = {
  settings: ConversationDisplaySettings;
  status: ConversationStatus;
  meta?: ReactNode;
  children: ReactNode;
};

/**
 * 会話の背景・立ち絵・右パネルをまとめる共通外枠。
 * fullscreenは独立画面、modalは将来マップへ重ねるダイアログとして使う。
 */
export default function ConversationShell({
  settings,
  status,
  meta,
  children,
}: ConversationShellProps) {
  const [isCloseConfirmationOpen, setIsCloseConfirmationOpen] = useState(false);
  const titleId = useId();
  const confirmTitleId = useId();
  const scene = CONVERSATION_SCENES[settings.backgroundKey];
  const isModal = settings.presentation === "modal";

  function handleCloseRequest() {
    if (!settings.onClose) {
      return;
    }

    if (needsSaveBeforeClose(settings.presentation, status)) {
      setIsCloseConfirmationOpen(true);
      return;
    }

    settings.onClose();
  }

  const shell = (
    <section
      className={`relative isolate flex overflow-hidden text-base-content ${
        isModal
          ? "h-[min(88vh,900px)] w-[min(94vw,1440px)] rounded-box border border-white/30 shadow-2xl"
          : "h-dvh min-h-screen w-full"
      }`}
      aria-labelledby={titleId}
    >
      <Image
        src={scene.backgroundSrc}
        alt=""
        fill
        priority={!isModal}
        sizes={isModal ? "94vw" : "100vw"}
        className="-z-30 object-cover"
      />
      <div
        className="absolute inset-0 -z-20 bg-linear-to-r from-slate-950/50 via-slate-900/20 to-slate-950/45"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 bg-linear-to-t from-slate-950/35 via-transparent to-white/10"
        aria-hidden="true"
      />

      {settings.onClose && (
        <button
          className="btn btn-circle btn-sm absolute top-4 right-4 z-30 border-white/35 bg-base-100/85 shadow-lg backdrop-blur-md"
          type="button"
          onClick={handleCloseRequest}
          aria-label="会話を閉じる"
        >
          <LuX aria-hidden="true" />
        </button>
      )}

      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(520px,1.2fr)] lg:gap-6 lg:p-8">
        <aside className="relative hidden min-h-0 overflow-hidden rounded-box border border-white/25 bg-linear-to-b from-white/20 via-white/8 to-slate-950/20 shadow-xl backdrop-blur-sm lg:block">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 text-white drop-shadow-sm">
            <span className="badge border-white/30 bg-slate-950/35 text-white backdrop-blur-md">
              <LuMapPin aria-hidden="true" />
              {scene.label}
            </span>
          </div>

          <div className="absolute inset-x-[4%] top-[6%] bottom-0">
            <Image
              src={settings.assistant.imageSrc}
              alt={settings.assistant.imageAlt}
              fill
              sizes="(min-width: 1024px) 42vw, 1px"
              className="object-contain object-bottom drop-shadow-[0_28px_30px_rgba(15,23,42,0.38)]"
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/80 via-slate-950/45 to-transparent px-6 pt-24 pb-6 text-white">
            <p className="text-sm text-white/65">会話相手</p>
            <p className="mt-1 text-2xl font-black tracking-wide">
              {settings.assistant.name}
            </p>
          </div>

          {settings.observer && (
            <div className="absolute right-4 bottom-4 z-10 w-28 rounded-box border border-white/30 bg-base-100/80 p-2 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-1 text-[0.65rem] font-bold text-base-content/60">
                <LuEye aria-hidden="true" />
                見守り中
              </div>
              <div className="relative mt-1 aspect-2/3 overflow-hidden rounded-field bg-base-200/70">
                <Image
                  src={settings.observer.imageSrc}
                  alt={settings.observer.imageAlt}
                  fill
                  sizes="112px"
                  className="object-contain object-bottom"
                />
              </div>
              <p className="mt-1 truncate text-center text-xs font-bold">
                {settings.observer.name}
              </p>
            </div>
          )}
        </aside>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-box border border-white/35 bg-base-100/88 shadow-2xl backdrop-blur-xl">
          <header className="border-b border-base-300/75 bg-base-100/65 px-5 py-4 pr-14 sm:px-6 sm:py-5 sm:pr-16">
            <div className="flex items-start gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-base-200 ring-2 ring-base-100 shadow-md lg:hidden">
                <Image
                  src={settings.assistant.imageSrc}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-contain object-bottom"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
                  Conversation
                </p>
                <h1 id={titleId} className="mt-1 truncate text-lg font-black sm:text-xl">
                  {settings.title}
                </h1>
              </div>
              {meta && <div className="hidden shrink-0 sm:block">{meta}</div>}
            </div>
            {meta && <div className="mt-3 sm:hidden">{meta}</div>}
          </header>

          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </div>

      {isCloseConfirmationOpen && (
        <dialog
          className="modal modal-open"
          open
          aria-labelledby={confirmTitleId}
          onCancel={(event) => {
            event.preventDefault();
            setIsCloseConfirmationOpen(false);
          }}
        >
          <div className="modal-box border border-base-300 shadow-2xl">
            <button
              className="btn btn-circle btn-ghost btn-sm absolute top-3 right-3"
              type="button"
              onClick={() => setIsCloseConfirmationOpen(false)}
              aria-label="確認をキャンセル"
            >
              <LuX aria-hidden="true" />
            </button>
            <h2 id={confirmTitleId} className="pr-8 text-lg font-black">
              会話を保存して閉じますか？
            </h2>
            <p className="mt-3 leading-7 text-base-content/70">
              会話を保存して閉じます。次回再開できます。
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setIsCloseConfirmationOpen(false)}
              >
                キャンセル
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={settings.onClose}
              >
                保存して閉じる
              </button>
            </div>
          </div>
          <button
            className="modal-backdrop"
            type="button"
            onClick={() => setIsCloseConfirmationOpen(false)}
            aria-label="確認をキャンセル"
          />
        </dialog>
      )}
    </section>
  );

  if (!isModal) {
    return shell;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {shell}
    </div>
  );
}
