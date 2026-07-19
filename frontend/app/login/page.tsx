"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginCard() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <main className="card">
      <h1>KasagiChat</h1>
      <p className="sub">auth実験: OAuthログイン</p>
      {error && (
        <p style={{ color: "#ff8a8a", marginBottom: "1rem" }}>
          ログインに失敗しました。もう一度お試しください。
        </p>
      )}
      {/* aタグでSpringの認可開始エンドポイントへ遷移(fetchではなく画面遷移で行うのが必須。
          ここからGitHub/Googleへのリダイレクトが始まる) */}
      <a className="login-button" href="/api/oauth2/authorization/github">
        GitHubでログイン
      </a>
      <a className="login-button" href="/api/oauth2/authorization/google">
        Googleでログイン
      </a>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  );
}
