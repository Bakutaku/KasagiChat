import Link from "next/link";
import KasagiLogo from "@/components/icon/KasagiLogo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-base-300 bg-base-100 px-6 py-10 text-base-content/65">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <KasagiLogo />
          <div>
            <Link className="text-lg font-bold text-base-content" href="/">
              KasagiChat
            </Link>
            <p className="mt-1 text-xs">あなたの言葉から、会話の橋を。</p>
          </div>
        </div>
        <nav
          className="flex flex-wrap gap-x-6 gap-y-4 text-sm"
          aria-label="フッターナビゲーション"
        >
          <Link className="link link-hover" href="/#about">
            サービスについて
          </Link>
          <Link className="link link-hover" href="/#features">
            できること
          </Link>
          <Link className="link link-hover" href="/#flow">
            はじめかた
          </Link>
          <Link className="link link-hover" href="/#faq">
            よくある質問
          </Link>
        </nav>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-base-300 pt-6 text-xs">
        © 2026 KasagiChat
      </div>
    </footer>
  );
}
