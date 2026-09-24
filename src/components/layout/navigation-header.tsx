"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { LuCalendarDays, LuHouse, LuMail, LuMap, LuMenu } from "react-icons/lu";

import KasagiLogo from "@/components/icon/KasagiLogo";
import { UserMenu } from "./user-menu";

const navItems: { href: string; label: string; icon: IconType }[] = [
  { href: "/home", label: "家", icon: LuHouse },
  { href: "/map", label: "街", icon: LuMap },
  { href: "/events", label: "イベント", icon: LuCalendarDays },
  { href: "/cards", label: "カード", icon: LuMail },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname }: { pathname: string }) {
  return navItems.map(({ href, label, icon: Icon }) => {
    const active = isActive(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          className={active ? "menu-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          {label}
        </Link>
      </li>
    );
  });
}

export function NavigationHeader({
  className,
  onMenuToggle,
}: {
  className?: string;
  onMenuToggle?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // どちらかのメニューが開いている間は、マップを停止させます。
  useEffect(() => {
    onMenuToggle?.(navOpen || userOpen);
  }, [navOpen, userOpen, onMenuToggle]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    // メニューが非表示になる画面幅へ戻したとき、マップの停止も解除します。
    const closeHiddenMenu = () => {
      if (desktop.matches && menu.current) menu.current.open = false;
    };
    // details は外側をクリックしても閉じないため、ヘッダー外の操作で閉じます。
    const closeOnOutside = (event: PointerEvent) => {
      header.current
        ?.querySelectorAll<HTMLDetailsElement>("details[open]")
        .forEach((details) => {
          if (!(event.target instanceof Node && details.contains(event.target)))
            details.open = false;
        });
    };
    desktop.addEventListener("change", closeHiddenMenu);
    document.addEventListener("pointerdown", closeOnOutside);
    return () => {
      desktop.removeEventListener("change", closeHiddenMenu);
      document.removeEventListener("pointerdown", closeOnOutside);
    };
  }, []);

  return (
    <header
      ref={header}
      className={
        className
          ? `navbar ${className}`
          : "navbar sticky top-0 z-50 border-b border-base-300 bg-base-100/90 px-4 backdrop-blur sm:px-8"
      }
    >
      <div className="navbar-start gap-1">
        <details
          ref={menu}
          className="dropdown lg:hidden"
          onToggle={(event) => setNavOpen(event.currentTarget.open)}
        >
          <summary
            className="btn btn-ghost btn-square btn-sm list-none [&::-webkit-details-marker]:hidden"
            aria-label="メニューを開く"
          >
            <LuMenu size={20} />
          </summary>
          <nav
            className="dropdown-content z-50 mt-3 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
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
              <NavLinks pathname={pathname} />
            </ul>
          </nav>
        </details>
        <Link
          className="btn btn-ghost gap-1 px-1 text-base sm:gap-2 sm:text-xl"
          href="/home"
          aria-label="KasagiChat 家へ"
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
          <NavLinks pathname={pathname} />
        </ul>
      </nav>

      <div className="navbar-end">
        <UserMenu onToggle={setUserOpen} />
      </div>
    </header>
  );
}
