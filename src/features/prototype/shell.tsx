"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  LuBird,
  LuHouse,
  LuMap,
  LuSettings2,
  LuSparkles,
  LuUsers,
  LuRotateCcw,
} from "react-icons/lu";
import KasagiLogo from "@/components/icon/KasagiLogo";
import { ThemeSelector } from "@/components/themes/theme-selector";
import LogoutButton from "@/components/layout/logout-button";
import { PrototypeProvider, usePrototype } from "./store";
import { levelFor } from "./service";

const navigation = [
  { to: "/home", label: "わたしの家", icon: LuHouse },
  { to: "/map", label: "星川の街", icon: LuMap },
  { to: "/events", label: "イベント", icon: LuUsers },
  { to: "/settings", label: "設定", icon: LuSettings2 },
];

function Shell({ children }: { children: ReactNode }) {
  const { state, preview, href, dispatch, storageAvailable } = usePrototype();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    // プレビューは同じcatch-allページを共有するため、画面が変わったら先頭へ戻します。
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return (
    <div className="min-h-screen bg-base-200/70 text-base-content">
      <a
        href="#prototype-main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:bg-base-100 focus:p-4"
      >
        本文へ移動
      </a>
      <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-10">
          <Link
            href={preview ? "/preview" : "/home"}
            className="flex items-center gap-2 font-bold tracking-tight"
          >
            <KasagiLogo width={36} height={36} />
            <span className="text-xl">
              Kasagi<span className="text-primary">Chat</span>
            </span>
          </Link>
          <nav
            aria-label="メインメニュー"
            className="order-3 grid w-full grid-cols-4 gap-1 md:order-none md:flex md:w-auto"
          >
            {navigation.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                href={href(to)}
                aria-current={
                  pathname === href(to) || pathname.startsWith(`${href(to)}/`)
                    ? "page"
                    : undefined
                }
                className={`btn btn-sm h-auto flex-col gap-1 border-0 px-1 py-2 text-[11px] shadow-none md:h-8 md:flex-row md:gap-2 md:px-3 md:py-0 md:text-xs ${pathname === href(to) || pathname.startsWith(`${href(to)}/`) ? "bg-primary/10 text-primary" : "btn-ghost text-base-content/60"}`}
              >
                <Icon />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-xs font-semibold lg:flex">
              <LuSparkles className="text-primary" /> Lv.{levelFor(state.exp)}
            </span>
            <ThemeSelector />
            {!preview && <LogoutButton />}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs text-base-content/60 md:px-10">
        <p className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-warning" />
          画面プレビュー · サンプルの会話とデータで体験できます
        </p>
        {preview && (
          <div className="flex gap-2">
            <Link className="link link-hover" href="/preview">
              確認メニュー
            </Link>
            <button
              className="link link-hover"
              onClick={() => {
                dispatch({ type: "reset", experienced: false });
                router.push("/preview");
              }}
            >
              <LuRotateCcw className="mr-1 inline" />
              初期化
            </button>
          </div>
        )}
      </div>
      {!storageAvailable && (
        <p role="status" className="alert mx-5 mb-4 w-auto">
          ブラウザの保存機能が利用できません。この画面を開いている間だけ変更を保持します。
        </p>
      )}
      <main
        id="prototype-main"
        className="mx-auto min-h-[70vh] max-w-[1360px] px-5 pb-14 pt-6 md:px-10"
      >
        {children}
      </main>
      <footer className="mx-auto flex max-w-[1360px] items-center justify-between border-t border-base-300 px-5 py-6 text-xs text-base-content/45 md:px-10">
        <span className="flex items-center gap-2">
          <LuBird />
          小さな会話が、つながりのはじまり。
        </span>
        <span>KASAGICHAT</span>
      </footer>
    </div>
  );
}

export function PrototypeLayout({
  preview = false,
  children,
}: {
  preview?: boolean;
  children: ReactNode;
}) {
  return (
    <PrototypeProvider preview={preview}>
      <Shell>{children}</Shell>
    </PrototypeProvider>
  );
}
