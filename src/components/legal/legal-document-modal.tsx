"use client";

import { useId, useRef } from "react";
import { LuBookOpen, LuX } from "react-icons/lu";

type LegalDocumentModalProps = {
  title: string;
  content: string;
  version?: string;
  effectiveDate?: string;
  triggerLabel?: string;
};

export default function LegalDocumentModal({
  title,
  content,
  version,
  effectiveDate,
  triggerLabel = "本文を確認",
}: LegalDocumentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  function openModal() {
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm text-primary"
        onClick={openModal}
        aria-haspopup="dialog"
      >
        <LuBookOpen aria-hidden="true" />
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="modal modal-middle"
        aria-labelledby={titleId}
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
                {title}
              </h2>
              {(version || effectiveDate) && (
                <p className="mt-1 text-xs text-base-content/55">
                  {[version && `バージョン ${version}`, effectiveDate].filter(Boolean).join("・")}
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn btn-circle btn-ghost btn-sm shrink-0"
              onClick={closeModal}
              aria-label={`${title}を閉じる`}
            >
              <LuX className="size-5" aria-hidden="true" />
            </button>
          </header>

          <div className="overflow-y-auto px-5 py-5 text-sm leading-7 whitespace-pre-wrap text-base-content/75 sm:px-6">
            {content}
          </div>

          <footer className="border-t border-base-300 px-5 py-4 sm:px-6">
            <button type="button" className="btn btn-primary w-full sm:ml-auto sm:block sm:w-auto" onClick={closeModal}>
              閉じる
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
