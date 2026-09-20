"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AWAKENING_REVEAL_MS } from "./constants";

/**
 * 誕生演出の待ち時間を管理するフック。
 *
 * CSSアニメーションが終わるまでボタンを押せないようにするための時間待ちで、
 * 「動きを減らす」設定のユーザーは待たせずに操作できるようにする。
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onStoreChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// サーバーレンダリング時は matchMedia が無いので「動きを減らさない」を既定にする。
function getReducedMotionServerSnapshot() {
  return false;
}

/** OSの「動きを減らす」設定。設定変更にも追従する。 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

/**
 * @param active   演出中の画面を表示しているか(false の間はタイマーを動かさない)
 * @param durationMs 待ち時間。既定はCSSのアニメーション長に合わせた定数。
 * @returns 演出が終わって操作を受け付けてよいか
 */
export function useRevealTimer(active: boolean, durationMs = AWAKENING_REVEAL_MS) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (!active || prefersReducedMotion) {
      return;
    }

    const timer = window.setTimeout(() => setIsRevealed(true), durationMs);
    return () => window.clearTimeout(timer);
  }, [active, durationMs, prefersReducedMotion]);

  // 動きを減らす設定なら演出を待たせない。
  return prefersReducedMotion || isRevealed;
}
