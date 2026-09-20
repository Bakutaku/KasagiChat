"use client";

import Image from "next/image";
import { LuHouse, LuStar } from "react-icons/lu";
import type { ReviewResult } from "@/features/conversation/types";
import { presetImagePath } from "@/features/npc/presets";
import type { Npc } from "@/features/npc/types";

/** [complete] 誕生結果。フィードバック・レベル・獲得EXP・覚えたトピックを表示する。 */
export default function NpcComplete({
  npc,
  review,
  onGoHome,
}: {
  npc: Npc;
  review: ReviewResult;
  onGoHome: () => void;
}) {
  return (
    <section className="grid min-h-screen place-items-center bg-base-200 px-5 py-12">
      <div className="card w-full max-w-xl border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <div className="relative size-32 overflow-hidden rounded-full bg-base-200">
            <Image
              src={presetImagePath(npc.presetId)}
              alt={`${npc.name}の姿`}
              fill
              sizes="128px"
              className="object-contain object-bottom"
            />
          </div>
          <h1 className="mt-2 text-2xl font-black">{npc.name}が誕生しました</h1>
          <p className="mt-2 leading-7 text-base-content/70">{review.feedback}</p>

          <div className="stats stats-vertical mt-4 w-full border border-base-300 sm:stats-horizontal">
            <div className="stat place-items-center">
              <div className="stat-title">レベル</div>
              <div className="stat-value text-primary">{review.level}</div>
              {review.leveledUp && <div className="stat-desc">レベルアップ！</div>}
            </div>
            <div className="stat place-items-center">
              <div className="stat-title">獲得EXP</div>
              <div className="stat-value text-secondary">+{review.expGained}</div>
            </div>
          </div>

          {review.newTopics.length > 0 && (
            <section className="mt-4 w-full" aria-labelledby="learned-topics-heading">
              <h2
                id="learned-topics-heading"
                className="flex items-center justify-center gap-2 font-bold"
              >
                <LuStar className="text-warning" aria-hidden="true" />
                {npc.name}が覚えたこと
              </h2>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {review.newTopics.map((topic) => (
                  <span key={topic.id} className="badge badge-outline">
                    {topic.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          <button
            className="btn btn-primary mt-6 min-w-56"
            type="button"
            onClick={onGoHome}
          >
            <LuHouse aria-hidden="true" />
            いっしょに家へ帰る
          </button>
        </div>
      </div>
    </section>
  );
}
