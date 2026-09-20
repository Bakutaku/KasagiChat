"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  LuArrowRight,
  LuCheck,
  LuCircleAlert,
  LuHouse,
  LuLoaderCircle,
  LuMessageCircle,
  LuRefreshCw,
  LuSend,
  LuSparkles,
  LuStar,
} from "react-icons/lu";
import styles from "./npc-birth.module.css";

/**
 * NPC(分身)の誕生オンボーディング画面。
 *
 * 画面は `stage` によって次のように遷移する。
 *   loading      : /api/npc で既存NPCの有無を確認中
 *     ├ NPCなし(404)    → setup
 *     ├ 誕生済み(bornAt) → /home へリダイレクト
 *     └ 未誕生NPCあり    → conversation(会話を開始して直行)
 *   setup        : 見た目(プリセット)と名前を選んでNPCを作成
 *     └ 作成成功 → awakening
 *   awakening    : 誕生演出(光の演出 → 「話す」ボタン)
 *     └ ボタン押下 → conversation
 *   conversation : NPCとの最初の会話(BIRTH会話)
 *     └ 「会話を終えて誕生する」 → review API → complete
 *   complete     : 誕生結果(フィードバック・レベル・EXP・覚えたトピック)
 *     └ 「家へ帰る」 → /home
 */

// ---- 定数 ----

// Spring Security のCSRF対策用。Cookieの値を同名のヘッダーで送り返す。
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

// 選択可能な見た目のプリセット。画像は /public/assets/npc/presets/{id}.png に対応。
const NPC_PRESETS = [
  {
    id: "friendly-student",
    name: "親しみやすい学生",
    description: "やわらかな笑顔で、自然に話しかけてくれそう",
  },
  {
    id: "quiet-boy",
    name: "おだやかな男の子",
    description: "静かな雰囲気で、話をじっくり聞いてくれそう",
  },
  {
    id: "cheerful-girl",
    name: "元気な女の子",
    description: "明るい表情で、会話の一歩を応援してくれそう",
  },
  {
    id: "cool-girl",
    name: "クールな女の子",
    description: "落ち着いた佇まいで、率直に向き合ってくれそう",
  },
  {
    id: "stylish-man",
    name: "スタイリッシュな青年",
    description: "余裕のある雰囲気で、気軽に導いてくれそう",
  },
  {
    id: "suited-guide",
    name: "スーツの案内人",
    description: "知的で穏やかに、考えを整理してくれそう",
  },
  {
    id: "cafe-server",
    name: "カフェスタッフ",
    description: "あたたかな空気で、会話をほぐしてくれそう",
  },
] as const;

// ---- 型定義 ----

// 画面の状態(上部の遷移図を参照)
type Stage = "loading" | "setup" | "awakening" | "conversation" | "complete";
type MessageRole = "USER" | "ASSISTANT";
// IN_PROGRESS: 会話中 / FINISHED: 会話は締めくくり済み(振り返り待ち) / REVIEWED: 振り返り完了
type ConversationStatus = "IN_PROGRESS" | "FINISHED" | "REVIEWED";

// GET/POST /api/npc のレスポンス
type Npc = {
  name: string;
  presetId: string;
  level: number;
  exp: number;
  profile: string | null;
  speechStyle: string | null;
  speechStyleEnabled: boolean;
  bornAt: string | null;
};

type ConversationMessage = {
  role: MessageRole;
  text: string;
};

// 会話全体。turn は往復数で、送信時に expectedTurn として渡して二重送信/画面ずれを検知する。
// canFinish が true になると「誕生を確定」ボタンを出せる。
type Conversation = {
  id: string;
  type: "BIRTH";
  scene: null;
  status: ConversationStatus;
  turn: number;
  canFinish: boolean;
  messages: ConversationMessage[];
};

// メッセージ送信APIのレスポンス(NPCの返答と更新後の会話状態)
type SendMessageResponse = {
  turn: number;
  reply: ConversationMessage;
  canFinish: boolean;
  finished: boolean;
};

// 振り返り(誕生確定)APIのレスポンス。complete画面で表示する。
type ReviewResult = {
  feedback: string;
  expGained: number;
  level: number;
  leveledUp: boolean;
  newTopics: Array<{ id: number; name: string; public: boolean }>;
};

// APIのエラーレスポンス(RFC 7807 Problem Details 形式)
type ProblemDetails = {
  code?: string;
  detail?: string;
};

// ---- API通信ヘルパー ----

// HTTPステータスとアプリ独自のエラーコードを保持するエラー。getErrorMessage で表示文言に変換する。
class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    detail?: string,
  ) {
    super(detail || "APIリクエストに失敗しました。");
  }
}

// 失敗したレスポンスから ApiError を組み立てる。
async function getApiError(response: Response) {
  let problem: ProblemDetails = {};

  try {
    problem = (await response.json()) as ProblemDetails;
  } catch {
    // Spring Security由来など、JSONではないエラーも同じ型へ寄せます。
  }

  return new ApiError(response.status, problem.code, problem.detail);
}

// document.cookie から指定名のCookie値を取り出す(なければ null)。
function getCookieValue(name: string) {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

// /api/auth/csrf を叩いてCSRF Cookieを発行させ、その値を返す。POSTの都度呼ばれる。
async function getCsrfToken(signal?: AbortSignal) {
  const response = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
    signal,
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

// CSRFトークン付きでPOSTし、JSONレスポンスを T として返す。body省略時はボディなしで送る。
async function postJson<T>(url: string, body?: unknown, signal?: AbortSignal) {
  const csrfToken = await getCsrfToken(signal);
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      [CSRF_HEADER_NAME]: csrfToken,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw await getApiError(response);
  }

  return (await response.json()) as T;
}

// 会話の最新状態を取得する(キャッシュ無効)。開始直後や、画面とサーバーのずれ解消に使う。
async function getConversation(id: string, signal?: AbortSignal) {
  const response = await fetch(`/api/conversations/${id}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw await getApiError(response);
  }

  return (await response.json()) as Conversation;
}

// エラーをユーザー向けの日本語メッセージに変換する。
// ApiError以外は通信失敗とみなし、code → HTTPステータス → サーバーのdetail の順で文言を決める。
function getErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "サーバーに接続できませんでした。時間をおいて、もう一度お試しください。";
  }

  switch (error.code) {
    case "CREDENTIAL_NOT_CONFIGURED":
      return "先にAI利用設定を完了してください。";
    case "DEMO_LIMIT_EXCEEDED":
      return "デモ利用の上限に達しました。AI利用設定から自分のAPIキーへ切り替えてください。";
    case "LLM_CALL_FAILED":
      return "AIの返事を受け取れませんでした。送信内容は保存されていないため、もう一度試せます。";
    case "CONVERSATION_CONFIGURATION_ERROR":
      return "最初の会話を準備できませんでした。管理者へお問い合わせください。";
    case "CONVERSATION_TOO_SHORT":
      return "誕生を確定するには、あと少し会話が必要です。";
    case "CSRF_TOKEN_NOT_FOUND":
      return "セキュリティトークンを取得できませんでした。ページを再読み込みしてください。";
    default:
      if (error.status === 401) {
        return "ログインの有効期限が切れました。もう一度ログインしてください。";
      }
      if (error.status >= 500) {
        return "サーバーで問題が発生しました。時間をおいて、もう一度お試しください。";
      }
      return error.message;
  }
}

// プリセットIDから画像パスを返す。未知のIDなら先頭プリセットにフォールバックする。
function presetImagePath(presetId: string) {
  const preset = NPC_PRESETS.find((item) => item.id === presetId);
  return `/assets/npc/presets/${preset?.id || NPC_PRESETS[0].id}.png`;
}

// ---- メインコンポーネント ----

export default function NpcBirth() {
  const router = useRouter();
  // メッセージ末尾の目印。新着時にここまでスクロールする。
  const messageEndRef = useRef<HTMLDivElement>(null);

  // 画面全体の状態
  const [stage, setStage] = useState<Stage>("loading");
  const [npc, setNpc] = useState<Npc | null>(null);

  // setup画面の入力値
  const [selectedPresetId, setSelectedPresetId] = useState<string>(NPC_PRESETS[0].id);
  const [npcName, setNpcName] = useState("");

  // 会話画面の状態
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState(""); // 入力中の返信文
  const [review, setReview] = useState<ReviewResult | null>(null); // complete画面で表示

  // 非同期処理中フラグ(二重実行の防止とボタンのスピナー表示に使う)
  const [isCreating, setIsCreating] = useState(false); // NPC作成中
  const [isStarting, setIsStarting] = useState(false); // 会話の開始/準備中
  const [isSending, setIsSending] = useState(false); // メッセージ送信中(NPCの返答待ち)
  const [isReviewing, setIsReviewing] = useState(false); // 誕生確定(振り返り)中

  // awakening演出が終わり「話す」ボタンを押せるようになったか
  const [revealReady, setRevealReady] = useState(false);

  // loadError: 初期読み込みの失敗 / actionError: 各操作の失敗。どちらも画面にalert表示。
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // インクリメントすると初期読み込みのuseEffectが再実行される(「もう一度試す」用)
  const [reloadKey, setReloadKey] = useState(0);

  // BIRTH会話を新規開始し、最新状態を conversation にセットして返す。
  // 開始APIは id しか返さないため、続けて getConversation で全体を取り直している。
  const startConversation = useCallback(async (signal?: AbortSignal) => {
    setIsStarting(true);
    const started = await postJson<Conversation>(
      "/api/conversations",
      { type: "BIRTH", scene: null },
      signal,
    );
    const current = await getConversation(started.id, signal);
    setConversation(current);
    setIsStarting(false);
    return current;
  }, []);

  // 初期読み込み: 既存NPCを確認して、遷移先のstageを決める。
  // アンマウントや再実行時は AbortController で通信を中断する。
  useEffect(() => {
    const controller = new AbortController();

    async function loadNpc() {
      setStage("loading");
      setLoadError(null);

      try {
        const response = await fetch("/api/npc", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        // NPC未作成 → 作成画面へ
        if (response.status === 404) {
          setStage("setup");
          return;
        }
        if (!response.ok) {
          throw await getApiError(response);
        }

        const currentNpc = (await response.json()) as Npc;
        // すでに誕生済みならオンボーディング不要
        if (currentNpc.bornAt) {
          router.replace("/home");
          return;
        }

        // 作成済みだが未誕生(途中離脱からの再開)→ 演出は飛ばして会話へ
        setNpc(currentNpc);
        await startConversation(controller.signal);
        setStage("conversation");
      } catch (error) {
        // 中断は想定内なのでエラー表示しない
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLoadError(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsStarting(false);
        }
      }
    }

    void loadNpc();
    return () => controller.abort();
  }, [reloadKey, router, startConversation]);

  // 誕生演出: 4.8秒後に「話す」ボタンを有効化する(CSSアニメーションの長さに合わせた値)。
  // 動きを減らす設定のユーザーは待たせず即座に有効化する。
  useEffect(() => {
    if (stage !== "awakening") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealReady(true);
      return;
    }

    setRevealReady(false);
    const timer = window.setTimeout(() => setRevealReady(true), 4800);
    return () => window.clearTimeout(timer);
  }, [stage]);

  // メッセージ追加時・返答待ち表示の切り替え時に、最下部へスクロールする。
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [conversation?.messages.length, isSending]);

  // setup画面の送信: NPCを作成し、演出画面へ進みつつ裏で最初の会話を準備する。
  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = npcName.trim();

    if (!normalizedName || isCreating) {
      return;
    }

    setIsCreating(true);
    setActionError(null);

    try {
      const createdNpc = await postJson<Npc>("/api/npc", {
        presetId: selectedPresetId,
        name: normalizedName,
      });
      setNpc(createdNpc);
      // 先に演出へ切り替え、会話準備(LLM呼び出しで時間がかかる)は演出中に待つ
      setStage("awakening");
      await startConversation();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsCreating(false);
      setIsStarting(false);
    }
  }

  // awakening画面で会話の準備に失敗した場合の再試行。
  async function handleRestartConversation() {
    setActionError(null);
    try {
      await startConversation();
    } catch (error) {
      setActionError(getErrorMessage(error));
      setIsStarting(false);
    }
  }

  // 返信を送信する。成功時は送信文とNPCの返答をローカルの会話に追記する
  // (再取得はせず、レスポンスの turn / canFinish / finished を反映)。
  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();

    if (!conversation || !text || isSending || conversation.status !== "IN_PROGRESS") {
      return;
    }

    setIsSending(true);
    setActionError(null);

    try {
      const response = await postJson<SendMessageResponse>(
        `/api/conversations/${conversation.id}/messages`,
        { text, expectedTurn: conversation.turn },
      );
      setConversation({
        ...conversation,
        turn: response.turn,
        canFinish: response.canFinish,
        status: response.finished ? "FINISHED" : conversation.status,
        messages: [
          ...conversation.messages,
          { role: "USER", text },
          response.reply,
        ],
      });
      setDraft("");
    } catch (error) {
      // TURN_MISMATCH / CONVERSATION_FINISHED は、別タブなどで会話が進んだ場合。
      // 最新状態を取り直して画面をサーバーに合わせる。
      if (error instanceof ApiError && error.code === "TURN_MISMATCH") {
        const current = await getConversation(conversation.id);
        setConversation(current);
        setActionError("別の画面で会話が進んでいたため、最新の状態を読み直しました。");
      } else if (error instanceof ApiError && error.code === "CONVERSATION_FINISHED") {
        const current = await getConversation(conversation.id);
        setConversation(current);
        setActionError("会話はすでに締めくくられています。誕生の振り返りへ進めます。");
      } else {
        setActionError(getErrorMessage(error));
      }
    } finally {
      setIsSending(false);
    }
  }

  // 「会話を終えて誕生する」: 振り返りを実行して結果を保存し、complete画面へ進む。
  async function handleReview() {
    if (!conversation || !conversation.canFinish || isReviewing) {
      return;
    }

    setIsReviewing(true);
    setActionError(null);

    try {
      const result = await postJson<ReviewResult>(
        `/api/conversations/${conversation.id}/review`,
      );
      setReview(result);
      setConversation({ ...conversation, status: "REVIEWED" });
      setStage("complete");
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsReviewing(false);
    }
  }

  // ホームへ移動。refresh でサーバー側の状態(誕生済み)を反映させる。
  function goHome() {
    router.replace("/home");
    router.refresh();
  }

  // ---- 描画: stage ごとに画面を出し分ける ----

  // [loading] スピナー表示。読み込み失敗時はエラーと再試行ボタンを出す。
  if (stage === "loading") {
    return (
      <section className="grid min-h-screen place-items-center px-5" aria-busy="true">
        <div className="text-center">
          <LuLoaderCircle className="mx-auto size-10 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-4 text-sm text-base-content/60">分身の気配を探しています…</p>
          {loadError && (
            <div className="mt-6 max-w-md">
              <div className="alert alert-error text-left" role="alert">
                <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
                <span>{loadError}</span>
              </div>
              <button
                className="btn btn-primary mt-4"
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                <LuRefreshCw aria-hidden="true" />
                もう一度試す
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // [setup] 見た目(7種のプリセット)と名前を選ぶフォーム。
  if (stage === "setup") {
    return (
      <section className="min-h-screen bg-base-200 px-4 py-8 text-base-content sm:px-6 sm:py-12">
        <form className="mx-auto w-full max-w-6xl" onSubmit={handleCreate}>
          <div className="text-center">
            <div className="badge badge-primary badge-outline mb-4">YOUR PARTNER</div>
            <h1 className="text-3xl font-black sm:text-4xl">あなたの分身を迎えよう</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-base-content/65 sm:text-base">
              見た目と名前を選んだら、最初の会話が始まります。
              <br className="hidden sm:block" />
              ここで話したことが、この子の最初の個性になります。
            </p>
          </div>

          {/* 作成中は fieldset ごと無効化して入力を止める */}
          <fieldset disabled={isCreating} className="mt-8">
            <legend className="sr-only">分身の見た目を選択</legend>
            {/* プリセット一覧: 非表示のradio + カード表示。選択状態は peer-checked でスタイリング */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {NPC_PRESETS.map((preset) => (
                <label key={preset.id} className="group cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="preset"
                    value={preset.id}
                    checked={selectedPresetId === preset.id}
                    onChange={() => setSelectedPresetId(preset.id)}
                  />
                  <span className="card block h-full border border-base-300 bg-base-100 shadow-sm transition hover:-translate-y-1 hover:shadow-md peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/30 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                    <span className="relative block aspect-[2/3] overflow-hidden rounded-t-box bg-linear-to-b from-primary/10 to-secondary/10">
                      <Image
                        src={`/assets/npc/presets/${preset.id}.png`}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 140px, (min-width: 640px) 30vw, 46vw"
                        className="object-contain object-bottom transition duration-300 group-hover:scale-[1.03]"
                      />
                      {selectedPresetId === preset.id && (
                        <span className="badge badge-primary absolute top-2 right-2 gap-1 shadow-sm">
                          <LuCheck aria-hidden="true" />
                          選択中
                        </span>
                      )}
                    </span>
                    <span className="card-body gap-1 p-3">
                      <span className="font-bold">{preset.name}</span>
                      <span className="text-xs leading-5 text-base-content/55">{preset.description}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {/* 名前入力(最大30文字)と作成ボタン */}
            <div className="card mx-auto mt-8 max-w-xl border border-base-300 bg-base-100 shadow-lg">
              <div className="card-body gap-5 p-5 sm:p-7">
                <label className="form-control block">
                  <span className="label mb-2 font-bold">この子の名前</span>
                  <input
                    className="input input-bordered input-lg w-full"
                    type="text"
                    value={npcName}
                    onChange={(event) => setNpcName(event.target.value)}
                    placeholder="例: ひかり"
                    maxLength={30}
                    autoComplete="off"
                    required
                  />
                  <span className="mt-2 flex justify-between text-xs text-base-content/50">
                    <span>あとから呼びかける大切な名前です。</span>
                    <span>{npcName.length}/30</span>
                  </span>
                </label>

                {actionError && (
                  <div className="alert alert-error" role="alert">
                    <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
                    <span>{actionError}</span>
                  </div>
                )}

                <button className="btn btn-primary btn-lg" type="submit" disabled={!npcName.trim()}>
                  {isCreating ? (
                    <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <LuSparkles aria-hidden="true" />
                  )}
                  {isCreating ? "光を結んでいます…" : "この子を迎える"}
                </button>
              </div>
            </div>
          </fieldset>
        </form>
      </section>
    );
  }

  // [awakening] 誕生演出。星空背景・流れ星・光の球の中にNPCが現れ、セリフが順に表示される。
  // アニメーションは npc-birth.module.css 側。animationDelay でセリフの出現タイミングをずらしている。
  // 会話の準備が終わり、かつ演出が済む(revealReady)までボタンは押せない。
  if (stage === "awakening" && npc) {
    return (
      <section className={`${styles.birthScene} relative isolate grid min-h-screen place-items-center overflow-hidden px-5 py-12 text-base-content`}>
        <div className={`${styles.starRiver} -z-10`} aria-hidden="true" />
        <div className={`${styles.shootingStar} -z-10`} aria-hidden="true" />
        <div className={`${styles.shootingStar} ${styles.shootingStarSecond} -z-10`} aria-hidden="true" />

        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <div className={styles.orb} aria-label={`${npc.name}が光の中から現れています`}>
            <Image
              src={presetImagePath(npc.presetId)}
              alt=""
              width={1024}
              height={1536}
              loading="eager"
              className={styles.avatarReveal}
            />
          </div>

          <div className="mt-9 min-h-36 space-y-3 text-sm leading-7 sm:text-base">
            <p className={styles.revealLine} style={{ animationDelay: "0.45s" }}>
              小さな光が、あなたの声を待っています。
            </p>
            <p className={styles.revealLine} style={{ animationDelay: "1.45s" }}>
              名前を呼ぶと、輪郭が生まれていく。
            </p>
            <p className={`${styles.revealLine} text-lg font-bold sm:text-xl`} style={{ animationDelay: "3.1s" }}>
              あなたの分身、<span className="text-primary">{npc.name}</span>が目を覚ましました。
            </p>
          </div>

          {actionError && (
            <div className="alert alert-error mt-5 max-w-lg text-left" role="alert">
              <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          )}

          {/* 会話準備に失敗した(会話がなく、準備中でもない)ときだけ再試行を表示 */}
          {!conversation && !isStarting && (
            <button className="btn btn-outline mt-5" type="button" onClick={handleRestartConversation}>
              <LuRefreshCw aria-hidden="true" />
              最初の会話を準備し直す
            </button>
          )}

          <button
            className="btn btn-primary btn-lg mt-6 min-w-56"
            type="button"
            disabled={!revealReady || !conversation || isStarting}
            onClick={() => setStage("conversation")}
          >
            {isStarting ? (
              <LuLoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <LuMessageCircle aria-hidden="true" />
            )}
            {isStarting ? "最初の言葉を待っています" : `${npc.name}と話す`}
            {!isStarting && <LuArrowRight aria-hidden="true" />}
          </button>
        </div>
      </section>
    );
  }

  // [complete] 誕生結果: フィードバック文、レベル/獲得EXP、新しく覚えたトピック、ホームへのボタン。
  if (stage === "complete" && npc && review) {
    return (
      <section className={`${styles.birthScene} relative isolate grid min-h-screen place-items-center overflow-hidden px-5 py-12 text-base-content`}>
        <div className={`${styles.starRiver} -z-10`} aria-hidden="true" />
        <div className="card w-full max-w-2xl border border-base-300/70 bg-base-100/90 shadow-2xl backdrop-blur">
          <div className="card-body items-center p-6 text-center sm:p-10">
            <div className="relative size-36 overflow-hidden rounded-full bg-linear-to-br from-primary/25 to-secondary/25 ring-4 ring-primary/20 sm:size-44">
              <Image
                src={presetImagePath(npc.presetId)}
                alt={`${npc.name}の姿`}
                fill
                sizes="176px"
                className="object-contain object-bottom"
              />
            </div>
            <div className="badge badge-primary mt-3 gap-1">
              <LuSparkles aria-hidden="true" />
              BORN
            </div>
            <h1 className="mt-2 text-3xl font-black">{npc.name}が誕生しました</h1>
            <p className="mt-3 max-w-xl leading-8 text-base-content/70">{review.feedback}</p>

            <div className="stats stats-vertical mt-5 w-full border border-base-300 bg-base-200/55 sm:stats-horizontal">
              <div className="stat place-items-center">
                <div className="stat-title">レベル</div>
                <div className="stat-value text-primary">{review.level}</div>
                {review.leveledUp && <div className="stat-desc">レベルアップ！</div>}
              </div>
              <div className="stat place-items-center">
                <div className="stat-title">獲得EXP</div>
                <div className="stat-value text-secondary">+{review.expGained}</div>
                <div className="stat-desc">最初の思い出</div>
              </div>
            </div>

            {review.newTopics.length > 0 && (
              <section className="mt-5 w-full" aria-labelledby="learned-topics-heading">
                <h2 id="learned-topics-heading" className="flex items-center justify-center gap-2 font-bold">
                  <LuStar className="text-warning" aria-hidden="true" />
                  {npc.name}が覚えたこと
                </h2>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {review.newTopics.map((topic) => (
                    <span key={topic.id} className="badge badge-outline badge-lg">
                      {topic.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <button className="btn btn-primary btn-lg mt-7 min-w-56" type="button" onClick={goHome}>
              <LuHouse aria-hidden="true" />
              いっしょに家へ帰る
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ここから下は [conversation] 画面。必要なデータが揃うまでは何も描画しない。
  if (!npc || !conversation) {
    return null;
  }

  // 会話が締めくくり済み(これ以上メッセージを送れない)か
  const conversationFinished = conversation.status !== "IN_PROGRESS";

  return (
    <section className="flex min-h-screen flex-col bg-base-200 text-base-content">
      {/* ヘッダー: NPCのアイコン・タイトル・往復数(上限6はここに直書き) */}
      <header className="border-b border-base-300 bg-base-100/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-linear-to-br from-primary/20 to-secondary/20 ring-2 ring-primary/20">
            <Image
              src={presetImagePath(npc.presetId)}
              alt=""
              fill
              sizes="48px"
              className="object-contain object-bottom"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{npc.name}との最初の会話</p>
            <p className="text-xs text-base-content/50">あなたの言葉から、最初の個性が育ちます</p>
          </div>
          <div className="badge badge-ghost shrink-0">{conversation.turn}/6 往復</div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
        {/* メッセージ一覧: USERは右(chat-end)、NPCは左(chat-start)の吹き出し */}
        <div className="flex-1 space-y-4" aria-live="polite">
          {conversation.messages.map((message, index) => {
            const isUser = message.role === "USER";
            return (
              <div key={`${message.role}-${index}`} className={`chat ${isUser ? "chat-end" : "chat-start"}`}>
                <div className="chat-header mb-1 text-xs text-base-content/50">
                  {isUser ? "あなた" : npc.name}
                </div>
                <div className={`chat-bubble leading-7 ${isUser ? "chat-bubble-primary" : "bg-base-100 text-base-content shadow-sm"}`}>
                  {message.text}
                </div>
              </div>
            );
          })}

          {/* NPCの返答待ちインジケーター(…のアニメーション) */}
          {isSending && (
            <div className="chat chat-start">
              <div className="chat-header mb-1 text-xs text-base-content/50">{npc.name}</div>
              <div className="chat-bubble bg-base-100 text-base-content shadow-sm" aria-label={`${npc.name}が考え中`}>
                <span className="loading loading-dots loading-sm" />
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>

        {/* 画面下部に固定: エラー表示 / 入力フォーム / 誕生確定パネル */}
        <div className="sticky bottom-0 mt-6 border-t border-base-300 bg-base-200/95 pt-4 pb-4 backdrop-blur">
          {actionError && (
            <div className="alert alert-error mb-3" role="alert">
              <LuCircleAlert className="size-5 shrink-0" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          )}

          {/* 返信フォーム(会話が終わっていれば非表示) */}
          {!conversationFinished && (
            <form className="flex items-end gap-2" onSubmit={handleSend}>
              <label className="form-control flex-1">
                <span className="sr-only">{npc.name}への返事</span>
                <textarea
                  className="textarea textarea-bordered min-h-14 w-full resize-none bg-base-100"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`${npc.name}に返事をする`}
                  maxLength={2000}
                  rows={2}
                  disabled={isSending || isReviewing}
                />
              </label>
              <button className="btn btn-primary btn-square btn-lg" type="submit" disabled={!draft.trim() || isSending} aria-label="返事を送る">
                {isSending ? (
                  <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <LuSend aria-hidden="true" />
                )}
              </button>
            </form>
          )}

          {/* 誕生確定パネル: 十分な会話が済んだ(canFinish)ら表示。会話継続中でも確定できる */}
          {conversation.canFinish && (
            <div className="mt-3 flex flex-col items-center justify-between gap-3 rounded-box border border-primary/20 bg-primary/5 p-4 sm:flex-row">
              <p className="text-sm leading-6 text-base-content/65">
                {conversationFinished
                  ? "最初の会話を振り返って、分身の誕生を確定できます。"
                  : "ここまでの会話で誕生できます。もう少し話しても大丈夫です。"}
              </p>
              <button className="btn btn-primary shrink-0" type="button" onClick={handleReview} disabled={isReviewing || isSending}>
                {isReviewing ? (
                  <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <LuSparkles aria-hidden="true" />
                )}
                {isReviewing ? "思い出を結んでいます…" : "会話を終えて誕生する"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
