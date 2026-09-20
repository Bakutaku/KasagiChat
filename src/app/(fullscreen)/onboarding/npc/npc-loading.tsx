"use client";

import { LuLoaderCircle, LuRefreshCw } from "react-icons/lu";
import ErrorAlert from "@/components/feedback/error-alert";

/** [loading] 既存NPCの有無を確認している間の表示。失敗したら再試行を促す。 */
export default function NpcLoading({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="grid min-h-screen place-items-center px-5" aria-busy="true">
      <div className="text-center">
        <LuLoaderCircle
          className="mx-auto size-10 animate-spin text-primary"
          aria-hidden="true"
        />
        <p className="mt-4 text-sm text-base-content/60">分身の気配を探しています…</p>

        {error && (
          <div className="mt-6 max-w-md">
            <ErrorAlert message={error} className="text-left" />
            <button className="btn btn-primary mt-4" type="button" onClick={onRetry}>
              <LuRefreshCw aria-hidden="true" />
              もう一度試す
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
