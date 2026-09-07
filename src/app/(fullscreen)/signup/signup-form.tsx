"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import LegalDocumentModal from "@/components/legal/legal-document-modal";
import {
  LuCircleAlert,
  LuCheck,
  LuLoaderCircle,
  LuUserRound,
} from "react-icons/lu";

type PendingRegistration = {
  displayName: string;
  avatarUrl: string | null;
};

type RequiredTerm = {
  id: number;
  type: "TERMS_OF_SERVICE" | "PRIVACY_POLICY" | string;
  version: string;
  title: string;
  content: string;
  effectiveAt: string;
};

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

type ProblemDetails = {
  code?: string;
  detail?: string;
};

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    detail?: string,
  ) {
    super(detail || "APIリクエストに失敗しました。");
  }
}

async function getApiError(response: Response) {
  let problem: ProblemDetails = {};

  try {
    problem = (await response.json()) as ProblemDetails;
  } catch {
    // Spring Security由来のエラーなど、JSONではないレスポンスも許容します。
  }

  return new ApiError(response.status, problem.code, problem.detail);
}

function getCookieValue(name: string) {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function getRegistrationErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "サーバーに接続できませんでした。時間をおいてもう一度お試しください。";
  }

  switch (error.code) {
    case "PENDING_REGISTRATION_EXPIRED":
      return "仮登録の有効期限が切れました。外部アカウントでもう一度ログインしてください。";
    case "PENDING_REGISTRATION_NOT_FOUND":
      return "仮登録情報が見つかりません。外部アカウントでもう一度ログインしてください。";
    case "USER_ALREADY_REGISTERED":
      return "この外部アカウントはすでに登録されています。";
    case "TERMS_AGREEMENT_REQUIRED":
      return "規約が更新されました。ページを再読み込みして、最新の規約をご確認ください。";
    case "CSRF_TOKEN_NOT_FOUND":
      return "セキュリティトークンを取得できませんでした。ページを再読み込みしてください。";
    default:
      if (error.status === 401) {
        return "ログイン情報を確認できませんでした。外部アカウントでもう一度ログインしてください。";
      }
      if (error.status === 403) {
        return "このページは初回登録中のアカウントのみ利用できます。";
      }
      return error.message;
  }
}

function formatEffectiveDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function SignupForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<PendingRegistration | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [terms, setTerms] = useState<RequiredTerm[]>([]);
  const [agreedTermsIds, setAgreedTermsIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // OAuth後の仮登録セッションを使い、フォームの初期値と現在有効な規約を準備します。
  // 「もう一度試す」が押されてreloadKeyが変わった場合も、同じ処理をやり直します。
  useEffect(() => {
    const controller = new AbortController();

    async function loadRegistration() {
      setIsLoading(true);
      setLoadError(null);

      try {
        // 互いに依存しないため並列取得し、フォーム表示までの待ち時間を短くします。
        const [profileResponse, termsResponse] = await Promise.all([
          fetch("/api/registrations/me", {
            credentials: "same-origin",
            signal: controller.signal,
          }),
          fetch("/api/terms/required", {
            credentials: "same-origin",
            signal: controller.signal,
          }),
        ]);

        // HTTPエラーを共通のApiErrorへ変換し、後段で状態別の案内文に変換します。
        if (!profileResponse.ok) {
          throw await getApiError(profileResponse);
        }
        if (!termsResponse.ok) {
          throw await getApiError(termsResponse);
        }

        const pendingProfile = (await profileResponse.json()) as PendingRegistration;
        const requiredTerms = (await termsResponse.json()) as RequiredTerm[];

        if (requiredTerms.length === 0) {
          throw new Error("現在確認できる規約がありません。管理者へお問い合わせください。");
        }

        // OAuthの表示名候補を入力欄へ反映し、規約同意は未選択から開始します。
        setProfile(pendingProfile);
        setDisplayName(pendingProfile.displayName);
        setTerms(requiredTerms);
        setAgreedTermsIds([]);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLoadError(getRegistrationErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadRegistration();

    // ページ遷移後に完了した通信が、破棄済みの画面を更新することを防ぎます。
    return () => controller.abort();
  }, [reloadKey]);

  // 規約IDを送信用の配列へ追加・削除します。バックエンドは最新規約すべてのIDを要求します。
  function toggleAgreement(termId: number) {
    setAgreedTermsIds((current) =>
      current.includes(termId)
        ? current.filter((id) => id !== termId)
        : [...current, termId],
    );
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDisplayName = displayName.trim();

    // ボタンのdisabled制御に加え、直接submitされた場合も不完全なデータを送信しません。
    if (!normalizedDisplayName || agreedTermsIds.length !== terms.length) {
      return;
    }

    // 二重送信を防ぎ、前回の送信エラーをいったん消してから登録処理を始めます。
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 204レスポンスの本文は使わず、Spring SecurityにCSRF Cookieを初期化してもらいます。
      const csrfResponse = await fetch("/api/auth/csrf", {
        method: "GET",
        credentials: "same-origin",
      });

      if (!csrfResponse.ok) {
        throw await getApiError(csrfResponse);
      }

      const csrfToken = getCookieValue(CSRF_COOKIE_NAME);

      if (!csrfToken) {
        throw new ApiError(0, "CSRF_TOKEN_NOT_FOUND");
      }

      // Cookieの生トークンを対応するヘッダーへ載せ、本登録APIへ送ります。
      const registrationResponse = await fetch("/api/registrations/complete", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: csrfToken,
        },
        body: JSON.stringify({
          displayName: normalizedDisplayName,
          agreedTermsIds,
        }),
      });

      if (!registrationResponse.ok) {
        throw await getApiError(registrationResponse);
      }

      // 本登録により権限がROLE_USERへ変わるため、ログイン後のホームへ移動します。
      router.replace("/home");
      router.refresh();
    } catch (error) {
      // 通信・認証・規約更新などのエラーを、ユーザーが次の行動を判断できる文言にします。
      setSubmitError(getRegistrationErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mt-8 space-y-5" aria-label="登録情報を読み込み中" aria-busy="true">
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="mt-8">
        <div className="alert alert-error" role="alert">
          <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
          <span>{loadError || "仮登録情報を読み込めませんでした。"}</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button className="btn btn-primary" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            もう一度試す
          </button>
          <Link className="btn btn-ghost" href="/login">
            ログインへ戻る
          </Link>
        </div>
      </div>
    );
  }

  const allTermsAgreed = agreedTermsIds.length === terms.length;
  const canSubmit = displayName.trim().length > 0 && allTermsAgreed && !isSubmitting;

  return (
    <form className="mt-8" onSubmit={handleSubmit}>
      <fieldset disabled={isSubmitting} className="space-y-7">
        <label className="form-control block">
          <span className="label mb-2 font-bold">表示名</span>
          <div className="relative">
            {profile.avatarUrl ? (
              <Image src={profile.avatarUrl} alt="Avatar" width={50} height={50} className="mask mask-circle pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-base-content/40" aria-hidden="true" />
            ) : (
              <LuUserRound className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-base-content/40" aria-hidden="true" />
            )}
            <input
              className="input input-bordered w-full pl-12"
              type="text"
              name="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              maxLength={50}
              autoComplete="nickname"
              aria-describedby="display-name-help"
            />
          </div>
          <span id="display-name-help" className="mt-2 flex justify-between text-xs text-base-content/50">
            <span>KasagiChat内で表示される名前です。</span>
            <span>{displayName.length}/50</span>
          </span>
        </label>

        <section aria-labelledby="terms-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="terms-heading" className="font-bold">規約への同意</h2>
            <span className="text-xs text-base-content/50">本文を開いて確認できます</span>
          </div>

          <div className="space-y-3">
            {terms.map((term) => {
              const isAgreed = agreedTermsIds.includes(term.id);

              return (
                <div key={term.id} className="rounded-box border border-base-300 bg-base-200/50">
                  <div className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{term.title}</p>
                      <p className="mt-1 text-xs text-base-content/45">
                        v{term.version}・{formatEffectiveDate(term.effectiveAt)}
                      </p>
                    </div>
                    <LegalDocumentModal
                      title={term.title}
                      content={term.content}
                      version={term.version}
                      effectiveDate={`施行日 ${formatEffectiveDate(term.effectiveAt)}`}
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 border-t border-base-300 p-4">
                    <input
                      className="checkbox checkbox-primary mt-0.5"
                      type="checkbox"
                      checked={isAgreed}
                      onChange={() => toggleAgreement(term.id)}
                    />
                    <span className="text-sm leading-6">{term.title}に同意します</span>
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        {submitError && (
          <div className="alert alert-error" role="alert" aria-live="polite">
            <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        <button className="btn btn-primary w-full" type="submit" disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              登録しています
            </>
          ) : (
            <>
              <LuCheck aria-hidden="true" />
              同意して登録を完了
            </>
          )}
        </button>
      </fieldset>
    </form>
  );
}
