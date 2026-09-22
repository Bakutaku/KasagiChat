"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import type { ErrorMessageOverrides } from "@/lib/api/errors";
import { conversationApi } from "./api";
import type {
  Conversation,
  ConversationScene,
  ConversationType,
  ReviewResult,
} from "./types";

/**
 * 会話1件ぶんの状態管理。会話種別によらず共通で使う。
 *
 * ここが持つのは「サーバーとやり取りする会話の状態」だけです。
 * 画面遷移(stage)や会話種別に固有の後処理は、呼び出し側かコールバックで行います。
 */

/**
 * サーバー状態とずれたときに表示する既定の案内。
 * どちらも errorMessages.codes で上書きできます。
 */
const RESYNC_MESSAGES: Record<string, string> = {
  TURN_MISMATCH: "別の画面で会話が進んでいたため、最新の状態を読み直しました。",
  CONVERSATION_FINISHED: "会話はすでに締めくくられています。",
};

// この2つは「失敗」ではなくサーバー状態への追従で解決する。
const RESYNC_CODES = Object.keys(RESYNC_MESSAGES);

export type UseConversationOptions = {
  type: ConversationType;
  scene: ConversationScene;
  /** 会話種別ごとの業務エラー文言。共通文言(@/lib/api/errors)へ差し込む。 */
  errorMessages?: ErrorMessageOverrides;
  /**
   * 振り返りに成功したときに呼ばれる。
   * BIRTHの誕生確定のように、会話種別ごとの後処理を外から差し込むための拡張点。
   */
  onReviewed?: (result: ReviewResult) => void;
};

export type UseConversationResult = {
  conversation: Conversation | null;
  /** 入力中の返信文。送信を開始すると空になる。 */
  draft: string;
  setDraft: (value: string) => void;
  isStarting: boolean;
  isSending: boolean;
  isReviewing: boolean;
  /** 会話画面で表示する操作エラー。画面遷移時は呼び出し側が clearActionError する。 */
  actionError: string | null;
  clearActionError: () => void;
  /** これ以上メッセージを送れない状態(FINISHED / REVIEWED)か。 */
  isFinished: boolean;
  /** 送信ボタンを押せるか(入力あり・送信中でない・会話継続中)。 */
  canSend: boolean;
  /**
   * 会話を開始または再開し、最新状態を読み込む。
   * 初期読み込みのuseEffectから呼べるよう同一性を保つ(依存は type / scene のみ)。
   * 失敗時は actionError を設定したうえで再スローするので、
   * 別のエラー表示に寄せたい呼び出し側は catch して扱える。
   */
  start: (signal?: AbortSignal) => Promise<Conversation>;
  /** draft を送信する。送信できたら true。 */
  send: () => Promise<boolean>;
  /** 送信に失敗し、再送を待っているメッセージ。 */
  failedMessage: FailedConversationMessage | null;
  /** failedMessage を同じターンとして再送する。成功したら true。 */
  retrySend: () => Promise<boolean>;
  /** 振り返りを実行する。失敗時は null。 */
  review: () => Promise<ReviewResult | null>;
};

export type FailedConversationMessage = {
  /** conversation.messages 内の、送信に失敗したユーザーメッセージの位置。 */
  index: number;
  /** 該当メッセージの直下に表示するエラー文言。 */
  error: string;
};

type RetryableMessage = FailedConversationMessage & {
  conversationId: string;
  text: string;
  expectedTurn: number;
};

export function useConversation({
  type,
  scene,
  errorMessages,
  onReviewed,
}: UseConversationOptions): UseConversationResult {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] =
    useState<RetryableMessage | null>(null);
  // stateの再描画を待たずに二重送信を防ぐ。
  const isSendingRef = useRef(false);

  // 文言の差し込みは呼び出し側で毎回新しいオブジェクトになり得るため、
  // useCallback の依存から外して ref 経由で読む(start の同一性を保つため)。
  const errorMessagesRef = useRef(errorMessages);
  useEffect(() => {
    errorMessagesRef.current = errorMessages;
  }, [errorMessages]);

  const toMessage = useCallback(
    (error: unknown) => getErrorMessage(error, errorMessagesRef.current),
    [],
  );

  const clearActionError = useCallback(() => setActionError(null), []);

  const start = useCallback(
    async (signal?: AbortSignal) => {
      setIsStarting(true);
      setActionError(null);

      try {
        const started = await conversationApi.start(type, scene, signal);
        // 開始レスポンスにも全文が入るが、再開時の取りこぼしを避けるため最新を取り直す。
        const current = await conversationApi.get(started.id, signal);
        setConversation(current);
        setFailedMessage(null);
        return current;
      } catch (error) {
        // 中断(画面破棄・再読み込み・StrictModeの二重実行)は失敗ではない。
        // ここで文言を出すと、実際には成功した再実行の裏で
        // 「サーバーに接続できませんでした」が残ってしまう。
        if (!isAbortError(error) && !signal?.aborted) {
          setActionError(toMessage(error));
        }
        throw error;
      } finally {
        // 中断済み(画面破棄・再読み込み)のときは状態を触らない。
        if (!signal?.aborted) {
          setIsStarting(false);
        }
      }
    },
    [type, scene, toMessage],
  );

  /**
   * TURN_MISMATCH / CONVERSATION_FINISHED のときにサーバー状態へ寄せ直す。
   * 再取得そのものが失敗することもあるため、ここで必ず捕捉する。
   */
  const resync = useCallback(
    async (id: string, cause: ApiError) => {
      try {
        setConversation(await conversationApi.get(id));
        setActionError(
          getErrorMessage(cause, {
            ...errorMessagesRef.current,
            codes: {
              ...RESYNC_MESSAGES,
              ...errorMessagesRef.current?.codes,
            },
          }),
        );
      } catch (error) {
        setActionError(toMessage(error));
      }
    },
    [toMessage],
  );

  const sendMessage = useCallback(
    async (message: Omit<RetryableMessage, "error">) => {
      if (isSendingRef.current) {
        return false;
      }

      isSendingRef.current = true;
      setIsSending(true);
      setActionError(null);

      try {
        const response = await conversationApi.send(
          message.conversationId,
          message.text,
          message.expectedTurn,
        );
        // ユーザー発言は送信開始時に追加済みなので、成功時は相手の返答だけを追記する。
        setConversation((current) => {
          if (!current || current.id !== message.conversationId) {
            return current;
          }

          return {
            ...current,
            turn: response.turn,
            canFinish: response.canFinish,
            status: response.finished ? "FINISHED" : current.status,
            messages: [...current.messages, response.reply],
          };
        });
        setFailedMessage(null);
        return true;
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code &&
          RESYNC_CODES.includes(error.code)
        ) {
          // ターンずれや終了済みの場合、未保存の楽観メッセージを除いてから
          // サーバーの最新状態で置き換える。再取得失敗時にも未保存分は残さない。
          setConversation((current) => {
            if (!current || current.id !== message.conversationId) {
              return current;
            }

            return {
              ...current,
              messages: current.messages.slice(0, message.index),
            };
          });
          setFailedMessage(null);
          await resync(message.conversationId, error);
        } else {
          const errorMessage = toMessage(error);
          setFailedMessage({ ...message, error: errorMessage });
          setActionError(errorMessage);
        }
        return false;
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    },
    [resync, toMessage],
  );

  const send = useCallback(async () => {
    const text = draft.trim();

    if (
      !conversation ||
      !text ||
      isSendingRef.current ||
      failedMessage ||
      conversation.status !== "IN_PROGRESS"
    ) {
      return false;
    }

    const message = {
      conversationId: conversation.id,
      text,
      expectedTurn: conversation.turn,
      index: conversation.messages.length,
    };

    // 入力内容を先に吹き出しへ移し、相手の返答待ちをすぐ表示できるようにする。
    setConversation({
      ...conversation,
      messages: [...conversation.messages, { role: "USER", text }],
    });
    setDraft("");

    return sendMessage(message);
  }, [conversation, draft, failedMessage, sendMessage]);

  const retrySend = useCallback(async () => {
    if (
      !conversation ||
      !failedMessage ||
      isSendingRef.current ||
      conversation.id !== failedMessage.conversationId ||
      conversation.status !== "IN_PROGRESS"
    ) {
      return false;
    }

    return sendMessage({
      conversationId: failedMessage.conversationId,
      text: failedMessage.text,
      expectedTurn: failedMessage.expectedTurn,
      index: failedMessage.index,
    });
  }, [conversation, failedMessage, sendMessage]);

  const review = useCallback(async () => {
    if (!conversation || !conversation.canFinish || isReviewing || failedMessage) {
      return null;
    }

    setIsReviewing(true);
    setActionError(null);

    try {
      const result = await conversationApi.review(conversation.id);
      setConversation({ ...conversation, status: "REVIEWED" });
      onReviewed?.(result);
      return result;
    } catch (error) {
      setActionError(toMessage(error));
      return null;
    } finally {
      setIsReviewing(false);
    }
  }, [conversation, failedMessage, isReviewing, onReviewed, toMessage]);

  const isFinished = conversation !== null && conversation.status !== "IN_PROGRESS";

  return {
    conversation,
    draft,
    setDraft,
    isStarting,
    isSending,
    isReviewing,
    actionError,
    clearActionError,
    isFinished,
    canSend:
      !isFinished && !isSending && !failedMessage && draft.trim().length > 0,
    start,
    send,
    failedMessage,
    retrySend,
    review,
  };
}
