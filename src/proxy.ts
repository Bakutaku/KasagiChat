import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type AuthState =
  | "unauthenticated"
  | "pending"
  | "registered-without-credential"
  | "registered-without-npc"
  | "registered-with-unborn-npc"
  | "registered"
  | "unknown";

const SESSION_COOKIE_NAME = "SESSION";
const LOGIN_PATH = "/login";
const ONBOARDING_PATH = "/onboarding";
const CREDENTIAL_PATH = "/onboarding/credentials";
const NPC_BIRTH_PATH = "/onboarding/npc";
const HOME_PATH = "/home";

type UserMeResponse = {
  onboarding?: {
    credentialConfigured?: boolean;
    npcCreated?: boolean;
    npcBorn?: boolean;
  };
};

/**
 * Spring Security が持つセッションを使い、画面遷移に必要な状態だけを確認します。
 *
 * GET /api/registrations/me の契約:
 * - 200: 仮登録中
 * - 401: 未ログイン（期限切れのセッションを含む）
 * - 403: 本登録済み。続けて GET /api/user/me の onboarding を確認する
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
      const userResponse = await fetch(`${apiOrigin}/api/user/me`, {
        headers: {
          accept: "application/json",
          cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      });

      if (userResponse.status === 401) {
        return "unauthenticated";
      }
      if (!userResponse.ok) {
        return "unknown";
      }

      const user = (await userResponse.json()) as UserMeResponse;
      if (!user.onboarding?.credentialConfigured) {
        return "registered-without-credential";
      }
      if (!user.onboarding.npcCreated) {
        return "registered-without-npc";
      }
      return user.onboarding.npcBorn
        ? "registered"
        : "registered-with-unborn-npc";
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
    return pathname === ONBOARDING_PATH
      ? NextResponse.next()
      : redirectTo(request, ONBOARDING_PATH);
  }

  if (
    authState === "registered-without-credential" ||
    authState === "registered-without-npc" ||
    authState === "registered-with-unborn-npc" ||
    authState === "registered"
  ) {
    if (pathname === CREDENTIAL_PATH) {
      return NextResponse.next();
    }

    if (authState === "registered-without-credential") {
      return redirectTo(request, CREDENTIAL_PATH);
    }

    if (
      authState === "registered-without-npc" ||
      authState === "registered-with-unborn-npc"
    ) {
      return pathname === NPC_BIRTH_PATH
        ? NextResponse.next()
        : redirectTo(request, NPC_BIRTH_PATH);
    }

    return pathname.startsWith(HOME_PATH)
      ? NextResponse.next()
      : redirectTo(request, HOME_PATH);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/onboarding/:path*", "/home/:path*"],
};
