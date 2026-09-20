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
import { api, isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import type { ErrorMessageOverrides } from "@/lib/api/errors";

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

// この画面固有のエラー文言。通信失敗・5xx・CSRFは @/lib/api/errors の共通文言を使う。
const REGISTRATION_ERROR_MESSAGES: ErrorMessageOverrides = {
  codes: {
    PENDING_REGISTRATION_EXPIRED:
      "仮登録の有効期限が切れました。外部アカウントでもう一度ログインしてください。",
    PENDING_REGISTRATION_NOT_FOUND:
      "仮登録情報が見つかりません。外部アカウントでもう一度ログインしてください。",
    USER_ALREADY_REGISTERED: "この外部アカウントはすでに登録されています。",
    TERMS_AGREEMENT_REQUIRED:
      "規約が更新されました。ページを再読み込みして、最新の規約をご確認ください。",
  },
  statuses: {
    // 本登録前の画面なので、401は「セッション切れ」ではなくOAuthのやり直しを案内する。
    401: "ログイン情報を確認できませんでした。外部アカウントでもう一度ログインしてください。",
    403: "このページは初回登録中のアカウントのみ利用できます。",
  },
};

function toMessage(error: unknown) {
  return getErrorMessage(error, REGISTRATION_ERROR_MESSAGES);
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

export default function OnboardingForm() {
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
        // HTTPエラーはApiErrorになり、後段で状態別の案内文へ変換されます。
        const [pendingProfile, requiredTerms] = await Promise.all([
          api.get<PendingRegistration>(
            "/api/registrations/me",
            controller.signal,
          ),
          api.get<RequiredTerm[]>("/api/terms/required", controller.signal),
        ]);

        if (requiredTerms.length === 0) {
          // 通信は成功しているためApiErrorにはせず、そのまま案内文を出します。
          setLoadError("現在確認できる規約がありません。管理者へお問い合わせください。");
          return;
        }

        // OAuthの表示名候補を入力欄へ反映し、規約同意は未選択から開始します。
        setProfile(pendingProfile);
        setDisplayName(pendingProfile.displayName);
        setTerms(requiredTerms);
        setAgreedTermsIds([]);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        setLoadError(toMessage(error));
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
      // CSRFトークンの取得とヘッダー付与は apiFetch が行います。
      await api.post<void>("/api/registrations/complete", {
        displayName: normalizedDisplayName,
        agreedTermsIds,
      });

      // 本登録後はAI利用設定を済ませてから、分身の誕生へ進みます。
      router.replace("/onboarding/credentials");
      router.refresh();
    } catch (error) {
      // 通信・認証・規約更新などのエラーを、ユーザーが次の行動を判断できる文言にします。
      setSubmitError(toMessage(error));
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
