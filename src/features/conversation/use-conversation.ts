"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
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
  /** 入力中の返信文。送信に成功すると空になる。 */
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
  /** 振り返りを実行する。失敗時は null。 */
  review: () => Promise<ReviewResult | null>;
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
        return current;
      } catch (error) {
        setActionError(toMessage(error));
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

  const send = useCallback(async () => {
    const text = draft.trim();

    if (
      !conversation ||
      !text ||
      isSending ||
      conversation.status !== "IN_PROGRESS"
    ) {
      return false;
    }

    setIsSending(true);
    setActionError(null);

    try {
      const response = await conversationApi.send(
        conversation.id,
        text,
        conversation.turn,
      );
      // 送信文とNPCの返答をローカルへ追記する(再取得はしない)。
      // 成功した往復だけがサーバーに保存されるため、楽観表示の巻き戻しは不要。
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
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.code && RESYNC_CODES.includes(error.code)) {
        await resync(conversation.id, error);
      } else {
        setActionError(toMessage(error));
      }
      return false;
    } finally {
      setIsSending(false);
    }
  }, [conversation, draft, isSending, resync, toMessage]);

  const review = useCallback(async () => {
    if (!conversation || !conversation.canFinish || isReviewing) {
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
  }, [conversation, isReviewing, onReviewed, toMessage]);

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
    canSend: !isFinished && !isSending && draft.trim().length > 0,
    start,
    send,
    review,
  };
}
