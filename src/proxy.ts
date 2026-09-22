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
const EVENTS_PATH = "/events";
const INVITE_PATH = "/invite";

/**
 * 本登録済みユーザーが開ける画面。
 *
 * 完全一致か直下だけを許可します。前方一致だけで判定すると /homely のような
 * 別の画面まで通ってしまいます。
 */
const REGISTERED_PATHS = [HOME_PATH, EVENTS_PATH] as const;

/**
 * QRから未ログインで招待ページを開いた人を、ログイン後に戻すためのCookie。
 *
 * OAuthの成功後の遷移先はバックエンドが決めており、クエリ文字列は往復で失われます。
 * 招待ページ側(invitation-join.tsx)が401を受けた時点で書き込みます。
 */
const PENDING_INVITE_COOKIE = "kc_pending_invite";
const INVITE_CODE_PATTERN = /^[A-Za-z0-9]{6,8}$/;

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

function isRegisteredPath(pathname: string) {
  return REGISTERED_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
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

    // 初回フローを終えた時点で、預かっていた招待コードの続きへ戻します。
    const pendingInvite = request.cookies.get(PENDING_INVITE_COOKIE)?.value;
    if (pendingInvite) {
      // コードをそのままURLへ入れないための検証です(外部サイトへ飛ばさない)。
      const response = INVITE_CODE_PATTERN.test(pendingInvite)
        ? redirectTo(request, `${INVITE_PATH}/${pendingInvite}`)
        : redirectTo(request, HOME_PATH);
      response.cookies.delete(PENDING_INVITE_COOKIE);
      return response;
    }

    return isRegisteredPath(pathname)
      ? NextResponse.next()
      : redirectTo(request, HOME_PATH);
  }

  return NextResponse.next();
}

// /invite/:code は含めません。未ログインでもページを開かせ、招待コードを預けてから
// ログインへ送る必要があるためです(ここで弾くとコードが失われます)。
export const config = {
  matcher: ["/login", "/onboarding/:path*", "/home/:path*", "/events/:path*"],
};
