/** 期限切れを全画面へ通知する。招待ページは既存のコード保存処理に委ねる。 */
const SESSION_EXPIRED_EVENT = "kasagichat:session-expired";
const PROTECTED_PATHS = [
  "/home", "/map", "/events", "/cards", "/settings", "/onboarding",
];

export function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

/** 仮登録は200、本登録は403。401だけが期限切れの確定結果。 */
export async function hasExpiredSession(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(10_000);
  const response = await fetch("/api/registrations/me", {
    credentials: "same-origin",
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  return response.status === 401;
}

/** 定期ポーリングでセッションを延命せず、画面復帰時に確認する。 */
export function watchSession() {
  const controller = new AbortController();
  let checking = false;
  let redirecting = false;

  const expire = () => {
    if (
      controller.signal.aborted || redirecting ||
      !isProtectedPath(window.location.pathname)
    ) return;
    redirecting = true;
    // 全遷移で古い画面とRouter Cacheを破棄する。
    window.location.replace("/login?reason=session-expired");
  };

  const check = async () => {
    if (
      checking || redirecting || document.visibilityState !== "visible" ||
      !isProtectedPath(window.location.pathname)
    ) return;
    checking = true;
    try {
      if (await hasExpiredSession(controller.signal)) expire();
    } catch {
      // オフライン・サーバー障害・中断を期限切れとして扱わない。
    } finally {
      checking = false;
    }
  };

  window.addEventListener(SESSION_EXPIRED_EVENT, expire);
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  document.addEventListener("visibilitychange", check);
  void check();

  return () => {
    controller.abort();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
    window.removeEventListener("focus", check);
    window.removeEventListener("pageshow", check);
    document.removeEventListener("visibilitychange", check);
  };
}
