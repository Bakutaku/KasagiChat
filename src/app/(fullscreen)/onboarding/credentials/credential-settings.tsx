"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import {
  LuCheck,
  LuChevronRight,
  LuCircleAlert,
  LuKeyRound,
  LuLoaderCircle,
  LuLockKeyhole,
  LuMessageCircleMore,
  LuRefreshCw,
  LuServer,
  LuShieldCheck,
  LuTrash2,
} from "react-icons/lu";

type LlmProvider = "OPENAI" | "ANTHROPIC" | "DEMO";
type SetupMode = "BYOK" | "DEMO";

type DemoUsage = {
  used: number;
  limit: number;
  remaining: number;
};

type Credential = {
  configured: boolean;
  provider: LlmProvider | null;
  model: string | null;
  maskedApiKey: string | null;
  demoUsage: DemoUsage | null;
};

type ProviderOption = {
  provider: LlmProvider;
  models: string[];
  modelSelectable: boolean;
  requiresApiKey: boolean;
  requiresPassphrase: boolean;
  available: boolean;
};

type CredentialOptions = {
  providers: ProviderOption[];
};

type ProblemDetails = {
  code?: string;
  detail?: string;
};

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  OPENAI: "OpenAI",
  ANTHROPIC: "Anthropic",
  DEMO: "デモ利用",
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
    // Spring Security由来など、Problem Detailsではないエラーも共通表示へ変換します。
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

function getCredentialErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "サーバーに接続できませんでした。時間をおいて、もう一度お試しください。";
  }

  switch (error.code) {
    case "INVALID_API_KEY":
      return "APIキーを確認できませんでした。選択したプロバイダーで有効なキーか、モデルを利用できるキーかをご確認ください。";
    case "INVALID_PASSPHRASE":
      return "合言葉が一致しませんでした。案内された合言葉をもう一度ご確認ください。";
    case "INVALID_CREDENTIAL_REQUEST":
      return "選択内容と入力内容の組み合わせが正しくありません。入力し直してください。";
    case "VALIDATION_FAILED":
    case "INVALID_REQUEST_BODY":
      return "入力内容を確認できませんでした。各項目を入力し直してください。";
    case "DEMO_LIMIT_EXCEEDED":
      return "デモ利用の上限に達しています。自分のAPIキーを設定して続けてください。";
    case "CSRF_TOKEN_NOT_FOUND":
      return "安全な送信に必要な情報を取得できませんでした。ページを再読み込みしてください。";
    default:
      if (error.status === 401) {
        return "ログインの有効期限が切れました。もう一度ログインしてください。";
      }
      if (error.status === 403) {
        return "この設定を変更する権限を確認できませんでした。ページを再読み込みしてください。";
      }
      if (error.status === 429) {
        return "短時間に操作が集中しています。少し待ってから、もう一度お試しください。";
      }
      if (error.status >= 500) {
        return "サーバーで問題が発生しました。時間をおいて、もう一度お試しください。";
      }
      return "設定を保存できませんでした。入力内容を確認して、もう一度お試しください。";
  }
}

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", {
    method: "GET",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw await getApiError(response);
  }

  const token = getCookieValue(CSRF_COOKIE_NAME);

  if (!token) {
    throw new ApiError(0, "CSRF_TOKEN_NOT_FOUND");
  }

  return token;
}

function isByokProvider(
  provider: LlmProvider | null,
): provider is "OPENAI" | "ANTHROPIC" {
  return provider === "OPENAI" || provider === "ANTHROPIC";
}

export default function CredentialSettings() {
  const router = useRouter();
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const passphraseInputRef = useRef<HTMLInputElement>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [options, setOptions] = useState<CredentialOptions | null>(null);
  const [mode, setMode] = useState<SetupMode>("BYOK");
  const [provider, setProvider] = useState<"OPENAI" | "ANTHROPIC">(
    "OPENAI",
  );
  const [model, setModel] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      setIsLoading(true);
      setLoadError(null);
      setActionError(null);

      try {
        const [credentialResponse, optionsResponse] = await Promise.all([
          fetch("/api/credentials", {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/credentials/options", {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        if (!credentialResponse.ok) {
          throw await getApiError(credentialResponse);
        }
        if (!optionsResponse.ok) {
          throw await getApiError(optionsResponse);
        }

        const currentCredential =
          (await credentialResponse.json()) as Credential;
        const availableOptions =
          (await optionsResponse.json()) as CredentialOptions;
        const byokOptions = availableOptions.providers.filter(
          (option) => option.provider !== "DEMO" && option.available,
        );
        const currentByokOption = byokOptions.find(
          (option) => option.provider === currentCredential.provider,
        );
        const initialByokOption = currentByokOption || byokOptions[0];
        const availableDemoOption = availableOptions.providers.find(
          (option) => option.provider === "DEMO" && option.available,
        );

        setCredential(currentCredential);
        setOptions(availableOptions);
        setIsEditing(!currentCredential.configured);
        setMode(
          currentCredential.provider === "DEMO" ||
            (!initialByokOption && availableDemoOption)
            ? "DEMO"
            : "BYOK",
        );

        if (initialByokOption && initialByokOption.provider !== "DEMO") {
          setProvider(initialByokOption.provider);
          setModel(
            currentByokOption &&
              currentCredential.model &&
              currentByokOption.models.includes(currentCredential.model)
              ? currentCredential.model
              : initialByokOption.models[0] || "",
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLoadError(getCredentialErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();
    return () => controller.abort();
  }, [reloadKey]);

  const byokOptions =
    options?.providers.filter((option) => option.provider !== "DEMO") || [];
  const selectedProviderOption = byokOptions.find(
    (option) => option.provider === provider,
  );
  const demoOption = options?.providers.find(
    (option) => option.provider === "DEMO",
  );

  function clearSensitiveInputs() {
    if (apiKeyInputRef.current) {
      apiKeyInputRef.current.value = "";
    }
    if (passphraseInputRef.current) {
      passphraseInputRef.current.value = "";
    }
  }

  function selectMode(nextMode: SetupMode) {
    clearSensitiveInputs();
    setMode(nextMode);
    setActionError(null);
  }

  function selectProvider(nextProvider: "OPENAI" | "ANTHROPIC") {
    const nextOption = byokOptions.find(
      (option) => option.provider === nextProvider,
    );
    clearSensitiveInputs();
    setProvider(nextProvider);
    setModel(nextOption?.models[0] || "");
    setActionError(null);
  }

  function cancelEditing() {
    clearSensitiveInputs();
    setActionError(null);
    setIsEditing(false);

    if (credential?.provider === "DEMO") {
      setMode("DEMO");
      return;
    }

    setMode("BYOK");
    if (isByokProvider(credential?.provider || null)) {
      const currentOption = byokOptions.find(
        (option) => option.provider === credential?.provider,
      );
      setProvider(credential.provider);
      setModel(
        credential.model && currentOption?.models.includes(credential.model)
          ? credential.model
          : currentOption?.models[0] || "",
      );
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    setStatusMessage(null);

    try {
      const csrfToken = await getCsrfToken();
      let requestBody: string;

      if (mode === "BYOK") {
        let apiKey = apiKeyInputRef.current?.value.trim() || "";

        if (!selectedProviderOption?.available || !model || !apiKey) {
          setIsSubmitting(false);
          return;
        }

        requestBody = JSON.stringify({ provider, model, apiKey });
        apiKey = "";
      } else {
        let passphrase = passphraseInputRef.current?.value.trim() || "";

        if (!demoOption?.available || !passphrase) {
          setIsSubmitting(false);
          return;
        }

        requestBody = JSON.stringify({ provider: "DEMO", passphrase });
        passphrase = "";
      }

      const request = fetch("/api/credentials", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: csrfToken,
        },
        body: requestBody,
      });

      // 送信開始後はDOMにも生のキー／合言葉を残しません。
      clearSensitiveInputs();
      requestBody = "";

      const response = await request;

      if (!response.ok) {
        throw await getApiError(response);
      }

      setCredential((await response.json()) as Credential);
      router.replace("/home");
      router.refresh();
    } catch (error) {
      setActionError(getCredentialErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setActionError(null);
    setStatusMessage(null);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/credentials", {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          [CSRF_HEADER_NAME]: csrfToken,
        },
      });

      if (!response.ok) {
        throw await getApiError(response);
      }

      clearSensitiveInputs();
      setCredential({
        configured: false,
        provider: null,
        model: null,
        maskedApiKey: null,
        demoUsage: null,
      });
      setIsDeleteConfirming(false);
      setIsEditing(true);
      setMode("BYOK");
      setStatusMessage("AI利用設定を削除しました。続けるには新しい設定が必要です。");
    } catch (error) {
      setActionError(getCredentialErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div
        className="card mt-8 border border-base-300 bg-base-100 shadow-xl"
        aria-label="AI利用設定を読み込み中"
        aria-busy="true"
      >
        <div className="card-body gap-5 p-6 sm:p-8">
          <div className="skeleton h-20 w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-32 w-full" />
            <div className="skeleton h-32 w-full" />
          </div>
          <div className="skeleton h-12 w-full" />
        </div>
      </div>
    );
  }

  if (loadError || !credential || !options) {
    return (
      <div className="card mt-8 border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body p-6 sm:p-8">
          <div className="alert alert-error" role="alert">
            <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
            <span>{loadError || "AI利用設定を読み込めませんでした。"}</span>
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              <LuRefreshCw aria-hidden="true" />
              もう一度試す
            </button>
            <Link className="btn btn-ghost" href="/login">
              ログインへ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (credential.configured && !isEditing) {
    return (
      <section
        className="card mt-8 border border-success/30 bg-base-100 shadow-xl"
        aria-labelledby="configured-heading"
      >
        <div className="card-body gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="badge badge-success badge-outline gap-1">
                <LuCheck aria-hidden="true" />
                設定済み
              </div>
              <h2 id="configured-heading" className="mt-3 text-xl font-bold">
                AI利用設定は完了しています
              </h2>
              <p className="mt-2 text-sm leading-6 text-base-content/60">
                生のAPIキーや合言葉は、この画面から確認できません。
              </p>
            </div>
            <Link className="btn btn-primary" href="/home">
              ホームへ
              <LuChevronRight aria-hidden="true" />
            </Link>
          </div>

          <dl className="grid overflow-hidden rounded-box border border-base-300 bg-base-200/40 sm:grid-cols-2">
            <div className="border-b border-base-300 p-4 sm:border-r">
              <dt className="text-xs font-bold tracking-wide text-base-content/50">
                利用方法
              </dt>
              <dd className="mt-1 font-semibold">
                {credential.provider
                  ? PROVIDER_LABELS[credential.provider]
                  : "—"}
              </dd>
            </div>
            <div className="border-b border-base-300 p-4">
              <dt className="text-xs font-bold tracking-wide text-base-content/50">
                モデル
              </dt>
              <dd className="mt-1 break-all font-semibold">
                {credential.model || "運営側の固定モデル"}
              </dd>
            </div>
            <div className="border-b border-base-300 p-4 sm:border-b-0 sm:border-r">
              <dt className="text-xs font-bold tracking-wide text-base-content/50">
                {credential.provider === "DEMO" ? "合言葉" : "APIキー"}
              </dt>
              <dd className="mt-1 font-mono font-semibold">
                {credential.maskedApiKey || "安全のため表示しません"}
              </dd>
            </div>
            <div className="p-4">
              <dt className="text-xs font-bold tracking-wide text-base-content/50">
                状態
              </dt>
              <dd className="mt-1 font-semibold">
                {credential.demoUsage
                  ? `残り ${credential.demoUsage.remaining} / ${credential.demoUsage.limit} 回`
                  : "利用できます"}
              </dd>
            </div>
          </dl>

          {actionError && (
            <div className="alert alert-error" role="alert" aria-live="polite">
              <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          )}

          {isDeleteConfirming ? (
            <section
              className="rounded-box border border-error/40 bg-error/5 p-4"
              aria-labelledby="delete-confirm-heading"
            >
              <h3 id="delete-confirm-heading" className="font-bold">
                この設定を削除しますか？
              </h3>
              <p className="mt-2 text-sm leading-6 text-base-content/65">
                削除すると、次に会話を始める前に新しいAPIキーまたは合言葉の設定が必要です。
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  className="btn btn-error"
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleDelete()}
                >
                  {isDeleting ? (
                    <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <LuTrash2 aria-hidden="true" />
                  )}
                  {isDeleting ? "削除しています" : "削除する"}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteConfirming(false)}
                >
                  キャンセル
                </button>
              </div>
            </section>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="btn btn-outline btn-primary"
                type="button"
                onClick={() => {
                  setActionError(null);
                  setIsEditing(true);
                }}
              >
                <LuRefreshCw aria-hidden="true" />
                再設定する
              </button>
              <button
                className="btn btn-ghost text-error"
                type="button"
                onClick={() => {
                  setActionError(null);
                  setIsDeleteConfirming(true);
                }}
              >
                <LuTrash2 aria-hidden="true" />
                設定を削除
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  const byokAvailable = byokOptions.some((option) => option.available);
  const demoAvailable = demoOption?.available === true;
  const canSubmit =
    !isSubmitting &&
    (mode === "BYOK"
      ? Boolean(selectedProviderOption?.available && model)
      : demoAvailable);

  return (
    <form
      className="card mt-8 border border-base-300 bg-base-100 shadow-xl"
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      <fieldset disabled={isSubmitting} className="card-body gap-7 p-6 sm:p-8">
        <legend className="sr-only">AI利用方法の設定</legend>

        {statusMessage && (
          <div className="alert alert-success" role="status">
            <LuCheck className="size-5 shrink-0" aria-hidden="true" />
            <span>{statusMessage}</span>
          </div>
        )}

        <section aria-labelledby="setup-method-heading">
          <h2 id="setup-method-heading" className="text-lg font-bold">
            利用方法を選ぶ
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-box border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
                mode === "BYOK"
                  ? "border-primary bg-primary/8"
                  : "border-base-300 bg-base-100"
              } ${!byokAvailable ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <div className="flex items-start gap-3">
                <input
                  className="radio radio-primary mt-1"
                  type="radio"
                  name="setupMode"
                  value="BYOK"
                  checked={mode === "BYOK"}
                  disabled={!byokAvailable}
                  onChange={() => selectMode("BYOK")}
                />
                <LuKeyRound
                  className="mt-0.5 size-6 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>
                  <span className="block font-bold">あなたのAPIキー</span>
                  <span className="mt-1 block text-sm leading-5 text-base-content/60">
                    自分で発行したキーを使います
                  </span>
                </span>
              </div>
            </label>

            <label
              className={`cursor-pointer rounded-box border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
                mode === "DEMO"
                  ? "border-secondary bg-secondary/8"
                  : "border-base-300 bg-base-100"
              } ${!demoAvailable ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <div className="flex items-start gap-3">
                <input
                  className="radio radio-secondary mt-1"
                  type="radio"
                  name="setupMode"
                  value="DEMO"
                  checked={mode === "DEMO"}
                  disabled={!demoAvailable}
                  onChange={() => selectMode("DEMO")}
                />
                <LuMessageCircleMore
                  className="mt-0.5 size-6 shrink-0 text-secondary"
                  aria-hidden="true"
                />
                <span>
                  <span className="block font-bold">デモ利用の合言葉</span>
                  <span className="mt-1 block text-sm leading-5 text-base-content/60">
                    案内された合言葉で試します
                  </span>
                </span>
              </div>
            </label>
          </div>
        </section>

        {mode === "BYOK" ? (
          <section className="space-y-5" aria-labelledby="byok-heading">
            <div>
              <h2 id="byok-heading" className="text-lg font-bold">
                APIキーの設定
              </h2>
              <p className="mt-1 text-sm text-base-content/60">
                プロバイダーと利用するモデルを選んでください。
              </p>
            </div>

            {!byokAvailable && (
              <div className="alert alert-warning" role="status">
                <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
                <span>現在、APIキーを使えるプロバイダーがありません。</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-control block">
                <span className="label mb-2 font-bold">プロバイダー</span>
                <select
                  className="select select-bordered w-full"
                  value={provider}
                  onChange={(event) =>
                    selectProvider(
                      event.target.value as "OPENAI" | "ANTHROPIC",
                    )
                  }
                  disabled={!byokAvailable}
                  required
                >
                  {byokOptions.map((option) => (
                    <option
                      key={option.provider}
                      value={option.provider}
                      disabled={!option.available}
                    >
                      {PROVIDER_LABELS[option.provider]}
                      {option.available ? "" : "（現在利用できません）"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control block">
                <span className="label mb-2 font-bold">モデル</span>
                <select
                  className="select select-bordered w-full"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={!selectedProviderOption?.available}
                  required
                >
                  {selectedProviderOption?.models.map((modelName) => (
                    <option key={modelName} value={modelName}>
                      {modelName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-control block">
              <span className="label mb-2 font-bold">APIキー</span>
              <div className="relative">
                <LuLockKeyhole
                  className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-base-content/40"
                  aria-hidden="true"
                />
                <input
                  ref={apiKeyInputRef}
                  className="input input-bordered w-full pl-12 font-mono"
                  type="password"
                  name="apiKey"
                  required
                  maxLength={512}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-describedby="api-key-help api-key-security"
                  placeholder={
                    provider === "OPENAI" ? "sk-..." : "sk-ant-..."
                  }
                />
              </div>
              <span
                id="api-key-help"
                className="mt-2 text-xs leading-5 text-base-content/55"
              >
                支出上限を設定した、KasagiChat専用のキーを推奨します。
              </span>
            </label>

            <div
              id="api-key-security"
              className="rounded-box border border-info/25 bg-info/8 p-4"
            >
              <div className="flex items-start gap-3">
                <LuShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-info"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-bold">キーは安全に扱います</p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-base-content/65">
                    <li>サーバーで暗号化して保存します</li>
                    <li>保存後はマスクした値だけを表示します</li>
                    <li>設定画面からいつでも削除できます</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-5" aria-labelledby="demo-heading">
            <div>
              <h2 id="demo-heading" className="text-lg font-bold">
                デモ利用の合言葉
              </h2>
              <p className="mt-1 text-sm leading-6 text-base-content/60">
                モデルは運営側で固定されています。モデルを選ぶ必要はありません。
              </p>
            </div>

            {!demoAvailable && (
              <div className="alert alert-warning" role="status">
                <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
                <span>現在、デモ利用は受け付けていません。</span>
              </div>
            )}

            <label className="form-control block">
              <span className="label mb-2 font-bold">合言葉</span>
              <div className="relative">
                <LuMessageCircleMore
                  className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-base-content/40"
                  aria-hidden="true"
                />
                <input
                  ref={passphraseInputRef}
                  className="input input-bordered w-full pl-12"
                  type="password"
                  name="passphrase"
                  required
                  maxLength={50}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={!demoAvailable}
                  aria-describedby="passphrase-help"
                  placeholder="案内された合言葉"
                />
              </div>
              <span
                id="passphrase-help"
                className="mt-2 text-xs leading-5 text-base-content/55"
              >
                合言葉が分からない場合は、案内元の担当者へお問い合わせください。
              </span>
            </label>

            <div className="flex items-start gap-3 rounded-box border border-base-300 bg-base-200/50 p-4">
              <LuServer
                className="mt-0.5 size-5 shrink-0 text-secondary"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-base-content/65">
                デモ利用では運営側の固定モデルを使用します。利用回数には上限があります。
              </p>
            </div>
          </section>
        )}

        {actionError && (
          <div className="alert alert-error" role="alert" aria-live="polite">
            <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="btn btn-primary sm:order-2"
            type="submit"
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <LuLoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <LuCheck aria-hidden="true" />
            )}
            {isSubmitting ? "確認して保存しています" : "設定してホームへ"}
          </button>
          {credential.configured ? (
            <button
              className="btn btn-ghost sm:order-1"
              type="button"
              onClick={cancelEditing}
            >
              キャンセル
            </button>
          ) : (
            <p className="self-center text-center text-xs leading-5 text-base-content/50 sm:order-1 sm:text-left">
              保存前にバックエンドが入力内容を検証します。
            </p>
          )}
        </div>
      </fieldset>
    </form>
  );
}
