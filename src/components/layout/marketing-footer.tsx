import Link from "next/link";

import KasagiLogo from "@/components/icon/KasagiLogo";

export function MarketingFooter() {
  return (
    <footer className="footer footer-horizontal border-t border-base-300 bg-base-100 p-8 text-base-content/60 sm:items-center">
      <aside className="flex items-center gap-2">
        <KasagiLogo />
        <div>
          <strong className="text-base text-base-content">KasagiChat</strong>
          <p>Bridge your conversations.</p>
        </div>
      </aside>

      <nav
        className="grid-flow-col gap-4 md:place-self-center md:justify-self-end"
        aria-label="フッターナビゲーション"
      >
        <Link className="link link-hover" href="/#about">
          サービスについて
        </Link>
        <Link className="link link-hover" href="/#features">
          できること
        </Link>
        <span>© 2026 KasagiChat</span>
      </nav>
    </footer>
  );
}
