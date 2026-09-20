/**
 * APIエラーをユーザー向けの日本語メッセージへ変換する共通処理。
 *
 * ここには「どの画面でも同じ意味になるもの」だけを置きます。
 * 業務コード(CREDENTIAL_NOT_CONFIGURED, LLM_CALL_FAILED など)は画面・機能ごとに
 * 伝えたいことが違うため、overrides で呼び出し側から差し込みます。
 */

import { ApiError, CSRF_TOKEN_NOT_FOUND } from "./client";

export type ErrorMessageOverrides = {
  /** エラーコード → 文言。共通文言より優先されます。 */
  codes?: Record<string, string>;
  /** HTTPステータス → 文言。共通のステータス判定より優先されます。 */
  statuses?: Record<number, string>;
  /** どれにも当てはまらなかったときの文言。省略時はサーバーのdetailを表示します。 */
  fallback?: string;
};

// fetch自体が失敗した(オフライン・DNS・CORSなど)場合。ApiErrorにならない。
const NETWORK_ERROR_MESSAGE =
  "サーバーに接続できませんでした。時間をおいて、もう一度お試しください。";

const COMMON_CODE_MESSAGES: Record<string, string> = {
  [CSRF_TOKEN_NOT_FOUND]:
    "セキュリティトークンを取得できませんでした。ページを再読み込みしてください。",
};

const UNAUTHORIZED_MESSAGE =
  "ログインの有効期限が切れました。もう一度ログインしてください。";
const SERVER_ERROR_MESSAGE =
  "サーバーで問題が発生しました。時間をおいて、もう一度お試しください。";

/**
 * エラーを表示用の文言へ変換する。
 *
 * 優先順位: overrides.codes → 共通コード → overrides.statuses → 共通ステータス
 *           → overrides.fallback → サーバーのdetail。
 */
export function getErrorMessage(
  error: unknown,
  overrides?: ErrorMessageOverrides,
): string {
  if (!(error instanceof ApiError)) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (error.code) {
    const byCode = overrides?.codes?.[error.code] ?? COMMON_CODE_MESSAGES[error.code];
    if (byCode) {
      return byCode;
    }
  }

  const byStatus = overrides?.statuses?.[error.status];
  if (byStatus) {
    return byStatus;
  }

  if (error.status === 401) {
    return UNAUTHORIZED_MESSAGE;
  }
  if (error.status >= 500) {
    return SERVER_ERROR_MESSAGE;
  }

  // detailが無いときは ApiError の既定文言が入っているため、そのまま表示できる。
  return overrides?.fallback ?? error.message;
}
