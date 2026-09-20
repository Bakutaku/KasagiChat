"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import type { ErrorMessageOverrides } from "@/lib/api/errors";
import { npcApi } from "./api";
import type { Npc } from "./types";

/**
 * NPC誕生オンボーディングの画面遷移と、NPCそのものの状態を管理するフック。
 *
 * 会話の状態は持ちません(useConversation の担当)。ここが持つのは
 * stage / npc / 初期読み込み / NPC作成 だけです。
 *
 * 画面遷移:
 *   loading      : GET /api/npc で既存NPCの有無を確認中
 *     ├ NPCなし(404)    → setup
 *     ├ 誕生済み(bornAt) → /home へリダイレクト
 *     └ 未誕生NPCあり    → conversation(会話を再開して直行)
 *   setup        : 見た目と名前を選んでNPCを作成 → awakening
 *   awakening    : 誕生演出 → conversation
 *   conversation : 最初の会話 → 振り返り成功で complete
 *   complete     : 誕生結果 → /home
 */
export type NpcBirthStage =
  | "loading"
  | "setup"
  | "awakening"
  | "conversation"
  | "complete";

export type UseNpcBirthFlowOptions = {
  /** 画面固有のエラー文言。共通文言(@/lib/api/errors)へ差し込む。 */
  errorMessages?: ErrorMessageOverrides;
  /**
   * 未誕生のNPCが見つかったときに、初期読み込みの中で会話を開始/再開する処理。
   * 初期読み込みのuseEffectの依存に入るため、同一性が変わらない関数を渡すこと
   * (useConversation が返す start をそのまま渡せる)。
   */
  resumeConversation: (signal: AbortSignal) => Promise<unknown>;
};

export type UseNpcBirthFlowResult = {
  stage: NpcBirthStage;
  npc: Npc | null;
  /** 初期読み込みの失敗。loading画面で「もう一度試す」と一緒に出す。 */
  loadError: string | null;
  /** setup / awakening でのNPC作成エラー。stageを移ると消える。 */
  actionError: string | null;
  isCreating: boolean;
  /** 初期読み込みをやり直す。 */
  reload: () => void;
  /** stageを移す。前のstageのエラーが残らないよう actionError を消す。 */
  goToStage: (next: NpcBirthStage) => void;
  /** NPCを作成する。成功したNPCを返し、失敗時は null(actionErrorに文言が入る)。 */
  createNpc: (presetId: string, name: string) => Promise<Npc | null>;
  /** 誕生後にホームへ移動する。 */
  goHome: () => void;
};

export function useNpcBirthFlow({
  errorMessages,
  resumeConversation,
}: UseNpcBirthFlowOptions): UseNpcBirthFlowResult {
  const router = useRouter();

  const [stage, setStage] = useState<NpcBirthStage>("loading");
  const [npc, setNpc] = useState<Npc | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const isCreatingRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // インクリメントすると初期読み込みのuseEffectが再実行される(「もう一度試す」用)
  const [reloadKey, setReloadKey] = useState(0);

  // 文言の差し込みはオブジェクト同一性が変わり得るため、useEffectの依存から外す。
  const errorMessagesRef = useRef(errorMessages);
  useEffect(() => {
    errorMessagesRef.current = errorMessages;
  }, [errorMessages]);

  // 初期読み込み: 既存NPCを確認して、遷移先のstageを決める。
  // アンマウントや再実行時は AbortController で通信を中断する。
  useEffect(() => {
    const controller = new AbortController();

    async function loadNpc() {
      setStage("loading");
      setLoadError(null);

      try {
        const currentNpc = await npcApi.find(controller.signal);

        // NPC未作成 → 作成画面へ
        if (!currentNpc) {
          setStage("setup");
          return;
        }

        // すでに誕生済みならオンボーディング不要
        if (currentNpc.bornAt) {
          router.replace("/home");
          return;
        }

        // 作成済みだが未誕生(途中離脱からの再開)→ 演出は飛ばして会話へ
        setNpc(currentNpc);
        await resumeConversation(controller.signal);
        setStage("conversation");
      } catch (error) {
        // 中断は想定内なのでエラー表示しない
        if (isAbortError(error)) {
          return;
        }
        setLoadError(getErrorMessage(error, errorMessagesRef.current));
      }
    }

    void loadNpc();

    // ページ遷移後に完了した通信が、破棄済みの画面を更新することを防ぐ。
    return () => controller.abort();
  }, [reloadKey, router, resumeConversation]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const goToStage = useCallback((next: NpcBirthStage) => {
    setActionError(null);
    setStage(next);
  }, []);

  const createNpc = useCallback(async (presetId: string, name: string) => {
    const normalizedName = name.trim();

    // 1ユーザー1体なので二重作成は409になる。stateではなくrefで見て、
    // useCallbackの依存を増やさずに実行中の再入を止める。
    if (!normalizedName || isCreatingRef.current) {
      return null;
    }

    isCreatingRef.current = true;
    setIsCreating(true);
    setActionError(null);

    try {
      const createdNpc = await npcApi.create({
        presetId,
        name: normalizedName,
      });
      setNpc(createdNpc);
      return createdNpc;
    } catch (error) {
      setActionError(getErrorMessage(error, errorMessagesRef.current));
      return null;
    } finally {
      isCreatingRef.current = false;
      setIsCreating(false);
    }
  }, []);

  // refresh でサーバー側の状態(誕生済み)をルートガードへ反映させる。
  const goHome = useCallback(() => {
    router.replace("/home");
    router.refresh();
  }, [router]);

  return {
    stage,
    npc,
    loadError,
    actionError,
    isCreating,
    reload,
    goToStage,
    createNpc,
    goHome,
  };
}
