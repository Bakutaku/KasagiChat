"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LuChevronDown,
  LuKeyRound,
  LuLoaderCircle,
  LuLogOut,
  LuSettings,
  LuUser,
} from "react-icons/lu";

import { npcApi } from "@/features/npc/api";
import type { Npc } from "@/features/npc/types";
import { userApi, type CurrentUser } from "@/features/user/api";
import { useLogout } from "./use-logout";

function UserAvatar({
  user,
  className,
}: {
  user: CurrentUser | null;
  className: string;
}) {
  return (
    <span className="avatar avatar-placeholder">
      <span
        className={`rounded-full bg-neutral text-neutral-content ${className}`}
      >
        {user?.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt=""
            width={48}
            height={48}
            className="rounded-full"
          />
        ) : user ? (
          <span>{user.displayName.slice(0, 1)}</span>
        ) : (
          <LuUser aria-hidden="true" />
        )}
      </span>
    </span>
  );
}

/**
 * ヘッダー右端のユーザー表示。アイコン・ユーザー表示名・分身の名前とレベルを出し、開くと設定やログアウトへ進めます。
 * ユーザー・分身の情報を取得できなくても、メニュー自体は使えるようにしています。
 */
export function UserMenu({
  onToggle,
}: {
  onToggle?: (open: boolean) => void;
}) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [npc, setNpc] = useState<Npc | null>(null);
  const { logout, isLoggingOut, error } = useLogout();

  useEffect(() => {
    const controller = new AbortController();
    // 表示が欠けるだけなので、どちらの失敗も画面全体のエラーにはしません。
    const ignore = () => {};
    userApi.me(controller.signal).then((value) => {
      if (!controller.signal.aborted) setUser(value);
    }, ignore);
    npcApi.find(controller.signal).then((value) => {
      if (!controller.signal.aborted) setNpc(value);
    }, ignore);
    return () => controller.abort();
  }, []);

  return (
    <details
      className="dropdown dropdown-end"
      onToggle={(event) => onToggle?.(event.currentTarget.open)}
    >
      <summary
        className="btn h-auto gap-2 rounded-full border-base-300 bg-base-200 px-1 py-1 hover:bg-base-300 sm:pr-3 list-none [&::-webkit-details-marker]:hidden"
        aria-label="ユーザーメニューを開く"
      >
        <UserAvatar user={user} className="size-9" />
        <span className="hidden max-w-36 flex-col items-start text-left leading-tight sm:flex">
          <span className="w-full truncate font-medium">
            {user?.displayName ?? ""}
          </span>
          {npc && (
            <span className="w-full truncate text-xs font-normal text-base-content/65">
              {npc.name} Lv.{npc.level}
            </span>
          )}
        </span>
        <LuChevronDown className="hidden sm:inline" aria-hidden="true" />
      </summary>
      <div
        className="dropdown-content z-50 mt-3 w-64 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a")) {
            event.currentTarget.closest("details")?.removeAttribute("open");
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-base-300 px-3 pt-2 pb-3">
          <UserAvatar user={user} className="size-12" />
          <div className="min-w-0">
            <p className="truncate font-bold">{user?.displayName ?? ""}</p>
            {npc && (
              <p className="truncate text-sm text-base-content/65">
                {npc.name} Lv.{npc.level}
              </p>
            )}
          </div>
        </div>
        <ul className="menu w-full">
          <li>
            <Link href="/settings">
              <LuSettings aria-hidden="true" />
              設定
            </Link>
          </li>
          <li>
            <Link href="/onboarding/credentials">
              <LuKeyRound aria-hidden="true" />
              AI利用設定
            </Link>
          </li>
          <li>
            <button type="button" onClick={logout} disabled={isLoggingOut}>
              {isLoggingOut ? (
                <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <LuLogOut aria-hidden="true" />
              )}
              ログアウト
            </button>
          </li>
        </ul>
        {error && (
          <p className="px-3 pb-2 text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
