"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  LuArrowRight,
  LuLoaderCircle,
  LuMessageCircle,
  LuRefreshCw,
} from "react-icons/lu";
import ErrorAlert from "@/components/feedback/error-alert";
import { presetImagePath } from "@/features/npc/presets";
import type { Npc } from "@/features/npc/types";
import { useRevealTimer } from "@/features/npc/use-reveal-timer";
import styles from "./npc-birth.module.css";

/** 準備が長引いていると補足を出すまでの待ち時間(ミリ秒)。 */
const SLOW_HINT_MS = 9000;

/**
 * 待機が長引いているか。
 * 会話準備はLLM呼び出しなので数十秒かかることがあり、故障と誤解されないよう補足を出す。
 */
function useSlowWaitHint(isWaiting: boolean) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isWaiting) {
      return;
    }

    const timer = window.setTimeout(() => setIsSlow(true), SLOW_HINT_MS);
    return () => {
      window.clearTimeout(timer);
      // 再試行でもう一度待つときに、前回の補足が残らないよう戻す。
      setIsSlow(false);
    };
  }, [isWaiting]);

  return isSlow;
}

/**
 * [awakening] 誕生演出と、その裏で走る会話準備の待機画面。
 *
 * NPCの作成自体は済んでいるが、最初の会話(LLM呼び出し)はまだ準備中。
 * 待っているだけの画面に見えないよう、準備中であることを常に表に出す。
 *
 * 演出が終わる(useRevealTimer)まで、かつ最初の会話が準備できるまで先へ進めない。
 * この画面が表示されている間だけ演出を待てばよいので、タイマーはここで持つ。
 */
export default function NpcAwakening({
  npc,
  isConversationReady,
  isStarting,
  error,
  onRetryStart,
  onContinue,
}: {
  npc: Npc;
  /** 最初の会話の準備ができているか。 */
  isConversationReady: boolean;
  isStarting: boolean;
  error: string | null;
  onRetryStart: () => void;
  onContinue: () => void;
}) {
  // この画面が描画されている間は常に演出中。
  const isRevealed = useRevealTimer(true);

  // 会話準備に失敗した(会話がなく、準備中でもない)状態。
  const hasFailed = !isConversationReady && !isStarting;
  // 演出と会話準備のどちらかが終わっていない間は待機中。
  const isWaiting = !hasFailed && (!isRevealed || !isConversationReady);
  const isSlow = useSlowWaitHint(isWaiting);

  return (
    <section
      className={`${styles.birthScene} relative isolate grid min-h-screen place-items-center overflow-hidden px-5 py-12`}
      aria-busy={isWaiting}
    >
      <div className={`${styles.starRiver} -z-10`} aria-hidden="true" />

      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        {/*
          演出の開始直後から「作成中」と分かるようにする目印。
          下の状況表示(role="status")と同じ内容なので読み上げからは外す。
          消えたときに表示が跳ねないよう、高さは常に確保しておく。
        */}
        <div className="flex h-7 items-center">
          {isWaiting && (
            <span
              className="badge badge-primary badge-outline gap-1.5"
              aria-hidden="true"
            >
              <LuLoaderCircle className="size-3 animate-spin" />
              分身を生み出しています
            </span>
          )}
        </div>

        <div
          className={`${styles.orb} mt-6`}
          aria-label={`${npc.name}が光の中から現れています`}
        >
          <Image
            src={presetImagePath(npc.presetId)}
            alt=""
            width={1024}
            height={1536}
            loading="eager"
            className={styles.avatarReveal}
          />
        </div>

        {/* animationDelay はCSS側のアニメーション進行に合わせた値 */}
        <p
          className={`${styles.revealLine} mt-9 text-lg font-bold`}
          style={{ animationDelay: "3.1s" }}
        >
          あなたの分身、<span className="text-primary">{npc.name}</span>
          が目を覚ましました。
        </p>

        {/*
          待機表示・再試行・次へ進むボタンは同じ場所で入れ替わる。
          入れ替わりで表示が跳ねないよう最低の高さを取っておく。
        */}
        <div className="mt-6 flex min-h-28 w-full flex-col items-center">
          {error && (
            <ErrorAlert message={error} className="mb-4 max-w-lg text-left" />
          )}

          {isWaiting && (
            <div className="w-full max-w-xs" role="status">
              <progress className="progress progress-primary w-full" />
              <p className="mt-3 flex items-center justify-center gap-2 text-sm text-base-content/70">
                <LuLoaderCircle
                  className="size-4 animate-spin text-primary"
                  aria-hidden="true"
                />
                {isConversationReady
                  ? `${npc.name}が姿を整えています…`
                  : `${npc.name}の最初の言葉を紡いでいます…`}
              </p>
              {isSlow && (
                <p className="mt-2 text-xs text-base-content/50">
                  AIの返事を待っています。混み合っていると30秒ほどかかることがあります。
                </p>
              )}
            </div>
          )}

          {hasFailed && (
            <button className="btn btn-outline" type="button" onClick={onRetryStart}>
              <LuRefreshCw aria-hidden="true" />
              最初の会話を準備し直す
            </button>
          )}

          {!isWaiting && !hasFailed && (
            <button
              className={`${styles.revealLine} btn btn-primary btn-lg min-w-56`}
              type="button"
              onClick={onContinue}
            >
              <LuMessageCircle aria-hidden="true" />
              {npc.name}と話す
              <LuArrowRight aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
