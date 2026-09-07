import Link from "next/link";

import KasagiLogo from "@/components/icon/KasagiLogo";
import { ThemeSelector } from "@/components/themes/theme-selector";

export function MarketingHeader() {
  return (
    <header className="navbar sticky top-0 z-50 border-b border-base-300 bg-base-100/90 px-4 backdrop-blur sm:px-8">
      <div className="navbar-start">
        <Link
          className="btn btn-ghost gap-2 px-2 text-xl"
          href="/"
          aria-label="KasagiChat トップへ"
        >
          <KasagiLogo />
          <span>
            Kasagi<span className="text-primary">Chat</span>
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
          className="btn btn-outline btn-primary btn-sm sm:btn-md"
          href="/login"
        >
          ログイン
        </Link>
      </div>
    </header>
  );
}
