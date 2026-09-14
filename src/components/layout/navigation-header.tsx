import Link from "next/link";

import KasagiLogo from "@/components/icon/KasagiLogo";
import { ThemeSelector } from "@/components/themes/theme-selector";
import LogoutButton from "./logout-button";

const navigationItems = [
  { href: "/home", label: "ホーム" },
  { href: "/map", label: "マップ" },
  { href: "/events", label: "イベント" },
] as const;

export function NavigationHeader() {
  return (
    <header className="navbar sticky top-0 z-50 border-b border-base-300 bg-base-100/90 px-3 backdrop-blur sm:px-6">
      <div className="navbar-start gap-1">
        <details className="dropdown lg:hidden">
          <summary
            className="btn btn-square btn-ghost"
            aria-label="ナビゲーションを開く"
          >
            <svg
              aria-hidden="true"
              className="size-5 fill-none stroke-current"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </summary>
          <ul className="menu dropdown-content z-10 mt-3 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </details>

        <Link
          className="btn btn-ghost gap-2 px-2 text-lg"
          href="/home"
          aria-label="KasagiChat ホームへ"
        >
          <KasagiLogo width={40} height={40} />
          <span className="hidden sm:inline">
            Kasagi<span className="text-emerald-300">Chat</span>
          </span>
        </Link>
      </div>

      <nav
        className="navbar-center hidden lg:flex"
        aria-label="アプリナビゲーション"
      >
        <ul className="menu menu-horizontal gap-1 px-1 font-medium">
          {navigationItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="navbar-end gap-3">
        <div><LogoutButton/></div>
        <div className="hidden sm:block">
          <ThemeSelector />
        </div>
        <Link
          className="btn btn-square btn-ghost"
          href="/settings"
          aria-label="設定"
        >
          <svg
            aria-hidden="true"
            className="size-5 fill-none stroke-current"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1H3v-4h.08A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.03 4.2l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
