/**
 * バックエンド(Spring Boot)へのAPI呼び出しをまとめた共通クライアント。
 *
 * ブラウザ専用です。CSRFトークンを `document.cookie` から読むため、
 * Server Component / Route Handler からは呼び出せません。
 *
 * 方針:
 * - 変更系(GET/HEAD以外)は必ず `GET /api/auth/csrf` でCookieを発行させてから送る。
 * - 失敗レスポンスは Problem Details かどうかに関わらず {@link ApiError} へ統一する。
 * - トークンのキャッシュや403時の自動リトライは行わない(サーバー仕様の確認が必要なため)。
 */

// Spring Security のCSRF対策。Cookieの値を対応するヘッダーへ載せ返す。
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const CSRF_ENDPOINT = "/api/auth/csrf";

// CSRFトークンの取得自体に失敗したことを表す、クライアント側だけで使うコード。
export const CSRF_TOKEN_NOT_FOUND = "CSRF_TOKEN_NOT_FOUND";

// CSRFトークンが不要なメソッド。サーバー側も同じ基準で検証を省いている。
const SAFE_METHODS = ["GET", "HEAD"] as const;

export type HttpMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";

// APIのエラーレスポンス(RFC 7807 Problem Details 形式)
type ProblemDetails = {
  code?: string;
  detail?: string;
};

export type ApiRequestOptions = {
  method?: HttpMethod;
  /** JSONとして送る本文。undefined のときは本文なし(Content-Typeも付けない)。 */
  body?: unknown;
  /** 追加ヘッダー。CSRFヘッダーとContent-Typeは既定値が入る。 */
  headers?: HeadersInit;
  /** 画面の破棄や再読み込みで通信を打ち切るための signal。 */
  signal?: AbortSignal;
};

/**
 * HTTPステータスとアプリ独自のエラーコードを保持するエラー。
 * 表示文言への変換は `@/lib/api/errors` の getErrorMessage で行う。
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    detail?: string,
  ) {
    super(detail || "APIリクエストに失敗しました。");
    // minifyされても instanceof 以外で判別できるように名前を明示する。
    this.name = "ApiError";
  }
}

/** 失敗したレスポンスから ApiError を組み立てる。 */
export async function getApiError(response: Response) {
  let problem: ProblemDetails = {};

  try {
    // Spring Security由来のエラーなど、Problem Detailsでない本文も同じ型へ寄せます。
    const parsed = (await response.json()) as ProblemDetails | null;
    if (parsed) {
      problem = parsed;
    }
  } catch {
    // 本文がJSONでない(HTMLや空)場合は、ステータスだけで扱います。
  }

  return new ApiError(response.status, problem.code, problem.detail);
}

/**
 * AbortController による中断かどうか。
 * 中断は画面遷移などの想定内の事象なので、呼び出し側はエラー表示を出さずに無視する。
 */
export function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException || error instanceof Error) &&
    error.name === "AbortError"
  );
}

/** document.cookie から指定名のCookie値を取り出す(なければ null)。 */
function getCookieValue(name: string) {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

/**
 * CSRF Cookieを発行させ、その値を返す。
 * レスポンス本文は使わず、Cookieが設定されることだけが目的。
 * 現状は変更系リクエストの都度呼ぶ(キャッシュしない)。
 */
export async function getCsrfToken(signal?: AbortSignal) {
  const response = await fetch(CSRF_ENDPOINT, {
    method: "GET",
    credentials: "same-origin",
    // ブラウザキャッシュを使うとCookieが再発行されないため、毎回サーバーまで取りに行く。
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw await getApiError(response);
  }

  const token = getCookieValue(CSRF_COOKIE_NAME);

  if (!token) {
    // HTTPは成功しているのでステータスは持たない。コードだけで区別する。
    throw new ApiError(0, CSRF_TOKEN_NOT_FOUND);
  }

  return token;
}

function isSafeMethod(method: HttpMethod) {
  return (SAFE_METHODS as readonly string[]).includes(method);
}

/**
 * 204や本文なしのレスポンスを undefined として扱う。
 * 呼び出し側は `api.post<void>(...)` のように型で表現する。
 */
async function readJsonBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    // 成功レスポンスなのにJSONでない場合は、本文なしと同じ扱いにします。
    return undefined;
  }
}

/**
 * 同一オリジンのAPIを呼ぶ。変更系のときだけCSRFトークンを取得してヘッダーへ載せる。
 * 失敗時は必ず {@link ApiError} を投げる(中断時は AbortError)。
 */
export async function apiFetch<T>(
  path: string,
  { method = "GET", body, headers, signal }: ApiRequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);

  if (!isSafeMethod(method)) {
    requestHeaders.set(CSRF_HEADER_NAME, await getCsrfToken(signal));
  }

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    // 会話やNPCの状態はサーバーが正なので、常に最新を取りに行く。
    cache: "no-store",
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw await getApiError(response);
  }

  return (await readJsonBody(response)) as T;
}

/** メソッドごとの薄いショートカット。本文とsignalだけを渡す用途に使う。 */
export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    apiFetch<T>(path, { signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiFetch<T>(path, { method: "POST", body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiFetch<T>(path, { method: "PUT", body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiFetch<T>(path, { method: "PATCH", body, signal }),
  delete: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiFetch<T>(path, { method: "DELETE", body, signal }),
};
