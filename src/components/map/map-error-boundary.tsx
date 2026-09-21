"use client";

import { Component, type ReactNode } from "react";
import { LuRefreshCw } from "react-icons/lu";

/** fetchの失敗は読込コンポーネントでthrowし、WebGL・画像読込の例外と同じUIに集約します。 */
export class MapErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div
          role="alert"
          className="alert alert-error max-w-lg flex-col items-start"
        >
          <h2 className="font-bold">マップを表示できませんでした</h2>
          <p>
            {this.state.error.message || "読み込み中に問題が発生しました。"}
          </p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={this.props.onRetry}
          >
            <LuRefreshCw aria-hidden="true" />
            再試行
          </button>
        </div>
      </div>
    );
  }
}
