"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { LuArrowUpRight, LuBird, LuX } from "react-icons/lu";
import { avatars } from "./fixtures";
import { usePrototype } from "./store";

export function Avatar({
  id,
  src,
  name = "あなたの分身",
  className = "",
}: {
  id?: string | null;
  src?: string;
  name?: string;
  className?: string;
}) {
  const image =
    src ?? avatars.find((avatar) => avatar.id === id)?.src ?? avatars[0].src;
  return (
    <div className={className}>
      <div className="relative h-full w-full">
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 768px) 180px, 280px"
          className="object-contain"
        />
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="mb-2 text-xs font-bold tracking-[.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-base-content/65">
            {description}
          </p>
        )}
      </div>
      {children}
    </header>
  );
}

export function Panel({
  title,
  children,
  className = "",
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`rounded-3xl border border-base-300 bg-base-100 p-5 md:p-7 ${className}`}
    >
      {title && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-bold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function AppLink({
  to,
  children,
  className = "btn btn-primary",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const { href } = usePrototype();
  return (
    <Link href={href(to)} className={className}>
      {children}
    </Link>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-base-300 p-8 text-center">
      <LuBird className="size-8 text-primary/50" />
      <h2 className="font-bold">{title}</h2>
      <div className="text-sm leading-7 text-base-content/65">{children}</div>
    </div>
  );
}

export function Missing({
  title = "ページが見つかりません",
}: {
  title?: string;
}) {
  return (
    <EmptyState title={title}>
      <p className="mb-4">リンクを確認するか、家からもう一度お試しください。</p>
      <AppLink to="/home">
        家に戻る <LuArrowUpRight />
      </AppLink>
    </EmptyState>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  // ネイティブdialogがフォーカスを閉じ込めます。Escapeでも中断処理を通します。
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box max-w-3xl p-0">
        <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
          <h2 className="font-bold">{title}</h2>
          <button
            className="btn btn-circle btn-ghost btn-sm"
            aria-label="閉じる"
            onClick={onClose}
          >
            <LuX />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
