"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";

/** ログアウトAPIの呼び出しと、成功後のトップへの遷移をまとめます。 */
export function useLogout() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
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

  return { logout, isLoggingOut, error };
}
