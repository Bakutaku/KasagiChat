import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  authDestination,
  safeInvitationPath,
  type AuthState,
} from "@/lib/auth-navigation";

const SESSION_COOKIE_NAME = "SESSION";
const LOGIN_PATH = "/login";
const SIGNUP_PATH = "/signup";
const INVITATION_COOKIE = "kasagi-pending-invitation";

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

  const apiOrigin = (
    process.env.API_PROXY_ORIGIN || "http://localhost:8080"
  ).replace(/\/$/, "");

  try {
    const response = await fetch(`${apiOrigin}/api/registrations/me`, {
      headers: {
        accept: "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
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
  const invitation = request.cookies.get(INVITATION_COOKIE)?.value;
  if (
    authState === "unknown" &&
    ![LOGIN_PATH, SIGNUP_PATH].includes(pathname)
  ) {
    return new NextResponse(
      "認証状態を確認できませんでした。しばらく待って再読み込みしてください。画面のみの確認には /preview をご利用ください。",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
  const destination = authDestination(authState, pathname, invitation);
  const response = destination
    ? redirectTo(request, destination)
    : NextResponse.next();
  // OAuthと初回登録をまたいでも招待へ戻れるよう、限定した内部パスだけを保持します。
  const incomingInvitation = safeInvitationPath(pathname);
  if (
    incomingInvitation &&
    ["unauthenticated", "pending"].includes(authState)
  ) {
    response.cookies.set(INVITATION_COOKIE, incomingInvitation, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 3600,
    });
  }
  if (
    authState === "registered" &&
    (destination === safeInvitationPath(invitation) || incomingInvitation)
  )
    response.cookies.delete(INVITATION_COOKIE);
  return response;
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/home/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/map/:path*",
    "/events/:path*",
    "/join/:path*",
    "/cards/:path*",
  ],
};
