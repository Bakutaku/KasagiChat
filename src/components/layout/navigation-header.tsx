"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LuKeyRound, LuMenu } from "react-icons/lu";

import KasagiLogo from "@/components/icon/KasagiLogo";
import { ThemeSelector } from "@/components/themes/theme-selector";

export function NavigationHeader({
  className,
  onMenuToggle,
}: {
  className?: string;
  onMenuToggle?: (open: boolean) => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    // メニューが非表示になる画面幅へ戻したとき、マップの停止も解除します。
    const closeHiddenMenu = () => {
      if (desktop.matches && menu.current) menu.current.open = false;
    };
    desktop.addEventListener("change", closeHiddenMenu);
    return () => desktop.removeEventListener("change", closeHiddenMenu);
  }, []);
  return (
    <header
      className={
        className
          ? `navbar ${className}`
          : "navbar sticky top-0 z-50 border-b border-base-300 bg-base-100/90 px-4 backdrop-blur sm:px-8"
      }
    >
      <div className="navbar-start">
        <Link
          className="btn btn-ghost gap-1 px-1 text-base sm:gap-2 sm:text-xl"
          href="/"
          aria-label="KasagiChat トップへ"
        >
          <KasagiLogo />
          <span>
            Kasagi<span className="text-[#00BBA7]">Chat</span>
          </span>
        </Link>
      </div>

      <nav
        className="navbar-center hidden lg:flex"
        aria-label="メインナビゲーション"
      >
        <ul className="menu menu-horizontal gap-1 px-1 font-medium">
          <li>
            <Link href="/#about">KasagiChatとは</Link>
          </li>
          <li>
            <Link href="/#features">できること</Link>
          </li>
          <li>
            <Link href="/#flow">はじめかた</Link>
          </li>
        </ul>
      </nav>

      <div className="navbar-end gap-2">
        <div className="hidden sm:block">
          <ThemeSelector />
        </div>
        <Link
          className="btn btn-outline btn-primary btn-sm rounded-full sm:btn-md"
          href="/onboarding/credentials"
        >
          <LuKeyRound aria-hidden="true" />
          <span className="hidden sm:inline">AI利用設定</span>
          <span className="sm:hidden">AI設定</span>
        </Link>
        <details
          ref={menu}
          className="dropdown dropdown-end lg:hidden"
          onToggle={(event) => onMenuToggle?.(event.currentTarget.open)}
        >
          <summary
            className="btn btn-ghost btn-square btn-sm list-none [&::-webkit-details-marker]:hidden"
            aria-label="メニューを開く"
          >
            <LuMenu size={20} />
          </summary>
          <nav
            className="dropdown-content z-50 mt-3 w-60 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
            aria-label="モバイルナビゲーション"
            onClick={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest("a")
              ) {
                event.currentTarget.closest("details")?.removeAttribute("open");
              }
            }}
          >
            <ul className="menu w-full">
              <li>
                <Link href="/#about">KasagiChatとは</Link>
              </li>
              <li>
                <Link href="/#features">できること</Link>
              </li>
              <li>
                <Link href="/#flow">はじめかた</Link>
              </li>
              <li>
                <Link href="/#faq">よくある質問</Link>
              </li>
            </ul>
            <div className="border-t border-base-300 px-3 py-3 sm:hidden">
              <ThemeSelector />
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
