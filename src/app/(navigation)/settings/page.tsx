import type { Metadata } from "next";
import Link from "next/link";
import { LuChevronRight, LuKeyRound, LuPalette } from "react-icons/lu";

import { ThemeSelector } from "@/components/themes/theme-selector";

export const metadata: Metadata = {
  title: "設定 | KasagiChat",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold">設定</h1>

      <section className="card border border-base-300 bg-base-100">
        <div className="card-body flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LuPalette className="text-primary" size={22} aria-hidden="true" />
            <div>
              <h2 className="font-bold">テーマ</h2>
              <p className="text-sm text-base-content/70">
                画面の配色を切り替えます。
              </p>
            </div>
          </div>
          <ThemeSelector />
        </div>
      </section>

      <Link
        href="/onboarding/credentials"
        className="card border border-base-300 bg-base-100 transition-colors hover:bg-base-200"
      >
        <div className="card-body flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LuKeyRound className="text-primary" size={22} aria-hidden="true" />
            <div>
              <h2 className="font-bold">AI利用設定</h2>
              <p className="text-sm text-base-content/70">
                会話に使うAIの接続先とAPIキーを変更します。
              </p>
            </div>
          </div>
          <LuChevronRight aria-hidden="true" />
        </div>
      </Link>
    </div>
  );
}
