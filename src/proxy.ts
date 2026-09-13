import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type AuthState = "unauthenticated" | "pending" | "registered" | "unknown";

const SESSION_COOKIE_NAME = "SESSION";
const LOGIN_PATH = "/login";
const SIGNUP_PATH = "/signup";
const HOME_PATH = "/home";

/**
 * Spring Security が持つセッションを使い、画面遷移に必要な状態だけを確認します。
 *
 * GET /api/registrations/me の契約:
 * - 200: 仮登録中
 * - 401: 未ログイン（期限切れのセッションを含む）
 * - 403: 本登録済みのため、仮登録者向けAPIは利用不可
 */
async function getAuthState(request: NextRequest): Promise<AuthState> {
  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    return "unauthenticated";
  }

  const apiOrigin = (process.env.API_PROXY_ORIGIN || "http://localhost:8080").replace(
    /\/$/,
    "",
  );

  try {
    const response = await fetch(`${apiOrigin}/api/registrations/me`, {
      headers: {
        accept: "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    if (response.ok) {
      return "pending";
    }
    if (response.status === 401) {
      return "unauthenticated";
    }
    if (response.status === 403) {
      return "registered";
    }

    return "unknown";
  } catch {
    // バックエンド障害時のリダイレクトループを避け、各画面側のエラー表示に委ねます。
    return "unknown";
  }
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const authState = await getAuthState(request);
  const { pathname } = request.nextUrl;

  if (authState === "unauthenticated") {
    return pathname === LOGIN_PATH
      ? NextResponse.next()
      : redirectTo(request, LOGIN_PATH);
  }

  if (authState === "pending") {
    return pathname === SIGNUP_PATH
      ? NextResponse.next()
      : redirectTo(request, SIGNUP_PATH);
  }

  if (authState === "registered") {
    return pathname.startsWith(HOME_PATH)
      ? NextResponse.next()
      : redirectTo(request, HOME_PATH);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/home/:path*"],
};
