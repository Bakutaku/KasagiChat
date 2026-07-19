"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = {
  id: number;
  provider: string;
  displayName: string;
  avatarUrl: string | null;
};

/** CookieからCSRFトークンを読む(XSRF-TOKENはHttpOnlyでないため読める) */
function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        setMe(await res.json());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const logout = async () => {
    // 変更系リクエストなのでCSRFトークンをヘッダで返送する
    await fetch("/api/logout", {
      method: "POST",
      headers: { "X-XSRF-TOKEN": getCsrfToken() },
    });
    router.replace("/login");
  };

  if (loading || !me) {
    return <main className="card">読み込み中…</main>;
  }

  return (
    <main className="card">
      {me.avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="avatar" src={me.avatarUrl} alt="" />
      )}
      <h1>ようこそ、{me.displayName} さん</h1>
      <p className="sub">ログインに成功しています</p>
      <button className="login-button" onClick={logout}>
        ログアウト
      </button>
      <p className="meta">
        provider: {me.provider} / user id: {me.id}
      </p>
    </main>
  );
}
