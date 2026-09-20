"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuLoaderCircle, LuLogOut } from "react-icons/lu";
import { api } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setError(null);

    try {
      // CSRFトークンの取得とヘッダー付与は apiFetch が行います。
      await api.post<void>("/api/logout");
    } catch (cause) {
      setError(getErrorMessage(cause));
      setIsLoggingOut(false);
      return;
    }

    // 画面遷移は try の外で行う。イベントハンドラー内なので redirect() ではなく router を使う。
    // refresh でルートガードにログアウト後のセッション状態を読み直させる。
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onLogout}
        className="btn btn-primary"
        type="button"
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <LuLoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <LuLogOut aria-hidden="true" />
        )}
        Logout
      </button>
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
