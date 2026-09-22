"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { LuCheck, LuCopy, LuQrCode } from "react-icons/lu";

/** 招待URLの組み立て。サーバー側では場所が分からないため、ブラウザで決める。 */
export function inviteUrl(inviteCode: string, origin: string) {
  return `${origin.replace(/\/$/, "")}/invite/${inviteCode}`;
}

/**
 * 招待コード・参加URL・QRコードをまとめて渡す。
 *
 * QRの色にテーマ変数を使うと暗いテーマで前景と背景が反転し、読み取れなくなる。
 * 白地に黒で固定し、余白ごと白い箱に載せる。
 */
export function InvitePanel({
  inviteCode,
  className = "",
}: {
  inviteCode: string;
  className?: string;
}) {
  // 招待URLの起点はサーバー側では分からない。サーバーでは空、ハイドレーション後に実際の値を使う。
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [copied, setCopied] = useState<"code" | "url" | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const url = origin ? inviteUrl(inviteCode, origin) : "";

  async function copy(value: string, target: "code" | "url") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
    } catch {
      // クリップボードが使えない環境では、表示されている文字列を手で選んでもらう。
      setCopied(null);
    }
  }

  return (
    <div
      className={`rounded-box border border-base-300 bg-base-100 p-4 ${className}`}
    >
      <p className="flex items-center gap-2 font-medium">
        <LuQrCode aria-hidden="true" />
        招待コード
      </p>
      <p className="mt-1 text-xs opacity-70">
        コードかQRコードを参加者へ渡してください。読み取りにはログインが必要です。
      </p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0 self-center rounded-box bg-white p-3">
          {url ? (
            <QRCodeSVG
              value={url}
              size={160}
              level="M"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          ) : (
            <div className="skeleton size-[160px]" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <p className="text-xs opacity-70">コード</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="rounded-box bg-base-200 px-3 py-2 font-mono text-lg tracking-widest">
                {inviteCode}
              </code>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => copy(inviteCode, "code")}
              >
                {copied === "code" ? (
                  <LuCheck aria-hidden="true" />
                ) : (
                  <LuCopy aria-hidden="true" />
                )}
                コピー
              </button>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xs opacity-70">参加URL</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate rounded-box bg-base-200 px-3 py-2 text-sm">
                {url || "読み込み中"}
              </span>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!url}
                onClick={() => copy(url, "url")}
              >
                {copied === "url" ? (
                  <LuCheck aria-hidden="true" />
                ) : (
                  <LuCopy aria-hidden="true" />
                )}
                コピー
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {copied ? "コピーしました" : ""}
      </p>
    </div>
  );
}
