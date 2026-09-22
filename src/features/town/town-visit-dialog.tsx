"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import { LuHouse, LuMapPin, LuMessageCircle, LuX } from "react-icons/lu";
import type { TownVisit } from "./town-map-presentation";

/** この確認UIを開くだけでは会話セッションをマウントせず、開始要求も送りません。 */
export function TownVisitDialog({ visit, notice, onClose, onConfirm }: {
  visit: TownVisit;
  notice?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);
  return (
    <dialog ref={dialog} className="modal bg-slate-950/25 backdrop-blur-sm" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="modal-box w-[calc(100%-2rem)] max-w-lg border border-base-300 bg-base-100 p-6 shadow-2xl sm:p-8">
        <button type="button" autoFocus className="btn btn-circle btn-ghost btn-sm absolute right-3 top-3" aria-label="案内を閉じる" onClick={onClose}><LuX aria-hidden="true" /></button>
        <p className="mb-5 flex items-center gap-2 text-sm text-base-content/60"><LuMapPin aria-hidden="true" />{visit.place}</p>
        <div className="flex items-center gap-5">
          {visit.imageSrc && <div className="relative h-40 w-24 shrink-0 rounded-box bg-base-200/70 sm:w-28">
            <Image src={visit.imageSrc} alt="" fill sizes="112px" className="object-contain object-bottom" />
          </div>}
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold text-base-content/70">{visit.status}</p>
            <h2 id={titleId} className="text-xl font-bold">{visit.name}</h2>
            <p id={descriptionId} className="mt-3 text-sm leading-7 text-base-content/75">{visit.description}</p>
          </div>
        </div>
        {visit.scene && <p className="mt-5 rounded-box bg-base-200/70 p-3 text-xs leading-6 text-base-content/70">分身がそばで見守ります。途中の会話があれば、続きから再開します。</p>}
        {notice && <p role="status" className="mt-4 text-sm text-base-content/75">{notice}</p>}
        <div className="modal-action flex-wrap">
          <button type="button" className="btn btn-ghost" onClick={onClose}>街にもどる</button>
          {visit.actionLabel && <button type="button" className="btn btn-primary" disabled={!!notice} onClick={onConfirm}>
            {visit.scene ? <LuMessageCircle aria-hidden="true" /> : <LuHouse aria-hidden="true" />}{visit.actionLabel}
          </button>}
        </div>
      </div>
      <button type="button" className="modal-backdrop" aria-label="案内を閉じて街にもどる" onClick={onClose} />
    </dialog>
  );
}
