import { LuHouse, LuSparkles, LuStar, LuTrendingUp } from "react-icons/lu";
import type { ReviewResult } from "./types";

export type ConversationResultPanelProps = {
  actorName: string;
  result: ReviewResult;
  actionLabel: string;
  onAction: () => void;
};

/** 振り返り結果を会話シェルの右パネルへ表示する共通コンポーネント。 */
export default function ConversationResultPanel({
  actorName,
  result,
  actionLabel,
  onAction,
}: ConversationResultPanelProps) {
  return (
    <div className="h-full overflow-y-auto p-5 sm:p-7">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
            <LuSparkles className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
              Conversation complete
            </p>
            <h2 className="mt-1 text-xl font-black">最初の思い出ができました</h2>
          </div>
        </div>

        <div className="mt-6 rounded-box border border-primary/15 bg-primary/6 p-5 leading-8 text-base-content/75">
          {result.feedback}
        </div>

        <div className="stats stats-vertical mt-5 w-full border border-base-300 bg-base-100 shadow-sm sm:stats-horizontal">
          <div className="stat">
            <div className="stat-figure text-primary">
              <LuTrendingUp className="size-6" aria-hidden="true" />
            </div>
            <div className="stat-title">{actorName}のレベル</div>
            <div className="stat-value text-primary">{result.level}</div>
            {result.leveledUp && <div className="stat-desc">レベルアップ！</div>}
          </div>
          <div className="stat">
            <div className="stat-figure text-secondary">
              <LuSparkles className="size-6" aria-hidden="true" />
            </div>
            <div className="stat-title">獲得EXP</div>
            <div className="stat-value text-secondary">+{result.expGained}</div>
            <div className="stat-desc">会話から得た成長</div>
          </div>
        </div>

        {result.newTopics.length > 0 && (
          <section className="mt-6" aria-labelledby="learned-topics-heading">
            <h3 id="learned-topics-heading" className="flex items-center gap-2 font-bold">
              <LuStar className="text-warning" aria-hidden="true" />
              {actorName}が覚えたこと
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.newTopics.map((topic) => (
                <span key={topic.id} className="badge badge-outline badge-lg">
                  {topic.name}
                </span>
              ))}
            </div>
          </section>
        )}

        <button
          className="btn btn-primary btn-lg mt-8 w-full sm:self-end sm:w-auto sm:min-w-60"
          type="button"
          onClick={onAction}
        >
          <LuHouse aria-hidden="true" />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
