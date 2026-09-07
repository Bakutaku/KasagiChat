"use client";

import { redirect } from "next/navigation";

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

export default function LogoutButton() {


function getCookieValue(name: string) {
const prefix = `${name}=`;
const cookie = document.cookie
  .split("; ")
  .find((item) => item.startsWith(prefix));

return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

  async function onLogout() {
    try {
      await fetch("/api/auth/csrf", {
        method: "GET",
        credentials: "same-origin",
      });

      const csrfToken = getCookieValue(CSRF_COOKIE_NAME);

      if (!csrfToken) {
        throw new Error("CSRFトークンが取得できませんでした。");
      }

      // Cookieの生トークンを対応するヘッダーへ載せ、本登録APIへ送ります。
      await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: csrfToken,
        }
      });

      // ログアウト後はログイン画面へリダイレクトします。
      redirect("/");

    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return <button onClick={onLogout} className="btn btn-primary">Logout</button>;
};